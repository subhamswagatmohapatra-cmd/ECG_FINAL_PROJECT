import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, PlusCircle, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Eye } from 'lucide-react';
import { api } from '../services/api';
import { HealthReport } from '../types';
import { ReportViewerModal } from '../components/ReportViewerModal';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports();
      setReports(data);
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateNew = async () => {
    try {
      setGenerating(true);
      const newRep = await api.generateReport();
      setReports(prev => [newRep, ...prev]);
      setSelectedReport(newRep);
    } catch (e: any) {
      alert(`Report compilation failed: ${e.message}`);
    } finally {
      setGenerating(false);
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

                <div className="flex items-center gap-2 self-end sm:self-center">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedReport && (
        <ReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

    </div>
  );
};
