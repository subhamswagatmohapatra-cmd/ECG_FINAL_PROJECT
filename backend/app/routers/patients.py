from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models import User, Patient, MedicalHistory, Medication, Allergy, AuditLog
from app.schemas import (
    PatientProfileUpdate, PatientOut,
    MedicalHistoryBase, MedicalHistoryOut,
    MedicationCreate, MedicationOut,
    AllergyBase, AllergyOut
)
from app.auth import get_current_user, get_current_patient

router = APIRouter(prefix="/patients", tags=["Patient Management"])

@router.get("/profile", response_model=PatientOut)
async def get_patient_profile(
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Patient)
        .options(
            selectinload(Patient.medical_history),
            selectinload(Patient.medications),
            selectinload(Patient.allergies)
        )
        .where(Patient.id == current_patient.id)
    )
    res = await db.execute(query)
    patient = res.scalars().first()
    
    return PatientOut(
        id=patient.id,
        user_id=patient.user_id,
        patient_id_code=patient.patient_id_code,
        full_name=current_user.full_name,
        email=current_user.email,
        age=patient.age,
        sex=patient.sex,
        height_cm=patient.height_cm,
        weight_kg=patient.weight_kg,
        phone=patient.phone,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        emergency_contact_relation=patient.emergency_contact_relation,
        smoking_habit=patient.smoking_habit or "non-smoker",
        alcohol_consumption=patient.alcohol_consumption or "none",
        physical_activity_level=patient.physical_activity_level or "moderate",
        sleep_duration_hours=patient.sleep_duration_hours or 7.0,
        stress_level=patient.stress_level or "moderate",
        caffeine_intake=patient.caffeine_intake or "moderate",
        is_pregnant=patient.is_pregnant or False,
        pregnancy_trimester=patient.pregnancy_trimester,
        recent_illness_or_fever=patient.recent_illness_or_fever or False,
        recent_illness_details=patient.recent_illness_details,
        medical_history=patient.medical_history,
        medications=patient.medications or [],
        allergies=patient.allergies or [],
        created_at=patient.created_at
    )

@router.put("/profile", response_model=PatientOut)
async def update_patient_profile(
    update_data: PatientProfileUpdate,
    current_patient: Patient = Depends(get_current_patient),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if update_data.full_name:
        current_user.full_name = update_data.full_name

    fields_to_update = [
        "date_of_birth", "age", "sex", "height_cm", "weight_kg", "phone",
        "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
        "smoking_habit", "alcohol_consumption", "physical_activity_level",
        "sleep_duration_hours", "stress_level", "caffeine_intake", "daily_exercise_habits",
        "is_pregnant", "pregnancy_trimester", "recent_illness_or_fever", "recent_illness_details"
    ]
    for field in fields_to_update:
        val = getattr(update_data, field)
        if val is not None:
            setattr(current_patient, field, val)

    db.add(AuditLog(
        user_id=current_user.id,
        action="UPDATE_PATIENT_PROFILE",
        resource_type="PATIENT",
        resource_id=str(current_patient.id),
        details={"updated_fields": [f for f in fields_to_update if getattr(update_data, f) is not None]}
    ))

    await db.commit()
    return await get_patient_profile(current_patient=current_patient, current_user=current_user, db=db)

@router.put("/medical-history", response_model=MedicalHistoryOut)
async def update_medical_history(
    history_in: MedicalHistoryBase,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(MedicalHistory).where(MedicalHistory.patient_id == current_patient.id))
    history = res.scalars().first()
    if not history:
        history = MedicalHistory(patient_id=current_patient.id)
        db.add(history)

    for field, val in history_in.dict().items():
        setattr(history, field, val)

    await db.commit()
    await db.refresh(history)
    return history

@router.post("/medications", response_model=MedicationOut)
async def add_medication(
    med_in: MedicationCreate,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    med = Medication(patient_id=current_patient.id, **med_in.dict())
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med

@router.delete("/medications/{med_id}")
async def delete_medication(
    med_id: int,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Medication).where(Medication.id == med_id, Medication.patient_id == current_patient.id))
    med = res.scalars().first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    await db.delete(med)
    await db.commit()
    return {"message": "Medication removed"}

@router.post("/allergies", response_model=AllergyOut)
async def add_allergy(
    allergy_in: AllergyBase,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    allergy = Allergy(patient_id=current_patient.id, **allergy_in.dict())
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)
    return allergy

@router.delete("/allergies/{allergy_id}")
async def delete_allergy(
    allergy_id: int,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Allergy).where(Allergy.id == allergy_id, Allergy.patient_id == current_patient.id))
    allergy = res.scalars().first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")
    await db.delete(allergy)
    await db.commit()
    return {"message": "Allergy removed"}
