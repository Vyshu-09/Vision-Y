export interface ScopeCheckResult {
  in_scope: boolean;
  is_out_of_scope: boolean;
  reason?: string;
  warning_title?: string;
  warning_message?: string;
}

export const OUT_OF_SCOPE_TITLE = "Outside Policy Scope";
export const OUT_OF_SCOPE_MESSAGE =
  "I can only answer questions related to Vignan University policies, rules and procedures.\n\nPlease ask a Vignan University policy-related question.";

export const NOT_FOUND_TITLE = "Policy Information Not Found";
export const NOT_FOUND_MESSAGE =
  "I could not find sufficient information about this topic in the currently indexed Vignan University policy documents.\n\nPlease try another policy-related question or contact the concerned university department.";

const OTHER_UNIVERSITIES_RE =
  /\b(iit(?:\s+[a-z]+)?|nit(?:\s+[a-z]+)?|iiit(?:\s+[a-z]+)?|jntu[a-z]*|anna\s+university|delhi\s+university|\bdu\b|oxford|harvard|stanford|\bmit\b|cambridge|caltech|iisc|iim|bits(?:\s+pilani)?|vit\s+vellore|srm(?:\s+university)?|amrita|gitam|andhra\s+university|svu|another\s+university|other\s+universit(?:y|ies)|best\s+university\s+in\s+india)\b/i;

const POLITICS_AND_WORLD_KNOWLEDGE_RE =
  /\b(prime\s+minister|chief\s+minister|president\s+of\s+(?:india|usa|america)|narendra\s+modi|capital\s+of\s+[a-z]+|who\s+is\s+the\s+(?:pm|president|cm|governor|king|queen)|world\s+cup|cricket\s+score|currency\s+of|stock\s+price|movie\s+rating|box\s+office)\b/i;

const PROGRAMMING_AND_TECH_TUTORIAL_RE =
  /\b(write\s+(?:a\s+)?(?:python|java|javascript|typescript|c\+\+|c#|\bc\b|html|css|sql|ruby|go|rust|php|react|node)?\s*(?:program|code|script|function|class|algorithm|method|query)|explain\s+machine\s+learning|what\s+is\s+machine\s+learning|explain\s+deep\s+learning|how\s+to\s+code|fix\s+(?:this\s+)?code|debug\s+(?:this\s+)?code|solve\s+(?:this\s+)?equation|write\s+a\s+binary\s+search)\b/i;

const GENERAL_TRIVIA_LIFESTYLE_RE =
  /\b(weather\s+today|today'?s\s+weather|weather\s+in\s+[a-z]+|temperature\s+today|recipe\s+for|how\s+to\s+cook|make\s+a\s+cake|tell\s+me\s+a\s+joke|write\s+a\s+poem|write\s+a\s+song|sing\s+a\s+song|translate\s+(?:this\s+)?to\s+[a-z]+|horoscope|astrology|flight\s+ticket)\b/i;

/**
 * Validates whether the question is strictly within Vignan University policy scope.
 * Rejects non-university questions, other universities, general world trivia, programming, etc.
 */
export function checkPolicyScope(question: string): ScopeCheckResult {
  const q = question.trim().toLowerCase();
  if (!q) {
    return {
      in_scope: false,
      is_out_of_scope: true,
      warning_title: OUT_OF_SCOPE_TITLE,
      warning_message: OUT_OF_SCOPE_MESSAGE,
      reason: "empty_question",
    };
  }

  // 1. Check for other universities/competitors
  if (OTHER_UNIVERSITIES_RE.test(q) && !q.includes("vignan") && !q.includes("vfstr")) {
    return {
      in_scope: false,
      is_out_of_scope: true,
      warning_title: OUT_OF_SCOPE_TITLE,
      warning_message: OUT_OF_SCOPE_MESSAGE,
      reason: "other_institution",
    };
  }

  // 2. Check for politics & world knowledge
  if (POLITICS_AND_WORLD_KNOWLEDGE_RE.test(q)) {
    return {
      in_scope: false,
      is_out_of_scope: true,
      warning_title: OUT_OF_SCOPE_TITLE,
      warning_message: OUT_OF_SCOPE_MESSAGE,
      reason: "world_knowledge_or_politics",
    };
  }

  // 3. Check for coding / programming requests
  if (PROGRAMMING_AND_TECH_TUTORIAL_RE.test(q)) {
    return {
      in_scope: false,
      is_out_of_scope: true,
      warning_title: OUT_OF_SCOPE_TITLE,
      warning_message: OUT_OF_SCOPE_MESSAGE,
      reason: "programming_or_general_tech",
    };
  }

  // 4. Check for weather / lifestyle / trivia
  if (GENERAL_TRIVIA_LIFESTYLE_RE.test(q)) {
    return {
      in_scope: false,
      is_out_of_scope: true,
      warning_title: OUT_OF_SCOPE_TITLE,
      warning_message: OUT_OF_SCOPE_MESSAGE,
      reason: "general_trivia_lifestyle",
    };
  }

  return {
    in_scope: true,
    is_out_of_scope: false,
  };
}
