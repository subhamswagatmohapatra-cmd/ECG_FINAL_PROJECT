import React, { useState } from 'react';
import { MessageSquareHeart, Send, ShieldAlert, AlertTriangle, Sparkles, User, Bot, HelpCircle, PhoneCall } from 'lucide-react';
import { api } from '../services/api';
import { ChatMessage, EmergencyAlert } from '../types';

export const ChatAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 
        "Hello! I am your CardioPulse Clinical Decision Support AI Assistant. " +
        "I can help explain your heart rate readings, outline physiological factors that influence your pulse, " +
        "and provide guidance on when you should consult a doctor.\n\n" +
        "How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<EmergencyAlert | null>(null);

  const quickQuestions = [
    "What does my heart rate reading mean?",
    "Why might my heart rate be elevated?",
    "What symptoms should I watch for?",
    "How can I monitor my heart rate accurately?",
    "What factors can affect resting heart rate?"
  ];

  const handleSend = async (messageToSend?: string) => {
    const text = messageToSend || input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.sendChatMessage(text, history);

      if (response.is_emergency && response.emergency_guidance) {
        setActiveEmergencyAlert(response.emergency_guidance);
      }

      const botMsg: ChatMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_emergency: response.is_emergency,
        emergency_guidance: response.emergency_guidance
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Apologies, an error occurred: ${e.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      
      {/* Header */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">CardioPulse AI Clinical Assistant</h1>
            <p className="text-xs text-slate-400 font-mono">Context-aware health education with real-time emergency triage guardrails</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
          AI Guardrails Active
        </span>
      </div>

      {/* Emergency Alert Banner if Triggered */}
      {activeEmergencyAlert && (
        <div className="p-4 bg-red-600 text-white rounded-3xl shadow-2xl border border-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider">{activeEmergencyAlert.alert_title}</h4>
              <p className="text-xs opacity-95 mt-0.5">{activeEmergencyAlert.alert_reason}</p>
            </div>
          </div>
          <a
            href={`tel:${activeEmergencyAlert.hotline_number || '112'}`}
            className="flex items-center gap-2 bg-white text-red-600 font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-red-50 transition shrink-0"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            Call Emergency ({activeEmergencyAlert.hotline_number || '112'})
          </a>
        </div>
      )}

      {/* Chat Window Container */}
      <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col h-[560px] overflow-hidden">
        
        {/* Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-4 space-y-1.5 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-tr-none shadow-md'
                  : msg.is_emergency
                    ? 'bg-red-950/80 text-red-200 border border-red-500/40 rounded-tl-none'
                    : 'bg-slate-900/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-line leading-relaxed font-sans">
                  {msg.content}
                </div>
                <div className={`text-[10px] text-right font-mono ${msg.role === 'user' ? 'text-teal-200' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-2xl rounded-tl-none font-mono">
                AI clinical assistant is reasoning...
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <span className="text-[10px] font-semibold text-slate-500 shrink-0 uppercase tracking-wider">Suggested:</span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="bg-slate-800/90 hover:bg-slate-700 hover:text-teal-300 hover:border-teal-500/40 border border-slate-700 text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition text-xs shrink-0 font-sans"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#0a0f1d] border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask about your heart rate, symptoms, or physiological factors..."
            className="flex-1 text-xs sm:text-sm p-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-100 placeholder-slate-500 font-sans"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white p-3 rounded-xl transition disabled:opacity-40 shadow-lg shadow-teal-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Safety Notice Footer */}
      <p className="text-center text-[11px] text-slate-400 italic font-mono">
        Clinical Decision Support Advisory: CardioPulse AI is for educational and monitoring support. 
        It does not diagnose conditions or prescribe medications. In case of acute pain or emergency, call 112 immediately.
      </p>

    </div>
  );
};
