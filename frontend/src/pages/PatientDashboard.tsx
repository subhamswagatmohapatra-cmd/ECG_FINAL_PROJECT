import React, { useState, useEffect } from 'react';
import { Activity, Heart, ShieldAlert, Sparkles, PlusCircle, ArrowUpRight, Clock, Calendar, CheckCircle2, FileText, ChevronRight, Monitor, Radio, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MetricsSummary, AIAnalysis, EmergencyAlert, HealthReport } from '../types';
import { HeartRateTrendChart } from '../components/HeartRateTrendChart';
import { HeartRateZoneGauge } from '../components/HeartRateZoneGauge';
import { AIInsightCard } from '../components/AIInsightCard';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { InteractiveHeart3D } from '../components/InteractiveHeart3D';
import { LiveECGMonitorCanvas } from '../components/LiveECGMonitorCanvas';
import { BedsideTelemetryMonitor } from '../components/BedsideTelemetryMonitor';
import { useToast } from '../context/ToastContext';

interface PatientDashboardProps {
  onNavigate: (tab: string) => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<AIAnalysis | null>(null);
  const [recentReports, setRecentReports] = useState<HealthReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);
  const [timeWindowDays, setTimeWindowDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [dismissedAlert, setDismissedAlert] = useState<boolean>(false);
  const [showEmbeddedMonitor, setShowEmbeddedMonitor] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [mSummary, aData, rList] = await Promise.all([
        api.getMetricsSummary(timeWindowDays),
        api.getLatestAnalysis(),
        api.getReports()
      ]);
      setMetrics(mSummary);
      setLatestAnalysis(aData);
      setRecentReports(rList.slice(0, 3));
    } catch (e) {
      console.error('Failed to load dashboard metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeWindowDays]);

  const activeAlert = latestAnalysis?.alert;

  return (
    <div className="space-y-6 pb-12">

      {/* Emergency Alert Banner if Active & Not Dismissed */}
      {activeAlert && !dismissedAlert && (
        <EmergencyBanner alert={activeAlert} onDismiss={() => setDismissedAlert(true)} />
      )}

      {/* Welcome & Patient Clinical Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Patient Command Station • {user?.full_name}
            </h1>
            <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              Live Synced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            ID: {user?.id ? `P-${user.id}` : 'P-49210'} • Telemetry Channel: Lead II Continuous • Encrypted TLS 1.3
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bedside Monitor Toggle Button */}
          <button
            onClick={() => setShowEmbeddedMonitor(!showEmbeddedMonitor)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${showEmbeddedMonitor
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/30'
              }`}
          >
            <Monitor className="w-4 h-4 text-emerald-300" />
            <span>{showEmbeddedMonitor ? 'Hide Bedside Monitor' : 'Show Bedside Monitor'}</span>
          </button>

          <button
            onClick={() => onNavigate('ecg')}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-teal-500/25 transition transform active:scale-95"
          >
            <Activity className="w-4 h-4 animate-pulse" />
            <span>AI ECG Signal Analysis</span>
          </button>

          <button
            onClick={() => onNavigate('monitoring')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-semibold text-xs px-3.5 py-2 rounded-xl transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Vitals</span>
          </button>
        </div>
      </div>

      {/* Embedded Hospital Bedside Telemetry Monitor if Toggled */}
      {showEmbeddedMonitor && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 text-xs font-mono text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 animate-pulse" />
              INTELLIVUE ICU BEDSIDE TELEMETRY SUITE (REAL-TIME PHOSPHOR SWEEP)
            </span>
            <button
              onClick={() => onNavigate('bedside')}
              className="text-teal-400 hover:underline flex items-center gap-1"
            >
              Open Full-Screen Cockpit →
            </button>
          </div>
          <BedsideTelemetryMonitor
            initialBpm={metrics?.current_bpm || 74}
            patientName={user?.full_name || 'Patient'}
            bedId="BAY 04-ICU"
            height={380}
          />
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Latest Heart Rate Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider font-mono text-[10px]">Latest Heart Rate</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Heart className="w-4 h-4 animate-pulse-heart" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                {metrics?.current_bpm || '—'}
              </span>
              <span className="text-xs font-bold text-teal-400 font-mono">BPM</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block capitalize font-mono">
              Status: {metrics?.trend_data?.length ? metrics.trend_data[metrics.trend_data.length - 1].resting_status : 'At Rest'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 border-t border-slate-700/60 pt-2 font-mono">
            <Clock className="w-3 h-3 text-teal-400" />
            <span>{metrics?.trend_data?.length ? metrics.trend_data[metrics.trend_data.length - 1].time_display : 'Live reading recorded'}</span>
          </div>
        </div>

        {/* Resting Heart Rate Baseline */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider font-mono text-[10px]">Resting Baseline</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                {metrics?.resting_heart_rate ? Math.round(metrics.resting_heart_rate) : '—'}
              </span>
              <span className="text-xs font-bold text-teal-400 font-mono">BPM</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium mt-1 block font-mono">
              Age & Condition Adjusted
            </span>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2 font-mono">
            Target Range: {latestAnalysis?.expected_min_bpm || 60}–{latestAnalysis?.expected_max_bpm || 100} BPM
          </div>
        </div>

        {/* 7-Day Average */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider font-mono text-[10px]">{timeWindowDays}-Day Average</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                {metrics?.average_bpm || '—'}
              </span>
              <span className="text-xs font-bold text-cyan-400 font-mono">BPM</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block font-mono">
              Across {metrics?.total_readings_count || 0} telemetry readings
            </span>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2 font-mono">
            Low: {metrics?.min_bpm || '—'} • Peak: {metrics?.max_bpm || '—'} BPM
          </div>
        </div>

        {/* Clinical Triage Status */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider font-mono text-[10px]">Triage Alert Status</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className={`text-sm font-extrabold uppercase px-3 py-1 rounded-full border inline-block font-mono tracking-wider ${latestAnalysis?.alert.alert_level === 'RED' ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' :
                latestAnalysis?.alert.alert_level === 'ORANGE' ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' :
                  latestAnalysis?.alert.alert_level === 'YELLOW' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              }`}>
              {latestAnalysis?.alert.alert_level || 'GREEN'} TIER
            </span>
            <span className="text-[11px] text-slate-300 mt-1.5 block truncate font-mono">
              {latestAnalysis?.alert.alert_title || 'Normal Baseline Rhythm'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2 flex items-center justify-between font-mono">
            <span>Deterministic CDSS</span>
            <button onClick={() => onNavigate('analysis')} className="text-teal-400 font-semibold hover:underline">
              Analysis Details →
            </button>
          </div>
        </div>

      </div>

      {/* 3D Anatomical Heart & Live Lead II ECG Real-Time Telemetry Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Real-time 3D Anatomical Heart (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-4 rounded-3xl border border-slate-700/80 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 px-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 font-mono">
                  3D Myocardial Digital Twin
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Pulsing at {metrics?.current_bpm || 74} BPM • Drag to rotate 360°</p>
            </div>
            <button
              onClick={() => onNavigate('3d-hub')}
              className="text-[11px] font-bold text-cyan-300 hover:text-white bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-1 rounded-lg transition"
            >
              Full 3D Lab →
            </button>
          </div>
          <InteractiveHeart3D
            bpm={metrics?.current_bpm || 74}
            alertLevel={latestAnalysis?.alert.alert_level || 'GREEN'}
            height={280}
            enableControls={true}
          />
        </div>

        {/* Real-time Sweeping Lead II ECG Monitor (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-4 rounded-3xl border border-slate-700/80 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 px-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 font-mono">
                  Live Lead II Rhythm Strip
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Continuous P-Q-R-S-T physiological sweep • 25 mm/s calibrated</p>
            </div>
            <button
              onClick={() => onNavigate('bedside')}
              className="text-[10px] font-mono font-bold bg-slate-800 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full hover:bg-slate-700 transition"
            >
              Open Multi-Wave Cockpit
            </button>
          </div>
          <LiveECGMonitorCanvas
            bpm={metrics?.current_bpm || 74}
            height={280}
            alertLevel={latestAnalysis?.alert.alert_level || 'GREEN'}
          />
        </div>

      </div>

      {/* Main Charts & Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Trend Graph with Time Window Switcher */}
        <div className="lg:col-span-2 glass-panel p-5 sm:p-6 rounded-3xl border border-slate-700/80 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white">Heart Rate Longitudinal Trends</h3>
              <p className="text-xs text-slate-400 font-mono">Telemetry readings with physiological reference corridor</p>
            </div>

            {/* Window selector */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700">
              <button
                onClick={() => setTimeWindowDays(7)}
                className={`px-3 py-1 rounded-lg transition ${timeWindowDays === 7 ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeWindowDays(14)}
                className={`px-3 py-1 rounded-lg transition ${timeWindowDays === 14 ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'}`}
              >
                14 Days
              </button>
              <button
                onClick={() => setTimeWindowDays(30)}
                className={`px-3 py-1 rounded-lg transition ${timeWindowDays === 30 ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'}`}
              >
                30 Days
              </button>
            </div>
          </div>

          <HeartRateTrendChart
            data={metrics?.trend_data || []}
            expectedMin={latestAnalysis?.expected_min_bpm || 60}
            expectedMax={latestAnalysis?.expected_max_bpm || 100}
            restingAvg={metrics?.resting_heart_rate || 72}
          />
        </div>

        {/* Zone Gauge & Quick Clinical Reports */}
        <div className="space-y-4">
          <HeartRateZoneGauge
            bpm={metrics?.current_bpm || 72}
            expectedMin={latestAnalysis?.expected_min_bpm || 60}
            expectedMax={latestAnalysis?.expected_max_bpm || 100}
            alertLevel={latestAnalysis?.alert.alert_level || 'GREEN'}
          />

          {/* Quick Reports Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">Recent Clinical Reports</h3>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentReports.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center font-mono">No reports compiled yet.</p>
            ) : (
              <div className="space-y-2">
                {recentReports.map((rep) => (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className="w-full text-left p-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/90 hover:border-teal-500/40 transition flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-slate-200 truncate">{rep.title}</div>
                      <div className="text-[10px] text-teal-400 font-mono">{rep.report_reference_code}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${rep.risk_level === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                        rep.risk_level === 'ORANGE' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                          rep.risk_level === 'YELLOW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                      {rep.risk_level}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* AI Health Analysis Detail Panel */}
      {latestAnalysis && (
        <AIInsightCard
          analysis={latestAnalysis}
          onGenerateReport={async () => {
            try {
              const newRep = await api.generateReport();
              setSelectedReport(newRep);
              showToast('Report Generated', `Reference Code: ${newRep.report_reference_code}`, 'success');
            } catch (err: any) {
              showToast('Report Generation Failed', err.message, 'error');
            }
          }}
        />
      )}

      {/* Report Modal Viewer */}
      {selectedReport && (
        <ReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

    </div>
  );
};
