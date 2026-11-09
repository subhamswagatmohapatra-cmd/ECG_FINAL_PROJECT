import pytest
import os
os.environ["TESTING"] = "1"

from app.clinical_engine import ClinicalRuleEngine
from app.ai_advisor import AIAdvisorEngine
from app.report_generator import HealthReportGenerator
from app.schemas import (
    AppointmentCreate, MessageCreate, DeviceRegister,
    EducationModuleOut, AdminStatsOut
)

def test_ai_advisor_fallback_and_guardrails():
    # Test deterministic fallback insights
    patient_info = {
        "age": 46,
        "sex": "Male",
        "physical_activity_level": "moderate",
        "sleep_duration_hours": 7.0,
        "stress_level": "moderate",
        "caffeine_intake": "moderate",
        "is_pregnant": False,
        "recent_illness_or_fever": False,
        "medical_history": {"high_blood_pressure": True},
        "medications": [{"name": "Lisinopril"}]
    }
    reading_info = {
        "bpm": 74,
        "resting_status": "resting",
        "symptoms": {}
    }
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
    historical_metrics = {"avg_hr": 72.0, "min_hr": 68, "max_hr": 78}

    insights = AIAdvisorEngine._generate_deterministic_clinical_insights(
        patient_info, reading_info, triage, historical_metrics
    )
    assert "contextual_interpretation" in insights
    assert len(insights["recommendations"]) > 0

    # Test safety validator: ensure diagnostic claims are stripped and disclaimer is enforced
    validated = AIAdvisorEngine._validate_and_sanitize_ai_output(insights, "GREEN")
    assert validated is not None
    assert "data_limitations" in validated

def test_report_payload_generator():
    triage = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=75,
        age=52,
        resting_status="resting",
        symptoms={"chest_pain": True},
        medical_history={},
        medications=[]
    )
    assert triage["alert_level"] == "RED"

    payload = HealthReportGenerator.generate_report_payload(
        patient_data={
            "patient_id_code": "PAT-TEST-001",
            "full_name": "Test Patient",
            "age": 52,
            "sex": "Female",
            "emergency_contact_name": "Jane Doe",
            "emergency_contact_phone": "555-0199"
        },
        reading_data={
            "bpm": 75,
            "resting_status": "resting",
            "measurement_method": "manual",
            "device_name": "Sphygmomanometer"
        },
        triage_data=triage,
        ai_data={
            "contextual_interpretation": "Urgent attention recommended due to acute chest discomfort.",
            "unusual_patterns": [],
            "recommendations": [{"category": "emergency", "recommendation_text": "Seek immediate emergency evaluation", "priority": 1}],
            "data_limitations": "Pulse observation cannot replace a clinical 12-lead ECG."
        },
        historical_stats={"avg_hr": 72, "min_hr": 68, "max_hr": 80},
        reference_code="REP-TEST-123"
    )

    # Validate 12 standard report sections
    assert payload["reference_code"] == "REP-TEST-123"
    assert "section_1_patient_details" in payload
    assert "section_2_measurement_details" in payload
    assert "section_3_current_heart_rate" in payload
    assert "section_4_historical_comparison" in payload
    assert "section_5_patient_symptoms" in payload
    assert "section_6_medical_history_considerations" in payload
    assert "section_7_ai_assisted_observations" in payload
    assert "section_8_potential_risk_indicators" in payload
    assert payload["section_8_potential_risk_indicators"]["alert_level"] == "RED"
    assert "section_9_recommended_next_steps" in payload
    assert "section_10_emergency_warnings" in payload
    assert "section_11_limitations_of_analysis" in payload
    assert "section_12_disclaimer" in payload

def test_schema_validations():
    from datetime import datetime, timezone
    # Appointment schema
    appt = AppointmentCreate(
        doctor_id=1,
        appointment_date=datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc),
        reason="Follow-up cardiology consultation for ambulatory arrhythmia review",
        appointment_type="telehealth"
    )
    assert appt.appointment_type == "telehealth"

    # Message schema
    msg = MessageCreate(
        recipient_id=2,
        content="Hello Doctor, I logged my morning resting readings as requested."
    )
    assert msg.recipient_id == 2

    # Device schema
    dev = DeviceRegister(
        device_type="smartwatch",
        device_name="Apple Watch Series 10",
        serial_number="APPL-W10-99482",
        mac_address="A4:C3:F0:89:12:34",
        firmware_version="v2.4.1"
    )
    assert dev.device_type == "smartwatch"
    assert dev.serial_number == "APPL-W10-99482"

    # Admin stats schema
    stats = AdminStatsOut(
        total_users=8,
        total_patients=5,
        total_doctors=2,
        verified_doctors=2,
        total_readings=42,
        total_analyses=38,
        total_reports=12,
        total_emergency_alerts=3,
        alert_distribution={"GREEN": 25, "YELLOW": 10, "ORANGE": 4, "RED": 3},
        system_status="HEALTHY",
        api_version="1.0.0",
        database_connected=True,
        uptime_seconds=3600.0
    )
    assert stats.total_users == 8
    assert stats.system_status == "HEALTHY"
    assert stats.verified_doctors == 2
