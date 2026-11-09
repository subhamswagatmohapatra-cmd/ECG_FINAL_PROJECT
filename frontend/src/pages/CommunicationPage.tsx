import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Appointment, Message, DoctorSummary } from '../types';
import {
  MessageSquare, Calendar, Send, Clock, Video, User, CheckCircle2,
  AlertTriangle, Plus, ChevronRight, Phone, Stethoscope, ShieldCheck
} from 'lucide-react';

export const CommunicationPage: React.FC<{ initialTab?: 'messages' | 'appointments' }> = ({
  initialTab = 'messages',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'messages' | 'appointments'>(initialTab);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);

  // Message Form State
  const [messageText, setMessageText] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Appointment Modal State
  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [bookingDoctorId, setBookingDoctorId] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingType, setBookingType] = useState<string>('telehealth');
  const [bookingReason, setBookingReason] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);

  const loadAll = async () => {
    try {
      const [msgs, appts, docs] = await Promise.all([
        api.getMessages(),
        api.getAppointments(),
        api.getAvailableDoctors(),
      ]);
      setMessages(msgs);
      setAppointments(appts);
      setDoctors(docs);

      if (docs.length > 0 && !selectedRecipientId) {
        setSelectedRecipientId(docs[0].id);
        setBookingDoctorId(docs[0].id);
      }
    } catch (err: any) {
      showToast('Error Loading Communications', err.message, 'error');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedRecipientId) return;

    setSendingMessage(true);
    try {
      const newMsg = await api.sendMessage({
        recipient_id: selectedRecipientId,
        content: messageText.trim(),
        is_urgent: isUrgent,
      });
      setMessages((prev) => [...prev, newMsg]);
      setMessageText('');
      setIsUrgent(false);
      showToast('Message Sent', 'Your clinical message has been transmitted.', 'success');
    } catch (err: any) {
      showToast('Transmission Failed', err.message, 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingReason) {
      showToast('Missing Fields', 'Please select a date and enter the reason.', 'warning');
      return;
    }

    setBookingLoading(true);
    try {
      const appt = await api.createAppointment({
        doctor_id: bookingDoctorId,
        appointment_date: new Date(bookingDate).toISOString(),
        appointment_type: bookingType,
        reason: bookingReason,
        clinical_notes: bookingNotes,
      });
      setAppointments((prev) => [appt, ...prev]);
      setShowBookModal(false);
      setBookingReason('');
      setBookingNotes('');
      showToast('Consultation Scheduled', 'Your appointment request has been confirmed.', 'success');
    } catch (err: any) {
      showToast('Booking Failed', err.message, 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    try {
      await api.updateAppointment(id, { status: 'cancelled' });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      );
      showToast('Appointment Cancelled', 'The consultation has been cancelled.', 'info');
    } catch (err: any) {
      showToast('Action Failed', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            END-TO-END ENCRYPTED CLINICAL COMMUNICATIONS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Patient-Doctor Telehealth & Consultations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Direct, HIPAA-compliant messaging with your cardiologist and seamless appointment scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'messages'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Secure Messages
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'appointments'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Consultations ({appointments.filter((a) => a.status === 'scheduled').length})
          </button>
        </div>
      </div>

      {/* MESSAGES VIEW */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact Directory */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-700/60 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-400" />
              Attending Physicians & Specialists
            </h3>

            <div className="space-y-2">
              {doctors.map((doc) => {
                const isSelected = selectedRecipientId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedRecipientId(doc.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/50 text-white'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>{doc.full_name}</span>
                      <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                        Cardiologist
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {doc.specialty || 'General Cardiology'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {doc.hospital_affiliation || 'Metropolitan Heart Institute'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-bold block mb-1">Emergency Protocol:</span>
              For crushing chest pain, syncope, or acute shortness of breath, do not wait for a message reply. Dial <strong className="text-white">112 / 911</strong> immediately.
            </div>
          </div>

          {/* Right: Message Stream */}
          <div className="lg:col-span-2 glass-panel rounded-3xl border border-slate-700/60 flex flex-col h-[600px] overflow-hidden">
            {/* Conversation Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center font-bold text-white text-xs">
                  DR
                </div>
                <div>
                  <div className="font-bold text-sm text-white">
                    {doctors.find((d) => d.id === selectedRecipientId)?.full_name || 'Cardiologist Consultation'}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Encrypted Clinical Channel • Active
                  </div>
                </div>
              </div>
            </div>

            {/* Message Stream Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                  <MessageSquare className="w-10 h-10 stroke-[1.5] text-slate-600" />
                  <p className="text-xs">No messages recorded in this conversation yet.</p>
                  <p className="text-[11px] text-slate-600">Send an inquiry to your attending physician below.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-br-none shadow-lg shadow-teal-500/10'
                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/70'
                        } ${msg.is_urgent ? 'ring-2 ring-red-500' : ''}`}
                      >
                        {msg.is_urgent && (
                          <div className="inline-flex items-center gap-1 text-[10px] bg-red-500/30 text-red-200 px-2 py-0.5 rounded-full font-bold mb-1.5">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            CLINICALLY URGENT
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/80 space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
                  />
                  <span className={isUrgent ? 'text-red-400 font-semibold' : ''}>
                    Flag message as clinically urgent (palpitations, sudden onset)
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a clinical query or symptom update..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !messageText.trim()}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPOINTMENTS VIEW */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              Upcoming & Historical Consultations
            </h2>
            <button
              onClick={() => setShowBookModal(true)}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Book New Consultation
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((appt) => {
              const isScheduled = appt.status === 'scheduled';
              const isCompleted = appt.status === 'completed';

              return (
                <div
                  key={appt.id}
                  className="glass-panel p-5 rounded-2xl border border-slate-700/60 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          isScheduled
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                        }`}
                      >
                        {appt.status}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(appt.appointment_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-cyan-400" />
                        {appt.appointment_type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Attending: <span className="text-slate-200 font-medium">{appt.doctor_name || 'Dr. Sarah Chen, MD'}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-mono mb-1">Reason for Visit:</span>
                      {appt.reason}
                    </div>

                    {appt.clinical_notes && (
                      <div className="text-[11px] text-teal-300 bg-teal-950/30 border border-teal-800/40 p-2.5 rounded-xl">
                        <span className="font-bold block text-[10px] text-teal-400 uppercase font-mono">Clinician Instructions:</span>
                        {appt.clinical_notes}
                      </div>
                    )}
                  </div>

                  {isScheduled && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Time: {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Cancel Visit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                Schedule Cardiology Consultation
              </h3>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ ESC
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Physician</label>
                <select
                  value={bookingDoctorId}
                  onChange={(e) => setBookingDoctorId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.specialty || 'Cardiologist'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Consultation Mode</label>
                  <select
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="telehealth">Telehealth Video</option>
                    <option value="in_person">In-Person Outpatient</option>
                    <option value="urgent_evaluation">Urgent Cardiac Check</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason for Visit / Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Follow-up on elevated resting heart rate readings and fatigue"
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Additional Clinical Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Mention current medications, exercise changes, or recent illness..."
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                >
                  {bookingLoading ? 'Submitting...' : 'Confirm Consultation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

