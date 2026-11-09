from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.database import get_db
from app.models import User, Notification
from app.schemas import NotificationOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationOut])
async def get_notifications(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all notifications for the current user."""
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if category:
        stmt = stmt.where(Notification.category == category)
    stmt = stmt.order_by(Notification.created_at.desc()).limit(50)
    
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return notifications

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get number of unread notifications for navbar bell icon."""
    stmt = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    res = await db.execute(stmt)
    items = res.scalars().all()
    return {"unread_count": len(items)}

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark single notification as read."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found.")
    item.is_read = True
    await db.commit()
    return {"status": "success", "id": notification_id, "is_read": True}

@router.post("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications for current user as read."""
    stmt = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    res = await db.execute(stmt)
    items = res.scalars().all()
    for item in items:
        item.is_read = True
    await db.commit()
    return {"status": "success", "marked_read_count": len(items)}

