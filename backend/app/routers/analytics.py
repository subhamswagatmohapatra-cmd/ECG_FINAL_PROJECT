from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import User, Patient, HeartRateReading, EmergencyAlert
from app.routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
async def get_cardiovascular_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Calculate comprehensive personal cardiovascular analytics."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile not found.")
        
    # Fetch all readings for this patient
    readings_stmt = (
        select(HeartRateReading)
        .where(HeartRateReading.patient_id == patient.id)
        .order_by(HeartRateReading.measurement_time.asc())
    )
    res = await db.execute(readings_stmt)
    readings = res.scalars().all()
    
    if not readings:
        return {
            "has_data": False,
            "message": "Log heart rate readings to generate analytics."
        }
        
    bpms = [r.bpm for r in readings]
    resting_bpms = [r.bpm for r in readings if r.resting_status == "resting"]
    
    # 30-day baseline
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    month_readings = [r for r in readings if r.measurement_time >= thirty_days_ago]
    month_resting = [r.bpm for r in month_readings if r.resting_status == "resting"]
    baseline_resting = round(sum(month_resting) / len(month_resting), 1) if month_resting else (round(sum(resting_bpms) / len(resting_bpms), 1) if resting_bpms else 72.0)
    
    latest_reading = readings[-1]
    latest_delta = round(latest_reading.bpm - baseline_resting, 1)
    
    # Circadian distribution
    morning_bpms, afternoon_bpms, evening_bpms, night_bpms = [], [], [], []
    for r in readings:
        hour = r.measurement_time.hour
        if 6 <= hour < 12:
            morning_bpms.append(r.bpm)
        elif 12 <= hour < 18:
            afternoon_bpms.append(r.bpm)
        elif 18 <= hour < 24:
            evening_bpms.append(r.bpm)
        else:
            night_bpms.append(r.bpm)
            
    circadian = {
        "morning": {"avg": round(sum(morning_bpms)/len(morning_bpms), 1) if morning_bpms else None, "count": len(morning_bpms)},
        "afternoon": {"avg": round(sum(afternoon_bpms)/len(afternoon_bpms), 1) if afternoon_bpms else None, "count": len(afternoon_bpms)},
        "evening": {"avg": round(sum(evening_bpms)/len(evening_bpms), 1) if evening_bpms else None, "count": len(evening_bpms)},
        "night": {"avg": round(sum(night_bpms)/len(night_bpms), 1) if night_bpms else None, "count": len(night_bpms)},
    }
    
    # Measurement Consistency & Data Completeness (days with at least 1 reading in past 30 days)
    days_logged = len(set(r.measurement_time.date() for r in month_readings))
    completeness_score = min(100, round((days_logged / 30.0) * 100))
    
    # Variability (Standard deviation approx)
    avg_bpm = sum(bpms) / len(bpms)
    variance = sum((x - avg_bpm) ** 2 for x in bpms) / len(bpms)
    std_dev = round(variance ** 0.5, 1)
    
    # Unusual Readings (< 50 or > 100)
    unusual_count = sum(1 for b in bpms if b < 50 or b > 100)
    
    # Alerts count
    alerts_stmt = select(EmergencyAlert).where(EmergencyAlert.patient_id == patient.id)
    alerts_res = await db.execute(alerts_stmt)
    alerts = alerts_res.scalars().all()
    alert_counts = {"GREEN": 0, "YELLOW": 0, "ORANGE": 0, "RED": 0}
    for a in alerts:
        alert_counts[a.alert_level] = alert_counts.get(a.alert_level, 0) + 1
        
    return {
        "has_data": True,
        "total_readings": len(readings),
        "baseline_resting_hr": baseline_resting,
        "latest_bpm": latest_reading.bpm,
        "latest_delta_vs_baseline": latest_delta,
        "overall_average": round(avg_bpm, 1),
        "standard_deviation_bpm": std_dev,
        "circadian_rhythm": circadian,
        "data_completeness_pct": completeness_score,
        "days_logged_past_month": days_logged,
        "unusual_readings_count": unusual_count,
        "unusual_readings_pct": round((unusual_count / len(bpms)) * 100, 1),
        "alert_distribution": alert_counts,
        "wellness_summary": (
            "Telemetry demonstrates stable resting cardiovascular hemodynamics within target physiological corridor."
            if abs(latest_delta) < 8 else
            f"Current reading shows a {abs(latest_delta)} BPM deviation from your 30-day resting baseline."
        ),
        "clinical_notice": "Cardiovascular analytics are calculated for educational self-monitoring. Not a clinical diagnosis."
    }

