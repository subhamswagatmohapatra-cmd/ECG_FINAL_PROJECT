import React, { useState, useEffect } from 'react';
import {
  Activity, ShieldCheck, User as UserIcon, LogOut, Stethoscope, ChevronDown,
  Heart, FileText, MessageSquareHeart, Settings, AlertCircle, Monitor, Radio,
  Zap, Bell, Sun, Moon, Calendar, Watch, BookOpen, BarChart3, Clock, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Notification } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, quickDemoLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const demoAccounts = [
    { label: 'System Administrator (Full Oversight)', email: 'admin@cardiopulse.health', role: 'admin' },
    { label: 'Dr. Sarah Chen, MD (Cardiologist)', email: 'doctor@cardiopulse.health', role: 'doctor' },
    { label: 'Johnathan Miller (Primary Patient, 46y)', email: 'patient@cardiopulse.health', role: 'patient' },
    { label: 'Marcus Vance (Endurance Athlete, 28y)', email: 'athlete@cardiopulse.health', role: 'patient' },
    { label: 'Leo Sharma (Pediatric Patient, 8y)', email: 'pediatric@cardiopulse.health', role: 'patient' },
    { label: 'Elena Rostova (Pregnancy 28w, 31y)', email: 'pregnant@cardiopulse.health', role: 'patient' },
    { label: 'Arthur Pendelton (Prior MI / Beta-Blocker)', email: 'cardiac@cardiopulse.health', role: 'patient' },
    { label: 'David Kumar (Acute Chest Pain Triage Demo)', email: 'chestpain@cardiopulse.health', role: 'patient' },
    { label: 'Priya Patel (Severe Tachycardia Demo)', email: 'tachy@cardiopulse.health', role: 'patient' },
  ];

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [list, countData] = await Promise.all([
        api.getNotifications(),
        api.getUnreadNotificationCount(),
      ]);
      setNotifications(list.slice(0, 8));
      setUnreadCount(countData.unread_count);
    } catch {
      // Silently handle if unauthenticated
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  return (
    <header className="bg-[#0b1329]/95 dark:bg-[#070d1e]/95 backdrop-blur-md border-b border-slate-800/80 text-white sticky top-0 z-40 shadow-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo & Clinical System Title */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => setActiveTab(user?.role === 'admin' ? 'admin' : user?.role === 'doctor' ? 'doctor' : 'dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-teal-100 to-cyan-300 bg-clip-text text-transparent">
                  CardioPulse AI
                </span>
                <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                  ICU CDSS v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden md:block font-mono">
                CLINICAL DECISION SUPPORT & TELEMETRY PLATFORM
              </p>
            </div>
          </div>

          {/* Navigation Links for Authenticated User */}
          {user && (
            <nav className="hidden xl:flex items-center gap-1 text-xs">
              {/* ADMIN ROLE */}
              {user.role === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition ${activeTab === 'admin'
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Shield className="w-4 h-4 text-purple-400" />
                    Admin Console
                  </button>
                  <button
                    onClick={() => setActiveTab('doctor')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'doctor'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Stethoscope className="w-4 h-4 text-teal-400" />
                    Doctor Portal
                  </button>
                </>
              )}

              {/* PATIENT ROLE */}
              {user.role === 'patient' && (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'dashboard'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Activity className="w-4 h-4" />
                    Dashboard
                  </button>

                  <button
                    onClick={() => setActiveTab('bedside')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition ${activeTab === 'bedside'
                        ? 'bg-gradient-to-r from-emerald-600/40 to-teal-600/40 text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                        : 'text-emerald-400 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Monitor className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Bedside Monitor
                  </button>

                  <button
                    onClick={() => setActiveTab('monitoring')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'monitoring'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Heart className="w-4 h-4 text-red-400" />
                    Vitals
                  </button>

                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'analysis'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    AI Triage
                  </button>

                  <button
                    onClick={() => setActiveTab('3d-hub')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${activeTab === '3d-hub'
                        ? 'bg-gradient-to-r from-teal-600/40 to-cyan-600/40 text-teal-200 border border-teal-400/50 shadow-[0_0_15px_rgba(13,148,136,0.25)]'
                        : 'text-cyan-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Zap className="w-4 h-4 text-cyan-400" />
                    3D Lab
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'analytics'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <BarChart3 className="w-4 h-4 text-teal-400" />
                    Analytics
                  </button>

                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'timeline'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Timeline
                  </button>

                  <button
                    onClick={() => setActiveTab('comms')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'comms'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Consultations
                  </button>

                  <button
                    onClick={() => setActiveTab('education')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'education'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    ECG Academy
                  </button>

                  <button
                    onClick={() => setActiveTab('devices')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'devices'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Watch className="w-4 h-4 text-amber-400" />
                    Devices
                  </button>

                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'reports'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Reports
                  </button>
                </>
              )}

              {/* DOCTOR ROLE */}
              {user.role === 'doctor' && (
                <>
                  <button
                    onClick={() => setActiveTab('doctor')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'doctor'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Stethoscope className="w-4 h-4 text-teal-400" />
                    Clinician Cockpit
                  </button>

                  <button
                    onClick={() => setActiveTab('bedside')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition ${activeTab === 'bedside'
                        ? 'bg-gradient-to-r from-emerald-600/40 to-teal-600/40 text-emerald-300 border border-emerald-400/50'
                        : 'text-emerald-400 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Monitor className="w-4 h-4 text-emerald-400" />
                    ICU Monitor
                  </button>

                  <button
                    onClick={() => setActiveTab('comms')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'comms'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Appointments
                  </button>

                  <button
                    onClick={() => setActiveTab('3d-hub')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === '3d-hub'
                        ? 'bg-gradient-to-r from-teal-600/40 to-cyan-600/40 text-teal-200 border border-teal-400/40'
                        : 'text-cyan-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Zap className="w-4 h-4 text-cyan-400" />
                    3D Cardio Lab
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'privacy'
                    ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <Settings className="w-4 h-4" />
                Privacy
              </button>
            </nav>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Smart Notification Center Bell Drawer */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 relative"
                  title="Clinical Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold font-mono text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0a0f1d] border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-teal-400" />
                        Clinical Notifications
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-teal-400 hover:underline font-mono"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                          No notifications recorded
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkOneRead(n.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition ${n.is_read
                                ? 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                                : 'bg-slate-800/90 border-slate-700 text-white font-medium'
                              }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span
                                className={`uppercase font-bold ${n.priority === 'critical'
                                    ? 'text-red-400'
                                    : n.priority === 'high'
                                      ? 'text-amber-400'
                                      : 'text-teal-400'
                                  }`}
                              >
                                {n.category.replace('_', ' ')}
                              </span>
                              <span className="text-slate-500">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-xs font-semibold leading-tight">{n.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Quick Scenario Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center gap-1 text-[11px] font-semibold bg-slate-800/90 hover:bg-slate-700 text-teal-300 border border-slate-700 px-3 py-1.5 rounded-lg transition"
              >
                <UserIcon className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">Clinical Scenarios</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-[#0a0f1d] border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Switch Patient / Clinical Scenario
                  </div>
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={async () => {
                        setShowDemoMenu(false);
                        await quickDemoLogin(acc.email);
                        setActiveTab(acc.role === 'admin' ? 'admin' : acc.role === 'doctor' ? 'doctor' : 'dashboard');
                      }}
                      className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800/90 hover:text-teal-300 transition flex flex-col"
                    >
                      <span className="font-semibold">{acc.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{acc.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Session Info or Login/Register */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">{user.full_name}</div>
                  <div className="text-[10px] text-teal-400 uppercase font-mono tracking-wider">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 transition border border-slate-700"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('login')}
                  className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-lg transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className="text-xs font-bold bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white px-3 py-1.5 rounded-lg shadow-md transition"
                >
                  Register
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
