from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from routers import router
from fastapi.staticfiles import StaticFiles
from auction_manager import countdown_manager
import os
import asyncio

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session middleware (for login persistence)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "supersecret"),
    session_cookie="cricbid_session",
    max_age=30 * 24 * 60 * 60,  # 30 days
    same_site="lax",
    https_only=False,  # Set to True in production with HTTPS
)

@app.on_event("startup")
async def startup_event():
    """Application startup - countdown manager disabled for manual progression"""
    # asyncio.create_task(countdown_manager.start_countdown_manager())
    print("Application started - manual auction progression enabled")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    # countdown_manager.stop_countdown_manager()
    print("Application shutdown")

# Health check
@app.get("/api/health")
async def health():
    return {
        "status": "OK",
        "timestamp": str(__import__('datetime').datetime.utcnow()),
        "environment": os.getenv("NODE_ENV", "development")
    }

# Include routers
app.include_router(router, prefix="/api")

# Mount static files from React UI build
const_static_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
app.mount("/", StaticFiles(directory=const_static_path, html=True), name="static")

# 404 handler
@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"success": False, "message": "Route not found"})
