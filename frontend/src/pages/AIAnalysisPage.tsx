import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, AlertTriangle, Stethoscope, HeartPulse, FileText, CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { AIAnalysis, HealthReport } from '../types';
import { AIInsightCard } from '../components/AIInsightCard';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { useToast } from '../context/ToastContext';

interface AIAnalysisPageProps {
  onNavigate: (tab: string) => void;
}

export const AIAnalysisPage: React.FC<AIAnalysisPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [activeReportModal, setActiveReportModal] = useState<HealthReport | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const data = await api.getLatestAnalysis();
        setAnalysis(data);
      } catch (e) {
        console.error('Failed to load analysis', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const rep = await api.generateReport();
      setActiveReportModal(rep);
      showToast('Report Generated Successfully', '12-section clinical health analysis compiled', 'success');
    } catch (e: any) {
      showToast('Report Compilation Failed', e.message, 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-mono">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-teal-400 animate-spin" />
        <p className="text-sm">Evaluating clinical vital signs telemetry...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-2xl mx-auto my-12 glass-panel p-8 rounded-3xl border border-slate-700/80 text-center space-y-4">
        <HeartPulse className="w-12 h-12 text-teal-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Clinical Analysis Available</h2>
        <p className="text-xs text-slate-400 font-mono">
          Please log a heart rate reading in the monitoring module to trigger your first AI clinical evaluation.
        </p>
        <button
          onClick={() => onNavigate('monitoring')}
          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 transition"
        >
          Record Heart Rate
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* Emergency Banner if Red or Orange */}
      {analysis.alert.alert_level !== 'GREEN' && (
        <EmergencyBanner alert={analysis.alert} />
      )}

      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-teal-400" />
              AI Clinical Health Analysis
            </h1>
            <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full uppercase">
              Clinical CDSS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Deterministic safety triage paired with LLM contextual natural language interpretation.
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 transition disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          <span>{generatingReport ? 'Compiling PDF...' : 'Compile Formal Health Report'}</span>
        </button>
      </div>

      {/* Primary Full AI Insight Card */}
      <AIInsightCard
        analysis={analysis}
        onGenerateReport={handleGenerateReport}
      />

      {/* Longitudinal Trend Analysis Box */}
      {analysis.unusual_patterns && analysis.unusual_patterns.length > 0 && (
        <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">
            Longitudinal Pattern & Deviation Detection
          </h3>
          <div className="space-y-2">
            {analysis.unusual_patterns.map((pat, idx) => (
              <div key={idx} className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2">
                <span className="text-teal-400 font-bold">•</span>
                <span>{pat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Reference Range Architecture Overview */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 font-mono">
          <Stethoscope className="w-4 h-4 text-teal-400" />
          Clinical Reference Standards Applied
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          The CardioPulse engine maps vital readings against peer-reviewed cardiology guidelines
          (American Heart Association, European Society of Cardiology, and Pediatric Advanced Life Support):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="font-bold text-teal-300 block font-mono">Age-Adjusted Norms</span>
            <p className="text-slate-400 mt-1 font-sans">Pediatric, adolescent, adult, and geriatric ranges are dynamically selected based on your profile.</p>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="font-bold text-teal-300 block font-mono">Pharmacological Factors</span>
            <p className="text-slate-400 mt-1 font-sans">Negative chronotropes (beta-blockers, CCBs) are factored in so therapeutic bradycardia is not misflagged.</p>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="font-bold text-teal-300 block font-mono">Physiological Context</span>
            <p className="text-slate-400 mt-1 font-sans">Considers fever, pregnancy trimester cardiac output, and athletic conditioning adaptations.</p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeReportModal && (
        <ReportViewerModal
          report={activeReportModal}
          onClose={() => setActiveReportModal(null)}
        />
      )}

    </div>
  );
};
