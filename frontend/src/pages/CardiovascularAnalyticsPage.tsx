import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { CardiovascularAnalytics } from '../types';
import {
  Activity, TrendingUp, TrendingDown, Sun, Moon, Sunrise, Sunset,
  ShieldCheck, BarChart3, Clock, AlertTriangle, CheckCircle2, Heart
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

export const CardiovascularAnalyticsPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<CardiovascularAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getCardiovascularAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      showToast('Error Loading Analytics', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-teal-400 font-mono text-xs">
        COMPILING LONGITUDINAL CARDIOVASCULAR TELEMETRY...
      </div>
    );
  }

  if (!analytics || !analytics.has_data) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-slate-700/60 text-center space-y-4 max-w-lg mx-auto my-12">
        <Activity className="w-12 h-12 text-slate-600 mx-auto stroke-[1.5]" />
        <h2 className="text-lg font-bold text-white">Insufficient Telemetry Data</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          At least 3 resting heart rate measurements recorded across multiple days are required to establish an accurate personal baseline delta.
        </p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('monitoring')}
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition"
          >
            Record Vitals Reading
          </button>
        )}
      </div>
    );
  }

  const circadianData = [
    { name: 'Morning (06-12)', bpm: analytics.circadian_distribution?.morning_avg || 0, color: '#38bdf8' },
    { name: 'Afternoon (12-18)', bpm: analytics.circadian_distribution?.afternoon_avg || 0, color: '#fbbf24' },
    { name: 'Evening (18-22)', bpm: analytics.circadian_distribution?.evening_avg || 0, color: '#f97316' },
    { name: 'Nocturnal (22-06)', bpm: analytics.circadian_distribution?.night_avg || 0, color: '#a855f7' },
  ];

  const stats = analytics.summary_stats;
  const delta = analytics.resting_hr_delta_bpm ?? 0;
  const consistency = analytics.consistency_score_percentage ?? 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
            LONGITUDINAL POPULATION-ADJUSTED BIOMETRIC TRENDS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cardiovascular Analytics Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            In-depth physiological breakdown including baseline delta, circadian heart rate fluctuations, and tracking compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Consistency Score</div>
            <div className="text-lg font-black text-teal-300 font-mono">
              {consistency}% Active
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Baseline Delta Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Resting Baseline Delta</span>
            {delta > 0 ? (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            ) : delta < 0 ? (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <Activity className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className="text-2xl font-black text-white flex items-baseline gap-1.5">
            <span className={delta > 5 ? 'text-amber-400' : delta < -5 ? 'text-cyan-400' : 'text-emerald-400'}>
              {delta > 0 ? `+${delta}` : delta} BPM
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Status: <span className="font-semibold text-slate-200">{analytics.baseline_status || 'Stable'}</span>
          </div>
        </div>

        {/* 7-Day Average */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Period Average HR</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.avg_hr} <span className="text-xs font-normal text-slate-400">BPM</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Range: {stats?.min_hr} – {stats?.max_hr} BPM
          </div>
        </div>

        {/* Statistical Variance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Heart Rate Variance</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ±{stats?.hr_variance} <span className="text-xs font-normal text-slate-400">BPM</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {stats?.high_hr_count} Elevated • {stats?.low_hr_count} Low
          </div>
        </div>

        {/* Tracking Compliance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Measurement Cadence</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {stats?.total_readings} <span className="text-xs font-normal text-slate-400">Readings</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Across {stats?.measurement_days_active} active days
          </div>
        </div>
      </div>

      {/* Circadian Heart Rate Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                Circadian Heart Rate Profile
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Autonomic balance variations across distinct 24-hour physiological windows.
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={circadianData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[40, 120]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="bpm" radius={[8, 8, 0, 0]}>
                  {circadianData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono pt-2 border-t border-slate-800">
            <div>
              <div className="text-slate-400">Morning</div>
              <div className="text-cyan-400 font-bold">{analytics.circadian_distribution?.morning_avg || '—'} BPM</div>
            </div>
            <div>
              <div className="text-slate-400">Afternoon</div>
              <div className="text-amber-400 font-bold">{analytics.circadian_distribution?.afternoon_avg || '—'} BPM</div>
            </div>
            <div>
              <div className="text-slate-400">Evening</div>
              <div className="text-orange-400 font-bold">{analytics.circadian_distribution?.evening_avg || '—'} BPM</div>
            </div>
            <div>
              <div className="text-slate-400">Night</div>
              <div className="text-purple-400 font-bold">{analytics.circadian_distribution?.night_avg || '—'} BPM</div>
            </div>
          </div>
        </div>

        {/* Clinical Interpretation & Autonomic Insights */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Clinical Context & Target Ranges
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Activity Level Profile:</span>
                <span className="font-semibold text-teal-300 capitalize">{analytics.clinical_context?.activity_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Physiological Target Range:</span>
                <span className="font-mono text-white font-bold">{analytics.clinical_context?.target_resting_range}</span>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-4 rounded-2xl border border-slate-700">
              <span className="font-bold text-white block mb-1">Algorithmic Interpretation:</span>
              {analytics.clinical_context?.interpretation}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Autonomic circadian rhythms normally cause heart rate to drop 10–20% during deep nocturnal sleep. Absence of nocturnal dipping (non-dipping profile) should be discussed with a cardiologist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

