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
import {
  checkPolicyScope,
  NOT_FOUND_MESSAGE,
  NOT_FOUND_TITLE,
  OUT_OF_SCOPE_MESSAGE,
  OUT_OF_SCOPE_TITLE,
} from "./scopeAgent.js";
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
 * Orchestration: Scope Detection → Ambiguity → Search → Version → Conflict → Governance → Answer
 */
export async function runPolicyPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const logs: PipelineLogEntry[] = [];
  const defaultAsOfDate =
    input.as_of_date && /^\d{4}-\d{2}-\d{2}$/.test(input.as_of_date)
      ? input.as_of_date
      : new Date().toISOString().slice(0, 10);
  const defaultAsOfSource = input.as_of_date ? "explicit" : "default";

  // Stage 0: Strict Scope Detection (Reject non-Vignan / unrelated questions without LLM call)
  const scope = checkPolicyScope(input.question);
  logs.push(log("scope_check", scope));

  if (!scope.in_scope || scope.is_out_of_scope) {
    const warningText = `⚠️ ${OUT_OF_SCOPE_TITLE}\n\n${OUT_OF_SCOPE_MESSAGE}`;
    return {
      answer_text: warningText,
      sources: [],
      low_confidence: false,
      escalated: false,
      flagged_for_admin: false,
      needs_clarification: false,
      clarification_prompt: null,
      clarification_options: [],
      logs,
      as_of_date: defaultAsOfDate,
      as_of_source: defaultAsOfSource,
      is_out_of_scope: true,
      warning_title: OUT_OF_SCOPE_TITLE,
      warning_message: OUT_OF_SCOPE_MESSAGE,
    };
  }

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
      as_of_date: defaultAsOfDate,
      as_of_source: defaultAsOfSource,
    };
  }

  const search = runPolicySearchAgent({
    question: input.question,
    role: input.role,
    topK: 12,
    user_program: input.user_program,
    user_regulation: input.user_regulation,
    user_department: input.user_department,
  });
  logs.push(
    log("query_analysis", {
      question: input.question,
      role: input.role,
      user_regulation: input.user_regulation,
      user_program: input.user_program,
    }),
  );
  logs.push(
    log(
      "policy_search",
      search.candidates.map((c) => ({
        source_type: c.source_type,
        document_type: c.document_type,
        title: c.policy_title,
        section: c.section,
        regulation: c.regulation,
        clause: c.clause_number,
        page: c.page_number,
        score: Math.round(c.similarity_score * 1000) / 1000,
        status: "SELECTED",
      })),
    ),
  );

  const versioned = runVersionAgent({
    question: input.question,
    candidates: search.candidates,
    as_of_date: input.as_of_date,
    user_regulation: input.user_regulation,
    user_program: input.user_program,
  });
  logs.push(
    log("version", {
      as_of_date: versioned.as_of_date,
      as_of_source: versioned.as_of_source,
      kept_count: versioned.current_candidates.length,
      current_regulations: versioned.current_candidates.map((c) => c.regulation ?? c.version_label),
    }),
  );
  const as_of_date = versioned.as_of_date;
  const as_of_source = versioned.as_of_source;

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
    user_regulation: input.user_regulation,
  });
  logs.push(
    log("governance", {
      applicable_policy: governed.applicable_clause?.policy_title,
      regulation: governed.applicable_clause?.regulation,
      authority: governed.applicable_clause?.authority_level,
      clause: governed.applicable_clause?.clause_number,
      escalated: governed.escalated,
      rationale: governed.rationale,
    }),
  );

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
    if (!conflicts.conflict && !governed.applicable_clause) {
      const answer_text =
        "The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.\n\n" +
        `ℹ️ ${NOT_FOUND_TITLE}\n\n${NOT_FOUND_MESSAGE}`;
      const query = store.insertQuery({
        id: store.newId(),
        user_id: input.userId,
        question_text: input.question,
        answer_text,
        sources: [],
        created_at: store.now(),
      });
      return {
        answer_text,
        sources: [],
        low_confidence: true,
        escalated: true,
        flagged_for_admin: false,
        needs_clarification: false,
        clarification_prompt: null,
        clarification_options: [],
        logs,
        as_of_date,
        as_of_source,
        not_found: true,
        warning_title: NOT_FOUND_TITLE,
        warning_message: NOT_FOUND_MESSAGE,
      };
    }

    const answer_text = conflicts.conflict
      ? "A conflict was detected between active university policies that apply to this question. " +
        "Administrative clarification is required before a definitive answer can be given. " +
        (pair ? `Conflict: ${pair.description}` : governed.rationale)
      : "The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.\n\n" +
        `ℹ️ ${NOT_FOUND_TITLE}\n\n${NOT_FOUND_MESSAGE}`;

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
      as_of_date,
      as_of_source,
      not_found: !conflicts.conflict,
      warning_title: conflicts.conflict ? undefined : NOT_FOUND_TITLE,
      warning_message: conflicts.conflict ? undefined : NOT_FOUND_MESSAGE,
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

  if (answered.low_confidence) {
    const answer_text =
      "The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.\n\n" +
      `ℹ️ ${NOT_FOUND_TITLE}\n\n${NOT_FOUND_MESSAGE}`;
    store.insertQuery({
      id: store.newId(),
      user_id: input.userId,
      question_text: input.question,
      answer_text,
      sources: [],
      created_at: store.now(),
    });
    return {
      answer_text,
      sources: [],
      low_confidence: true,
      escalated: true,
      flagged_for_admin: false,
      needs_clarification: false,
      clarification_prompt: null,
      clarification_options: [],
      logs,
      as_of_date,
      as_of_source,
      not_found: true,
      warning_title: NOT_FOUND_TITLE,
      warning_message: NOT_FOUND_MESSAGE,
    };
  }

  const flagged_for_admin = governed.escalated;
  if (flagged_for_admin) {
    store.insertFlag({
      id: store.newId(),
      raised_by: input.userId,
      policy_id: governed.applicable_clause?.policy_id ?? null,
      query_id: null,
      reason: `Pipeline escalation: ${governed.rationale}`,
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
    low_confidence: false,
    escalated: governed.escalated,
    flagged_for_admin,
    needs_clarification: false,
    clarification_prompt: null,
    clarification_options: [],
    logs,
    as_of_date,
    as_of_source,
    not_found: false,
    is_out_of_scope: false,
  };
}
