/**
 * Single LLM adapter. All agents call this — swap the provider here later.
 * If ANTHROPIC_API_KEY is unset, returns a deterministic mock completion
 * so the demo runs without network credentials.
 */
import { config } from "../config.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  maxTokens?: number;
  temperature?: number;
}

export async function complete(
  messages: ChatMessage[],
  options: CompleteOptions = {},
): Promise<string> {
  if (!config.anthropicApiKey) {
    return mockComplete(messages);
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const system = messages.find((m) => m.role === "system")?.content;
    const rest = messages.filter((m) => m.role !== "system");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: options.maxTokens ?? 800,
      temperature: options.temperature ?? 0.2,
      system,
      messages: rest.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  } catch (err) {
    console.warn("[llm] Anthropic call failed, using mock:", err);
    return mockComplete(messages);
  }
}

function mockComplete(messages: ChatMessage[]): string {
  const user = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const blob = `${system}\n${user}`.toLowerCase();

  if (blob.includes("conflict_check") || blob.includes("conflict detection")) {
    return JSON.stringify({ conflict: false, pairs: [] });
  }

  if (
    blob.includes("answer_request") ||
    blob.includes("policy answering assistant") ||
    blob.includes("policy assistant") ||
    blob.includes("unipolicy") ||
    blob.includes("retrieved policy content") ||
    blob.includes("authoritative policy") ||
    blob.includes("clause")
  ) {
    const qMatch = user.match(/Question:\s*([^\n]+)/i);
    const question = (qMatch?.[1] || "").toLowerCase().trim();

    let clauseText = "";
    const clauseMatch0 = user.match(
      /Retrieved Policy Content:\n([\s\S]+?)(?:\n\nRelated official circulars|\n\nProvide a concise|\n\nAnswer the user|\nDetail level:|\nSource URL:|$)/i,
    );
    const clauseMatch1 = user.match(
      /Applicable clause[^\n]*:\n([\s\S]+?)(?:\n\nRelated official circulars|\n\nProvide a concise|\n\nAnswer the user|\nDetail level:|\nSource URL:|$)/i,
    );
    const clauseMatch2 = user.match(
      /Clause\s+[\d.]+[^\n]*:\n([\s\S]+?)(?:\n\nRelated official circulars|\n\nProvide a concise|\n\nAnswer the user|\nDetail level:|\nSource URL:|$)/i,
    );
    clauseText = (clauseMatch0?.[1] || clauseMatch1?.[1] || clauseMatch2?.[1] || "").trim();

    const circMatch = user.match(/Related official circulars[\s\S]*?:\n([\s\S]+?)(?:\n\nProvide a concise|\n\nAnswer the user|\nDetail level:|\nSource URL:|$)/i);
    const circText = circMatch?.[1]?.trim() ?? "";

    let circularNote = "";
    if (circText) {
      const lines = circText.split("\n").map((l) => l.trim()).filter(Boolean);
      const firstLine = lines.find((l) => l.startsWith("-")) ?? lines[0];
      if (firstLine) {
        circularNote = ` (Note: ${firstLine.replace(/^-+\s*/, "").trim()}).`;
      }
    }

    // Scholarship - Siblings
    if ((question.includes("sibling") || question.includes("brother") || question.includes("sister")) && (question.includes("scholarship") || clauseText.toLowerCase().includes("sibling"))) {
      return `Students with siblings studying in Vignan institutions can receive a 10% tuition-fee scholarship. The benefit is offered at entry level and continues for the entire duration of study specified in the policy.${circularNote}`;
    }

    // Scholarship - CGPA / Percentage / Minimum marks / Continuation
    if (
      (question.includes("scholarship") || clauseText.toLowerCase().includes("scholarship")) &&
      (question.includes("cgpa") || question.includes("percentage") || question.includes("minimum") || question.includes("needed") || question.includes("required") || question.includes("maintain") || question.includes("continue"))
    ) {
      return `Students need at least 70% in the preceding year without any backlogs to maintain and continue their scholarship. If you have 70% or above and have passed all subjects in the first attempt, you meet this academic condition. Other scholarship conditions (such as clearing dues and good conduct) also apply.${circularNote}`;
    }

    // Scholarship - Who can get / eligibility
    if ((question.includes("scholarship") || clauseText.toLowerCase().includes("scholarship")) && (question.includes("who can") || question.includes("who is") || question.includes("eligible") || question.includes("eligibility"))) {
      return `Students who meet the eligibility conditions mentioned in Vignan's Scholarship Policy can receive the scholarship. The exact eligibility depends on the scholarship category, including academic merit, siblings, sports quota, alumni, SC/ST, and staff wards. Check the source below for specific category conditions.${circularNote}`;
    }

    // Faculty Leave
    if (question.includes("faculty leave") || question.includes("leave rule") || question.includes("leave")) {
      return `Faculty leave is governed by Vignan University's applicable service and leave rules. The specific leave entitlement depends on the type of leave (such as casual leave, academic on-duty leave, or maternity/paternity leave). See the relevant clause below for the exact requirement.${circularNote}`;
    }

    // Admission Cancellation / Refund
    if (question.includes("refund") || question.includes("cancellation") || question.includes("cancel admission")) {
      return `Students receive a 100% refund of tuition fee (less a maximum Rs. 1,000 processing fee) if admission cancellation is requested before or on the notified last date. If requested within 15 days after the last date, 80% is refunded; within 16 to 30 days, 50% is refunded; no tuition refund is given after 30 days. Caution deposits are refunded in full upon clearing no-dues.${circularNote}`;
    }

    // Attendance
    if (question.includes("attendance") || question.includes("condon")) {
      if (question.includes("condonation") || question.includes("shortage")) {
        return `Condonation of attendance shortage up to 10% (between 65% and 75%) may be granted on genuine medical grounds or approved university activities with medical certificate submission and prior intimation. The prescribed condonation fee must be paid through the required university process.${circularNote}`;
      }
      return `Students must maintain a minimum of 75% aggregate attendance in all courses in each semester to be eligible for semester-end examinations. A condonation of up to 10% (between 65% and 75%) may be granted on valid medical grounds, while students below 65% must repeat the semester.${circularNote}`;
    }

    // Consultancy
    if (question.includes("consultancy")) {
      return `Faculty members can undertake industrial consultancy and advisory projects with revenue shared in 60:40 ratio for institutional lab projects or 70:30 for expert advisory assignments. Faculty may dedicate up to one working day per week with prior administrative approval.${circularNote}`;
    }

    // Research
    if (question.includes("research")) {
      return `Vignan University research policy provides seed money grants to faculty and financial incentives for journal publications indexed in SCI/Scopus. The university also supports patent filing and requires plagiarism similarity to remain below 10%.${circularNote}`;
    }

    // Industrial Training
    if (question.includes("training") || question.includes("internship")) {
      return `Students must complete mandatory industrial training and internships with approved industrial partners to acquire industry readiness. Guidelines and credit requirements are detailed in the official policy.${circularNote}`;
    }

    // Grievance
    if (question.includes("grievance") || question.includes("complaint")) {
      return `Students who have an academic or administrative grievance can submit a written petition to the Student Grievance Redressal Committee for fair and prompt resolution.${circularNote}`;
    }

    // Code of Conduct
    if (question.includes("conduct") || question.includes("discipline")) {
      return `Members of the university are expected to maintain the highest standards of integrity, respect, discipline, and professional ethics on campus. Check the source below for complete guidelines.${circularNote}`;
    }

    // IT Policy
    if (question.includes("it policy") || question.includes("wi-fi") || question.includes("cybersecurity")) {
      return `The IT policy establishes guidelines for authorized campus Wi-Fi access, endpoint cybersecurity protection, licensed software usage, and data confidentiality.${circularNote}`;
    }

    if (clauseText) {
      const clean = clauseText
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

      const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
      let summary = sentences.slice(0, 2).join(" ").trim();
      if (summary.length > 220) {
        const cleanCut = summary.slice(0, 220).replace(/\s+\S*$/, "");
        summary = cleanCut.endsWith(".") ? cleanCut : cleanCut + ".";
      }
      if (!summary.endsWith(".")) summary += ".";

      return `${summary} Please refer to the verified source card below for specific rules and guidelines.${circularNote}`;
    }
    return (
      "Please refer to the verified Source Card below for specific rules and guidelines."
    );
  }

  return "Mock LLM response (set ANTHROPIC_API_KEY to use Claude).";
}

export function isLlmConfigured(): boolean {
  return Boolean(config.anthropicApiKey);
}
