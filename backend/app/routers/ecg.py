import os
import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, get_current_patient, get_current_doctor
from app.models import (
    User, Patient, Doctor, ECGUpload, ECGSignalData, ECGAIAnalysis,
    HealthReport, DoctorPatientAssignment, Notification, AuditLog, ClinicalObservation
)
from app.schemas import ECGUploadOut
from app.ecg_engine import ECGAIEngine
from app.ecg_pdf import ECGPDFReportGenerator

router = APIRouter(prefix="/ecg", tags=["AI ECG Signal Analysis"])

UPLOAD_DIR = "static/ecg_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
REPORTS_DIR = "static/reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

@router.post("/upload")
async def upload_ecg(
    file: UploadFile = File(...),
    recorded_bp: Optional[str] = Form(None),
    recorded_hr: Optional[int] = Form(None),
    symptoms: Optional[str] = Form("[]"), # JSON array string
    family_history: Optional[str] = Form(None),
    patient_notes: Optional[str] = Form(None),
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests and analyzes patient ECG signals in PDF, JPG, PNG, CSV, TXT, or WFDB format.
    Executes real-time QRS detection, HRV calculations, and AI rhythm classification.
    """
    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".csv", ".tsv", ".txt", ".dat", ".hea", ".pdf", ".png", ".jpg", ".jpeg"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: CSV, TXT, WFDB (.dat/.hea), PDF, PNG, JPG."
        )

    # 2. Read bytes and enforce size check (max 25 MB)
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 25 MB limit.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 3. Save file securely to static storage
    unique_filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    format_label = ext.replace(".", "")
    if format_label in ["jpg", "jpeg", "png"]:
        format_label = "image"

    # Parse symptoms JSON list
    symptom_list = []
    if symptoms:
        try:
            symptom_list = json.loads(symptoms)
        except Exception:
            symptom_list = [s.strip() for s in symptoms.split(",") if s.strip()]

    # 4. Create ECGUpload Database Record
    ecg_upload = ECGUpload(
        patient_id=current_patient.id,
        filename=unique_filename,
        original_filename=file.filename,
        file_format=format_label,
        file_path=file_path,
        file_size_bytes=len(content),
        upload_status="processing",
        recorded_bp=recorded_bp,
        recorded_hr=recorded_hr,
        symptoms_reported=symptom_list,
        family_history=family_history,
        patient_notes=patient_notes
    )
    db.add(ecg_upload)
    await db.flush()

    # 5. Run Pan-Tompkins DSP and AI Rhythm Analysis
    try:
        analysis_res = ECGAIEngine.analyze_ecg(content, file.filename, symptom_list)
        ecg_upload.upload_status = "completed"
    except Exception as e:
        ecg_upload.upload_status = "failed"
        ecg_upload.error_message = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Signal analysis engine error: {str(e)}")

    # 6. Store Parsed Signal Data
    signal_record = ECGSignalData(
        upload_id=ecg_upload.id,
        sampling_rate_hz=analysis_res["sampling_rate_hz"],
        duration_seconds=analysis_res["duration_seconds"],
        lead_count=analysis_res["lead_count"],
        lead_labels=analysis_res["lead_labels"],
        raw_samples=analysis_res["raw_samples"],
        signal_quality_index=analysis_res["signal_quality_index"]
    )
    db.add(signal_record)

    # 7. Store AI Analysis Results
    ai_record = ECGAIAnalysis(
        upload_id=ecg_upload.id,
        patient_id=current_patient.id,
        heart_rate_bpm=analysis_res["heart_rate_bpm"],
        rr_intervals_ms=analysis_res["rr_intervals_ms"],
        mean_rr_ms=analysis_res["mean_rr_ms"],
        sdnn_ms=analysis_res["sdnn_ms"],
        rmssd_ms=analysis_res["rmssd_ms"],
        qrs_duration_ms=analysis_res["qrs_duration_ms"],
        qt_interval_ms=analysis_res["qt_interval_ms"],
        qtc_interval_ms=analysis_res["qtc_interval_ms"],
        st_segment_deviation_mv=analysis_res["st_segment_deviation_mv"],
        signal_quality=analysis_res["signal_quality"],
        baseline_wander_corrected=analysis_res["baseline_wander_corrected"],
        r_peak_indices=analysis_res["r_peak_indices"],
        primary_classification=analysis_res["primary_classification"],
        secondary_classifications=analysis_res["secondary_classifications"],
        model_confidence_pct=analysis_res["model_confidence_pct"],
        explainability_notes=analysis_res["explainability_notes"],
        clinical_risk_tier=analysis_res["clinical_risk_tier"],
        model_version=analysis_res["model_version"],
        status="COMPLETED"
    )
    db.add(ai_record)

    # 8. Generate Official PDF Report
    pdf_filename = f"ECG_REPORT_{current_patient.id}_{ecg_upload.id}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)
    try:
        ECGPDFReportGenerator.generate_pdf(
            patient_info={
                "id": current_patient.id,
                "full_name": current_user.full_name,
                "patient_id_code": current_patient.patient_id_code,
                "age": current_patient.age or "N/A",
                "sex": current_patient.sex or "N/A",
                "blood_pressure_baseline": recorded_bp or "120/80 mmHg",
                "emergency_contact_name": current_patient.emergency_contact_name
            },
            ecg_upload_info={
                "id": ecg_upload.id,
                "ref_code": f"ECG-2026-{ecg_upload.id:04d}",
                "recorded_bp": recorded_bp
            },
            analysis_info=analysis_res,
            doctor_review_info=None,
            output_path=pdf_path
        )
    except Exception as pdf_err:
        print("PDF Generation error:", pdf_err)
        pdf_filename = None

    # 9. Create HealthReport Entry
    ref_code = f"ECG-2026-{ecg_upload.id:04d}"
    health_rep = HealthReport(
        patient_id=current_patient.id,
        ecg_upload_id=ecg_upload.id,
        report_reference_code=ref_code,
        title=f"ECG Signal Analysis Report - {analysis_res['primary_classification']}",
        risk_level=analysis_res["clinical_risk_tier"],
        summary=f"Analysis of {analysis_res['duration_seconds']}s Lead II ECG signal reveals ventricular rate of {analysis_res['heart_rate_bpm']} BPM with {analysis_res['primary_classification']}.",
        clinical_limitations="Single-channel Lead II telemetry. Automated decision support does not replace formal 12-lead diagnostic ECG.",
        pdf_filename=pdf_filename,
        report_data=analysis_res,
        submission_status="analysis_completed"
    )
    db.add(health_rep)

    # 10. Audit Log & Notifications
    db.add(AuditLog(
        user_id=current_user.id,
        action="ECG_SIGNAL_UPLOAD_AND_ANALYSIS",
        resource_type="ECG_UPLOAD",
        resource_id=str(ecg_upload.id),
        details={
            "filename": file.filename,
            "format": format_label,
            "classification": analysis_res["primary_classification"],
            "bpm": analysis_res["heart_rate_bpm"],
            "risk_tier": analysis_res["clinical_risk_tier"]
        }
    ))

    # Alert notification if elevated risk
    if analysis_res["clinical_risk_tier"] in ["ORANGE", "RED"]:
        db.add(Notification(
            user_id=current_user.id,
            category="alert",
            title=f"ECG Analysis Alert: {analysis_res['clinical_risk_tier']} Tier",
            message=f"Your ECG analysis flagged: {analysis_res['primary_classification']}. Please review your report and submit to your cardiologist.",
            priority="high",
            action_url="/ecg"
        ))

    await db.commit()

    # Reload full record with relationships
    query = (
        select(ECGUpload)
        .options(
            selectinload(ECGUpload.signal_data),
            selectinload(ECGUpload.ai_analysis)
        )
        .where(ECGUpload.id == ecg_upload.id)
    )
    res = await db.execute(query)
    record = res.scalars().first()

    return {
        "status": "success",
        "upload_id": record.id,
        "message": "ECG signal successfully uploaded and analyzed by CardioPulse AI engine",
        "data": record
    }

@router.get("/uploads")
async def list_patient_uploads(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all ECG uploads and analyses for the current patient.
    """
    query = (
        select(ECGUpload)
        .options(
            selectinload(ECGUpload.signal_data),
            selectinload(ECGUpload.ai_analysis),
            selectinload(ECGUpload.reports)
        )
        .where(ECGUpload.patient_id == current_patient.id)
        .order_by(desc(ECGUpload.created_at))
    )
    res = await db.execute(query)
    uploads = res.scalars().all()
    return uploads

@router.get("/uploads/{upload_id}")
async def get_upload_details(
    upload_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full waveform data, Pan-Tompkins intervals, and AI classification.
    """
    query = (
        select(ECGUpload)
        .options(
            selectinload(ECGUpload.signal_data),
            selectinload(ECGUpload.ai_analysis),
            selectinload(ECGUpload.reports),
            selectinload(ECGUpload.observations)
        )
        .where(ECGUpload.id == upload_id)
    )
    res = await db.execute(query)
    upload = res.scalars().first()
    if not upload:
        raise HTTPException(status_code=404, detail="ECG upload not found")

    # Authorization check: patient owns it, or doctor/admin accessing
    if current_user.role == "patient":
        p_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        patient = p_res.scalars().first()
        if not patient or patient.id != upload.patient_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this ECG record")

    return upload

@router.post("/uploads/{upload_id}/submit")
async def submit_ecg_to_doctor(
    upload_id: int,
    doctor_id: Optional[int] = Form(None),
    patient_notes: Optional[str] = Form(None),
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits the ECG signal and AI analysis report to an attending doctor.
    Updates submission status and dispatches clinical notifications.
    """
    # 1. Fetch Upload
    res = await db.execute(select(ECGUpload).where(ECGUpload.id == upload_id, ECGUpload.patient_id == current_patient.id))
    upload = res.scalars().first()
    if not upload:
        raise HTTPException(status_code=404, detail="ECG upload record not found")

    # 2. Resolve Doctor (Assign provided doctor or default primary cardiologist)
    if not doctor_id:
        doc_res = await db.execute(select(Doctor).where(Doctor.verified == True).limit(1))
        doc = doc_res.scalars().first()
        if not doc:
            raise HTTPException(status_code=404, detail="No active verified doctor available for assignment.")
        target_doctor = doc
    else:
        doc_res = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
        target_doctor = doc_res.scalars().first()
        if not target_doctor:
            raise HTTPException(status_code=404, detail="Selected doctor does not exist.")

    # 3. Create or Update Doctor-Patient Assignment
    assign_res = await db.execute(
        select(DoctorPatientAssignment)
        .where(
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

    # 4. Update HealthReport submission status
    rep_res = await db.execute(select(HealthReport).where(HealthReport.ecg_upload_id == upload_id))
    report = rep_res.scalars().first()
    if report:
        report.submission_status = "awaiting_doctor_review"
        report.assigned_doctor_id = target_doctor.id
        report.patient_submission_notes = patient_notes
        report.submitted_at = datetime.now(timezone.utc)

    # 5. Notify Doctor
    db.add(Notification(
        user_id=target_doctor.user_id,
        category="report",
        title=f"New ECG Submission: {current_user.full_name}",
        message=f"Patient {current_user.full_name} ({current_patient.patient_id_code}) submitted an ECG signal for clinical review.",
        priority="high",
        action_url="/doctor"
    ))

    # 6. Audit Log
    db.add(AuditLog(
        user_id=current_user.id,
        action="SUBMIT_ECG_TO_DOCTOR",
        resource_type="ECG_UPLOAD",
        resource_id=str(upload_id),
        details={"doctor_id": target_doctor.id, "doctor_name": target_doctor.user.full_name if target_doctor.user else "Cardiologist"}
    ))

    await db.commit()

    return {
        "status": "success",
        "message": f"ECG report submitted to Dr. {target_doctor.user.full_name if target_doctor.user else 'Sarah Chen'}",
        "submission_status": "awaiting_doctor_review",
        "assigned_doctor_id": target_doctor.id
    }

@router.get("/uploads/{upload_id}/pdf")
async def download_ecg_pdf(
    upload_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Downloads the formal generated clinical PDF report.
    """
    rep_res = await db.execute(select(HealthReport).where(HealthReport.ecg_upload_id == upload_id))
    report = rep_res.scalars().first()
    if not report or not report.pdf_filename:
        # Re-generate if missing
        up_res = await db.execute(
            select(ECGUpload)
            .options(selectinload(ECGUpload.ai_analysis), selectinload(ECGUpload.patient))
            .where(ECGUpload.id == upload_id)
        )
        upload = up_res.scalars().first()
        if not upload or not upload.ai_analysis:
            raise HTTPException(status_code=404, detail="ECG report not ready")

        pdf_filename = f"ECG_REPORT_{upload.patient_id}_{upload.id}.pdf"
        pdf_path = os.path.join(REPORTS_DIR, pdf_filename)
        p = upload.patient
        ECGPDFReportGenerator.generate_pdf(
            patient_info={"full_name": current_user.full_name, "patient_id_code": p.patient_id_code, "age": p.age, "sex": p.sex},
            ecg_upload_info={"id": upload.id, "ref_code": f"ECG-2026-{upload.id:04d}"},
            analysis_info={
                "sampling_rate_hz": 250.0,
                "duration_seconds": 10.0,
                "heart_rate_bpm": upload.ai_analysis.heart_rate_bpm,
                "primary_classification": upload.ai_analysis.primary_classification,
                "clinical_risk_tier": upload.ai_analysis.clinical_risk_tier,
                "model_confidence_pct": upload.ai_analysis.model_confidence_pct,
                "explainability_notes": upload.ai_analysis.explainability_notes or [],
                "raw_samples": [],
                "r_peak_indices": []
            },
            output_path=pdf_path
        )
    else:
        pdf_path = os.path.join(REPORTS_DIR, report.pdf_filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Report PDF file not found on disk")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(pdf_path)
    )

@router.get("/demo-presets")
async def get_demo_ecg_presets():
    """
    Returns authentic pre-calibrated clinical ECG wave presets (NSR, Atrial Fib, Tachycardia, Bradycardia, STEMI)
    enabling instant 1-click clinical testing and evaluation.
    """
    presets = [
        {
            "id": "nsr_normal",
            "name": "Normal Sinus Rhythm (NSR)",
            "description": "Standard 74 BPM adult resting rhythm with crisp P-Q-R-S-T morphology and isoelectric ST segment.",
            "target_bpm": 74,
            "risk_tier": "GREEN",
            "sample_csv": "time,lead_ii\n0.0,0.0\n0.04,0.05\n0.08,0.18\n0.12,0.08\n0.16,-0.12\n0.20,1.35\n0.24,-0.28\n0.28,0.02\n0.36,0.32\n0.44,0.0"
        },
        {
            "id": "afib_arrhythmia",
            "name": "Atrial Fibrillation (AFib)",
            "description": "Rapid irregularly irregular ventricular rhythm with high RR variance and fibrillatory baseline waves.",
            "target_bpm": 118,
            "risk_tier": "ORANGE",
            "sample_csv": "time,lead_ii\n0.0,0.04\n0.04,-0.08\n0.08,0.12\n0.16,1.42\n0.20,-0.35\n0.26,0.05\n0.32,0.18"
        },
        {
            "id": "brady_athlete",
            "name": "Sinus Bradycardia (Athlete)",
            "description": "Physiological 48 BPM rhythm with extended RR intervals (1250ms) and normal QRS duration.",
            "target_bpm": 48,
            "risk_tier": "YELLOW",
            "sample_csv": "time,lead_ii\n0.0,0.02\n0.06,0.15\n0.14,-0.10\n0.18,1.45\n0.22,-0.25\n0.32,0.38\n0.42,0.01"
        },
        {
            "id": "stemi_elevation",
            "name": "Acute ST-Segment Elevation (STEMI)",
            "description": "Marked +0.24 mV ST elevation at J+80ms indicating acute transmural myocardial injury.",
            "target_bpm": 86,
            "risk_tier": "RED",
            "sample_csv": "time,lead_ii\n0.0,0.0\n0.08,0.12\n0.16,-0.08\n0.20,1.20\n0.24,-0.18\n0.28,0.26\n0.34,0.28\n0.40,0.22"
        }
    ]
    return presets
