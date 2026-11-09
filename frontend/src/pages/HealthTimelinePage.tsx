import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Clock, Activity, FileText, AlertTriangle, CheckCircle2,
  Calendar, Stethoscope, Filter, Search, ChevronRight, Download
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'reading' | 'report' | 'appointment' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
  badgeColor?: string;
  meta?: any;
}

export const HealthTimelinePage: React.FC<{ onNavigate?: (tab: string) => void }> = ({
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const [readings, reports, appointments] = await Promise.all([
        api.getReadings(30),
        api.getReports(),
        api.getAppointments(),
      ]);

      const compiled: TimelineEvent[] = [];

      // Add readings
      readings.forEach((r: any) => {
        compiled.push({
          id: `reading-${r.id}`,
          type: 'reading',
          title: `Heart Rate Reading: ${r.bpm} BPM`,
          description: `Recorded via ${r.device_name || 'Manual Cuff'} (${r.resting_status}). ${
            r.notes ? `Note: ${r.notes}` : ''
          }`,
          timestamp: r.measurement_time,
          badge: `${r.bpm} BPM`,
          badgeColor: r.bpm > 100 ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300',
          meta: r,
        });
      });

      // Add reports
      reports.forEach((rep: any) => {
        compiled.push({
          id: `report-${rep.id}`,
          type: 'report',
          title: `Formal Clinical Health Report (${rep.report_reference_code})`,
          description: rep.summary || 'Comprehensive clinical decision support report generated.',
          timestamp: rep.generated_at,
          badge: rep.is_clinician_approved ? 'APPROVED BY MD' : 'PENDING REVIEW',
          badgeColor: rep.is_clinician_approved
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-indigo-500/20 text-indigo-300',
          meta: rep,
        });
      });

      // Add appointments
      appointments.forEach((appt: any) => {
        compiled.push({
          id: `appt-${appt.id}`,
          type: 'appointment',
          title: `Cardiology Consultation: ${appt.doctor_name || 'Dr. Sarah Chen'}`,
          description: `Reason: ${appt.reason}. Mode: ${appt.appointment_type.replace('_', ' ').toUpperCase()}`,
          timestamp: appt.appointment_date,
          badge: appt.status.toUpperCase(),
          badgeColor: appt.status === 'scheduled' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700 text-slate-300',
          meta: appt,
        });
      });

      // Sort descending by timestamp
      compiled.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(compiled);
    } catch (err: any) {
      showToast('Error Loading Timeline', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold mb-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            LONGITUDINAL PATIENT EVENT LEDGER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Patient Health & Clinical Timeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            A chronological health record tracing vital sign trends, safety alerts, formal diagnostic reports, and clinician consultations.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'reading', label: 'Vitals Readings' },
            { id: 'report', label: 'Diagnostic Reports' },
            { id: 'appointment', label: 'Consultations' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterType === f.id
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-800 space-y-8">
        {filteredEvents.map((event) => {
          let icon = <Activity className="w-4 h-4 text-teal-400" />;
          if (event.type === 'report') icon = <FileText className="w-4 h-4 text-indigo-400" />;
          if (event.type === 'appointment') icon = <Calendar className="w-4 h-4 text-cyan-400" />;

          return (
            <div key={event.id} className="relative group">
              {/* Timeline Node Point */}
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-7 h-7 rounded-full bg-[#0a1122] border-2 border-teal-500/50 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-teal-400 transition">
                {icon}
              </div>

              {/* Event Card */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 hover:border-slate-600 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{event.title}</span>
                    {event.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${event.badgeColor}`}>
                        {event.badge}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {event.description}
                </p>

                {/* Report Download Quick Action */}
                {event.type === 'report' && event.meta?.pdf_filename && (
                  <div className="pt-2 flex justify-end">
                    <a
                      href={`/api/v1/reports/${event.meta.id}/download-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Signed PDF</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
