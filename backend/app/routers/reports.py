from fastapi import APIRouter, Depends, HTTPException, Response, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
import os
import uuid
from datetime import datetime, timezone
from app.database import get_db
from app.models import HealthReport, Patient, User, AIAnalysis, HeartRateReading, AuditLog, Doctor, DoctorPatientAssignment, Notification
from app.schemas import HealthReportOut, ReportSubmissionRequest
from app.auth import get_current_user, get_current_patient
from app.report_generator import HealthReportGenerator
from app.clinical_engine import ClinicalRuleEngine

router = APIRouter(prefix="/reports", tags=["Health Reports"])

@router.post("/generate", response_model=HealthReportOut)
async def generate_new_report(
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch latest reading with symptoms
    r_query = (
        select(HeartRateReading)
        .options(selectinload(HeartRateReading.symptoms))
        .where(HeartRateReading.patient_id == current_patient.id)
        .order_by(desc(HeartRateReading.measurement_time))
        .limit(1)
    )
    r_res = await db.execute(r_query)
    reading = r_res.scalars().first()
    if not reading:
        raise HTTPException(status_code=400, detail="Cannot generate report: No heart rate readings found.")

    # Fetch latest AI analysis
    a_query = (
        select(AIAnalysis)
        .options(selectinload(AIAnalysis.recommendations))
        .where(AIAnalysis.patient_id == current_patient.id)
        .order_by(desc(AIAnalysis.created_at))
        .limit(1)
    )
    a_res = await db.execute(a_query)
    ai_record = a_res.scalars().first()
    
    # Fetch patient profile with relations
    p_query = (
        select(Patient)
        .options(
            selectinload(Patient.medical_history),
            selectinload(Patient.medications),
            selectinload(Patient.allergies)
        )
        .where(Patient.id == current_patient.id)
    )
    p_res = await db.execute(p_query)
    patient = p_res.scalars().first()

    # Calculate 7d metrics
    rec_res = await db.execute(
        select(HeartRateReading)
        .where(HeartRateReading.patient_id == current_patient.id)
        .order_by(desc(HeartRateReading.measurement_time))
        .limit(20)
    )
    readings_7d = rec_res.scalars().all()
    bpms = [r.bpm for r in readings_7d]
    avg_hr = round(sum(bpms) / len(bpms), 1) if bpms else reading.bpm
    min_hr = min(bpms) if bpms else reading.bpm
    max_hr = max(bpms) if bpms else reading.bpm

    symptoms_dict = {}
    if reading.symptoms:
        symptoms_dict = {
            "chest_pain": reading.symptoms.chest_pain,
            "shortness_of_breath": reading.symptoms.severe_shortness_of_breath,
            "dizziness": reading.symptoms.dizziness,
            "palpitations": reading.symptoms.palpitations,
            "fatigue": reading.symptoms.fatigue,
            "fainting": reading.symptoms.fainting_or_syncope
        }

    meds_list = [{"name": m.name} for m in patient.medications]
    med_history_dict = {
        "High Blood Pressure": patient.medical_history.high_blood_pressure if patient.medical_history else False,
        "Known Heart Disease": patient.medical_history.has_heart_disease if patient.medical_history else False,
        "Diabetes": patient.medical_history.diabetes if patient.medical_history else False
    }

    triage = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=reading.bpm,
        age=patient.age,
        resting_status=reading.resting_status,
        symptoms=symptoms_dict,
        medical_history=med_history_dict,
        medications=meds_list,
        is_pregnant=patient.is_pregnant,
        recent_illness=patient.recent_illness_or_fever,
        is_athlete=(patient.physical_activity_level == "athlete")
    )

    ref_code = f"REP-2026-{uuid.uuid4().hex[:6].upper()}"
    
    report_payload = HealthReportGenerator.generate_report_payload(
        patient_data={
            "patient_id_code": patient.patient_id_code,
            "full_name": current_user.full_name,
            "age": patient.age,
            "sex": patient.sex,
            "height_cm": patient.height_cm,
            "weight_kg": patient.weight_kg,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone,
            "medical_history": med_history_dict,
            "medications": meds_list,
            "allergies": [{"allergen": a.allergen} for a in patient.allergies]
        },
        reading_data={
            "bpm": reading.bpm,
            "resting_status": reading.resting_status,
            "measurement_method": reading.measurement_method,
            "device_name": reading.device_name,
            "measurement_time": reading.measurement_time.strftime("%Y-%m-%d %H:%M UTC"),
            "symptoms": symptoms_dict
        },
        triage_data=triage,
        ai_data={
            "contextual_interpretation": ai_record.contextual_interpretation if ai_record else "Analysis generated based on clinical vital sign baseline.",
            "physiological_factors": ai_record.physiological_factors if ai_record else triage.get("contributing_factors", []),
            "unusual_patterns": ai_record.unusual_patterns if ai_record else [],
            "recommendations": [
                {"category": r.category, "recommendation_text": r.recommendation_text, "priority": r.priority}
                for r in (ai_record.recommendations if ai_record else [])
            ],
            "data_limitations": ai_record.data_limitations if ai_record else "Pulse reading cannot substitute for clinical 12-lead ECG."
        },
        historical_stats={"avg_hr": avg_hr, "min_hr": min_hr, "max_hr": max_hr},
        reference_code=ref_code
    )

    pdf_dir = "static/reports"
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_filename = f"{ref_code}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)
    HealthReportGenerator.generate_pdf(report_payload, pdf_path)

    report = HealthReport(
        patient_id=current_patient.id,
        report_reference_code=ref_code,
        title="PATIENT HEALTH ANALYSIS REPORT",
        report_data=report_payload,
        risk_level=triage["alert_level"],
        summary=ai_record.contextual_interpretation[:250] + "..." if ai_record else "Report compiled.",
        clinical_limitations=report_payload["section_11_limitations_of_analysis"],
        pdf_filename=pdf_filename,
        is_clinician_approved=False
    )
    db.add(report)

    db.add(AuditLog(
        user_id=current_user.id,
        action="GENERATE_HEALTH_REPORT",
        resource_type="REPORT",
        resource_id=ref_code,
        details={"risk_level": triage["alert_level"], "pdf": pdf_filename}
    ))

    await db.commit()
    await db.refresh(report)
    return report

@router.get("", response_model=List[HealthReportOut])
async def list_reports(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(HealthReport)
        .where(HealthReport.patient_id == current_patient.id)
        .order_by(desc(HealthReport.generated_at))
    )
    return res.scalars().all()

@router.get("/{report_id}", response_model=HealthReportOut)
async def get_report_by_id(
    report_id: int,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(HealthReport)
        .where(HealthReport.id == report_id, HealthReport.patient_id == current_patient.id)
    )
    report = res.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{report_id}/download-pdf")
async def download_pdf_report(
    report_id: int,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(HealthReport).where(HealthReport.id == report_id))
    report = res.scalars().first()
    if not report or not report.pdf_filename:
        raise HTTPException(status_code=404, detail="PDF report not found")
    
    file_path = os.path.join("static/reports", report.pdf_filename)
    if not os.path.exists(file_path):
        # Regenerate on the fly if needed
        HealthReportGenerator.generate_pdf(report.report_data, file_path)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"CardioPulse_{report.report_reference_code}.pdf"
    )

@router.post("/{report_id}/submit")
async def submit_health_report_to_doctor(
    report_id: int,
    payload: Optional[ReportSubmissionRequest] = None,
    doctor_id: Optional[int] = Query(None),
    patient_notes: Optional[str] = Query(None),
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a generated health analysis report directly to an attending doctor.
    Updates submission status to awaiting_doctor_review and notifies the clinician.
    """
    target_doctor_id = (payload.doctor_id if payload and payload.doctor_id is not None else None) or doctor_id
    notes = (payload.patient_notes if payload and payload.patient_notes is not None else None) or patient_notes

    # 1. Fetch Report
    res = await db.execute(
        select(HealthReport).where(
            HealthReport.id == report_id,
            HealthReport.patient_id == current_patient.id
        )
    )
    report = res.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Health report not found")

    # 2. Resolve Doctor
    target_doctor = None
    if target_doctor_id:
        doc_res = await db.execute(
            select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == target_doctor_id)
        )
        target_doctor = doc_res.scalars().first()
        if not target_doctor:
            raise HTTPException(status_code=404, detail=f"Selected doctor (ID {target_doctor_id}) not found")

    if not target_doctor:
        doc_res = await db.execute(
            select(Doctor)
            .options(selectinload(Doctor.user))
            .where(or_(Doctor.verified == True, Doctor.verification_status == "approved"))
            .order_by(Doctor.id.asc())
            .limit(1)
        )
        target_doctor = doc_res.scalars().first()

        if not target_doctor:
            fallback_res = await db.execute(
                select(Doctor).options(selectinload(Doctor.user)).order_by(Doctor.id.asc()).limit(1)
            )
            target_doctor = fallback_res.scalars().first()

        if not target_doctor:
            raise HTTPException(status_code=404, detail="No registered doctor found in the system for clinical assignment.")

    # 3. Create or update assignment
    assign_res = await db.execute(
        select(DoctorPatientAssignment).where(
            DoctorPatientAssignment.doctor_id == target_doctor.id,
            DoctorPatientAssignment.patient_id == current_patient.id
        )
    )
    assignment = assign_res.scalars().first()
    if not assignment:
        assignment = DoctorPatientAssignment(
            doctor_id=target_doctor.id,
            patient_id=current_patient.id,
            status="active",
            assigned_by="patient_request"
        )
        db.add(assignment)
    else:
        assignment.status = "active"

    # 4. Update Report
    now_utc = datetime.now(timezone.utc)
    report.submission_status = "awaiting_doctor_review"
    report.assigned_doctor_id = target_doctor.id
    report.patient_submission_notes = notes
    report.submitted_at = now_utc

    doc_display_name = target_doctor.user.full_name if (target_doctor and target_doctor.user) else "Attending Cardiologist"

    # 5. Notifications
    db.add(Notification(
        user_id=target_doctor.user_id,
        category="report",
        title=f"New Health Report: {current_user.full_name}",
        message=f"Patient {current_user.full_name} ({current_patient.patient_id_code}) submitted report {report.report_reference_code} for clinical review. Notes: {notes or 'None'}",
        priority="high",
        action_url="/doctor"
    ))

    db.add(Notification(
        user_id=current_user.id,
        category="report",
        title="Report Submitted to Doctor",
        message=f"Report {report.report_reference_code} was submitted to {doc_display_name}. Status: Awaiting Doctor Review.",
        priority="medium",
        action_url="/reports"
    ))

    # 6. Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="SUBMIT_REPORT_TO_DOCTOR",
        resource_type="REPORT",
        resource_id=report.report_reference_code,
        details={"doctor_id": target_doctor.id, "doctor_name": doc_display_name, "notes": notes}
    ))

    await db.commit()
    await db.refresh(report)

    return {
        "status": "success",
        "message": f"Report submitted to {doc_display_name}",
        "submission_status": "awaiting_doctor_review",
        "assigned_doctor_id": target_doctor.id,
        "assigned_doctor_name": doc_display_name,
        "report_id": report.id
    }
