from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import User, Patient, Doctor, Message, Notification, AuditLog
from app.schemas import MessageCreate, MessageOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])

@router.get("", response_model=List[MessageOut])
async def get_messages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve messages sent or received by the current user."""
    stmt = (
        select(Message)
        .options(selectinload(Message.sender), selectinload(Message.recipient))
        .where((Message.sender_id == current_user.id) | (Message.recipient_id == current_user.id))
        .order_by(Message.created_at.desc())
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    
    return [
        MessageOut(
            id=m.id,
            sender_id=m.sender_id,
            recipient_id=m.recipient_id,
            sender_name=m.sender.full_name if m.sender else "User",
            recipient_name=m.recipient.full_name if m.recipient else "User",
            patient_id=m.patient_id,
            subject=m.subject,
            content=m.content,
            attachment_name=m.attachment_name,
            is_read=m.is_read,
            created_at=m.created_at
        )
        for m in messages
    ]

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get count of unread incoming messages."""
    stmt = select(Message).where(Message.recipient_id == current_user.id, Message.is_read == False)
    res = await db.execute(stmt)
    unread = res.scalars().all()
    return {"unread_count": len(unread)}

@router.post("", response_model=MessageOut)
async def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a secure clinical message between patient and doctor."""
    rec_stmt = select(User).where(User.id == payload.recipient_id)
    rec_res = await db.execute(rec_stmt)
    recipient = rec_res.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Message recipient not found.")
        
    new_msg = Message(
        sender_id=current_user.id,
        recipient_id=payload.recipient_id,
        patient_id=payload.patient_id,
        subject=payload.subject,
        content=payload.content,
        attachment_name=payload.attachment_name,
        is_read=False
    )
    db.add(new_msg)
    
    # Notify recipient
    notif = Notification(
        user_id=recipient.id,
        category="message",
        title=f"New Message from {current_user.full_name}",
        message=payload.content[:100] + ("..." if len(payload.content) > 100 else ""),
        priority="medium"
    )
    db.add(notif)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="SEND_CLINICAL_MESSAGE",
        resource_type="message",
        details={"recipient_id": recipient.id}
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(new_msg)
    
    return MessageOut(
        id=new_msg.id,
        sender_id=new_msg.sender_id,
        recipient_id=new_msg.recipient_id,
        sender_name=current_user.full_name,
        recipient_name=recipient.full_name,
        patient_id=new_msg.patient_id,
        subject=new_msg.subject,
        content=new_msg.content,
        attachment_name=new_msg.attachment_name,
        is_read=new_msg.is_read,
        created_at=new_msg.created_at
    )

@router.patch("/{message_id}/read")
async def mark_message_as_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a received message as read."""
    stmt = select(Message).where(Message.id == message_id, Message.recipient_id == current_user.id)
    res = await db.execute(stmt)
    msg = res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    msg.is_read = True
    await db.commit()
    return {"status": "success", "message_id": message_id, "is_read": True}

