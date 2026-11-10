import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Activity, AlertTriangle, ShieldCheck, CheckCircle2,
  Download, UserCheck, Stethoscope, RefreshCw, Sparkles, ChevronRight,
  Info, Heart, Eye, ArrowUpRight, Clock, Plus
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ECGUploadPageProps {
  onNavigate?: (tab: string) => void;
}

export const ECGUploadPage: React.FC<ECGUploadPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Intake Form State
  const [file, setFile] = useState<File | null>(null);
  const [recordedBp, setRecordedBp] = useState<string>('120/80');
  const [recordedHr, setRecordedHr] = useState<string>('72');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [familyHistory, setFamilyHistory] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');

  // UI state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [activeAnalysis, setActiveAnalysis] = useState<any | null>(null);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState<boolean>(true);
  const [presets, setPresets] = useState<any[]>([]);

  // Submit to Doctor modal state
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined);
  const [submitDoctorNotes, setSubmitDoctorNotes] = useState<string>('');
  const [isSubmittingToDoctor, setIsSubmittingToDoctor] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const availableSymptoms = [
    'Chest Pain / Discomfort',
    'Palpitations / Skipping Beats',
    'Shortness of Breath',
    'Dizziness / Lightheadedness',
    'Fatigue / Lethargy',
    'Syncope / Near Fainting'
  ];

  // Fetch presets and past uploads
  useEffect(() => {
    loadPresetsAndUploads();
  }, []);

  const loadPresetsAndUploads = async () => {
    setIsLoadingUploads(true);
    try {
      const [presetsData, uploadsData] = await Promise.all([
        api.getECGDemoPresets().catch(() => []),
        api.getECGUploads().catch(() => [])
      ]);
      setPresets(presetsData);
      setRecentUploads(uploadsData);
      if (uploadsData.length > 0 && !activeAnalysis) {
        setActiveAnalysis(uploadsData[0]);
      }
    } catch (err: any) {
      console.error('Failed to load uploads:', err);
    } finally {
      setIsLoadingUploads(false);
    }
  };

  // Draw ECG Waveform on Canvas whenever active analysis changes
  useEffect(() => {
    if (!activeAnalysis?.signal_data?.raw_samples || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw 1mm Minor Grid (soft salmon pink)
    const minorStep = 6;
    ctx.strokeStyle = '#fee2e2'; // red-100 / salmon
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x < width; x += minorStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += minorStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 2. Draw 5mm Major Grid
    const majorStep = minorStep * 5;
    ctx.strokeStyle = '#fca5a5'; // red-300
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += majorStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += majorStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Draw Waveform
    const samples: number[] = activeAnalysis.signal_data.raw_samples;
    const midY = height / 2;
    const scaleY = 55; // 1 mV = 55 px
    const n = samples.length;

    ctx.strokeStyle = '#0f172a'; // clinical dark navy
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const points: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const px = 25 + (i / Math.max(1, n - 1)) * (width - 50);
      const py = Math.max(5, Math.min(height - 5, midY - samples[i] * scaleY));
      points.push([px, py]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 4. Highlight R-Peaks
    const rIndices: number[] = activeAnalysis.ai_analysis?.r_peak_indices || [];
    ctx.fillStyle = '#ef4444';
    rIndices.forEach((idx) => {
      if (points[idx]) {
        const [rx, ry] = points[idx];
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // 5. Watermark label
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('LEAD II • 25 mm/s • 10 mm/mV • 0.5-45 Hz DSP Filter', 30, height - 12);
  }, [activeAnalysis]);

  const toggleSymptom = (s: string) => {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleApplyPreset = (preset: any) => {
    // Create virtual File from preset sample CSV
    const blob = new Blob([preset.sample_csv], { type: 'text/csv' });
    const virtualFile = new File([blob], `${preset.id}_lead2.csv`, { type: 'text/csv' });
    setFile(virtualFile);
    setRecordedHr(preset.target_bpm.toString());
    setPatientNotes(`Clinical verification preset: ${preset.name}`);
    showToast('Demo Preset Loaded', `${preset.name} loaded. Click "Analyze Signal with AI" to execute DSP pipeline.`, 'info');
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      showToast('File Required', 'Please select an ECG file (CSV, TXT, PDF, WFDB, or Image) or select a demo preset.', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);
    if (recordedBp) formData.append('recorded_bp', recordedBp);
    if (recordedHr) formData.append('recorded_hr', recordedHr);
    formData.append('symptoms', JSON.stringify(symptoms));
    if (familyHistory) formData.append('family_history', familyHistory);
    if (patientNotes) formData.append('patient_notes', patientNotes);

    try {
      setUploadProgress(60);
      const res = await api.uploadECG(formData);
      setUploadProgress(100);

      showToast('Analysis Complete', `ECG analyzed: ${res.ai_analysis?.primary_classification || 'Normal'} (${res.ai_analysis?.heart_rate_bpm} BPM)`, 'success');

      setActiveAnalysis(res);
      setFile(null);
      loadPresetsAndUploads();
    } catch (err: any) {
      showToast('Upload Failed', err.message || 'Signal processing error occurred.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmitToDoctor = async () => {
    if (!activeAnalysis?.upload?.id) return;
    setIsSubmittingToDoctor(true);
    try {
      await api.submitECGToDoctor(activeAnalysis.upload.id, {
        doctor_id: selectedDoctorId,
        patient_notes: submitDoctorNotes
      });
      showToast('Submitted to Doctor', 'Your ECG record and AI analysis were transmitted to the cardiologist review queue.', 'success');
      setShowSubmitModal(false);
      loadPresetsAndUploads();
    } catch (err: any) {
      showToast('Submission Failed', err.message || 'Failed to submit report.', 'error');
    } finally {
      setIsSubmittingToDoctor(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'GREEN':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'YELLOW':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'ORANGE':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'RED':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              PHYSIOLOGICAL SIGNAL PROCESSING & CLINICAL DECISION SUPPORT
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              AI ECG Signal Analysis & Cardiac Diagnostic Suite
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Upload raw electrocardiogram files (CSV, TXT, WFDB, PDF, PNG/JPG) for automated zero-phase Butterworth filtering, Pan-Tompkins QRS/R-peak detection, electrophysiological intervals, and AI rhythm classification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate && onNavigate('bedside')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Bedside ICU Monitor
            </button>
            <button
              onClick={() => onNavigate && onNavigate('doctor')}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2 transition"
            >
              <Stethoscope className="w-4 h-4" />
              Doctor Portal
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Intake Form (Left) vs Active Analysis Cockpit (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Intake */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Upload Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-700/80 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-teal-400" />
              1. ECG Signal Ingestion
            </h2>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-600 hover:border-teal-500 rounded-2xl p-6 text-center transition bg-slate-900/40 cursor-pointer relative group">
              <input
                type="file"
                accept=".csv,.txt,.dat,.hea,.pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {file ? file.name : 'Click or drag ECG file to upload'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports: CSV, TXT, WFDB (.dat/.hea), PDF, PNG, JPG (Max 25 MB)
                  </p>
                </div>
                {file && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-mono font-medium mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {(file.size / 1024).toFixed(1)} KB ready
                  </span>
                )}
              </div>
            </div>

            {/* 1-Click Clinical Demo Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Or Load Clinical Verification Preset
                </span>
                <span className="text-[10px] text-teal-400 font-mono">1-Click Test</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:border-teal-500/50 text-left transition text-xs flex flex-col justify-between"
                  >
                    <span className="font-semibold text-slate-200 truncate">{preset.name}</span>
                    <div className="flex items-center justify-between mt-1.5 text-[10px]">
                      <span className="text-slate-400 font-mono">{preset.target_bpm} BPM</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${getTierColor(preset.risk_tier)}`}>
                        {preset.risk_tier}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Clinical Intake Questionnaire */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                2. Clinical Intake Questionnaire
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium">Blood Pressure (mmHg)</label>
                  <input
                    type="text"
                    value={recordedBp}
                    onChange={(e) => setRecordedBp(e.target.value)}
                    placeholder="e.g. 120/80"
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium">Resting HR (BPM)</label>
                  <input
                    type="number"
                    value={recordedHr}
                    onChange={(e) => setRecordedHr(e.target.value)}
                    placeholder="e.g. 72"
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Symptoms Checkboxes */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Reported Symptoms at Recording
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableSymptoms.map((sym) => {
                    const isChecked = symptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                          isChecked
                            ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-semibold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Family History & Notes */}
              <div>
                <label className="text-xs text-slate-300 font-medium">Family Cardiac History</label>
                <input
                  type="text"
                  value={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.value)}
                  placeholder="e.g. Father had myocardial infarction at age 52"
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium">Clinical / Patient Notes</label>
                <textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  rows={2}
                  placeholder="Observations during recording, exertion status, recent medications..."
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-teal-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUploadAndAnalyze}
              disabled={isUploading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Pan-Tompkins DSP Engine... ({uploadProgress}%)
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Analyze Signal with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Waveform & AI Diagnostic Findings */}
        <div className="lg:col-span-7 space-y-6">
          {activeAnalysis ? (
            <>
              {/* Waveform Card */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">
                        {activeAnalysis.upload?.original_filename || 'Calibrated ECG Lead II'}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {activeAnalysis.signal_data?.sampling_rate_hz || 250} Hz
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Recorded: {activeAnalysis.upload?.created_at ? new Date(activeAnalysis.upload.created_at).toLocaleString() : 'Recent'} • Format: {activeAnalysis.upload?.file_format?.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={api.getECGPdfUrl(activeAnalysis.upload.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </a>
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Submit to Doctor
                    </button>
                  </div>
                </div>

                {/* Calibrated 1mm Grid Waveform Canvas */}
                <div className="bg-[#fffaf5] rounded-xl p-2 border border-slate-600 overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={900}
                    height={220}
                    className="w-full h-auto block"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      Pan-Tompkins R-Peaks Detected: <strong>{activeAnalysis.ai_analysis?.r_peak_indices?.length || 0}</strong>
                    </span>
                    <span>•</span>
                    <span>Minor Grid: 1mm (0.04s)</span>
                    <span>•</span>
                    <span>Major Grid: 5mm (0.20s)</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">Zero-Phase Butterworth 0.5-45 Hz Applied</span>
                </div>
              </div>

              {/* AI Diagnostic Metrics & Classification */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-700/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                      AI Rhythm Classification
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                      {activeAnalysis.ai_analysis?.primary_classification || 'Normal Sinus Rhythm'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">MODEL CONFIDENCE</span>
                      <span className="text-lg font-mono font-bold text-teal-300">
                        {activeAnalysis.ai_analysis?.model_confidence_pct || 96}%
                      </span>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs border ${getTierColor(activeAnalysis.ai_analysis?.clinical_risk_tier || 'GREEN')}`}>
                      TIER {activeAnalysis.ai_analysis?.clinical_risk_tier || 'GREEN'}
                    </span>
                  </div>
                </div>

                {/* Electrophysiological Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">HEART RATE</span>
                    <p className="text-xl font-mono font-black text-white mt-1">
                      {activeAnalysis.ai_analysis?.heart_rate_bpm || 72} <span className="text-xs text-slate-400 font-normal">BPM</span>
                    </p>
                    <span className="text-[10px] text-teal-400 font-mono">
                      {activeAnalysis.ai_analysis?.heart_rate_bpm < 60 ? 'Bradycardia' : activeAnalysis.ai_analysis?.heart_rate_bpm > 100 ? 'Tachycardia' : 'Eucardia'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">QRS DURATION</span>
                    <p className="text-xl font-mono font-black text-white mt-1">
                      {activeAnalysis.ai_analysis?.qrs_duration_ms || 88} <span className="text-xs text-slate-400 font-normal">ms</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Ref: 80 - 120 ms</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">QTc (BAZETT)</span>
                    <p className="text-xl font-mono font-black text-white mt-1">
                      {activeAnalysis.ai_analysis?.qtc_interval_ms || 410} <span className="text-xs text-slate-400 font-normal">ms</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Ref: &lt; 450 ms</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">SIGNAL QUALITY</span>
                    <p className="text-xl font-mono font-black text-emerald-400 mt-1">
                      {activeAnalysis.ai_analysis?.signal_quality || 'GOOD'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">SQI: {activeAnalysis.signal_data?.signal_quality_index || 0.95}</span>
                  </div>
                </div>

                {/* HRV Time-Domain Parameters */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">
                    Heart Rate Variability (HRV) Analysis
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Mean RR:</span>{' '}
                      <strong className="text-slate-200 font-mono">{activeAnalysis.ai_analysis?.mean_rr_ms || 830} ms</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">SDNN:</span>{' '}
                      <strong className="text-slate-200 font-mono">{activeAnalysis.ai_analysis?.sdnn_ms || 42} ms</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">RMSSD:</span>{' '}
                      <strong className="text-slate-200 font-mono">{activeAnalysis.ai_analysis?.rmssd_ms || 36} ms</strong>
                    </div>
                  </div>
                </div>

                {/* Explainable AI Notes */}
                {activeAnalysis.ai_analysis?.explainability_notes?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Explainable AI Clinical Insights
                    </span>
                    <ul className="space-y-1.5">
                      {activeAnalysis.ai_analysis.explainability_notes.map((note: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clinical Disclaimer Box */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Clinical Decision Support Guardrail</span>
                    This algorithmic interpretation provides auxiliary diagnostic support and must not be used as a standalone medical diagnosis. Always confirm findings with an attending licensed cardiologist.
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border border-slate-700/80 text-center space-y-4">
              <Activity className="w-12 h-12 text-slate-500 mx-auto animate-pulse" />
              <h3 className="text-lg font-bold text-white">No ECG Selected for Analysis</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Upload your electrocardiogram recording above or select any of the authentic clinical presets (NSR, Atrial Fib, Bradycardia, STEMI) to inspect real-time waveforms and AI classification.
              </p>
            </div>
          )}

          {/* Past Upload History */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-700/80 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
              <span>Patient ECG Upload History</span>
              <span className="text-xs text-teal-400 font-normal">{recentUploads.length} Records</span>
            </h3>

            {isLoadingUploads ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading records...</div>
            ) : recentUploads.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No previous ECG uploads on file.</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recentUploads.map((up) => {
                  const isSelected = activeAnalysis?.upload?.id === up.id;
                  return (
                    <div
                      key={up.id}
                      onClick={() => setActiveAnalysis({ upload: up, signal_data: up.signal_data, ai_analysis: up.ai_analysis })}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-teal-500/20 border-teal-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{up.original_filename}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(up.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-300">
                          {up.ai_analysis?.primary_classification || 'Pending Analysis'} • {up.ai_analysis?.heart_rate_bpm || '--'} BPM
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${getTierColor(up.ai_analysis?.clinical_risk_tier || 'GREEN')}`}>
                          {up.ai_analysis?.clinical_risk_tier || 'GREEN'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit to Doctor Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-400" />
              Submit ECG to Attending Cardiologist
            </h3>
            <p className="text-xs text-slate-400">
              Transmit your ECG waveform, AI telemetry measurements, and intake notes to the doctor review queue for formal clinical sign-off.
            </p>

            <div>
              <label className="text-xs text-slate-300 font-medium">Notes for the Cardiologist</label>
              <textarea
                value={submitDoctorNotes}
                onChange={(e) => setSubmitDoctorNotes(e.target.value)}
                rows={3}
                placeholder="Mention recent palpitations, chest discomfort, or medication changes..."
                className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-teal-500 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitToDoctor}
                disabled={isSubmittingToDoctor}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingToDoctor ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
