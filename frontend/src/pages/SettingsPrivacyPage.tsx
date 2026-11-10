import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Trash2, CheckCircle2, AlertTriangle, FileText, Download, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsPrivacyPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [consent, setConsent] = useState({
    consent_data_processing: true,
    consent_ai_analysis: true,
    consent_clinical_sharing: true,
    privacy_policy_version: 'v1.0-clinical-2026',
    consent_timestamp: null as string | null
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [savingConsent, setSavingConsent] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cData, logs] = await Promise.all([
          api.getConsent(),
          api.getAuditLogs(30)
        ]);
        if (cData) setConsent(cData);
        if (logs) setAuditLogs(logs);
      } catch (e) {
        console.error('Failed to load privacy settings', e);
      }
    };
    fetchData();
  }, []);

  const handleConsentToggle = (field: keyof typeof consent) => {
    setConsent(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const saveConsent = async () => {
    setSavingConsent(true);
    try {
      await api.updateConsent({
        consent_data_processing: consent.consent_data_processing,
        consent_ai_analysis: consent.consent_ai_analysis,
        consent_clinical_sharing: consent.consent_clinical_sharing
      });
      showToast('Consent Preferences Saved', 'Your privacy preferences have been updated', 'success');
    } catch (e: any) {
      showToast('Error Updating Consent', e.message, 'error');
    } finally {
      setSavingConsent(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (window.confirm("Are you sure you want to request data erasure? This action initiates a permanent deletion of your historical health records under healthcare privacy protocols.")) {
      try {
        const res = await api.requestDataDeletion();
        setDeletionStatus(res.message);
        showToast('Erasure Request Submitted', res.message, 'info');
      } catch (e: any) {
        showToast('Deletion Request Error', e.message, 'error');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Security, Privacy & Consent Portal</h1>
            <p className="text-xs text-slate-400 mt-0.5">HIPAA, GDPR & Indian Digital Personal Data Protection Act (DPDPA) Compliance</p>
          </div>
        </div>
        <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
          Encrypted AES-256
        </span>
      </div>

      {/* Patient Consent Toggles */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-teal-400" />
          Patient Consent Management
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          You retain full sovereignty over your cardiovascular health records. You may toggle processing permissions at any time:
        </p>

        <div className="space-y-3 text-xs">
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-700/80 bg-slate-900/60 cursor-pointer hover:border-teal-500/40 transition">
            <input
              type="checkbox"
              checked={consent.consent_data_processing}
              onChange={() => handleConsentToggle('consent_data_processing')}
              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 accent-teal-500"
            />
            <div>
              <span className="font-bold text-white block">Vital Signs Telemetry Storage & Processing</span>
              <p className="text-slate-400 mt-0.5">Permits encrypted local storage of heart rate readings, timestamps, and symptom logs.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-700/80 bg-slate-900/60 cursor-pointer hover:border-teal-500/40 transition">
            <input
              type="checkbox"
              checked={consent.consent_ai_analysis}
              onChange={() => handleConsentToggle('consent_ai_analysis')}
              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 accent-teal-500"
            />
            <div>
              <span className="font-bold text-white block">AI Clinical Decision-Support Evaluation</span>
              <p className="text-slate-400 mt-0.5">Enables AI contextual reasoning and natural-language educational insights based on your physiological context.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-700/80 bg-slate-900/60 cursor-pointer hover:border-teal-500/40 transition">
            <input
              type="checkbox"
              checked={consent.consent_clinical_sharing}
              onChange={() => handleConsentToggle('consent_clinical_sharing')}
              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 accent-teal-500"
            />
            <div>
              <span className="font-bold text-white block">Attending Clinician Sharing & Collaboration</span>
              <p className="text-slate-400 mt-0.5">Allows verified cardiologists and attending physicians in your clinic network to review telemetry and sign reports.</p>
            </div>
          </label>
        </div>

        <button
          onClick={saveConsent}
          disabled={savingConsent}
          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
        >
          {savingConsent ? 'Saving...' : 'Save Consent Settings'}
        </button>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            Security Audit Trail
          </h2>
          <span className="text-xs text-slate-400 font-mono">Last {auditLogs.length} events</span>
        </div>
        <p className="text-xs text-slate-400">
          Every vital sign submission, AI evaluation, report download, and clinician review is immutably logged for regulatory compliance.
        </p>

        <div className="max-h-60 overflow-y-auto border border-slate-700/80 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/90 text-slate-300 text-[10px] uppercase font-semibold">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Resource</th>
                <th className="p-2.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50">
                  <td className="p-2.5 font-mono text-[11px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="p-2.5 font-semibold text-slate-200">{log.action}</td>
                  <td className="p-2.5 text-slate-300 font-mono text-[11px]">{log.resource_type} ({log.resource_id})</td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-500">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Erasure & Compliance Box */}
      <div className="p-6 rounded-3xl border border-red-500/40 bg-red-950/20 backdrop-blur-md space-y-3">
        <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          Right to Erasure / Data Purge Request
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          In compliance with the Indian Digital Personal Data Protection Act (DPDPA 2023) and GDPR Article 17, 
          you may request permanent deletion of all stored vitals, AI analyses, and account credentials.
        </p>
        
        {deletionStatus ? (
          <div className="p-3 bg-red-900/40 border border-red-700/60 text-red-200 text-xs rounded-xl font-medium">
            {deletionStatus}
          </div>
        ) : (
          <button
            onClick={handleRequestDeletion}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition"
          >
            Request Permanent Data Erasure
          </button>
        )}
      </div>

    </div>
  );
};
