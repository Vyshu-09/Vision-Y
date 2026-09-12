import { complete } from "../llm/llmClient.js";
import { candidateToSource, type AnswerAgentInput, type AnswerAgentOutput } from "./types.js";

const LOW_CONFIDENCE_THRESHOLD = 0.22;

function fallbackAnswer(input: AnswerAgentInput): string {
  if (input.escalated || !input.applicable_clause) {
    return "The available university policy documents do not establish an authoritative answer to this question.";
  }

  const c = input.applicable_clause;
  const detailed = input.role === "faculty" || input.role === "staff" || input.role === "super_admin";
  const extra = detailed ? `\n\nFull clause ${c.clause_number}: ${c.clause_text}` : "";

  let circularNote = "";
  if (input.related_circulars?.length) {
    const circ = input.related_circulars[0];
    circularNote =
      `\n\nAlso note circular ${circ.circular_number} (${circ.issued_date}): ${circ.title}. ` +
      `${circ.description}`;
  }

  return (
    `According to the currently active ${c.policy_title} (${c.version_year}), clause ${c.clause_number} applies. ` +
    `${c.clause_text} ` +
    `This rule has been in effect since ${c.effective_date}.` +
    circularNote +
    extra
  );
}

export async function runAnswerAgent(input: AnswerAgentInput): Promise<AnswerAgentOutput> {
  const low_confidence =
    input.escalated ||
    !input.applicable_clause ||
    input.applicable_clause.similarity_score < LOW_CONFIDENCE_THRESHOLD;

  if (low_confidence) {
    return {
      answer_text:
        "The available university policy documents do not establish an authoritative answer to this question.",
      sources: input.applicable_clause ? [candidateToSource(input.applicable_clause)] : [],
      low_confidence: true,
    };
  }

  const clause = input.applicable_clause!;
  const detailed = input.role === "faculty" || input.role === "staff" || input.role === "super_admin";
  const related = detailed
    ? input.related_clauses.filter(
        (c) => !(c.policy_id === clause.policy_id && c.clause_number === clause.clause_number),
      )
    : [];

  const circularBlock =
    input.related_circulars && input.related_circulars.length
      ? `\n\nRelated official circulars (must be reflected if they modify or clarify the clause):\n` +
        input.related_circulars
          .map(
            (c) =>
              `- ${c.circular_number} (${c.issued_date}): ${c.title}\n  ${c.description}`,
          )
          .join("\n")
      : "";

  const llmText = await complete([
    {
      role: "system",
      content:
        "You are University Policy AI (Agent 53) for Vignan's University. " +
        "Answer ONLY from the provided official policy clause and related circulars. " +
        "If a circular modifies or clarifies the clause (fees, timelines, procedures), include that in the answer. " +
        "Do not invent rules. Be specific — quote numbers, fees, dates from the evidence. " +
        "Do not give generic advice. The UI attaches citations — do not invent them.",
    },
    {
      role: "user",
      content:
        `Role: ${input.role}\nQuestion: ${input.question}\n` +
        `Applicable clause ${clause.clause_number} (${clause.section}, page ${clause.page_number ?? "n/a"}) ` +
        `of ${clause.policy_title} (${clause.version_year}, effective ${clause.effective_date}):\n` +
        `${clause.clause_text}` +
        circularBlock +
        `\nDetail level: ${detailed ? "include key clause wording and circular details" : "plain summary with circular details if relevant"}`,
    },
  ]);

  const answer_text = llmText.trim() || fallbackAnswer(input);
  const sources = [candidateToSource(clause), ...related.slice(0, 2).map(candidateToSource)];

  return { answer_text, sources, low_confidence: false };
}
