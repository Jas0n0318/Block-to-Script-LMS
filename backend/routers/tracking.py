from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import BehaviorLog
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/tracking", tags=["tracking"])


class TrackingEvent(BaseModel):
    actionType: str
    courseId: Optional[int] = None
    detail: Optional[str] = None
    duration: Optional[int] = None


class TrackingBatch(BaseModel):
    events: list[TrackingEvent]


@router.post("")
async def track_events(
    batch: TrackingBatch,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for event in batch.events:
        log = BehaviorLog(
            userId=int(user["sub"]),
            courseId=event.courseId,
            actionType=event.actionType,
            detail=event.detail,
            duration=event.duration,
        )
        db.add(log)
    await db.commit()
    return {"ok": True, "count": len(batch.events)}
