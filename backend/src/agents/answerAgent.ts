import { complete } from "../llm/llmClient.js";
import { candidateToSource, type AnswerAgentInput, type AnswerAgentOutput } from "./types.js";

const LOW_CONFIDENCE_THRESHOLD = 0.12;

const NO_ANSWER_MESSAGE =
  "The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.";

function fallbackAnswer(input: AnswerAgentInput): string {
  if (input.escalated || !input.applicable_clause) {
    return NO_ANSWER_MESSAGE;
  }

  const c = input.applicable_clause;
  const docLabel = c.document_type === "REGULATION"
    ? `${c.policy_title} (${c.regulation ?? c.version_label ?? c.version_year})`
    : `${c.policy_title}`;

  let circularNote = "";
  if (input.related_circulars?.length) {
    const circ = input.related_circulars[0];
    circularNote = ` (Note: Circular ${circ.circular_number} provides additional guidance on ${circ.title.toLowerCase()}).`;
  }

  // Generate concise 3-4 line grounded answer
  return (
    `According to Vignan University's ${docLabel} (${c.section || "Clause " + c.clause_number}), ${c.clause_text.trim()}${circularNote}`
  );
}

export async function runAnswerAgent(input: AnswerAgentInput): Promise<AnswerAgentOutput> {
  // Governance already selected a clause — only refuse when score is extremely weak
  const low_confidence =
    input.escalated ||
    !input.applicable_clause ||
    input.applicable_clause.similarity_score < LOW_CONFIDENCE_THRESHOLD;

  if (low_confidence) {
    return {
      answer_text: NO_ANSWER_MESSAGE,
      sources: input.applicable_clause ? [candidateToSource(input.applicable_clause)] : [],
      low_confidence: true,
    };
  }

  const clause = input.applicable_clause!;
  const related = input.related_clauses
    .filter((c) => !(c.policy_id === clause.policy_id && c.clause_number === clause.clause_number))
    .slice(0, 1);

  const circularBlock =
    input.related_circulars && input.related_circulars.length
      ? `\n\nRelated official circulars:\n` +
        input.related_circulars
          .map(
            (c) =>
              `- ${c.circular_number} (${c.issued_date}): ${c.title} — ${c.description}`,
          )
          .join("\n")
      : "";

  const llmText = await complete([
    {
      role: "system",
      content:
        "You are Vignan University's Policy Assistant (UniPolicy AI).\n\n" +
        "CRITICAL INSTRUCTIONS:\n" +
        "1. Answer ONLY using the retrieved official Vignan University policy content.\n" +
        "2. Keep the answer SIMPLE, CLEAR, and within 3–4 lines (approximately 40–70 words).\n" +
        "3. Use easy-to-understand language. Do NOT copy massive raw text or dump the entire policy.\n" +
        "4. NEVER use general knowledge to invent rules, dates, percentages, penalties, or procedures.\n" +
        "5. If the retrieved text does not contain sufficient information, state:\n" +
        "   'The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.'",
    },
    {
      role: "user",
      content:
        `User Role: ${input.role}\nQuestion: ${input.question}\n\n` +
        `Authoritative Policy: ${clause.policy_title} [Section: ${clause.section}, Clause: ${clause.clause_number}, Page: ${clause.page_number ?? "n/a"}]\n` +
        `Retrieved Policy Content:\n${clause.clause_text}\n` +
        circularBlock +
        `\n\nProvide a concise 3-4 line plain-language explanation of this rule.`,
    },
  ]);

  const answer_text = llmText.trim() || fallbackAnswer(input);
  const sources = [candidateToSource(clause), ...related.map(candidateToSource)];

  return { answer_text, sources, low_confidence: false };
}
