import React, { useState } from 'react';
import { Sparkles, ShieldCheck, ChevronDown, ChevronUp, AlertCircle, Info, Stethoscope, HeartPulse } from 'lucide-react';
import { AIAnalysis } from '../types';

interface AIInsightCardProps {
  analysis: AIAnalysis;
  onGenerateReport?: () => void;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ analysis, onGenerateReport }) => {
  const [showFullFactors, setShowFullFactors] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const getAlertBadgeClass = () => {
    switch (analysis.alert.alert_level) {
      case 'RED': return 'bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse';
      case 'ORANGE': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'YELLOW': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden transition">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0b1329] to-[#042f2e] p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-md shadow-teal-500/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              AI Clinical Decision-Support Analysis
            </h3>
            <p className="text-xs text-teal-200/80 font-mono">Contextual evaluation considering age, medications & vitals</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border shadow-sm ${getAlertBadgeClass()}`}>
            {analysis.alert.alert_level} TRIAGE
          </span>
          {onGenerateReport && (
            <button
              onClick={onGenerateReport}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition"
            >
              Export Report
            </button>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        
        {/* Contextual Narrative Interpretation */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/70">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase font-mono tracking-wider mb-2">
            <HeartPulse className="w-4 h-4 text-teal-400" />
            Clinical Interpretation
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {analysis.contextual_interpretation}
          </p>
        </div>

        {/* Contributing Physiological Factors */}
        {analysis.physiological_factors && analysis.physiological_factors.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">
                Contributing Physiological Modifiers
              </span>
              <button
                onClick={() => setShowFullFactors(!showFullFactors)}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 font-mono"
              >
                {showFullFactors ? 'Show less' : `View all (${analysis.physiological_factors.length})`}
                {showFullFactors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {(showFullFactors ? analysis.physiological_factors : analysis.physiological_factors.slice(0, 3)).map((factor, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-700/60 p-2.5 rounded-xl text-slate-300 flex items-start gap-2">
                  <span className="text-teal-400 font-bold mt-0.5">•</span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structured Actionable Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider block mb-2">
              Validated Safe Recommendations
            </span>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, idx) => {
                const isUrgent = rec.category === 'urgent_triage';
                const isClinical = rec.category === 'clinical_advisory';
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
                      isUrgent
                        ? 'bg-red-950/40 border-red-500/40 text-red-200'
                        : isClinical
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                          : 'bg-slate-900/70 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isUrgent ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : isClinical ? (
                        <Stethoscope className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold uppercase font-mono tracking-wider text-[10px] block opacity-80">
                        {rec.category.replace('_', ' ')}
                      </span>
                      <p className="mt-0.5 leading-relaxed font-sans">{rec.recommendation_text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clinical Disclaimer & Limitations Toggle */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition font-mono"
          >
            <Info className="w-3.5 h-3.5 text-teal-400" />
            <span>{showDisclaimer ? 'Hide clinical scope & limitations' : 'View clinical scope & limitations'}</span>
          </button>
          
          {showDisclaimer && (
            <div className="mt-3 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-700 text-xs text-slate-300 space-y-2 font-mono">
              <p><strong>Diagnostic Scope:</strong> {analysis.data_limitations}</p>
              <p className="italic text-[11px] text-slate-400 font-sans">{analysis.clinical_disclaimer}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
