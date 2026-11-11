export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'patient' | 'doctor' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  patientId?: number;
  doctorId?: number;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface MedicalHistory {
  id?: number;
  has_heart_disease: boolean;
  high_blood_pressure: boolean;
  low_blood_pressure: boolean;
  diabetes: boolean;
  thyroid_disorder: boolean;
  previous_cardiac_event: boolean;
  respiratory_condition: boolean;
  other_conditions?: string;
  notes?: string;
}

export interface Medication {
  id?: number;
  name: string;
  dosage?: string;
  frequency?: string;
  affects_heart_rate: boolean;
  effect_type?: string;
  start_date?: string;
  is_active?: boolean;
}

export interface Allergy {
  id?: number;
  allergen: string;
  reaction?: string;
  severity: string;
}

export interface PatientProfile {
  id: number;
  user_id: number;
  patient_id_code: string;
  full_name: string;
  email: string;
  age?: number;
  sex?: string;
  height_cm?: number;
  weight_kg?: number;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  smoking_habit: string;
  alcohol_consumption: string;
  physical_activity_level: string;
  sleep_duration_hours: number;
  stress_level: string;
  caffeine_intake: string;
  daily_exercise_habits?: string;
  is_pregnant: boolean;
  pregnancy_trimester?: number;
  recent_illness_or_fever: boolean;
  recent_illness_details?: string;
  medical_history?: MedicalHistory;
  medications: Medication[];
  allergies: Allergy[];
  created_at: string;
}

export interface Symptoms {
  chest_pain: boolean;
  severe_shortness_of_breath: boolean;
  fainting_or_syncope: boolean;
  stroke_signs: boolean;
  dizziness: boolean;
  palpitations: boolean;
  fatigue: boolean;
  nausea: boolean;
  confusion: boolean;
  cold_sweat: boolean;
  swelling_ankles: boolean;
  symptom_notes?: string;
}

export interface HeartRateReading {
  id: number;
  patient_id: number;
  bpm: number;
  resting_status: 'resting' | 'active' | 'post_exercise' | 'sleeping';
  measurement_method: 'manual' | 'simulated_wearable' | 'sensor';
  device_name: string;
  measurement_time: string;
  notes?: string;
  symptoms?: Symptoms;
  created_at?: string;
}

export interface EmergencyAlert {
  id?: number;
  alert_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  alert_title: string;
  alert_reason: string;
  clinical_rationale: string;
  emergency_actions: string[];
  hotline_number: string;
  dismissed?: boolean;
  created_at?: string;
}

export interface HealthRecommendation {
  category: 'general_wellness' | 'clinical_advisory' | 'urgent_triage';
  recommendation_text: string;
  priority: number;
}

export interface AIAnalysis {
  id?: number;
  observed_bpm: number;
  expected_min_bpm: number;
  expected_max_bpm: number;
  resting_hr_baseline?: number;
  average_hr_7d?: number;
  min_hr_7d?: number;
  max_hr_7d?: number;
  contextual_interpretation: string;
  physiological_factors: string[];
  unusual_patterns: string[];
  data_limitations: string;
  clinical_disclaimer: string;
  alert: EmergencyAlert;
  recommendations: HealthRecommendation[];
  created_at?: string;
}

export interface HealthReport {
  id: number;
  patient_id: number;
  report_reference_code: string;
  title: string;
  risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  summary: string;
  clinical_limitations: string;
  report_data: any;
  is_clinician_approved: boolean;
  generated_at: string;
  pdf_filename?: string;
  ecg_upload_id?: number;
  submission_status?: string;
  assigned_doctor_id?: number;
  patient_submission_notes?: string;
  submitted_at?: string;
}

export interface DoctorReview {
  id: number;
  report_id: number;
  doctor_name: string;
  doctor_specialty: string;
  clinician_notes: string;
  recommended_followup?: string;
  approved: boolean;
  reviewed_at: string;
}

export interface MetricsSummary {
  current_bpm: number | null;
  resting_heart_rate: number | null;
  average_bpm: number | null;
  min_bpm: number | null;
  max_bpm: number | null;
  total_readings_count: number;
  days_window: number;
  trend_data: Array<{
    id: number;
    timestamp: string;
    time_display: string;
    date: string;
    bpm: number;
    resting_status: string;
    method: string;
    device: string;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  is_emergency?: boolean;
  emergency_guidance?: EmergencyAlert;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  doctor_name?: string;
  patient_name?: string;
  appointment_date: string;
  appointment_type: 'in_person' | 'telehealth' | 'urgent_evaluation';
  status: 'scheduled' | 'completed' | 'cancelled';
  reason: string;
  clinical_notes?: string;
  created_at: string;
}

export interface AppointmentCreate {
  doctor_id: number;
  appointment_date: string;
  appointment_type?: string;
  reason: string;
  clinical_notes?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  patient_id?: number;
  sender_name?: string;
  sender_role?: string;
  recipient_name?: string;
  content: string;
  is_read: boolean;
  is_urgent: boolean;
  created_at: string;
}

export interface MessageCreate {
  recipient_id: number;
  patient_id?: number;
  content: string;
  is_urgent?: boolean;
}

export interface Notification {
  id: number;
  user_id: number;
  category: 'clinical_alert' | 'appointment' | 'message' | 'system' | 'report';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface Device {
  id: number;
  patient_id: number;
  device_name: string;
  device_type: string;
  serial_number: string;
  mac_address?: string;
  firmware_version?: string;
  is_connected: boolean;
  battery_level: number;
  last_sync_time?: string;
  created_at: string;
}

export interface DeviceRegister {
  device_name: string;
  device_type: string;
  serial_number: string;
  mac_address?: string;
  firmware_version?: string;
}

export interface EducationQuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface EducationModule {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  reading_time_minutes: number;
  clinical_peer_reviewed: boolean;
  quiz_questions: EducationQuizQuestion[];
  user_progress?: {
    completed: boolean;
    quiz_score?: number;
    completed_at?: string;
  };
}

export interface QuizResult {
  module_id: number;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  feedback: string;
}

export interface CardiovascularAnalytics {
  has_data: boolean;
  message?: string;
  resting_hr_delta_bpm?: number;
  baseline_status?: string;
  consistency_score_percentage?: number;
  circadian_distribution?: {
    morning_avg: number;
    afternoon_avg: number;
    evening_avg: number;
    night_avg: number;
  };
  summary_stats?: {
    total_readings: number;
    avg_hr: number;
    min_hr: number;
    max_hr: number;
    hr_variance: number;
    high_hr_count: number;
    low_hr_count: number;
    measurement_days_active: number;
  };
  clinical_context?: {
    activity_level: string;
    target_resting_range: string;
    interpretation: string;
  };
}

export interface AdminStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  verified_doctors: number;
  total_readings: number;
  total_analyses: number;
  total_reports: number;
  total_emergency_alerts: number;
  alert_distribution: Record<string, number>;
  system_status: string;
  api_version: string;
  database_connected: boolean;
  uptime_seconds: number;
}

export interface DoctorSummary {
  id: number;
  full_name: string;
  email: string;
  specialty?: string;
  hospital_affiliation?: string;
  license_number?: string;
}

