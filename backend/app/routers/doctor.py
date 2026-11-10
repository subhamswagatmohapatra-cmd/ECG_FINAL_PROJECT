from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
import hashlib
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models import (
    Doctor, Patient, User, HealthReport, DoctorReview, HeartRateReading,
    EmergencyAlert, AuditLog, ECGUpload, ECGAIAnalysis, ECGSignalData,
    DoctorVerification, DoctorPatientAssignment, DoctorAvailability,
    ClinicalObservation, Appointment, Notification
)
from app.schemas import (
    DoctorReviewCreate, DoctorReviewOut, HealthReportOut,
    DoctorProfileUpdate, ClinicalObservationCreate, ClinicalObservationOut,
    DoctorAvailabilityCreate, DoctorAvailabilityOut, AppointmentCancel,
    AppointmentReschedule
)
from app.auth import get_current_user, get_current_doctor

router = APIRouter(prefix="/doctor", tags=["Clinician Portal"])

# -------------------------------------------------------------
# 1. Doctor Profile & Verification Status
# -------------------------------------------------------------
@router.get("/me")
async def get_doctor_profile(
    current_doctor: Doctor = Depends(get_current_doctor),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the authenticated clinician's comprehensive professional profile,
    specialization, license, verification status, and clinical affiliation.
    """
    verif_res = await db.execute(
        select(DoctorVerification)
        .where(DoctorVerification.doctor_id == current_doctor.id)
        .order_by(desc(DoctorVerification.submitted_at))
    )
    latest_verification = verif_res.scalars().first()

    return {
        "id": current_doctor.id,
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone_number": current_user.phone_number,
        "license_number": current_doctor.license_number,
        "specialty": current_doctor.specialty,
        "hospital_affiliation": current_doctor.hospital_affiliation,
        "qualifications": getattr(current_doctor, "qualifications", "MBBS, MD (Cardiology)"),
        "years_of_experience": getattr(current_doctor, "years_of_experience", 10),
        "bio": getattr(current_doctor, "bio", ""),
        "verification_status": current_doctor.verification_status,
        "is_verified": current_doctor.verification_status == "approved",
        "verification_details": {
            "id": latest_verification.id if latest_verification else None,
            "medical_council": latest_verification.medical_council if latest_verification else "State Medical Council",
            "graduation_year": latest_verification.graduation_year if latest_verification else None,
            "status": latest_verification.status if latest_verification else current_doctor.verification_status,
            "submitted_at": latest_verification.submitted_at.isoformat() if latest_verification and latest_verification.submitted_at else None,
            "reviewed_at": latest_verification.reviewed_at.isoformat() if latest_verification and latest_verification.reviewed_at else None,
            "review_notes": latest_verification.review_notes if latest_verification else None
        } if latest_verification else None
    }


@router.put("/me")
async def update_doctor_profile(
    profile_in: DoctorProfileUpdate,
    current_doctor: Doctor = Depends(get_current_doctor),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates doctor qualifications, years of experience, bio, and hospital affiliation.
    """
    if profile_in.specialty is not None:
        current_doctor.specialty = profile_in.specialty
    if profile_in.hospital_affiliation is not None:
        current_doctor.hospital_affiliation = profile_in.hospital_affiliation
    if profile_in.qualifications is not None:
        current_doctor.qualifications = profile_in.qualifications
    if profile_in.years_of_experience is not None:
        current_doctor.years_of_experience = profile_in.years_of_experience
    if profile_in.bio is not None:
        current_doctor.bio = profile_in.bio
    if profile_in.phone_number is not None:
        current_user.phone_number = profile_in.phone_number

    db.add(AuditLog(
        user_id=current_user.id,
        action="UPDATE_DOCTOR_PROFILE",
        resource_type="DOCTOR",
        resource_id=str(current_doctor.id),
        details={"specialty": current_doctor.specialty, "hospital": current_doctor.hospital_affiliation}
    ))

    await db.commit()
    await db.refresh(current_doctor)
    return {"message": "Profile updated successfully", "status": "success"}


# -------------------------------------------------------------
# 2. Patient Roster & Dossier
# -------------------------------------------------------------
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
        latest_r = sorted(p.readings, key=lambda x: x.measurement_time, reverse=True)[0] if p.readings else None
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


# -------------------------------------------------------------
# 3. ECG Submissions & Clinical Observations
# -------------------------------------------------------------
@router.get("/submissions")
async def get_doctor_ecg_submissions(
    status_filter: Optional[str] = None,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches all ECG reports submitted by patients to this doctor for clinical evaluation.
    """
    stmt = (
        select(HealthReport)
        .options(
            selectinload(HealthReport.patient).selectinload(Patient.user),
            selectinload(HealthReport.ecg_upload).selectinload(ECGUpload.ai_analysis),
            selectinload(HealthReport.ecg_upload).selectinload(ECGUpload.signal_data),
            selectinload(HealthReport.reviews)
        )
        .where(
            or_(
                HealthReport.assigned_doctor_id == current_doctor.id,
                HealthReport.assigned_doctor_id.is_(None) # Unassigned queue
            )
        )
        .order_by(desc(HealthReport.submitted_at), desc(HealthReport.generated_at))
    )
    
    res = await db.execute(stmt)
    reports = res.scalars().all()

    submissions = []
    for rep in reports:
        upload = rep.ecg_upload
        ai = upload.ai_analysis if upload else None
        sig = upload.signal_data if upload else None
        patient = rep.patient
        patient_user = patient.user if patient else None

        submissions.append({
            "report_id": rep.id,
            "upload_id": upload.id if upload else None,
            "patient_id": patient.id if patient else None,
            "patient_code": patient.patient_id_code if patient else "N/A",
            "patient_name": patient_user.full_name if patient_user else "Unknown Patient",
            "patient_age": patient.age if patient else None,
            "patient_sex": patient.sex if patient else None,
            "submission_status": rep.submission_status or "SUBMITTED",
            "is_clinician_approved": rep.is_clinician_approved,
            "patient_notes": rep.patient_submission_notes or (upload.patient_notes if upload else None),
            "submitted_at": rep.submitted_at.isoformat() if rep.submitted_at else (rep.generated_at.isoformat() if rep.generated_at else None),
            "bp": upload.recorded_bp if upload else None,
            "hr": upload.recorded_hr if upload else (ai.heart_rate_bpm if ai else None),
            "symptoms": upload.symptoms_reported if upload else [],
            "ai_findings": {
                "classification": ai.primary_classification if ai else rep.overall_risk_assessment,
                "confidence_pct": ai.model_confidence_pct if ai else 95.0,
                "risk_tier": ai.clinical_risk_tier if ai else rep.risk_level,
                "heart_rate_bpm": ai.heart_rate_bpm if ai else rep.mean_heart_rate,
                "qrs_duration_ms": ai.qrs_duration_ms if ai else None,
                "qtc_interval_ms": ai.qtc_interval_ms if ai else None,
                "signal_quality": ai.signal_quality if ai else "GOOD",
                "explainability": ai.explainability_notes if ai else []
            } if ai else None,
            "raw_signal_preview": (sig.raw_samples[:300] if sig and sig.raw_samples else [])
        })

    return submissions


@router.post("/submissions/{upload_id}/observe", response_model=ClinicalObservationOut)
async def record_clinical_observation(
    upload_id: int,
    obs_in: ClinicalObservationCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Clinician logs official diagnostic observations, differential diagnoses,
    and recommendations with cryptographic digital signature.
    """
    res = await db.execute(
        select(ECGUpload)
        .options(
            selectinload(ECGUpload.patient).selectinload(Patient.user),
            selectinload(ECGUpload.reports)
        )
        .where(ECGUpload.id == upload_id)
    )
    upload = res.scalars().first()
    if not upload:
        raise HTTPException(status_code=404, detail="ECG upload not found")

    # Generate clinical signature hash
    sig_raw = f"{current_doctor.license_number}:{upload.id}:{datetime.now(timezone.utc).isoformat()}:{obs_in.observations_text[:50]}"
    sig_hash = hashlib.sha256(sig_raw.encode()).hexdigest()

    observation = ClinicalObservation(
        ecg_upload_id=upload.id,
        doctor_id=current_doctor.id,
        patient_id=upload.patient_id,
        observations_text=obs_in.observations_text,
        differential_diagnosis=obs_in.differential_diagnosis,
        recommendations=obs_in.recommendations,
        prescriptions_updated=obs_in.prescriptions_updated,
        urgency_level=obs_in.urgency_level,
        signature_hash=sig_hash
    )
    db.add(observation)

    # Update associated reports to 'REVIEWED'
    for r in upload.reports:
        r.submission_status = "REVIEWED"
        r.is_clinician_approved = True

    # Also notify patient
    db.add(Notification(
        user_id=upload.patient.user.id,
        category="report",
        title="Dr. " + current_user.full_name + " reviewed your ECG",
        message=f"Clinical observation logged: {obs_in.observations_text[:120]}...",
        priority="high" if obs_in.urgency_level in ["urgent", "emergency"] else "medium",
        action_url="/patient/dashboard"
    ))

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="RECORD_CLINICAL_OBSERVATION",
        resource_type="ECG_UPLOAD",
        resource_id=str(upload.id),
        details={"urgency": obs_in.urgency_level, "doctor": current_user.full_name}
    ))

    await db.commit()
    await db.refresh(observation)

    return ClinicalObservationOut(
        id=observation.id,
        ecg_upload_id=observation.ecg_upload_id,
        doctor_name=current_user.full_name,
        doctor_specialty=current_doctor.specialty,
        license_number=current_doctor.license_number,
        observations_text=observation.observations_text,
        differential_diagnosis=observation.differential_diagnosis,
        recommendations=observation.recommendations,
        prescriptions_updated=observation.prescriptions_updated,
        urgency_level=observation.urgency_level,
        signature_hash=observation.signature_hash,
        created_at=observation.created_at
    )


# -------------------------------------------------------------
# 4. Doctor Availability & Appointment Scheduling
# -------------------------------------------------------------
@router.get("/availability")
async def get_doctor_availability(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns weekly recurring availability slots for this doctor.
    """
    res = await db.execute(
        select(DoctorAvailability)
        .where(DoctorAvailability.doctor_id == current_doctor.id)
    )
    slots = res.scalars().all()
    if not slots:
        # Generate default schedule (Mon - Fri 09:00 - 17:00)
        default_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        created = []
        for d in default_days:
            slot = DoctorAvailability(
                doctor_id=current_doctor.id,
                day_of_week=d,
                start_time="09:00",
                end_time="17:00",
                slot_duration_minutes=30,
                is_available=True
            )
            db.add(slot)
            created.append(slot)
        await db.commit()
        return created
    return slots


@router.post("/availability")
async def set_doctor_availability(
    avail_in: DoctorAvailabilityCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Sets or updates availability for a given day of the week.
    """
    res = await db.execute(
        select(DoctorAvailability)
        .where(
            and_(
                DoctorAvailability.doctor_id == current_doctor.id,
                DoctorAvailability.day_of_week == avail_in.day_of_week
            )
        )
    )
    existing = res.scalars().first()
    if existing:
        existing.start_time = avail_in.start_time
        existing.end_time = avail_in.end_time
        existing.slot_duration_minutes = avail_in.slot_duration_minutes
        existing.is_available = avail_in.is_available
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        new_slot = DoctorAvailability(
            doctor_id=current_doctor.id,
            day_of_week=avail_in.day_of_week,
            start_time=avail_in.start_time,
            end_time=avail_in.end_time,
            slot_duration_minutes=avail_in.slot_duration_minutes,
            is_available=avail_in.is_available
        )
        db.add(new_slot)
        await db.commit()
        await db.refresh(new_slot)
        return new_slot


@router.get("/appointments")
async def get_doctor_appointments(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all appointments scheduled with this doctor with patient dossier.
    """
    res = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(Patient.user)
        )
        .where(Appointment.doctor_id == current_doctor.id)
        .order_by(Appointment.appointment_date)
    )
    appts = res.scalars().all()

    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": a.patient.user.full_name if a.patient and a.patient.user else "Patient",
            "patient_code": a.patient.patient_id_code if a.patient else "N/A",
            "appointment_date": a.appointment_date.isoformat(),
            "appointment_type": a.appointment_type,
            "status": a.status,
            "reason": a.reason,
            "clinical_notes": a.clinical_notes,
            "created_at": a.created_at.isoformat()
        }
        for a in appts
    ]


@router.post("/appointments")
async def schedule_doctor_appointment(
    patient_id: int,
    appointment_date: datetime,
    appointment_type: str = "telehealth",
    reason: str = "ECG rhythm follow-up and review",
    current_doctor: Doctor = Depends(get_current_doctor),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Schedules an appointment between the doctor and patient with DOUBLE-BOOKING PREVENTION.
    """
    # Double-booking prevention: check if doctor has an appointment within +/- 25 minutes
    time_window_start = appointment_date - timedelta(minutes=25)
    time_window_end = appointment_date + timedelta(minutes=25)

    res_conflict = await db.execute(
        select(Appointment)
        .where(
            and_(
                Appointment.doctor_id == current_doctor.id,
                Appointment.status != "cancelled",
                Appointment.appointment_date >= time_window_start,
                Appointment.appointment_date <= time_window_end
            )
        )
    )
    conflict = res_conflict.scalars().first()
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time slot conflict: Doctor already has an appointment scheduled at {conflict.appointment_date.strftime('%Y-%m-%d %H:%M')}"
        )

    appt = Appointment(
        patient_id=patient_id,
        doctor_id=current_doctor.id,
        appointment_date=appointment_date,
        appointment_type=appointment_type,
        status="scheduled",
        reason=reason
    )
    db.add(appt)

    # Notify patient
    pat_res = await db.execute(select(Patient).options(selectinload(Patient.user)).where(Patient.id == patient_id))
    pat = pat_res.scalars().first()
    if pat and pat.user:
        db.add(Notification(
            user_id=pat.user.id,
            category="appointment",
            title=f"Appointment Confirmed with Dr. {current_user.full_name}",
            message=f"Consultation scheduled for {appointment_date.strftime('%B %d, %Y at %H:%M UTC')}. Reason: {reason}",
            priority="medium",
            action_url="/patient/dashboard"
        ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="SCHEDULE_APPOINTMENT",
        resource_type="APPOINTMENT",
        resource_id=str(patient_id),
        details={"date": appointment_date.isoformat(), "type": appointment_type}
    ))

    await db.commit()
    await db.refresh(appt)
    return {"message": "Appointment scheduled successfully", "appointment_id": appt.id}


@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    status_update: str = Query(..., regex="^(completed|cancelled|rescheduled)$"),
    clinical_notes: Optional[str] = None,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the status of an appointment (completed, cancelled, or rescheduled).
    """
    res = await db.execute(
        select(Appointment).where(
            and_(Appointment.id == appointment_id, Appointment.doctor_id == current_doctor.id)
        )
    )
    appt = res.scalars().first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found or unauthorized")

    appt.status = status_update
    if clinical_notes:
        appt.clinical_notes = clinical_notes

    await db.commit()
    return {"message": f"Appointment status updated to {status_update}", "status": "success"}


# -------------------------------------------------------------
# 5. Legacy Report Review & Signature (Backward Compatibility)
# -------------------------------------------------------------
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

    # Mark report as clinician approved and update submission status
    report.is_clinician_approved = review_in.approved
    report.submission_status = "REVIEWED" if review_in.approved else "AWAITING_REVISION"
    
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
