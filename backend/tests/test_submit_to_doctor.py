import pytest
import sys
import os

os.environ["TESTING"] = "1"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app

def test_submit_ecg_and_report_to_doctor():
    with TestClient(app) as client:
        # 1. Patient Login
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": "patient@cardiopulse.health", "password": "PatientPass123!"}
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        patient_token = login_res.json()["access_token"]
        patient_headers = {"Authorization": f"Bearer {patient_token}", "Content-Type": "application/json"}

        # 2. Get Available Doctors
        doc_res = client.get("/api/v1/appointments/doctors", headers=patient_headers)
        assert doc_res.status_code == 200
        doctors = doc_res.json()
        assert len(doctors) > 0, "Expected at least 1 available doctor"
        assigned_doctor = doctors[0]
        assert "full_name" in assigned_doctor
        assert "specialty" in assigned_doctor

        # 3. Get Patient ECG Uploads or Upload a new ECG
        uploads_res = client.get("/api/v1/ecg/uploads", headers=patient_headers)
        assert uploads_res.status_code == 200
        uploads = uploads_res.json()
        if len(uploads) == 0:
            from app.ecg_engine import ECGAIEngine
            raw_csv = ECGAIEngine.synthesize_clinical_demo("normal_sinus")
            up_res = client.post(
                "/api/v1/ecg/upload",
                files={"file": ("ecg_telemetry_lead2.csv", raw_csv.encode("utf-8"), "text/csv")},
                data={"recorded_bp": "122/80", "recorded_hr": "74"},
                headers={"Authorization": f"Bearer {patient_token}"}
            )
            assert up_res.status_code == 200, f"Upload failed: {up_res.text}"
            upload_id = up_res.json()["upload_id"]
        else:
            upload_id = uploads[0]["id"]

        # 4. Submit ECG to Doctor with JSON payload (matching frontend body: JSON.stringify(data))
        submit_payload = {
            "doctor_id": assigned_doctor["id"],
            "patient_notes": "Experiencing mild dizziness during morning walks."
        }
        submit_res = client.post(
            f"/api/v1/ecg/uploads/{upload_id}/submit",
            json=submit_payload,
            headers=patient_headers
        )
        assert submit_res.status_code == 200, f"Submission failed: {submit_res.text}"
        submit_data = submit_res.json()
        assert submit_data["status"] == "success"
        assert submit_data["submission_status"] == "awaiting_doctor_review"
        assert submit_data["assigned_doctor_id"] == assigned_doctor["id"]
        assert "report_id" in submit_data

        # 5. Doctor Login
        doc_login = client.post(
            "/api/v1/auth/login",
            json={"email": "doctor@cardiopulse.health", "password": "DoctorPass123!"}
        )
        assert doc_login.status_code == 200
        doctor_token = doc_login.json()["access_token"]
        doctor_headers = {"Authorization": f"Bearer {doctor_token}"}

        # 6. Doctor Submissions Queue Check
        subs_res = client.get("/api/v1/doctor/submissions", headers=doctor_headers)
        assert subs_res.status_code == 200
        submissions = subs_res.json()
        assert len(submissions) > 0
        matching = [s for s in submissions if s["upload_id"] == upload_id]
        assert len(matching) > 0
        assert matching[0]["submission_status"] == "awaiting_doctor_review"
        assert matching[0]["patient_notes"] == "Experiencing mild dizziness during morning walks."
        assert matching[0]["patient_name"] == "Johnathan Miller"

        # 7. Submit Health Report to Doctor
        reps_res = client.get("/api/v1/reports", headers=patient_headers)
        assert reps_res.status_code == 200
        reports = reps_res.json()
        assert len(reports) > 0
        report_id = reports[0]["id"]

        rep_submit_res = client.post(
            f"/api/v1/reports/{report_id}/submit",
            json={"doctor_id": assigned_doctor["id"], "patient_notes": "Clinical report review requested."},
            headers=patient_headers
        )
        assert rep_submit_res.status_code == 200
        rep_submit_data = rep_submit_res.json()
        assert rep_submit_data["status"] == "success"
        assert rep_submit_data["submission_status"] == "awaiting_doctor_review"
