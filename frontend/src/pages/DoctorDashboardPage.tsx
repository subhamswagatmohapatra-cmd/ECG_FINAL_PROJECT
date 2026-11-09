import React, { useState, useEffect } from 'react';
import { Stethoscope, Search, UserCheck, ShieldAlert, CheckCircle2, AlertTriangle, FileText, ChevronRight, Activity, Clock, PenTool, Monitor, Radio } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { BedsideTelemetryMonitor } from '../components/BedsideTelemetryMonitor';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
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

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctorPatients(searchQuery);
      setPatients(data);
      // Automatically select first patient if none selected
      if (!selectedPatientId && data.length > 0) {
        loadPatientDossier(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load patient roster', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery]);

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
      alert('Report approved and digitally signed into medical record!');
      setActiveReportToReview(null);
      if (selectedPatientId) {
        await loadPatientDossier(selectedPatientId);
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setSigning(false);
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
              <h1 className="text-xl sm:text-2xl font-black text-white">{user?.full_name || 'Dr. Sarah Chen, MD'}</h1>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase">
                Attending Cardiologist
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Metropolitan Heart & Vascular Institute • Inpatient & Telemetry Review Portal
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
              CLINICIAN TELEMETRY FEED: {patientDossier?.patient?.full_name || 'Active Patient'}
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

      {/* Main 2-Column Work Area: Patient List on Left, Dossier on Right */}
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
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between text-xs ${
                      selectedPatientId === pat.id
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pat.alert_level === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse' :
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              rep.risk_level === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
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

              {/* Vitals Telemetry History Table */}
              <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Recent Telemetry Stream (Last {patientDossier.recent_readings?.length || 0} measurements)
                </h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-mono font-semibold">
                      <tr>
                        <th className="p-2.5">Timestamp</th>
                        <th className="p-2.5">BPM</th>
                        <th className="p-2.5">State</th>
                        <th className="p-2.5">Device Source</th>
                        <th className="p-2.5">Symptoms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {patientDossier.recent_readings?.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-800/40">
                          <td className="p-2.5 text-[11px] text-slate-400">{new Date(r.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td className="p-2.5 font-extrabold text-emerald-400">{r.bpm} BPM</td>
                          <td className="p-2.5 capitalize text-slate-300">{r.resting_status.replace('_', ' ')}</td>
                          <td className="p-2.5 text-slate-400">{r.device}</td>
                          <td className="p-2.5">
                            {r.symptoms?.chest_pain && <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-bold border border-red-500/40">Chest Pain</span>}
                            {r.symptoms?.dizziness && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold ml-1 border border-amber-500/40">Dizziness</span>}
                            {!r.symptoms?.chest_pain && !r.symptoms?.dizziness && <span className="text-slate-500">None</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

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
