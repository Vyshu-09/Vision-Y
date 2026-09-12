import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ClarificationForm } from "../components/ClarificationForm";
import { FlagForm } from "../components/FlagForm";
import { SourceCard } from "../components/SourceCard";
import { SUGGESTIONS } from "../lib/nav";
import type { ChatResponse, Role } from "../types";

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

  useEffect(() => {
    if (preset) setQuestion(preset);
  }, [preset]);

  if (!user) return null;

  const roleKey =
    user.role === "super_admin" ? "staff" : (user.role as Exclude<Role, "super_admin">);
  const suggestions = SUGGESTIONS[roleKey];
  const canFlag = user.role === "faculty" || user.role === "staff" || user.role === "super_admin";
  const canClarify = user.role === "student";

  async function ask(e?: FormEvent, override?: string) {
    e?.preventDefault();
    const q = (override ?? question).trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.chat(q);
      setTurns((prev) => [...prev, { question: q, response }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-navy">Ask AI</h1>
      <p className="mt-1 text-muted">
        Answers come from indexed policy clauses. Expand the Source card to verify the rule.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-action"
            onClick={() => void ask(undefined, s)}
            disabled={busy}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => void ask(e)} className="ui-card mt-6 p-4">
        <textarea
          className="ui-input resize-none"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a policy question…"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="ui-btn ui-btn-primary">
            {busy ? "Running agents…" : "Ask"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </form>

      <div className="mt-8 space-y-6">
        {turns.length === 0 && (
          <p className="text-sm text-muted">Pick a suggestion or type your own question above.</p>
        )}
        {[...turns].reverse().map((turn, idx) => {
          const realIndex = turns.length - 1 - idx;
          const r = turn.response;
          return (
            <section key={realIndex} className="ui-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">You asked</p>
              <p className="font-semibold text-navy">{turn.question}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Answer</p>
              <p className="mt-1 leading-relaxed whitespace-pre-wrap text-navy/90">{r.answer_text}</p>

              {r.needs_clarification && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-950">
                    {r.clarification_prompt || "I need a little more detail."}
                  </p>
                  {r.clarification_options && r.clarification_options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.clarification_options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className="ui-btn ui-btn-ghost text-xs"
                          disabled={busy}
                          onClick={() =>
                            void ask(
                              undefined,
                              opt.toLowerCase().includes("attendance")
                                ? "Can I get attendance condonation?"
                                : opt.toLowerCase().includes("fee")
                                  ? "What is the fee late payment penalty?"
                                  : opt.toLowerCase().includes("exam")
                                    ? "Can I get examination condonation?"
                                    : `Can I get condonation for ${opt}?`,
                            )
                          }
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(r.low_confidence || r.escalated || r.flagged_for_admin) && (
                <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-900">
                  {r.low_confidence
                    ? "Low confidence — conflicting or incomplete evidence. Escalated for review."
                    : "This answer was flagged for admin review."}
                </p>
              )}

              <SourceCard sources={r.sources} detailed />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`ui-btn text-sm ${feedback[realIndex] === "up" ? "ui-btn-primary" : "ui-btn-ghost"}`}
                  onClick={() => setFeedback((f) => ({ ...f, [realIndex]: "up" }))}
                >
                  Helpful
                </button>
                <button
                  type="button"
                  className={`ui-btn text-sm ${feedback[realIndex] === "down" ? "ui-btn-navy" : "ui-btn-ghost"}`}
                  onClick={() => setFeedback((f) => ({ ...f, [realIndex]: "down" }))}
                >
                  Not helpful
                </button>
                {canClarify &&
                  (doneClarify.has(realIndex) ? (
                    <span className="self-center text-sm text-emerald-700">Clarification sent</span>
                  ) : (
                    <button
                      type="button"
                      className="ui-btn ui-btn-ghost text-sm"
                      onClick={() => setClarifyFor(realIndex)}
                    >
                      Report clarification
                    </button>
                  ))}
                {canFlag &&
                  (doneFlags.has(realIndex) ? (
                    <span className="self-center text-sm text-emerald-700">Flag submitted</span>
                  ) : (
                    <button
                      type="button"
                      className="ui-btn ui-btn-ghost text-sm"
                      onClick={() => setFlagFor(realIndex)}
                    >
                      Flag policy
                    </button>
                  ))}
              </div>

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
