from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Patient, User, HeartRateReading, AuditLog
from app.schemas import ChatRequest, ChatResponse, EmergencyAlertOut
from app.auth import get_current_user, get_current_patient
from app.ai_advisor import AIAdvisorEngine

router = APIRouter(prefix="/chat", tags=["AI Clinical Assistant Chat"])

@router.post("", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch recent reading for context
    r_query = (
        select(HeartRateReading)
        .where(HeartRateReading.patient_id == current_patient.id)
        .order_by(desc(HeartRateReading.measurement_time))
        .limit(1)
    )
    r_res = await db.execute(r_query)
    recent_reading = r_res.scalars().first()
    recent_dict = {"bpm": recent_reading.bpm, "status": recent_reading.resting_status} if recent_reading else None

    patient_context = {
        "age": current_patient.age,
        "sex": current_patient.sex,
        "activity_level": current_patient.physical_activity_level,
        "stress_level": current_patient.stress_level
    }

    conversation_history = [{"role": m.role, "content": m.content} for m in request.conversation_history]

    chat_out = await AIAdvisorEngine.chat_with_patient(
        user_message=request.message,
        conversation_history=conversation_history,
        patient_context=patient_context,
        recent_reading=recent_dict
    )

    emergency_alert_obj = None
    if chat_out["is_emergency"] and chat_out["emergency_guidance"]:
        guidance = chat_out["emergency_guidance"]
        emergency_alert_obj = EmergencyAlertOut(
            alert_level=guidance["alert_level"],
            alert_title=guidance["alert_title"],
            alert_reason=guidance["alert_reason"],
            clinical_rationale=guidance["clinical_rationale"],
            emergency_actions=guidance["emergency_actions"],
            hotline_number=guidance.get("hotline_number", "112")
        )

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="CHAT_INTERACTION",
        resource_type="CHAT",
        resource_id=str(current_patient.id),
        details={"is_emergency": chat_out["is_emergency"]}
    ))
    await db.commit()

    return ChatResponse(
        reply=chat_out["reply"],
        is_emergency=chat_out["is_emergency"],
        emergency_guidance=emergency_alert_obj,
        clinical_disclaimer=chat_out["clinical_disclaimer"]
    )
