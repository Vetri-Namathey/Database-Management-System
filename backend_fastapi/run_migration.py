#!/usr/bin/env python3

from database import engine
from sqlalchemy import text
import sys

def run_migration():
    """Add start_time column to auctions table"""
    
    with engine.connect() as conn:
        try:
            # Check if column already exists (PostgreSQL)
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'auctions' AND column_name = 'start_time'
            """))
            
            if result.fetchone():
                print("start_time column already exists in auctions table.")
                return True
                
            # Add the column
            conn.execute(text("ALTER TABLE auctions ADD COLUMN start_time TIMESTAMP NULL"))
            conn.commit()
            print("✅ Migration completed successfully! start_time column added to auctions table.")
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            # Try to add the column anyway in case the check failed
            try:
                conn.execute(text("ALTER TABLE auctions ADD COLUMN start_time TIMESTAMP NULL"))
                conn.commit()
                print("✅ Column added successfully on retry!")
                return True
            except Exception as e2:
                if "already exists" in str(e2).lower():
                    print("✅ Column already exists!")
                    return True
                print(f"❌ Final attempt failed: {e2}")
                return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)