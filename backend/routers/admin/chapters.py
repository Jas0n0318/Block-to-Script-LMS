from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Course, Chapter, LearningRecord
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


class CoursePayload(BaseModel):
    topicId: int
    title: str
    rbxlUrl: Optional[str] = None
    orderIndex: int


@router.post("/courses")
async def create_course(
    payload: CoursePayload,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    course = Course(**payload.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return {"id": course.id, "title": course.title}


@router.put("/courses/{course_id}")
async def update_course(
    course_id: int,
    payload: CoursePayload,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for key, val in payload.model_dump().items():
        setattr(course, key, val)
    await db.commit()
    return {"ok": True}


@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")

    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Cascade delete chapters and learning records
    await db.execute(select(Chapter).where(Chapter.courseId == course_id))
    async with db.begin_nested():
        chapters = await db.execute(select(Chapter).where(Chapter.courseId == course_id))
        for ch in chapters.scalars().all():
            await db.delete(ch)
        records = await db.execute(select(LearningRecord).where(LearningRecord.courseId == course_id))
        for r in records.scalars().all():
            await db.delete(r)
    await db.delete(course)
    await db.commit()
    return {"ok": True}
