import os
import platform

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from contextlib import contextmanager

router = APIRouter()

#@contextmanager
def get_db_native():
    #print(DATABASE_URL)
    conn = psycopg2.connect(
        DATABASE_URL
    )
    print(" Database connected :  ",conn)
    try:
        yield conn
    finally:
        conn.close()