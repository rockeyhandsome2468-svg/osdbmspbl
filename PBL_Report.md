# PBL Report: Smart Campus Classroom Management and Dynamic Resource Allocation Platform

## 1. Motivation
Traditional classroom booking systems rely on manual coordination or rudimentary first-come, first-served logic. This leads to inefficient resource utilization (e.g., a 100-seater hall used for a 10-person meeting), scheduling conflicts, and race conditions during high-demand periods. 

## 2. Objectives
- Implement a real-time classroom availability and booking system.
- Build a Best-Fit allocation algorithm to optimize resource utilization.
- Prevent double-booking using robust OS concurrency principles.
- Allow prioritized preemption for administrative overrides.

## 3. Architecture & Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts.
- **Backend**: Python FastAPI, SQLAlchemy, Pydantic, Passlib.
- **Database**: MySQL/SQLite.
- **Security**: JWT Authentication, Argon2/Bcrypt password hashing.

## 4. Operating System Concepts Highlight
- **Best-Fit Resource Allocation**: The system scans all eligible time slots and ranks rooms by the absolute difference between requested capacity and total capacity, mimicking the memory allocation algorithm to minimize "internal fragmentation" of seating space.
- **Preemption & Priority Scheduling**: Modeled after OS process scheduling. Faculty and Admins possess higher priority. If a critical event occurs, their "process" (booking) preempts lower-priority ones.
- **Concurrency & Locking**: When simultaneous requests target the same room, database row-level locking (`with_for_update`) simulates mutex locks, ensuring atomicity of the overlap check and subsequent insert. 

## 5. Implementation Summary
The platform consists of RESTful APIs managing users, buildings, rooms, facilities, and bookings. The frontend consumes these APIs to display live dashboards, responsive search interfaces, and actionable booking flows. 

## 6. Assumptions & Limitations
- Hardware/sensors for live occupancy detection are out of scope.
- In zero-setup mode, SQLite is utilized which handles concurrency at the DB file level rather than row level (unlike the MySQL implementation provided in the code).

## 7. Future Scope
- Predictive analytics to forecast peak usage times.
- Mobile application using React Native.

