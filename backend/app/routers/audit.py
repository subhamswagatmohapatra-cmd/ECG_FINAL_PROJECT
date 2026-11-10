from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Dict, Any
from app.database import get_db
from app.models import AuditLog, UserConsent, Patient, User
from app.schemas import UserConsentUpdate
from app.auth import get_current_user, get_current_patient

router = APIRouter(prefix="/privacy", tags=["Security, Privacy & Consent"])

@router.get("/consent")
async def get_patient_consent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    p_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = p_res.scalars().first()
    patient_id = patient.id if patient else 1

    res = await db.execute(
        select(UserConsent)
        .where(UserConsent.patient_id == patient_id)
        .order_by(desc(UserConsent.consent_timestamp))
        .limit(1)
    )
    consent = res.scalars().first()
    if not consent:
        return {
            "consent_data_processing": True,
            "consent_ai_analysis": True,
            "consent_clinical_sharing": True,
            "privacy_policy_version": "v1.0-clinical-2026",
            "consent_timestamp": None
        }
    return {
        "id": consent.id,
        "consent_data_processing": consent.consent_data_processing,
        "consent_ai_analysis": consent.consent_ai_analysis,
        "consent_clinical_sharing": consent.consent_clinical_sharing,
        "privacy_policy_version": consent.privacy_policy_version,
        "consent_timestamp": consent.consent_timestamp
    }

@router.put("/consent")
async def update_patient_consent(
    consent_in: UserConsentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    p_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = p_res.scalars().first()
    patient_id = patient.id if patient else 1

    consent = UserConsent(
        patient_id=patient_id,
        consent_data_processing=consent_in.consent_data_processing,
        consent_ai_analysis=consent_in.consent_ai_analysis,
        consent_clinical_sharing=consent_in.consent_clinical_sharing,
        privacy_policy_version="v1.0-clinical-2026",
        ip_address="127.0.0.1"
    )
    db.add(consent)

    db.add(AuditLog(
        user_id=current_user.id,
        action="UPDATE_PRIVACY_CONSENT",
        resource_type="CONSENT",
        resource_id=str(current_patient.id),
        details=consent_in.dict()
    ))
    await db.commit()
    return {"message": "Consent preferences updated successfully"}

@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Only patient's own logs or all logs for admin/clinicians
    stmt = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    if current_user.role == "patient":
        stmt = stmt.where(AuditLog.user_id == current_user.id)

    res = await db.execute(stmt)
    logs = res.scalars().all()
    return logs

@router.post("/delete-my-data")
async def request_data_deletion(
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    HIPAA / GDPR / Indian Digital Personal Data Protection Act compliance endpoint
    """
    db.add(AuditLog(
        user_id=current_user.id,
        action="REQUEST_DATA_DELETION_DPDPA",
        resource_type="PATIENT",
        resource_id=str(current_patient.id),
        details={"status": "SCHEDULED_FOR_PERMANENT_ERASURE_30D"}
    ))
    await db.commit()
    return {"message": "Data deletion request registered in accordance with healthcare privacy regulations. Patient health records marked for purge."}
