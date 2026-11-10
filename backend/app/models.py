from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

# 1. Users
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="patient", nullable=False)  # 'patient', 'doctor', 'admin'
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    patient_profile = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient")
    education_progress = relationship("EducationProgress", back_populates="user", cascade="all, delete-orphan")

# 2. Patients
class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    patient_id_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. "PAT-2026-001"
    date_of_birth = Column(String(50), nullable=True) # YYYY-MM-DD
    age = Column(Integer, nullable=True)
    sex = Column(String(20), nullable=True) # 'Male', 'Female', 'Other', 'Unknown'
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    phone = Column(String(50), nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    emergency_contact_relation = Column(String(100), nullable=True)
    
    # Lifestyle info
    smoking_habit = Column(String(50), default="non-smoker") # 'non-smoker', 'former', 'occasional', 'regular', 'heavy'
    alcohol_consumption = Column(String(50), default="none") # 'none', 'occasional', 'moderate', 'heavy'
    physical_activity_level = Column(String(50), default="moderate") # 'sedentary', 'light', 'moderate', 'vigorous', 'athlete'
    sleep_duration_hours = Column(Float, default=7.0)
    stress_level = Column(String(50), default="moderate") # 'low', 'moderate', 'high', 'severe'
    caffeine_intake = Column(String(50), default="moderate") # 'none', 'low', 'moderate', 'high'
    daily_exercise_habits = Column(String(255), nullable=True)
    
    # Special circumstances
    is_pregnant = Column(Boolean, default=False)
    pregnancy_trimester = Column(Integer, nullable=True) # 1, 2, 3
    recent_illness_or_fever = Column(Boolean, default=False)
    recent_illness_details = Column(String(255), nullable=True)
    blood_pressure_baseline = Column(String(50), nullable=True)
    family_history_cardiac = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="patient_profile")
    medical_history = relationship("MedicalHistory", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("Allergy", back_populates="patient", cascade="all, delete-orphan")
    readings = relationship("HeartRateReading", back_populates="patient", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="patient", cascade="all, delete-orphan")
    recommendations = relationship("HealthRecommendation", back_populates="patient", cascade="all, delete-orphan")
    emergency_alerts = relationship("EmergencyAlert", back_populates="patient", cascade="all, delete-orphan")
    reports = relationship("HealthReport", back_populates="patient", cascade="all, delete-orphan")
    consents = relationship("UserConsent", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="patient", cascade="all, delete-orphan")
    ecg_uploads = relationship("ECGUpload", back_populates="patient", cascade="all, delete-orphan")
    doctor_assignments = relationship("DoctorPatientAssignment", back_populates="patient", cascade="all, delete-orphan")

# 3. Doctors
class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    license_number = Column(String(100), unique=True, nullable=False)
    specialty = Column(String(100), default="Cardiology")
    hospital_affiliation = Column(String(255), nullable=True)
    consultation_phone = Column(String(50), nullable=True)
    qualifications = Column(String(255), default="MD, FACC, MBBS")
    years_of_experience = Column(Integer, default=12)
    bio = Column(Text, nullable=True)
    verified = Column(Boolean, default=True)
    verification_status = Column(String(50), default="approved") # 'pending', 'approved', 'rejected'
    created_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="doctor_profile")
    reviews = relationship("DoctorReview", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    verifications = relationship("DoctorVerification", back_populates="doctor", cascade="all, delete-orphan")
    assigned_patients = relationship("DoctorPatientAssignment", back_populates="doctor", cascade="all, delete-orphan")
    availabilities = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    observations = relationship("ClinicalObservation", back_populates="doctor", cascade="all, delete-orphan")

# 4. Medical_History
class MedicalHistory(Base):
    __tablename__ = "medical_history"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    has_heart_disease = Column(Boolean, default=False)
    high_blood_pressure = Column(Boolean, default=False)
    low_blood_pressure = Column(Boolean, default=False)
    diabetes = Column(Boolean, default=False)
    thyroid_disorder = Column(Boolean, default=False)
    previous_cardiac_event = Column(Boolean, default=False) # e.g. myocardial infarction, stent, bypass
    respiratory_condition = Column(Boolean, default=False) # e.g. asthma, COPD
    other_conditions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    patient = relationship("Patient", back_populates="medical_history")

# 5. Medications
class Medication(Base):
    __tablename__ = "medications"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)
    frequency = Column(String(100), nullable=True)
    affects_heart_rate = Column(Boolean, default=False) # e.g. Beta-blockers (atenolol, metoprolol), CCBs, Digoxin, stimulants
    effect_type = Column(String(50), nullable=True) # 'lowers_hr', 'raises_hr', 'antiarrhythmic'
    start_date = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    patient = relationship("Patient", back_populates="medications")

# 6. Allergies
class Allergy(Base):
    __tablename__ = "allergies"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    allergen = Column(String(255), nullable=False)
    reaction = Column(String(255), nullable=True)
    severity = Column(String(50), default="moderate") # 'mild', 'moderate', 'severe', 'life-threatening'
    
    patient = relationship("Patient", back_populates="allergies")

# 7. Heart_Rate_Readings
class HeartRateReading(Base):
    __tablename__ = "heart_rate_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    bpm = Column(Integer, nullable=False)
    resting_status = Column(String(50), default="resting") # 'resting', 'active', 'post_exercise', 'sleeping'
    measurement_method = Column(String(50), default="manual") # 'manual', 'simulated_wearable', 'sensor'
    device_name = Column(String(100), default="Manual Sphygmomanometer / Pulse")
    measurement_time = Column(DateTime, default=utc_now, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="readings")
    symptoms = relationship("Symptom", back_populates="reading", uselist=False, cascade="all, delete-orphan")
    ai_analysis = relationship("AIAnalysis", back_populates="reading", uselist=False)
    emergency_alerts = relationship("EmergencyAlert", back_populates="reading")

# 8. Symptoms
class Symptom(Base):
    __tablename__ = "symptoms"
    
    id = Column(Integer, primary_key=True, index=True)
    reading_id = Column(Integer, ForeignKey("heart_rate_readings.id"), unique=True, nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    # Red-flag emergency symptoms
    chest_pain = Column(Boolean, default=False)
    severe_shortness_of_breath = Column(Boolean, default=False)
    fainting_or_syncope = Column(Boolean, default=False)
    stroke_signs = Column(Boolean, default=False) # facial drooping, arm weakness, speech difficulty
    
    # Clinical alert symptoms
    dizziness = Column(Boolean, default=False)
    palpitations = Column(Boolean, default=False)
    fatigue = Column(Boolean, default=False)
    nausea = Column(Boolean, default=False)
    confusion = Column(Boolean, default=False)
    cold_sweat = Column(Boolean, default=False)
    swelling_ankles = Column(Boolean, default=False)
    symptom_notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=utc_now)
    
    reading = relationship("HeartRateReading", back_populates="symptoms")

# 9. AI_Analysis
class AIAnalysis(Base):
    __tablename__ = "ai_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    reading_id = Column(Integer, ForeignKey("heart_rate_readings.id"), nullable=True)
    
    observed_bpm = Column(Integer, nullable=False)
    expected_min_bpm = Column(Integer, nullable=False)
    expected_max_bpm = Column(Integer, nullable=False)
    resting_hr_baseline = Column(Float, nullable=True)
    average_hr_7d = Column(Float, nullable=True)
    min_hr_7d = Column(Integer, nullable=True)
    max_hr_7d = Column(Integer, nullable=True)
    
    contextual_interpretation = Column(Text, nullable=False)
    physiological_factors = Column(JSON, nullable=True) # list of contributing factors
    unusual_patterns = Column(JSON, nullable=True) # detected trend abnormalities
    data_limitations = Column(Text, nullable=False)
    clinical_disclaimer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="ai_analyses")
    reading = relationship("HeartRateReading", back_populates="ai_analysis")
    recommendations = relationship("HealthRecommendation", back_populates="analysis", cascade="all, delete-orphan")

# 10. Health_Recommendations
class HealthRecommendation(Base):
    __tablename__ = "health_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analysis.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    category = Column(String(50), nullable=False) # 'general_wellness', 'clinical_advisory', 'urgent_triage'
    recommendation_text = Column(Text, nullable=False)
    priority = Column(Integer, default=1) # 1 (low) to 5 (high)
    is_safe_validated = Column(Boolean, default=True) # strictly checked against medical prescription prohibitions
    created_at = Column(DateTime, default=utc_now)
    
    analysis = relationship("AIAnalysis", back_populates="recommendations")
    patient = relationship("Patient", back_populates="recommendations")

# 11. Emergency_Alerts
class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    reading_id = Column(Integer, ForeignKey("heart_rate_readings.id"), nullable=True)
    
    alert_level = Column(String(20), nullable=False) # 'GREEN', 'YELLOW', 'ORANGE', 'RED'
    alert_title = Column(String(255), nullable=False)
    alert_reason = Column(Text, nullable=False)
    clinical_rationale = Column(Text, nullable=False)
    emergency_actions = Column(JSON, nullable=False) # list of immediate actionable steps
    hotline_number = Column(String(50), default="112")
    dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="emergency_alerts")
    reading = relationship("HeartRateReading", back_populates="emergency_alerts")

# 12. Health_Reports
class HealthReport(Base):
    __tablename__ = "health_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    report_reference_code = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), default="PATIENT HEALTH ANALYSIS REPORT")
    report_data = Column(JSON, nullable=False) # Structured full report JSON
    risk_level = Column(String(20), nullable=False) # 'GREEN', 'YELLOW', 'ORANGE', 'RED'
    summary = Column(Text, nullable=False)
    clinical_limitations = Column(Text, nullable=False)
    pdf_filename = Column(String(255), nullable=True)
    is_clinician_approved = Column(Boolean, default=False)
    
    # ECG signal reference & Doctor submission workflow
    ecg_upload_id = Column(Integer, ForeignKey("ecg_uploads.id"), nullable=True)
    submission_status = Column(String(50), default="draft")  # 'draft', 'analysis_pending', 'analysis_completed', 'submitted', 'awaiting_doctor_review', 'reviewed', 'appointment_scheduled', 'consultation_completed'
    assigned_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    patient_submission_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    
    generated_at = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="reports")
    reviews = relationship("DoctorReview", back_populates="report", cascade="all, delete-orphan")
    assigned_doctor = relationship("Doctor")
    ecg_upload = relationship("ECGUpload", back_populates="reports")

# 13. Doctor_Reviews
class DoctorReview(Base):
    __tablename__ = "doctor_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("health_reports.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    clinician_notes = Column(Text, nullable=False)
    recommended_followup = Column(String(255), nullable=True)
    approved = Column(Boolean, default=False)
    signature_hash = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime, default=utc_now)
    
    report = relationship("HealthReport", back_populates="reviews")
    doctor = relationship("Doctor", back_populates="reviews")

# 14. Audit_Logs
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # e.g. 'LOGIN', 'RECORD_HR', 'RUN_AI_ANALYSIS', 'VIEW_REPORT', 'DOCTOR_SIGN_OFF'
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=utc_now)
    details = Column(JSON, nullable=True)
    
    user = relationship("User", back_populates="audit_logs")

# 15. User_Consent
class UserConsent(Base):
    __tablename__ = "user_consent"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    consent_data_processing = Column(Boolean, default=True, nullable=False)
    consent_ai_analysis = Column(Boolean, default=True, nullable=False)
    consent_clinical_sharing = Column(Boolean, default=True, nullable=False)
    privacy_policy_version = Column(String(50), default="v1.0-clinical-2026")
    ip_address = Column(String(50), default="127.0.0.1")
    consent_timestamp = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="consents")

# 16. Appointments
class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    appointment_type = Column(String(50), default="telehealth")  # 'telehealth', 'in_person', 'urgent_review'
    status = Column(String(50), default="scheduled")  # 'scheduled', 'completed', 'cancelled', 'rescheduled'
    reason = Column(String(255), nullable=False)
    clinical_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

# 17. Messages
class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    subject = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    attachment_name = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")

# 18. Notifications
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(50), nullable=False)  # 'emergency', 'alert', 'appointment', 'message', 'report', 'system'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")  # 'low', 'medium', 'high', 'urgent'
    is_read = Column(Boolean, default=False)
    action_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="notifications")

# 19. Devices
class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    device_name = Column(String(100), nullable=False)
    device_type = Column(String(50), nullable=False)  # 'smartwatch', 'ble_strap', 'ecg_patch', 'blood_pressure'
    serial_number = Column(String(100), nullable=False)
    mac_address = Column(String(50), nullable=True)
    connection_status = Column(String(50), default="disconnected")  # 'connected', 'disconnected', 'pairing', 'error'
    battery_level = Column(Integer, default=100)
    last_sync_time = Column(DateTime, default=utc_now)
    firmware_version = Column(String(50), default="v2.4.1")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="devices")

# 20. Education Modules
class EducationModule(Base):
    __tablename__ = "education_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # 'anatomy', 'ecg', 'arrhythmia', 'lifestyle', 'emergency'
    summary = Column(Text, nullable=False)
    content_markdown = Column(Text, nullable=False)
    difficulty = Column(String(20), default="beginner")  # 'beginner', 'intermediate', 'advanced'
    read_time_minutes = Column(Integer, default=5)
    quiz_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    progress = relationship("EducationProgress", back_populates="module", cascade="all, delete-orphan")

# 21. Education Progress
class EducationProgress(Base):
    __tablename__ = "education_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("education_modules.id"), nullable=False)
    completed = Column(Boolean, default=False)
    quiz_score = Column(Integer, nullable=True)
    completed_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="education_progress")
    module = relationship("EducationModule", back_populates="progress")

# 22. ECG_Uploads
class ECGUpload(Base):
    __tablename__ = "ecg_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_format = Column(String(20), nullable=False) # 'csv', 'txt', 'pdf', 'image', 'wfdb'
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    upload_status = Column(String(50), default="pending") # 'pending', 'processing', 'completed', 'failed'
    error_message = Column(Text, nullable=True)
    
    # Clinical intake metadata captured at upload
    recorded_bp = Column(String(50), nullable=True) # e.g. "124/82"
    recorded_hr = Column(Integer, nullable=True)
    symptoms_reported = Column(JSON, nullable=True) # list of symptoms at time of recording
    family_history = Column(Text, nullable=True)
    patient_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    patient = relationship("Patient", back_populates="ecg_uploads")
    signal_data = relationship("ECGSignalData", back_populates="upload", uselist=False, cascade="all, delete-orphan")
    ai_analysis = relationship("ECGAIAnalysis", back_populates="upload", uselist=False, cascade="all, delete-orphan")
    reports = relationship("HealthReport", back_populates="ecg_upload")
    observations = relationship("ClinicalObservation", back_populates="ecg_upload")

# 23. ECG_Signal_Data
class ECGSignalData(Base):
    __tablename__ = "ecg_signal_data"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("ecg_uploads.id"), unique=True, nullable=False)
    sampling_rate_hz = Column(Float, default=250.0)
    duration_seconds = Column(Float, default=10.0)
    lead_count = Column(Integer, default=1)
    lead_labels = Column(JSON, default=list) # e.g. ["Lead II"]
    raw_samples = Column(JSON, nullable=False) # Normalized downsampled visualization signal [v1, v2, ...]
    filtered_samples = Column(JSON, nullable=True) # Baseline-wander & noise-filtered signal points
    signal_quality_index = Column(Float, default=1.0) # 0.0 to 1.0 SQI
    created_at = Column(DateTime, default=utc_now)
    
    upload = relationship("ECGUpload", back_populates="signal_data")

# 24. ECG_AI_Analysis
class ECGAIAnalysis(Base):
    __tablename__ = "ecg_ai_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("ecg_uploads.id"), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    # DSP Heart Rate & Interval Metrics
    heart_rate_bpm = Column(Integer, nullable=False)
    rr_intervals_ms = Column(JSON, default=list) # list of consecutive RR intervals in ms
    mean_rr_ms = Column(Float, nullable=True)
    sdnn_ms = Column(Float, nullable=True) # HRV standard deviation
    rmssd_ms = Column(Float, nullable=True) # HRV root mean square of successive differences
    qrs_duration_ms = Column(Float, nullable=True) # e.g. 88 ms (normal 80-120ms)
    qt_interval_ms = Column(Float, nullable=True)
    qtc_interval_ms = Column(Float, nullable=True) # Bazett corrected QT
    st_segment_deviation_mv = Column(Float, nullable=True) # in millivolts
    
    # Clinical Signal Quality & QRS Localization
    signal_quality = Column(String(50), default="GOOD") # 'EXCELLENT', 'GOOD', 'NOISY', 'INCONCLUSIVE'
    baseline_wander_corrected = Column(Boolean, default=True)
    r_peak_indices = Column(JSON, default=list) # Indices of detected R-peaks
    
    # AI Classification & Explanations
    primary_classification = Column(String(100), nullable=False) # e.g. 'Normal Sinus Rhythm', 'Sinus Bradycardia', 'Sinus Tachycardia', 'Atrial Fibrillation / Arrhythmia', 'Premature Ventricular Contractions', 'ST Deviation Concern', 'Inconclusive'
    secondary_classifications = Column(JSON, default=list)
    model_confidence_pct = Column(Float, default=95.0)
    explainability_notes = Column(JSON, default=list)
    clinical_risk_tier = Column(String(20), default="GREEN") # 'GREEN', 'YELLOW', 'ORANGE', 'RED'
    model_version = Column(String(100), default="CardioPulse-PanTompkins-ResNet-v1.2")
    status = Column(String(50), default="COMPLETED")
    created_at = Column(DateTime, default=utc_now)
    
    upload = relationship("ECGUpload", back_populates="ai_analysis")
    patient = relationship("Patient")

# 25. Doctor_Verifications
class DoctorVerification(Base):
    __tablename__ = "doctor_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    license_copy_url = Column(String(500), nullable=True)
    medical_council = Column(String(255), default="State Medical Council / MCI")
    graduation_year = Column(Integer, default=2015)
    id_document_number = Column(String(100), nullable=True)
    status = Column(String(50), default="approved") # 'pending', 'approved', 'rejected'
    reviewed_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=utc_now)
    reviewed_at = Column(DateTime, nullable=True)
    
    doctor = relationship("Doctor", back_populates="verifications")

# 26. Doctor_Patient_Assignments
class DoctorPatientAssignment(Base):
    __tablename__ = "doctor_patient_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    status = Column(String(50), default="active") # 'active', 'requested', 'completed'
    assigned_at = Column(DateTime, default=utc_now)
    assigned_by = Column(String(50), default="system") # 'patient_request', 'admin', 'system'
    
    doctor = relationship("Doctor", back_populates="assigned_patients")
    patient = relationship("Patient", back_populates="doctor_assignments")

# 27. Doctor_Availability
class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    day_of_week = Column(String(50), nullable=False) # 'Monday', 'Tuesday', ...
    start_time = Column(String(20), default="09:00")
    end_time = Column(String(20), default="17:00")
    slot_duration_minutes = Column(Integer, default=30)
    is_available = Column(Boolean, default=True)
    
    doctor = relationship("Doctor", back_populates="availabilities")

# 28. Clinical_Observations
class ClinicalObservation(Base):
    __tablename__ = "clinical_observations"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("health_reports.id"), nullable=True)
    ecg_upload_id = Column(Integer, ForeignKey("ecg_uploads.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    observations_text = Column(Text, nullable=False)
    differential_diagnosis = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    prescriptions_updated = Column(Text, nullable=True)
    urgency_level = Column(String(50), default="routine") # 'routine', 'urgent', 'emergency'
    signature_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    doctor = relationship("Doctor", back_populates="observations")
    ecg_upload = relationship("ECGUpload", back_populates="observations")

# 29. AI_Model_Versions
class AIModelVersion(Base):
    __tablename__ = "ai_model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), default="CardioPulse DSP-ResNet")
    version_tag = Column(String(50), unique=True, default="v1.2.0")
    architecture = Column(String(100), default="Pan-Tompkins + 1D-CNN Rhythm Classifier")
    description = Column(Text, default="Lead II clinical QRS morphology and RR-interval variability model trained on PhysioNet/MIT-BIH Arrhythmia benchmarks.")
    accuracy_benchmark = Column(Float, default=98.2)
    sensitivity = Column(Float, default=97.8)
    specificity = Column(Float, default=98.6)
    is_active = Column(Boolean, default=True)
    deployed_at = Column(DateTime, default=utc_now)

