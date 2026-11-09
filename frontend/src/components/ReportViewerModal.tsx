import React from 'react';
import { X, Download, Printer, ShieldAlert, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { HealthReport } from '../types';
import { api } from '../services/api';

interface ReportViewerModalProps {
  report: HealthReport;
  onClose: () => void;
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({ report, onClose }) => {
  const data = report.report_data || {};
  const alertLvl = report.risk_level;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(api.getPdfDownloadUrl(report.id), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-navy-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-navy-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">{report.title}</h3>
              <p className="text-xs text-slate-400 font-mono">Reference: {report.report_reference_code} • {report.generated_at}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition"
              title="Download formal PDF report"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-navy-700 transition"
              title="Print medical report"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm print:p-0">
          
          {/* Triage Banner */}
          <div className={`p-4 rounded-xl flex items-center justify-between ${
            alertLvl === 'RED' ? 'bg-red-50 border border-red-200 text-red-900' :
            alertLvl === 'ORANGE' ? 'bg-orange-50 border border-orange-200 text-orange-900' :
            alertLvl === 'YELLOW' ? 'bg-amber-50 border border-amber-200 text-amber-900' :
            'bg-emerald-50 border border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-3">
              {alertLvl === 'RED' ? <ShieldAlert className="w-6 h-6 text-red-600" /> : <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              <div>
                <span className="font-extrabold uppercase tracking-wider text-xs block">
                  SAFETY TRIAGE: {alertLvl}
                </span>
                <span className="text-sm font-semibold">{data.section_3_current_heart_rate?.status_label || 'Evaluated'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black">{data.section_3_current_heart_rate?.bpm} <span className="text-xs font-normal">BPM</span></span>
              <div className="text-[11px] opacity-75">Ref: {data.section_3_current_heart_rate?.expected_min_bpm}–{data.section_3_current_heart_rate?.expected_max_bpm} BPM</div>
            </div>
          </div>

          {/* Patient Details & Measurement 2-Col Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">1. Patient Information</h4>
              <div className="space-y-1 text-xs">
                <div><span className="text-slate-400">Name:</span> <strong className="text-slate-800">{data.section_1_patient_details?.full_name}</strong></div>
                <div><span className="text-slate-400">Patient ID:</span> <strong className="text-slate-800">{data.section_1_patient_details?.patient_id_code}</strong></div>
                <div><span className="text-slate-400">Age / Sex:</span> <strong className="text-slate-800">{data.section_1_patient_details?.age} yrs / {data.section_1_patient_details?.sex}</strong></div>
                <div><span className="text-slate-400">Emergency Contact:</span> <strong className="text-slate-800">{data.section_1_patient_details?.emergency_contact}</strong></div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">2. Measurement Context</h4>
              <div className="space-y-1 text-xs">
                <div><span className="text-slate-400">Time:</span> <strong className="text-slate-800">{data.section_2_measurement_details?.measurement_time}</strong></div>
                <div><span className="text-slate-400">Activity State:</span> <strong className="text-slate-800 capitalize">{data.section_2_measurement_details?.resting_status}</strong></div>
                <div><span className="text-slate-400">Method:</span> <strong className="text-slate-800">{data.section_2_measurement_details?.measurement_method}</strong></div>
                <div><span className="text-slate-400">Source:</span> <strong className="text-slate-800">{data.section_2_measurement_details?.device_name}</strong></div>
              </div>
            </div>
          </div>

          {/* AI Clinical Observations */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-teal-800 mb-1">7. AI-Assisted Clinical Observations</h4>
            <p className="text-slate-700 leading-relaxed bg-teal-50/40 p-3 rounded-xl border border-teal-100 text-xs">
              {data.section_7_ai_assisted_observations?.contextual_interpretation}
            </p>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-2">9. Recommended Clinical & Wellness Next Steps</h4>
            <div className="space-y-1.5 text-xs">
              {data.section_9_recommended_next_steps?.map((r: any, idx: number) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                  <span className="font-bold text-teal-600 capitalize">[{r.category.replace('_', ' ')}]:</span>
                  <span className="text-slate-800">{r.recommendation_text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Limitations and Disclaimer */}
          <div className="bg-slate-100 p-3 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div><strong>Clinical Scope & Limitations:</strong> {data.section_11_limitations_of_analysis}</div>
            <div className="italic text-slate-500">{data.section_12_disclaimer}</div>
          </div>

          {/* Clinician Review Sign-off Block */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/60 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Attending Physician Sign-off</span>
              <div className="text-xs text-slate-700 mt-1">
                {report.is_clinician_approved ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> Clinician Reviewed & Approved
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">Pending Clinician Review (Decision-Support Mode)</span>
                )}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              CardioPulse CDS Engine v1.0
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
