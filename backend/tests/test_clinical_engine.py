import pytest
from app.clinical_engine import ClinicalRuleEngine

def test_normal_resting_adult():
    # Adult 35 yrs, 72 BPM resting, no symptoms -> GREEN
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=72,
        age=35,
        resting_status="resting",
        symptoms={},
        medical_history={},
        medications=[]
    )
    assert result["alert_level"] == "GREEN"
    assert result["expected_min_bpm"] == 60
    assert result["expected_max_bpm"] == 100

def test_chest_pain_with_normal_heart_rate():
    # Crucial safety rule: Chest pain with 75 BPM must trigger RED
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=75,
        age=50,
        resting_status="resting",
        symptoms={"chest_pain": True},
        medical_history={},
        medications=[]
    )
    assert result["alert_level"] == "RED"
    assert "Chest Pain" in result["alert_title"]

def test_unusually_low_resting_heart_rate_non_athlete():
    # Adult non-athlete, 44 BPM at rest without beta-blockers -> ORANGE
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=44,
        age=42,
        resting_status="resting",
        symptoms={},
        medical_history={},
        medications=[],
        is_athlete=False
    )
    assert result["alert_level"] == "ORANGE"

def test_athlete_low_resting_heart_rate():
    # Conditioned athlete, 48 BPM resting -> GREEN
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=48,
        age=26,
        resting_status="resting",
        symptoms={},
        medical_history={},
        medications=[],
        is_athlete=True
    )
    assert result["alert_level"] == "GREEN"
    assert result["expected_min_bpm"] == 40

def test_pediatric_patient():
    # Child 7 yrs, 92 BPM is normal for child -> GREEN
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=92,
        age=7,
        resting_status="resting",
        symptoms={},
        medical_history={},
        medications=[]
    )
    assert result["alert_level"] == "GREEN"
    assert result["expected_min_bpm"] == 70
    assert result["expected_max_bpm"] == 110

def test_pregnant_patient():
    # Pregnant female, resting 94 BPM -> expected physiological elevation
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=94,
        age=29,
        resting_status="resting",
        symptoms={},
        medical_history={},
        medications=[],
        is_pregnant=True
    )
    assert any("Pregnancy" in f for f in result["contributing_factors"])

def test_beta_blocker_patient():
    # Older adult on metoprolol, 55 BPM resting -> expected drug effect
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=55,
        age=70,
        resting_status="resting",
        symptoms={},
        medical_history={"high_blood_pressure": True},
        medications=[{"name": "Metoprolol", "affects_heart_rate": True}]
    )
    assert any("Beta-blocker" in f for f in result["contributing_factors"])

def test_exercise_related_elevated_heart_rate():
    # Adult 30 yrs, active exercise at 135 BPM -> within target 95-161 BPM zone
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=135,
        age=30,
        resting_status="active",
        symptoms={},
        medical_history={},
        medications=[]
    )
    assert result["alert_level"] == "GREEN"

def test_severe_resting_tachycardia():
    # Adult resting HR 155 BPM -> RED emergency
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=155,
        age=45,
        resting_status="resting",
        symptoms={},
        medical_history={},
        medications=[]
    )
    assert result["alert_level"] == "RED"
    assert "Severe Resting Tachycardia" in result["alert_title"]

def test_stroke_signs():
    # Patient reports stroke signs -> RED emergency immediately
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=80,
        age=62,
        resting_status="resting",
        symptoms={"stroke_signs": True},
        medical_history={},
        medications=[]
    )
    assert result["alert_level"] == "RED"
    assert "Stroke" in result["alert_title"]

def test_missing_medical_information():
    # Missing age and history -> Fallback to safe defaults with explicit ranges
    result = ClinicalRuleEngine.evaluate_safety_and_triage(
        bpm=76,
        age=None,
        resting_status="resting",
        symptoms={},
        medical_history=None,
        medications=None
    )
    assert result["alert_level"] == "GREEN"
    assert result["expected_min_bpm"] == 60
    assert result["expected_max_bpm"] == 100
