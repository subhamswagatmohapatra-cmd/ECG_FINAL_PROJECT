import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Printer, PlusCircle, CheckCircle2, AlertTriangle,
  ShieldCheck, Clock, Eye, UserCheck, Stethoscope, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { HealthReport } from '../types';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  // Submit to Doctor state
  const [submitReportModal, setSubmitReportModal] = useState<HealthReport | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined);
  const [submitDoctorNotes, setSubmitDoctorNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchReportsAndDoctors = async () => {
    try {
      setLoading(true);
      const [reportsData, doctorsData] = await Promise.all([
        api.getReports().catch(() => []),
        api.getAvailableDoctors().catch(() => [])
      ]);
      setReports(reportsData);
      if (doctorsData && doctorsData.length > 0) {
        setAvailableDoctors(doctorsData);
        if (!selectedDoctorId) {
          setSelectedDoctorId(doctorsData[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndDoctors();
  }, []);

  const handleGenerateNew = async () => {
    try {
      setGenerating(true);
      const newRep = await api.generateReport();
      setReports(prev => [newRep, ...prev]);
      setSelectedReport(newRep);
      showToast('Report Generated', `Reference: ${newRep.report_reference_code}`, 'success');
    } catch (e: any) {
      showToast('Report Compilation Failed', e.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitToDoctor = async () => {
    if (!submitReportModal) return;
    try {
      setIsSubmitting(true);
      const res = await api.submitHealthReportToDoctor(submitReportModal.id, {
        doctor_id: selectedDoctorId ? Number(selectedDoctorId) : undefined,
        patient_notes: submitDoctorNotes.trim() || undefined
      });
      showToast('Submitted to Doctor', res.message || 'Report sent to the cardiologist review queue.', 'success');
      setSubmitReportModal(null);
      setSubmitDoctorNotes('');
      await fetchReportsAndDoctors();
    } catch (err: any) {
      showToast('Submission Failed', err.message || 'Failed to submit report to doctor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-400" />
            Patient Health Analysis Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Formal clinical decision-support reports with downloadable PDFs, print layouts, and attending physician sign-offs.
          </p>
        </div>

        <button
          onClick={handleGenerateNew}
          disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 transition disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{generating ? 'Compiling PDF...' : 'Generate New Report'}</span>
        </button>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-mono">
          <p className="text-sm">Loading historical clinical reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-700/80 text-center space-y-3">
          <FileText className="w-12 h-12 text-teal-400 mx-auto" />
          <h3 className="font-bold text-base text-slate-200">No Reports Generated Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
            Click "Generate New Report" to compile your latest vitals and AI clinical evaluation into a downloadable PDF report.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/80 flex items-center justify-between text-xs font-mono font-semibold text-slate-400">
            <span>Historical Clinical Dossier ({reports.length} compiled)</span>
            <span className="text-teal-400">PDF & Print Ready</span>
          </div>

          <div className="divide-y divide-slate-800">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-5 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{report.title}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${report.risk_level === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse' :
                      report.risk_level === 'ORANGE' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                        report.risk_level === 'YELLOW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                      {report.risk_level} TRIAGE
                    </span>
                    {report.is_clinician_approved ? (
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" /> Clinician Signed
                      </span>
                    ) : report.submission_status === 'awaiting_doctor_review' ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400 animate-pulse" /> Awaiting Doctor Review
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                        Decision Support Only
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-1">{report.summary}</p>

                  <div className="flex items-center gap-4 text-[11px] text-teal-400 font-mono">
                    <span>Ref: {report.report_reference_code}</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-teal-400" /> {report.generated_at}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <a
                    href={api.getPdfDownloadUrl(report.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 hover:from-teal-500/40 hover:to-cyan-500/40 text-teal-300 border border-teal-500/40 text-xs font-bold px-3 py-2 rounded-xl transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                  <button
                    onClick={() => setSubmitReportModal(report)}
                    className="flex items-center gap-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow-md shadow-teal-500/20"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{report.submission_status === 'awaiting_doctor_review' ? 'Re-submit' : 'Submit to Doctor'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal View */}
      {selectedReport && (
        <ReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {/* Submit Report to Doctor Modal */}
      {submitReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-400" />
                  Submit Report to Cardiologist
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Forward report {submitReportModal.report_reference_code} for professional review and digital clinical sign-off.
                </p>
              </div>
            </div>

            {/* Target Summary */}
            <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Report Reference</span>
                <span className="font-bold text-slate-200">{submitReportModal.report_reference_code}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Triage Level</span>
                <span className="font-bold text-teal-300">{submitReportModal.risk_level}</span>
              </div>
            </div>

            {/* Doctor Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Select Attending Cardiologist</span>
                <span className="text-[10px] font-mono text-teal-400">
                  {availableDoctors.length} On-Duty Available
                </span>
              </label>
              <select
                value={selectedDoctorId || ''}
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
              >
                {availableDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} • {doc.specialty} ({doc.hospital_affiliation})
                  </option>
                ))}
              </select>
              {availableDoctors.length === 0 && (
                <p className="text-[11px] text-amber-400 font-mono">
                  Default primary attending cardiologist will be automatically assigned.
                </p>
              )}
            </div>

            {/* Clinical Intake Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Clinical Notes for the Physician</span>
                <span className="text-[10px] text-slate-400">Optional</span>
              </label>
              <textarea
                value={submitDoctorNotes}
                onChange={(e) => setSubmitDoctorNotes(e.target.value)}
                rows={3}
                placeholder="Mention any symptoms, concerns, or recent medical updates..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSubmitReportModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitToDoctor}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-teal-500/25 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? 'Transmitting...' : 'Confirm Submission'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
