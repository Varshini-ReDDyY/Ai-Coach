from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest

router = APIRouter()


def generate_token(user_id: str) -> str:
    payload = {
        "id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def user_response(user: User) -> dict:
    return {"id": str(user.id), "name": user.name, "email": user.email}


@router.post("/register")
async def register(body: RegisterRequest):
    email = body.email.lower().strip()

    if await User.find_one(User.email == email):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt(rounds=10)).decode()

    user = User(name=body.name.strip(), email=email, password=hashed)
    await user.insert()

    return {
        "success": True,
        "message": "Registration successful",
        "token": generate_token(str(user.id)),
        "user": user_response(user),
    }


@router.post("/login")
async def login(body: LoginRequest):
    email = body.email.lower().strip()
    user = await User.find_one(User.email == email)

    if not user or not bcrypt.checkpw(body.password.encode(), user.password.encode()):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    return {
        "success": True,
        "message": "Login successful",
        "token": generate_token(str(user.id)),
        "user": user_response(user),
    }
