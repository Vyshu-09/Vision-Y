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
  const detailed = input.role === "faculty" || input.role === "staff" || input.role === "super_admin";
  const extra = detailed ? `\n\nFull clause ${c.clause_number}: ${c.clause_text}` : "";

  let circularNote = "";
  if (input.related_circulars?.length) {
    const circ = input.related_circulars[0];
    circularNote =
      `\n\nAlso note circular ${circ.circular_number} (${circ.issued_date}): ${circ.title}. ` +
      `${circ.description}`;
  }

  const docLabel = c.document_type === "REGULATION"
    ? `${c.policy_title} (${c.regulation ?? c.version_label ?? c.version_year})`
    : `${c.policy_title} (${c.version_year})`;

  return (
    `According to the authoritative ${docLabel}, clause ${c.clause_number} applies. ` +
    `${c.clause_text} ` +
    `This rule has been in effect since ${c.effective_date}.` +
    circularNote +
    extra
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
        "You are Agent 53, Vignan University Policy and Regulation Agent.\n\n" +
        "Answer ONLY from the authoritative evidence supplied by the retrieval pipeline.\n" +
        "Never use general model knowledge to create university rules.\n" +
        "Never invent:\n" +
        "- policy numbers\n" +
        "- clause numbers\n" +
        "- attendance percentages\n" +
        "- fees\n" +
        "- deadlines\n" +
        "- dates\n" +
        "- authorities\n" +
        "- procedures\n" +
        "- exceptions\n\n" +
        "If the retrieved authoritative documents do not establish an answer, explicitly say:\n" +
        "'The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.'\n\n" +
        "If documents conflict and governance cannot resolve them, state that an administrative clarification is required.\n\n" +
        "Always identify:\n" +
        "- document title\n" +
        "- document type\n" +
        "- regulation/version\n" +
        "- section/clause\n" +
        "- page number when available\n" +
        "- source URL\n" +
        "- authority level\n\n" +
        "Prefer exact clause wording for important numeric rules.",
    },
    {
      role: "user",
      content:
        `User Role: ${input.role}\nQuestion: ${input.question}\n` +
        `Authoritative Document: ${clause.policy_title} [Type: ${clause.document_type ?? "POLICY"}, Reg/Ver: ${clause.regulation ?? clause.version_label ?? clause.version_year}, Effective: ${clause.effective_date}]\n` +
        `Clause ${clause.clause_number} (${clause.section}, page ${clause.page_number ?? "n/a"}, Authority: ${clause.authority_level}):\n` +
        `${clause.clause_text}` +
        circularBlock +
        `\nSource URL: ${clause.source_url ?? "https://vignan.ac.in"}\n` +
        `Detail level: ${detailed ? "include exact key clause wording and comprehensive administrative details" : "clear direct answer quoting exact percentages/numbers from the clause"}`,
    },
  ]);

  const answer_text = llmText.trim() || fallbackAnswer(input);
  const sources = [candidateToSource(clause), ...related.slice(0, 2).map(candidateToSource)];

  return { answer_text, sources, low_confidence: false };
}
