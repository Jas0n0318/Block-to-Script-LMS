from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Topic, Course, LearningRecord, LearningStatus


async def ensure_unlocked(db: AsyncSession, user_id: int, course_id: int):
    result = await db.execute(
        select(LearningRecord).where(
            LearningRecord.userId == user_id,
            LearningRecord.courseId == course_id,
        )
    )
    lr = result.scalar_one_or_none()
    if lr:
        if lr.status == LearningStatus.LOCKED:
            lr.status = LearningStatus.UNLOCKED
    else:
        db.add(LearningRecord(userId=user_id, courseId=course_id, status=LearningStatus.UNLOCKED))


async def cascade_unlock(db: AsyncSession, user_id: int, topic_id: int, order_index: int):
    next_result = await db.execute(
        select(Course).where(
            Course.topicId == topic_id,
            Course.orderIndex == order_index + 1,
        )
    )
    next_course = next_result.scalar_one_or_none()
    if next_course:
        await ensure_unlocked(db, user_id, next_course.id)
    else:
        current_topic = await db.get(Topic, topic_id)
        if current_topic:
            next_topic_result = await db.execute(
                select(Topic).where(Topic.orderIndex == current_topic.orderIndex + 1)
            )
            next_topic = next_topic_result.scalar_one_or_none()
            if next_topic:
                first_result = await db.execute(
                    select(Course)
                    .where(Course.topicId == next_topic.id)
                    .order_by(Course.orderIndex).limit(1)
                )
                first = first_result.scalar_one_or_none()
                if first:
                    await ensure_unlocked(db, user_id, first.id)
