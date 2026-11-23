from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc
import models, schemas, audit_service
from datetime import datetime, timezone

def check_interval_overlap(start1, end1, start2, end2):
    # Definition: existing_start < requested_end AND existing_end > requested_start
    return start1 < end2 and end1 > start2

def get_available_rooms(db: Session, start_time: datetime, end_time: datetime, attendee_count: int, facility_ids: list[int] = None):
    # 1. Filter out rooms under maintenance during the interval
    maintenance_subquery = db.query(models.MaintenanceLog.room_id).filter(
        models.MaintenanceLog.start_date < end_time,
        models.MaintenanceLog.end_date > start_time
    ).subquery()
    
    # 2. Filter out rooms already booked during the interval
    # Exclude PREEMPTED, CANCELLED, REJECTED
    active_statuses = [models.BookingStatusEnum.CONFIRMED, models.BookingStatusEnum.PENDING]
    booking_subquery = db.query(models.Booking.room_id).filter(
        models.Booking.start_time < end_time,
        models.Booking.end_time > start_time,
        models.Booking.booking_status.in_(active_statuses)
    ).subquery()

    query = db.query(models.Classroom).filter(
        models.Classroom.capacity >= attendee_count,
        ~models.Classroom.room_id.in_(maintenance_subquery),
        ~models.Classroom.room_id.in_(booking_subquery)
    )
    
    if facility_ids and len(facility_ids) > 0:
        for f_id in facility_ids:
            query = query.filter(models.Classroom.facilities.any(models.Facility.facility_id == f_id))
            
    # Rank eligible rooms by smallest capacity that fits
    # (Least unused seating)
    query = query.order_by(asc(models.Classroom.capacity))
    
    return query.all()

def create_booking(db: Session, booking: schemas.BookingCreate, user: models.User, allow_preemption: bool = False):
    # Transactional boundary starts here typically
    now = datetime.now(timezone.utc)

    # 1. 3-Strike Policy: Check if user is suspended
    if getattr(user, "is_suspended", False):
        susp_until = getattr(user, "suspension_until", None)
        if susp_until:
            if susp_until.tzinfo is None:
                susp_until = susp_until.replace(tzinfo=timezone.utc)
            if susp_until > now:
                raise ValueError(f"Booking privileges suspended until {susp_until.strftime('%b %d, %Y %H:%M UTC')} due to 3 no-show strikes.")
            else:
                # Suspension expired!
                user.is_suspended = False
                user.strikes_count = 0
                db.commit()
        else:
            raise ValueError("Booking privileges are suspended due to 3 no-show strikes. Contact an administrator for pardon.")
    
    # Validation: start time before end time
    if booking.start_time >= booking.end_time:
        raise ValueError("Start time must be before end time")
        
    # Validation: time horizon (e.g., cannot book in the past)
    if booking.start_time < now:
        raise ValueError("Cannot book in the past")
        
    room = db.query(models.Classroom).filter(models.Classroom.room_id == booking.room_id).with_for_update().first()
    if not room:
        raise ValueError("Room not found")
        
    if room.capacity < booking.attendee_count:
        raise ValueError("Room capacity is less than attendee count")
        
    # Check maintenance
    maintenance = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.room_id == booking.room_id,
        models.MaintenanceLog.start_date < booking.end_time,
        models.MaintenanceLog.end_date > booking.start_time
    ).first()
    
    if maintenance:
        raise ValueError("Room is under maintenance during this period")
        
    # Concurrency control & Overlap Check
    active_statuses = [models.BookingStatusEnum.CONFIRMED, models.BookingStatusEnum.PENDING]
    overlapping_bookings = db.query(models.Booking).filter(
        models.Booking.room_id == booking.room_id,
        models.Booking.start_time < booking.end_time,
        models.Booking.end_time > booking.start_time,
        models.Booking.booking_status.in_(active_statuses)
    ).with_for_update().all()
    
    if overlapping_bookings:
        if not allow_preemption:
            raise ValueError("Room is already booked during this time")
            
        # PREEMPTION LOGIC & SMART BUMP
        # Higher-priority booking may preempt a lower-priority eligible booking. (Smaller number = higher priority)
        for ob in overlapping_bookings:
            if user.priority_level >= ob.booking_priority:
                raise ValueError("Room is already booked and preemption is not permitted due to priority")
                
            # Try Smart Bump & Reassign: Look for an alternative available room for ob
            available_alts = get_available_rooms(
                db=db,
                start_time=ob.start_time,
                end_time=ob.end_time,
                attendee_count=ob.attendee_count
            )
            available_alts = [r for r in available_alts if r.room_id != booking.room_id]

            if available_alts:
                # Reassign to best alternative room seamlessly!
                alt_room = available_alts[0]
                orig_num = room.room_number
                ob.room_id = alt_room.room_id
                
                notif = models.Notification(
                    user_id=ob.user_id,
                    message=f"Smart Bump: Your booking was automatically moved from {orig_num} to {alt_room.room_number} to accommodate an urgent priority lecture.",
                    notification_type=models.NotificationTypeEnum.INFO
                )
                db.add(notif)
                audit_service.record_audit(
                    db=db,
                    action="PREEMPTION_SMART_BUMP",
                    target_type="BOOKING",
                    target_id=str(ob.booking_id),
                    details=f"Booking #{ob.booking_id} bumped from {orig_num} to {alt_room.room_number} by {user.name}",
                    actor=user
                )
            else:
                # No alternative room available - regular preemption
                ob.booking_status = models.BookingStatusEnum.PREEMPTED
                notif = models.Notification(
                    user_id=ob.user_id,
                    message=f"Your booking for room {room.room_number} at {ob.start_time.strftime('%H:%M')} was preempted by higher priority user {user.name}.",
                    notification_type=models.NotificationTypeEnum.WARNING
                )
                db.add(notif)
                audit_service.record_audit(
                    db=db,
                    action="PREEMPTION_CANCEL",
                    target_type="BOOKING",
                    target_id=str(ob.booking_id),
                    details=f"Booking #{ob.booking_id} in {room.room_number} preempted by {user.name} (no alternate available)",
                    actor=user
                )
            
    # Determine status
    status = models.BookingStatusEnum.CONFIRMED
    if user.role == models.RoleEnum.STUDENT:
        status = models.BookingStatusEnum.PENDING

    # Create the new booking
    new_booking = models.Booking(
        room_id=booking.room_id,
        user_id=user.user_id,
        start_time=booking.start_time,
        end_time=booking.end_time,
        booking_status=status,
        booking_priority=user.priority_level,
        attendee_count=booking.attendee_count,
        purpose=booking.purpose,
        approver_id=booking.approver_id
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    audit_service.record_audit(
        db=db,
        action="BOOKING_CREATED",
        target_type="BOOKING",
        target_id=str(new_booking.booking_id),
        details=f"Booking created for {room.room_number} ({new_booking.start_time.strftime('%b %d %H:%M')} - {new_booking.end_time.strftime('%H:%M')}). Purpose: {new_booking.purpose or 'N/A'}",
        actor=user
    )

    return new_booking

