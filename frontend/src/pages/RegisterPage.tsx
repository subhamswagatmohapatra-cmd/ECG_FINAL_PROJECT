import React, { useState, useMemo } from 'react';
import {
  UserPlus, ArrowLeft, ShieldCheck, Check, Heart, Activity,
  AlertTriangle, Phone, User, Calendar, Lock, Pill, Info, ChevronRight, CheckCircle2, Sparkles, Scale
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprehensive Clinical Form State
  const [formData, setFormData] = useState({
    // Account & Credentials
    email: '',
    password: '',
    full_name: '',
    role: 'patient',

    // Personal & Biometrics
    date_of_birth: '',
    age: '',
    sex: 'Male',
    height_cm: '',
    weight_kg: '',
    phone: '',

    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',

    // Clinical Medical History
    has_heart_disease: false,
    high_blood_pressure: false,
    low_blood_pressure: false,
    diabetes: false,
    thyroid_disorder: false,
    previous_cardiac_event: false,
    respiratory_condition: false,
    other_conditions: '',

    // Lifestyle & Environmental Factors
    smoking_habit: 'non-smoker',
    alcohol_consumption: 'none',
    physical_activity_level: 'moderate',
    daily_exercise_habits: '',
    sleep_duration_hours: 7.0,
    stress_level: 'moderate',
    caffeine_intake: 'moderate',

    // Acute & Special Conditions
    is_pregnant: false,
    pregnancy_trimester: 1,
    recent_illness_or_fever: false,
    recent_illness_details: '',

    // Medications & Allergies
    current_medication_name: '',
    current_medication_dose: '',
    allergy_name: '',
    allergy_severity: 'moderate',

    // Patient Sovereignty & AI Consents
    consent_data_processing: true,
    consent_ai_analysis: true
  });

  // Calculate BMI live from Height (cm) and Weight (kg)
  const bmiInfo = useMemo(() => {
    const h = Number(formData.height_cm);
    const w = Number(formData.weight_kg);
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
  }, [formData.height_cm, formData.weight_kg]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => {
        const next = { ...prev, [name]: value };
        // Auto-calculate age from date of birth if changed
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

  const validateStep1 = () => {
    if (!formData.full_name.trim()) {
      setError('Please provide your full legal name.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid clinical email address.');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNextStep = (targetStep: number) => {
    if (step === 1 && !validateStep1()) return;
    setError(null);
    setStep(targetStep);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.consent_data_processing) {
      setError('You must grant vital signs processing consent to use the CardioPulse clinical platform.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Patient User Account
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role
      });

      // 2. Update Patient Biometric Profile
      await api.updatePatientProfile({
        date_of_birth: formData.date_of_birth || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        sex: formData.sex,
        height_cm: formData.height_cm ? Number(formData.height_cm) : undefined,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
        phone: formData.phone || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        emergency_contact_relation: formData.emergency_contact_relation || undefined,
        smoking_habit: formData.smoking_habit,
        alcohol_consumption: formData.alcohol_consumption,
        physical_activity_level: formData.physical_activity_level,
        daily_exercise_habits: formData.daily_exercise_habits || undefined,
        sleep_duration_hours: Number(formData.sleep_duration_hours) || 7.0,
        stress_level: formData.stress_level,
        caffeine_intake: formData.caffeine_intake,
        is_pregnant: formData.is_pregnant,
        pregnancy_trimester: formData.is_pregnant ? Number(formData.pregnancy_trimester) : undefined,
        recent_illness_or_fever: formData.recent_illness_or_fever,
        recent_illness_details: formData.recent_illness_details || undefined
      });

      // 3. Update Medical History
      await api.updateMedicalHistory({
        has_heart_disease: formData.has_heart_disease,
        high_blood_pressure: formData.high_blood_pressure,
        low_blood_pressure: formData.low_blood_pressure,
        diabetes: formData.diabetes,
        thyroid_disorder: formData.thyroid_disorder,
        previous_cardiac_event: formData.previous_cardiac_event,
        respiratory_condition: formData.respiratory_condition,
        other_conditions: formData.other_conditions || undefined
      });

      // 4. Add Medication if provided
      if (formData.current_medication_name.trim()) {
        await api.addMedication({
          name: formData.current_medication_name.trim(),
          dosage: formData.current_medication_dose.trim() || 'Unspecified dosage',
          affects_heart_rate: false
        });
      }

      // 5. Add Allergy if provided
      if (formData.allergy_name.trim()) {
        await api.addAllergy({
          allergen: formData.allergy_name.trim(),
          severity: formData.allergy_severity
        });
      }

      showToast('Registration Complete', `Welcome to CardioPulse AI, ${formData.full_name}!`, 'success');
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your credentials or network connection.');
      showToast('Registration Error', err.message || 'Failed to complete registration.', 'error');
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
                  <UserPlus className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Patient Clinical Registration
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Comprehensive health intake for personalized, physiologically adjusted cardiovascular monitoring.
              </p>
            </div>
            <span className="self-start sm:self-center text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Step {step} of 3
            </span>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-3 gap-2 mt-5 text-xs font-semibold pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => handleNextStep(1)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition ${
                step === 1
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
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition ${
                step === 2
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
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition ${
                step === 3
                  ? 'bg-teal-500 text-white font-bold shadow-md shadow-teal-500/30'
                  : 'bg-slate-900/60 text-slate-500'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">3</span>
              <span className="hidden sm:inline">Lifestyle & Review</span>
              <span className="sm:hidden">Review</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="bg-rose-950/40 border border-rose-500/60 text-rose-200 text-xs p-3.5 rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    placeholder="e.g. Johnathan Miller"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Email Address (Account Login) *
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Account Password *
                  </label>
                  <input
                    type="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    placeholder="Min 6 characters (e.g. Pass123!)"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    placeholder="+1 (555) 234-5678"
                  />
                </div>
              </div>

              {/* Physical Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    placeholder="e.g. 46"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Biological Sex
                  </label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="Male" className="bg-slate-900 text-white">Male</option>
                    <option value="Female" className="bg-slate-900 text-white">Female</option>
                    <option value="Other" className="bg-slate-900 text-white">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Height, Weight & Live BMI Indicator */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-3">
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
                    <label className="block text-slate-400 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      min="40"
                      max="250"
                      name="height_cm"
                      value={formData.height_cm}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="e.g. 178"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      min="2"
                      max="300"
                      step="0.5"
                      name="weight_kg"
                      value={formData.weight_kg}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="e.g. 82"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-3">
                <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                  <Phone className="w-4 h-4 text-rose-400" />
                  <span>Emergency Clinical Contact (For Urgent Triage Alerts)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                    placeholder="Contact Name (e.g. Sarah Miller)"
                  />
                  <input
                    type="text"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                    placeholder="Phone (e.g. +1 555-9876)"
                  />
                  <input
                    type="text"
                    name="emergency_contact_relation"
                    value={formData.emergency_contact_relation}
                    onChange={handleChange}
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

              <p className="text-slate-300 text-[11px] leading-relaxed">
                Check any condition diagnosed by a physician. Leave unchecked if negative or unknown.
                These factors calibrate resting thresholds and prevent false-positive tachycardia warnings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    name="high_blood_pressure"
                    checked={formData.high_blood_pressure}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span className="text-slate-200">High Blood Pressure (Hypertension)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    name="low_blood_pressure"
                    checked={formData.low_blood_pressure}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span className="text-slate-200">Low Blood Pressure (Hypotension)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    name="has_heart_disease"
                    checked={formData.has_heart_disease}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span className="text-slate-200">Existing Coronary / Heart Disease</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    name="previous_cardiac_event"
                    checked={formData.previous_cardiac_event}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span className="text-slate-200">Previous Cardiac Event (MI, Stent, Bypass)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    name="diabetes"
                    checked={formData.diabetes}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span className="text-slate-200">Diabetes Mellitus (Type 1 or 2)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    name="thyroid_disorder"
                    checked={formData.thyroid_disorder}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span className="text-slate-200">Thyroid Disorder (Hypo / Hyperthyroidism)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition sm:col-span-2">
                  <input
                    type="checkbox"
                    name="respiratory_condition"
                    checked={formData.respiratory_condition}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span className="text-slate-200">Respiratory Condition (Asthma, COPD, Sleep Apnea)</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Other Diagnosed Conditions or Prior Surgeries
                </label>
                <input
                  type="text"
                  name="other_conditions"
                  value={formData.other_conditions}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-teal-400"
                  placeholder="e.g. Mild hyperlipidemia, atrial flutter history, pacemaker"
                />
              </div>

              {/* Current Medications */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-cyan-400" /> Current Medications & Supplements
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Medication Name</label>
                    <input
                      type="text"
                      name="current_medication_name"
                      value={formData.current_medication_name}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="e.g. Metoprolol Tartrate, Lisinopril, Aspirin"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Dosage & Frequency</label>
                    <input
                      type="text"
                      name="current_medication_dose"
                      value={formData.current_medication_dose}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="e.g. 50mg twice daily with meals"
                    />
                  </div>
                </div>
              </div>

              {/* Known Allergies */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Known Drug or Environmental Allergies
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Allergen</label>
                    <input
                      type="text"
                      name="allergy_name"
                      value={formData.allergy_name}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:border-teal-400"
                      placeholder="e.g. Penicillin, NSAIDs, Latex"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Allergy Severity</label>
                    <select
                      name="allergy_severity"
                      value={formData.allergy_severity}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                    >
                      <option value="mild" className="bg-slate-900 text-white">Mild (Rash, itching)</option>
                      <option value="moderate" className="bg-slate-900 text-white">Moderate (Hives, swelling)</option>
                      <option value="severe" className="bg-slate-900 text-white">Severe / Anaphylaxis</option>
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
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Physical Activity Level
                  </label>
                  <select
                    name="physical_activity_level"
                    value={formData.physical_activity_level}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                  >
                    <option value="sedentary" className="bg-slate-900 text-white">Sedentary (Desk work, little exercise)</option>
                    <option value="light" className="bg-slate-900 text-white">Light (1-2 days/week light activity)</option>
                    <option value="moderate" className="bg-slate-900 text-white">Moderate (3-5 days/week moderate workout)</option>
                    <option value="vigorous" className="bg-slate-900 text-white">Vigorous (6-7 days/week intense training)</option>
                    <option value="athlete" className="bg-slate-900 text-white">Trained Endurance Athlete (Sinus Bradycardia Expected)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Average Sleep Duration (Hours/Night)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="16"
                    name="sleep_duration_hours"
                    value={formData.sleep_duration_hours}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Daily Exercise Habits / Sports
                </label>
                <input
                  type="text"
                  name="daily_exercise_habits"
                  value={formData.daily_exercise_habits}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-teal-400"
                  placeholder="e.g. 5km jog 3x weekly, swimming, yoga"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Smoking Status</label>
                  <select
                    name="smoking_habit"
                    value={formData.smoking_habit}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                  >
                    <option value="non-smoker" className="bg-slate-900 text-white">Non-smoker</option>
                    <option value="former" className="bg-slate-900 text-white">Former smoker</option>
                    <option value="regular" className="bg-slate-900 text-white">Active smoker</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Alcohol Intake</label>
                  <select
                    name="alcohol_consumption"
                    value={formData.alcohol_consumption}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                  >
                    <option value="none" className="bg-slate-900 text-white">None (Teetotaler)</option>
                    <option value="occasional" className="bg-slate-900 text-white">Occasional (1-2 drinks/month)</option>
                    <option value="moderate" className="bg-slate-900 text-white">Moderate (1-2 drinks/week)</option>
                    <option value="heavy" className="bg-slate-900 text-white">Heavy / Daily consumption</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Caffeine Intake</label>
                  <select
                    name="caffeine_intake"
                    value={formData.caffeine_intake}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                  >
                    <option value="none" className="bg-slate-900 text-white">None</option>
                    <option value="low" className="bg-slate-900 text-white">Low (1 cup coffee/tea daily)</option>
                    <option value="moderate" className="bg-slate-900 text-white">Moderate (2-3 cups daily)</option>
                    <option value="high" className="bg-slate-900 text-white">High (4+ cups or energy drinks)</option>
                  </select>
                </div>
              </div>

              {/* Stress Level */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Subjective Stress Level</label>
                <select
                  name="stress_level"
                  value={formData.stress_level}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-400"
                >
                  <option value="low" className="bg-slate-900 text-white">Low (Relaxed, well-managed)</option>
                  <option value="moderate" className="bg-slate-900 text-white">Moderate (Typical work/life demands)</option>
                  <option value="high" className="bg-slate-900 text-white">High (Chronic fatigue or anxiety)</option>
                  <option value="severe" className="bg-slate-900 text-white">Severe (Extreme distress)</option>
                </select>
              </div>

              {/* Pregnancy Conditional Section */}
              {formData.sex === 'Female' && (
                <div className="p-4 rounded-2xl bg-pink-950/30 border border-pink-500/40 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-pink-200">
                    <input
                      type="checkbox"
                      name="is_pregnant"
                      checked={formData.is_pregnant}
                      onChange={handleChange}
                      className="w-4 h-4 rounded text-pink-500 focus:ring-pink-400 accent-pink-500"
                    />
                    <span>Currently Pregnant (Physiological Resting Heart Rate Elevation Factor)</span>
                  </label>
                  {formData.is_pregnant && (
                    <div className="pt-1">
                      <label className="block text-pink-300 mb-1 font-medium">Pregnancy Trimester</label>
                      <select
                        name="pregnancy_trimester"
                        value={formData.pregnancy_trimester}
                        onChange={handleChange}
                        className="w-full p-2 bg-slate-900 border border-pink-500/50 rounded-xl text-white focus:border-pink-400"
                      >
                        <option value={1} className="bg-slate-900 text-white">1st Trimester (Weeks 1-12)</option>
                        <option value={2} className="bg-slate-900 text-white">2nd Trimester (Weeks 13-26)</option>
                        <option value={3} className="bg-slate-900 text-white">3rd Trimester (Weeks 27-40+)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Illness or Fever Checkbox */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    name="recent_illness_or_fever"
                    checked={formData.recent_illness_or_fever}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span>Recent Illness, Infection, or Fever Within Last 7 Days</span>
                </label>
                {formData.recent_illness_or_fever && (
                  <input
                    type="text"
                    name="recent_illness_details"
                    value={formData.recent_illness_details}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-teal-400"
                    placeholder="e.g. Viral flu with 38.5°C fever 3 days ago"
                  />
                )}
              </div>

              {/* LIVE INTAKE DOSSIER REVIEW CARD */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" /> Clinical Intake Dossier Review
                  </span>
                  <span className="text-[10px] text-teal-300 font-mono">Verify before finalizing</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">PATIENT</span>
                    <span className="text-slate-200 font-semibold truncate block">{formData.full_name || '—'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">AGE & SEX</span>
                    <span className="text-slate-200 font-semibold">{formData.age || '—'} yrs &bull; {formData.sex}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">BMI STATUS</span>
                    <span className="text-teal-300 font-semibold">{bmiInfo ? `${bmiInfo.val} (${bmiInfo.label})` : '—'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">ACTIVITY</span>
                    <span className="text-slate-200 font-semibold capitalize">{formData.physical_activity_level}</span>
                  </div>
                </div>

                {/* Medical History Tags */}
                <div className="pt-1">
                  <span className="text-[10px] font-mono text-slate-400 block mb-1">CLINICAL FLAGS:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.high_blood_pressure && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">Hypertension</span>}
                    {formData.low_blood_pressure && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono">Hypotension</span>}
                    {formData.has_heart_disease && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono">Heart Disease</span>}
                    {formData.previous_cardiac_event && <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono">Prior Cardiac Event</span>}
                    {formData.diabetes && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">Diabetes</span>}
                    {formData.thyroid_disorder && <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">Thyroid</span>}
                    {formData.respiratory_condition && <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">Respiratory</span>}
                    {formData.is_pregnant && <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-mono">Pregnant (T{formData.pregnancy_trimester})</span>}
                    {formData.recent_illness_or_fever && <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-mono">Recent Fever</span>}
                    {!formData.high_blood_pressure && !formData.low_blood_pressure && !formData.has_heart_disease && !formData.previous_cardiac_event && !formData.diabetes && !formData.thyroid_disorder && !formData.respiratory_condition && (
                      <span className="text-slate-400 italic text-[11px]">No pre-existing cardiac conditions reported</span>
                    )}
                  </div>
                </div>

                {formData.current_medication_name && (
                  <div className="pt-1 text-[11px] text-slate-300 font-mono">
                    <span className="text-slate-500">MEDICATION: </span>
                    <span className="text-teal-300 font-semibold">{formData.current_medication_name}</span> ({formData.current_medication_dose || 'standard dose'})
                  </div>
                )}
              </div>

              {/* Consent Management */}
              <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-500/40 space-y-2.5">
                <span className="font-semibold text-teal-300 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-400" /> Patient Privacy & AI Decision Support Consent
                </span>
                <label className="flex items-start gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent_data_processing"
                    checked={formData.consent_data_processing}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span>
                    I consent to encrypted storage of vital signs telemetry and clinical safety rule processing under HIPAA and DPDPA healthcare standards. *
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent_ai_analysis"
                    checked={formData.consent_ai_analysis}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 accent-teal-500"
                  />
                  <span>
                    I consent to AI-assisted educational interpretation and contextual clinical decision support.
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

      </div>
    </div>
  );
};
