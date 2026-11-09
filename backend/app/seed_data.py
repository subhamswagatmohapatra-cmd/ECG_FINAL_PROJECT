"""
CardioPulse Initial Database Seeder
Seeds sample clinical test cases, demo accounts, and multi-day vitals.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import (
    User, Patient, Doctor, MedicalHistory, Medication, Allergy,
    HeartRateReading, Symptom, AIAnalysis, HealthRecommendation,
    EmergencyAlert, HealthReport, UserConsent, AuditLog,
    Appointment, Message, Notification, Device, EducationModule, EducationProgress
)
from app.auth import get_password_hash
from app.clinical_engine import ClinicalRuleEngine
from app.ai_advisor import AIAdvisorEngine
from app.report_generator import HealthReportGenerator
import os

def utc_now():
    return datetime.now(timezone.utc)

async def seed_database(db: AsyncSession):
    # Check if already seeded
    existing = await db.execute(select(User).where(User.email == "doctor@cardiopulse.health"))
    if existing.scalars().first():
        return

    print("Seeding CardioPulse clinical demonstration database...")

    # 1. Clinician Account
    doc_user = User(
        email="doctor@cardiopulse.health",
        hashed_password=get_password_hash("DoctorPass123!"),
        role="doctor",
        full_name="Dr. Sarah Chen, MD, FACC",
        is_active=True
    )
    db.add(doc_user)
    await db.flush()

    doctor = Doctor(
        user_id=doc_user.id,
        license_number="MD-CARDIO-88921",
        specialty="Interventional & Preventive Cardiology",
        hospital_affiliation="Metropolitan Heart & Vascular Institute",
        consultation_phone="+1 (555) 234-5678",
        verified=True
    )
    db.add(doctor)

    # 2. Admin Account
    admin_user = User(
        email="admin@cardiopulse.health",
        hashed_password=get_password_hash("AdminPass123!"),
        role="admin",
        full_name="CardioPulse System Administrator",
        is_active=True
    )
    db.add(admin_user)
    await db.flush()

    # 3. Main Patient Account: Johnathan Miller (Age 46)
    p1_user = User(
        email="patient@cardiopulse.health",
        hashed_password=get_password_hash("PatientPass123!"),
        role="patient",
        full_name="Johnathan Miller",
        is_active=True
    )
    db.add(p1_user)
    await db.flush()

    p1 = Patient(
        user_id=p1_user.id,
        patient_id_code="PAT-2026-001",
        date_of_birth="1980-05-14",
        age=46,
        sex="Male",
        height_cm=178.0,
        weight_kg=82.5,
        phone="+1 (555) 019-2834",
        emergency_contact_name="Emily Miller",
        emergency_contact_phone="+1 (555) 019-2835",
        emergency_contact_relation="Spouse",
        smoking_habit="former",
        alcohol_consumption="occasional",
        physical_activity_level="moderate",
        sleep_duration_hours=7.2,
        stress_level="moderate",
        caffeine_intake="moderate",
        daily_exercise_habits="Brisk walking 30 mins, light cycling 3x weekly",
        is_pregnant=False,
        recent_illness_or_fever=False
    )
    db.add(p1)
    await db.flush()

    # Medical History for P1
    db.add(MedicalHistory(
        patient_id=p1.id,
        has_heart_disease=False,
        high_blood_pressure=True,
        low_blood_pressure=False,
        diabetes=False,
        thyroid_disorder=False,
        previous_cardiac_event=False,
        respiratory_condition=False,
        other_conditions="Mild dyslipidemia (managed with diet)",
        notes="Borderline hypertension diagnosed 2024. Controlled."
    ))

    # Medications for P1
    db.add(Medication(
        patient_id=p1.id,
        name="Lisinopril",
        dosage="10mg",
        frequency="Once daily morning",
        affects_heart_rate=False,
        effect_type="ace_inhibitor"
    ))
    db.add(Medication(
        patient_id=p1.id,
        name="Omega-3 Fish Oil",
        dosage="1000mg",
        frequency="Daily",
        affects_heart_rate=False
    ))

    # Allergies for P1
    db.add(Allergy(
        patient_id=p1.id,
        allergen="Penicillin",
        reaction="Urticaria / Skin rash",
        severity="moderate"
    ))

    # Consent for P1
    db.add(UserConsent(
        patient_id=p1.id,
        consent_data_processing=True,
        consent_ai_analysis=True,
        consent_clinical_sharing=True,
        privacy_policy_version="v1.0-clinical-2026",
        ip_address="127.0.0.1"
    ))

    # Historical Heart Rate Readings for P1 over the last 14 days
    base_time = utc_now() - timedelta(days=14)
    # Simulated realistic daily pulse patterns (resting 68-76, exercise 125-142)
    sample_records = [
        (14, 72, "resting", "manual", "Sphygmomanometer", None),
        (13, 132, "active", "simulated_wearable", "Apple Watch Series 9", None),
        (13, 70, "resting", "manual", "Sphygmomanometer", None),
        (12, 68, "resting", "simulated_wearable", "Apple Watch Series 9", None),
        (11, 74, "resting", "manual", "Pulse Oximeter", None),
        (10, 138, "active", "simulated_wearable", "Apple Watch Series 9", None),
        (9, 69, "resting", "manual", "Pulse Oximeter", None),
        (8, 71, "resting", "simulated_wearable", "Apple Watch Series 9", None),
        (7, 73, "resting", "manual", "Sphygmomanometer", None),
        (6, 128, "active", "simulated_wearable", "Apple Watch Series 9", None),
        (5, 75, "resting", "manual", "Pulse Oximeter", None),
        (4, 72, "resting", "simulated_wearable", "Apple Watch Series 9", None),
        (3, 135, "active", "simulated_wearable", "Apple Watch Series 9", None),
        (2, 69, "resting", "manual", "Sphygmomanometer", None),
        (1, 71, "resting", "simulated_wearable", "Apple Watch Series 9", None),
        (0, 74, "resting", "manual", "Sphygmomanometer", None) # Current latest
    ]

    last_reading_obj = None
    for days_ago, bpm, status, method, dev, symp_dict in sample_records:
        r_time = base_time + timedelta(days=14 - days_ago, hours=8)
        reading = HeartRateReading(
            patient_id=p1.id,
            bpm=bpm,
            resting_status=status,
            measurement_method=method,
            device_name=dev,
            measurement_time=r_time,
            notes="Routine morning vitals check" if status == "resting" else "Post morning brisk walk"
        )
        db.add(reading)
        await db.flush()
        last_reading_obj = reading

    # Run initial analysis for P1's latest reading
    triage = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=74,
        age=46,
        resting_status="resting",
        symptoms={},
        medical_history={"has_heart_disease": False, "high_blood_pressure": True},
        medications=[{"name": "Lisinopril", "affects_heart_rate": False}],
        is_pregnant=False,
        recent_illness=False,
        is_athlete=False,
        hotline="112"
    )

    ai_result = await AIAdvisorEngine.generate_analysis_and_recommendations(
        patient_info={
            "age": 46, "sex": "Male", "physical_activity_level": "moderate",
            "sleep_duration_hours": 7.2, "stress_level": "moderate", "caffeine_intake": "moderate",
            "is_pregnant": False, "recent_illness_or_fever": False,
            "medical_history": {"high_blood_pressure": True},
            "medications": [{"name": "Lisinopril"}]
        },
        reading_info={"bpm": 74, "resting_status": "resting", "symptoms": {}},
        triage_result=triage,
        historical_metrics={"avg_hr": 71.8, "min_hr": 68, "max_hr": 138}
    )

    ai_db = AIAnalysis(
        patient_id=p1.id,
        reading_id=last_reading_obj.id,
        observed_bpm=74,
        expected_min_bpm=triage["expected_min_bpm"],
        expected_max_bpm=triage["expected_max_bpm"],
        resting_hr_baseline=71.8,
        average_hr_7d=71.8,
        min_hr_7d=68,
        max_hr_7d=75,
        contextual_interpretation=ai_result["contextual_interpretation"],
        physiological_factors=ai_result.get("physiological_factors", []),
        unusual_patterns=ai_result.get("unusual_patterns", []),
        data_limitations=ai_result["data_limitations"],
        clinical_disclaimer=ai_result["clinical_disclaimer"]
    )
    db.add(ai_db)
    await db.flush()

    for rec in ai_result.get("recommendations", []):
        db.add(HealthRecommendation(
            analysis_id=ai_db.id,
            patient_id=p1.id,
            category=rec.get("category", "general_wellness"),
            recommendation_text=rec.get("recommendation_text", ""),
            priority=rec.get("priority", 1)
        ))

    db.add(EmergencyAlert(
        patient_id=p1.id,
        reading_id=last_reading_obj.id,
        alert_level=triage["alert_level"],
        alert_title=triage["alert_title"],
        alert_reason=triage["alert_reason"],
        clinical_rationale=triage["clinical_rationale"],
        emergency_actions=triage["emergency_actions"],
        hotline_number="112"
    ))

    # Generate initial sample PDF report for P1
    report_payload = HealthReportGenerator.generate_report_payload(
        patient_data={
            "patient_id_code": p1.patient_id_code, "full_name": p1_user.full_name,
            "age": p1.age, "sex": p1.sex, "height_cm": p1.height_cm, "weight_kg": p1.weight_kg,
            "emergency_contact_name": p1.emergency_contact_name, "emergency_contact_phone": p1.emergency_contact_phone,
            "medical_history": {"Hypertension": "Controlled on Lisinopril"},
            "medications": [{"name": "Lisinopril 10mg"}], "allergies": [{"allergen": "Penicillin"}]
        },
        reading_data={
            "bpm": 74, "resting_status": "resting", "measurement_method": "Sphygmomanometer",
            "device_name": "Omron Complete", "measurement_time": utc_now().strftime("%Y-%m-%d %H:%M UTC"),
            "symptoms": {"Asymptomatic": True}
        },
        triage_data=triage,
        ai_data=ai_result,
        historical_stats={"avg_hr": 71.8, "min_hr": 68, "max_hr": 75},
        reference_code="REP-2026-001-A"
    )

    pdf_dir = "static/reports"
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_file = f"{pdf_dir}/REP-2026-001-A.pdf"
    HealthReportGenerator.generate_pdf(report_payload, pdf_file)

    db.add(HealthReport(
        patient_id=p1.id,
        report_reference_code="REP-2026-001-A",
        title="PATIENT HEALTH ANALYSIS REPORT - BASELINE",
        report_data=report_payload,
        risk_level=triage["alert_level"],
        summary=ai_result["contextual_interpretation"][:250] + "...",
        clinical_limitations=ai_result["data_limitations"],
        pdf_filename="REP-2026-001-A.pdf",
        is_clinician_approved=False
    ))

    # =========================================================================
    # Additional Clinical Test Case Patients
    # =========================================================================

    # Case 2: Conditioned Athlete (Bradycardia 48 BPM normal for athlete)
    u_ath = User(email="athlete@cardiopulse.health", hashed_password=get_password_hash("PatientPass123!"), role="patient", full_name="Marcus Vance (Athlete)", is_active=True)
    db.add(u_ath)
    await db.flush()
    p_ath = Patient(user_id=u_ath.id, patient_id_code="PAT-2026-ATH", age=28, sex="Male", physical_activity_level="athlete", daily_exercise_habits="Distance running 70km/week")
    db.add(p_ath)
    await db.flush()
    db.add(HeartRateReading(patient_id=p_ath.id, bpm=48, resting_status="resting", measurement_method="simulated_wearable", device_name="Garmin Forerunner 965"))
    db.add(UserConsent(patient_id=p_ath.id, consent_data_processing=True, consent_ai_analysis=True, consent_clinical_sharing=True))

    # Case 3: Pediatric Patient (Age 8, Resting HR 94 BPM normal for child)
    u_ped = User(email="pediatric@cardiopulse.health", hashed_password=get_password_hash("PatientPass123!"), role="patient", full_name="Leo Sharma (Pediatric)", is_active=True)
    db.add(u_ped)
    await db.flush()
    p_ped = Patient(user_id=u_ped.id, patient_id_code="PAT-2026-PED", age=8, sex="Male", physical_activity_level="moderate")
    db.add(p_ped)
    await db.flush()
    db.add(HeartRateReading(patient_id=p_ped.id, bpm=94, resting_status="resting", measurement_method="manual", device_name="Pediatric Pulse Oximeter"))
    db.add(UserConsent(patient_id=p_ped.id, consent_data_processing=True, consent_ai_analysis=True, consent_clinical_sharing=True))

    # Case 4: Pregnant Patient (Age 31, 28 wks, Resting HR 92 BPM physiological elevation)
    u_preg = User(email="pregnant@cardiopulse.health", hashed_password=get_password_hash("PatientPass123!"), role="patient", full_name="Elena Rostova (Pregnancy 28w)", is_active=True)
    db.add(u_preg)
    await db.flush()
    p_preg = Patient(user_id=u_preg.id, patient_id_code="PAT-2026-PREG", age=31, sex="Female", is_pregnant=True, pregnancy_trimester=3)
    db.add(p_preg)
    await db.flush()
    db.add(HeartRateReading(patient_id=p_preg.id, bpm=92, resting_status="resting", measurement_method="manual", device_name="Clinic Monitor"))
    db.add(UserConsent(patient_id=p_preg.id, consent_data_processing=True, consent_ai_analysis=True, consent_clinical_sharing=True))

    # Case 5: Older Adult with Cardiac History on Beta-Blocker (Age 71, Resting HR 54 BPM therapeutic)
    u_card = User(email="cardiac@cardiopulse.health", hashed_password=get_password_hash("PatientPass123!"), role="patient", full_name="Arthur Pendelton (Prior MI / Beta-Blocker)", is_active=True)
    db.add(u_card)
    await db.flush()
    p_card = Patient(user_id=u_card.id, patient_id_code="PAT-2026-CARD", age=71, sex="Male")
    db.add(p_card)
    await db.flush()
    db.add(MedicalHistory(patient_id=p_card.id, has_heart_disease=True, previous_cardiac_event=True, high_blood_pressure=True, notes="Stent placed LAD 2021."))
    db.add(Medication(patient_id=p_card.id, name="Metoprolol Tartrate", dosage="50mg", frequency="Twice daily", affects_heart_rate=True, effect_type="lowers_hr"))
    db.add(HeartRateReading(patient_id=p_card.id, bpm=54, resting_status="resting", measurement_method="manual", device_name="Omron Series 7"))
    db.add(UserConsent(patient_id=p_card.id, consent_data_processing=True, consent_ai_analysis=True, consent_clinical_sharing=True))

    # Case 6: ACUTE CHEST PAIN EMERGENCY SCENARIO (BPM is normal 78, BUT chest pain -> RED ALERT!)
    u_cp = User(email="chestpain@cardiopulse.health", hashed_password=get_password_hash("PatientPass123!"), role="patient", full_name="David Kumar (Chest Pain Emergency Demo)", is_active=True)
    db.add(u_cp)
    await db.flush()
    p_cp = Patient(user_id=u_cp.id, patient_id_code="PAT-2026-EMERG-CP", age=54, sex="Male")
    db.add(p_cp)
    await db.flush()
    r_cp = HeartRateReading(patient_id=p_cp.id, bpm=78, resting_status="resting", measurement_method="manual", notes="Patient felt sudden substernal chest heaviness")
    db.add(r_cp)
    await db.flush()
    db.add(Symptom(reading_id=r_cp.id, patient_id=p_cp.id, chest_pain=True, dizziness=True, severe_shortness_of_breath=True))
    db.add(EmergencyAlert(
        patient_id=p_cp.id,
        reading_id=r_cp.id,
        alert_level="RED",
        alert_title="EMERGENCY: Immediate Medical Evaluation Required for Chest Pain",
        alert_reason="Acute chest discomfort reported. Regardless of heart rate (78 BPM), acute chest pain indicates possible myocardial ischemia.",
        clinical_rationale="ACC/AHA acute coronary syndrome guidelines mandate emergency EMS dispatch for active chest pain.",
        emergency_actions=["Call emergency services (112) immediately.", "Do NOT drive yourself.", "Sit down and loosen tight clothing."],
        hotline_number="112"
    ))
    db.add(UserConsent(patient_id=p_cp.id, consent_data_processing=True, consent_ai_analysis=True, consent_clinical_sharing=True))

    # Case 7: Severe Resting Tachycardia (BPM 152 at rest -> RED ALERT)
    u_tach = User(email="tachy@cardiopulse.health", hashed_password=get_password_hash("PatientPass123!"), role="patient", full_name="Priya Patel (Severe Tachycardia Demo)", is_active=True)
    db.add(u_tach)
    await db.flush()
    p_tach = Patient(user_id=u_tach.id, patient_id_code="PAT-2026-EMERG-TACH", age=34, sex="Female")
    db.add(p_tach)
    await db.flush()
    r_tach = HeartRateReading(patient_id=p_tach.id, bpm=152, resting_status="resting", measurement_method="manual", notes="Sudden racing pulse at rest")
    db.add(r_tach)
    await db.flush()
    db.add(Symptom(reading_id=r_tach.id, patient_id=p_tach.id, palpitations=True, dizziness=True))
    db.add(EmergencyAlert(
        patient_id=p_tach.id,
        reading_id=r_tach.id,
        alert_level="RED",
        alert_title="EMERGENCY: Severe Resting Tachycardia",
        alert_reason="Resting heart rate of 152 BPM exceeds safe hemodynamic thresholds.",
        clinical_rationale="Resting heart rates >= 150 BPM may represent SVT or Atrial Fibrillation with Rapid Ventricular Response.",
        emergency_actions=["Call emergency services (112) immediately.", "Rest quietly seated.", "Do not exert."],
        hotline_number="112"
    ))
    db.add(UserConsent(patient_id=p_tach.id, consent_data_processing=True, consent_ai_analysis=True, consent_clinical_sharing=True))

    # --- SEED APPOINTMENTS ---
    tomorrow = utc_now() + timedelta(days=1)
    next_week = utc_now() + timedelta(days=5)
    
    appt1 = Appointment(
        patient_id=patient.id, # Johnathan Miller
        doctor_id=doctor.id,   # Dr. Sarah Chen
        appointment_date=tomorrow.replace(hour=10, minute=0, second=0),
        appointment_type="telehealth",
        status="scheduled",
        reason="Routine 3-month hypertension & Lisinopril medication follow-up",
        clinical_notes="Review longitudinal 7-day resting telemetry and blood pressure logs."
    )
    appt2 = Appointment(
        patient_id=p_ath.id,   # Marcus Vance
        doctor_id=doctor.id,
        appointment_date=next_week.replace(hour=14, minute=30, second=0),
        appointment_type="in_person",
        status="scheduled",
        reason="Pre-marathon cardiovascular stress & Holter clearance",
        clinical_notes="Examine sinus bradycardia (48 BPM) and verify high stroke volume compensation."
    )
    appt3 = Appointment(
        patient_id=p_cp.id,    # David Kumar
        doctor_id=doctor.id,
        appointment_date=utc_now() + timedelta(hours=3),
        appointment_type="urgent_review",
        status="urgent_review",
        reason="Post-emergency acute chest discomfort evaluation",
        clinical_notes="Patient experienced sudden chest pain with cold sweat. Triage status RED."
    )
    db.add_all([appt1, appt2, appt3])

    # --- SEED MESSAGES ---
    msg1 = Message(
        sender_id=doc_user.id,
        recipient_id=user.id,
        patient_id=patient.id,
        subject="Cardiology Telemetry Review & Follow-up",
        content="Hello Johnathan, I reviewed your latest 7-day resting trend (average 74 BPM). Your blood pressure and pulse remain well-controlled on Lisinopril. Please continue logging morning seated readings before taking your medication.",
        is_read=True
    )
    msg2 = Message(
        sender_id=user.id,
        recipient_id=doc_user.id,
        patient_id=patient.id,
        subject="Re: Cardiology Telemetry Review & Follow-up",
        content="Thank you Dr. Chen! I felt a brief flutter on Thursday morning after coffee, but resting pulse was 72. I will discuss this during our telehealth appointment tomorrow.",
        is_read=False
    )
    db.add_all([msg1, msg2])

    # --- SEED NOTIFICATIONS ---
    notifs = [
        Notification(
            user_id=user.id,
            category="appointment",
            title="Consultation Tomorrow at 10:00 AM",
            message="Your scheduled telehealth consultation with Dr. Sarah Chen, MD is confirmed for tomorrow at 10:00 AM.",
            priority="medium"
        ),
        Notification(
            user_id=user.id,
            category="message",
            title="New Clinical Message from Dr. Sarah Chen",
            message="Dr. Sarah Chen replied regarding your 7-day resting trend review.",
            priority="medium"
        ),
        Notification(
            user_id=user.id,
            category="report",
            title="Clinical Health Analysis Compiled",
            message="Formal clinical health dossier CPR-2026-JM01 is ready for viewing and PDF download.",
            priority="low"
        ),
        Notification(
            user_id=doc_user.id,
            category="emergency",
            title="🚨 EMERGENCY ALERT: Acute Chest Pain (David Kumar)",
            message="David Kumar logged acute chest discomfort with dizziness. Deterministic triage RED dispatched immediate 112/911 guidance.",
            priority="urgent"
        ),
        Notification(
            user_id=doc_user.id,
            category="appointment",
            title="Consultation Scheduled: Johnathan Miller",
            message="Johnathan Miller scheduled a routine follow-up consult for tomorrow at 10:00 AM.",
            priority="medium"
        )
    ]
    db.add_all(notifs)

    # --- SEED DEVICES ---
    devs = [
        Device(
            patient_id=patient.id,
            device_name="Apple Watch Ultra 2",
            device_type="smartwatch",
            serial_number="APPL-W992-01",
            mac_address="F0:18:98:4B:22:91",
            connection_status="connected",
            battery_level=88,
            firmware_version="watchOS 10.4.1"
        ),
        Device(
            patient_id=patient.id,
            device_name="OMRON Evolv Wireless Upper Arm BP Monitor",
            device_type="blood_pressure",
            serial_number="OMR-EV-8841",
            mac_address="AC:23:3F:8A:10:44",
            connection_status="connected",
            battery_level=94,
            firmware_version="v3.1.0"
        ),
        Device(
            patient_id=p_ath.id,
            device_name="Garmin Forerunner 965",
            device_type="smartwatch",
            serial_number="GAR-965-0012",
            mac_address="00:1A:7D:DA:71:02",
            connection_status="connected",
            battery_level=92,
            firmware_version="v18.23"
        ),
        Device(
            patient_id=p_ath.id,
            device_name="Polar H10 ECG Chest Strap",
            device_type="ble_strap",
            serial_number="POL-H10-8821",
            mac_address="A4:C1:38:11:09:55",
            connection_status="connected",
            battery_level=75,
            firmware_version="v5.0.0"
        )
    ]
    db.add_all(devs)

    # --- SEED CARDIOVASCULAR EDUCATION MODULES ---
    edu_modules = [
        EducationModule(
            slug="cardiac-anatomy-mechanics",
            title="Anatomy & Mechanical Hemodynamics of the Myocardium",
            category="anatomy",
            summary="Explore the four chambers, heart valves, and coronary perfusion that drive systemic oxygen delivery.",
            difficulty="beginner",
            read_time_minutes=6,
            content_markdown="""# Cardiac Anatomy & Mechanical Hemodynamics

The human heart is a sophisticated biological muscular pump that beats approximately 100,000 times daily, circulating roughly 7,500 liters of blood through thousands of kilometers of blood vessels.

### The Four Chambers
- **Right Atrium (RA):** Collects deoxygenated venous blood returned from the systemic circulation via the Superior and Inferior Vena Cava.
- **Right Ventricle (RV):** Contracts under low pressure (~25 mmHg) to eject blood into the pulmonary trunk for oxygenation in the alveolar capillary bed.
- **Left Atrium (LA):** Receives oxygen-rich blood from the pulmonary veins.
- **Left Ventricle (LV):** The thickest, most muscular chamber. It generates systolic pressure (~120 mmHg) to pump oxygenated blood into the aorta and across the entire body.

### Valvular Mechanisms & Heart Sounds
1. **Atrioventricular (AV) Valves:** Tricuspid (right) and Mitral (left) valves prevent retrograde flow into the atria during ventricular systole. Their closure produces the **S1 ('Lub')** sound.
2. **Semilunar Valves:** Aortic and Pulmonary valves prevent regurgitation into the ventricles during diastole. Their closure produces the **S2 ('Dub')** sound.

### Coronary Arterial Perfusion
Unlike most systemic organs that receive perfusion during systole, **the myocardium receives its coronary arterial perfusion primarily during diastole**. When the heart muscle relaxes, aortic diastolic recoil pushes blood into the Left Main (LAD and Circumflex) and Right Coronary Arteries (RCA).""",
            quiz_data={
                "questions": [
                    {
                        "question": "During which phase of the cardiac cycle does the myocardium receive the majority of its coronary arterial perfusion?",
                        "options": ["Ventricular Systole", "Ventricular Diastole", "Atrial Depolarization", "Isovolumetric Contraction"],
                        "correct_option": "Ventricular Diastole",
                        "explanation": "Coronary vessels are compressed during systolic ventricular contraction. Blood flows through the coronary arteries predominantly during diastole when the myocardium relaxes."
                    },
                    {
                        "question": "The first heart sound (S1, 'Lub') is produced by the closure of which valves?",
                        "options": ["Aortic and Pulmonary Semilunar valves", "Mitral and Tricuspid Atrioventricular valves", "Eustachian valve", "Vena Cava sphincters"],
                        "correct_option": "Mitral and Tricuspid Atrioventricular valves",
                        "explanation": "S1 marks the onset of ventricular systole as the mitral and tricuspid valves snap shut to prevent backflow."
                    }
                ]
            }
        ),
        EducationModule(
            slug="ecg-waveform-vectors",
            title="Understanding the Lead II ECG: P-QRS-T Electrophysiology",
            category="ecg",
            summary="A comprehensive clinician guide to cardiac vector depolarization and standard 25 mm/s surface tracings.",
            difficulty="intermediate",
            read_time_minutes=8,
            content_markdown="""# Lead II Electrocardiography & Physiological Vectors

An Electrocardiogram (ECG) measures the sum of electrical dipole vectors generated by millions of myocardial cells during depolarization and repolarization.

### Lead II Orientation
Lead II records the electrical potential between the **Right Arm (-) and Left Leg (+)**. Because the anatomical vector of normal ventricular activation points downward and to the left (toward the apex), **Lead II yields the tallest, clearest positive deflections** for rhythm monitoring.

### The Standard P-QRS-T Complex
1. **P Wave (Atrial Depolarization):** Reflects the spread of the electrical wavefront originating from the Sinoatrial (SA) node across the atria. Normal duration: < 120 ms; amplitude: < 0.25 mV.
2. **PR Interval (AV Nodal Conduction):** Measures time from initial atrial excitation to the beginning of ventricular excitation. The normal AV nodal delay allows mechanical ventricular filling. Normal: 120–200 ms.
3. **QRS Complex (Ventricular Depolarization):** Reflects rapid conduction through the Bundle of His, bundle branches, and Purkinje network. Normal duration: 80–120 ms.
4. **ST Segment (Plateau Phase):** Isoelectric period where both ventricles are completely depolarized (corresponds to Phase 2 of cardiac action potential).
5. **T Wave (Ventricular Repolarization):** Asymmetric positive deflection reflecting potassium efflux repolarizing the ventricular myocytes.

### Calibration Standards (AAMI EC11)
- Paper Speed: 25 mm/s (1 small box = 0.04s, 1 large box = 0.20s).
- Voltage Calibration: 10 mm/mV (1 small box = 0.1 mV, 1 large box = 0.5 mV).""",
            quiz_data={
                "questions": [
                    {
                        "question": "What is the standard paper sweep speed for diagnostic clinical electrocardiograms?",
                        "options": ["10 mm/s", "25 mm/s", "50 mm/s", "100 mm/s"],
                        "correct_option": "25 mm/s",
                        "explanation": "25 mm/s is the international standard, where 1 mm (one small box) represents 0.04 seconds (40 ms)."
                    },
                    {
                        "question": "What electrophysiological event is represented by the QRS complex?",
                        "options": ["Atrial repolarization", "Ventricular depolarization", "Ventricular repolarization", "SA node spontaneous pacemaker firing"],
                        "correct_option": "Ventricular depolarization",
                        "explanation": "The QRS complex represents electrical activation and depolarization of the ventricular muscle walls."
                    }
                ]
            }
        ),
        EducationModule(
            slug="arrhythmias-and-tachycardia",
            title="Recognizing Arrhythmias: From Sinus Bradycardia to Ventricular Tachycardia",
            category="arrhythmia",
            summary="Clinical differentiation between benign rate variations and life-threatening ventricular dysrhythmias.",
            difficulty="advanced",
            read_time_minutes=7,
            content_markdown="""# Clinical Arrhythmia Spectrum & Hemodynamic Impact

Arrhythmias occur when the heart's electrical conduction system malfunctions, resulting in rates that are too slow (bradycardia), too fast (tachycardia), or irregular.

### Sinus Bradycardia (HR < 60 BPM)
- **Physiological / Benign:** Well-conditioned endurance athletes frequently present with resting rates between 40–55 BPM due to high vagal tone and elevated stroke volume.
- **Pathological:** Sick Sinus Syndrome, severe hypothermia, hypothyroidism, or beta-blocker/digoxin toxicity accompanied by syncope, fatigue, or chest pain.

### Atrial Fibrillation (AFib)
- Chaotic, disorganized atrial electrical activity at 350–600 impulses/min.
- Lead II shows absent P-waves with fine fibrillatory baseline waves and **irregularly irregular** ventricular response.
- Hemodynamic danger: loss of atrial kick reduces cardiac output by 20–30%, and blood stasis in the left atrial appendage increases stroke risk 5-fold.

### Ventricular Tachycardia (VTach - Emergency)
- 3 or more consecutive ventricular ectopic beats at rate > 100 BPM (typically 140–220 BPM).
- Characterized by wide, bizarre QRS complexes (> 120 ms) with AV dissociation.
- **CRITICAL ALERT:** Can rapidly deteriorate into Ventricular Fibrillation (cardiac arrest). Requires immediate emergency cardioversion/defibrillation.""",
            quiz_data={
                "questions": [
                    {
                        "question": "Why does Atrial Fibrillation significantly elevate the risk of ischemic stroke?",
                        "options": ["Direct damage to carotid arteries", "Blood stasis in the left atrial appendage forming thromboemboli", "Coronary artery vasospasm", "Excessive cardiac output"],
                        "correct_option": "Blood stasis in the left atrial appendage forming thromboemboli",
                        "explanation": "Uncoordinated atrial quivering causes sluggish blood flow, allowing clots to form that can dislodge and travel to the brain."
                    }
                ]
            }
        ),
        EducationModule(
            slug="hemodynamic-vitals-blood-pressure",
            title="Arterial Hemodynamics, Mean Arterial Pressure (MAP) & SpO2",
            category="lifestyle",
            summary="How pulse rate, blood pressure, and oxygen saturation interact to maintain organ perfusion.",
            difficulty="beginner",
            read_time_minutes=5,
            content_markdown="""# Hemodynamics: Blood Pressure, MAP & Oxygen Saturation

Cardiovascular health relies on sufficient perfusion pressure to deliver oxygen and nutrients to critical tissues (brain, kidneys, myocardium).

### Mean Arterial Pressure (MAP)
MAP is the average arterial pressure throughout one cardiac cycle:
$$\\text{MAP} = \\frac{2 \\times \\text{Diastolic} + \\text{Systolic}}{3}$$

Diastolic pressure counts twice because the heart spends roughly two-thirds of the cardiac cycle in diastole at normal heart rates.
- Normal MAP: **70 to 105 mmHg**.
- A minimum MAP of **65 mmHg** is strictly required to sustain vital organ perfusion.

### Pulse Oximetry (SpO2)
Photoplethysmography measures peripheral oxygen saturation by emitting red (660 nm) and infrared (940 nm) light through capillary beds.
- **Normal Range:** 95% – 100%.
- **Hypoxemia Alert:** SpO2 < 90% indicates significant arterial desaturation requiring prompt clinical intervention.""",
            quiz_data={
                "questions": [
                    {
                        "question": "If a patient's blood pressure is 120/80 mmHg, what is their Mean Arterial Pressure (MAP)?",
                        "options": ["100 mmHg", "93 mmHg", "85 mmHg", "110 mmHg"],
                        "correct_option": "93 mmHg",
                        "explanation": "MAP = (2 * 80 + 120) / 3 = (160 + 120) / 3 = 280 / 3 = 93.3 mmHg."
                    }
                ]
            }
        ),
        EducationModule(
            slug="red-flag-emergency-triage",
            title="Critical Red-Flag Cardiac Symptoms: When to Call 112/911",
            category="emergency",
            summary="Emergency recognition of Acute Coronary Syndrome (ACS), stroke, and hemodynamic collapse.",
            difficulty="beginner",
            read_time_minutes=5,
            content_markdown="""# Critical Red-Flag Symptoms & Immediate Triage

Never ignore acute symptoms. While pulse monitors provide valuable longitudinal trends, **symptoms always take precedence over numerical heart rate readings**.

### When to Call Emergency Services (112 / 911) Immediately:
1. **Acute Chest Discomfort:** Substernal pressure, tightness, squeezing, or fullness radiating to the left shoulder, jaw, neck, back, or epigastrium.
2. **Sudden Shortness of Breath:** Inability to speak in full sentences, waking up gasping for air, or sudden severe dyspnea at rest.
3. **Fainting or Syncope:** Sudden unexplained loss of consciousness, especially preceded by palpitations or chest pain.
4. **Stroke Warning Signs (FAST):**
   - **F (Face):** Facial drooping or asymmetrical smile.
   - **A (Arms):** Arm weakness or drift when raised.
   - **S (Speech):** Slurred speech or difficulty repeating simple sentences.
   - **T (Time):** Call emergency services immediately.

> **CRITICAL RULE:** Do NOT drive yourself to the hospital. Emergency Medical Services (EMS) carry diagnostic 12-lead ECGs, intravenous medications, and defibrillators to start lifesaving treatment during transport.""",
            quiz_data={
                "questions": [
                    {
                        "question": "If a patient has a normal heart rate of 74 BPM but is experiencing severe substernal chest heaviness, what action is required?",
                        "options": ["Rest quietly for 30 minutes and re-test", "Drink water and drink coffee", "Call emergency services (112/911) immediately", "Wait for the next AI analysis report"],
                        "correct_option": "Call emergency services (112/911) immediately",
                        "explanation": "A normal heart rate does NOT rule out a heart attack. Acute chest discomfort is an immediate medical emergency requiring emergency services."
                    }
                ]
            }
        )
    ]
    db.add_all(edu_modules)
    await db.flush()

    # User Education Progress for Johnathan Miller
    db.add(EducationProgress(
        user_id=user.id,
        module_id=edu_modules[0].id,
        completed=True,
        quiz_score=100
    ))
    db.add(EducationProgress(
        user_id=user.id,
        module_id=edu_modules[1].id,
        completed=True,
        quiz_score=100
    ))


    # Initial Audit Log
    db.add(AuditLog(
        user_id=admin_user.id,
        action="SYSTEM_INITIALIZE_DEMO_DATA",
        resource_type="SYSTEM",
        resource_id="ALL",
        ip_address="127.0.0.1",
        details={"message": "CardioPulse demonstration patients and clinician accounts seeded successfully"}
    ))

    await db.commit()
    print("Clinical demonstration database successfully initialized!")
