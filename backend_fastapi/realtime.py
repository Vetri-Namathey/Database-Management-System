# FastAPI does not natively support Socket.IO, but you can use 'python-socketio' with 'ASGI' apps
import socketio

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@sio.event
def connect(sid, environ):
    print(f"User connected: {sid}")

@sio.event
def disconnect(sid):
    print(f"User disconnected: {sid}")

# To integrate with FastAPI, use:
# from fastapi import FastAPI
# from realtime import sio
# app = FastAPI()
# app.mount('/ws', socketio.ASGIApp(sio))
