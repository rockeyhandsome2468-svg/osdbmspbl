from database import SessionLocal, engine, Base
import models
from auth import get_password_hash
from datetime import datetime, timezone, timedelta

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    if db.query(models.User).first():
        print("Database already seeded.")
        return
        
    print("Seeding database with PRO data...")
    
    # Users
    admin = models.User(name="Admin User", email="admin@campus.edu", password_hash=get_password_hash("admin123"), role=models.RoleEnum.ADMIN, priority_level=1)
    faculty = models.User(name="Dr. Smith", email="smith@campus.edu", password_hash=get_password_hash("faculty123"), role=models.RoleEnum.FACULTY, priority_level=2)
    faculty2 = models.User(name="Prof. Johnson", email="johnson@campus.edu", password_hash=get_password_hash("faculty123"), role=models.RoleEnum.FACULTY, priority_level=2)
    student = models.User(name="Jane Doe", email="jane@campus.edu", password_hash=get_password_hash("student123"), role=models.RoleEnum.STUDENT, priority_level=4)
    db.add_all([admin, faculty, faculty2, student])
    db.commit()

    # Facilities
    proj = models.Facility(name="4K Projector")
    ac = models.Facility(name="Air Conditioning")
    board = models.Facility(name="Smartboard")
    mic = models.Facility(name="Microphone System")
    db.add_all([proj, ac, board, mic])
    db.commit()
    
    # Buildings
    b1 = models.Building(name="BTech Block", block_code="BT", total_floors=3)
    b2 = models.Building(name="CSIT Block", block_code="CS", total_floors=4)
    db.add_all([b1, b2])
    db.commit()
    
    # Rooms (50+ rooms)
    rooms_data = [
        (b1.building_id, "AUD-1", 150, "Auditorium", 1, [proj, ac, mic, board]),
        (b2.building_id, "MR-1", 20, "Meeting Room", 1, [ac, board]),
        (b1.building_id, "SR-1", 30, "Seminar Room", 2, [proj, ac, board]),
        (b2.building_id, "SR-2", 35, "Seminar Room", 2, [board]),
    ]

    # Add 30 Classrooms (CR-1 to CR-30)
    for i in range(1, 31):
        building = b1 if i <= 15 else b2
        floor = (i % 3) + 1
        cap = 40 if i % 2 == 0 else 60
        facs = [ac, board] if i % 3 == 0 else [proj, ac]
        rooms_data.append((building.building_id, f"CR-{i}", cap, "Classroom", floor, facs))

    # Add 10 Lecture Halls (LT-1 to LT-10)
    for i in range(1, 11):
        building = b1 if i <= 5 else b2
        floor = (i % 2) + 1
        cap = 100 if i % 2 == 0 else 150
        facs = [proj, ac, mic]
        rooms_data.append((building.building_id, f"LT-{i}", cap, "Lecture Hall", floor, facs))

    # Add 10 Labs (LAB-1 to LAB-10)
    for i in range(1, 11):
        building = b1 if i <= 5 else b2
        floor = 1
        cap = 30 if i % 2 == 0 else 40
        facs = [ac, board]
        rooms_data.append((building.building_id, f"LAB-{i}", cap, "Lab", floor, facs))
    
    rooms = []
    for b_id, r_num, cap, r_type, fl, facs in rooms_data:
        r = models.Classroom(building_id=b_id, room_number=r_num, capacity=cap, room_type=r_type, floor=fl)
        r.facilities.extend(facs)
        db.add(r)
        rooms.append(r)
    db.commit()
    
    # Dummy Bookings
    now = datetime.now(timezone.utc)
    b1 = models.Booking(room_id=rooms[0].room_id, user_id=faculty.user_id, start_time=now + timedelta(hours=1), end_time=now + timedelta(hours=3), booking_status=models.BookingStatusEnum.CONFIRMED, booking_priority=2, attendee_count=100, purpose="CS101 Midterm")
    b2 = models.Booking(room_id=rooms[1].room_id, user_id=faculty2.user_id, start_time=now + timedelta(days=1, hours=2), end_time=now + timedelta(days=1, hours=4), booking_status=models.BookingStatusEnum.CONFIRMED, booking_priority=2, attendee_count=30, purpose="Physics Lab")
    b3 = models.Booking(room_id=rooms[5].room_id, user_id=student.user_id, start_time=now + timedelta(hours=2), end_time=now + timedelta(hours=3), booking_status=models.BookingStatusEnum.CONFIRMED, booking_priority=4, attendee_count=15, purpose="Study Group")
    # Live Discrepancy Demo: Class started 25 minutes ago, but faculty has not checked in (exceeded 15 min grace period)
    b4 = models.Booking(room_id=rooms[6].room_id, user_id=faculty.user_id, start_time=now - timedelta(minutes=25), end_time=now + timedelta(minutes=35), booking_status=models.BookingStatusEnum.CONFIRMED, booking_priority=2, attendee_count=45, purpose="Operating Systems (Late Check-In Demo)")
    db.add_all([b1, b2, b3, b4])
    db.commit()
    
    # Maintenance
    m1 = models.MaintenanceLog(room_id=rooms[4].room_id, start_date=now - timedelta(days=1), end_date=now + timedelta(days=2), reason="AC Repair", status="In Progress")
    db.add(m1)
    db.commit()

    # Initial Audit Trail Records & Demo Strike
    student.strikes_count = 1
    audit_logs = [
        models.AuditLog(
            actor_user_id=admin.user_id,
            actor_name=admin.name,
            actor_role="admin",
            action="MAINTENANCE_SCHEDULED",
            target_type="ROOM",
            target_id=str(rooms[4].room_id),
            details="Room CR-1 scheduled for AC repair and coil replacement.",
            created_at=now - timedelta(days=1, hours=2)
        ),
        models.AuditLog(
            actor_user_id=faculty.user_id,
            actor_name=faculty.name,
            actor_role="faculty",
            action="BOOKING_CREATED",
            target_type="BOOKING",
            target_id=str(b1.booking_id),
            details="Booking created for CR-1. Purpose: CS101 Midterm Exam",
            created_at=now - timedelta(hours=6)
        ),
        models.AuditLog(
            actor_user_id=admin.user_id,
            actor_name=admin.name,
            actor_role="admin",
            action="STRIKE_ISSUED",
            target_type="USER",
            target_id=str(student.user_id),
            details=f"No-show strike issued to {student.name}. Prior ghost booking auto-released.",
            created_at=now - timedelta(hours=3)
        ),
        models.AuditLog(
            actor_user_id=None,
            actor_name="System Policy Engine",
            actor_role="system",
            action="AUTO_RELEASE_NO_SHOW",
            target_type="BOOKING",
            target_id="99",
            details="Room LAB-2 auto-released. User failed to check in within 15-minute grace window.",
            created_at=now - timedelta(hours=3)
        ),
        models.AuditLog(
            actor_user_id=faculty.user_id,
            actor_name=faculty.name,
            actor_role="faculty",
            action="PREEMPTION_SMART_BUMP",
            target_type="BOOKING",
            target_id=str(b3.booking_id),
            details="Smart Bump: Student study session moved from CR-2 to CR-4 to accommodate Departmental Lecture.",
            created_at=now - timedelta(hours=1)
        )
    ]
    db.add_all(audit_logs)
    db.commit()
    
    print("Seeding complete.")

if __name__ == "__main__":
    seed()
