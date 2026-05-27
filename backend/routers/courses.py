import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Course, Chapter, LearningRecord, LearningStatus
from middleware.auth import get_current_user
from services.unlock_service import cascade_unlock

router = APIRouter(prefix="/api/courses", tags=["courses"])


def _parse_chapters(record: LearningRecord | None) -> dict:
    if record and record.chapters:
        try:
            return json.loads(record.chapters)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


@router.get("/{course_id}")
async def get_course(
    course_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch course with chapters
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.chapters))
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Fetch user's record for this course
    record_result = await db.execute(
        select(LearningRecord).where(
            LearningRecord.userId == int(user["sub"]),
            LearningRecord.courseId == course_id,
        )
    )
    record = record_result.scalar_one_or_none()
    status = record.status if record else LearningStatus.LOCKED

    # Map chapters with completion status
    chapter_status = _parse_chapters(record)
    chapters_data = []
    for ch in course.chapters:
        chapters_data.append({
            "id": ch.id,
            "title": ch.title,
            "type": ch.type,
            "orderIndex": ch.orderIndex,
            "content": ch.content if status != LearningStatus.LOCKED else None,
            "blocklyAnswer": ch.blocklyAnswer if status != LearningStatus.LOCKED else None,
            "luaCode": ch.luaCode if status != LearningStatus.LOCKED else None,
            "luaAnswers": ch.luaAnswers if status != LearningStatus.LOCKED else None,
            "completed": chapter_status.get(str(ch.id), False)
        })

    return {
        "id": course.id,
        "title": course.title,
        "rbxlUrl": course.rbxlUrl,
        "unlockEvent": course.unlockEvent,
        "status": status,
        "chapters": chapters_data,
        "chaptersProgress": chapter_status  # Raw progress for compatibility
    }


class ChapterUpdate(BaseModel):
    chapterId: int
    completed: bool


@router.patch("/{course_id}/chapters")
async def update_chapter(
    course_id: int,
    body: ChapterUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningRecord).where(
            LearningRecord.userId == int(user["sub"]),
            LearningRecord.courseId == course_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Learning record not found")

    progress = _parse_chapters(record)
    progress[str(body.chapterId)] = body.completed
    record.chapters = json.dumps(progress)

    # Check for course completion
    course_result = await db.execute(
        select(Course).where(Course.id == course_id).options(selectinload(Course.chapters))
    )
    course = course_result.scalar_one_or_none()
    
    if course:
        all_done = True
        for ch in course.chapters:
            if not progress.get(str(ch.id)):
                all_done = False
                break
        
        if all_done:
            record.status = LearningStatus.COMPLETED
            # For non-webhook courses, cascade unlock next course/topic
            if not course.unlockEvent:
                await cascade_unlock(db, int(user["sub"]), course.topicId, course.orderIndex)

    await db.commit()
    return {"chaptersProgress": progress, "status": record.status}


