import React, { useState, useMemo } from 'react';
import {
  UserPlus, ArrowLeft, ShieldCheck, Check, Heart, Activity,
  AlertTriangle, Phone, User, Calendar, Lock, Pill, Info, ChevronRight,
  CheckCircle2, Sparkles, Scale, Stethoscope, Award, Building, FileBadge
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface RegisterPageProps {
  onNavigate: (tab: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  // Role Selection: Patient vs Doctor
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor'>('patient');

  // Multi-step for Patient
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient Registration Form State
  const [patientData, setPatientData] = useState({
    email: '',
    password: '',
    full_name: '',
    date_of_birth: '',
    age: '',
    sex: 'Male',
    height_cm: '',
    weight_kg: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    has_heart_disease: false,
    high_blood_pressure: false,
    low_blood_pressure: false,
    diabetes: false,
    thyroid_disorder: false,
    previous_cardiac_event: false,
    respiratory_condition: false,
    other_conditions: '',
    smoking_habit: 'non-smoker',
    alcohol_consumption: 'none',
    physical_activity_level: 'moderate',
    daily_exercise_habits: '',
    sleep_duration_hours: 7.0,
    stress_level: 'moderate',
    caffeine_intake: 'moderate',
    is_pregnant: false,
    pregnancy_trimester: 1,
    recent_illness_or_fever: false,
    recent_illness_details: '',
    current_medication_name: '',
    current_medication_dose: '',
    allergy_name: '',
    allergy_severity: 'moderate',
    consent_data_processing: true,
    consent_ai_analysis: true
  });

  // Doctor Registration Form State
  const [doctorData, setDoctorData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    license_number: '',
    specialty: 'Clinical Cardiology & Electrophysiology',
    hospital_affiliation: 'Metropolitan Heart & Vascular Institute',
    qualifications: 'MBBS, MD (Cardiology), FACC',
    years_of_experience: 8,
    medical_council: 'National Medical Commission / State Medical Board',
    clinical_authorization_code: '',
    consent_clinical_terms: true
  });

  // Calculate live BMI for Patient
  const bmiInfo = useMemo(() => {
    const h = Number(patientData.height_cm);
    const w = Number(patientData.weight_kg);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const hMeters = h / 100;
    const val = Number((w / (hMeters * hMeters)).toFixed(1));
    let label = 'Normal';
    let color = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (val < 18.5) {
      label = 'Underweight';
      color = 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
    } else if (val >= 25 && val < 30) {
      label = 'Overweight';
      color = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    } else if (val >= 30) {
      label = 'Obese';
      color = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    }
    return { val, label, color };
  }, [patientData.height_cm, patientData.weight_kg]);

  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setPatientData(prev => ({ ...prev, [name]: checked }));
    } else {
      setPatientData(prev => {
        const next = { ...prev, [name]: value };
        if (name === 'date_of_birth' && value) {
          const birthYear = new Date(value).getFullYear();
          const currentYear = new Date().getFullYear();
          if (birthYear > 1900 && birthYear <= currentYear) {
            next.age = String(currentYear - birthYear);
          }
        }
        return next;
      });
    }
  };

  const handleDoctorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setDoctorData(prev => ({ ...prev, [name]: checked }));
    } else {
      setDoctorData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validatePatientStep1 = () => {
    if (!patientData.full_name.trim()) {
      setError('Please provide your full legal name.');
      return false;
    }
    if (!patientData.email.trim() || !patientData.email.includes('@')) {
      setError('Please provide a valid email address.');
      return false;
    }
    if (!patientData.password || patientData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNextStep = (targetStep: number) => {
    if (step === 1 && !validatePatientStep1()) return;
    setError(null);
    setStep(targetStep);
  };

  // Submit Patient Registration
  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientData.consent_data_processing) {
      setError('You must grant vital signs processing consent to use the CardioPulse clinical platform.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Patient User Account
      await register({
        email: patientData.email,
        password: patientData.password,
        full_name: patientData.full_name,
        role: 'patient'
      });

      // 2. Update Patient Biometric Profile
      await api.updatePatientProfile({
        date_of_birth: patientData.date_of_birth || undefined,
        age: patientData.age ? Number(patientData.age) : undefined,
        sex: patientData.sex,
        height_cm: patientData.height_cm ? Number(patientData.height_cm) : undefined,
        weight_kg: patientData.weight_kg ? Number(patientData.weight_kg) : undefined,
        phone: patientData.phone || undefined,
        emergency_contact_name: patientData.emergency_contact_name || undefined,
        emergency_contact_phone: patientData.emergency_contact_phone || undefined,
        emergency_contact_relation: patientData.emergency_contact_relation || undefined,
        smoking_habit: patientData.smoking_habit,
        alcohol_consumption: patientData.alcohol_consumption,
        physical_activity_level: patientData.physical_activity_level,
        daily_exercise_habits: patientData.daily_exercise_habits || undefined,
        sleep_duration_hours: Number(patientData.sleep_duration_hours) || 7.0,
        stress_level: patientData.stress_level,
        caffeine_intake: patientData.caffeine_intake,
        is_pregnant: patientData.is_pregnant,
        pregnancy_trimester: patientData.is_pregnant ? Number(patientData.pregnancy_trimester) : undefined,
        recent_illness_or_fever: patientData.recent_illness_or_fever,
        recent_illness_details: patientData.recent_illness_details || undefined
      });

      // 3. Update Medical History
      await api.updateMedicalHistory({
        has_heart_disease: patientData.has_heart_disease,
        high_blood_pressure: patientData.high_blood_pressure,
        low_blood_pressure: patientData.low_blood_pressure,
        diabetes: patientData.diabetes,
        thyroid_disorder: patientData.thyroid_disorder,
        previous_cardiac_event: patientData.previous_cardiac_event,
        respiratory_condition: patientData.respiratory_condition,
        other_conditions: patientData.other_conditions || undefined
      });

      // 4. Add Medication if provided
      if (patientData.current_medication_name.trim()) {
        await api.addMedication({
          name: patientData.current_medication_name.trim(),
          dosage: patientData.current_medication_dose.trim() || 'Prescribed dose',
          affects_heart_rate: false
        }).catch(() => null);
      }

      // 5. Add Allergy if provided
      if (patientData.allergy_name.trim()) {
        await api.addAllergy({
          allergen: patientData.allergy_name.trim(),
          severity: patientData.allergy_severity
        }).catch(() => null);
      }

      showToast('Registration Complete', `Welcome to CardioPulse AI, ${patientData.full_name}!`, 'success');
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your credentials.');
      showToast('Registration Error', err.message || 'Failed to complete registration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Doctor Registration
  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!doctorData.full_name.trim()) {
      setError('Please provide your full legal name and clinical title.');
      return;
    }
    if (!doctorData.email.trim() || !doctorData.email.includes('@')) {
      setError('Please provide a valid professional email address.');
      return;
    }
    if (!doctorData.password || doctorData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!doctorData.license_number.trim()) {
      setError('Medical license number is mandatory for clinical onboarding.');
      return;
    }
    if (!doctorData.clinical_authorization_code.trim()) {
      setError('Hospital Clinical Authorization Passcode is mandatory. Patients cannot register for the Doctor Portal.');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: doctorData.email,
        password: doctorData.password,
        full_name: doctorData.full_name,
        role: 'doctor',
        specialty: doctorData.specialty,
        license_number: doctorData.license_number,
        hospital_affiliation: doctorData.hospital_affiliation,
        qualifications: doctorData.qualifications,
        years_of_experience: Number(doctorData.years_of_experience),
        medical_council: doctorData.medical_council,
        clinical_authorization_code: doctorData.clinical_authorization_code.trim().toUpperCase()
      });

      showToast(
        'Physician Registration Submitted',
        `Welcome Dr. ${doctorData.full_name}! Account initialized with pending board verification.`,
        'success'
      );
      onNavigate('doctor');
    } catch (err: any) {
      setError(err.message || 'Doctor registration failed. Please try again.');
      showToast('Registration Error', err.message || 'Failed to complete doctor onboarding.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-6 px-4 pb-12">
      <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden backdrop-blur-2xl">

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#030712] via-[#0b1329] to-[#030712] p-6 border-b border-slate-800 relative">
          <button
            onClick={() => onNavigate('login')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3 transition font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  {selectedRole === 'patient' ? <UserPlus className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {selectedRole === 'patient' ? 'Patient Clinical Registration' : 'Physician & Cardiologist Onboarding'}
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {selectedRole === 'patient'
                  ? 'Comprehensive biometric intake for calibrated, personalized cardiovascular telemetry.'
                  : 'Licensed physician onboarding for ECG review, telemetry triage, and clinical sign-off.'}
              </p>
            </div>

            {selectedRole === 'patient' && (
              <span className="self-start sm:self-center text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Step {step} of 3
              </span>
            )}
          </div>

          {/* Role Toggle Selector */}
          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-slate-400 font-bold uppercase">Account Role:</span>
            <div className="inline-flex rounded-xl p-1 bg-slate-900 border border-slate-700">
              <button
                type="button"
                onClick={() => { setSelectedRole('patient'); setError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedRole === 'patient'
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Patient Account</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('doctor'); setError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedRole === 'doctor'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor / Cardiologist</span>
              </button>
            </div>
          </div>

          {/* Stepper Navigation (Only for Patient) */}
          {selectedRole === 'patient' && (
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleNextStep(1)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition ${step === 1
                  ? 'bg-teal-500 text-white font-bold shadow-md shadow-teal-500/30'
                  : step > 1
                    ? 'bg-slate-800/80 text-teal-400 border border-teal-500/30'
                    : 'bg-slate-900/60 text-slate-500'
                  }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">1</span>
                <span className="hidden sm:inline">Account & Demographics</span>
                <span className="sm:hidden">Account</span>
              </button>

              <button
                type="button"
                onClick={() => handleNextStep(2)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition ${step === 2
                  ? 'bg-teal-500 text-white font-bold shadow-md shadow-teal-500/30'
                  : step > 2
                    ? 'bg-slate-800/80 text-teal-400 border border-teal-500/30'
                    : 'bg-slate-900/60 text-slate-500'
                  }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">2</span>
                <span className="hidden sm:inline">Medical History</span>
                <span className="sm:hidden">History</span>
              </button>

              <button
                type="button"
                onClick={() => handleNextStep(3)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition ${step === 3
                  ? 'bg-teal-500 text-white font-bold shadow-md shadow-teal-500/30'
                  : 'bg-slate-900/60 text-slate-500'
                  }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">3</span>
                <span className="hidden sm:inline">Lifestyle & Review</span>
                <span className="sm:hidden">Review</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 sm:mx-8 mt-6 bg-rose-950/50 border border-rose-500/80 text-rose-200 text-xs p-3.5 rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DOCTOR REGISTRATION FORM                                      */}
        {/* ------------------------------------------------------------- */}
        {selectedRole === 'doctor' && (
          <form onSubmit={handleDoctorSubmit} className="p-6 sm:p-8 space-y-6 text-xs">
            {/* Restricted Access Alert Badge */}
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-xs tracking-wide uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Restricted Medical Staff Onboarding &bull; Clinical Access Guard</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Patient users are strictly prohibited from creating clinician accounts. Physician onboarding requires a valid <strong className="text-amber-300 font-mono">Hospital Clinical Authorization Passcode (e.g. CARDIO-MD-2026)</strong> issued by the Medical Board, or direct credential provisioning by the Super Administrator.
              </p>
            </div>

            <div className="border-b border-slate-800 pb-2">
              <h2 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-400" /> Physician Credentials & Medical Board Registration
              </h2>
            </div>

            {/* Hospital Authorization Passcode (MANDATORY) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-amber-500/40 space-y-2">
              <label className="block font-bold text-amber-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Hospital Clinical Authorization Passcode *
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-semibold">Authorized Staff Only</span>
              </label>
              <input
                type="text"
                required
                name="clinical_authorization_code"
                value={doctorData.clinical_authorization_code}
                onChange={handleDoctorChange}
                className="w-full p-3 bg-slate-950 border border-amber-500/60 rounded-xl text-amber-200 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono tracking-widest text-sm uppercase font-bold"
                placeholder="CARDIO-MD-2026"
              />
              <p className="text-[10px] text-slate-400">
                Staff passcode verifies physician identity. Patients attempting to register here will be rejected by the security layer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Full Name & Clinical Title *
                </label>
                <input
                  type="text"
                  required
                  name="full_name"
                  value={doctorData.full_name}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  placeholder="e.g. Dr. Sarah Chen, MD"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Clinical / Hospital Email *
                </label>
                <input
                  type="email"
                  required
                  name="email"
                  value={doctorData.email}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  placeholder="dr.chen@cardiopulse.health"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Secure Password *
                </label>
                <input
                  type="password"
                  required
                  name="password"
                  value={doctorData.password}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Official Contact Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={doctorData.phone}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  placeholder="+1 (555) 987-6543"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Medical License / Registration Number *
                </label>
                <input
                  type="text"
                  required
                  name="license_number"
                  value={doctorData.license_number}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono"
                  placeholder="e.g. MD-84920 / MCI-2016-882"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Primary Specialty
                </label>
                <input
                  type="text"
                  name="specialty"
                  value={doctorData.specialty}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                  placeholder="Clinical Cardiology & Electrophysiology"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Medical Qualifications & Degrees
                </label>
                <input
                  type="text"
                  name="qualifications"
                  value={doctorData.qualifications}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                  placeholder="e.g. MBBS, MD (Cardiology), FACC"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  name="years_of_experience"
                  value={doctorData.years_of_experience}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Hospital / Clinic Affiliation
                </label>
                <input
                  type="text"
                  name="hospital_affiliation"
                  value={doctorData.hospital_affiliation}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                  placeholder="Metropolitan Heart & Vascular Institute"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Medical Council / Licensing Body
                </label>
                <input
                  type="text"
                  name="medical_council"
                  value={doctorData.medical_council}
                  onChange={handleDoctorChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                  placeholder="State Medical Council / MCI / NMC"
                />
              </div>
            </div>

            {/* Verification Notice Banner */}
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5 text-cyan-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Administrative Medical Credential Verification Protocol
              </span>
              <p className="text-[11px] leading-relaxed text-slate-300">
                In compliance with clinical governance standards, newly onboarded physicians receive immediate access to the Clinician Cockpit, but diagnostic report sign-offs and prescription actions require administrative verification of board licensure.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-teal-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-teal-200" />
                  <span>Onboarding Physician Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Complete Physician Onboarding</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PATIENT REGISTRATION FORM (Step 1, 2, 3)                      */}
        {/* ------------------------------------------------------------- */}
        {selectedRole === 'patient' && (
          <form onSubmit={handlePatientSubmit} className="p-6 sm:p-8 space-y-6">

            {/* STEP 1: Account Credentials & Demographics */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4" /> 1. Account & Personal Biometrics
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono">* Required fields</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="full_name"
                      value={patientData.full_name}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                      placeholder="e.g. Johnathan Miller"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Email Address (Account Login) *
                    </label>
                    <input
                      type="email"
                      required
                      name="email"
                      value={patientData.email}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Account Password *
                    </label>
                    <input
                      type="password"
                      required
                      name="password"
                      value={patientData.password}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                      placeholder="Min 6 characters (e.g. Pass123!)"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Contact Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={patientData.phone}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                      placeholder="+1 (555) 234-5678"
                    />
                  </div>
                </div>

                {/* Physical Demographics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={patientData.date_of_birth}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="125"
                      name="age"
                      value={patientData.age}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                      placeholder="e.g. 46"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Biological Sex
                    </label>
                    <select
                      name="sex"
                      value={patientData.sex}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* Height, Weight & Live BMI Indicator */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-teal-400" /> Height & Weight Telemetry (BMI Evaluation)
                    </span>
                    {bmiInfo && (
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border ${bmiInfo.color}`}>
                        BMI: {bmiInfo.val} ({bmiInfo.label})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Height (cm)</label>
                      <input
                        type="number"
                        min="40"
                        max="250"
                        name="height_cm"
                        value={patientData.height_cm}
                        onChange={handlePatientChange}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                        placeholder="e.g. 178"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        min="2"
                        max="300"
                        step="0.5"
                        name="weight_kg"
                        value={patientData.weight_kg}
                        onChange={handlePatientChange}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                        placeholder="e.g. 82"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                    <Phone className="w-4 h-4 text-rose-400" />
                    <span>Emergency Clinical Contact (For Urgent Triage Alerts)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={patientData.emergency_contact_name}
                      onChange={handlePatientChange}
                      className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="Contact Name (e.g. Sarah Miller)"
                    />
                    <input
                      type="text"
                      name="emergency_contact_phone"
                      value={patientData.emergency_contact_phone}
                      onChange={handlePatientChange}
                      className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="Phone (e.g. +1 555-9876)"
                    />
                    <input
                      type="text"
                      name="emergency_contact_relation"
                      value={patientData.emergency_contact_relation}
                      onChange={handlePatientChange}
                      className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="Relation (e.g. Spouse / Sister)"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleNextStep(2)}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-2"
                >
                  <span>Continue to Medical History</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: Medical History, Medications & Allergies */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200 text-xs">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" /> 2. Clinical Medical History & Medications
                  </h2>
                  <span className="text-[11px] text-slate-400">Optional / Check if diagnosed</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                    <input
                      type="checkbox"
                      name="high_blood_pressure"
                      checked={patientData.high_blood_pressure}
                      onChange={handlePatientChange}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span className="text-slate-200">High Blood Pressure (Hypertension)</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                    <input
                      type="checkbox"
                      name="low_blood_pressure"
                      checked={patientData.low_blood_pressure}
                      onChange={handlePatientChange}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span className="text-slate-200">Low Blood Pressure (Hypotension)</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                    <input
                      type="checkbox"
                      name="has_heart_disease"
                      checked={patientData.has_heart_disease}
                      onChange={handlePatientChange}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span className="text-slate-200">Existing Coronary / Heart Disease</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                    <input
                      type="checkbox"
                      name="previous_cardiac_event"
                      checked={patientData.previous_cardiac_event}
                      onChange={handlePatientChange}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span className="text-slate-200">Previous Cardiac Event (MI, Stent, Bypass)</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                    <input
                      type="checkbox"
                      name="diabetes"
                      checked={patientData.diabetes}
                      onChange={handlePatientChange}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span className="text-slate-200">Diabetes Mellitus (Type 1 or 2)</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                    <input
                      type="checkbox"
                      name="thyroid_disorder"
                      checked={patientData.thyroid_disorder}
                      onChange={handlePatientChange}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span className="text-slate-200">Thyroid Disorder (Hypo / Hyperthyroidism)</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition sm:col-span-2">
                    <input
                      type="checkbox"
                      name="respiratory_condition"
                      checked={patientData.respiratory_condition}
                      onChange={handlePatientChange}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span className="text-slate-200">Respiratory Condition (Asthma, COPD, Sleep Apnea)</span>
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">
                    Other Diagnosed Conditions or Prior Surgeries
                  </label>
                  <input
                    type="text"
                    name="other_conditions"
                    value={patientData.other_conditions}
                    onChange={handlePatientChange}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-teal-400"
                    placeholder="e.g. Mild hyperlipidemia, atrial flutter history, pacemaker"
                  />
                </div>

                {/* Current Medications */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-cyan-400" /> Current Medications & Supplements
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Medication Name</label>
                      <input
                        type="text"
                        name="current_medication_name"
                        value={patientData.current_medication_name}
                        onChange={handlePatientChange}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                        placeholder="e.g. Metoprolol, Lisinopril, Aspirin"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Dosage & Frequency</label>
                      <input
                        type="text"
                        name="current_medication_dose"
                        value={patientData.current_medication_dose}
                        onChange={handlePatientChange}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                        placeholder="e.g. 50mg twice daily with meals"
                      />
                    </div>
                  </div>
                </div>

                {/* Known Allergies */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Known Drug or Environmental Allergies
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Allergen</label>
                      <input
                        type="text"
                        name="allergy_name"
                        value={patientData.allergy_name}
                        onChange={handlePatientChange}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                        placeholder="e.g. Penicillin, NSAIDs, Latex"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Allergy Severity</label>
                      <select
                        name="allergy_severity"
                        value={patientData.allergy_severity}
                        onChange={handlePatientChange}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                      >
                        <option value="mild">Mild (Rash, itching)</option>
                        <option value="moderate">Moderate (Hives, swelling)</option>
                        <option value="severe">Severe / Anaphylaxis</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextStep(3)}
                    className="w-2/3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-2"
                  >
                    <span>Continue to Lifestyle & Review</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Lifestyle, Review & Submission */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200 text-xs">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" /> 3. Lifestyle, Circumstances & Data Review
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Physical Activity Level
                    </label>
                    <select
                      name="physical_activity_level"
                      value={patientData.physical_activity_level}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                    >
                      <option value="sedentary">Sedentary (Desk work, little exercise)</option>
                      <option value="light">Light (1-2 days/week light activity)</option>
                      <option value="moderate">Moderate (3-5 days/week moderate workout)</option>
                      <option value="vigorous">Vigorous (6-7 days/week intense training)</option>
                      <option value="athlete">Trained Athlete (Sinus Bradycardia Expected)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">
                      Average Sleep Duration (Hours/Night)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="16"
                      name="sleep_duration_hours"
                      value={patientData.sleep_duration_hours}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">Smoking Status</label>
                    <select
                      name="smoking_habit"
                      value={patientData.smoking_habit}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                    >
                      <option value="non-smoker">Non-smoker</option>
                      <option value="former">Former smoker</option>
                      <option value="regular">Active smoker</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">Alcohol Intake</label>
                    <select
                      name="alcohol_consumption"
                      value={patientData.alcohol_consumption}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                    >
                      <option value="none">None (Teetotaler)</option>
                      <option value="occasional">Occasional</option>
                      <option value="moderate">Moderate</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1.5">Stress Level</label>
                    <select
                      name="stress_level"
                      value={patientData.stress_level}
                      onChange={handlePatientChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                    >
                      <option value="low">Low (Relaxed)</option>
                      <option value="moderate">Moderate (Normal)</option>
                      <option value="high">High (Elevated)</option>
                      <option value="severe">Severe (Distress)</option>
                    </select>
                  </div>
                </div>

                {/* Female Pregnancy Conditional */}
                {patientData.sex === 'Female' && (
                  <div className="p-4 rounded-2xl bg-pink-950/40 border border-pink-500/40 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-pink-200">
                      <input
                        type="checkbox"
                        name="is_pregnant"
                        checked={patientData.is_pregnant}
                        onChange={handlePatientChange}
                        className="w-4 h-4 rounded text-pink-500 focus:ring-pink-400 accent-pink-500"
                      />
                      <span>Currently Pregnant (Resting HR Adjustment Factor)</span>
                    </label>
                    {patientData.is_pregnant && (
                      <div className="pt-1">
                        <label className="block text-pink-300 mb-1 font-medium">Pregnancy Trimester</label>
                        <select
                          name="pregnancy_trimester"
                          value={patientData.pregnancy_trimester}
                          onChange={handlePatientChange}
                          className="w-full p-2 bg-slate-900 border border-pink-500/50 rounded-xl text-white focus:border-pink-400"
                        >
                          <option value={1}>1st Trimester (Weeks 1-12)</option>
                          <option value={2}>2nd Trimester (Weeks 13-26)</option>
                          <option value={3}>3rd Trimester (Weeks 27-40+)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* LIVE INTAKE DOSSIER REVIEW CARD */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-teal-500/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-400" /> Clinical Intake Dossier Summary
                    </span>
                    <span className="text-[10px] text-teal-300 font-mono">Verify before finalizing</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">PATIENT</span>
                      <span className="text-white font-bold truncate block">{patientData.full_name || '—'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">AGE & SEX</span>
                      <span className="text-white font-bold">{patientData.age || '—'} yrs &bull; {patientData.sex}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">BMI STATUS</span>
                      <span className="text-teal-300 font-bold">{bmiInfo ? `${bmiInfo.val} (${bmiInfo.label})` : '—'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">ACTIVITY</span>
                      <span className="text-white font-bold capitalize">{patientData.physical_activity_level}</span>
                    </div>
                  </div>

                  {/* Medical History Tags */}
                  <div className="pt-1">
                    <span className="text-[10px] font-mono text-slate-300 block mb-1">CLINICAL FLAGS:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {patientData.high_blood_pressure && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">Hypertension</span>}
                      {patientData.low_blood_pressure && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono">Hypotension</span>}
                      {patientData.has_heart_disease && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono">Heart Disease</span>}
                      {patientData.previous_cardiac_event && <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono">Prior Cardiac Event</span>}
                      {patientData.diabetes && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">Diabetes</span>}
                      {patientData.thyroid_disorder && <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">Thyroid</span>}
                      {patientData.respiratory_condition && <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">Respiratory</span>}
                      {patientData.is_pregnant && <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-mono">Pregnant (T{patientData.pregnancy_trimester})</span>}
                      {!patientData.high_blood_pressure && !patientData.low_blood_pressure && !patientData.has_heart_disease && !patientData.previous_cardiac_event && !patientData.diabetes && !patientData.thyroid_disorder && !patientData.respiratory_condition && (
                        <span className="text-slate-400 italic text-[11px]">No pre-existing cardiac conditions reported</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consent Management */}
                <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/40 space-y-2.5">
                  <span className="font-semibold text-teal-300 block flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-400" /> Patient Privacy & Health Consent
                  </span>
                  <label className="flex items-start gap-2.5 text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      name="consent_data_processing"
                      checked={patientData.consent_data_processing}
                      onChange={handlePatientChange}
                      className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                    />
                    <span>
                      I consent to encrypted storage of vital signs telemetry and clinical safety processing under HIPAA and DPDPA standards. *
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition"
                  >
                    Back to History
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin text-teal-200" />
                        <span>Creating Patient Profile...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

      </div>
    </div>
  );
};
