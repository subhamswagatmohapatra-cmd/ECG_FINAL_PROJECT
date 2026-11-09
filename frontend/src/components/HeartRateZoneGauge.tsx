import React from 'react';

interface ZoneGaugeProps {
  bpm: number;
  expectedMin: number;
  expectedMax: number;
  alertLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

export const HeartRateZoneGauge: React.FC<ZoneGaugeProps> = ({
  bpm,
  expectedMin,
  expectedMax,
  alertLevel
}) => {
  // Clamp percentage between 40 and 160 BPM for visual display
  const minScale = 40;
  const maxScale = 160;
  const percentage = Math.min(Math.max(((bpm - minScale) / (maxScale - minScale)) * 100, 0), 100);

  const getAlertColor = () => {
    switch (alertLevel) {
      case 'RED': return 'text-red-300 bg-red-950/60 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse';
      case 'ORANGE': return 'text-orange-300 bg-orange-950/60 border-orange-500/50';
      case 'YELLOW': return 'text-amber-300 bg-amber-950/60 border-amber-500/50';
      default: return 'text-emerald-300 bg-emerald-950/60 border-emerald-500/50';
    }
  };

  return (
    <div className="w-full glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">
          Physiological Zone Indicator
        </span>
        <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${getAlertColor()}`}>
          {alertLevel} ZONE
        </span>
      </div>

      {/* Progress Bar with Color Spectrum */}
      <div className="relative w-full h-3.5 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
        {/* Bradycardia (< 60) */}
        <div className="w-[16.6%] bg-cyan-600/80" title="Bradycardia (< 60 BPM)"></div>
        {/* Normal (60 - 100) */}
        <div className="w-[33.3%] bg-emerald-500" title="Normal Rest Range (60 - 100 BPM)"></div>
        {/* Elevated (100 - 120) */}
        <div className="w-[16.6%] bg-amber-500" title="Elevated / Mild Tachycardia"></div>
        {/* Moderate Tachycardia (120 - 140) */}
        <div className="w-[16.6%] bg-orange-500" title="Moderate Tachycardia"></div>
        {/* Severe Tachycardia (140+) */}
        <div className="w-[16.9%] bg-red-600" title="Marked / Severe Tachycardia"></div>
      </div>

      {/* Current Pointer Marker */}
      <div className="relative w-full h-5 mt-1.5">
        <div
          className="absolute -top-1 transform -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-2.5 h-2.5 rotate-45 bg-teal-400 shadow-md"></div>
          <span className="text-[11px] font-black text-teal-300 font-mono mt-0.5 whitespace-nowrap">
            {bpm} BPM
          </span>
        </div>
      </div>

      {/* Scale Labels */}
      <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800">
        <span>40 (Brady)</span>
        <span className="font-semibold text-emerald-400">{expectedMin} (Ref Min)</span>
        <span className="font-semibold text-emerald-400">{expectedMax} (Ref Max)</span>
        <span>140+ (Tachy)</span>
      </div>
    </div>
  );
};
