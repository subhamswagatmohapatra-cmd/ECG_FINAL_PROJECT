from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Patient, Doctor, AuditLog, UserConsent, MedicalHistory
from app.schemas import UserCreate, UserLogin, Token, UserOut
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        full_name=user_in.full_name,
        is_active=True
    )
    db.add(new_user)
    await db.flush()

    patient_id = None
    doctor_id = None

    if user_in.role == "patient":
        pid_code = f"PAT-2026-{uuid.uuid4().hex[:6].upper()}"
        patient = Patient(
            user_id=new_user.id,
            patient_id_code=pid_code
        )
        db.add(patient)
        await db.flush()
        patient_id = patient.id
        
        # Initialize default empty medical history
        db.add(MedicalHistory(patient_id=patient.id))
        # Initialize default user consent record
        db.add(UserConsent(
            patient_id=patient.id,
            consent_data_processing=True,
            consent_ai_analysis=True,
            consent_clinical_sharing=True
        ))
    elif user_in.role == "doctor":
        lic = f"MD-CARDIO-{uuid.uuid4().hex[:5].upper()}"
        doc = Doctor(
            user_id=new_user.id,
            license_number=lic,
            specialty="Cardiology",
            verified=True
        )
        db.add(doc)
        await db.flush()
        doctor_id = doc.id

    # Audit log
    db.add(AuditLog(
        user_id=new_user.id,
        action="USER_REGISTRATION",
        resource_type="USER",
        resource_id=str(new_user.id),
        details={"role": user_in.role, "email": user_in.email}
    ))

    await db.commit()

    access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})
    return Token(
        access_token=access_token,
        user_id=new_user.id,
        email=new_user.email,
        role=new_user.role,
        full_name=new_user.full_name,
        patient_id=patient_id,
        doctor_id=doctor_id
    )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    patient_id = None
    doctor_id = None
    if user.role == "patient":
        p_res = await db.execute(select(Patient).where(Patient.user_id == user.id))
        p = p_res.scalars().first()
        if p:
            patient_id = p.id
    elif user.role == "doctor":
        d_res = await db.execute(select(Doctor).where(Doctor.user_id == user.id))
        d = d_res.scalars().first()
        if d:
            doctor_id = d.id

    # Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        resource_type="AUTH",
        resource_id=str(user.id),
        details={"email": user.email, "role": user.role}
    ))
    await db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return Token(
        access_token=token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        patient_id=patient_id,
        doctor_id=doctor_id
    )

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
