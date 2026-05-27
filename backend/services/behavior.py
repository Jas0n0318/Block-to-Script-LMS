from sqlalchemy import select
from database import async_session
from models import LearningRecord, BehaviorLog
from datetime import datetime, timedelta, timezone


async def get_recent_behavior(user_id: int, minutes: int = 15):
    async with async_session() as db:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=minutes)
        result = await db.execute(
            select(BehaviorLog).where(
                BehaviorLog.userId == user_id,
                BehaviorLog.createdAt >= cutoff,
            ).order_by(BehaviorLog.createdAt)
        )
        return list(result.scalars().all())


async def get_student_summary(user_id: int):
    async with async_session() as db:
        records_result = await db.execute(
            select(LearningRecord).where(LearningRecord.userId == user_id)
        )
        records = records_result.scalars().all()

        logs_result = await db.execute(
            select(BehaviorLog)
            .where(BehaviorLog.userId == user_id)
            .order_by(BehaviorLog.createdAt.desc())
            .limit(100)
        )
        logs = list(logs_result.scalars().all())

    return {
        "totalCourses": len(records),
        "completed": len([r for r in records if r.status == "completed"]),
        "blockErrors": len([l for l in logs if l.actionType == "block_error"]),
        "webhooks": len([l for l in logs if l.actionType == "roblox_webhook"]),
        "aiQueries": len([l for l in logs if l.actionType == "ai_query"]),
    }
