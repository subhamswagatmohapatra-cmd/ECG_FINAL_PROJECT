import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { HeartRateMonitoringPage } from './pages/HeartRateMonitoringPage';
import { AIAnalysisPage } from './pages/AIAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { ChatAssistantPage } from './pages/ChatAssistantPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage';
import { Cardiovascular3DHubPage } from './pages/Cardiovascular3DHubPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { EducationCenterPage } from './pages/EducationCenterPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';
import { CardiovascularAnalyticsPage } from './pages/CardiovascularAnalyticsPage';
import { HealthTimelinePage } from './pages/HealthTimelinePage';
import { ECGUploadPage } from './pages/ECGUploadPage';
import { BedsideTelemetryMonitor } from './components/BedsideTelemetryMonitor';
import { ShieldCheck, HeartPulse, Stethoscope, AlertTriangle, Monitor, Radio } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('landing');

  // If user signs in, switch default tab based on role
  React.useEffect(() => {
    if (isAuthenticated && activeTab === 'landing') {
      if (user?.role === 'admin') {
        setActiveTab('admin');
      } else if (user?.role === 'doctor') {
        setActiveTab('doctor');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative">
          <HeartPulse className="w-12 h-12 text-teal-400 animate-pulse-heart" />
          <span className="absolute -inset-2 rounded-full border border-teal-500/30 animate-ping"></span>
        </div>
        <div className="text-center">
          <p className="text-base font-bold tracking-wider text-slate-100 font-mono">
            CARDIOPULSE AI TELEMETRY ENGINE
          </p>
          <p className="text-xs text-teal-400 font-mono mt-1">
            INITIALIZING 1000Hz CLINICAL CDSS PIPELINE...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col telemetry-bg-cockpit font-sans text-slate-100 selection:bg-teal-500 selection:text-white">

      {/* Top Clinical Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Tab Routing */}
        {activeTab === 'landing' && <LandingPage onNavigate={setActiveTab} />}
        {activeTab === 'login' && <LoginPage onNavigate={setActiveTab} />}
        {activeTab === 'register' && <RegisterPage onNavigate={setActiveTab} />}

        {activeTab === 'dashboard' && <PatientDashboard onNavigate={setActiveTab} />}

        {/* Dedicated ICU Bedside Telemetry Suite */}
        {activeTab === 'bedside' && (
          <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE HOSPITAL TELEMETRY FEED • CONTINUOUS LEAD II MONITORING
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Bedside Patient Monitor & Multi-Channel Cockpit
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                  Simulating calibrated Lead II ECG (25 mm/s, 10 mm/mV), continuous SpO2 photoplethysmogram,
                  impedance pneumogram (respiration), and non-invasive arterial pulse kinematics.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('monitoring')}
                  className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Record Vitals Reading
                </button>
                <button
                  onClick={() => setActiveTab('3d-hub')}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition"
                >
                  3D Cardio Lab
                </button>
              </div>
            </div>

            {/* Live Interactive Telemetry Monitor */}
            <BedsideTelemetryMonitor
              initialBpm={74}
              patientName={user?.full_name || 'Johnathan Miller'}
              bedId="ICU-BAY 04"
              height={440}
            />

            {/* Clinical Reference Footnote */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-700/60 text-xs text-slate-400 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">
                  Clinical Protocol: Real-Time Telemetry & Safety Triage
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Real-time bedside telemetry displays simulated clinical waveforms matching standard hospital monitor specifications (AAMI EC11).
                  In standard clinical practice, life-threatening arrhythmias (e.g. Ventricular Tachycardia, Asystole) trigger immediate audio-visual alarms
                  and dispatch clinical code teams. For real patients experiencing acute chest discomfort or syncope, immediately dial local emergency services (112 / 911).
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && <HeartRateMonitoringPage onNavigate={setActiveTab} />}
        {activeTab === 'ecg' && <ECGUploadPage onNavigate={setActiveTab} />}
        {activeTab === 'analysis' && <AIAnalysisPage onNavigate={setActiveTab} />}
        {activeTab === '3d-hub' && <Cardiovascular3DHubPage onNavigate={setActiveTab} />}
        {activeTab === 'analytics' && <CardiovascularAnalyticsPage onNavigate={setActiveTab} />}
        {activeTab === 'timeline' && <HealthTimelinePage onNavigate={setActiveTab} />}
        {activeTab === 'comms' && <CommunicationPage />}
        {activeTab === 'education' && <EducationCenterPage />}
        {activeTab === 'devices' && <DeviceManagementPage />}
        {activeTab === 'admin' && <AdminDashboardPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'chat' && <ChatAssistantPage />}
        {activeTab === 'doctor' && <DoctorDashboardPage />}
        {activeTab === 'privacy' && <SettingsPrivacyPage />}

      </main>

      {/* Clinical Disclaimer & Healthcare Footer */}
      <footer className="bg-[#050b18]/90 text-slate-400 text-xs py-8 border-t border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">CardioPulse AI</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full uppercase font-mono">
                CLINICAL CDSS PLATFORM v1.0 • TELEMETRY ENGINE
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Emergency Protocol: If experiencing severe chest pain, shortness of breath, or syncope, immediately dial <strong className="text-white underline">112 / 911</strong>.
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed text-center sm:text-left">
            <strong>MANDATORY REGULATORY DISCLAIMER:</strong> CardioPulse is an AI-assisted clinical decision-support and educational tool designed
            to assist patients and healthcare professionals. It does not provide medical diagnoses, replace clinical judgement, or prescribe treatments.
            A single pulse reading cannot substitute for a diagnostic 12-lead Electrocardiogram (ECG). Always seek the advice of a qualified physician with any questions
            regarding a medical condition.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 pt-2 font-mono gap-2">
            <span>© 2026 CardioPulse Health Systems Inc. • All rights reserved</span>
            <div className="flex items-center gap-4">
              <span>HIPAA Compliant</span>
              <span>•</span>
              <span>GDPR Health Data</span>
              <span>•</span>
              <span>DPDPA (India)</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
