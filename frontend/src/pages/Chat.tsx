import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ClarificationForm } from "../components/ClarificationForm";
import { EvidencePanel } from "../components/EvidencePanel";
import { FlagForm } from "../components/FlagForm";
import { SourceCard } from "../components/SourceCard";
import type { ChatResponse } from "../types";

interface Turn {
  question: string;
  response: ChatResponse;
}

export function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const preset = (location.state as { question?: string } | null)?.question;
  const [question, setQuestion] = useState(preset ?? "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagFor, setFlagFor] = useState<number | null>(null);
  const [clarifyFor, setClarifyFor] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, "up" | "down">>({});
  const [doneFlags, setDoneFlags] = useState<Set<number>>(new Set());
  const [doneClarify, setDoneClarify] = useState<Set<number>>(new Set());
  const [showEvidenceFor, setShowEvidenceFor] = useState<number | null>(null);

  useEffect(() => {
    if (preset) setQuestion(preset);
  }, [preset]);

  if (!user) return null;

  const canFlag = user.role === "faculty" || user.role === "staff" || user.role === "super_admin";
  const canClarify = user.role === "student";

  async function ask(e?: FormEvent, override?: string) {
    e?.preventDefault();
    const q = (override ?? question).trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.chat(q, null);
      setTurns((prev) => [...prev, { question: q, response }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="text-center sm:text-left flex items-start gap-4">
        <img
          src="/images/agent-robo-cute-clear.png"
          alt="Vignan Policy Agent"
          className="animate-float-bot mt-1 h-14 w-14 shrink-0 object-contain drop-shadow-md sm:h-16 sm:w-16 hidden sm:block"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/agent-robo-cute.png";
          }}
        />
        <div className="flex-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy flex items-center justify-center sm:justify-start gap-2">
            <span>🤖 Ask Vignan Policy Agent</span>
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600">
            Ask questions about Vignan University policies, rules and procedures.
          </p>
        </div>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={(e) => void ask(e)} className="ui-card mt-6 p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="relative">
          <textarea
            className="ui-input resize-none w-full text-base p-3.5 focus:border-crimson focus:ring-1 focus:ring-crimson rounded-xl"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a Vignan policy-related question..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask();
              }
            }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Official knowledge base: <strong className="text-slate-700">vignan.ac.in</strong>
          </span>
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="ui-btn ui-btn-primary ml-auto flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            {busy ? (
              <>
                <span className="inline-block animate-spin">⌛</span> Searching Policy...
              </>
            ) : (
              <>
                <span>🔍 Search Policy</span>
              </>
            )}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700 font-medium">{error}</p>}
      </form>

      {/* Results Stream */}
      <div className="mt-8 space-y-6">
        {turns.length === 0 && (
          <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6">
            <span className="text-3xl">🏛️</span>
            <p className="mt-2 font-semibold text-slate-700">Vignan University Policy Knowledge Base</p>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Type any query above regarding admissions, refund, scholarships, research, IT, codes of conduct, or academic regulations.
            </p>
          </div>
        )}

        {[...turns].reverse().map((turn, idx) => {
          const realIndex = turns.length - 1 - idx;
          const r = turn.response;
          const isOutOfScope = r.is_out_of_scope || r.answer_text.includes("Outside Policy Scope");
          const isNotFound = r.not_found || r.answer_text.includes("Policy Information Not Found");

          return (
            <section key={realIndex} className="ui-card p-5 sm:p-6 border border-slate-200 shadow-sm transition-all animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">User Question</span>
                <span className="text-[11px] text-slate-400">Query #{turns.length - idx}</span>
              </div>
              <p className="font-semibold text-base sm:text-lg text-slate-900">{turn.question}</p>

              {/* Case 1: Out of Scope Question */}
              {isOutOfScope ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                        Outside Policy Scope
                      </h3>
                      <p className="mt-1.5 text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                        I can only answer questions based on official Vignan University policies, rules and procedures.
                      </p>
                      <p className="mt-2 text-xs font-semibold text-amber-800">
                        Please ask a Vignan University policy-related question.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isNotFound ? (
                /* Case 2: Information Not Found */
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                      <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
                        Policy Information Not Found
                      </h3>
                      <p className="mt-1.5 text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                        I could not find sufficient information about this topic in the currently indexed Vignan University policy documents.
                      </p>
                      <p className="mt-2 text-xs font-medium text-blue-700">
                        Please try another policy-related question or contact the concerned university department.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Case 3: Valid In-Scope Grounded Answer */
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Answer</span>
                    <div className="mt-1.5 rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                      <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium text-slate-800">
                        {r.answer_text}
                      </p>
                    </div>
                  </div>

                  {/* Clarification prompt if applicable */}
                  {r.needs_clarification && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-semibold text-amber-950">
                        {r.clarification_prompt || "I need a little more detail."}
                      </p>
                      {r.clarification_options && r.clarification_options.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.clarification_options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className="ui-btn ui-btn-ghost text-xs bg-white border border-amber-200"
                              disabled={busy}
                              onClick={() => void ask(undefined, `${opt} policy rules`)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compact Verifiable Source Card */}
                  {r.sources && r.sources.length > 0 && (
                    <SourceCard sources={r.sources} />
                  )}

                  {/* Optional Detailed Pipeline Evidence Toggle */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEvidenceFor(showEvidenceFor === realIndex ? null : realIndex)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showEvidenceFor === realIndex ? "Hide Multi-Agent Pipeline Trace ▲" : "Show Multi-Agent Pipeline Trace ▼"}
                    </button>
                    {showEvidenceFor === realIndex && (
                      <div className="mt-2">
                        <EvidencePanel response={r} detailed />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Feedback and Admin Actions */}
              {!isOutOfScope && !isNotFound && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`ui-btn text-xs py-1.5 px-3 rounded-lg ${feedback[realIndex] === "up" ? "ui-btn-primary" : "ui-btn-ghost"}`}
                    onClick={() => setFeedback((f) => ({ ...f, [realIndex]: "up" }))}
                  >
                    👍 Helpful
                  </button>
                  <button
                    type="button"
                    className={`ui-btn text-xs py-1.5 px-3 rounded-lg ${feedback[realIndex] === "down" ? "ui-btn-navy" : "ui-btn-ghost"}`}
                    onClick={() => setFeedback((f) => ({ ...f, [realIndex]: "down" }))}
                  >
                    👎 Not helpful
                  </button>

                  {canClarify &&
                    (doneClarify.has(realIndex) ? (
                      <span className="self-center text-xs text-emerald-700 font-medium ml-auto">Clarification sent</span>
                    ) : (
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost text-xs py-1.5 px-3 rounded-lg ml-auto"
                        onClick={() => setClarifyFor(realIndex)}
                      >
                        Request Clarification
                      </button>
                    ))}

                  {canFlag &&
                    (doneFlags.has(realIndex) ? (
                      <span className="self-center text-xs text-emerald-700 font-medium ml-auto">Flag submitted</span>
                    ) : (
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost text-xs py-1.5 px-3 rounded-lg ml-auto"
                        onClick={() => setFlagFor(realIndex)}
                      >
                        🚩 Flag Policy
                      </button>
                    ))}
                </div>
              )}

              {clarifyFor === realIndex && (
                <ClarificationForm
                  questionText={turn.question}
                  answerText={r.answer_text}
                  policyId={r.sources[0]?.policy_id}
                  onDone={() => {
                    setDoneClarify((s) => new Set(s).add(realIndex));
                    setClarifyFor(null);
                  }}
                  onCancel={() => setClarifyFor(null)}
                />
              )}

              {flagFor === realIndex && (
                <FlagForm
                  policyId={r.sources[0]?.policy_id}
                  onDone={() => {
                    setDoneFlags((s) => new Set(s).add(realIndex));
                    setFlagFor(null);
                  }}
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
