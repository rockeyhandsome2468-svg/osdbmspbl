from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Time, Enum, Float, Table
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
from database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    FACULTY = "faculty"
    STUDENT = "student"
    REPORT_VIEWER = "report_viewer"

class RoomStatusEnum(str, enum.Enum):
    FREE = "free"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"

class BookingStatusEnum(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    PREEMPTED = "preempted"
    REJECTED = "rejected"

class NotificationTypeEnum(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.STUDENT)
    department = Column(String(100))
    priority_level = Column(Integer, default=4) # 1: Admin, 2: Faculty, 3: Clubs, 4: Students
    is_active = Column(Boolean, default=True)
    strikes_count = Column(Integer, default=0)
    is_suspended = Column(Boolean, default=False)
    suspension_until = Column(DateTime(timezone=True), nullable=True)

    bookings = relationship("Booking", foreign_keys="[Booking.user_id]", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    occupancy_sessions = relationship("OccupancySession", foreign_keys="[OccupancySession.faculty_user_id]", back_populates="faculty")


class Building(Base):
    __tablename__ = "buildings"

    building_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    block_code = Column(String(20), unique=True, index=True, nullable=False)
    total_floors = Column(Integer, default=1)

    classrooms = relationship("Classroom", back_populates="building")


room_facilities = Table(
    "room_facilities",
    Base.metadata,
    Column("room_id", Integer, ForeignKey("classrooms.room_id"), primary_key=True),
    Column("facility_id", Integer, ForeignKey("facilities.facility_id"), primary_key=True)
)


class Classroom(Base):
    __tablename__ = "classrooms"

    room_id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.building_id"))
    room_number = Column(String(50), nullable=False, unique=True)
    capacity = Column(Integer, nullable=False)
    room_type = Column(String(50)) # e.g. "Lecture Hall", "Lab", "Seminar Room"
    floor = Column(Integer, default=1)
    status = Column(Enum(RoomStatusEnum), default=RoomStatusEnum.FREE)

    building = relationship("Building", back_populates="classrooms")
    facilities = relationship("Facility", secondary=room_facilities, back_populates="rooms")
    timetables = relationship("Timetable", back_populates="room")
    bookings = relationship("Booking", back_populates="room")
    maintenance_logs = relationship("MaintenanceLog", back_populates="room")
    occupancy_sessions = relationship("OccupancySession", back_populates="room")


class Facility(Base):
    __tablename__ = "facilities"

    facility_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    rooms = relationship("Classroom", secondary=room_facilities, back_populates="facilities")


class Timetable(Base):
    __tablename__ = "timetables"

    schedule_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("classrooms.room_id"))
    day_of_week = Column(Integer) # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    course_code = Column(String(50))
    department = Column(String(100))

    room = relationship("Classroom", back_populates="timetables")


class Booking(Base):
    __tablename__ = "bookings"

    booking_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("classrooms.room_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    booking_status = Column(Enum(BookingStatusEnum), default=BookingStatusEnum.PENDING)
    booking_priority = Column(Integer, nullable=False)
    attendee_count = Column(Integer, nullable=False)
    purpose = Column(String(255))
    approver_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    room = relationship("Classroom", back_populates="bookings")
    user = relationship("User", foreign_keys=[user_id], back_populates="bookings")
    approver = relationship("User", foreign_keys=[approver_id])
    occupancy_sessions = relationship("OccupancySession", back_populates="booking")
    room_changes = relationship("RoomChangeHistory", back_populates="booking")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("classrooms.room_id"))
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    reason = Column(String(255))
    status = Column(String(50), default="Scheduled")

    room = relationship("Classroom", back_populates="maintenance_logs")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    message = Column(String(255), nullable=False)
    notification_type = Column(Enum(NotificationTypeEnum), default=NotificationTypeEnum.INFO)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")


class OccupancySession(Base):
    __tablename__ = "occupancy_sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("classrooms.room_id"), nullable=False, index=True)
    faculty_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id"), nullable=True, index=True)
    check_in_time = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    session_status = Column(String(50), default="active", index=True) # active, completed, overdue, abandoned
    occupancy_source = Column(String(50), default="faculty_checkin") # faculty_checkin, admin_override, room_transfer
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    room = relationship("Classroom", back_populates="occupancy_sessions")
    faculty = relationship("User", foreign_keys=[faculty_user_id], back_populates="occupancy_sessions")
    booking = relationship("Booking", back_populates="occupancy_sessions")


class RoomChangeHistory(Base):
    __tablename__ = "room_change_history"

    change_id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id"), nullable=True, index=True)
    original_room_id = Column(Integer, ForeignKey("classrooms.room_id"), nullable=False, index=True)
    destination_room_id = Column(Integer, ForeignKey("classrooms.room_id"), nullable=False, index=True)
    faculty_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    change_reason = Column(String(255), nullable=True)
    effective_start_time = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    effective_end_time = Column(DateTime(timezone=True), nullable=True)
    change_status = Column(String(50), default="completed") # completed, reverted
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    booking = relationship("Booking", back_populates="room_changes")
    original_room = relationship("Classroom", foreign_keys=[original_room_id])
    destination_room = relationship("Classroom", foreign_keys=[destination_room_id])
    faculty = relationship("User", foreign_keys=[faculty_user_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    actor_name = Column(String(100), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=True) # "ROOM", "USER", "BOOKING", "MAINTENANCE", "SESSION"
    target_id = Column(String(100), nullable=True)
    details = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    actor = relationship("User", foreign_keys=[actor_user_id])



