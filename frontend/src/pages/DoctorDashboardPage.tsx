import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Search, UserCheck, ShieldAlert, CheckCircle2, AlertTriangle,
  FileText, ChevronRight, Activity, Clock, PenTool, Monitor, Radio,
  Calendar, Award, User, ShieldCheck, Download, Plus, X, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { BedsideTelemetryMonitor } from '../components/BedsideTelemetryMonitor';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Active view tab in Doctor portal
  const [activeTab, setActiveTab] = useState<'submissions' | 'patients' | 'appointments' | 'profile'>('submissions');

  // 1. Patient Roster & Dossier State
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientDossier, setPatientDossier] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showMonitorModal, setShowMonitorModal] = useState(false);

  // Clinician Sign-off state
  const [activeReportToReview, setActiveReportToReview] = useState<any | null>(null);
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [recommendedFollowup, setRecommendedFollowup] = useState('Routine 3-month clinic follow-up');
  const [signing, setSigning] = useState(false);
  const [viewingReportModal, setViewingReportModal] = useState<any | null>(null);

  // 2. ECG Submissions Queue State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeSubmissionForObservation, setActiveSubmissionForObservation] = useState<any | null>(null);
  const [obsText, setObsText] = useState('');
  const [obsDiagnosis, setObsDiagnosis] = useState('');
  const [obsRecommendations, setObsRecommendations] = useState('');
  const [obsUrgency, setObsUrgency] = useState('routine');
  const [savingObs, setSavingObs] = useState(false);

  // 3. Appointments & Availability State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [showBookApptModal, setShowBookApptModal] = useState(false);
  const [bookPatientId, setBookPatientId] = useState<number | ''>('');
  const [bookDateTime, setBookDateTime] = useState('');
  const [bookType, setBookType] = useState('telehealth');
  const [bookReason, setBookReason] = useState('ECG rhythm follow-up and review');
  const [bookingAppt, setBookingAppt] = useState(false);

  // 4. Doctor Profile State
  const [doctorProfile, setDoctorProfile] = useState<any | null>(null);
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editHospital, setEditHospital] = useState('');
  const [editQuals, setEditQuals] = useState('');
  const [editExp, setEditExp] = useState(10);
  const [editBio, setEditBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
    fetchSubmissions();
    fetchAppointments();
  }, []);

  const fetchDoctorProfile = async () => {
    try {
      const data = await api.getDoctorProfile();
      setDoctorProfile(data);
      setEditSpecialty(data.specialty || 'Clinical Cardiology & Electrophysiology');
      setEditHospital(data.hospital_affiliation || 'Metropolitan Heart & Vascular Institute');
      setEditQuals(data.qualifications || 'MBBS, MD (Cardiology), FACC');
      setEditExp(data.years_of_experience || 12);
      setEditBio(data.bio || 'Consultant Cardiologist specializing in clinical cardiac electrophysiology and rhythm management.');
    } catch (e) {
      console.error('Failed to load doctor profile', e);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const data = await api.getDoctorECGSubmissions();
      setSubmissions(data);
    } catch (e) {
      console.error('Failed to load ECG submissions', e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoadingAppts(true);
      const [appts, avails] = await Promise.all([
        api.getDoctorAppointments().catch(() => []),
        api.getDoctorAvailability().catch(() => [])
      ]);
      setAppointments(appts);
      setAvailability(avails);
    } catch (e) {
      console.error('Failed to load appointments', e);
    } finally {
      setLoadingAppts(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctorPatients(searchQuery);
      setPatients(data);
      if (!selectedPatientId && data.length > 0) {
        loadPatientDossier(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load patient roster', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDossier = async (patientId: number) => {
    try {
      setDossierLoading(true);
      setSelectedPatientId(patientId);
      const dossier = await api.getDoctorPatientDossier(patientId);
      setPatientDossier(dossier);
    } catch (e) {
      console.error('Failed to load patient dossier', e);
    } finally {
      setDossierLoading(false);
    }
  };

  // Sign report
  const handleSignReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReportToReview) return;
    try {
      setSigning(true);
      await api.reviewDoctorReport(activeReportToReview.id, {
        clinician_notes: clinicianNotes,
        recommended_followup: recommendedFollowup,
        approved: true
      });
      showToast('Report Approved & Signed', 'Digitally stamped into patient medical record', 'success');
      setActiveReportToReview(null);
      if (selectedPatientId) {
        await loadPatientDossier(selectedPatientId);
      }
    } catch (err: any) {
      showToast('Approval Error', err.message, 'error');
    } finally {
      setSigning(false);
    }
  };

  // Record Clinical Observation on ECG Submission
  const handleRecordObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmissionForObservation?.upload_id) return;
    try {
      setSavingObs(true);
      await api.recordClinicalObservation(activeSubmissionForObservation.upload_id, {
        observations_text: obsText,
        differential_diagnosis: obsDiagnosis,
        recommendations: obsRecommendations,
        urgency_level: obsUrgency
      });
      showToast('Clinical Observation Saved', 'Digital signature stamped and notification sent to patient.', 'success');
      setActiveSubmissionForObservation(null);
      fetchSubmissions();
    } catch (err: any) {
      showToast('Failed to Save Observation', err.message, 'error');
    } finally {
      setSavingObs(false);
    }
  };

  // Book Appointment with double-booking validation
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookPatientId || !bookDateTime) {
      showToast('Missing Details', 'Please choose a patient and date/time.', 'warning');
      return;
    }

    try {
      setBookingAppt(true);
      await api.scheduleDoctorAppointment({
        patient_id: Number(bookPatientId),
        appointment_date: new Date(bookDateTime).toISOString(),
        appointment_type: bookType,
        reason: bookReason
      });
      showToast('Appointment Scheduled', 'Consultation slot reserved without conflicts.', 'success');
      setShowBookApptModal(false);
      fetchAppointments();
    } catch (err: any) {
      showToast('Scheduling Conflict', err.message || 'Time slot already occupied.', 'error');
    } finally {
      setBookingAppt(false);
    }
  };

  // Save Doctor Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.updateDoctorProfile({
        specialty: editSpecialty,
        hospital_affiliation: editHospital,
        qualifications: editQuals,
        years_of_experience: Number(editExp),
        bio: editBio
      });
      showToast('Profile Updated', 'Clinician credentials updated successfully.', 'success');
      fetchDoctorProfile();
    } catch (err: any) {
      showToast('Update Error', err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'GREEN':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'YELLOW':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'ORANGE':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'RED':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Clinician Command Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {doctorProfile?.full_name || user?.full_name || 'Dr. Sarah Chen, MD'}
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase border ${doctorProfile?.is_verified
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                {doctorProfile?.is_verified ? 'Verified Cardiologist' : 'Verification Pending'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {doctorProfile?.hospital_affiliation || 'Metropolitan Heart & Vascular Institute'} • License: {doctorProfile?.license_number || 'MD-84920'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMonitorModal(!showMonitorModal)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition"
          >
            <Monitor className="w-4 h-4" />
            <span>{showMonitorModal ? 'Hide ICU Monitor' : 'Launch ICU Bedside Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Bedside Telemetry Monitor Section if Toggled */}
      {showMonitorModal && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 text-xs font-mono text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 animate-pulse" />
              CLINICIAN TELEMETRY FEED: {patientDossier?.patient?.full_name || 'Active Inpatient'}
            </span>
          </div>
          <BedsideTelemetryMonitor
            initialBpm={patientDossier?.latest_bpm || 74}
            patientName={patientDossier?.patient?.full_name || 'Johnathan Miller'}
            bedId="BAY 04-ICU"
            height={380}
          />
        </div>
      )}

      {/* Portal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${activeTab === 'submissions'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
        >
          <Activity className="w-4 h-4" />
          <span>ECG Submissions Queue</span>
          {submissions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono">
              {submissions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('patients')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${activeTab === 'patients'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Patient Roster & Dossiers</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono">
            {patients.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${activeTab === 'appointments'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Consultation Schedule</span>
          {appointments.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono">
              {appointments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${activeTab === 'profile'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
        >
          <Award className="w-4 h-4" />
          <span>Doctor Credentials & Verification</span>
        </button>
      </div>

      {/* TAB 1: ECG SUBMISSIONS QUEUE */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Patient ECG Submissions for Review</h3>
                <p className="text-xs text-slate-400">
                  Real-time clinical review queue for electrocardiograms uploaded and transmitted by patients.
                </p>
              </div>
              <button
                onClick={fetchSubmissions}
                className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Queue
              </button>
            </div>

            {loadingSubmissions ? (
              <p className="text-center text-xs text-slate-500 py-10 font-mono">Loading incoming submissions...</p>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-slate-200 text-sm">Review Queue Clear</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All submitted electrocardiograms have been clinically observed and approved.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissions.map((sub) => (
                  <div
                    key={sub.report_id}
                    className="p-5 rounded-2xl border border-slate-700/80 bg-slate-900/60 space-y-4 shadow-lg hover:border-teal-500/60 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{sub.patient_name}</span>
                          <span className="text-[10px] font-mono text-teal-400">{sub.patient_code}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {sub.patient_age ? `${sub.patient_age}y • ${sub.patient_sex}` : ''} • Submitted: {new Date(sub.submitted_at).toLocaleString()}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getTierColor(sub.ai_findings?.risk_tier || 'GREEN')}`}>
                        TIER {sub.ai_findings?.risk_tier || 'GREEN'}
                      </span>
                    </div>

                    {/* AI Findings Summary */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          {sub.ai_findings?.classification || 'Normal Sinus Rhythm'}
                        </span>
                        <span className="font-mono text-teal-400 font-bold">
                          {sub.ai_findings?.heart_rate_bpm || sub.hr || '--'} BPM
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
                        <div>BP: <strong className="text-slate-200">{sub.bp || '120/80'}</strong></div>
                        <div>QRS: <strong className="text-slate-200">{sub.ai_findings?.qrs_duration_ms || 88}ms</strong></div>
                        <div>QTc: <strong className="text-slate-200">{sub.ai_findings?.qtc_interval_ms || 410}ms</strong></div>
                      </div>

                      {sub.patient_notes && (
                        <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800">
                          "{sub.patient_notes}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] font-mono">
                        {sub.is_clinician_approved ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed & Signed
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3.5 h-3.5" /> Pending Clinician Review
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {sub.upload_id && (
                          <a
                            href={api.getECGPdfUrl(sub.upload_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setActiveSubmissionForObservation(sub);
                            setObsText(`Evaluated Lead II telemetry for ${sub.patient_name}. Rhythm shows ${sub.ai_findings?.classification || 'Normal Sinus Rhythm'} at ${sub.ai_findings?.heart_rate_bpm || 74} BPM.`);
                            setObsDiagnosis(sub.ai_findings?.classification || 'Normal resting rhythm');
                            setObsRecommendations('Continue current cardiac regimen. Re-evaluate if palpitations recur.');
                          }}
                          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-md shadow-teal-500/20 flex items-center gap-1 transition"
                        >
                          <PenTool className="w-3 h-3" />
                          Clinical Sign-Off
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT ROSTER & DOSSIERS (Preserved & Enhanced) */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search & Patient Roster (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Patient Triage Roster
                </h3>
                <span className="text-xs text-teal-400 font-mono">{patients.length} records</span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search patient by name or ID (e.g. PAT-2026)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-200 placeholder-slate-500 font-mono"
                />
              </div>

              <div className="space-y-2 max-h-[580px] overflow-y-auto">
                {loading ? (
                  <p className="text-center text-xs text-slate-500 py-6 font-mono">Loading patient roster...</p>
                ) : patients.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6 font-mono">No matching patient records found.</p>
                ) : (
                  patients.map((pat) => (
                    <button
                      key={pat.id}
                      onClick={() => loadPatientDossier(pat.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between text-xs ${selectedPatientId === pat.id
                          ? 'bg-teal-950/50 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                          : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-700/60'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{pat.full_name}</span>
                          <span className="text-[10px] text-teal-400 font-mono">{pat.patient_id_code}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {pat.age}y • {pat.sex} {pat.has_heart_disease ? '• Known CVD' : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          Latest: <strong className="text-emerald-400">{pat.latest_bpm ? `${pat.latest_bpm} BPM` : 'No readings'}</strong>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 font-mono">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pat.alert_level === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse' :
                            pat.alert_level === 'ORANGE' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                              pat.alert_level === 'YELLOW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                          {pat.alert_level}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Patient Dossier & Sign-Off (7 cols) */}
          <div className="lg:col-span-7">
            {!patientDossier ? (
              <div className="glass-panel rounded-3xl border border-slate-700/80 p-12 text-center text-slate-400 space-y-3">
                <UserCheck className="w-12 h-12 text-teal-400 mx-auto" />
                <h3 className="font-bold text-base text-slate-200">Select a Patient</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-mono">
                  Select a patient from the triage roster on the left to review telemetry history,
                  AI observations, and approve diagnostic reports.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dossier Header */}
                <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">{patientDossier.patient.full_name}</h2>
                      <div className="text-xs text-teal-400 font-mono mt-0.5">
                        ID: {patientDossier.patient.patient_id_code} • {patientDossier.patient.age} yrs • {patientDossier.patient.sex}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">
                        Emergency Contact: {patientDossier.patient.emergency_contact}
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-slate-800 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-lg">
                      {patientDossier.patient.activity_level} activity
                    </span>
                  </div>

                  {/* Medical History & Active Medications */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-300 block mb-1 font-mono">Diagnosed Conditions:</span>
                      <ul className="text-slate-400 space-y-0.5 text-[11px] font-mono">
                        {patientDossier.medical_history?.high_blood_pressure && <li>• Hypertension</li>}
                        {patientDossier.medical_history?.has_heart_disease && <li>• Existing Heart Disease</li>}
                        {patientDossier.medical_history?.previous_cardiac_event && <li>• Prior Cardiac Event / Stent</li>}
                        {patientDossier.medical_history?.diabetes && <li>• Diabetes Mellitus</li>}
                        {!patientDossier.medical_history?.high_blood_pressure && !patientDossier.medical_history?.has_heart_disease && <li>• None reported</li>}
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold text-slate-300 block mb-1 font-mono">Active Medications:</span>
                      <ul className="text-slate-400 space-y-0.5 text-[11px] font-mono">
                        {patientDossier.medications.length > 0 ? (
                          patientDossier.medications.map((m: any, i: number) => (
                            <li key={i}>• {m.name} ({m.dosage || 'Prescribed'})</li>
                          ))
                        ) : (
                          <li>• None reported</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Reports Pending Review & Approval */}
                <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">
                      Clinical Reports for Clinician Review
                    </h3>
                    <span className="text-xs text-teal-400 font-mono">{patientDossier.reports?.length || 0} reports</span>
                  </div>

                  {patientDossier.reports?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 font-mono">No reports generated for this patient yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientDossier.reports.map((rep: any) => (
                        <div
                          key={rep.id}
                          className="p-3.5 rounded-2xl border border-slate-700/60 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200">{rep.title}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${rep.risk_level === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                                  rep.risk_level === 'ORANGE' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                                    rep.risk_level === 'YELLOW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}>
                                {rep.risk_level}
                              </span>
                            </div>
                            <div className="text-[10px] text-teal-400 font-mono mt-0.5">{rep.report_reference_code} • {rep.generated_at}</div>
                            <div className="mt-1 font-mono">
                              {rep.is_clinician_approved ? (
                                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Clinician Approved & Signed
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> Pending Clinician Sign-Off
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingReportModal(rep)}
                              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-medium transition"
                            >
                              Inspect
                            </button>
                            {!rep.is_clinician_approved && (
                              <button
                                onClick={() => {
                                  setActiveReportToReview(rep);
                                  setClinicianNotes(`Clinical observations reviewed. Reading of ${rep.report_data?.section_3_current_heart_rate?.bpm} BPM is consistent with patient history and current therapeutic regimen.`);
                                }}
                                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                <span>Sign Off</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sign-Off Editor Form Modal / Block */}
                {activeReportToReview && (
                  <div className="bg-teal-950/80 border-2 border-teal-500/80 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-teal-700/60 pb-2">
                      <h4 className="font-bold text-sm text-teal-200 flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-teal-400" />
                        Attending Clinician Review & Digital Signature
                      </h4>
                      <button
                        onClick={() => setActiveReportToReview(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleSignReport} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-200 mb-1">Doctor Clinical Evaluation Notes *</label>
                        <textarea
                          rows={3}
                          required
                          value={clinicianNotes}
                          onChange={(e) => setClinicianNotes(e.target.value)}
                          className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-100"
                          placeholder="Enter attending clinician notes..."
                        ></textarea>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-200 mb-1">Recommended Follow-up</label>
                        <input
                          type="text"
                          value={recommendedFollowup}
                          onChange={(e) => setRecommendedFollowup(e.target.value)}
                          className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-100"
                          placeholder="e.g. Schedule 24h Holter monitoring, Routine 3-month clinic visit"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-[11px] text-teal-400 font-mono italic">
                          Digital signature: SHA-256 encrypted hash will be bound to report.
                        </div>
                        <button
                          type="submit"
                          disabled={signing}
                          className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                        >
                          {signing ? 'Signing...' : 'Approve & Affix Medical Signature'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: APPOINTMENTS & CONSULTATION SCHEDULER */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Clinical Consultations & Telehealth Schedule</h3>
                <p className="text-xs text-slate-400">
                  Book and manage patient appointments with real-time double-booking prevention.
                </p>
              </div>
              <button
                onClick={() => setShowBookApptModal(true)}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Schedule Consultation
              </button>
            </div>

            {/* Scheduled Appointments Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Upcoming Patient Appointments ({appointments.length})
              </h4>

              {loadingAppts ? (
                <p className="text-center text-xs text-slate-500 py-6">Loading schedule...</p>
              ) : appointments.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">No scheduled appointments on file.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {appointments.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{a.patient_name}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 capitalize">
                          {a.status}
                        </span>
                      </div>
                      <p className="text-slate-400 font-mono text-[11px]">
                        Date: <strong className="text-slate-200">{new Date(a.appointment_date).toLocaleString()}</strong>
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Type: <span className="capitalize text-teal-300">{a.appointment_type}</span> • Reason: {a.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLINICIAN CREDENTIALS & VERIFICATION */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-xl space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Clinician Profile & Verification Status</h3>
                <p className="text-xs text-slate-400">
                  Manage medical licenses, qualifications, hospital affiliations, and board verifications.
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${doctorProfile?.is_verified
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                {doctorProfile?.is_verified ? 'VERIFIED CLINICIAN' : 'AWAITING ADMIN REVIEW'}
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Medical Specialty</label>
                  <input
                    type="text"
                    value={editSpecialty}
                    onChange={(e) => setEditSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Hospital / Clinic Affiliation</label>
                  <input
                    type="text"
                    value={editHospital}
                    onChange={(e) => setEditHospital(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Qualifications & Degrees</label>
                  <input
                    type="text"
                    value={editQuals}
                    onChange={(e) => setEditQuals(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Years of Clinical Experience</label>
                  <input
                    type="number"
                    value={editExp}
                    onChange={(e) => setEditExp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Professional Bio & Clinical Focus</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Observation Modal */}
      {activeSubmissionForObservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PenTool className="w-5 h-5 text-teal-400" />
                Record Clinical Observation & Sign-Off
              </h3>
              <button
                onClick={() => setActiveSubmissionForObservation(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordObservation} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Attending Clinician Observations *</label>
                <textarea
                  rows={3}
                  required
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Differential Diagnosis</label>
                <input
                  type="text"
                  value={obsDiagnosis}
                  onChange={(e) => setObsDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Recommendations & Next Steps</label>
                <input
                  type="text"
                  value={obsRecommendations}
                  onChange={(e) => setObsRecommendations(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-[10px] text-teal-400 font-mono">
                  Digital SHA-256 Signature affixed
                </span>
                <button
                  type="submit"
                  disabled={savingObs}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-teal-500/20 disabled:opacity-50"
                >
                  {savingObs ? 'Signing...' : 'Affix Digital Signature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showBookApptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" />
                Schedule Consultation Slot
              </h3>
              <button
                onClick={() => setShowBookApptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Select Patient *</label>
                <select
                  value={bookPatientId}
                  onChange={(e) => setBookPatientId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_id_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Consultation Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={bookDateTime}
                  onChange={(e) => setBookDateTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Consultation Modality</label>
                <select
                  value={bookType}
                  onChange={(e) => setBookType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                >
                  <option value="telehealth">Telehealth / Video Consultation</option>
                  <option value="in_person">In-Person Clinic Visit</option>
                  <option value="urgent_review">Urgent Arrhythmia Triage</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Reason / Clinical Objective</label>
                <input
                  type="text"
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookApptModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingAppt}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2 rounded-xl shadow-md shadow-teal-500/20 disabled:opacity-50"
                >
                  {bookingAppt ? 'Validating...' : 'Confirm Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {viewingReportModal && (
        <ReportViewerModal
          report={viewingReportModal}
          onClose={() => setViewingReportModal(null)}
        />
      )}
    </div>
  );
};
