from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import HeartRateReading, Symptom, Patient, User, AuditLog
from app.schemas import HeartRateCreate, HeartRateOut
from app.auth import get_current_user, get_current_patient

router = APIRouter(prefix="/readings", tags=["Heart Rate Readings"])

@router.post("", response_model=HeartRateOut)
async def create_reading(
    reading_in: HeartRateCreate,
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    meas_time = reading_in.measurement_time or datetime.now(timezone.utc)
    
    reading = HeartRateReading(
        patient_id=current_patient.id,
        bpm=reading_in.bpm,
        resting_status=reading_in.resting_status,
        measurement_method=reading_in.measurement_method,
        device_name=reading_in.device_name or "Manual Measurement",
        measurement_time=meas_time,
        notes=reading_in.notes
    )
    db.add(reading)
    await db.flush()

    if reading_in.symptoms:
        symptom = Symptom(
            reading_id=reading.id,
            patient_id=current_patient.id,
            **reading_in.symptoms.dict()
        )
        db.add(symptom)

    db.add(AuditLog(
        user_id=current_user.id,
        action="RECORD_HEART_RATE",
        resource_type="READING",
        resource_id=str(reading.id),
        details={"bpm": reading_in.bpm, "status": reading_in.resting_status, "method": reading_in.measurement_method}
    ))

    await db.commit()
    
    # Reload with symptoms
    res = await db.execute(
        select(HeartRateReading)
        .options(selectinload(HeartRateReading.symptoms))
        .where(HeartRateReading.id == reading.id)
    )
    return res.scalars().first()

@router.get("", response_model=List[HeartRateOut])
async def list_readings(
    limit: int = Query(50, ge=1, le=200),
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(HeartRateReading)
        .options(selectinload(HeartRateReading.symptoms))
        .where(HeartRateReading.id.isnot(None), HeartRateReading.patient_id == current_patient.id)
        .order_by(desc(HeartRateReading.measurement_time))
        .limit(limit)
    )
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/metrics/summary")
async def get_metrics_summary(
    days: int = Query(7, ge=1, le=90),
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes current, resting baseline, avg, min, max, daily, weekly, monthly trend aggregates.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Latest reading
    latest_query = (
        select(HeartRateReading)
        .options(selectinload(HeartRateReading.symptoms))
        .where(HeartRateReading.patient_id == current_patient.id)
        .order_by(desc(HeartRateReading.measurement_time))
        .limit(1)
    )
    latest_res = await db.execute(latest_query)
    latest_reading = latest_res.scalars().first()

    # All readings within period
    readings_query = (
        select(HeartRateReading)
        .where(
            HeartRateReading.patient_id == current_patient.id,
            HeartRateReading.measurement_time >= cutoff
        )
        .order_by(HeartRateReading.measurement_time.asc())
    )
    res = await db.execute(readings_query)
    readings = res.scalars().all()

    if not readings and latest_reading:
        readings = [latest_reading]

    bpm_list = [r.bpm for r in readings] if readings else []
    resting_bpms = [r.bpm for r in readings if r.resting_status == "resting"] if readings else []

    current_bpm = latest_reading.bpm if latest_reading else None
    avg_bpm = round(sum(bpm_list) / len(bpm_list), 1) if bpm_list else None
    resting_avg = round(sum(resting_bpms) / len(resting_bpms), 1) if resting_bpms else (current_bpm if current_bpm else 72.0)
    min_bpm = min(bpm_list) if bpm_list else None
    max_bpm = max(bpm_list) if bpm_list else None

    # Trend series for Recharts
    trend_series = []
    for r in readings:
        trend_series.append({
            "id": r.id,
            "timestamp": r.measurement_time.isoformat(),
            "time_display": r.measurement_time.strftime("%b %d, %H:%M"),
            "date": r.measurement_time.strftime("%Y-%m-%d"),
            "bpm": r.bpm,
            "resting_status": r.resting_status,
            "method": r.measurement_method,
            "device": r.device_name
        })

    return {
        "current_bpm": current_bpm,
        "latest_reading": latest_reading,
        "resting_heart_rate": resting_avg,
        "average_bpm": avg_bpm,
        "min_bpm": min_bpm,
        "max_bpm": max_bpm,
        "total_readings_count": len(readings),
        "days_window": days,
        "trend_data": trend_series
    }
