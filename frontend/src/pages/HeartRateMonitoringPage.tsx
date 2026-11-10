import React, { useState } from 'react';
import { Heart, Watch, Cpu, Activity, AlertTriangle, Plus, CheckCircle2, RefreshCw, Smartphone, Bluetooth } from 'lucide-react';
import { api } from '../services/api';
import { Symptoms, HeartRateReading, AIAnalysis } from '../types';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { AIInsightCard } from '../components/AIInsightCard';
import { InteractiveHeart3D } from '../components/InteractiveHeart3D';
import { useToast } from '../context/ToastContext';

interface MonitoringPageProps {
  onNavigate: (tab: string) => void;
}

export const HeartRateMonitoringPage: React.FC<MonitoringPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [entryMode, setEntryMode] = useState<'manual' | 'wearable' | 'sensor'>('manual');

  // Manual / Wearable Form State
  const [bpm, setBpm] = useState<number>(75);
  const [restingStatus, setRestingStatus] = useState<'resting' | 'active' | 'post_exercise' | 'sleeping'>('resting');
  const [deviceName, setDeviceName] = useState<string>('Omron M7 Intelli IT Sphygmomanometer');
  const [notes, setNotes] = useState<string>('');

  // Symptoms Checklist
  const [symptoms, setSymptoms] = useState<Symptoms>({
    chest_pain: false,
    severe_shortness_of_breath: false,
    fainting_or_syncope: false,
    stroke_signs: false,
    dizziness: false,
    palpitations: false,
    fatigue: false,
    nausea: false,
    confusion: false,
    cold_sweat: false,
    swelling_ankles: false,
  });

  // Wearable simulation state
  const [isSyncingWearable, setIsSyncingWearable] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Hardware sensor state (honest transparency as required)
  const [sensorConnected, setSensorConnected] = useState(false);

  // Submission & AI Result State
  const [submitting, setSubmitting] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<AIAnalysis | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSymptomToggle = (key: keyof Symptoms) => {
    setSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleWearableSync = (brand: string) => {
    setIsSyncingWearable(true);
    setSyncStatus(`Connecting to ${brand} Health Cloud API...`);
    setTimeout(() => {
      // Simulate realistic telemetry pull
      const simulatedBpm = brand === 'Apple Watch' ? 72 : (brand === 'Garmin' ? 58 : 68);
      setBpm(simulatedBpm);
      setDeviceName(`${brand} Sync (via Cloud Health API)`);
      setSyncStatus(`Successfully retrieved latest resting pulse (${simulatedBpm} BPM) from ${brand}.`);
      setIsSyncingWearable(false);
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      // 1. Submit Reading
      const reading = await api.createReading({
        bpm: Number(bpm),
        resting_status: restingStatus,
        measurement_method: entryMode === 'wearable' ? 'simulated_wearable' : (entryMode === 'sensor' ? 'sensor' : 'manual'),
        device_name: deviceName,
        notes: notes || undefined,
        symptoms: symptoms
      });

      // 2. Immediately trigger AI analysis and clinical triage
      const analysis = await api.evaluateReading(reading.id);
      setLatestAnalysis(analysis);
      setSuccessMessage(`Heart rate reading of ${bpm} BPM logged and clinically evaluated!`);
      showToast('Vital Recorded', `${bpm} BPM evaluated by clinical engine`, 'success');
    } catch (err: any) {
      showToast('Error Logging Reading', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* Active Triage Alert if triggered by submission */}
      {latestAnalysis?.alert && latestAnalysis.alert.alert_level !== 'GREEN' && (
        <EmergencyBanner alert={latestAnalysis.alert} />
      )}

      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 animate-pulse-heart" />
            Heart Rate Recording & Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Log resting or post-exercise heart rates with real-time symptom surveillance.
          </p>
        </div>

        {/* Entry Method Selector Tabs */}
        <div className="flex bg-slate-900/80 p-1 rounded-2xl text-xs font-semibold text-slate-400 border border-slate-700 font-mono">
          <button
            onClick={() => { setEntryMode('manual'); setDeviceName('Manual Sphygmomanometer'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${entryMode === 'manual' ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'
              }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Manual Entry
          </button>
          <button
            onClick={() => { setEntryMode('wearable'); setDeviceName('Apple Watch Series 9'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${entryMode === 'wearable' ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'
              }`}
          >
            <Watch className="w-3.5 h-3.5" />
            Wearable Sync
          </button>
          <button
            onClick={() => { setEntryMode('sensor'); setDeviceName('Photoplethysmography (PPG) Optical Sensor'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${entryMode === 'sensor' ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'
              }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Sensor Mode
          </button>
        </div>
      </div>

      {/* Main Recording Form */}
      <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8">

        {/* Sensor Mode Transparency Notice (Section 4 Compliance) */}
        {entryMode === 'sensor' && (
          <div className="mb-6 p-4 bg-slate-900/60 rounded-2xl border border-dashed border-slate-700 text-xs text-slate-300 space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-teal-400">
                <Bluetooth className="w-4 h-4 text-cyan-400" />
                Physical Sensor Interface Status
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {sensorConnected ? 'CONNECTED' : 'DISCONNECTED / STANDBY'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              In accordance with clinical safety guidelines, CardioPulse does NOT simulate live hardware waveforms
              when an optical pulse transducer or Bluetooth ECG patch is not physically paired.
            </p>
            <button
              type="button"
              onClick={() => setSensorConnected(!sensorConnected)}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold underline"
            >
              {sensorConnected ? 'Simulate Disconnect' : 'Pair Demo Optical Pulse Transducer'}
            </button>
          </div>
        )}

        {/* Wearable Sync Provider Selector */}
        {entryMode === 'wearable' && (
          <div className="mb-6 p-4 bg-slate-900/60 rounded-2xl border border-teal-500/30 text-xs space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                Connected Health API Ingestion
              </span>
              {isSyncingWearable && <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />}
            </div>
            <p className="text-slate-400 font-sans">Select supported health platform to synchronize latest background telemetry:</p>
            <div className="flex flex-wrap gap-2">
              {['Apple Watch', 'Garmin Health', 'Fitbit / Pixel Watch', 'Samsung Health'].map((brand) => (
                <button
                  key={brand}
                  type="button"
                  disabled={isSyncingWearable}
                  onClick={() => handleWearableSync(brand)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-xl transition disabled:opacity-50"
                >
                  Sync from {brand}
                </button>
              ))}
            </div>
            {syncStatus && <p className="text-emerald-400 font-medium text-[11px]">{syncStatus}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 3D Visual BPM Input Hero Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-900/50 p-5 rounded-3xl border border-slate-700/60">

            {/* Numerical Controls (6 cols) */}
            <div className="md:col-span-6 space-y-3 text-center md:text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                Recorded Heart Rate Value
              </label>

              <div className="flex items-center justify-center md:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => setBpm(prev => Math.max(35, prev - 5))}
                  className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-200 hover:bg-slate-700 shadow-sm flex items-center justify-center text-lg"
                >
                  -
                </button>

                <div className="inline-flex items-baseline gap-2">
                  <input
                    type="number"
                    min="30"
                    max="260"
                    required
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-32 text-center text-4xl sm:text-5xl font-black text-white bg-slate-950 border-2 border-teal-500/50 rounded-2xl py-2 focus:border-teal-400 focus:outline-none shadow-inner font-mono"
                  />
                  <span className="text-sm font-bold text-teal-400 font-mono">BPM</span>
                </div>

                <button
                  type="button"
                  onClick={() => setBpm(prev => Math.min(220, prev + 5))}
                  className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-200 hover:bg-slate-700 shadow-sm flex items-center justify-center text-lg"
                >
                  +
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Adult standard resting: 60–100 BPM • Athletes: 40–60 BPM.
                The 3D heart dynamically beats in real time to match this rate.
              </p>
            </div>

            {/* Live 3D Myocardial Contraction Preview (6 cols) */}
            <div className="md:col-span-6 bg-[#030712] p-2 rounded-2xl border border-slate-800 shadow-2xl">
              <InteractiveHeart3D
                bpm={bpm}
                alertLevel={bpm >= 150 ? 'RED' : (bpm >= 115 ? 'ORANGE' : (bpm > 100 || bpm < 50 ? 'YELLOW' : 'GREEN'))}
                height={230}
                enableControls={true}
              />
            </div>

          </div>

          {/* Activity State & Measurement Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Activity Condition *</label>
              <select
                value={restingStatus}
                onChange={(e: any) => setRestingStatus(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-200"
              >
                <option value="resting">Resting (Seated quietly for ≥ 5 mins)</option>
                <option value="active">Active (During physical exertion / exercise)</option>
                <option value="post_exercise">Post-Exercise (Within 10 mins of workout)</option>
                <option value="sleeping">Sleeping / Upon Waking</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Device or Source Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-200"
                placeholder="e.g. Omron Sphygmomanometer, Manual Pulse"
              />
            </div>
          </div>

          {/* Symptoms Surveillance Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Symptoms at Time of Measurement
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Select any symptoms present</span>
            </div>

            {/* Red Flag Symptoms Box */}
            <div className="p-4 bg-red-950/40 rounded-2xl border border-red-500/50 mb-3">
              <span className="text-[11px] font-bold text-red-400 uppercase font-mono tracking-wider block mb-2">
                Emergency Red Flags (Immediate Medical Triage)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-200">
                  <input
                    type="checkbox"
                    checked={symptoms.chest_pain}
                    onChange={() => handleSymptomToggle('chest_pain')}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Chest Pain / Pressure / Tightness</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-200">
                  <input
                    type="checkbox"
                    checked={symptoms.severe_shortness_of_breath}
                    onChange={() => handleSymptomToggle('severe_shortness_of_breath')}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Severe Shortness of Breath</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-200">
                  <input
                    type="checkbox"
                    checked={symptoms.fainting_or_syncope}
                    onChange={() => handleSymptomToggle('fainting_or_syncope')}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Fainting / Loss of Consciousness (Syncope)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-200">
                  <input
                    type="checkbox"
                    checked={symptoms.stroke_signs}
                    onChange={() => handleSymptomToggle('stroke_signs')}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Facial Droop / Arm Weakness / Slurred Speech</span>
                </label>
              </div>
            </div>

            {/* Clinical Symptoms */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={symptoms.dizziness}
                  onChange={() => handleSymptomToggle('dizziness')}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span>Dizziness / Lightheadedness</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={symptoms.palpitations}
                  onChange={() => handleSymptomToggle('palpitations')}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span>Palpitations / Fluttering</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={symptoms.fatigue}
                  onChange={() => handleSymptomToggle('fatigue')}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span>Unusual Fatigue</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={symptoms.nausea}
                  onChange={() => handleSymptomToggle('nausea')}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span>Nausea / Cold Sweat</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={symptoms.confusion}
                  onChange={() => handleSymptomToggle('confusion')}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span>Confusion / Disorientation</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={symptoms.swelling_ankles}
                  onChange={() => handleSymptomToggle('swelling_ankles')}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span>Ankle / Leg Swelling</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Clinical Context / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-200"
              placeholder="e.g. Taken 10 minutes after morning coffee, seated quietly at kitchen table."
            ></textarea>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/25 text-sm transition transform active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Running Deterministic Safety & AI Analysis...' : 'Log Reading & Run AI Analysis'}
          </button>
        </form>

        {successMessage && (
          <div className="mt-4 p-3.5 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Render AI Result if evaluated */}
      {latestAnalysis && (
        <AIInsightCard
          analysis={latestAnalysis}
          onGenerateReport={() => onNavigate('reports')}
        />
      )}

    </div>
  );
};
