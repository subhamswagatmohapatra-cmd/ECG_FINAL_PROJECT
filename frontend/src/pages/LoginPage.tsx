import React, { useState } from 'react';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, quickDemoLogin } = useAuth();
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
      onNavigate(email.startsWith('doc') ? 'doctor' : 'dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (demoEmail: string, demoRole: string) => {
    setLoading(true);
    try {
      await quickDemoLogin(demoEmail);
      onNavigate(demoRole === 'doctor' ? 'doctor' : 'dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Card Header */}
        <div className="bg-gradient-to-r from-navy-900 to-slate-900 text-white p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-3 text-teal-300">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">Sign In to CardioPulse</h2>
          <p className="text-xs text-slate-400 mt-1">Clinical Decision Support & Vitals Portal</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="name@cardiopulse.health"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          {/* Quick Demo Shortcuts */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              One-Click Clinical Demo Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSelect('patient@cardiopulse.health', 'patient')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Johnathan (Patient)</span>
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('doctor@cardiopulse.health', 'doctor')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Dr. Chen (Cardiologist)</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('chestpain@cardiopulse.health', 'patient')}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs py-2 px-3 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Chest Pain Triage</span>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('athlete@cardiopulse.health', 'patient')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Athlete (Bradycardia)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-2">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-teal-600 hover:underline font-semibold"
            >
              Register Patient Profile
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
