from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models import User, EducationModule, EducationProgress, AuditLog
from app.schemas import EducationModuleOut, QuizSubmission, QuizResultOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/education", tags=["education"])

@router.get("/modules", response_model=List[EducationModuleOut])
async def list_modules(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List cardiovascular education modules with user completion status."""
    stmt = select(EducationModule)
    if category:
        stmt = stmt.where(EducationModule.category == category)
    result = await db.execute(stmt)
    modules = result.scalars().all()
    
    # Get user progress
    prog_stmt = select(EducationProgress).where(EducationProgress.user_id == current_user.id)
    prog_res = await db.execute(prog_stmt)
    progress_map = {p.module_id: p for p in prog_res.scalars().all()}
    
    out = []
    for m in modules:
        p = progress_map.get(m.id)
        out.append(EducationModuleOut(
            id=m.id,
            slug=m.slug,
            title=m.title,
            category=m.category,
            summary=m.summary,
            content_markdown=m.content_markdown,
            difficulty=m.difficulty,
            read_time_minutes=m.read_time_minutes,
            quiz_data=m.quiz_data,
            created_at=m.created_at,
            is_completed=p.completed if p else False,
            quiz_score=p.quiz_score if p else None
        ))
    return out

@router.get("/modules/{slug}", response_model=EducationModuleOut)
async def get_module_by_slug(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get complete educational article, illustrations, and quiz."""
    stmt = select(EducationModule).where(EducationModule.slug == slug)
    res = await db.execute(stmt)
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Educational module not found.")
        
    prog_stmt = select(EducationProgress).where(
        EducationProgress.user_id == current_user.id,
        EducationProgress.module_id == m.id
    )
    prog_res = await db.execute(prog_stmt)
    p = prog_res.scalar_one_or_none()
    
    return EducationModuleOut(
        id=m.id,
        slug=m.slug,
        title=m.title,
        category=m.category,
        summary=m.summary,
        content_markdown=m.content_markdown,
        difficulty=m.difficulty,
        read_time_minutes=m.read_time_minutes,
        quiz_data=m.quiz_data,
        created_at=m.created_at,
        is_completed=p.completed if p else False,
        quiz_score=p.quiz_score if p else None
    )

@router.post("/modules/{module_id}/quiz", response_model=QuizResultOut)
async def submit_quiz(
    module_id: int,
    payload: QuizSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit quiz answers, score knowledge test, and update learning progress."""
    stmt = select(EducationModule).where(EducationModule.id == module_id)
    res = await db.execute(stmt)
    module = res.scalar_one_or_none()
    if not module or not module.quiz_data:
        raise HTTPException(status_code=404, detail="Module or quiz not found.")
        
    questions = module.quiz_data.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="No questions configured for this quiz.")
        
    score = 0
    total = len(questions)
    for idx, q in enumerate(questions):
        correct_ans = q.get("correct_option")
        user_ans = payload.answers.get(str(idx))
        if user_ans and user_ans.strip().lower() == str(correct_ans).strip().lower():
            score += 1
            
    pct = round((score / total) * 100, 1)
    passed = pct >= 70.0
    
    # Save or update progress
    prog_stmt = select(EducationProgress).where(
        EducationProgress.user_id == current_user.id,
        EducationProgress.module_id == module.id
    )
    prog_res = await db.execute(prog_stmt)
    progress = prog_res.scalar_one_or_none()
    
    if not progress:
        progress = EducationProgress(
            user_id=current_user.id,
            module_id=module.id,
            completed=passed,
            quiz_score=int(pct),
            completed_at=datetime.now(timezone.utc)
        )
        db.add(progress)
    else:
        progress.quiz_score = max(progress.quiz_score or 0, int(pct))
        if passed:
            progress.completed = True
            progress.completed_at = datetime.now(timezone.utc)
            
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="COMPLETE_QUIZ",
        resource_type="education",
        details={"module_id": module.id, "score": score, "total": total, "passed": passed}
    )
    db.add(audit)
    
    await db.commit()
    
    feedback = (
        f"Mastery achieved! You scored {score}/{total} ({pct}%). Excellent understanding of cardiovascular concepts."
        if passed else
        f"You scored {score}/{total} ({pct}%). Review the key sections and retake to earn your verified badge."
    )
    
    return QuizResultOut(
        module_id=module.id,
        score=score,
        total_questions=total,
        percentage=pct,
        passed=passed,
        feedback=feedback
    )

