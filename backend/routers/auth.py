from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt as bcr
from jose import jwt
from database import get_db
from models import User, UserRole, Course, LearningRecord, LearningStatus
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthSchema(BaseModel):
    username: str
    password: str


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/register")
async def register(body: AuthSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed = bcr.hashpw(body.password.encode(), bcr.gensalt()).decode()
    new_user = User(username=body.username, password=hashed, role=UserRole.STUDENT)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    courses_result = await db.execute(select(Course).order_by(Course.id))
    all_courses = courses_result.scalars().all()
    for i, c in enumerate(all_courses):
        db.add(LearningRecord(
            userId=new_user.id, courseId=c.id,
            status=LearningStatus.UNLOCKED if i == 0 else LearningStatus.LOCKED
        ))
    await db.commit()

    token = create_access_token({"sub": str(new_user.id), "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role
        },
        "student_token": new_user.student_token
    }


@router.post("/login")
async def login(body: AuthSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not bcr.checkpw(body.password.encode(), user.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        },
        "student_token": user.student_token
    }
