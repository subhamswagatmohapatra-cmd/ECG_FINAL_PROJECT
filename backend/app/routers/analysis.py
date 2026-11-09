from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.database import get_db
from app.models import (
    HeartRateReading, Symptom, Patient, User, AIAnalysis,
    HealthRecommendation, EmergencyAlert, AuditLog
)
from app.schemas import AIAnalysisOut, EmergencyAlertOut, HealthRecommendationOut
from app.auth import get_current_user, get_current_patient
from app.clinical_engine import ClinicalRuleEngine
from app.ai_advisor import AIAdvisorEngine

router = APIRouter(prefix="/analysis", tags=["AI Clinical Analysis"])

@router.post("/evaluate/{reading_id}", response_model=AIAnalysisOut)
async def evaluate_reading(
    reading_id: int,
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch reading with symptoms
    r_query = (
        select(HeartRateReading)
        .options(selectinload(HeartRateReading.symptoms))
        .where(HeartRateReading.id == reading_id, HeartRateReading.patient_id == current_patient.id)
    )
    r_res = await db.execute(r_query)
    reading = r_res.scalars().first()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    # Fetch patient profile with history & meds
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

    # Calculate 7-day stats
    recent_q = (
        select(HeartRateReading)
        .where(HeartRateReading.patient_id == current_patient.id)
        .order_by(desc(HeartRateReading.measurement_time))
        .limit(30)
    )
    rec_res = await db.execute(recent_q)
    rec_readings = rec_res.scalars().all()
    bpms = [r.bpm for r in rec_readings] if rec_readings else [reading.bpm]
    avg_hr = round(sum(bpms) / len(bpms), 1)
    min_hr = min(bpms)
    max_hr = max(bpms)

    symptoms_dict = {}
    if reading.symptoms:
        symptoms_dict = {
            "chest_pain": reading.symptoms.chest_pain,
            "severe_shortness_of_breath": reading.symptoms.severe_shortness_of_breath,
            "fainting_or_syncope": reading.symptoms.fainting_or_syncope,
            "stroke_signs": reading.symptoms.stroke_signs,
            "dizziness": reading.symptoms.dizziness,
            "palpitations": reading.symptoms.palpitations,
            "fatigue": reading.symptoms.fatigue,
            "confusion": reading.symptoms.confusion,
            "cold_sweat": reading.symptoms.cold_sweat
        }

    med_history_dict = {}
    if patient.medical_history:
        med_history_dict = {
            "has_heart_disease": patient.medical_history.has_heart_disease,
            "high_blood_pressure": patient.medical_history.high_blood_pressure,
            "diabetes": patient.medical_history.diabetes,
            "previous_cardiac_event": patient.medical_history.previous_cardiac_event
        }

    meds_list = [{"name": m.name, "affects_heart_rate": m.affects_heart_rate} for m in patient.medications]

    # Deterministic Clinical Triage Safety Engine
    triage = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=reading.bpm,
        age=patient.age,
        resting_status=reading.resting_status,
        symptoms=symptoms_dict,
        medical_history=med_history_dict,
        medications=meds_list,
        is_pregnant=patient.is_pregnant,
        recent_illness=patient.recent_illness_or_fever,
        is_athlete=(patient.physical_activity_level == "athlete"),
        hotline="112"
    )

    # Generative AI Advisor with Guardrails & Medical Validation
    ai_insights = await AIAdvisorEngine.generate_analysis_and_recommendations(
        patient_info={
            "age": patient.age,
            "sex": patient.sex,
            "physical_activity_level": patient.physical_activity_level,
            "sleep_duration_hours": patient.sleep_duration_hours,
            "stress_level": patient.stress_level,
            "caffeine_intake": patient.caffeine_intake,
            "is_pregnant": patient.is_pregnant,
            "recent_illness_or_fever": patient.recent_illness_or_fever,
            "medical_history": med_history_dict,
            "medications": meds_list
        },
        reading_info={
            "bpm": reading.bpm,
            "resting_status": reading.resting_status,
            "symptoms": symptoms_dict
        },
        triage_result=triage,
        historical_metrics={"avg_hr": avg_hr, "min_hr": min_hr, "max_hr": max_hr}
    )

    # Save to Database
    ai_record = AIAnalysis(
        patient_id=current_patient.id,
        reading_id=reading.id,
        observed_bpm=reading.bpm,
        expected_min_bpm=triage["expected_min_bpm"],
        expected_max_bpm=triage["expected_max_bpm"],
        resting_hr_baseline=avg_hr,
        average_hr_7d=avg_hr,
        min_hr_7d=min_hr,
        max_hr_7d=max_hr,
        contextual_interpretation=ai_insights["contextual_interpretation"],
        physiological_factors=ai_insights.get("physiological_factors", []),
        unusual_patterns=ai_insights.get("unusual_patterns", []),
        data_limitations=ai_insights["data_limitations"],
        clinical_disclaimer=ai_insights["clinical_disclaimer"]
    )
    db.add(ai_record)
    await db.flush()

    # Save Recommendations
    recs_out = []
    for r in ai_insights.get("recommendations", []):
        rec_obj = HealthRecommendation(
            analysis_id=ai_record.id,
            patient_id=current_patient.id,
            category=r.get("category", "general_wellness"),
            recommendation_text=r.get("recommendation_text", ""),
            priority=r.get("priority", 1)
        )
        db.add(rec_obj)
        recs_out.append(HealthRecommendationOut(
            category=r.get("category", "general_wellness"),
            recommendation_text=r.get("recommendation_text", ""),
            priority=r.get("priority", 1)
        ))

    # Save or update Emergency Alert
    alert_obj = EmergencyAlert(
        patient_id=current_patient.id,
        reading_id=reading.id,
        alert_level=triage["alert_level"],
        alert_title=triage["alert_title"],
        alert_reason=triage["alert_reason"],
        clinical_rationale=triage["clinical_rationale"],
        emergency_actions=triage["emergency_actions"],
        hotline_number=triage.get("hotline_number", "112")
    )
    db.add(alert_obj)
    await db.flush()

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="RUN_AI_ANALYSIS",
        resource_type="ANALYSIS",
        resource_id=str(ai_record.id),
        details={"alert_level": triage["alert_level"], "bpm": reading.bpm}
    ))

    await db.commit()

    return AIAnalysisOut(
        id=ai_record.id,
        observed_bpm=reading.bpm,
        expected_min_bpm=triage["expected_min_bpm"],
        expected_max_bpm=triage["expected_max_bpm"],
        resting_hr_baseline=avg_hr,
        average_hr_7d=avg_hr,
        min_hr_7d=min_hr,
        max_hr_7d=max_hr,
        contextual_interpretation=ai_insights["contextual_interpretation"],
        physiological_factors=ai_insights.get("physiological_factors", []),
        unusual_patterns=ai_insights.get("unusual_patterns", []),
        data_limitations=ai_insights["data_limitations"],
        clinical_disclaimer=ai_insights["clinical_disclaimer"],
        alert=EmergencyAlertOut(
            id=alert_obj.id,
            alert_level=triage["alert_level"],
            alert_title=triage["alert_title"],
            alert_reason=triage["alert_reason"],
            clinical_rationale=triage["clinical_rationale"],
            emergency_actions=triage["emergency_actions"],
            hotline_number=triage.get("hotline_number", "112"),
            dismissed=False
        ),
        recommendations=recs_out,
        created_at=ai_record.created_at
    )

@router.get("/latest", response_model=Optional[AIAnalysisOut])
async def get_latest_analysis(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(AIAnalysis)
        .options(selectinload(AIAnalysis.recommendations))
        .where(AIAnalysis.patient_id == current_patient.id)
        .order_by(desc(AIAnalysis.created_at))
        .limit(1)
    )
    res = await db.execute(query)
    ai_record = res.scalars().first()
    if not ai_record:
        return None

    # Get associated alert
    alt_res = await db.execute(
        select(EmergencyAlert)
        .where(EmergencyAlert.patient_id == current_patient.id)
        .order_by(desc(EmergencyAlert.created_at))
        .limit(1)
    )
    alert = alt_res.scalars().first()
    alert_out = EmergencyAlertOut(
        id=alert.id if alert else None,
        alert_level=alert.alert_level if alert else "GREEN",
        alert_title=alert.alert_title if alert else "Normal",
        alert_reason=alert.alert_reason if alert else "Within normal baseline",
        clinical_rationale=alert.clinical_rationale if alert else "Clinically standard",
        emergency_actions=alert.emergency_actions if alert else ["Maintain routine healthy monitoring"],
        hotline_number="112"
    )

    recs_out = [
        HealthRecommendationOut(category=r.category, recommendation_text=r.recommendation_text, priority=r.priority)
        for r in (ai_record.recommendations or [])
    ]

    return AIAnalysisOut(
        id=ai_record.id,
        observed_bpm=ai_record.observed_bpm,
        expected_min_bpm=ai_record.expected_min_bpm,
        expected_max_bpm=ai_record.expected_max_bpm,
        resting_hr_baseline=ai_record.resting_hr_baseline,
        average_hr_7d=ai_record.average_hr_7d,
        min_hr_7d=ai_record.min_hr_7d,
        max_hr_7d=ai_record.max_hr_7d,
        contextual_interpretation=ai_record.contextual_interpretation,
        physiological_factors=ai_record.physiological_factors or [],
        unusual_patterns=ai_record.unusual_patterns or [],
        data_limitations=ai_record.data_limitations,
        clinical_disclaimer=ai_record.clinical_disclaimer,
        alert=alert_out,
        recommendations=recs_out,
        created_at=ai_record.created_at
    )
