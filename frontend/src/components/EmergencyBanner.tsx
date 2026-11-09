import React from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, X } from 'lucide-react';
import { EmergencyAlert } from '../types';

interface EmergencyBannerProps {
  alert: EmergencyAlert;
  onDismiss?: () => void;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ alert, onDismiss }) => {
  if (alert.alert_level === 'GREEN') return null;

  const isRed = alert.alert_level === 'RED';
  const isOrange = alert.alert_level === 'ORANGE';

  const bgColor = isRed 
    ? 'bg-red-600 text-white' 
    : isOrange 
      ? 'bg-amber-500 text-white' 
      : 'bg-yellow-400 text-slate-900';

  return (
    <div className={`w-full ${bgColor} shadow-lg py-4 px-4 sm:px-6 transition-all duration-300 relative z-50 rounded-b-xl`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-full shrink-0">
            {isRed ? <AlertTriangle className="w-6 h-6 animate-bounce" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-black/25">
                {alert.alert_level} SAFETY ALERT
              </span>
              <h4 className="font-bold text-base md:text-lg leading-tight">{alert.alert_title}</h4>
            </div>
            <p className="text-sm mt-1 opacity-95 max-w-3xl leading-relaxed">
              {alert.alert_reason}
            </p>
            {alert.emergency_actions && alert.emergency_actions.length > 0 && (
              <div className="mt-2 text-xs opacity-95">
                <span className="font-semibold">Immediate Guidance: </span>
                {alert.emergency_actions.slice(0, 2).join(' • ')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          {isRed && (
            <a
              href={`tel:${alert.hotline_number || '112'}`}
              className="flex items-center gap-2 bg-white text-red-600 font-bold px-4 py-2 rounded-lg text-sm shadow hover:bg-red-50 transition transform active:scale-95"
            >
              <PhoneCall className="w-4 h-4 animate-pulse" />
              Call Emergency ({alert.hotline_number || '112'})
            </a>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 hover:bg-white/20 rounded-lg transition"
              title="Acknowledge and dismiss banner"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
