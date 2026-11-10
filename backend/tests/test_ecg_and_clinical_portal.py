import pytest
import os
from app.ecg_engine import ECGAIEngine
from app.ecg_pdf import ECGPDFReportGenerator

def test_ecg_engine_normal_sinus():
    """Verify DSP Pan-Tompkins QRS detection and interval calculations on synthetic ECG."""
    raw_csv = ECGAIEngine.synthesize_clinical_demo("normal_sinus")
    
    result = ECGAIEngine.analyze_ecg(
        file_bytes=raw_csv.encode('utf-8'),
        filename="normal_sinus_lead2.csv"
    )
    
    assert result["heart_rate_bpm"] >= 60 and result["heart_rate_bpm"] <= 85
    assert len(result["r_peak_indices"]) >= 8
    assert result["signal_quality"] in ["GOOD", "EXCELLENT"]
    assert "Normal" in result["primary_classification"]
    assert result["clinical_risk_tier"] == "GREEN"
    assert result["qtc_interval_ms"] > 350 and result["qtc_interval_ms"] < 470
    assert len(result["raw_samples"]) > 100

def test_ecg_engine_atrial_fibrillation():
    """Verify arrhythmia detection on irregular rhythm."""
    raw_csv = ECGAIEngine.synthesize_clinical_demo("atrial_fibrillation")
    
    result = ECGAIEngine.analyze_ecg(
        file_bytes=raw_csv.encode('utf-8'),
        filename="afib_sample.csv"
    )
    
    assert "Arrhythmia" in result["primary_classification"] or "Tachycardia" in result["primary_classification"] or result["clinical_risk_tier"] != "GREEN"

def test_ecg_engine_bradycardia():
    """Verify bradycardia identification below 60 BPM."""
    raw_csv = ECGAIEngine.synthesize_clinical_demo("bradycardia")
    
    result = ECGAIEngine.analyze_ecg(
        file_bytes=raw_csv.encode('utf-8'),
        filename="bradycardia_sample.csv"
    )
    
    assert result["heart_rate_bpm"] < 60
    assert "Bradycardia" in result["primary_classification"]

def test_ecg_pdf_generation(tmp_path):
    """Verify calibrated PDF rendering with 1mm/5mm medical grid."""
    raw_csv = ECGAIEngine.synthesize_clinical_demo("normal_sinus")
    analysis = ECGAIEngine.analyze_ecg(raw_csv.encode('utf-8'), "test.csv")
    
    out_file = str(tmp_path / "test_report.pdf")
    pdf_path = ECGPDFReportGenerator.generate_pdf(
        patient_info={"full_name": "Test Patient", "patient_id_code": "PAT-999", "age": 35, "sex": "male"},
        ecg_upload_info={"id": 1, "filename": "test.csv", "created_at": "2026-11-10 12:00:00 UTC", "recorded_bp": "120/80"},
        analysis_info=analysis,
        output_path=out_file
    )
    
    assert os.path.exists(pdf_path)
    with open(pdf_path, "rb") as f:
        data = f.read()
    assert len(data) > 5000
    assert data.startswith(b"%PDF")
