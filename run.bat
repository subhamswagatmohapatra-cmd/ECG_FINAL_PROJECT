@echo off
echo ======================================================================
echo Starting CardioPulse AI - Clinical Heart Rate Monitoring Platform...
echo ======================================================================
echo.
echo Accessible URL: http://127.0.0.1:8000
echo Doctor Login:   doctor@cardiopulse.health / DoctorPass123!
echo Patient Login:  patient@cardiopulse.health / PatientPass123!
echo.
set PYTHONPATH=backend
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
pause

