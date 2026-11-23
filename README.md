# Smart Campus Classroom Management and Dynamic Resource Allocation Platform

## Problem Statement Motivation & Overview
In many modern college campuses, classroom and resource management is handled manually or with disconnected spreadsheets, leading to internal fragmentation, double-booking, and preemption conflicts during priority events. Furthermore, **scheduled bookings often disagree with actual physical presence**: faculty arrive late, cancel without notice, leave early, or need to move rooms mid-class due to equipment failures.

This system is a full-stack enterprise campus management platform addressing these challenges by combining:
1. **Best-Fit Spatial Allocation Algorithm**: Minimizes seat vacancy and internal fragmentation.
2. **Priority Preemption Engine**: Enables authorized faculty/admin sessions to preempt lower-priority requests with automated rollback and audit logs.
3. **Real-Time Classroom Occupancy & Telemetry**: Maintains strict separation between **Scheduled Bookings** and **Actual Physical Occupancy** with faculty check-in/out, live WebSockets, and atomic room transfers.
4. **Discrepancy & Overdue Detection**: Automatically flags stale sessions and late arrivals for administrative review.

---

## Key Features

### 1. Real-Time Classroom Status Dashboard
- **Live Classroom Telemetry Grid**: Displays all 54 campus classrooms across **BTech Block** and **CSIT Block**.
- **Accessible Color Coding**:
  - 🟢 **Vacant (Green)**: Verified available for booking.
  - 🔴 **Occupied (Red)**: Verified active faculty occupancy session.
  - 🔵 **Reserved / Upcoming (Blue)**: Scheduled reservation confirmed; awaiting physical arrival.
  - ⚪ **Under Maintenance (Grey)**: Facility repair or scheduled outage.
  - 🟡 **Needs Verification (Amber)**: Booking discrepancy, late arrival, or overdue session (>15 min grace period).
- **Search & Filter Matrix**: Filter by building, floor (1–4), room type (Classroom, Lab, Lecture Hall, Seminar, Auditorium), capacity, and facilities (4K Projector, AC, Smartboard, Mic).
- **"Show Vacant Rooms" Quick Filter**: Instant toggle for students and teachers to locate an open room immediately.
- **WebSocket & Polling Engine**: Real-time broadcast pushes changes without manual page refresh.

### 2. Faculty Classroom Check-In & Check-Out ("My Current Class" Panel)
- Dedicated teaching panel for faculty.
- **Check-In / Mark Occupied**: Verifies faculty identity, room assignment, and validates that the faculty member is not occupying multiple rooms simultaneously.
- **Check-Out / Mark Vacant**: Records checkout timestamp and frees the room or transitions it to the next valid reservation.
- **Grace Period Safeguards**: 15-minute grace period protects against false vacancy while class is still running.

### 3. Atomic Classroom Transfer ("Change Classroom / Move Class")
- Relocate an active class mid-session (e.g., due to projector malfunction or AC failure).
- Live query of vacant candidate rooms matching capacity and equipment requirements.
- **Single Atomic Transaction**: Closes original session, reassigns booking room, starts destination occupancy session, and generates a `room_change_history` audit record.
- **Instant Student Alerts**: Emits real-time notification alerts to connected student dashboards.

### 4. Separate Scheduled vs. Actual Room States
- **Scheduled Bookings (`bookings`)**: Planned reservations or timetable entries.
- **Actual Occupancy (`occupancy_sessions`)**: Verified physical presence with server-side check-in/out timestamps.

### 5. Admin Control Center & Audit Trails
- Monitor active occupancy sessions.
- Force-checkout / override stale or abandoned classroom sessions.
- Comprehensive relocation audit logs (`room_change_history`).

---

## Technology Stack

- **Backend**: FastAPI (Python 3.10+ / 3.14), SQLAlchemy ORM, Pydantic v2, Passlib/Bcrypt, WebSockets.
- **Database**: SQLite (default zero-configuration, `smart_campus.db`) / MySQL compatible.
- **Frontend**: React 18, Vite 5, Tailwind CSS, Recharts, Lucide React, Axios.

---

## Setup & Execution Instructions

### Prerequisites
- Python 3.10+ installed
- Node.js (v18+) & npm installed

### 1. Backend Setup
1. Open a terminal in `backend/`:
   ```powershell
   cd backend
   ```
2. Activate your virtual environment:
   ```powershell
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Seed or reset the campus database (54 rooms, sample users, bookings):
   ```powershell
   python seed.py
   ```
5. Start the FastAPI server:
   ```powershell
   python -m uvicorn main:app --reload
   ```
   *Runs at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).*

---

### 2. Frontend Setup
1. Open a second terminal in `frontend/`:
   ```powershell
   cd frontend
   ```
2. Install npm dependencies:
   ```powershell
   npm.cmd install
   ```
3. Start the development server:
   ```powershell
   npm.cmd run dev
   ```
   *Runs at `http://localhost:5173`.*

---

## Demo Credentials

All test accounts use the password: `role123` (or `admin123`, `faculty123`, `student123`).

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@campus.edu` | `admin123` | Full visibility, admin overrides, all bookings, logs |
| **Faculty 1** | `smith@campus.edu` | `faculty123` | Check-in, check-out, room transfer, booking approval |
| **Faculty 2** | `johnson@campus.edu` | `faculty123` | Independent faculty workspace |
| **Student** | `jane@campus.edu` | `student123` | Live room search, room-change alerts, pending requests |

---

## Step-by-Step PBL Presentation Demo Guide

Follow these steps to demonstrate the platform during your college presentation:

### Step 1: Real-Time Telemetry & Vacant Room Finder
1. Log in as **Student** (`jane@campus.edu` / `student123`).
2. Point out the **Live Classroom Status Grid** on the Dashboard with 54 rooms.
3. Click the **"Show Vacant Rooms"** toggle to highlight immediate classroom availability.
4. Filter by **BTech Block** or **CSIT Block**, and filter by room type (e.g., *Lecture Hall*).
5. Note the color indicators: Green (Vacant), Red (Occupied), Blue (Reserved), Grey (Maintenance), Amber (Needs Verification).

### Step 2: Faculty Check-In & Physical Occupancy
1. In another browser or incognito window, log in as **Faculty** (`smith@campus.edu` / `faculty123`).
2. Notice the dedicated **"My Teaching Panel & Live Occupancy"** at the top of the dashboard.
3. Click **"Check In / Mark as Occupied"** on a room.
4. Immediately observe the room status flip to **🔴 Occupied (Red)** on both the Faculty and Student screens without refreshing the page!

### Step 3: Mid-Class Relocation ("Change Classroom")
1. On the Faculty screen, click **"Move Class"** in the Teaching Panel.
2. The modal pops up: select an available destination room (e.g. move to a nearby vacant Lab or Lecture Hall) and choose reason *"4K Projector Failure"*.
3. Click **"Confirm Room Transfer"**.
4. Show how the backend atomically transfers the session:
   - The original room returns to **🟢 Vacant**.
   - The destination room becomes **🔴 Occupied**.
   - The Student's screen immediately pops an **amber banner alert**: *"ROOM CHANGE ALERT: Class moved to Room..."*.

### Step 4: Admin Oversight & Override
1. Log in as **Admin** (`admin@campus.edu` / `admin123`).
2. Navigate to **Admin Panel** -> **Live Occupancy** tab to see all active sessions across campus.
3. Show the **Room Change Audit** tab to inspect the timestamped relocation record.
4. Click **"Force Checkout"** on any session to demonstrate administrative override capability.

---

## Running Automated Tests

Run the backend verification suite using `pytest`:
```powershell
cd backend
.\venv\Scripts\python -m pytest tests/test_occupancy.py -v
```

All 4 test scenarios (Status precedence, Check-in/out idempotency, Atomic room transfer, and Admin override) pass with 100% compliance.
