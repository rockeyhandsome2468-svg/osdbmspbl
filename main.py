from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

# Create tables if they don't exist (useful for simple setup, normally handled by Alembic)
Base.metadata.create_all(bind=engine)

from routers import auth, bookings, allocations
# To be added later: buildings, classrooms, facilities, timetables, maintenance, analytics, notifications

app = FastAPI(
    title="Smart Campus Classroom Management API",
    description="Dynamic Resource Allocation Platform for College Campus",
    version="1.0.0"
)

# CORS config
origins = [
    "http://localhost:5173", # Vite default
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Smart Campus API is running"}

app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(allocations.router)

# Basic routers for CRUD operations that aren't strictly specified in the instruction snippet but are required for completion
from routers import buildings, classrooms, facilities, timetables, maintenance, analytics, notifications, users, occupancy, audit

app.include_router(buildings.router)
app.include_router(classrooms.router)
app.include_router(facilities.router)
app.include_router(timetables.router)
app.include_router(maintenance.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(users.router)
app.include_router(occupancy.router)
app.include_router(audit.router)


    