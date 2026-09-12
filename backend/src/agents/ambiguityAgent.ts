import type { AmbiguityResult } from "./types.js";

/**
 * Ambiguity Agent — ask for clarification instead of guessing.
 */
export function runAmbiguityAgent(question: string): AmbiguityResult {
  const q = question.toLowerCase().trim();

  const bareCondonation =
    /\bcondon/.test(q) &&
    !/\battendance\b/.test(q) &&
    !/\bexam/.test(q) &&
    !/\bfee\b/.test(q);

  if (bareCondonation || q === "can i get condonation?" || q === "can i get condonation") {
    return {
      ambiguous: true,
      prompt: "What type of condonation?",
      options: [
        { id: "attendance", label: "Attendance" },
        { id: "fees", label: "Fees" },
        { id: "other", label: "Other" },
      ],
    };
  }

  if ((/\beligib/.test(q) || /\bcan i (write|appear|sit)\b/.test(q)) && !/\battendance\b|\bexam/.test(q)) {
    return {
      ambiguous: true,
      prompt: "Which eligibility are you asking about?",
      options: [
        { id: "attendance_eligibility", label: "Attendance / exam eligibility" },
        { id: "fee_eligibility", label: "Fee payment eligibility" },
        { id: "other", label: "Other" },
      ],
    };
  }

  return { ambiguous: false, prompt: null, options: [] };
}
