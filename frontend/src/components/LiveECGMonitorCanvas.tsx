import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Activity, Zap, Maximize2 } from 'lucide-react';

interface LiveECGMonitorProps {
  bpm: number;
  height?: number;
  alertLevel?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

export const LiveECGMonitorCanvas: React.FC<LiveECGMonitorProps> = ({
  bpm,
  height = 220,
  alertLevel = 'GREEN'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [lead, setLead] = useState<'Lead II' | 'Lead V1' | 'Lead aVR'>('Lead II');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let sweepX = 0;
    const speed = 2.4; // sweep pixels per frame

    // Pre-calculate points buffer for phosphor persistence
    const width = canvas.width = canvas.parentElement?.clientWidth || 600;
    const canvasHeight = canvas.height = height;

    // Buffer to hold Y values across width
    const pointsBuffer = new Float32Array(width).fill(canvasHeight * 0.5);

    // Electrocardiogram waveform math function: P-Q-R-S-T
    const getECGValue = (phase: number): number => {
      // phase is 0.0 to 1.0 within one heartbeat cycle
      const baseline = 0;

      // 1. P Wave (Atrial Depolarization): 0.10 to 0.22
      if (phase >= 0.10 && phase < 0.22) {
        const t = (phase - 0.10) / 0.12;
        return baseline - Math.sin(t * Math.PI) * 14;
      }

      // 2. PR Segment (Isoelectric AV nodal delay): 0.22 to 0.28
      if (phase >= 0.22 && phase < 0.28) {
        return baseline;
      }

      // 3. Q Wave (Septal Depolarization): 0.28 to 0.31
      if (phase >= 0.28 && phase < 0.31) {
        const t = (phase - 0.28) / 0.03;
        return baseline + Math.sin(t * Math.PI) * 7;
      }

      // 4. R Wave (Massive Ventricular Depolarization): 0.31 to 0.36
      if (phase >= 0.31 && phase < 0.36) {
        const t = (phase - 0.31) / 0.05;
        return baseline - Math.sin(t * Math.PI) * 75; // Tall positive deflection
      }

      // 5. S Wave (Late Ventricular Depolarization): 0.36 to 0.40
      if (phase >= 0.36 && phase < 0.40) {
        const t = (phase - 0.36) / 0.04;
        return baseline + Math.sin(t * Math.PI) * 18; // Negative dip
      }

      // 6. ST Segment (Isoelectric plateau): 0.40 to 0.52
      if (phase >= 0.40 && phase < 0.52) {
        return baseline;
      }

      // 7. T Wave (Ventricular Repolarization): 0.52 to 0.72
      if (phase >= 0.52 && phase < 0.72) {
        const t = (phase - 0.52) / 0.20;
        return baseline - Math.sin(t * Math.PI) * 22; // Broad positive dome
      }

      // 8. Diastolic Baseline: 0.72 to 1.0
      return baseline;
    };

    let totalElapsedSamples = 0;
    const currentBpm = Math.max(30, Math.min(240, bpm || 72));
    // Sample rate scaled so 1 beat takes (60 / bpm) seconds * 60 frames = (3600 / bpm) frames
    const framesPerBeat = (3600 / currentBpm);

    const drawGrid = () => {
      // Background CRT dark slate
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, canvasHeight);

      // Medical ECG Paper Grid (Pink / Subtle Teal Grid)
      ctx.lineWidth = 0.5;
      const smallGrid = 12;
      const bigGrid = smallGrid * 5;

      // Small grid lines (0.04s)
      ctx.strokeStyle = 'rgba(13, 148, 136, 0.09)';
      ctx.beginPath();
      for (let x = 0; x < width; x += smallGrid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let y = 0; y < canvasHeight; y += smallGrid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major grid lines (0.20s)
      ctx.strokeStyle = 'rgba(13, 148, 136, 0.22)';
      ctx.beginPath();
      for (let x = 0; x < width; x += bigGrid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let y = 0; y < canvasHeight; y += bigGrid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Calibration pulse on the left (1 mV square wave)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const calMid = canvasHeight * 0.5;
      ctx.moveTo(10, calMid);
      ctx.lineTo(20, calMid);
      ctx.lineTo(20, calMid - 40); // 10mm = 1mV deflection
      ctx.lineTo(35, calMid - 40);
      ctx.lineTo(35, calMid);
      ctx.lineTo(45, calMid);
      ctx.stroke();
    };

    const render = () => {
      if (!isPaused) {
        // Advance sweep
        const startX = Math.floor(sweepX);
        const steps = Math.ceil(speed);

        for (let i = 0; i < steps; i++) {
          const currentX = (startX + i) % width;
          totalElapsedSamples++;
          const phase = (totalElapsedSamples % framesPerBeat) / framesPerBeat;
          const ecgDeflection = getECGValue(phase);
          const y = (canvasHeight * 0.5) + ecgDeflection;
          pointsBuffer[currentX] = y;
        }

        sweepX = (sweepX + speed) % width;
      }

      // Redraw background & grid
      drawGrid();

      // Render Persistent Phosphor Waveform
      const traceColor = alertLevel === 'RED' ? '#ef4444' : (alertLevel === 'ORANGE' ? '#f97316' : '#14b8a6');
      const glowColor = alertLevel === 'RED' ? 'rgba(239, 68, 68, 0.4)' : (alertLevel === 'ORANGE' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(20, 184, 166, 0.4)');

      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = traceColor;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Draw two segments: from sweep to width, and from 0 to sweep
      const eraseWidth = 24;
      const headX = Math.floor(sweepX);

      // Clear the gap ahead of sweep head
      ctx.fillStyle = '#020617';
      ctx.fillRect(headX, 0, eraseWidth, canvasHeight);

      // Re-stroke small grid inside erased zone
      ctx.fillStyle = 'rgba(13, 148, 136, 0.08)';
      for (let x = headX; x < headX + eraseWidth && x < width; x += 12) {
        ctx.fillRect(x, 0, 1, canvasHeight);
      }

      // Draw active line
      ctx.beginPath();
      let started = false;
      for (let x = 0; x < width; x++) {
        if (x >= headX && x <= headX + eraseWidth) {
          started = false;
          continue;
        }
        const y = pointsBuffer[x];
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Sweep Head Glowing Phosphor Spot
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(headX, pointsBuffer[headX] || canvasHeight * 0.5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [bpm, isPaused, height, alertLevel]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
      
      {/* Top Telemetry Overlay Bar */}
      <div className="p-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono font-bold text-slate-200 uppercase">{lead}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">25 mm/s • 10 mm/mV</span>
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">Filter: 0.05–150 Hz</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-slate-400 text-[10px]">HR</span>
            <span className="text-base font-extrabold text-teal-300">{bpm}</span>
            <span className="text-[10px] text-slate-500">BPM</span>
          </div>

          <div className="flex items-baseline gap-1 font-mono hidden sm:flex">
            <span className="text-slate-400 text-[10px]">QTc</span>
            <span className="text-xs font-semibold text-slate-200">412</span>
            <span className="text-[10px] text-slate-500">ms</span>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
            title={isPaused ? "Resume Sweep" : "Freeze Trace for Inspection"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Canvas Element */}
      <div className="w-full relative" style={{ height }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Bottom Medical Annotation Strip */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>P-Q-R-S-T Physiological Cycle</span>
          <span className="text-slate-600">•</span>
          <span>Sinus Rhythm Waveform Simulation</span>
        </div>
        <div className="text-teal-400/90">
          Calibration: 1.0 mV Pulse
        </div>
      </div>

    </div>
  );
};

