from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth Schemas
class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: str
    role: str = "patient" # 'patient', 'doctor', 'admin'

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    role: str
    full_name: str
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Medical History Schemas
class MedicalHistoryBase(BaseModel):
    has_heart_disease: bool = False
    high_blood_pressure: bool = False
    low_blood_pressure: bool = False
    diabetes: bool = False
    thyroid_disorder: bool = False
    previous_cardiac_event: bool = False
    respiratory_condition: bool = False
    other_conditions: Optional[str] = None
    notes: Optional[str] = None

class MedicalHistoryOut(MedicalHistoryBase):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Medication Schemas
class MedicationBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    affects_heart_rate: bool = False
    effect_type: Optional[str] = None # 'lowers_hr', 'raises_hr', 'antiarrhythmic'
    start_date: Optional[str] = None
    notes: Optional[str] = None

class MedicationCreate(MedicationBase):
    pass

class MedicationOut(MedicationBase):
    id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

# Allergy Schemas
class AllergyBase(BaseModel):
    allergen: str
    reaction: Optional[str] = None
    severity: str = "moderate"

class AllergyOut(AllergyBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Patient Schemas
class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    smoking_habit: Optional[str] = "non-smoker"
    alcohol_consumption: Optional[str] = "none"
    physical_activity_level: Optional[str] = "moderate"
    sleep_duration_hours: Optional[float] = 7.0
    stress_level: Optional[str] = "moderate"
    caffeine_intake: Optional[str] = "moderate"
    daily_exercise_habits: Optional[str] = None
    is_pregnant: Optional[bool] = False
    pregnancy_trimester: Optional[int] = None
    recent_illness_or_fever: Optional[bool] = False
    recent_illness_details: Optional[str] = None

class PatientOut(BaseModel):
    id: int
    user_id: int
    patient_id_code: str
    full_name: str
    email: str
    age: Optional[int]
    sex: Optional[str]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    phone: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    emergency_contact_relation: Optional[str]
    smoking_habit: str
    alcohol_consumption: str
    physical_activity_level: str
    sleep_duration_hours: float
    stress_level: str
    caffeine_intake: str
    is_pregnant: bool
    pregnancy_trimester: Optional[int]
    recent_illness_or_fever: bool
    recent_illness_details: Optional[str]
    medical_history: Optional[MedicalHistoryOut] = None
    medications: List[MedicationOut] = []
    allergies: List[AllergyOut] = []
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Symptom Schemas
class SymptomInput(BaseModel):
    chest_pain: bool = False
    severe_shortness_of_breath: bool = False
    fainting_or_syncope: bool = False
    stroke_signs: bool = False
    dizziness: bool = False
    palpitations: bool = False
    fatigue: bool = False
    nausea: bool = False
    confusion: bool = False
    cold_sweat: bool = False
    swelling_ankles: bool = False
    symptom_notes: Optional[str] = None

class SymptomOut(SymptomInput):
    id: int
    recorded_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Heart Rate Reading Schemas
class HeartRateCreate(BaseModel):
    bpm: int = Field(..., ge=20, le=300)
    resting_status: str = "resting" # 'resting', 'active', 'post_exercise', 'sleeping'
    measurement_method: str = "manual" # 'manual', 'simulated_wearable', 'sensor'
    device_name: Optional[str] = "Manual Sphygmomanometer / Pulse"
    notes: Optional[str] = None
    symptoms: Optional[SymptomInput] = None
    measurement_time: Optional[datetime] = None

class HeartRateOut(BaseModel):
    id: int
    patient_id: int
    bpm: int
    resting_status: str
    measurement_method: str
    device_name: str
    measurement_time: datetime
    notes: Optional[str]
    symptoms: Optional[SymptomOut] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# AI Analysis & Safety Schemas
class EmergencyAlertOut(BaseModel):
    id: Optional[int] = None
    alert_level: str # 'GREEN', 'YELLOW', 'ORANGE', 'RED'
    alert_title: str
    alert_reason: str
    clinical_rationale: str
    emergency_actions: List[str]
    hotline_number: str = "112"
    dismissed: bool = False
    created_at: Optional[datetime] = None

class HealthRecommendationOut(BaseModel):
    category: str # 'general_wellness', 'clinical_advisory', 'urgent_triage'
    recommendation_text: str
    priority: int

class AIAnalysisOut(BaseModel):
    id: Optional[int] = None
    observed_bpm: int
    expected_min_bpm: int
    expected_max_bpm: int
    resting_hr_baseline: Optional[float]
    average_hr_7d: Optional[float]
    min_hr_7d: Optional[int]
    max_hr_7d: Optional[int]
    contextual_interpretation: str
    physiological_factors: List[str]
    unusual_patterns: List[str]
    data_limitations: str
    clinical_disclaimer: str
    alert: EmergencyAlertOut
    recommendations: List[HealthRecommendationOut]
    created_at: Optional[datetime] = None

# Report Schemas
class HealthReportOut(BaseModel):
    id: int
    patient_id: int
    report_reference_code: str
    title: str
    risk_level: str
    summary: str
    clinical_limitations: str
    report_data: Dict[str, Any]
    is_clinician_approved: bool
    generated_at: datetime
    pdf_filename: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Doctor Review Schemas
class DoctorReviewCreate(BaseModel):
    report_id: int
    clinician_notes: str
    recommended_followup: Optional[str] = None
    approved: bool = True

class DoctorReviewOut(BaseModel):
    id: int
    report_id: int
    doctor_name: str
    doctor_specialty: str
    clinician_notes: str
    recommended_followup: Optional[str]
    approved: bool
    reviewed_at: datetime

# Chat Schemas
class ChatMessage(BaseModel):
    role: str # 'user' | 'assistant' | 'system'
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    is_emergency: bool = False
    emergency_guidance: Optional[EmergencyAlertOut] = None
    clinical_disclaimer: str

# Consent Schemas
class UserConsentUpdate(BaseModel):
    consent_data_processing: bool
    consent_ai_analysis: bool
    consent_clinical_sharing: bool

# Appointment Schemas
class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime
    appointment_type: str = "telehealth"
    reason: str
    clinical_notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    status: Optional[str] = None
    clinical_notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    appointment_date: datetime
    appointment_type: str
    status: str
    reason: str
    clinical_notes: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Messaging Schemas
class MessageCreate(BaseModel):
    recipient_id: int
    patient_id: Optional[int] = None
    subject: Optional[str] = None
    content: str
    attachment_name: Optional[str] = None

class MessageOut(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    patient_id: Optional[int] = None
    subject: Optional[str] = None
    content: str
    attachment_name: Optional[str] = None
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Notification Schemas
class NotificationCreate(BaseModel):
    user_id: int
    category: str
    title: str
    message: str
    priority: str = "medium"
    action_url: Optional[str] = None

class NotificationOut(BaseModel):
    id: int
    user_id: int
    category: str
    title: str
    message: str
    priority: str
    is_read: bool
    action_url: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Device Schemas
class DeviceRegister(BaseModel):
    device_name: str
    device_type: str
    serial_number: str
    mac_address: Optional[str] = None
    firmware_version: Optional[str] = "v2.4.1"

class DeviceOut(BaseModel):
    id: int
    patient_id: int
    device_name: str
    device_type: str
    serial_number: str
    mac_address: Optional[str] = None
    connection_status: str
    battery_level: int
    last_sync_time: datetime
    firmware_version: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Education Schemas
class EducationModuleOut(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    summary: str
    content_markdown: str
    difficulty: str
    read_time_minutes: int
    quiz_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    is_completed: Optional[bool] = False
    quiz_score: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class QuizSubmission(BaseModel):
    answers: Dict[str, str] # question_index: selected_option

class QuizResultOut(BaseModel):
    module_id: int
    score: int
    total_questions: int
    percentage: float
    passed: bool
    feedback: str

# Admin Schemas
class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None

class AdminStatsOut(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    verified_doctors: int
    total_readings: int
    total_analyses: int
    total_reports: int
    total_emergency_alerts: int
    alert_distribution: Dict[str, int]
    system_status: str
    api_version: str
    database_connected: bool
    uptime_seconds: float

