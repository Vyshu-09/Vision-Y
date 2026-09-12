import { store } from "../db/store.js";
import { notifyForEvent } from "../services/notificationEngine.js";
import { findRelatedCirculars } from "./circularContext.js";
import { candidateToSource } from "./types.js";
import { runAmbiguityAgent } from "./ambiguityAgent.js";
import { runAnswerAgent } from "./answerAgent.js";
import { runConflictAgent } from "./conflictAgent.js";
import { runGovernanceAgent } from "./governanceAgent.js";
import { runPolicySearchAgent } from "./policySearchAgent.js";
import { runVersionAgent } from "./versionAgent.js";
import type { PipelineInput, PipelineLogEntry, PipelineOutput } from "./types.js";

function log(stage: string, output: unknown): PipelineLogEntry {
  const entry: PipelineLogEntry = {
    stage,
    timestamp: new Date().toISOString(),
    output,
  };
  if (process.env.PIPELINE_DEBUG === "1") {
    console.log(`[pipeline:${stage}]`, JSON.stringify(output, null, 2));
  }
  return entry;
}

/**
 * Orchestration: Ambiguity → Search → Version → Conflict → Governance → Answer
 */
export async function runPolicyPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const logs: PipelineLogEntry[] = [];

  const ambiguity = runAmbiguityAgent(input.question);
  logs.push(log("ambiguity", ambiguity));
  if (ambiguity.ambiguous) {
    notifyForEvent({
      event: "ambiguity_spike",
      roles: ["faculty", "staff", "super_admin"],
      severity: "info",
      title: "Ambiguous policy question",
      body: `User asked an ambiguous question requiring clarification: "${input.question}"`,
    });
    return {
      answer_text: ambiguity.prompt ?? "Please clarify your question.",
      sources: [],
      low_confidence: false,
      escalated: false,
      flagged_for_admin: false,
      needs_clarification: true,
      clarification_prompt: ambiguity.prompt,
      clarification_options: ambiguity.options,
      logs,
    };
  }

  const search = runPolicySearchAgent({ question: input.question, role: input.role, topK: 8 });
  logs.push(log("policy_search", search));

  const versioned = runVersionAgent({ question: input.question, candidates: search.candidates });
  logs.push(log("version", versioned));

  const conflicts = runConflictAgent({ current_candidates: versioned.current_candidates });
  logs.push(log("conflict", conflicts));

  if (conflicts.conflict) {
    for (const pair of conflicts.conflicting_pairs) {
      if (!store.findOpenConflict(pair.a.policy_id, pair.b.policy_id, pair.a.clause_number, pair.b.clause_number)) {
        store.insertConflict({
          id: store.newId(),
          policy_a_id: pair.a.policy_id,
          policy_b_id: pair.b.policy_id,
          clause_a: pair.a.clause_number,
          clause_b: pair.b.clause_number,
          description: pair.description,
          status: "open",
          resolved_by: null,
          created_at: store.now(),
        });
        notifyForEvent({
          event: "conflict_detected",
          roles: ["super_admin", "staff"],
          severity: "critical",
          title: "Policy conflict detected",
          body: pair.description,
          policyId: pair.a.policy_id,
        });
      }
    }
  }

  const governed = runGovernanceAgent({
    question: input.question,
    current_candidates: versioned.current_candidates,
    conflicting_pairs: conflicts.conflicting_pairs,
  });
  logs.push(log("governance", governed));

  // Escalate only when governance cannot pick a winner (true conflict / no clause).
  if (governed.escalated || !governed.applicable_clause) {
    const pair =
      conflicts.conflicting_pairs.find((p) => {
        const keys = [
          `${p.a.policy_id}:${p.a.clause_number}`,
          `${p.b.policy_id}:${p.b.clause_number}`,
        ];
        return keys.some((k) =>
          versioned.current_candidates.some((c) => `${c.policy_id}:${c.clause_number}` === k),
        );
      }) ?? conflicts.conflicting_pairs[0];

    const sources = pair
      ? [candidateToSource(pair.a), candidateToSource(pair.b)]
      : [];
    const answer_text = conflicts.conflict
      ? "A conflict was detected between active university policies that apply to this question. " +
        "Administrative clarification is required before a definitive answer can be given. " +
        (pair ? `Conflict: ${pair.description}` : governed.rationale)
      : "The available university policy documents do not establish an authoritative answer to this question.";

    if (conflicts.conflict) {
      store.insertFlag({
        id: store.newId(),
        raised_by: input.userId,
        policy_id: pair?.a.policy_id ?? null,
        query_id: null,
        reason: `Pipeline conflict escalation: ${pair?.description ?? governed.rationale}`,
        status: "open",
        resolution_notes: null,
        created_at: store.now(),
      });
    }

    const query = store.insertQuery({
      id: store.newId(),
      user_id: input.userId,
      question_text: input.question,
      answer_text,
      sources,
      created_at: store.now(),
    });
    if (conflicts.conflict) {
      const lastFlag = [...store.listFlags()][0];
      if (lastFlag && !lastFlag.query_id) {
        store.updateFlag(lastFlag.id, { query_id: query.id });
      }
    }

    return {
      answer_text,
      sources,
      low_confidence: true,
      escalated: true,
      flagged_for_admin: conflicts.conflict,
      needs_clarification: false,
      clarification_prompt: null,
      clarification_options: [],
      logs,
    };
  }

  const relatedCirculars = findRelatedCirculars(
    governed.applicable_clause?.policy_id ?? null,
    input.question,
    3,
  );
  logs.push(
    log("circulars", {
      count: relatedCirculars.length,
      numbers: relatedCirculars.map((c) => c.circular_number),
    }),
  );

  const answered = await runAnswerAgent({
    question: input.question,
    role: input.role,
    applicable_clause: governed.applicable_clause,
    escalated: governed.escalated,
    rationale: governed.rationale,
    related_clauses: versioned.current_candidates,
    related_circulars: relatedCirculars,
  });
  logs.push(log("answer", { low_confidence: answered.low_confidence, sources: answered.sources }));

  const flagged_for_admin = answered.low_confidence || governed.escalated;
  if (flagged_for_admin) {
    store.insertFlag({
      id: store.newId(),
      raised_by: input.userId,
      policy_id: governed.applicable_clause?.policy_id ?? null,
      query_id: null,
      reason: governed.escalated
        ? `Pipeline escalation: ${governed.rationale}`
        : "Low-confidence answer — no sufficiently similar active clause.",
      status: "open",
      resolution_notes: null,
      created_at: store.now(),
    });
    notifyForEvent({
      event: "review_pending",
      roles: ["super_admin"],
      severity: "warning",
      title: "Answer flagged for review",
      body: governed.rationale || "Low-confidence chat answer awaiting Super Admin review.",
      policyId: governed.applicable_clause?.policy_id,
    });
  }

  const query = store.insertQuery({
    id: store.newId(),
    user_id: input.userId,
    question_text: input.question,
    answer_text: answered.answer_text,
    sources: answered.sources,
    created_at: store.now(),
  });

  if (flagged_for_admin) {
    const lastFlag = [...store.listFlags()][0];
    if (lastFlag && !lastFlag.query_id) {
      store.updateFlag(lastFlag.id, { query_id: query.id });
    }
  }

  return {
    answer_text: answered.answer_text,
    sources: answered.sources,
    low_confidence: answered.low_confidence,
    escalated: governed.escalated,
    flagged_for_admin,
    needs_clarification: false,
    clarification_prompt: null,
    clarification_options: [],
    logs,
  };
}
