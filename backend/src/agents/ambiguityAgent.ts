import type { AmbiguityResult } from "./types.js";

function clarify(
  prompt: string,
  options: Array<{ id: string; label: string }>,
): AmbiguityResult {
  return { ambiguous: true, prompt, options };
}

/**
 * Ambiguity Agent — ask for clarification instead of guessing.
 */
export function runAmbiguityAgent(question: string): AmbiguityResult {
  const q = question.toLowerCase().trim().replace(/\?+$/, "").trim();
  const words = q.split(/\s+/).filter(Boolean);

  const bareCondonation =
    /\bcondon/.test(q) &&
    !/\battendance\b/.test(q) &&
    !/\bexam/.test(q) &&
    !/\bfee\b/.test(q);

  if (bareCondonation || q === "can i get condonation" || q === "can i get condonation?") {
    return clarify("What type of condonation?", [
      { id: "attendance", label: "Attendance" },
      { id: "fees", label: "Fees" },
      { id: "other", label: "Other" },
    ]);
  }

  if (
    (/\beligib/.test(q) || /\bcan i (write|appear|sit)\b/.test(q)) &&
    !/\battendance\b|\bexam\b|\bscholarship\b|\badmission\b/.test(q)
  ) {
    return clarify("Which eligibility are you asking about?", [
      { id: "attendance_eligibility", label: "Attendance / exam eligibility" },
      { id: "fee_eligibility", label: "Fee payment eligibility" },
      { id: "other", label: "Other" },
    ]);
  }

  // Bare hostel / timing / curfew without weekday/weekend or entry/return detail
  const hostelish = /\b(hostel|curfew|timing|timings)\b/.test(q);
  const hostelSpecific =
    /\b(weekday|weekend|entry|return|in[\s-]?time|out[\s-]?time|boys|girls|9:?00|10:?00)\b/.test(q);
  if (hostelish && !hostelSpecific) {
    return clarify("Which hostel rule do you need?", [
      { id: "weekday_return", label: "Weekday return / entry time" },
      { id: "weekend_return", label: "Weekend return / entry time" },
      { id: "general_hostel", label: "General hostel rules" },
    ]);
  }

  // Bare fee / fine / penalty without type
  const feeish = /\b(fee|fees|fine|penalty|penalties)\b/.test(q);
  const feeSpecific =
    /\b(tuition|exam|examination|library|hostel|condonation|revaluation|late|transport|mess)\b/.test(q);
  if (feeish && !feeSpecific && !/\bcondon/.test(q)) {
    return clarify("Which fee or fine are you asking about?", [
      { id: "tuition_fee", label: "Tuition / academic fee" },
      { id: "exam_fee", label: "Examination / revaluation fee" },
      { id: "late_fine", label: "Late payment fine" },
      { id: "other_fee", label: "Other" },
    ]);
  }

  // Bare leave without type
  const leaveish = /\b(leave|leaves)\b/.test(q);
  const leaveSpecific =
    /\b(casual|medical|sick|od|on[\s-]?duty|maternity|earned|emergency|days?)\b/.test(q);
  if (leaveish && !leaveSpecific) {
    return clarify("What type of leave?", [
      { id: "casual_leave", label: "Casual leave" },
      { id: "medical_leave", label: "Medical / sick leave" },
      { id: "od_leave", label: "On-duty (OD)" },
      { id: "other_leave", label: "Other" },
    ]);
  }

  // Bare scholarship percentage without category or criteria
  const bareScholarshipPercentage =
    /\bscholarship\b/.test(q) &&
    /\b(percentage|percent|concession|discount)\b/.test(q) &&
    !/\b(cgpa|gpa|minimum|need|needed|require|required|score|marks|cutoff|maintain|continuation|continuing|continue|sibling|brother|sister|sport|alumni|staff|sc|st|cap|defence|phd|first attempt)\b/.test(q);
  if (bareScholarshipPercentage) {
    return clarify("Vignan has different scholarship categories. Do you mean the academic scholarship, sibling scholarship, or another category?", [
      { id: "academic_merit", label: "Academic Merit Scholarship" },
      { id: "sibling_scholarship", label: "Sibling Scholarship (10%)" },
      { id: "sports_quota", label: "Sports Quota Scholarship" },
      { id: "sc_st_scholarship", label: "SC / ST Scholarship (25%)" },
      { id: "alumni_staff", label: "Alumni / Staff Ward Scholarship" },
    ]);
  }

  // Very short / vague asks
  const vagueSingles = new Set([
    "help",
    "hi",
    "hello",
    "policy",
    "policies",
    "rule",
    "rules",
    "info",
    "information",
    "question",
  ]);
  if (words.length <= 2 && (vagueSingles.has(q) || vagueSingles.has(words[0] ?? ""))) {
    return clarify("What would you like to know about?", [
      { id: "attendance", label: "Attendance" },
      { id: "exams", label: "Examinations" },
      { id: "hostel", label: "Hostel" },
      { id: "fees", label: "Fees" },
      { id: "other", label: "Other" },
    ]);
  }

  if (words.length === 1 && words[0].length >= 4 && !/\d/.test(words[0])) {
    // Single topic noun like "hostel" already handled; other nouns get a soft clarify
    const knownHandled = /\b(attendance|exam|examination|hostel|fee|fees|leave|condonation)\b/.test(q);
    if (!knownHandled) {
      return clarify(`What about “${words[0]}” do you need?`, [
        { id: "rules", label: "Official rules / eligibility" },
        { id: "process", label: "How to apply / process" },
        { id: "other", label: "Other" },
      ]);
    }
  }

  return { ambiguous: false, prompt: null, options: [] };
}
