import React, { useState } from 'react';
import { UserPlus, ArrowLeft, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface RegisterPageProps {
  onNavigate: (tab: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Account
    email: '',
    password: '',
    full_name: '',
    role: 'patient',
    // Personal
    age: '',
    sex: 'Male',
    height_cm: '',
    weight_kg: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    // Medical History
    has_heart_disease: false,
    high_blood_pressure: false,
    low_blood_pressure: false,
    diabetes: false,
    thyroid_disorder: false,
    previous_cardiac_event: false,
    respiratory_condition: false,
    other_conditions: '',
    // Lifestyle
    smoking_habit: 'non-smoker',
    alcohol_consumption: 'occasional',
    physical_activity_level: 'moderate',
    sleep_duration_hours: 7.0,
    stress_level: 'moderate',
    caffeine_intake: 'moderate',
    daily_exercise_habits: '',
    // Special Circumstances
    is_pregnant: false,
    pregnancy_trimester: 1,
    recent_illness_or_fever: false,
    // Medication
    current_medication_name: '',
    current_medication_dose: '',
    // Consent
    consent_data_processing: true,
    consent_ai_analysis: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Create User
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role
      });

      // 2. Update Patient Profile Details
      await api.updatePatientProfile({
        age: formData.age ? Number(formData.age) : undefined,
        sex: formData.sex,
        height_cm: formData.height_cm ? Number(formData.height_cm) : undefined,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
        phone: formData.phone,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relation: formData.emergency_contact_relation,
        smoking_habit: formData.smoking_habit,
        alcohol_consumption: formData.alcohol_consumption,
        physical_activity_level: formData.physical_activity_level,
        sleep_duration_hours: Number(formData.sleep_duration_hours),
        stress_level: formData.stress_level,
        caffeine_intake: formData.caffeine_intake,
        daily_exercise_habits: formData.daily_exercise_habits,
        is_pregnant: formData.is_pregnant,
        pregnancy_trimester: formData.is_pregnant ? Number(formData.pregnancy_trimester) : undefined,
        recent_illness_or_fever: formData.recent_illness_or_fever
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
        other_conditions: formData.other_conditions
      });

      // 4. Add medication if specified
      if (formData.current_medication_name) {
        await api.addMedication({
          name: formData.current_medication_name,
          dosage: formData.current_medication_dose,
          affects_heart_rate: false
        });
      }

      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 to-slate-900 text-white p-6">
          <button
            onClick={() => onNavigate('login')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-400" />
            Patient Clinical Registration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete your comprehensive health intake for contextual AI decision support.
          </p>

          {/* Stepper */}
          <div className="flex items-center justify-between mt-4 text-xs font-semibold text-slate-400 border-t border-navy-800 pt-3">
            <span className={step >= 1 ? 'text-teal-300' : ''}>1. Account & Personal</span>
            <span className={step >= 2 ? 'text-teal-300' : ''}>2. Medical History</span>
            <span className={step >= 3 ? 'text-teal-300' : ''}>3. Lifestyle & Review</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* STEP 1: Account & Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">A. Personal Credentials</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="e.g. Johnathan Miller"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="e.g. 46"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Biological Sex</label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    name="height_cm"
                    value={formData.height_cm}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="178"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight_kg"
                    value={formData.weight_kg}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="82"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-semibold text-slate-700 block">Emergency Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    className="p-1.5 border border-slate-300 rounded-lg"
                    placeholder="Contact Name"
                  />
                  <input
                    type="text"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    className="p-1.5 border border-slate-300 rounded-lg"
                    placeholder="Contact Phone"
                  />
                  <input
                    type="text"
                    name="emergency_contact_relation"
                    value={formData.emergency_contact_relation}
                    onChange={handleChange}
                    className="p-1.5 border border-slate-300 rounded-lg"
                    placeholder="Relationship"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-lg text-xs shadow transition"
              >
                Continue to Medical History
              </button>
            </div>
          )}

          {/* STEP 2: Medical History & Medications */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">B. Clinical History</h3>
              <p className="text-slate-500 text-[11px]">
                Check known diagnosed medical conditions. Unchecked boxes indicate negative or unknown history.
              </p>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="high_blood_pressure" checked={formData.high_blood_pressure} onChange={handleChange} className="rounded text-teal-600" />
                  <span>High Blood Pressure (Hypertension)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="has_heart_disease" checked={formData.has_heart_disease} onChange={handleChange} className="rounded text-teal-600" />
                  <span>Existing Heart Disease</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="previous_cardiac_event" checked={formData.previous_cardiac_event} onChange={handleChange} className="rounded text-teal-600" />
                  <span>Previous Cardiac Event (MI, Stent)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="diabetes" checked={formData.diabetes} onChange={handleChange} className="rounded text-teal-600" />
                  <span>Diabetes (Type 1 or 2)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="thyroid_disorder" checked={formData.thyroid_disorder} onChange={handleChange} className="rounded text-teal-600" />
                  <span>Thyroid Disorder</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="respiratory_condition" checked={formData.respiratory_condition} onChange={handleChange} className="rounded text-teal-600" />
                  <span>Respiratory (Asthma, COPD)</span>
                </label>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Other Diagnosed Conditions</label>
                <input
                  type="text"
                  name="other_conditions"
                  value={formData.other_conditions}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="e.g. Mild hyperlipidemia, seasonal allergies"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-700 block">Current Medications & Supplements</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="current_medication_name"
                    value={formData.current_medication_name}
                    onChange={handleChange}
                    className="p-1.5 border border-slate-300 rounded-lg"
                    placeholder="Medication name (e.g. Metoprolol, Lisinopril)"
                  />
                  <input
                    type="text"
                    name="current_medication_dose"
                    value={formData.current_medication_dose}
                    onChange={handleChange}
                    className="p-1.5 border border-slate-300 rounded-lg"
                    placeholder="Dosage & frequency (e.g. 50mg daily)"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-2/3 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-lg shadow transition"
                >
                  Continue to Lifestyle & Consent
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Lifestyle & Review */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">C. Lifestyle & Circumstances</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Physical Activity</label>
                  <select name="physical_activity_level" value={formData.physical_activity_level} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="sedentary">Sedentary (Little to no exercise)</option>
                    <option value="light">Light (1-2 days/week)</option>
                    <option value="moderate">Moderate (3-5 days/week)</option>
                    <option value="vigorous">Vigorous (6-7 days/week)</option>
                    <option value="athlete">Trained Endurance Athlete</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sleep Duration (hrs/night)</label>
                  <input type="number" step="0.5" name="sleep_duration_hours" value={formData.sleep_duration_hours} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Smoking Habit</label>
                  <select name="smoking_habit" value={formData.smoking_habit} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="non-smoker">Non-smoker</option>
                    <option value="former">Former smoker</option>
                    <option value="regular">Regular smoker</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Caffeine Intake</label>
                  <select name="caffeine_intake" value={formData.caffeine_intake} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="none">None</option>
                    <option value="low">Low (1 cup)</option>
                    <option value="moderate">Moderate (2-3 cups)</option>
                    <option value="high">High (4+ cups / Energy drinks)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Stress Level</label>
                  <select name="stress_level" value={formData.stress_level} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              {formData.sex === 'Female' && (
                <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-200">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input type="checkbox" name="is_pregnant" checked={formData.is_pregnant} onChange={handleChange} className="rounded text-pink-600" />
                    <span>Currently Pregnant (Physiological Resting HR Modifier)</span>
                  </label>
                </div>
              )}

              {/* Consent Management */}
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 space-y-2">
                <span className="font-semibold text-teal-900 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" /> Patient Privacy & AI Consent
                </span>
                <label className="flex items-start gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" name="consent_data_processing" checked={formData.consent_data_processing} onChange={handleChange} className="mt-0.5 rounded text-teal-600" />
                  <span>I consent to secure vital sign storage and clinical rule evaluation under healthcare privacy standards.</span>
                </label>
                <label className="flex items-start gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" name="consent_ai_analysis" checked={formData.consent_ai_analysis} onChange={handleChange} className="mt-0.5 rounded text-teal-600" />
                  <span>I consent to AI-assisted educational clinical decision support (CDSS) processing.</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-lg shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Creating Patient Profile...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}

        </form>

      </div>
    </div>
  );
};
