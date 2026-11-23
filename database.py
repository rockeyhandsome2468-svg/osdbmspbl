import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Default to MySQL for production/PBL requirements, fallback to sqlite if missing
# To use MySQL: mysql+pymysql://user:password@localhost:3306/smart_campus
# To use SQLite for dev without setup: sqlite:///./sql_app.db
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smart_campus.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite requires check_same_thread=False for FastAPI
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

