import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EducationModule, QuizResult } from '../types';
import {
  BookOpen, Award, CheckCircle2, XCircle, Activity, Heart,
  Sparkles, Clock, ArrowRight, RotateCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';

export const EducationCenterPage: React.FC = () => {
  const { showToast } = useToast();
  const [modules, setModules] = useState<EducationModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<EducationModule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Quiz State
  const [activeQuizModule, setActiveQuizModule] = useState<EducationModule | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);

  // ECG Waveform Interactive Simulator State
  const [highlightedWave, setHighlightedWave] = useState<'all' | 'P' | 'PR' | 'QRS' | 'ST' | 'T'>('all');

  const loadModules = async () => {
    setLoading(true);
    try {
      const data = await api.getEducationModules();
      setModules(data);
      if (data.length > 0 && !selectedModule) {
        setSelectedModule(data[0]);
      }
    } catch (err: any) {
      showToast('Error Loading Educational Modules', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleStartQuiz = (mod: EducationModule) => {
    setActiveQuizModule(mod);
    setUserAnswers({});
    setQuizResult(null);
  };

  const handleSelectAnswer = (qIndex: number, optionLetter: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qIndex.toString()]: optionLetter,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuizModule) return;
    const totalQuestions = activeQuizModule.quiz_questions?.length || 0;
    if (Object.keys(userAnswers).length < totalQuestions) {
      showToast('Incomplete Quiz', 'Please answer all questions before submitting.', 'warning');
      return;
    }

    setSubmittingQuiz(true);
    try {
      const result: QuizResult = await api.submitModuleQuiz(activeQuizModule.id, userAnswers);
      setQuizResult(result);
      if (result.passed) {
        showToast('Module Passed!', `You scored ${result.percentage}%!`, 'success');
      } else {
        showToast('Review Recommended', `You scored ${result.percentage}%. Re-try anytime!`, 'info');
      }
      await loadModules();
    } catch (err: any) {
      showToast('Quiz Submission Failed', err.message, 'error');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold mb-2">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            CLINICALLY PEER-REVIEWED CARDIOVASCULAR LITERACY
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Patient Cardiac Education & ECG Academy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Understand your electrocardiogram, resting heart rate physiology, nocturnal autonomic balance, and red-flag symptom recognition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Modules Completed</div>
            <div className="text-lg font-bold text-teal-300 font-mono">
              {modules.filter((m) => m.user_progress?.completed).length} / {modules.length}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive ECG Waveform Anatomy Simulator */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              Interactive Lead II Electrocardiogram Waveform Explorer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any cardiac electrical segment below to isolate its underlying physiology and conduction velocity.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Complete Complex' },
              { id: 'P', label: 'P Wave (Atria)' },
              { id: 'PR', label: 'PR Segment (AV Node)' },
              { id: 'QRS', label: 'QRS (Ventricles)' },
              { id: 'ST', label: 'ST Segment (Ischemia)' },
              { id: 'T', label: 'T Wave (Repolarization)' },
            ].map((seg) => (
              <button
                key={seg.id}
                onClick={() => setHighlightedWave(seg.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  highlightedWave === seg.id
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Simulated ECG Vector Canvas Display */}
        <div className="relative bg-[#020617] rounded-2xl p-6 border border-slate-800 overflow-hidden min-h-[160px] flex items-center justify-center">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, #0d9488 1px, transparent 1px), linear-gradient(to bottom, #0d9488 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />

          <svg viewBox="0 0 800 140" className="w-full h-32 text-teal-400">
            {/* Baseline */}
            <path
              d="M 0 70 L 120 70"
              fill="none"
              stroke={highlightedWave === 'all' ? '#14b8a6' : '#334155'}
              strokeWidth="2.5"
            />
            {/* P Wave */}
            <path
              d="M 120 70 Q 150 45, 180 70"
              fill="none"
              stroke={highlightedWave === 'all' || highlightedWave === 'P' ? '#38bdf8' : '#334155'}
              strokeWidth={highlightedWave === 'P' ? '4' : '2.5'}
            />
            {/* PR Segment */}
            <path
              d="M 180 70 L 230 70"
              fill="none"
              stroke={highlightedWave === 'all' || highlightedWave === 'PR' ? '#fbbf24' : '#334155'}
              strokeWidth={highlightedWave === 'PR' ? '4' : '2.5'}
            />
            {/* Q Wave */}
            <path
              d="M 230 70 L 245 85"
              fill="none"
              stroke={highlightedWave === 'all' || highlightedWave === 'QRS' ? '#14b8a6' : '#334155'}
              strokeWidth={highlightedWave === 'QRS' ? '4' : '2.5'}
            />
            {/* R Wave */}
            <path
              d="M 245 85 L 270 12 L 295 105"
              fill="none"
              stroke={highlightedWave === 'all' || highlightedWave === 'QRS' ? '#10b981' : '#334155'}
              strokeWidth={highlightedWave === 'QRS' ? '4' : '2.5'}
            />
            {/* S Wave Return */}
            <path
              d="M 295 105 L 315 70"
              fill="none"
              stroke={highlightedWave === 'all' || highlightedWave === 'QRS' ? '#14b8a6' : '#334155'}
              strokeWidth={highlightedWave === 'QRS' ? '4' : '2.5'}
            />
            {/* ST Segment */}
            <path
              d="M 315 70 L 390 70"
              fill="none"
              stroke={highlightedWave === 'all' || highlightedWave === 'ST' ? '#f43f5e' : '#334155'}
              strokeWidth={highlightedWave === 'ST' ? '4' : '2.5'}
            />
            {/* T Wave */}
            <path
              d="M 390 70 Q 435 35, 480 70"
              fill="none"
              stroke={highlightedWave === 'all' || highlightedWave === 'T' ? '#a855f7' : '#334155'}
              strokeWidth={highlightedWave === 'T' ? '4' : '2.5'}
            />
            {/* Isoelectric Baseline */}
            <path
              d="M 480 70 L 800 70"
              fill="none"
              stroke={highlightedWave === 'all' ? '#14b8a6' : '#334155'}
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* Dynamic Wave Explanatory Card */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 text-xs space-y-1">
          {highlightedWave === 'all' && (
            <p className="text-slate-300">
              <strong className="text-white">The Normal Sinus Complex:</strong> Represents one complete cardiac cycle of depolarization and repolarization originating from the Sinoatrial (SA) node.
            </p>
          )}
          {highlightedWave === 'P' && (
            <p className="text-cyan-300">
              <strong className="text-white">P Wave:</strong> Atrial depolarization (electrical activation of the right and left atria). Duration is normally &lt; 120 ms.
            </p>
          )}
          {highlightedWave === 'PR' && (
            <p className="text-amber-300">
              <strong className="text-white">PR Segment:</strong> Physiological conduction delay through the Atrioventricular (AV) node allowing mechanical ventricular filling.
            </p>
          )}
          {highlightedWave === 'QRS' && (
            <p className="text-emerald-300">
              <strong className="text-white">QRS Complex:</strong> Rapid ventricular depolarization triggering ventricular contraction (systole). Normal width is 80–100 ms.
            </p>
          )}
          {highlightedWave === 'ST' && (
            <p className="text-rose-300">
              <strong className="text-white">ST Segment:</strong> Plateau phase of ventricular repolarization. Elevation (STEMI) or depression indicates acute myocardial ischemia.
            </p>
          )}
          {highlightedWave === 'T' && (
            <p className="text-purple-300">
              <strong className="text-white">T Wave:</strong> Final ventricular repolarization restoring electrochemical resting potential across myocardial cell membranes.
            </p>
          )}
        </div>
      </div>

      {/* Main Educational Directory & Reader Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Sidebar */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-700/60 space-y-3">
          <h3 className="text-sm font-bold text-white">Curriculum Modules</h3>

          <div className="space-y-2">
            {modules.map((m) => {
              const isSelected = selectedModule?.id === m.id;
              const isCompleted = m.user_progress?.completed;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedModule(m)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                      {m.category}
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        {m.user_progress?.quiz_score}% SCORE
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-xs mt-2">{m.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{m.reading_time_minutes} min read</span>
                    <span>•</span>
                    <span>{m.quiz_questions?.length || 3} Questions</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reader & Content Area */}
        {selectedModule && (
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-700/60 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase text-indigo-400 tracking-wider font-bold">
                  {selectedModule.category}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {selectedModule.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                  <span>Reading: {selectedModule.reading_time_minutes} minutes</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Cardiology Peer Reviewed
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleStartQuiz(selectedModule)}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5 shrink-0"
              >
                <Award className="w-4 h-4" />
                Take Knowledge Quiz
              </button>
            </div>

            {/* Markdown/Text Content */}
            <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs italic">
                {selectedModule.summary}
              </div>

              <div className="whitespace-pre-line font-sans">
                {selectedModule.content}
              </div>
            </div>

            {/* Bottom Quiz Callout */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Ready to test your comprehension?
              </span>
              <button
                onClick={() => handleStartQuiz(selectedModule)}
                className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
              >
                <span>Launch Quiz Simulator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUIZ MODAL */}
      {activeQuizModule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                  Clinical Assessment
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {activeQuizModule.title} - Knowledge Quiz
                </h3>
              </div>
              <button
                onClick={() => setActiveQuizModule(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Quiz Result Display */}
            {quizResult ? (
              <div className="space-y-6 py-4 text-center">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-teal-500/20 border border-teal-500/40">
                  {quizResult.passed ? (
                    <Award className="w-8 h-8 text-teal-400" />
                  ) : (
                    <RotateCcw className="w-8 h-8 text-amber-400" />
                  )}
                </div>

                <div>
                  <h4 className="text-xl font-bold text-white">
                    {quizResult.passed ? 'Excellent Work! Assessment Passed.' : 'Good Effort! Keep Reviewing.'}
                  </h4>
                  <div className="text-3xl font-black text-teal-300 font-mono mt-2">
                    {quizResult.percentage}%
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Correct Answers: {quizResult.score} out of {quizResult.total_questions} questions
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  {quizResult.feedback}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setUserAnswers({});
                      setQuizResult(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
                  >
                    Retake Quiz
                  </button>
                  <button
                    onClick={() => setActiveQuizModule(null)}
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 text-white font-bold px-5 py-2 rounded-xl text-xs transition"
                  >
                    Done & Return
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz Questions Form */
              <div className="space-y-6">
                {activeQuizModule.quiz_questions?.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="font-semibold text-xs text-slate-200">
                      <span className="text-teal-400 font-mono font-bold mr-1.5">Q{idx + 1}.</span>
                      {q.question}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'
                        const isChosen = userAnswers[idx.toString()] === letter;

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectAnswer(idx, letter)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center gap-3 ${
                              isChosen
                                ? 'bg-teal-500/20 border-teal-500 text-white font-semibold'
                                : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-[10px] text-teal-400 shrink-0">
                              {letter}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-mono">
                    Answered {Object.keys(userAnswers).length} of {activeQuizModule.quiz_questions?.length || 0}
                  </span>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submittingQuiz}
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                  >
                    {submittingQuiz ? 'Grading...' : 'Submit Answers & Calculate Score'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

