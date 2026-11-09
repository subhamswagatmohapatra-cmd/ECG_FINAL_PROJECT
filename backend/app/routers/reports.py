from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List
import os
import uuid
from app.database import get_db
from app.models import HealthReport, Patient, User, AIAnalysis, HeartRateReading, AuditLog
from app.schemas import HealthReportOut
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
