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
  /\b(klu|k\s*l\s*u|kl\s+university|kl\s+deemed|koneru\s+lakshmaiah|klef|vit(?:\s+ap|\s+vellore|\s+chennai|\s+bhopal|\s+university)?|srm(?:\s+ap|\s+ist|\s+university|\s+ktr)?|amrita(?:\s+university|\s+vishwa\s+vidyapeetham)?|gitam(?:\s+university)?|iit(?:\s+[a-z]+)?|nit(?:\s+[a-z]+)?|iiit(?:\s+[a-z]+)?|iim(?:\s+[a-z]+)?|iisc|aiims|niper|iiser|niser|bits(?:\s+pilani|\s+hyderabad|\s+goa)?|jntu[a-z0-9\-]*|andhra\s+university|\bau\b|svu|sri\s+venkateswara\s+university|acharya\s+nagarjuna|anu|osmania(?:\s+university)?|\bou\b|kakatiya|rgukt|gvp|gayatri\s+vidya\s+parishad|vrsec|rvr\s*(?:&|and)?\s*jc|rvrjc|bapatla|bec|pvpsit|siddhartha\s+engineering|vvit|vasireddy|cbit|vasavi|vnr|griet|mgit|snist|bvrit|vardhaman|anurag|malla\s+reddy|manipal|mahe|thapar|lpu|lovely\s+professional|chandigarh\s+university|amity|sharda|galgotias|bennett|shiv\s+nadar|ashoka|symbiosis|nmims|christ\s+university|jain\s+university|pes\s+university|rvce|msrit|bmsce|\bbms\b|sastra|sathyabama|vel\s+tech|bharath\s+university|saveetha|kalasalingam|karunya|anna\s+university|psg\s+tech|ssn|delhi\s+university|\bdu\b|jnu|jamia|bhu|amu|calcutta\s+university|mumbai\s+university|pune\s+university|sppu|oxford|harvard|stanford|\bmit\b|cambridge|caltech|princeton|yale|columbia|berkeley|cmu|other\s+colleges?|another\s+college|other\s+universit(?:y|ies)|another\s+universit(?:y|ies)|different\s+colleges?|different\s+universit(?:y|ies)|non[- ]vignan|outside\s+vignan|any\s+other\s+college|any\s+other\s+university|colleges?\s+in\s+[a-z]+)\b/i;

const POLITICS_AND_WORLD_KNOWLEDGE_RE =
  /\b(prime\s+minister|chief\s+minister|president\s+of|narendra\s+modi|who\s+is\s+(?:the\s+)?(?:pm|president|cm|governor|king|queen|ceo|founder|elon\s+musk|trump|biden)|capital\s+of|world\s+cup|cricket|ipl|football|currency\s+of|stock\s+price|movie|song|actor|actress|box\s+office|celebrity|news|history\s+of\s+[a-z]+|who\s+won)\b/i;

const PROGRAMMING_AND_TECH_TUTORIAL_RE =
  /\b(write\s+(?:a\s+)?(?:python|java|javascript|typescript|c\+\+|c#|\bc\b|html|css|sql|ruby|go|rust|php|react|node)?\s*(?:program|code|script|function|class|algorithm|method|query|app)|explain\s+(?:machine\s+learning|deep\s+learning|ai|react|javascript|python|java|oops|dsa|sql)|how\s+to\s+code|fix\s+(?:this\s+)?code|debug\s+(?:this\s+)?code|solve\s+(?:this\s+)?(?:equation|math|puzzle)|write\s+(?:a\s+)?(?:binary\s+search|sorting|loop|api))\b/i;

const GENERAL_TRIVIA_LIFESTYLE_RE =
  /\b(weather|temperature|forecast|recipe|how\s+to\s+cook|make\s+a\s+cake|bake|restaurant|tell\s+me\s+a\s+joke|write\s+a\s+poem|sing\s+a\s+song|translate|horoscope|astrology|flight\s+ticket|train\s+ticket|hotel\s+booking|medical\s+advice|symptoms\s+of|treatment\s+for|fitness\s+routine|workout|diet\s+plan)\b/i;

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

  // 1. Check for other universities/competitors (Strictly block any other institution)
  if (OTHER_UNIVERSITIES_RE.test(q)) {
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
