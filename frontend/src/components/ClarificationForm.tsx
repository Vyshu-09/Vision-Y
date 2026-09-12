import { useState, type FormEvent } from "react";
import { api } from "../api/client";

export function ClarificationForm({
  questionText,
  answerText,
  policyId,
  onDone,
  onCancel,
}: {
  questionText: string;
  answerText: string;
  policyId?: string | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setError("Please describe what looks wrong (at least a few words).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createClarification({
        question_text: questionText,
        answer_text: answerText,
        reason: reason.trim(),
        policy_id: policyId,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit clarification");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-navy">Report clarification</p>
      <p className="text-xs text-muted">
        Students can escalate an answer mismatch to faculty/staff for review.
      </p>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-muted">What needs clarification?</span>
        <textarea
          className="ui-input mt-1"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="The answer does not match the circular / my department exception…"
          required
        />
      </label>
      {error && <p className="text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="ui-btn ui-btn-primary text-sm">
          {busy ? "Sending…" : "Submit request"}
        </button>
        <button type="button" className="ui-btn ui-btn-ghost text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
