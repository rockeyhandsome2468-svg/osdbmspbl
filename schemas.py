from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, time
from models import RoleEnum, RoomStatusEnum, BookingStatusEnum, NotificationTypeEnum

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[RoleEnum] = None

# User
class UserBase(BaseModel):
    name: str
    email: EmailStr
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[RoleEnum] = RoleEnum.STUDENT
    priority_level: Optional[int] = 4

class UserResponse(UserBase):
    user_id: int
    role: RoleEnum
    priority_level: int
    is_active: bool
    strikes_count: int = 0
    is_suspended: bool = False
    suspension_until: Optional[datetime] = None

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Facility
class FacilityBase(BaseModel):
    name: str

class FacilityCreate(FacilityBase):
    pass

class FacilityResponse(FacilityBase):
    facility_id: int

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Classroom
class ClassroomBase(BaseModel):
    room_number: str
    capacity: int
    room_type: Optional[str] = None
    floor: Optional[int] = 1

class ClassroomCreate(ClassroomBase):
    building_id: int
    facility_ids: Optional[List[int]] = []

class ClassroomResponse(ClassroomBase):
    room_id: int
    building_id: int
    status: RoomStatusEnum
    facilities: List[FacilityResponse] = []

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Building
class BuildingBase(BaseModel):
    name: str
    block_code: str
    total_floors: Optional[int] = 1

class BuildingCreate(BuildingBase):
    pass

class BuildingResponse(BuildingBase):
    building_id: int
    classrooms: List[ClassroomResponse] = []

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Timetable
class TimetableBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    course_code: Optional[str] = None
    department: Optional[str] = None

class TimetableCreate(TimetableBase):
    room_id: int

class TimetableResponse(TimetableBase):
    schedule_id: int
    room_id: int

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Booking
class BookingBase(BaseModel):
    start_time: datetime
    end_time: datetime
    attendee_count: int
    purpose: Optional[str] = None

class BookingCreate(BookingBase):
    room_id: int
    approver_id: Optional[int] = None

class BookingResponse(BookingBase):
    booking_id: int
    room_id: int
    user_id: int
    booking_status: BookingStatusEnum
    booking_priority: int
    created_at: datetime
    room: Optional[ClassroomResponse] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Maintenance
class MaintenanceBase(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None
    status: Optional[str] = "Scheduled"

class MaintenanceCreate(MaintenanceBase):
    room_id: int

class MaintenanceResponse(MaintenanceBase):
    log_id: int
    room_id: int
    room: Optional[ClassroomResponse] = None

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Notification
class NotificationResponse(BaseModel):
    notification_id: int
    message: str
    notification_type: NotificationTypeEnum
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


# Allocation
class AllocationRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    attendee_count: int
    facilities: Optional[List[int]] = []

# Occupancy & Real-Time Live Status
class OccupancySessionResponse(BaseModel):
    session_id: int
    room_id: int
    faculty_user_id: int
    booking_id: Optional[int] = None
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    session_status: str
    occupancy_source: str
    created_at: datetime
    room: Optional[ClassroomResponse] = None
    faculty: Optional[UserResponse] = None

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


class CheckInRequest(BaseModel):
    room_id: int
    booking_id: Optional[int] = None

class CheckOutRequest(BaseModel):
    session_id: Optional[int] = None
    room_id: Optional[int] = None

class RoomChangeRequest(BaseModel):
    current_room_id: int
    destination_room_id: int
    booking_id: Optional[int] = None
    reason: Optional[str] = "Relocation during class"

class RoomChangeResponse(BaseModel):
    change_id: int
    booking_id: Optional[int] = None
    original_room_id: int
    destination_room_id: int
    faculty_user_id: int
    change_reason: Optional[str] = None
    effective_start_time: datetime
    effective_end_time: Optional[datetime] = None
    change_status: str
    created_at: datetime

    class Config:
        from_attributes = True



# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None


class AdminOverrideRequest(BaseModel):
    session_id: int
    action: str # "force_checkout", "resolve", "mark_overdue"
    notes: Optional[str] = None

class LiveRoomStatusResponse(BaseModel):
    room_id: int
    room_number: str
    building_id: int
    building_name: str
    floor: int
    capacity: int
    room_type: Optional[str] = None
    facilities: List[FacilityResponse] = []
    live_status: str # "vacant", "occupied", "reserved", "maintenance", "needs_verification"
    status_color: str # "green", "red", "blue", "grey", "amber"
    status_label: str # "Vacant", "Occupied", "Reserved / Upcoming", "Under Maintenance", "Needs Verification"
    status_details: str
    faculty_name: Optional[str] = None
    class_info: Optional[str] = None
    booking_start: Optional[datetime] = None
    booking_end: Optional[datetime] = None
    actual_checkin: Optional[datetime] = None
    expected_available_time: Optional[datetime] = None
    is_overdue: bool = False
    active_session_id: Optional[int] = None
    active_booking_id: Optional[int] = None
    last_updated: datetime

    class Config:
        from_attributes = True

# Audit Trail & Governance Schemas
class AuditLogResponse(BaseModel):
    log_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None

class AuditStatsResponse(BaseModel):
    total_logs: int
    no_show_releases: int
    strikes_issued: int
    force_checkouts: int
    maintenance_events: int
    room_transfers: int
    preemptions: int

class StrikeActionRequest(BaseModel):
    reason: Optional[str] = "Administrative policy action"

class AutoReleaseResponse(BaseModel):
    status: str
    message: str
    booking_id: int
    room_id: int
    room_number: str
    user_id: int
    user_name: str
    strikes_count: int
    is_suspended: bool
    suspension_until: Optional[datetime] = None



