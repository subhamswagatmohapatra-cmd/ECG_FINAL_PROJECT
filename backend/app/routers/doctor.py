from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
import hashlib
from datetime import datetime, timezone
from app.database import get_db
from app.models import Doctor, Patient, User, HealthReport, DoctorReview, HeartRateReading, EmergencyAlert, AuditLog
from app.schemas import DoctorReviewCreate, DoctorReviewOut, HealthReportOut
from app.auth import get_current_user, get_current_doctor

router = APIRouter(prefix="/doctor", tags=["Clinician Portal"])

@router.get("/patients")
async def list_patients(
    query: Optional[str] = None,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns patient roster with alert status and latest vitals for clinician review.
    """
    stmt = (
        select(Patient)
        .join(User, Patient.user_id == User.id)
        .options(
            selectinload(Patient.user),
            selectinload(Patient.medical_history),
            selectinload(Patient.readings),
            selectinload(Patient.emergency_alerts)
        )
    )
    if query:
        stmt = stmt.where(
            or_(
                User.full_name.ilike(f"%{query}%"),
                Patient.patient_id_code.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%")
            )
        )
    res = await db.execute(stmt)
    patients = res.scalars().all()

    patient_summaries = []
    for p in patients:
        # Get latest reading
        latest_r = sorted(p.readings, key=lambda x: x.measurement_time, reverse=True)[0] if p.readings else None
        # Get latest alert
        latest_a = sorted(p.emergency_alerts, key=lambda x: x.created_at, reverse=True)[0] if p.emergency_alerts else None
        
        patient_summaries.append({
            "id": p.id,
            "patient_id_code": p.patient_id_code,
            "full_name": p.user.full_name if p.user else "Unknown",
            "email": p.user.email if p.user else "",
            "age": p.age,
            "sex": p.sex,
            "latest_bpm": latest_r.bpm if latest_r else None,
            "latest_reading_time": latest_r.measurement_time.isoformat() if latest_r else None,
            "alert_level": latest_a.alert_level if latest_a else "GREEN",
            "alert_title": latest_a.alert_title if latest_a else "Normal Baseline",
            "has_heart_disease": p.medical_history.has_heart_disease if p.medical_history else False,
            "high_blood_pressure": p.medical_history.high_blood_pressure if p.medical_history else False,
            "total_readings": len(p.readings)
        })

    return patient_summaries

@router.get("/patients/{patient_id}")
async def get_patient_clinical_dossier(
    patient_id: int,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Patient)
        .options(
            selectinload(Patient.user),
            selectinload(Patient.medical_history),
            selectinload(Patient.medications),
            selectinload(Patient.allergies),
            selectinload(Patient.readings).selectinload(HeartRateReading.symptoms),
            selectinload(Patient.ai_analyses),
            selectinload(Patient.emergency_alerts),
            selectinload(Patient.reports).selectinload(HealthReport.reviews)
        )
        .where(Patient.id == patient_id)
    )
    res = await db.execute(stmt)
    patient = res.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    sorted_readings = sorted(patient.readings, key=lambda x: x.measurement_time, reverse=True)
    sorted_reports = sorted(patient.reports, key=lambda x: x.generated_at, reverse=True)
    sorted_alerts = sorted(patient.emergency_alerts, key=lambda x: x.created_at, reverse=True)

    return {
        "patient": {
            "id": patient.id,
            "patient_id_code": patient.patient_id_code,
            "full_name": patient.user.full_name,
            "email": patient.user.email,
            "age": patient.age,
            "sex": patient.sex,
            "height_cm": patient.height_cm,
            "weight_kg": patient.weight_kg,
            "emergency_contact": f"{patient.emergency_contact_name} ({patient.emergency_contact_phone})",
            "activity_level": patient.physical_activity_level,
            "stress_level": patient.stress_level,
            "smoking_habit": patient.smoking_habit,
            "is_pregnant": patient.is_pregnant
        },
        "medical_history": patient.medical_history,
        "medications": patient.medications,
        "allergies": patient.allergies,
        "recent_readings": [
            {
                "id": r.id,
                "bpm": r.bpm,
                "resting_status": r.resting_status,
                "method": r.measurement_method,
                "device": r.device_name,
                "time": r.measurement_time.isoformat(),
                "symptoms": r.symptoms
            } for r in sorted_readings[:20]
        ],
        "reports": sorted_reports,
        "alerts": sorted_alerts
    }

@router.post("/reports/{report_id}/review", response_model=DoctorReviewOut)
async def review_and_sign_report(
    report_id: int,
    review_in: DoctorReviewCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(HealthReport).where(HealthReport.id == report_id))
    report = res.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Generate clinical signature hash for integrity
    sig_raw = f"{current_doctor.id}:{report.id}:{datetime.now(timezone.utc).isoformat()}:{current_doctor.license_number}"
    sig_hash = hashlib.sha256(sig_raw.encode()).hexdigest()

    review = DoctorReview(
        report_id=report.id,
        doctor_id=current_doctor.id,
        patient_id=report.patient_id,
        clinician_notes=review_in.clinician_notes,
        recommended_followup=review_in.recommended_followup,
        approved=review_in.approved,
        signature_hash=sig_hash
    )
    db.add(review)

    # Mark report as clinician approved
    report.is_clinician_approved = review_in.approved
    
    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="DOCTOR_REVIEW_AND_SIGN_REPORT",
        resource_type="REPORT",
        resource_id=str(report.id),
        details={"approved": review_in.approved, "doctor_license": current_doctor.license_number}
    ))

    await db.commit()
    await db.refresh(review)

    return DoctorReviewOut(
        id=review.id,
        report_id=review.report_id,
        doctor_name=current_user.full_name,
        doctor_specialty=current_doctor.specialty,
        clinician_notes=review.clinician_notes,
        recommended_followup=review.recommended_followup,
        approved=review.approved,
        reviewed_at=review.reviewed_at
    )
