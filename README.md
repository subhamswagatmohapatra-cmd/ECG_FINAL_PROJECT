# CardioPulse AI — Ultimate Cardiovascular Health Monitoring & Clinical Decision-Support Platform

CardioPulse AI is an enterprise-grade medical technology platform combining real-time vital signs telemetry, electrophysiological simulations, deterministic clinical safety triage (AAMI EC11), AI-assisted health intelligence, and multi-portal clinical governance for patients, cardiologists, and system administrators.

> **CRITICAL CLINICAL & REGULATORY NOTICE:**
> CardioPulse is an educational and analytical clinical decision-support tool (CDSS), **NOT a replacement for a licensed healthcare provider**. It does not establish definitive medical diagnoses, guarantee cardiovascular health, or substitute for a clinical 12-lead Electrocardiogram (ECG).

---

## 🚀 Live Platform Access

The platform runs locally at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### Pre-Configured Clinical Demonstration Accounts

All accounts use the secure default passwords listed below:

| Role | Name & Clinical Context | Email | Password |
|---|---|---|---|
| **System Administrator** | CardioPulse System Administrator (Full Oversight) | `admin@cardiopulse.health` | `AdminPass123!` |
| **Attending Cardiologist** | Dr. Sarah Chen, MD, FACC (Review & Sign-Off) | `doctor@cardiopulse.health` | `DoctorPass123!` |
| **Primary Patient** | Johnathan Miller (Age 46, Hypertension on Lisinopril) | `patient@cardiopulse.health` | `PatientPass123!` |
| **Endurance Athlete** | Marcus Vance (Age 28, Sinus Bradycardia 48 BPM) | `athlete@cardiopulse.health` | `PatientPass123!` |
| **Pediatric Patient** | Leo Sharma (Age 8, Resting HR 94 BPM normal) | `pediatric@cardiopulse.health` | `PatientPass123!` |
| **Pregnant Patient** | Elena Rostova (Age 31, 28w Gestation, Rest 92 BPM) | `pregnant@cardiopulse.health` | `PatientPass123!` |
| **Cardiac History Patient** | Arthur Pendelton (Age 71, Prior LAD Stent on Metoprolol) | `cardiac@cardiopulse.health` | `PatientPass123!` |
| **Emergency Triage Demo** | David Kumar (Age 54, HR 78 BPM + Chest Pain -> **RED Alert**) | `chestpain@cardiopulse.health` | `PatientPass123!` |
| **Severe Tachycardia Demo** | Priya Patel (Age 34, Resting HR 152 BPM -> **RED Alert**) | `tachy@cardiopulse.health` | `PatientPass123!` |

---

## 🌟 Key Functional Modules & Architecture

### 1. Multi-Role Portals
- **Patient Portal:** Comprehensive dashboard, manual and wearable vitals recording, real-time AI triage insights, longitudinal trend analytics, formal PDF report downloads, and secure messaging with attending physicians.
- **Clinician Cockpit:** Triage roster of patients with risk stratification, 6-tab detailed patient dossier, multi-channel ICU bedside monitor, and digital SHA-256 encrypted report sign-off.
- **Admin Management Console:** Real-time KPI dashboard, alert distribution analytics, user lifecycle controls (activate/suspend), physician credential verification (state board & license # check), and immutable HIPAA/GDPR audit ledger.

### 2. ICU Bedside Telemetry Suite
- **Multi-Channel Sweep Canvas:** Continuous Lead II ECG, SpO2 photoplethysmogram, thoracic impedance respiration, and arterial blood pressure waveforms running at standard 25 mm/s paper speed.
- **WebSocket Streaming Engine (`/api/v1/ws/telemetry`):** Streams synchronized packets with heart rate variability, SpO2, and respiratory cycle data with automatic client reconnect.
- **Educational Simulation Controls:** Interactive arrhythmia selector (Normal Sinus, Sinus Bradycardia, Sinus Tachycardia, Atrial Fibrillation, Ventricular Tachycardia, PVCs), NIBP cuff inflation simulator, and Web Audio API synthesized QRS blips.

### 3. Clinical Decision-Support & Safety Triage Matrix
The engine enforces a deterministic four-tier alert matrix benchmarked against ACC/AHA and PALS guidelines:
- **🟢 GREEN (Normal / Routine):** Vitals within age- and activity-adjusted physiological targets.
- **🟡 YELLOW (Monitor / Repeat):** Mild deviations (e.g., resting tachycardia 101–114 BPM); instructions to rest quietly for 10 minutes and re-test.
- **🟠 ORANGE (Prompt Clinical Review):** Marked deviations (e.g., non-athlete bradycardia < 48 BPM without beta-blockers); advisory to consult a physician within 24–48 hours.
- **🔴 RED (Medical Emergency):**
  - **Absolute Rule:** Any acute chest pain/pressure triggers an immediate RED alert regardless of BPM.
  - Other triggers: Stroke signs (FAST protocol), syncope with dysrhythmia, resting tachycardia $\ge 150$ BPM, severe bradycardia $< 40$ BPM.
  - Prominently displays regional ambulance dispatch hotlines (**112 / 911**).

### 4. Patient Cardiac Education & ECG Academy
- **Illustrated Clinical Curriculum:** Five peer-reviewed modules covering Cardiac Electrophysiology, Arrhythmia Demystified, Nocturnal Autonomic Balance, Biometric Wearables, and Emergency Action Protocols.
- **Interactive ECG Waveform Explorer:** Dynamic vector visualization isolating the P-wave, PR-segment, QRS complex, ST-segment, and T-wave.
- **Interactive Knowledge Quizzes:** Real-time scoring, percentage grading, pass/fail status tracking, and personalized clinical feedback.

### 5. Telehealth Communications & Consultations
- **Doctor-Patient Messaging:** HIPAA-compliant communication channel with read receipts and clinical urgency flagging.
- **Appointment Scheduling:** Book, reschedule, and track upcoming video telehealth, in-person outpatient, or urgent cardiac evaluation visits.

### 6. Connected Wearables & Sensor Hub
- **Device Fleet Management:** Pair and manage Bluetooth Low Energy (BLE) monitors, smartwatches, chest straps, and fingertip pulse oximeters.
- **Apple HealthKit & Android Health Connect Integration:** HL7 FHIR `Observation` and `HeartRateRecord` architecture documentation with battery and firmware status monitoring.

### 7. Cardiovascular Analytics Hub
- **Personal Baseline Resting HR Delta:** Quantifies recovery, autonomic stress, and physical fatigue relative to rolling 7-day averages.
- **Circadian Profile:** Bar chart breakdown across Morning (06:00–12:00), Afternoon (12:00–18:00), Evening (18:00–22:00), and Nocturnal (22:00–06:00) physiological windows.
- **Measurement Consistency Score:** Visualizes patient engagement and data completeness across active tracking days.

### 8. Formal Health Analysis Reports (ReportLab)
- Generates 12-section clinical reports with ReportLab PDF compilation, including risk level, AI observations, physiological factors, emergency guidance, and clinician signature blocks.

---

## 🛠 Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React, Recharts (Area, Bar, Gauge charts), Three.js (WebGL 3D Cardio Lab).
- **Backend:** Python FastAPI, Pydantic v2, SQLAlchemy 2.0, aiosqlite (SQLite with WAL mode, PostgreSQL-ready), ReportLab PDF Engine.
- **AI Integration:** Google Gemini Live API (`gemini-1.5-flash`) with deterministic Clinical NLP fallback.
- **Design System:** Complete Light and Dark theme modes with persistent local storage and fluid glassmorphism tokens.
- **Security & Privacy:** JWT authentication, bcrypt password hashing, role-based access control (RBAC), tamper-evident audit logging, and explicit consent management (HIPAA / GDPR / DPDPA).

---

## 📂 Project Structure

```
ECG Final _Project/
├── backend/
│   ├── app/
│   │   ├── models.py            # 21 SQLAlchemy relational models
│   │   ├── schemas.py           # Comprehensive Pydantic v2 validation models
│   │   ├── clinical_engine.py   # Deterministic safety triage & clinical rules
│   │   ├── ai_advisor.py        # Generative AI advisor with clinical guardrails
│   │   ├── report_generator.py  # 12-section ReportLab PDF generator
│   │   ├── seed_data.py         # Multi-case database seeder
│   │   └── routers/             # 16 REST & WebSocket API routers
│   ├── tests/
│   │   ├── test_clinical_engine.py  # 11 clinical triage edge-case tests
│   │   └── test_ai_and_reporting.py # AI guardrails, schemas & report tests
│   └── main.py                  # FastAPI application entrypoint & static mounting
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, BedsideTelemetryMonitor, ReportViewerModal
│   │   ├── context/             # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/               # 12 application pages (Dashboards, 3D Lab, Admin, etc.)
│   │   ├── services/api.ts      # Typed REST & WebSocket API client
│   │   └── types/index.ts       # TypeScript clinical domain interfaces
│   └── dist/                    # Production compiled SPA bundle
├── Dockerfile                   # Multi-stage production container build
├── docker-compose.yml           # Application & PostgreSQL database orchestration
├── .env.example                 # Environment configuration template
└── run.bat                      # 1-click Windows startup script
```

---

## 🧪 Automated Clinical & Unit Testing

Execute the comprehensive test suite verifying clinical safety logic, AI guardrails, and data schemas:

```powershell
$env:PYTHONPATH="backend"; $env:TESTING="1"; .\.venv\Scripts\python.exe -m pytest backend/tests -v
```

**Results:** 14 passed in 0.63 seconds.

---

## 🏃 Running the Application

### Option A: Local Execution (Recommended for Development)

1. Double-click `run.bat` or run in terminal:
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
   ```
2. Open your web browser to **http://127.0.0.1:8000**.

### Option B: Docker Compose (Production Deployment)

```bash
docker compose up -d --build
```
The application will boot on port 8000 with a connected PostgreSQL 16 database.
