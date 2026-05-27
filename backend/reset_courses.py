import asyncio
from database import async_session, init_db
from models import LearningRecord, LearningStatus
from sqlalchemy import select

async def reset():
    await init_db()
    async with async_session() as db:
        records = await db.execute(select(LearningRecord))
        for r in records.scalars().all():
            r.status = LearningStatus.UNLOCKED if r.courseId == 1 else LearningStatus.LOCKED
        await db.commit()
        print("Reset done:")
        print("  Course 1: UNLOCKED")
        print("  Course 2-6: LOCKED")

asyncio.run(reset())
