import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Play, Pause, AlertOctagon, Heart, Activity, Wind, Gauge, Thermometer, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export type RhythmType = 'normal' | 'bradycardia' | 'tachycardia' | 'afib' | 'vtach' | 'pvc';

interface BedsideTelemetryMonitorProps {
  initialBpm?: number;
  patientName?: string;
  bedId?: string;
  height?: number;
  compact?: boolean;
}

export const BedsideTelemetryMonitor: React.FC<BedsideTelemetryMonitorProps> = ({
  initialBpm = 74,
  patientName = 'Johnathan Miller',
  bedId = 'ICU-BAY 04',
  height = 420,
  compact = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [spo2, setSpo2] = useState<number>(98);
  const [respRate, setRespRate] = useState<number>(16);
  const [sysBp, setSysBp] = useState<number>(120);
  const [diaBp, setDiaBp] = useState<number>(80);
  const [tempC, setTempC] = useState<number>(36.8);
  const [rhythm, setRhythm] = useState<RhythmType>('normal');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isNIBPMeasuring, setIsNIBPMeasuring] = useState<boolean>(false);
  const [nibpCountdown, setNibpCountdown] = useState<number>(0);
  const [leadGain, setLeadGain] = useState<number>(1.0); // 1.0x, 2.0x, 0.5x
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Live WebSocket Telemetry Connection to backend
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host || '127.0.0.1:8000';
    const wsUrl = `${protocol}//${wsHost}/api/v1/ws/telemetry`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        ws?.send(JSON.stringify({ action: 'set_rhythm', rhythm }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'vitals_packet') {
            setBpm(data.bpm);
            setSpo2(data.spo2);
            setRespRate(data.resp_rate);
            setSysBp(data.sys_bp);
            setDiaBp(data.dia_bp);
            setTempC(data.temp_c);
          }
        } catch {
          // Fallback to local mathematical synthesis
        }
      };

      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Update backend telemetry rhythm on toggle
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_rhythm', rhythm }));
    }
  }, [rhythm]);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepTimeRef = useRef<number>(0);

  // Initialize Web Audio API for realistic clinical monitor telemetry blip
  const playTelemetryBeep = useCallback((currentSpo2: number) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Clinical telemetry pitch changes with oxygen saturation (Higher SpO2 = higher pitch)
      // 100% SpO2 ~ 880Hz (A5), 90% SpO2 ~ 520Hz, 80% ~ 350Hz
      const baseFreq = 400 + ((currentSpo2 - 70) / 30) * 500;
      const freq = Math.max(300, Math.min(1050, baseFreq));

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Hospital QRS blip has very short envelope (60ms)
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // Audio autoplay policy handled silently
    }
  }, [soundEnabled]);

  // Adjust vitals when rhythm changes
  useEffect(() => {
    switch (rhythm) {
      case 'normal':
        setBpm(74);
        setSpo2(98);
        setRespRate(16);
        setSysBp(120);
        setDiaBp(80);
        break;
      case 'bradycardia':
        setBpm(42);
        setSpo2(96);
        setRespRate(12);
        setSysBp(105);
        setDiaBp(68);
        break;
      case 'tachycardia':
        setBpm(136);
        setSpo2(95);
        setRespRate(24);
        setSysBp(142);
        setDiaBp(92);
        break;
      case 'afib':
        setBpm(118);
        setSpo2(94);
        setRespRate(20);
        setSysBp(130);
        setDiaBp(88);
        break;
      case 'vtach':
        setBpm(165);
        setSpo2(87);
        setRespRate(28);
        setSysBp(85);
        setDiaBp(55);
        break;
      case 'pvc':
        setBpm(78);
        setSpo2(97);
        setRespRate(17);
        setSysBp(124);
        setDiaBp(82);
        break;
    }
  }, [rhythm]);

  // NIBP Measurement Cycle Simulator
  const triggerNIBPMeasurement = () => {
    if (isNIBPMeasuring) return;
    setIsNIBPMeasuring(true);
    setNibpCountdown(5);
    const interval = setInterval(() => {
      setNibpCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsNIBPMeasuring(false);
          // Slightly vary readings realistically
          setSysBp(Math.round(115 + Math.random() * 12));
          setDiaBp(Math.round(75 + Math.random() * 8));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Multi-Channel Waveform Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepX = 0;
    const speed = 2.4; // 25mm/s standard paper speed equivalent

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const clientW = canvas.parentElement?.clientWidth || 800;
    const clientH = height;
    canvas.width = clientW * dpr;
    canvas.height = clientH * dpr;
    ctx.scale(dpr, dpr);

    // Height partitions for 4 channels
    const ch1Height = clientH * 0.35; // Lead II ECG (Green)
    const ch2Height = clientH * 0.23; // SpO2 Pleth (Cyan)
    const ch3Height = clientH * 0.21; // Respiration (Yellow)
    const ch4Height = clientH * 0.21; // Arterial BP (Coral Red)

    const ch1Base = ch1Height * 0.55;
    const ch2Base = ch1Height + ch2Height * 0.65;
    const ch3Base = ch1Height + ch2Height + ch3Height * 0.55;
    const ch4Base = ch1Height + ch2Height + ch3Height + ch4Height * 0.65;

    // Buffers to store waveform lines across width
    const ecgBuffer = new Float32Array(Math.ceil(clientW)).fill(ch1Base);
    const plethBuffer = new Float32Array(Math.ceil(clientW)).fill(ch2Base);
    const respBuffer = new Float32Array(Math.ceil(clientW)).fill(ch3Base);
    const abpBuffer = new Float32Array(Math.ceil(clientW)).fill(ch4Base);

    let sampleCount = 0;

    // Mathematical Waveform Generators
    const calcECG = (phase: number, rType: RhythmType): number => {
      if (rType === 'vtach') {
        // Monomorphic Ventricular Tachycardia (Wide, bizarre sinusoidal QRS)
        return -Math.sin(phase * Math.PI * 2) * (42 * leadGain);
      }

      // PVC logic: every 4th beat insert wide ventricular ectopic beat
      const isPVC = rType === 'pvc' && Math.floor(sampleCount / 120) % 4 === 0 && phase > 0.3 && phase < 0.6;
      if (isPVC) {
        return -Math.sin((phase - 0.3) / 0.3 * Math.PI) * (70 * leadGain) + (Math.random() * 2 - 1);
      }

      // Normal Sinus Waveform Morphology
      // 1. P-wave
      if (phase >= 0.12 && phase < 0.22) {
        const t = (phase - 0.12) / 0.10;
        return -Math.sin(t * Math.PI) * (10 * leadGain);
      }
      // 2. Q-wave
      if (phase >= 0.27 && phase < 0.30) {
        const t = (phase - 0.27) / 0.03;
        return Math.sin(t * Math.PI) * (6 * leadGain);
      }
      // 3. R-wave (Sharp Tall Peak)
      if (phase >= 0.30 && phase < 0.35) {
        const t = (phase - 0.30) / 0.05;
        return -Math.sin(t * Math.PI) * (65 * leadGain);
      }
      // 4. S-wave (Dip)
      if (phase >= 0.35 && phase < 0.39) {
        const t = (phase - 0.35) / 0.04;
        return Math.sin(t * Math.PI) * (14 * leadGain);
      }
      // 5. T-wave (Ventricular repolarization)
      if (phase >= 0.50 && phase < 0.68) {
        const t = (phase - 0.50) / 0.18;
        return -Math.sin(t * Math.PI) * (18 * leadGain);
      }

      // Baseline electrical drift + AFib fibrillatory waves
      if (rType === 'afib') {
        return Math.sin(phase * 40) * 3.5 + (Math.random() * 2 - 1);
      }

      return 0;
    };

    // Photoplethysmogram (PPG / SpO2) with dicrotic notch
    const calcPleth = (phase: number): number => {
      // Rapid systolic rise (0.15 - 0.35)
      if (phase >= 0.15 && phase < 0.35) {
        const t = (phase - 0.15) / 0.20;
        return -Math.sin(t * Math.PI * 0.5) * 28;
      }
      // Dicrotic notch and secondary wave (0.35 - 0.55)
      if (phase >= 0.35 && phase < 0.55) {
        const t = (phase - 0.35) / 0.20;
        const dicrotic = -14 + Math.sin(t * Math.PI) * 8;
        return dicrotic;
      }
      // Diastolic fall (0.55 - 0.90)
      if (phase >= 0.55 && phase < 0.90) {
        const t = (phase - 0.55) / 0.35;
        return -14 * (1 - t);
      }
      return 0;
    };

    // Respiration Waveform (Thoracic Capnograph / Impedance)
    const calcResp = (respPhase: number): number => {
      // Smooth sinusoidal respiratory cycle with plateau
      return -Math.sin(respPhase * Math.PI * 2) * 18;
    };

    // Arterial Blood Pressure Wave (ABP)
    const calcABP = (phase: number): number => {
      // Fast systolic upstroke
      if (phase >= 0.18 && phase < 0.34) {
        const t = (phase - 0.18) / 0.16;
        return -Math.sin(t * Math.PI * 0.5) * 32;
      }
      // Anacrotic peak & dicrotic notch
      if (phase >= 0.34 && phase < 0.52) {
        const t = (phase - 0.34) / 0.18;
        return -16 + Math.sin(t * Math.PI) * 7;
      }
      // Diastolic runoff
      if (phase >= 0.52 && phase < 0.88) {
        const t = (phase - 0.52) / 0.36;
        return -16 * (1 - t);
      }
      return 0;
    };

    // Render loop
    const render = () => {
      if (isPaused) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Step sweep forward
      const oldSweep = sweepX;
      sweepX = (sweepX + speed) % clientW;

      // Calculate phases
      const framesPerBeat = (3600 / Math.max(30, bpm));
      const beatPhase = (sampleCount % framesPerBeat) / framesPerBeat;

      // Respiration cycle: 60 / respRate seconds = (3600 / respRate) frames
      const framesPerResp = (3600 / Math.max(6, respRate));
      const respPhase = (sampleCount % framesPerResp) / framesPerResp;

      // Trigger telemetry audio blip exactly at R-peak (phase ~ 0.32)
      if (beatPhase >= 0.31 && beatPhase < 0.34) {
        const now = Date.now();
        if (now - lastBeepTimeRef.current > 350) {
          lastBeepTimeRef.current = now;
          playTelemetryBeep(spo2);
        }
      }

      // Compute new values
      const yEcg = ch1Base + calcECG(beatPhase, rhythm);
      const yPleth = ch2Base + calcPleth(beatPhase);
      const yResp = ch3Base + calcResp(respPhase);
      const yAbp = ch4Base + calcABP(beatPhase);

      const targetIdx = Math.floor(sweepX);
      ecgBuffer[targetIdx] = yEcg;
      plethBuffer[targetIdx] = yPleth;
      respBuffer[targetIdx] = yResp;
      abpBuffer[targetIdx] = yAbp;

      sampleCount++;

      // DRAWING
      // 1. Clear erase-bar ahead of sweep (simulates phosphor decay CRT sweep)
      const eraseWidth = 24;
      ctx.fillStyle = '#030712'; // True pitch black monitor background
      ctx.fillRect(sweepX, 0, eraseWidth, clientH);

      // Redraw subtle ECG medical grid in erase-bar
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 0.5;
      const gridSize = 16;
      for (let x = Math.floor(sweepX); x < sweepX + eraseWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, clientH);
        ctx.stroke();
      }

      // 2. Channel 1: Lead II ECG (Phosphor Green #22c55e)
      ctx.strokeStyle = rhythm === 'vtach' ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 2.0;
      ctx.shadowColor = rhythm === 'vtach' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.7)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      const prevX = Math.floor(oldSweep);
      ctx.moveTo(prevX, ecgBuffer[prevX] || ch1Base);
      ctx.lineTo(targetIdx, yEcg);
      ctx.stroke();

      // 3. Channel 2: SpO2 Plethysmograph (Cyan #06b6d4)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(prevX, plethBuffer[prevX] || ch2Base);
      ctx.lineTo(targetIdx, yPleth);
      ctx.stroke();

      // 4. Channel 3: Respiration (Yellow #eab308)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(234, 179, 8, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(prevX, respBuffer[prevX] || ch3Base);
      ctx.lineTo(targetIdx, yResp);
      ctx.stroke();

      // 5. Channel 4: Arterial Blood Pressure (Coral / Red #f43f5e)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(prevX, abpBuffer[prevX] || ch4Base);
      ctx.lineTo(targetIdx, yAbp);
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    // Initial background clear & grid paint
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, clientW, clientH);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < clientW; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, clientH);
      ctx.stroke();
    }
    for (let y = 0; y < clientH; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(clientW, y);
      ctx.stroke();
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [bpm, spo2, respRate, rhythm, isPaused, height, leadGain, playTelemetryBeep]);

  // Mean Arterial Pressure (MAP) = (2*Dia + Sys) / 3
  const mapValue = Math.round((2 * diaBp + sysBp) / 3);

  const isEmergency = rhythm === 'vtach' || bpm < 40 || bpm > 150 || spo2 < 90;

  return (
    <div
      ref={containerRef}
      className={`relative rounded-3xl overflow-hidden border transition-all duration-300 font-mono ${isFullscreen
          ? 'fixed inset-0 z-50 bg-[#020617] p-4 flex flex-col justify-between'
          : 'bg-[#030712] border-slate-700/80 shadow-[0_0_35px_rgba(15,23,42,0.8)]'
        }`}
    >
      {/* Top Clinical Header Bar with LED Alarm Status */}
      <div className="bg-[#0b1329] px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-3">
          {/* Flashing Clinical Alarm LED */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-700">
            <span
              className={`w-3 h-3 rounded-full ${isEmergency
                  ? 'bg-red-500 animate-ping'
                  : rhythm === 'bradycardia' || rhythm === 'tachycardia' || rhythm === 'pvc'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
            ></span>
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-200">
              {isEmergency
                ? 'CRITICAL ALARM: VT / SEVERE DESAT'
                : rhythm !== 'normal'
                  ? 'ARRHYTHMIA DETECTED'
                  : 'NORMAL SINUS RHYTHM'}
            </span>
          </div>

          <div className="text-slate-400 hidden sm:flex items-center gap-2">
            <span className="text-teal-400 font-bold">{bedId}</span>
            <span>•</span>
            <span className="text-slate-200 font-medium">{patientName}</span>
          </div>
        </div>

        {/* Telemetry Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span className={`px-2 py-0.5 rounded border ${wsConnected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-teal-300 border-slate-700'}`}>
              FEED: {wsConnected ? 'LIVE WS TELEMETRY' : 'AAMI EC11 SYNTH'}
            </span>
            <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded border border-slate-700">
              SWEEP: 25 mm/s
            </span>
            <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded border border-slate-700">
              GAIN: {leadGain.toFixed(1)}x
            </span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              FILTER: 0.05-40Hz DIAG
            </span>
          </div>

          {/* Audio Beep Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-[11px] ${soundEnabled
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-[0_0_10px_rgba(20,184,166,0.2)]'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            title={soundEnabled ? 'Mute QRS sound' : 'Enable realistic hospital telemetry sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'BEEP ON' : 'MUTED'}</span>
          </button>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title={isPaused ? 'Resume live sweep' : 'Freeze trace'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Expand to Fullscreen ICU Cockpit"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-teal-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Telemetry Body: Left Canvas + Right HUD Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 relative">

        {/* Left Side: CRT Screen Canvas with Multi-Channel Waveforms (8 or 9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 relative bg-[#020617] border-r border-slate-800/80 overflow-hidden">

          {/* Channel Annotation Badges Overlay */}
          <div className="absolute top-2 left-3 z-10 space-y-1 pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/40">
                II ECG 1mV
              </span>
              <span className="text-[10px] text-emerald-300/80 font-mono">
                HR: {bpm} bpm • ST: +0.02mV • QTc: 412ms
              </span>
            </div>
          </div>

          <div className="absolute top-[35%] left-3 z-10 pointer-events-none select-none">
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/40">
              PLETH SpO2
            </span>
            <span className="text-[10px] text-cyan-300/80 ml-2 font-mono">
              PI: 3.8% • SpO2: {spo2}%
            </span>
          </div>

          <div className="absolute top-[58%] left-3 z-10 pointer-events-none select-none">
            <span className="text-[11px] font-bold text-yellow-400 bg-yellow-950/70 px-1.5 py-0.5 rounded border border-yellow-500/40">
              RESP / CAPNO
            </span>
            <span className="text-[10px] text-yellow-300/80 ml-2 font-mono">
              RATE: {respRate} rpm • EtCO2: 38 mmHg
            </span>
          </div>

          <div className="absolute top-[79%] left-3 z-10 pointer-events-none select-none">
            <span className="text-[11px] font-bold text-rose-400 bg-rose-950/70 px-1.5 py-0.5 rounded border border-rose-500/40">
              ABP ART PULSE
            </span>
            <span className="text-[10px] text-rose-300/80 ml-2 font-mono">
              SYS/DIA: {sysBp}/{diaBp} ({mapValue})
            </span>
          </div>

          {/* Canvas */}
          <div className="w-full relative">
            <canvas ref={canvasRef} className="w-full block" />

            {/* CRT Phosphor Scanline Overlay Texture */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
          </div>
        </div>

        {/* Right Side: Clinical LED Vitals HUD (3 or 4 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-[#0a0f1d] p-4 flex flex-col justify-between space-y-3">

          {/* HUD Parameter 1: Heart Rate (HR) */}
          <div className="bg-[#030712] p-3 rounded-2xl border border-emerald-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)] relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-emerald-400 animate-pulse-heart" />
                ECG HR (bpm)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">50 - 120</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight font-mono">
                {bpm}
              </span>
              <div className="text-right text-[10px] text-slate-400">
                <div>PR: 158 ms</div>
                <div>QRS: 88 ms</div>
              </div>
            </div>
          </div>

          {/* HUD Parameter 2: SpO2 % */}
          <div className="bg-[#030712] p-3 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] relative overflow-hidden">
            <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                SpO2 (%)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">90 - 100</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-4xl sm:text-5xl font-black text-cyan-400 tracking-tight font-mono">
                {spo2}
              </span>
              <div className="text-right text-[10px] text-slate-400">
                <div>PI: 3.8%</div>
                <div>Pulse: {bpm}</div>
              </div>
            </div>
          </div>

          {/* HUD Parameter 3: Non-Invasive Blood Pressure (NIBP) */}
          <div className="bg-[#030712] p-3 rounded-2xl border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] relative overflow-hidden">
            <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-rose-400" />
                NIBP (mmHg)
              </span>
              <button
                onClick={triggerNIBPMeasurement}
                disabled={isNIBPMeasuring}
                className="text-[10px] bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 px-2 py-0.5 rounded border border-rose-500/40 transition flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isNIBPMeasuring ? 'animate-spin' : ''}`} />
                {isNIBPMeasuring ? `INFLATING (${nibpCountdown}s)` : 'CYCLE NOW'}
              </button>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-rose-400 tracking-tight font-mono">
                  {sysBp}/{diaBp}
                </span>
                <span className="text-xs text-rose-300/80 ml-2 font-mono">
                  ({mapValue})
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Auto: 15m</span>
            </div>
          </div>

          {/* HUD Parameter 4 & 5: Respiration + Temp in Split Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#030712] p-2.5 rounded-xl border border-yellow-500/30">
              <div className="text-yellow-400 text-[10px] font-bold flex items-center gap-1">
                <Wind className="w-3 h-3" />
                RESP (rpm)
              </div>
              <div className="text-2xl font-black text-yellow-400 font-mono mt-0.5">
                {respRate}
              </div>
            </div>

            <div className="bg-[#030712] p-2.5 rounded-xl border border-amber-500/30">
              <div className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                TEMP (°C)
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                {tempC}°
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Clinical Control Strip: Arrhythmia Simulator & Gain Controls */}
      <div className="bg-[#0b1329] p-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">

        {/* Arrhythmia Rhythm Selector (Interactive Training & Testing Mode) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            Rhythm Simulation:
          </span>

          {(['normal', 'bradycardia', 'tachycardia', 'afib', 'vtach', 'pvc'] as RhythmType[]).map(r => (
            <button
              key={r}
              onClick={() => setRhythm(r)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition border capitalize ${rhythm === r
                  ? r === 'vtach'
                    ? 'bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                    : r === 'normal'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-teal-600 text-white border-teal-500'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
            >
              {r === 'vtach' ? '⚠️ Ventricular Tach' : r === 'afib' ? 'Atrial Fib' : r}
            </button>
          ))}
        </div>

        {/* ECG Lead Gain Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">ECG Gain:</span>
          {[0.5, 1.0, 2.0].map(gain => (
            <button
              key={gain}
              onClick={() => setLeadGain(gain)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${leadGain === gain
                  ? 'bg-teal-500/30 text-teal-300 border-teal-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
            >
              {gain}x
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};

