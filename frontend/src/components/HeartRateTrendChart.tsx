import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea
} from 'recharts';

interface TrendChartProps {
  data: Array<{
    id: number;
    timestamp: string;
    time_display: string;
    bpm: number;
    resting_status: string;
    method: string;
    device: string;
  }>;
  expectedMin?: number;
  expectedMax?: number;
  restingAvg?: number;
}

export const HeartRateTrendChart: React.FC<TrendChartProps> = ({
  data,
  expectedMin = 60,
  expectedMax = 100,
  restingAvg = 72
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-900/40 rounded-2xl border border-dashed border-slate-700 font-mono">
        <p className="text-sm text-slate-300">No heart rate readings logged yet for this period.</p>
        <p className="text-xs text-slate-500 mt-1">Record a new reading or select a clinical test profile.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-[#0b1329] text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs font-mono">
          <div className="font-semibold text-teal-300">{item.time_display}</div>
          <div className="text-base font-extrabold text-white mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block animate-pulse"></span>
            {item.bpm} <span className="text-xs font-normal text-teal-300">BPM</span>
          </div>
          <div className="text-slate-400 mt-1 capitalize">
            State: <span className="text-slate-200 font-medium">{item.resting_status.replace('_', ' ')}</span>
          </div>
          <div className="text-slate-400 text-[10px] mt-0.5">
            Source: {item.device} ({item.method})
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" vertical={false} />
          <XAxis
            dataKey="time_display"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            domain={[40, 160]}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Normal Reference Range Band */}
          <ReferenceArea
            y1={expectedMin}
            y2={expectedMax}
            fill="#14b8a6"
            fillOpacity={0.08}
            strokeOpacity={0}
          />
          
          <ReferenceLine
            y={expectedMax}
            stroke="#ea580c"
            strokeDasharray="4 4"
            label={{ value: `Max Expected (${expectedMax})`, position: 'insideTopRight', fill: '#fb923c', fontSize: 10 }}
          />
          <ReferenceLine
            y={expectedMin}
            stroke="#0284c7"
            strokeDasharray="4 4"
            label={{ value: `Min Expected (${expectedMin})`, position: 'insideBottomRight', fill: '#38bdf8', fontSize: 10 }}
          />

          <Area
            type="monotone"
            dataKey="bpm"
            stroke="#14b8a6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#bpmGradient)"
            dot={{ r: 3, fill: '#14b8a6', strokeWidth: 1.5, stroke: '#030712' }}
            activeDot={{ r: 6, fill: '#2dd4bf', stroke: '#030712', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
