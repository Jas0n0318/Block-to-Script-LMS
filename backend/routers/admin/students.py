from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from database import get_db
from models import User, LearningRecord, BehaviorLog, Course, LearningStatus
from middleware.auth import get_current_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ResetPasswordPayload(BaseModel):
    newPassword: str

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/students")
async def list_students(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    result = await db.execute(
        select(User)
        .where(User.role == "student")
        .options(selectinload(User.learningRecords), selectinload(User.behaviorLogs))
    )
    students = result.scalars().all()

    return [
        {
            "id": s.id,
            "username": s.username,
            "totalCourses": len(s.learningRecords),
            "completedCourses": len([r for r in s.learningRecords if r.status == LearningStatus.COMPLETED.value]),
            "totalErrors": len([b for b in s.behaviorLogs if b.actionType == "block_error"]),
            "aiQueries": len([b for b in s.behaviorLogs if b.actionType == "ai_query"]),
        }
        for s in students
    ]


@router.get("/students/{student_id}/stats")
async def student_stats(
    student_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    result = await db.execute(
        select(User)
        .where(User.id == student_id)
        .options(
            selectinload(User.learningRecords).selectinload(LearningRecord.course),
            selectinload(User.behaviorLogs),
        )
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "username": student.username,
        "progress": [
            {
                "course": r.course.title,
                "status": r.status,
            }
            for r in sorted(student.learningRecords, key=lambda x: x.course.orderIndex)
        ],
        "recentActivity": [
            {
                "action": b.actionType,
                "detail": b.detail,
                "time": b.createdAt.isoformat(),
            }
            for b in sorted(student.behaviorLogs, key=lambda x: x.createdAt, reverse=True)[:200]
        ],
    }


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    student = await db.get(User, student_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")

    await db.execute(select(LearningRecord).where(LearningRecord.userId == student_id))
    async with db.begin_nested():
        records = await db.execute(select(LearningRecord).where(LearningRecord.userId == student_id))
        for r in records.scalars().all():
            await db.delete(r)
        logs = await db.execute(select(BehaviorLog).where(BehaviorLog.userId == student_id))
        for b in logs.scalars().all():
            await db.delete(b)
    await db.delete(student)
    await db.commit()
    return {"ok": True}


@router.post("/students/{student_id}/reset-password")
async def reset_student_password(
    student_id: int,
    payload: ResetPasswordPayload,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    student = await db.get(User, student_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")

    student.password = pwd_context.hash(payload.newPassword)
    await db.commit()
    return {"ok": True}


@router.post("/students/{student_id}/unlock-all")
async def unlock_all_courses(
    student_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    student = await db.get(User, student_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")

    records = await db.execute(select(LearningRecord).where(LearningRecord.userId == student_id))
    for r in records.scalars().all():
        r.status = LearningStatus.UNLOCKED.value
    await db.commit()
    return {"ok": True}
