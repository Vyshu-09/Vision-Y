import { complete } from "../llm/llmClient.js";
import { candidateToSource, type AnswerAgentInput, type AnswerAgentOutput } from "./types.js";

const LOW_CONFIDENCE_THRESHOLD = 0.12;

const NO_ANSWER_MESSAGE =
  "The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.";

/**
 * Strips raw PDF artifacts, private-use unicode bullets (, ), and weird formatting.
 */
export function cleanRawPolicyText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[\uE000-\uF8FF\u2022\u25CF\uF06C\uE1F2\uFFFD\u0000\f]/g, " ")
    .replace(/\b\d+\s+(?:Admission|Research|Examination|Academic|Consultancy|IT|Hostel|Financial|Maintenance|Grievance|Scholarship)\s+Policy(?:\s+and\s+Procedure)?\b/gi, "")
    .replace(/\b(?:Admission|Research|Examination|Academic|Consultancy|IT|Hostel|Financial|Maintenance|Grievance|Scholarship)\s+Policy(?:\s+and\s+Procedure)?\s+\d+\b/gi, "")
    .replace(/^\s*(?:and\s+Procedure|Procedure|Policy)\s+/i, "")
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Creates a clear, warm, and friendly answer that parents, students, and children can easily understand.
 */
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
    circularNote = ` (Note: Circular ${circ.circular_number} provides additional guidance on ${cleanRawPolicyText(circ.title).toLowerCase()}).`;
  }

  const cleanedText = cleanRawPolicyText(c.clause_text)
    .replace(/\bBOM\b/g, "Board of Management")
    .replace(/\bCOE\b/g, "Controller of Examinations")
    .replace(/\bHOD\b/g, "Head of the Department")
    .replace(/\bDAA\b/g, "Dean of Academic Affairs");

  // Extract complete sentences cleanly
  const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
  let summary = sentences.slice(0, 3).join(" ").trim();
  if (summary.length > 280) {
    const cleanCut = summary.slice(0, 280).replace(/\s+\S*$/, "");
    summary = cleanCut.endsWith(".") ? cleanCut : cleanCut + ".";
  }
  if (!summary.endsWith(".")) summary += ".";

  return `According to Vignan University's ${docLabel}: ${summary}${circularNote}`;
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
              `- ${c.circular_number} (${c.issued_date}): ${cleanRawPolicyText(c.title)} — ${cleanRawPolicyText(c.description)}`,
          )
          .join("\n")
      : "";

  const llmText = await complete([
    {
      role: "system",
      content:
        "You are Vignan University's Policy Assistant (UniPolicy AI).\n\n" +
        "CRITICAL INSTRUCTIONS:\n" +
        "1. Explain the official policy answer in SIMPLE, WARM, and FRIENDLY plain English so that any parent, student, or even a schoolchild can easily understand it.\n" +
        "2. Do NOT use complicated bureaucratic jargon, raw legal phrasing, or dump unedited policy text.\n" +
        "3. Keep the answer concise (2 to 4 clear lines, around 40–70 words).\n" +
        "4. Answer ONLY using the retrieved official Vignan University policy content. Never invent rules, fees, percentages, or dates.\n" +
        "5. If the retrieved text does not contain sufficient information, state:\n" +
        "   'The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.'",
    },
    {
      role: "user",
      content:
        `User Role: ${input.role}\nQuestion: ${input.question}\n\n` +
        `Authoritative Policy: ${clause.policy_title} [Section: ${cleanRawPolicyText(clause.section || "General")}, Clause: ${clause.clause_number}, Page: ${clause.page_number ?? "n/a"}]\n` +
        `Retrieved Policy Content:\n${cleanRawPolicyText(clause.clause_text)}\n` +
        circularBlock +
        `\n\nProvide a friendly, easy-to-understand 2-4 line plain-language explanation of this rule.`,
    },
  ]);

  const answer_text = llmText.trim() || fallbackAnswer(input);
  const sources = [candidateToSource(clause), ...related.map(candidateToSource)];

  return { answer_text, sources, low_confidence: false };
}

