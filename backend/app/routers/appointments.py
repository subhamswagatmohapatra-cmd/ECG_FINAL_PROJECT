from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import User, Patient, Doctor, Appointment, Notification, AuditLog
from app.schemas import AppointmentCreate, AppointmentUpdate, AppointmentOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/doctors", response_model=List[dict])
async def list_available_doctors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List verified doctors available for consultation appointments."""
    stmt = select(Doctor).options(selectinload(Doctor.user)).where(Doctor.verified == True)
    result = await db.execute(stmt)
    doctors = result.scalars().all()
    
    return [
        {
            "id": doc.id,
            "full_name": doc.user.full_name if doc.user else "Dr. Cardiologist",
            "specialty": doc.specialty,
            "hospital_affiliation": doc.hospital_affiliation or "Metropolitan Heart Institute",
            "license_number": doc.license_number,
            "consultation_phone": doc.consultation_phone
        }
        for doc in doctors
    ]

@router.get("", response_model=List[AppointmentOut])
async def get_appointments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve appointments for the logged in patient or doctor."""
    if current_user.role == "doctor":
        # Get doctor profile
        doc_stmt = select(Doctor).where(Doctor.user_id == current_user.id)
        doc_res = await db.execute(doc_stmt)
        doctor = doc_res.scalar_one_or_none()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        
        stmt = (
            select(Appointment)
            .options(selectinload(Appointment.patient).selectinload(Patient.user), selectinload(Appointment.doctor).selectinload(Doctor.user))
            .where(Appointment.doctor_id == doctor.id)
            .order_by(Appointment.appointment_date.desc())
        )
    else:
        # Patient
        pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
        pat_res = await db.execute(pat_stmt)
        patient = pat_res.scalar_one_or_none()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
        
        stmt = (
            select(Appointment)
            .options(selectinload(Appointment.patient).selectinload(Patient.user), selectinload(Appointment.doctor).selectinload(Doctor.user))
            .where(Appointment.patient_id == patient.id)
            .order_by(Appointment.appointment_date.desc())
        )
        
    result = await db.execute(stmt)
    appointments = result.scalars().all()
    
    res = []
    for appt in appointments:
        doc_name = appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Cardiologist"
        pat_name = appt.patient.user.full_name if appt.patient and appt.patient.user else "Patient"
        res.append(AppointmentOut(
            id=appt.id,
            patient_id=appt.patient_id,
            doctor_id=appt.doctor_id,
            doctor_name=doc_name,
            patient_name=pat_name,
            appointment_date=appt.appointment_date,
            appointment_type=appt.appointment_type,
            status=appt.status,
            reason=appt.reason,
            clinical_notes=appt.clinical_notes,
            created_at=appt.created_at
        ))
    return res

@router.post("", response_model=AppointmentOut)
async def create_appointment(
    payload: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Book a new cardiovascular consultation appointment."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Only registered patients can schedule appointments.")
    
    doc_stmt = select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == payload.doctor_id)
    doc_res = await db.execute(doc_stmt)
    doctor = doc_res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor does not exist.")
    
    new_appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=payload.appointment_date,
        appointment_type=payload.appointment_type,
        status="scheduled",
        reason=payload.reason,
        clinical_notes=payload.clinical_notes
    )
    db.add(new_appt)
    
    # Notify doctor
    if doctor.user_id:
        doc_notif = Notification(
            user_id=doctor.user_id,
            category="appointment",
            title="New Patient Consultation Scheduled",
            message=f"{current_user.full_name} booked a {payload.appointment_type} consult for {payload.appointment_date.strftime('%b %d, %Y at %I:%M %p')}.",
            priority="medium"
        )
        db.add(doc_notif)
        
    # Notify patient
    pat_notif = Notification(
        user_id=current_user.id,
        category="appointment",
        title="Consultation Confirmed",
        message=f"Appointment with {doctor.user.full_name} confirmed for {payload.appointment_date.strftime('%b %d, %Y at %I:%M %p')}.",
        priority="low"
    )
    db.add(pat_notif)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="BOOK_APPOINTMENT",
        resource_type="appointment",
        details={"doctor_id": doctor.id, "date": str(payload.appointment_date)}
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(new_appt)
    
    return AppointmentOut(
        id=new_appt.id,
        patient_id=new_appt.patient_id,
        doctor_id=new_appt.doctor_id,
        doctor_name=doctor.user.full_name if doctor.user else "Cardiologist",
        patient_name=current_user.full_name,
        appointment_date=new_appt.appointment_date,
        appointment_type=new_appt.appointment_type,
        status=new_appt.status,
        reason=new_appt.reason,
        clinical_notes=new_appt.clinical_notes,
        created_at=new_appt.created_at
    )

@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update appointment status or clinical notes."""
    stmt = (
        select(Appointment)
        .options(selectinload(Appointment.patient).selectinload(Patient.user), selectinload(Appointment.doctor).selectinload(Doctor.user))
        .where(Appointment.id == appointment_id)
    )
    res = await db.execute(stmt)
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    
    if payload.status:
        appt.status = payload.status
    if payload.appointment_date:
        appt.appointment_date = payload.appointment_date
    if payload.clinical_notes is not None:
        appt.clinical_notes = payload.clinical_notes
        
    await db.commit()
    await db.refresh(appt)
    
    return AppointmentOut(
        id=appt.id,
        patient_id=appt.patient_id,
        doctor_id=appt.doctor_id,
        doctor_name=appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Cardiologist",
        patient_name=appt.patient.user.full_name if appt.patient and appt.patient.user else "Patient",
        appointment_date=appt.appointment_date,
        appointment_type=appt.appointment_type,
        status=appt.status,
        reason=appt.reason,
        clinical_notes=appt.clinical_notes,
        created_at=appt.created_at
    )

