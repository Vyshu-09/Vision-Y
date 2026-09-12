import { useState, type FormEvent } from "react";
import { api } from "../api/client";

export function FlagForm({
  policyId,
  queryId,
  onDone,
}: {
  policyId?: string;
  queryId?: string;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("Ambiguous or conflicting guidance");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.flag({
        policy_id: policyId,
        query_id: queryId,
        reason: note.trim() ? `${reason}: ${note.trim()}` : reason,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit flag");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-line bg-white p-4 text-sm">
      <p className="font-semibold text-navy">Flag for governance review</p>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-muted">Reason</span>
        <select className="ui-input mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option>Ambiguous or conflicting guidance</option>
          <option>Outdated clause</option>
          <option>Incorrect source cited</option>
          <option>Missing departmental exception</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-muted">Optional note</span>
        <textarea
          className="ui-input mt-1"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && <p className="text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="ui-btn ui-btn-navy text-sm">
        {busy ? "Submitting…" : "Submit flag"}
      </button>
    </form>
  );
}
