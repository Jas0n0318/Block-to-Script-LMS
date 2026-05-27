from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Topic, Course, LearningRecord
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("")
async def list_topics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Topic).order_by(Topic.orderIndex).options(selectinload(Topic.courses))
    )
    topics = result.scalars().all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "orderIndex": t.orderIndex,
            "courses": [
                {"id": c.id, "title": c.title, "orderIndex": c.orderIndex}
                for c in t.courses
            ],
        }
        for t in topics
    ]


@router.get("/{topic_id}/courses")
async def list_courses(
    topic_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Topic)
        .where(Topic.id == topic_id)
        .options(selectinload(Topic.courses))
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    records_result = await db.execute(
        select(LearningRecord).where(
            LearningRecord.userId == int(user["sub"]),
            LearningRecord.courseId.in_([c.id for c in topic.courses]),
        )
    )
    records = records_result.scalars().all()
    record_map = {r.courseId: r.status for r in records}

    courses_data = []
    for c in sorted(topic.courses, key=lambda x: x.orderIndex):
        courses_data.append({
            "id": c.id,
            "title": c.title,
            "orderIndex": c.orderIndex,
            "status": record_map.get(c.id, "locked"),
        })

    return {
        "topic": {"id": topic.id, "title": topic.title, "description": topic.description},
        "courses": courses_data,
    }
