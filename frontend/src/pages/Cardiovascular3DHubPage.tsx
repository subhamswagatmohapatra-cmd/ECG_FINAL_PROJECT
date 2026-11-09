import React, { useState } from 'react';
import { Heart, Activity, Zap, Layers, Sparkles, Stethoscope, Info, ArrowRight, ShieldCheck, Flame, Monitor } from 'lucide-react';
import { InteractiveHeart3D } from '../components/InteractiveHeart3D';
import { LiveECGMonitorCanvas } from '../components/LiveECGMonitorCanvas';

interface HubProps {
  initialBpm?: number;
  onNavigate?: (tab: string) => void;
}

export const Cardiovascular3DHubPage: React.FC<HubProps> = ({ initialBpm = 74, onNavigate }) => {
  const [testBpm, setTestBpm] = useState<number>(initialBpm);
  const [activeTab, setActiveTab] = useState<'anatomy' | 'conduction' | 'cycle'>('anatomy');

  const presets = [
    { label: 'Athletic Sinus Bradycardia', bpm: 48, alert: 'GREEN' as const, desc: 'High stroke volume physiological adaptation' },
    { label: 'Normal Adult Resting', bpm: 72, alert: 'GREEN' as const, desc: 'Standard baseline resting hemodynamics' },
    { label: 'Mild Tachycardia (Stress/Caffeine)', bpm: 108, alert: 'YELLOW' as const, desc: 'Elevated sympathetic autonomic stimulation' },
    { label: 'Marked Tachycardia', bpm: 132, alert: 'ORANGE' as const, desc: 'Exercise or acute clinical rate elevation' },
    { label: 'Extreme Tachycardia (SVT/AFib RVR)', bpm: 165, alert: 'RED' as const, desc: 'Critical hemodynamically compromised rhythm' }
  ];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Hero Header */}
      <div className="glass-panel text-white p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            3D CARDIOVASCULAR DIGITAL TWIN & ANATOMY HUB
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Interactive 3D Heart & Conduction Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Examine myocardial mechanical contraction, cardiac chamber morphology, and electrophysiological conduction 
            synchronized in real time with the clinical Lead II ECG monitor.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-700/80 shrink-0 text-right">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Simulated Vital Cadence</div>
          <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
            <span className="text-4xl font-black text-white font-mono">{testBpm}</span>
            <span className="text-xs font-bold text-teal-400 font-mono">BPM</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Cycle Period: {(60 / testBpm).toFixed(2)}s
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: 3D Viewport on Left, Dynamic Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: 3D Canvas Viewport (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-3xl p-3 border border-slate-700/80 shadow-2xl">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-mono font-bold text-teal-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Myocardial Digital Twin (Three.js WebGL)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Click & Drag to Orbit</span>
            </div>
            <InteractiveHeart3D
              bpm={testBpm}
              alertLevel={testBpm >= 150 ? 'RED' : (testBpm >= 120 ? 'ORANGE' : (testBpm > 100 || testBpm < 50 ? 'YELLOW' : 'GREEN'))}
              height={440}
              enableControls={true}
            />
          </div>

          {/* Synchronized Real-Time Sweeping Lead II ECG Strip */}
          <div className="glass-panel rounded-3xl p-3 border border-slate-700/80 shadow-2xl">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Synchronized Lead II Rhythm Trace
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Real-time P-Q-R-S-T</span>
            </div>
            <LiveECGMonitorCanvas
              bpm={testBpm}
              height={180}
              alertLevel={testBpm >= 150 ? 'RED' : (testBpm >= 120 ? 'ORANGE' : 'GREEN')}
            />
          </div>
        </div>

        {/* Right Column: Interactive Simulator & Clinical Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Rate Controller Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">
                Live BPM Modulation Controller
              </h3>
              <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/80 border border-teal-500/40 px-2.5 py-0.5 rounded-full">
                {testBpm} BPM
              </span>
            </div>

            {/* Slider */}
            <div>
              <input
                type="range"
                min="40"
                max="180"
                value={testBpm}
                onChange={(e) => setTestBpm(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>40 (Bradycardia)</span>
                <span>60–100 (Resting Norm)</span>
                <span>180 (Extreme Tachy)</span>
              </div>
            </div>

            {/* Clinical Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-semibold text-slate-300 block font-mono">
                Diagnostic Scenario Presets:
              </span>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setTestBpm(p.bpm)}
                  className={`w-full text-left p-3 rounded-2xl border text-xs transition flex items-center justify-between ${
                    testBpm === p.bpm
                      ? 'bg-teal-950/60 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                      : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-200">{p.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.desc}</div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    p.alert === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                    p.alert === 'ORANGE' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                    p.alert === 'YELLOW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {p.bpm} BPM
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Educational Tabbed Clinical Information */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl space-y-4">
            
            {/* Tabs */}
            <div className="flex bg-slate-900/80 p-1 rounded-2xl text-xs font-semibold text-slate-400 border border-slate-700/80 font-mono">
              <button
                onClick={() => setActiveTab('anatomy')}
                className={`flex-1 py-1.5 rounded-xl transition ${activeTab === 'anatomy' ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'}`}
              >
                Anatomy
              </button>
              <button
                onClick={() => setActiveTab('conduction')}
                className={`flex-1 py-1.5 rounded-xl transition ${activeTab === 'conduction' ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'}`}
              >
                Conduction
              </button>
              <button
                onClick={() => setActiveTab('cycle')}
                className={`flex-1 py-1.5 rounded-xl transition ${activeTab === 'cycle' ? 'bg-teal-600 text-white shadow-sm' : 'hover:text-white'}`}
              >
                Cycle
              </button>
            </div>

            {/* Tab 1: Anatomy */}
            {activeTab === 'anatomy' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <strong className="text-white block font-bold font-mono">Left Ventricle (LV)</strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Thick muscular pump providing systemic perfusion at pressures of ~120 mmHg into the ascending aorta.
                  </p>
                </div>
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <strong className="text-white block font-bold font-mono">Coronary Vasculature (LAD & RCA)</strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Branches off the aortic root, delivering oxygenated perfusion during diastole when the myocardium relaxes.
                  </p>
                </div>
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <strong className="text-white block font-bold font-mono">Aortic Arch & Branches</strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Distributes high-pressure oxygenated blood to the cerebral cortex and upper extremities via brachiocephalic and carotid arteries.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Conduction */}
            {activeTab === 'conduction' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-cyan-500/40 space-y-1">
                  <strong className="text-cyan-300 block font-bold font-mono flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Sinoatrial (SA) Node — Primary Pacemaker
                  </strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Located in the superior posterolateral wall of the right atrium. Generates autonomous spontaneous action potentials at 60–100 impulses/min.
                  </p>
                </div>
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <strong className="text-white block font-bold font-mono">Atrioventricular (AV) Node Delay</strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Introduces an essential ~0.12s electrical delay allowing full mechanical atrial contraction and ventricular filling before ventricular systole.
                  </p>
                </div>
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <strong className="text-white block font-bold font-mono">His-Purkinje Ventricular Network</strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Rapidly propagates action potentials across the septum to the apex and upward, generating the narrow clinical QRS complex.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Cardiac Cycle */}
            {activeTab === 'cycle' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <strong className="text-white block font-bold font-mono">Systole (Mechanical Ejection)</strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Isovolumetric contraction followed by rapid ventricular ejection through aortic and pulmonary valves. Associated with S1 ("Lub") heart sound.
                  </p>
                </div>
                <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <strong className="text-white block font-bold font-mono">Diastole (Ventricular Filling)</strong>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Semilunar valves close generating S2 ("Dub"). Ventricles relax to fill with blood from atria. Shortened during tachycardia.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
