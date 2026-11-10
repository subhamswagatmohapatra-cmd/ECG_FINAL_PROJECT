import React, { useState } from 'react';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck, Stethoscope, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, quickDemoLogin } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('patient@cardiopulse.health');
  const [password, setPassword] = useState('PatientPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome Back', 'Authentication successful', 'success');
      onNavigate(email.startsWith('admin') ? 'admin' : (email.startsWith('doc') ? 'doctor' : 'dashboard'));
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      showToast('Authentication Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (demoEmail: string, demoRole: string) => {
    setLoading(true);
    try {
      await quickDemoLogin(demoEmail);
      showToast('Clinical Persona Loaded', `Switched to ${demoEmail}`, 'info');
      onNavigate(demoRole === 'admin' ? 'admin' : (demoRole === 'doctor' ? 'doctor' : 'dashboard'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden backdrop-blur-2xl">
        
        {/* Card Header */}
        <div className="bg-gradient-to-r from-[#030712] via-[#0b1329] to-[#030712] text-white p-6 text-center border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-3 text-teal-400 shadow-lg shadow-teal-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Sign In to CardioPulse</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">Clinical Decision Support & Telemetry Cockpit</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-950/40 border border-rose-500/60 text-rose-200 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                placeholder="name@cardiopulse.health"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-teal-500/25 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          {/* Quick Demo Shortcuts */}
          <div className="pt-4 border-t border-slate-800">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              One-Click Clinical Demo Personas
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoSelect('patient@cardiopulse.health', 'patient')}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] py-2 px-3 rounded-xl font-medium text-left transition flex items-center justify-between"
              >
                <span>Johnathan (Patient)</span>
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('doctor@cardiopulse.health', 'doctor')}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] py-2 px-3 rounded-xl font-medium text-left transition flex items-center justify-between"
              >
                <span>Dr. Chen (Cardio MD)</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('chestpain@cardiopulse.health', 'patient')}
                className="bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800 text-rose-300 text-[11px] py-2 px-3 rounded-xl font-medium text-left transition flex items-center justify-between"
              >
                <span>Chest Pain Triage</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('admin@cardiopulse.health', 'admin')}
                className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800 text-purple-300 text-[11px] py-2 px-3 rounded-xl font-medium text-left transition flex items-center justify-between"
              >
                <span>Administrator</span>
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 pt-2">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-teal-400 hover:text-teal-300 hover:underline font-semibold"
            >
              Register Patient Profile
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
