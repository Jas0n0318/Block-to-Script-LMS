import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from database import get_db
from models import User, LearningRecord, BehaviorLog, Course, Chapter, LearningStatus, StudyNote, ChapterFeedback, LearningGoal
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
            selectinload(User.learningRecords).selectinload(LearningRecord.course).selectinload(Course.chapters),
            selectinload(User.behaviorLogs),
        )
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Parse completed chapters from each learning record
    progress = []
    totalChaptersCompleted = 0
    totalChapters = 0
    for r in sorted(student.learningRecords, key=lambda x: x.course.orderIndex):
        chData = {}
        if r.chapters:
            try:
                chData = json.loads(r.chapters)
            except:
                pass
        chTotal = len(r.course.chapters)
        chCompleted = sum(1 for ch in r.course.chapters if str(ch.id) in chData and chData[str(ch.id)])
        totalChaptersCompleted += chCompleted
        totalChapters += chTotal
        progress.append({
            "course": r.course.title,
            "status": r.status,
            "chaptersCompleted": chCompleted,
            "chaptersTotal": chTotal,
        })

    # Fetch notes
    notes_result = await db.execute(
        select(StudyNote).where(StudyNote.userId == student_id)
    )
    notes = notes_result.scalars().all()
    notes_data = [
        {
            "id": n.id,
            "chapterId": n.chapterId,
            "content": n.content[:200],
            "createdAt": n.createdAt.isoformat() if n.createdAt else None,
        }
        for n in notes
    ]

    # Fetch feedback
    fb_result = await db.execute(
        select(ChapterFeedback).where(ChapterFeedback.userId == student_id)
    )
    feedbacks = fb_result.scalars().all()
    feedback_data = [
        {
            "id": f.id,
            "chapterId": f.chapterId,
            "rating": f.rating,
            "difficulty": f.difficulty,
            "comment": f.comment,
            "createdAt": f.createdAt.isoformat() if f.createdAt else None,
        }
        for f in feedbacks
    ]

    # Fetch goals
    goal_result = await db.execute(
        select(LearningGoal).where(LearningGoal.userId == student_id)
    )
    goals = goal_result.scalars().all()
    goals_data = [
        {
            "id": g.id,
            "weeklyTarget": g.weeklyTarget,
            "startDate": g.startDate.isoformat() if g.startDate else None,
            "endDate": g.endDate.isoformat() if g.endDate else None,
            "createdAt": g.createdAt.isoformat() if g.createdAt else None,
        }
        for g in goals
    ]

    return {
        "username": student.username,
        "progress": progress,
        "totalChaptersCompleted": totalChaptersCompleted,
        "totalChapters": totalChapters,
        "notes": notes_data,
        "feedback": feedback_data,
        "goals": goals_data,
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
