from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from database import get_db
from models import StudyNote, ChapterFeedback, LearningGoal, Chapter
from middleware.auth import get_current_user

router = APIRouter(prefix="/api", tags=["student_features"])


# ─── Pydantic Schemas ───

class NoteCreate(BaseModel):
    chapterId: int
    content: str

class NoteUpdate(BaseModel):
    content: str

class FeedbackCreate(BaseModel):
    rating: int
    difficulty: int
    comment: Optional[str] = None

class GoalCreate(BaseModel):
    weeklyTarget: int
    startDate: date
    endDate: date

class GoalUpdate(BaseModel):
    weeklyTarget: Optional[int] = None
    startDate: Optional[date] = None
    endDate: Optional[date] = None


# ─── Notes CRUD ───

@router.get("/notes")
async def list_notes(
    chapter_id: Optional[int] = Query(None),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    stmt = select(StudyNote).where(StudyNote.userId == uid)
    if chapter_id:
        stmt = stmt.where(StudyNote.chapterId == chapter_id)
    stmt = stmt.order_by(StudyNote.createdAt.desc())
    result = await db.execute(stmt)
    notes = result.scalars().all()
    return [
        {
            "id": n.id,
            "chapterId": n.chapterId,
            "content": n.content,
            "createdAt": n.createdAt.isoformat() if n.createdAt else None,
            "updatedAt": n.updatedAt.isoformat() if n.updatedAt else None,
        }
        for n in notes
    ]


@router.post("/notes", status_code=201)
async def create_note(
    body: NoteCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    note = StudyNote(userId=uid, chapterId=body.chapterId, content=body.content)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {"id": note.id, "message": "Note created"}


@router.put("/notes/{note_id}")
async def update_note(
    note_id: int,
    body: NoteUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    result = await db.execute(
        select(StudyNote).where(StudyNote.id == note_id, StudyNote.userId == uid)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.content = body.content
    await db.commit()
    return {"ok": True}


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    result = await db.execute(
        select(StudyNote).where(StudyNote.id == note_id, StudyNote.userId == uid)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
    return {"ok": True}


# ─── Chapter Feedback ───

@router.get("/chapters/{chapter_id}/feedback")
async def get_feedback(
    chapter_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    result = await db.execute(
        select(ChapterFeedback).where(
            ChapterFeedback.userId == uid,
            ChapterFeedback.chapterId == chapter_id,
        )
    )
    fb = result.scalar_one_or_none()
    if not fb:
        return None
    return {
        "id": fb.id,
        "rating": fb.rating,
        "difficulty": fb.difficulty,
        "comment": fb.comment,
        "createdAt": fb.createdAt.isoformat() if fb.createdAt else None,
    }


@router.post("/chapters/{chapter_id}/feedback", status_code=201)
async def create_feedback(
    chapter_id: int,
    body: FeedbackCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])

    # Check chapter exists
    chk = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
    if not chk.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Check not already submitted
    existing = await db.execute(
        select(ChapterFeedback).where(
            ChapterFeedback.userId == uid,
            ChapterFeedback.chapterId == chapter_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Feedback already submitted")

    fb = ChapterFeedback(
        userId=uid,
        chapterId=chapter_id,
        rating=body.rating,
        difficulty=body.difficulty,
        comment=body.comment,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return {"id": fb.id, "message": "Feedback submitted"}


# ─── Learning Goals CRUD ───

@router.get("/goals")
async def list_goals(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    result = await db.execute(
        select(LearningGoal)
        .where(LearningGoal.userId == uid)
        .order_by(LearningGoal.createdAt.desc())
    )
    goals = result.scalars().all()
    return [
        {
            "id": g.id,
            "weeklyTarget": g.weeklyTarget,
            "startDate": g.startDate.isoformat() if g.startDate else None,
            "endDate": g.endDate.isoformat() if g.endDate else None,
            "createdAt": g.createdAt.isoformat() if g.createdAt else None,
        }
        for g in goals
    ]


@router.post("/goals", status_code=201)
async def create_goal(
    body: GoalCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    # Limit to one goal per student
    existing = await db.execute(
        select(LearningGoal).where(LearningGoal.userId == uid)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You can only have one goal at a time. Edit or delete the existing goal.")
    goal = LearningGoal(
        userId=uid,
        weeklyTarget=body.weeklyTarget,
        startDate=body.startDate,
        endDate=body.endDate,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return {"id": goal.id, "message": "Goal created"}


@router.put("/goals/{goal_id}")
async def update_goal(
    goal_id: int,
    body: GoalUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    result = await db.execute(
        select(LearningGoal).where(LearningGoal.id == goal_id, LearningGoal.userId == uid)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if body.weeklyTarget is not None:
        goal.weeklyTarget = body.weeklyTarget
    if body.startDate is not None:
        goal.startDate = body.startDate
    if body.endDate is not None:
        goal.endDate = body.endDate

    await db.commit()
    return {"ok": True}


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = int(user["sub"])
    result = await db.execute(
        select(LearningGoal).where(LearningGoal.id == goal_id, LearningGoal.userId == uid)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return {"ok": True}
