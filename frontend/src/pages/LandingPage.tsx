import React, { useState } from 'react';
import {
  Activity, ShieldCheck, HeartPulse, Stethoscope, AlertTriangle, ArrowRight,
  Lock, Brain, FileCheck, Users, Sparkles, Zap, Box, Monitor, Radio,
  Shield, CheckCircle2, Sliders, Heart, Clock, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InteractiveHeart3D } from '../components/InteractiveHeart3D';
import { LiveECGMonitorCanvas } from '../components/LiveECGMonitorCanvas';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { quickDemoLogin } = useAuth();
  const [heroBpm, setHeroBpm] = useState(74);

  const handleStartDemo = async (email: string) => {
    await quickDemoLogin(email);
    onNavigate(email.includes('admin') ? 'admin' : email.includes('doctor') ? 'doctor' : 'dashboard');
  };

  const bpmPresets = [
    { label: 'Brady (48)', value: 48, desc: 'Athlete' },
    { label: 'Rest (74)', value: 74, desc: 'Normal' },
    { label: 'Walk (98)', value: 98, desc: 'Moderate' },
    { label: 'Tachy (150)', value: 150, desc: 'Critical' },
  ];

  return (
    <div className="space-y-16 pb-16">

      {/* 3D Animated Hero Section with Telemetry Cockpit Backdrop */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-16 telemetry-bg-hospital text-white rounded-3xl mx-2 sm:mx-4 px-6 sm:px-10 shadow-2xl border border-slate-700/80">
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/92 via-[#030712]/85 to-transparent pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Hero Content (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              CARDIOLOGY DECISION-SUPPORT & 3D TELEMETRY COCKPIT
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Hospital-Grade <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">3D Cardiac Monitoring</span> & Patient Safety System
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Empowering patients and clinicians with calibrated Lead II telemetry, continuous multi-channel waveforms,
              real-time 3D myocardial kinematics, and deterministic emergency triage guardrails.
            </p>

            {/* Clinical Disclaimer Callout */}
            <div className="glass-panel p-3.5 rounded-2xl border border-slate-700/70 text-xs text-slate-300 flex items-center gap-2 max-w-xl">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
              <span>Clinical Decision Support System (CDSS) &bull; Educational & Analytical Platform &bull; Never a Replacement for Physician Diagnosis</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => handleStartDemo('patient@cardiopulse.health')}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-teal-500/30 transition transform active:scale-95 text-xs sm:text-sm"
              >
                <span>Launch Patient Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('bedside')}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-5 py-3 rounded-xl transition text-xs sm:text-sm shadow-lg shadow-emerald-500/25"
              >
                <Monitor className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>Open ICU Bedside Monitor</span>
              </button>

              <button
                onClick={() => onNavigate('3d-hub')}
                className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-semibold px-4 py-3 rounded-xl transition text-xs sm:text-sm shadow-md"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>3D Cardio Lab</span>
              </button>

              <button
                onClick={async () => {
                  await quickDemoLogin('doctor@cardiopulse.health');
                  onNavigate('doctor');
                }}
                className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold px-4 py-3 rounded-xl transition text-xs sm:text-sm"
              >
                <Stethoscope className="w-4 h-4 text-teal-400" />
                <span>Clinician Portal</span>
              </button>

              <button
                onClick={async () => {
                  await quickDemoLogin('admin@cardiopulse.health');
                  onNavigate('admin');
                }}
                className="flex items-center gap-2 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/40 font-semibold px-4 py-3 rounded-xl transition text-xs sm:text-sm"
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin Console</span>
              </button>
            </div>
          </div>

          {/* Right Hero 3D Interactive Card (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-[#030712]/95 rounded-3xl border border-slate-700/80 shadow-[0_0_40px_rgba(13,148,136,0.25)] p-3 backdrop-blur-xl">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-mono font-bold text-teal-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Real-time 3D Myocardial Rhythm ({heroBpm} BPM)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Drag to Rotate &bull; Scroll to Zoom</span>
              </div>
              <InteractiveHeart3D
                bpm={heroBpm}
                height={270}
                enableControls={true}
              />

              {/* Interactive Live BPM Controller */}
              <div className="mt-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-teal-400" />
                    Simulated Rate:
                  </span>
                  <span className="font-bold text-teal-300 text-sm">{heroBpm} BPM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  value={heroBpm}
                  onChange={(e) => setHeroBpm(Number(e.target.value))}
                  className="w-full accent-teal-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between gap-1 pt-1">
                  {bpmPresets.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setHeroBpm(p.value)}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition ${heroBpm === p.value
                        ? 'bg-teal-500 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Live ECG Strip Under 3D Canvas */}
            <div className="bg-[#030712]/95 rounded-2xl border border-slate-700/80 p-2 shadow-lg">
              <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-mono text-slate-400">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3" /> LEAD II SYNTHESIZED ECG
                </span>
                <span>SWEEP: 25 mm/s &bull; GAIN: 10 mm/mV</span>
              </div>
              <LiveECGMonitorCanvas
                bpm={heroBpm}
                height={100}
              />
            </div>
          </div>

        </div>
      </section>

      {/* Clinical Telemetry Metric Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-teal-500/30 text-center">
            <div className="text-2xl sm:text-3xl font-black font-mono text-teal-400">1,000 Hz</div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">High-Res Telemetry</div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 text-center">
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">&lt; 100 ms</div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Decision Latency</div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-indigo-500/30 text-center">
            <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-400">4-Tier</div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Safety Triage Gate</div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 text-center">
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400">12 Sections</div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Clinical PDF Export</div>
          </div>
        </div>
      </section>

      {/* Safety & Clinical Triage Core Architecture Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold uppercase mb-2">
            Clinical Safety Protocol
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Deterministic 4-Tier Patient Safety Triage
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Unlike unconstrained generalist chatbots, CardioPulse enforces strict, clinically validated triage rules
            where emergency signs immediately override LLM interpretations and guide the patient to immediate care.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/40 shadow-sm relative overflow-hidden">
            <div className="w-3 h-3 rounded-full bg-emerald-400 absolute top-4 right-4"></div>
            <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">Tier 1: GREEN</span>
            <h3 className="font-bold text-base text-slate-100 mt-1">Normal Baseline</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Vitals conform to age- and activity-specific guidelines. No immediate clinical hazard detected.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-amber-500/40 shadow-sm relative overflow-hidden">
            <div className="w-3 h-3 rounded-full bg-amber-400 absolute top-4 right-4"></div>
            <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">Tier 2: YELLOW</span>
            <h3 className="font-bold text-base text-slate-100 mt-1">Repeat & Monitor</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Mild resting deviation (stress, caffeine, poor sleep, or dehydration). Guidance to repeat at rest.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-orange-500/40 shadow-sm relative overflow-hidden">
            <div className="w-3 h-3 rounded-full bg-orange-400 absolute top-4 right-4"></div>
            <span className="font-mono text-xs font-bold text-orange-400 uppercase tracking-wider">Tier 3: ORANGE</span>
            <h3 className="font-bold text-base text-slate-100 mt-1">Prompt Review</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Marked resting tachycardia/bradycardia or symptoms. Non-emergency physician review within 24-48 hrs.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)] relative overflow-hidden">
            <div className="w-3 h-3 rounded-full bg-red-500 absolute top-4 right-4 animate-ping"></div>
            <span className="font-mono text-xs font-bold text-red-400 uppercase tracking-wider">Tier 4: RED</span>
            <h3 className="font-bold text-base text-slate-100 mt-1">Emergency Dispatch</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Chest pain, stroke signs, syncope, severe dyspnea, or resting HR &ge; 150 BPM. Immediate 112/911 call.
            </p>
          </div>

        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 hover:border-teal-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mb-4">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Hospital Bedside Telemetry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calibrated Lead II ECG, SpO2 Plethysmograph with dicrotic notch, Respiration pneumogram,
              and Arterial Blood Pressure (ABP) pulse waveforms with synthesized clinical QRS beeps.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 hover:border-teal-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Contextual AI Insights</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accounts for athletic conditioning, pediatric physiology, pregnancy trimesters, beta-blocker therapy,
              and fever elevation rather than static 60-100 ranges.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 hover:border-teal-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Clinical Health Reports (PDF)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates 12-section health analysis reports with longitudinal comparisons, printable previews,
              downloadable PDFs via ReportLab, and attending doctor digital review sign-offs.
            </p>
          </div>

        </div>
      </section>

      {/* Complete Clinical Case Test Cohorts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="glass-panel text-white rounded-3xl p-6 sm:p-10 border border-slate-700/80 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-teal-400 uppercase tracking-wider mb-1">
                <Radio className="w-3.5 h-3.5" />
                Live Patient Profiles & Clinicians
              </div>
              <h3 className="text-xl sm:text-2xl font-black">Interactive Clinical Demonstration Cases</h3>
              <p className="text-xs text-slate-400 mt-1">Test edge cases, physiological nuances, and emergency triage handling</p>
            </div>
            <span className="text-xs font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-full font-bold">
              9 Full Pre-configured Personas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: 'Normal Adult (Hypertensive on ACE-I)', sub: 'Johnathan, 46y • Lisinopril • Rest 74 BPM', email: 'patient@cardiopulse.health', badge: 'GREEN', col: 'text-emerald-400' },
              { title: 'Endurance Athlete', sub: 'Marcus, 28y • Sinus Bradycardia 48 BPM normal', email: 'athlete@cardiopulse.health', badge: 'GREEN (ATH)', col: 'text-emerald-400' },
              { title: 'Pediatric Child', sub: 'Leo, 8y • Resting HR 94 BPM (age-appropriate)', email: 'pediatric@cardiopulse.health', badge: 'GREEN (PALS)', col: 'text-emerald-400' },
              { title: 'Pregnant Patient (28w)', sub: 'Elena, 31y • Resting 92 BPM physiological rise', email: 'pregnant@cardiopulse.health', badge: 'GREEN (PREG)', col: 'text-emerald-400' },
              { title: 'Cardiac History & Beta-Blocker', sub: 'Arthur, 62y • Metoprolol • Blunted HR response', email: 'cardiac@cardiopulse.health', badge: 'ORANGE (MED)', col: 'text-amber-400' },
              { title: 'Chest Pain Emergency Demo', sub: 'David, 54y • HR 78 BPM normal BUT Chest Pain', email: 'chestpain@cardiopulse.health', badge: 'RED (EMERGENCY)', col: 'text-red-400' },
              { title: 'Severe Resting Tachycardia', sub: 'Priya, 39y • Rest HR 154 BPM with Syncope Risk', email: 'tachy@cardiopulse.health', badge: 'RED (TACHY)', col: 'text-red-400' },
              { title: 'Attending Cardiologist', sub: 'Dr. Sarah Chen, MD • Clinician sign-off & roster', email: 'doctor@cardiopulse.health', badge: 'DOCTOR PORTAL', col: 'text-cyan-400' },
              { title: 'System Administrator', sub: 'Full Governance & Patient Records Oversight', email: 'admin@cardiopulse.health', badge: 'ADMIN CONSOLE', col: 'text-purple-400' }
            ].map((c, i) => (
              <button
                key={i}
                onClick={async () => {
                  await quickDemoLogin(c.email);
                  onNavigate(c.email.includes('admin') ? 'admin' : c.email.includes('doctor') ? 'doctor' : 'dashboard');
                }}
                className="text-left p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white group-hover:text-teal-300 transition">{c.title}</span>
                    <span className={`text-[10px] font-mono font-bold ${c.col}`}>{c.badge}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{c.sub}</p>
                </div>
                <span className="text-[10px] text-teal-400 font-medium mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Launch Persona <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
};
