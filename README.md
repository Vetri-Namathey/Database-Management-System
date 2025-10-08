# CricBid — IPL Auction System

CricBid is a modern, full-stack web application for real-time cricket auctions, team management, and analytics. It features a FastAPI + SQLAlchemy backend and a Vite + React frontend. This project was built for a DBMS course and demonstrates advanced database and web development concepts.

## Features
- User & Admin registration/login (hashed passwords)
- Real-time auction dashboard
- Team management, wallet, and leaderboard
- Admin dashboard with stats, user & auction management
- Modern, responsive UI
- RESTful API (FastAPI)
- SQLAlchemy ORM models
- Docker support for backend

## Project Structure
```
auct-proj/
   backend_fastapi/      # FastAPI backend (Python)
      main.py             # FastAPI app entrypoint
      routers.py          # API endpoints
      models.py           # SQLAlchemy models
      crud.py             # DB helpers
      run_migration.py    # DB migration/init
      requirements.txt
      .env.example        # (template, do not commit secrets)
   frontend/             # Vite + React frontend (TypeScript)
      package.json
      src/
         pages/
         components/
         stores/
         lib/
   README.md
   ...other docs
```

## Quick Start

### Backend (FastAPI)
```powershell
cd backend_fastapi
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Copy .env.example to .env and fill in your DB credentials
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Vite + React)
```powershell
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

If both are running, the frontend will call backend APIs (ensure CORS/`ALLOWED_ORIGINS` is set in backend `.env`).

## Database Setup (PostgreSQL)
Create a database and user in PostgreSQL:
```sql
CREATE USER cricuser WITH PASSWORD 'strongpassword';
CREATE DATABASE cricbid WITH OWNER cricuser;
```
Set `DATABASE_URL` in `backend_fastapi/.env`:
```
DATABASE_URL=postgresql://cricuser:strongpassword@localhost:5432/cricbid
```
Run migrations (if needed):
```powershell
python run_migration.py
```

## Environment Variables
See `backend_fastapi/.env.example` and `frontend/.env` for templates. **Never commit real secrets.**



## Security
- Do NOT commit `.env` files or secrets
- If secrets are leaked, rotate them and purge history
- Use `.env.example` for templates

## Troubleshooting
- Backend DB errors: check `DATABASE_URL`, ensure PostgreSQL is running
- CORS errors: add frontend origin to `ALLOWED_ORIGINS` in backend `.env`
- WebSocket issues: check URLs and backend endpoints
- Frontend blank: check `VITE_API_URL` and browser console

## Credits
- Authors: Venkatram KS, Sanggit Saaran K C S, Vishal Seshadri B, Surya HA
- Guide: Dr. Archudha A
#

