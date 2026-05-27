import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import User, Course, Chapter, LearningRecord, BehaviorLog, LearningStatus
from services.unlock_service import cascade_unlock

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


class WebhookPayload(BaseModel):
    token: str
    event: str


@router.get("/ping")
async def ping():
    return {"status": "pong", "message": "Webhook endpoint is alive"}


@router.post("/unlock")
async def unlock_course(payload: WebhookPayload, db: AsyncSession = Depends(get_db)):
    # 1. 透過 token 找到對應的 User
    result = await db.execute(select(User).where(User.student_token == payload.token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=403, detail="Invalid token")

    # 2. 透過 event 找到對應的 Course
    course_result = await db.execute(
        select(Course)
        .where(Course.unlockEvent == payload.event)
        .options(selectinload(Course.chapters))
    )
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course associated with this event not found")

    # 3. 取得或建立學習紀錄，設為 COMPLETED
    record_result = await db.execute(
        select(LearningRecord).where(
            LearningRecord.userId == user.id,
            LearningRecord.courseId == course.id,
        )
    )
    record = record_result.scalar_one_or_none()

    if not record:
        record = LearningRecord(userId=user.id, courseId=course.id, status=LearningStatus.COMPLETED)
        db.add(record)
    else:
        record.status = LearningStatus.COMPLETED

    # 4. 章節同步：將該課程下的所有章節標記為 true
    chapters_progress = {}
    for ch in course.chapters:
        chapters_progress[str(ch.id)] = True
    record.chapters = json.dumps(chapters_progress)

    # 5. 連鎖解鎖：下一個課程或下一個主題
    await cascade_unlock(db, user.id, course.topicId, course.orderIndex)

    # 記錄行為
    db.add(BehaviorLog(
        userId=user.id,
        courseId=course.id,
        actionType="webhook_unlock",
        detail=f'{{"event": "{payload.event}"}}',
    ))

    await db.commit()
    return {"status": "ok", "message": f"Course {course.title} completed and next unlocked."}


