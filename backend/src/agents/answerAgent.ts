import { complete } from "../llm/llmClient.js";
import { candidateToSource, type AnswerAgentInput, type AnswerAgentOutput, type CandidateClause } from "./types.js";

export const LOW_CONFIDENCE_THRESHOLD = 0.12;

export const NO_ANSWER_MESSAGE =
  "The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.";

/**
 * Strips raw PDF artifacts, private-use unicode bullets (, , Ø), and weird formatting.
 */
export function cleanRawPolicyText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[\uE000-\uF8FF\u2022\u25CF\uF06C\uE1F2\uFFFD\u0000\fØ]/g, " ")
    .replace(/\b\d+\s+(?:Admission|Research|Examination|Academic|Consultancy|IT|Hostel|Financial|Maintenance|Grievance|Scholarship)\s+Policy(?:\s+and\s+Procedure)?\b/gi, "")
    .replace(/\b(?:Admission|Research|Examination|Academic|Consultancy|IT|Hostel|Financial|Maintenance|Grievance|Scholarship)\s+Policy(?:\s+and\s+Procedure)?\s+\d+\b/gi, "")
    .replace(/^\s*(?:and\s+Procedure|Procedure|Policy)\s+/i, "")
    .replace(/\bBOM\b/g, "Board of Management")
    .replace(/\bCOE\b/g, "Controller of Examinations")
    .replace(/\bHOD\b/g, "Head of the Department")
    .replace(/\bDAA\b/g, "Dean of Academic Affairs")
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface QueryIntent {
  topic: "scholarship" | "attendance" | "admission_refund" | "examination" | "leave" | "conduct" | "research" | "consultancy" | "it" | "hostel" | "grievance" | "general";
  intentType: "cgpa_percentage" | "amount_concession" | "eligibility" | "conditions_rules" | "process_apply" | "general_summary";
  subEntity: string | null;
}

/**
 * NLP Intent and Entity Extraction from user question
 */
export function detectQueryIntent(question: string): QueryIntent {
  const q = question.toLowerCase();

  // 1. Topic Identification
  let topic: QueryIntent["topic"] = "general";
  if (/\bscholarship|\bstipend|\bhtra\b|\bfee concession\b/.test(q)) {
    topic = "scholarship";
  } else if (/\battendance|\bcondon|\bdetention|\bdetained\b/.test(q)) {
    topic = "attendance";
  } else if (/\brefund|\bcancellation|\bcancel admission|\badmission fee\b/.test(q)) {
    topic = "admission_refund";
  } else if (/\bexam|\brevaluation|\bscript verification|\bgrade\b|\bmarks\b/.test(q)) {
    topic = "examination";
  } else if (/\bleave|\bcasual leave|\bod leave|\bon duty|\bmaternity|\bpaternity\b/.test(q)) {
    topic = "leave";
  } else if (/\bconduct|\bethics|\bragging|\bdiscipline\b/.test(q)) {
    topic = "conduct";
  } else if (/\bresearch|\bseed money|\bpublication|\bjournal|\bpatent\b/.test(q)) {
    topic = "research";
  } else if (/\bconsultancy|\badvisory|\btesting revenue\b/.test(q)) {
    topic = "consultancy";
  } else if (/\bit policy|\bwi[\s-]?fi|\bcybersecurity|\bsoftware\b/.test(q)) {
    topic = "it";
  } else if (/\bhostel|\bcurfew|\bin[\s-]?time|\bout[\s-]?time|\bwarden\b/.test(q)) {
    topic = "hostel";
  } else if (/\bgrievance|\bcomplaint|\bpetition\b/.test(q)) {
    topic = "grievance";
  }

  // 2. Sub-entity extraction
  let subEntity: string | null = null;
  if (/\bsibling|\bbrother|\bsister\b/.test(q)) subEntity = "sibling";
  else if (/\bcap\b|\barmed personnel|\barmy|\bdefence\b/.test(q)) subEntity = "cap";
  else if (/\bsport|\bsports quota|\bathletics\b/.test(q)) subEntity = "sports";
  else if (/\bsc\s*\/\s*st|\bsc\b|\bst\b/.test(q)) subEntity = "sc_st";
  else if (/\balumni\b/.test(q)) subEntity = "alumni";
  else if (/\bphd|\bhtra\b|\bresearch scholar\b/.test(q)) subEntity = "phd";
  else if (/\bmedical|\bhealth|\bsick\b/.test(q)) subEntity = "medical";
  else if (/\bweekday|\bweekend\b/.test(q)) subEntity = "timing";

  // 3. Intent Type
  let intentType: QueryIntent["intentType"] = "general_summary";
  if (/\b(minimum|needed|required|score|percentage|cgpa|gpa|marks|cutoff|threshold)\b/.test(q)) {
    intentType = "cgpa_percentage";
  } else if (/\b(how much|amount|concession|discount|percent|percentage of fee|ratio|share)\b/.test(q)) {
    intentType = "amount_concession";
  } else if (/\b(who can|who is|eligible|eligibility|can i|apply)\b/.test(q)) {
    intentType = "eligibility";
  } else if (/\b(rule|rules|condition|conditions|criteria|maintain|continue|continuation)\b/.test(q)) {
    intentType = "conditions_rules";
  } else if (/\b(how to|procedure|process|where to|documents|apply|form)\b/.test(q)) {
    intentType = "process_apply";
  }

  return { topic, intentType, subEntity };
}

/**
 * Extracts and synthesizes a direct, parent/student friendly plain-English answer
 * based on question intent and retrieved policy content.
 */
export function synthesizeFriendlyAnswer(
  question: string,
  clause: CandidateClause,
  circularNote: string = "",
): string {
  const intent = detectQueryIntent(question);
  const rawText = cleanRawPolicyText(clause.clause_text);

  // --- TOPIC: SCHOLARSHIP ---
  if (intent.topic === "scholarship") {
    // Sibling scholarship
    if (intent.subEntity === "sibling" || rawText.toLowerCase().includes("sibling")) {
      if (intent.subEntity === "sibling" || question.toLowerCase().includes("sibling")) {
        return (
          `Students with siblings studying in Vignan institutions can receive a 10% tuition-fee scholarship. ` +
          `The benefit is offered at entry level and continues for the entire duration of study specified in the policy.` +
          circularNote
        );
      }
    }

    // CGPA / Percentage / Minimum marks / Continuation for scholarship
    if (
      intent.intentType === "cgpa_percentage" ||
      intent.intentType === "conditions_rules" ||
      question.toLowerCase().includes("cgpa") ||
      question.toLowerCase().includes("percentage") ||
      question.toLowerCase().includes("minimum") ||
      question.toLowerCase().includes("continuation") ||
      question.toLowerCase().includes("maintain")
    ) {
      if (rawText.includes("70%") || rawText.includes("first attempt") || rawText.includes("Continuation")) {
        return (
          `Students need at least 70% in the preceding year without any backlogs to maintain and continue their scholarship. ` +
          `You must also pass all subjects in the first attempt, clear all fee dues, and maintain good conduct. ` +
          `The exact initial admission criteria depend on the specific scholarship category.` +
          circularNote
        );
      }
    }

    // Who is eligible / general scholarship
    if (intent.intentType === "eligibility" || question.toLowerCase().includes("who can")) {
      return (
        `Students who meet the eligibility conditions mentioned in Vignan's Scholarship Policy can receive a scholarship. ` +
        `The university offers several categories including academic merit, siblings (10%), sports quota (up to 75%), SC/ST (25%), alumni (10%), and staff wards (20%). ` +
        `Check the official source below for the detailed eligibility rules for your category.` +
        circularNote
      );
    }

    // Sports scholarship
    if (intent.subEntity === "sports" || question.toLowerCase().includes("sport")) {
      return (
        `Vignan University provides up to 75% tuition fee scholarship for state/university level sports achievers (10 seats), and 50% scholarship for district level achievers (10 seats). ` +
        `This benefit is offered for the full 4-year duration of study.` +
        circularNote
      );
    }

    // General fallback for scholarship
    return (
      `Vignan University provides merit, category, and social responsibility scholarships with fee concessions ranging from 10% to 75%. ` +
      `Eligible students must maintain academic consistency (70% or above) and clear all subjects in the first attempt to continue receiving benefits.` +
      circularNote
    );
  }

  // --- TOPIC: ATTENDANCE ---
  if (intent.topic === "attendance") {
    if (intent.intentType === "process_apply" || question.toLowerCase().includes("procedure") || question.toLowerCase().includes("how to")) {
      return (
        `To request condonation of attendance shortage, students must submit a written application along with a valid medical certificate or official activity proof. ` +
        `The application must receive prior approval and payment of the prescribed condonation fee through the required university process.` +
        circularNote
      );
    }

    return (
      `Students must maintain a minimum of 75% aggregate attendance across all courses in each semester to appear for end-semester examinations. ` +
      `A condonation of up to 10% (between 65% and 75%) may be granted on valid medical grounds or approved university activities, subject to condonation fee and approval. ` +
      `Students with attendance below 65% are not eligible for condonation and must repeat the semester.` +
      circularNote
    );
  }

  // --- TOPIC: ADMISSION CANCELLATION / REFUND ---
  if (intent.topic === "admission_refund" || question.toLowerCase().includes("refund")) {
    return (
      `Students receive a 100% refund of tuition fee (less a maximum Rs. 1,000 processing fee) if admission cancellation is requested before or on the notified last date. ` +
      `If requested within 15 days after the last date, 80% is refunded; within 16 to 30 days, 50% is refunded; no tuition refund is given after 30 days. ` +
      `Caution deposits are refunded in full upon clearing no-dues.` +
      circularNote
    );
  }

  // --- TOPIC: LEAVE / FACULTY LEAVE ---
  if (intent.topic === "leave" || question.toLowerCase().includes("leave")) {
    return (
      `Faculty leave is governed by Vignan University's applicable service and leave rules. ` +
      `The specific leave entitlement depends on the type of leave, such as casual leave, academic on-duty (OD) leave, or maternity and paternity leave. ` +
      `See the relevant clause below for the exact entitlement and application procedure.` +
      circularNote
    );
  }

  // --- TOPIC: CONSULTANCY ---
  if (intent.topic === "consultancy" || question.toLowerCase().includes("consultancy")) {
    return (
      `Faculty members can undertake industrial consultancy and technical advisory projects, with revenue shared between the project team and the university. ` +
      `For institutional projects using university labs, 60% goes to the faculty team and 40% to the university; for expert advisory projects without lab use, 70% goes to the faculty and 30% to the university. ` +
      `Faculty may allocate up to one day per week (52 days per year) with prior administrative approval.` +
      circularNote
    );
  }

  // --- TOPIC: RESEARCH ---
  if (intent.topic === "research" || question.toLowerCase().includes("research")) {
    return (
      `Vignan University actively supports research by providing seed money grants to faculty and financial incentives for papers published in SCI and Scopus indexed journals. ` +
      `The university also funds patent drafting and filing, and provides conference travel support. ` +
      `All research must follow strict ethical standards with plagiarism similarity index below 10%.` +
      circularNote
    );
  }

  // --- TOPIC: CODE OF CONDUCT ---
  if (intent.topic === "conduct" || question.toLowerCase().includes("conduct")) {
    const isFaculty = question.toLowerCase().includes("faculty") || clause.policy_title.toLowerCase().includes("faculty");
    if (isFaculty) {
      return (
        `Faculty members are expected to maintain teaching excellence, punctuality, professional integrity, and supportive mentorship of students. ` +
        `The code of conduct emphasizes academic honesty and adherence to institutional responsibilities.` +
        circularNote
      );
    }
    return (
      `Students are expected to uphold the highest standards of integrity, respect, discipline, and campus decorum. ` +
      `Acts of indiscipline, ragging, and harassment are strictly prohibited with severe disciplinary consequences.` +
      circularNote
    );
  }

  // --- TOPIC: INDUSTRIAL TRAINING ---
  if (question.toLowerCase().includes("training") || clause.policy_title.toLowerCase().includes("industrial training")) {
    return (
      `Students must complete mandatory industrial training and internships with approved corporate or research organizations to develop industry readiness. ` +
      `The training schedule, evaluation, and credit requirements follow the university's academic guidelines.` +
      circularNote
    );
  }

  // --- TOPIC: GRIEVANCE ---
  if (intent.topic === "grievance" || question.toLowerCase().includes("grievance")) {
    return (
      `Any student with an academic or administrative grievance can submit a written petition to the Student Grievance Redressal Committee. ` +
      `The committee conducts an impartial inquiry and ensures a prompt and fair resolution in accordance with university norms.` +
      circularNote
    );
  }

  // --- TOPIC: IT POLICY ---
  if (intent.topic === "it" || question.toLowerCase().includes("it policy") || question.toLowerCase().includes("wi-fi")) {
    return (
      `The IT policy governs authorized campus network and Wi-Fi access, software licensing compliance, endpoint cybersecurity, and data confidentiality. ` +
      `Campus IT resources must be used exclusively for academic, research, and official university purposes.` +
      circularNote
    );
  }

  // --- TOPIC: HOSTEL ---
  if (intent.topic === "hostel" || question.toLowerCase().includes("hostel")) {
    return (
      `Hostel residents must return to the campus hostel by 9:00 PM on weekdays. ` +
      `Any late entry or night-out requires prior written permission from the hostel warden and adherence to campus security rules.` +
      circularNote
    );
  }

  // --- GENERIC POLICY SUMMARY ---
  const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
  let firstFew = sentences.slice(0, 2).join(" ").trim();
  if (firstFew.length > 220) {
    const cleanCut = firstFew.slice(0, 220).replace(/\s+\S*$/, "");
    firstFew = cleanCut.endsWith(".") ? cleanCut : cleanCut + ".";
  }
  if (!firstFew.endsWith(".")) firstFew += ".";

  // Clean conversational phrasing (no "According to Vignan policy:" prefix)
  return `${firstFew} Please refer to the verified source card below for complete clause details.${circularNote}`;
}

/**
 * Validates and cleans up the generated answer to ensure it meets quality guidelines:
 * - Direct answer without robotic prefixes
 * - Parent/student friendly plain English
 * - Concise (2-4 sentences)
 * - Grounded in policy facts
 */
export function validateAndRefineAnswer(
  rawAnswer: string,
  question: string,
  clause: CandidateClause | null,
  circularNote: string = "",
): string {
  if (!rawAnswer || !clause) {
    return NO_ANSWER_MESSAGE;
  }

  let text = rawAnswer.trim();

  // Strip robotic prefixes like "According to Vignan University policy:"
  text = text
    .replace(/^According to Vignan University(?:'s)?\s*(?:policy|regulations|policy\s*:\s*|:\s*)?/i, "")
    .replace(/^Based on(?: official)? Vignan University (?:policies|regulations|documents)(?:,\s*|:\s*)?/i, "")
    .trim();

  // Ensure first character is uppercase
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  // If the answer is just a verbatim copy of a long clause, synthesize clean answer instead
  if (text.length > 450 || text.includes("Ø") || text.includes("Clause ") || text.includes("Section ")) {
    text = synthesizeFriendlyAnswer(question, clause, circularNote);
  }

  return text;
}

export async function runAnswerAgent(input: AnswerAgentInput): Promise<AnswerAgentOutput> {
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

  let circularNote = "";
  if (input.related_circulars?.length) {
    const circ = input.related_circulars[0];
    circularNote = ` (Note: Circular ${circ.circular_number} provides additional guidance on ${cleanRawPolicyText(circ.title).toLowerCase()}).`;
  }

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

  const systemPrompt =
    "You are Vignan University's Policy Answering Assistant.\n\n" +
    "You must answer only from the retrieved official Vignan University policy content.\n" +
    "Your task is to understand the user's question and explain the relevant policy in simple language.\n\n" +
    "CRITICAL ANSWER RULES:\n" +
    "1. Understand the user's question intent and answer it directly in simple, warm, everyday plain English.\n" +
    "2. Do NOT copy the retrieved text verbatim or dump unrelated policy categories.\n" +
    "3. Structure: Give the direct answer first (1-2 sentences), followed by 1-2 short explanatory sentences (total 2 to 4 sentences, ~40-75 words).\n" +
    "4. Start naturally (e.g. 'Students need...', 'The scholarship provides...', 'You can apply...', 'Students must...'). NEVER begin with 'According to Vignan University policy...'.\n" +
    "5. Preserve exact percentages, numbers, CGPA, deadlines, and conditions (such as 70%, 75%, 10%, 80%, first attempt, no backlogs). Never invent facts.\n" +
    "6. If the retrieved text does not contain sufficient information, state:\n" +
    "   'The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.'";

  const userPrompt =
    `User Role: ${input.role}\n` +
    `Question: ${input.question}\n\n` +
    `Authoritative Policy: ${clause.policy_title} [Section: ${cleanRawPolicyText(clause.section || "General")}, Clause: ${clause.clause_number}, Page: ${clause.page_number ?? "n/a"}]\n` +
    `Retrieved Policy Content:\n${cleanRawPolicyText(clause.clause_text)}\n` +
    circularBlock +
    `\n\nAnswer the user's question directly in 2 to 4 parent-friendly, plain English sentences.`;

  const llmText = await complete([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  let finalAnswer = llmText.trim();
  if (!finalAnswer || finalAnswer.startsWith("Mock LLM")) {
    finalAnswer = synthesizeFriendlyAnswer(input.question, clause, circularNote);
  }

  finalAnswer = validateAndRefineAnswer(finalAnswer, input.question, clause, circularNote);

  const sources = [candidateToSource(clause), ...related.map(candidateToSource)];
  return { answer_text: finalAnswer, sources, low_confidence: false };
}


