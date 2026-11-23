from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc
import models, schemas

LATE_ARRIVAL_GRACE_MINUTES = 15
OVERDUE_CHECKOUT_GRACE_MINUTES = 15
UPCOMING_RESERVATION_LOOKAHEAD_MINUTES = 45

def get_current_utc() -> datetime:
    return datetime.now(timezone.utc)

def compute_room_live_status(db: Session, room: models.Classroom, now: Optional[datetime] = None) -> Dict[str, Any]:
    if now is None:
        now = get_current_utc()
        
    # Ensure now is timezone aware
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # 1. Maintenance Check (Highest Precedence)
    active_maintenance = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.room_id == room.room_id,
        models.MaintenanceLog.start_date <= now,
        models.MaintenanceLog.end_date >= now,
        models.MaintenanceLog.status.in_(["Scheduled", "In Progress", "active"])
    ).first()

    if active_maintenance:
        return {
            "room_id": room.room_id,
            "room_number": room.room_number,
            "building_id": room.building_id,
            "building_name": room.building.name if room.building else "Campus Building",
            "floor": room.floor or 1,
            "capacity": room.capacity,
            "room_type": room.room_type or "General Room",
            "facilities": room.facilities,
            "live_status": "maintenance",
            "status_color": "grey",
            "status_label": "Under Maintenance",
            "status_details": f"Maintenance: {active_maintenance.reason or 'Scheduled Work'}",
            "faculty_name": None,
            "class_info": active_maintenance.reason,
            "booking_start": active_maintenance.start_date,
            "booking_end": active_maintenance.end_date,
            "actual_checkin": None,
            "expected_available_time": active_maintenance.end_date,
            "is_overdue": False,
            "active_session_id": None,
            "active_booking_id": None,
            "last_updated": now
        }

    # 2. Active Physical Occupancy Session Check
    active_session = db.query(models.OccupancySession).filter(
        models.OccupancySession.room_id == room.room_id,
        models.OccupancySession.check_out_time.is_(None),
        models.OccupancySession.session_status.in_(["active", "overdue"])
    ).order_by(models.OccupancySession.check_in_time.desc()).first()

    if active_session:
        faculty = active_session.faculty
        booking = active_session.booking
        
        # Check if overdue
        is_overdue = False
        expected_end = None
        class_info = "Class in Session"

        if booking:
            expected_end = booking.end_time
            if expected_end.tzinfo is None:
                expected_end = expected_end.replace(tzinfo=timezone.utc)
            class_info = booking.purpose or "Scheduled Lecture"
            if now > expected_end + timedelta(minutes=OVERDUE_CHECKOUT_GRACE_MINUTES):
                is_overdue = True
        else:
            # Fallback if no booking: 2 hours after check-in
            check_in_tz = active_session.check_in_time
            if check_in_tz.tzinfo is None:
                check_in_tz = check_in_tz.replace(tzinfo=timezone.utc)
            expected_end = check_in_tz + timedelta(hours=2)
            if now > expected_end + timedelta(minutes=OVERDUE_CHECKOUT_GRACE_MINUTES):
                is_overdue = True

        if is_overdue:
            return {
                "room_id": room.room_id,
                "room_number": room.room_number,
                "building_id": room.building_id,
                "building_name": room.building.name if room.building else "Campus Building",
                "floor": room.floor or 1,
                "capacity": room.capacity,
                "room_type": room.room_type or "General Room",
                "facilities": room.facilities,
                "live_status": "needs_verification",
                "status_color": "amber",
                "status_label": "Needs Verification",
                "status_details": f"Occupancy session overdue for checkout (Scheduled end: {expected_end.strftime('%H:%M')})",
                "faculty_name": faculty.name if faculty else "Faculty Member",
                "class_info": class_info,
                "booking_start": booking.start_time if booking else active_session.check_in_time,
                "booking_end": expected_end,
                "actual_checkin": active_session.check_in_time,
                "expected_available_time": expected_end,
                "is_overdue": True,
                "active_session_id": active_session.session_id,
                "active_booking_id": booking.booking_id if booking else None,
                "last_updated": now
            }

        return {
            "room_id": room.room_id,
            "room_number": room.room_number,
            "building_id": room.building_id,
            "building_name": room.building.name if room.building else "Campus Building",
            "floor": room.floor or 1,
            "capacity": room.capacity,
            "room_type": room.room_type or "General Room",
            "facilities": room.facilities,
            "live_status": "occupied",
            "status_color": "red",
            "status_label": "Occupied",
            "status_details": f"Occupied by {faculty.name if faculty else 'Faculty'} ({class_info})",
            "faculty_name": faculty.name if faculty else "Faculty Member",
            "class_info": class_info,
            "booking_start": booking.start_time if booking else active_session.check_in_time,
            "booking_end": expected_end,
            "actual_checkin": active_session.check_in_time,
            "expected_available_time": expected_end,
            "is_overdue": False,
            "active_session_id": active_session.session_id,
            "active_booking_id": booking.booking_id if booking else None,
            "last_updated": now
        }

    # 3. Scheduled / Upcoming Reservation Check
    # Check current or upcoming confirmed booking
    lookahead_limit = now + timedelta(minutes=UPCOMING_RESERVATION_LOOKAHEAD_MINUTES)
    active_statuses = [models.BookingStatusEnum.CONFIRMED]

    current_or_upcoming_booking = db.query(models.Booking).filter(
        models.Booking.room_id == room.room_id,
        models.Booking.booking_status.in_(active_statuses),
        models.Booking.end_time > now,
        models.Booking.start_time <= lookahead_limit
    ).order_by(models.Booking.start_time.asc()).first()

    if current_or_upcoming_booking:
        b_start = current_or_upcoming_booking.start_time
        if b_start.tzinfo is None:
            b_start = b_start.replace(tzinfo=timezone.utc)
            
        b_end = current_or_upcoming_booking.end_time
        if b_end.tzinfo is None:
            b_end = b_end.replace(tzinfo=timezone.utc)

        b_user = current_or_upcoming_booking.user
        faculty_name = b_user.name if b_user else "Faculty"
        purpose = current_or_upcoming_booking.purpose or "Reserved Class"

        # Check if booking has already started
        if now >= b_start:
            # Booking start time has arrived, but no check-in exists!
            if now > b_start + timedelta(minutes=LATE_ARRIVAL_GRACE_MINUTES):
                return {
                    "room_id": room.room_id,
                    "room_number": room.room_number,
                    "building_id": room.building_id,
                    "building_name": room.building.name if room.building else "Campus Building",
                    "floor": room.floor or 1,
                    "capacity": room.capacity,
                    "room_type": room.room_type or "General Room",
                    "facilities": room.facilities,
                    "live_status": "needs_verification",
                    "status_color": "amber",
                    "status_label": "Needs Verification",
                    "status_details": f"Faculty check-in overdue ({faculty_name} scheduled at {b_start.strftime('%H:%M')})",
                    "faculty_name": faculty_name,
                    "class_info": purpose,
                    "booking_start": b_start,
                    "booking_end": b_end,
                    "actual_checkin": None,
                    "expected_available_time": b_end,
                    "is_overdue": True,
                    "active_session_id": None,
                    "active_booking_id": current_or_upcoming_booking.booking_id,
                    "last_updated": now
                }
            else:
                return {
                    "room_id": room.room_id,
                    "room_number": room.room_number,
                    "building_id": room.building_id,
                    "building_name": room.building.name if room.building else "Campus Building",
                    "floor": room.floor or 1,
                    "capacity": room.capacity,
                    "room_type": room.room_type or "General Room",
                    "facilities": room.facilities,
                    "live_status": "reserved",
                    "status_color": "blue",
                    "status_label": "Reserved / Upcoming",
                    "status_details": f"Reserved for {faculty_name} ({purpose}) - Awaiting check-in",
                    "faculty_name": faculty_name,
                    "class_info": purpose,
                    "booking_start": b_start,
                    "booking_end": b_end,
                    "actual_checkin": None,
                    "expected_available_time": b_end,
                    "is_overdue": False,
                    "active_session_id": None,
                    "active_booking_id": current_or_upcoming_booking.booking_id,
                    "last_updated": now
                }
        else:
            # Upcoming within lookahead window
            return {
                "room_id": room.room_id,
                "room_number": room.room_number,
                "building_id": room.building_id,
                "building_name": room.building.name if room.building else "Campus Building",
                "floor": room.floor or 1,
                "capacity": room.capacity,
                "room_type": room.room_type or "General Room",
                "facilities": room.facilities,
                "live_status": "reserved",
                "status_color": "blue",
                "status_label": "Reserved / Upcoming",
                "status_details": f"Reserved starting at {b_start.strftime('%H:%M')} for {faculty_name}",
                "faculty_name": faculty_name,
                "class_info": purpose,
                "booking_start": b_start,
                "booking_end": b_end,
                "actual_checkin": None,
                "expected_available_time": b_end,
                "is_overdue": False,
                "active_session_id": None,
                "active_booking_id": current_or_upcoming_booking.booking_id,
                "last_updated": now
            }

    # 4. Vacant and Available for Booking
    # Find next reservation after now to show until when it is available
    next_booking = db.query(models.Booking).filter(
        models.Booking.room_id == room.room_id,
        models.Booking.booking_status == models.BookingStatusEnum.CONFIRMED,
        models.Booking.start_time > now
    ).order_by(models.Booking.start_time.asc()).first()

    available_until = next_booking.start_time if next_booking else None

    return {
        "room_id": room.room_id,
        "room_number": room.room_number,
        "building_id": room.building_id,
        "building_name": room.building.name if room.building else "Campus Building",
        "floor": room.floor or 1,
        "capacity": room.capacity,
        "room_type": room.room_type or "General Room",
        "facilities": room.facilities,
        "live_status": "vacant",
        "status_color": "green",
        "status_label": "Vacant",
        "status_details": f"Available for Booking{' until ' + available_until.strftime('%H:%M') if available_until else ''}",
        "faculty_name": None,
        "class_info": None,
        "booking_start": None,
        "booking_end": None,
        "actual_checkin": None,
        "expected_available_time": None,
        "is_overdue": False,
        "active_session_id": None,
        "active_booking_id": None,
        "last_updated": now
    }


def get_all_rooms_live_status(
    db: Session,
    building_id: Optional[int] = None,
    floor: Optional[int] = None,
    room_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    min_capacity: Optional[int] = None,
    vacant_only: bool = False,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(models.Classroom)

    if building_id:
        query = query.filter(models.Classroom.building_id == building_id)
    if floor:
        query = query.filter(models.Classroom.floor == floor)
    if room_type:
        query = query.filter(models.Classroom.room_type.ilike(f"%{room_type}%"))
    if min_capacity:
        query = query.filter(models.Classroom.capacity >= min_capacity)
    if search:
        query = query.filter(models.Classroom.room_number.ilike(f"%{search}%"))

    rooms = query.order_by(models.Classroom.room_number.asc()).all()
    now = get_current_utc()

    results = []
    for r in rooms:
        status_info = compute_room_live_status(db, r, now)
        if vacant_only and status_info["live_status"] != "vacant":
            continue
        if status_filter and status_filter != "all" and status_info["live_status"] != status_filter:
            continue
        results.append(status_info)

    return results


def check_in_faculty(db: Session, user: models.User, room_id: int, booking_id: Optional[int] = None) -> models.OccupancySession:
    now = get_current_utc()

    # Rule 1: User must be faculty or admin
    if user.role not in [models.RoleEnum.FACULTY, models.RoleEnum.ADMIN]:
        raise ValueError("Only Faculty or Administrators can check into a classroom.")

    # Rule 2: Room must exist
    room = db.query(models.Classroom).filter(models.Classroom.room_id == room_id).first()
    if not room:
        raise ValueError("Specified room not found.")

    # Rule 3: Faculty cannot check into multiple rooms simultaneously
    existing_faculty_session = db.query(models.OccupancySession).filter(
        models.OccupancySession.faculty_user_id == user.user_id,
        models.OccupancySession.check_out_time.is_(None),
        models.OccupancySession.session_status == "active"
    ).first()

    if existing_faculty_session:
        raise ValueError(f"You already have an active class session in room {existing_faculty_session.room.room_number}. Please check out first.")

    # Rule 4: Room cannot be under maintenance
    active_maint = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.room_id == room_id,
        models.MaintenanceLog.start_date <= now,
        models.MaintenanceLog.end_date >= now,
        models.MaintenanceLog.status.in_(["Scheduled", "In Progress", "active"])
    ).first()
    if active_maint:
        raise ValueError(f"Cannot check in: Room {room.room_number} is currently under maintenance ({active_maint.reason}).")

    # Rule 5: Room cannot have an existing active occupancy session from another faculty
    existing_room_session = db.query(models.OccupancySession).filter(
        models.OccupancySession.room_id == room_id,
        models.OccupancySession.check_out_time.is_(None),
        models.OccupancySession.session_status == "active"
    ).first()

    if existing_room_session:
        raise ValueError(f"Room {room.room_number} is already occupied by {existing_room_session.faculty.name}.")

    # If booking_id provided, verify it belongs to this room
    booking = None
    if booking_id:
        booking = db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first()
        if not booking:
            raise ValueError("Associated booking not found.")
        if booking.room_id != room_id:
            raise ValueError(f"Booking {booking_id} is assigned to room {booking.room.room_number}, not room {room.room_number}.")
        if user.role == models.RoleEnum.FACULTY and booking.user_id != user.user_id and booking.approver_id != user.user_id:
            raise ValueError("You are not authorized for this specific booking.")
    else:
        # Auto-match with an active or upcoming booking for this faculty in this room
        booking = db.query(models.Booking).filter(
            models.Booking.room_id == room_id,
            models.Booking.user_id == user.user_id,
            models.Booking.booking_status == models.BookingStatusEnum.CONFIRMED,
            models.Booking.start_time <= now + timedelta(minutes=60),
            models.Booking.end_time >= now - timedelta(minutes=30)
        ).first()

    # Create session
    new_session = models.OccupancySession(
        room_id=room_id,
        faculty_user_id=user.user_id,
        booking_id=booking.booking_id if booking else None,
        check_in_time=now,
        session_status="active",
        occupancy_source="faculty_checkin" if user.role == models.RoleEnum.FACULTY else "admin_checkin"
    )
    db.add(new_session)

    # Audit notification
    notif = models.Notification(
        user_id=user.user_id,
        message=f"Checked into Room {room.room_number} at {now.strftime('%H:%M')}.",
        notification_type=models.NotificationTypeEnum.SUCCESS
    )
    db.add(notif)

    db.commit()
    db.refresh(new_session)
    return new_session


def check_out_faculty(db: Session, user: models.User, session_id: Optional[int] = None, room_id: Optional[int] = None) -> models.OccupancySession:
    now = get_current_utc()

    query = db.query(models.OccupancySession).filter(
        models.OccupancySession.check_out_time.is_(None),
        models.OccupancySession.session_status.in_(["active", "overdue"])
    )

    if session_id:
        query = query.filter(models.OccupancySession.session_id == session_id)
    elif room_id:
        query = query.filter(models.OccupancySession.room_id == room_id)
    else:
        query = query.filter(models.OccupancySession.faculty_user_id == user.user_id)

    session = query.order_by(models.OccupancySession.check_in_time.desc()).first()

    if not session:
        raise ValueError("No active occupancy session found to check out.")

    if user.role != models.RoleEnum.ADMIN and session.faculty_user_id != user.user_id:
        raise ValueError("You are not authorized to check out another faculty's session.")

    session.check_out_time = now
    session.session_status = "completed"

    notif = models.Notification(
        user_id=session.faculty_user_id,
        message=f"Checked out of Room {session.room.room_number} at {now.strftime('%H:%M')}. Room is now released.",
        notification_type=models.NotificationTypeEnum.INFO
    )
    db.add(notif)

    db.commit()
    db.refresh(session)
    return session


def change_classroom_atomic(
    db: Session,
    user: models.User,
    current_room_id: int,
    destination_room_id: int,
    booking_id: Optional[int] = None,
    reason: Optional[str] = "Relocation during class"
) -> models.RoomChangeHistory:
    now = get_current_utc()

    if user.role not in [models.RoleEnum.FACULTY, models.RoleEnum.ADMIN]:
        raise ValueError("Only Faculty or Administrators can transfer a classroom session.")

    if current_room_id == destination_room_id:
        raise ValueError("Destination room cannot be the same as the current room.")

    # 1. Fetch current active session for this user/room
    active_session = db.query(models.OccupancySession).filter(
        models.OccupancySession.room_id == current_room_id,
        models.OccupancySession.faculty_user_id == user.user_id,
        models.OccupancySession.check_out_time.is_(None),
        models.OccupancySession.session_status.in_(["active", "overdue"])
    ).first()

    if not active_session and user.role == models.RoleEnum.ADMIN:
        # Admins can transfer any active session in the room
        active_session = db.query(models.OccupancySession).filter(
            models.OccupancySession.room_id == current_room_id,
            models.OccupancySession.check_out_time.is_(None),
            models.OccupancySession.session_status.in_(["active", "overdue"])
        ).first()

    if not active_session:
        raise ValueError(f"No active session found in room ID {current_room_id} to transfer.")

    # 2. Check destination room
    dest_room = db.query(models.Classroom).filter(models.Classroom.room_id == destination_room_id).first()
    if not dest_room:
        raise ValueError("Destination room does not exist.")

    # 3. Check destination maintenance
    dest_maint = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.room_id == destination_room_id,
        models.MaintenanceLog.start_date <= now,
        models.MaintenanceLog.end_date >= now,
        models.MaintenanceLog.status.in_(["Scheduled", "In Progress", "active"])
    ).first()
    if dest_maint:
        raise ValueError(f"Destination Room {dest_room.room_number} is under maintenance ({dest_maint.reason}).")

    # 4. Check destination active occupancy
    dest_active_session = db.query(models.OccupancySession).filter(
        models.OccupancySession.room_id == destination_room_id,
        models.OccupancySession.check_out_time.is_(None),
        models.OccupancySession.session_status.in_(["active", "overdue"])
    ).first()
    if dest_active_session:
        raise ValueError(f"Destination Room {dest_room.room_number} is already occupied by {dest_active_session.faculty.name}.")

    # 5. Check destination conflicting confirmed bookings
    # Look for confirmed booking currently ongoing in destination room
    dest_conflict_booking = db.query(models.Booking).filter(
        models.Booking.room_id == destination_room_id,
        models.Booking.booking_status == models.BookingStatusEnum.CONFIRMED,
        models.Booking.start_time <= now + timedelta(minutes=15),
        models.Booking.end_time > now
    ).first()
    if dest_conflict_booking and dest_conflict_booking.user_id != user.user_id:
        raise ValueError(f"Destination Room {dest_room.room_number} has a conflicting confirmed booking ({dest_conflict_booking.purpose}).")

    try:
        # ATOMIC EXECUTION
        orig_room = active_session.room
        effective_booking = active_session.booking
        if not effective_booking and booking_id:
            effective_booking = db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first()

        # Step A: Close original occupancy session
        active_session.check_out_time = now
        active_session.session_status = "completed"

        # Step B: If there is an associated booking, update its room_id to the destination room
        if effective_booking:
            effective_booking.room_id = destination_room_id

        # Step C: Create new occupancy session in destination room
        new_session = models.OccupancySession(
            room_id=destination_room_id,
            faculty_user_id=active_session.faculty_user_id,
            booking_id=effective_booking.booking_id if effective_booking else None,
            check_in_time=now,
            session_status="active",
            occupancy_source="room_transfer"
        )
        db.add(new_session)

        # Step D: Record in room_change_history
        change_record = models.RoomChangeHistory(
            booking_id=effective_booking.booking_id if effective_booking else None,
            original_room_id=current_room_id,
            destination_room_id=destination_room_id,
            faculty_user_id=user.user_id,
            change_reason=reason,
            effective_start_time=now,
            change_status="completed"
        )
        db.add(change_record)

        # Step E: Broadcast notifications to faculty and students
        # Notify the faculty
        db.add(models.Notification(
            user_id=active_session.faculty_user_id,
            message=f"Class moved from {orig_room.room_number} to {dest_room.room_number}. Reason: {reason}",
            notification_type=models.NotificationTypeEnum.WARNING
        ))

        # Notify students (all students or booking attendees)
        students = db.query(models.User).filter(models.User.role == models.RoleEnum.STUDENT).all()
        for s in students:
            db.add(models.Notification(
                user_id=s.user_id,
                message=f"ROOM CHANGE ALERT: Class with {active_session.faculty.name} has moved to Room {dest_room.room_number} (was {orig_room.room_number}).",
                notification_type=models.NotificationTypeEnum.WARNING
            ))

        db.commit()
        db.refresh(change_record)
        return change_record

    except Exception as e:
        db.rollback()
        raise e


def get_faculty_current_class(db: Session, user: models.User) -> Dict[str, Any]:
    now = get_current_utc()

    # Find active occupancy session
    active_session = db.query(models.OccupancySession).filter(
        models.OccupancySession.faculty_user_id == user.user_id,
        models.OccupancySession.check_out_time.is_(None),
        models.OccupancySession.session_status.in_(["active", "overdue"])
    ).order_by(models.OccupancySession.check_in_time.desc()).first()

    # Find upcoming or current booking
    current_booking = db.query(models.Booking).filter(
        models.Booking.user_id == user.user_id,
        models.Booking.booking_status == models.BookingStatusEnum.CONFIRMED,
        models.Booking.end_time > now,
        models.Booking.start_time <= now + timedelta(hours=3)
    ).order_by(models.Booking.start_time.asc()).first()

    session_data = None
    if active_session:
        session_data = {
            "session_id": active_session.session_id,
            "room_id": active_session.room_id,
            "room_number": active_session.room.room_number,
            "check_in_time": active_session.check_in_time,
            "booking_id": active_session.booking_id,
            "session_status": active_session.session_status,
            "duration_minutes": int((now - active_session.check_in_time.replace(tzinfo=timezone.utc)).total_seconds() / 60)
        }

    booking_data = None
    if current_booking:
        booking_data = {
            "booking_id": current_booking.booking_id,
            "room_id": current_booking.room_id,
            "room_number": current_booking.room.room_number,
            "start_time": current_booking.start_time,
            "end_time": current_booking.end_time,
            "purpose": current_booking.purpose,
            "attendee_count": current_booking.attendee_count
        }

    return {
        "active_session": session_data,
        "current_booking": booking_data,
        "server_time": now
    }

