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
    blob.includes("applicable clause") ||
    blob.includes("agent 53") ||
    blob.includes("policy assistant") ||
    blob.includes("unipolicy") ||
    blob.includes("retrieved policy content") ||
    blob.includes("authoritative document") ||
    blob.includes("authoritative policy") ||
    blob.includes("clause")
  ) {
    let clauseText = "";
    const clauseMatch0 = user.match(
      /Retrieved Policy Content:\n([\s\S]+?)(?:\n\nRelated official circulars|\n\nProvide a concise|\nDetail level:|\nSource URL:|$)/i,
    );
    const clauseMatch1 = user.match(
      /Applicable clause[^\n]*:\n([\s\S]+?)(?:\n\nRelated official circulars|\n\nProvide a concise|\nDetail level:|\nSource URL:|$)/i,
    );
    const clauseMatch2 = user.match(
      /Clause\s+[\d.]+[^\n]*:\n([\s\S]+?)(?:\n\nRelated official circulars|\n\nProvide a concise|\nDetail level:|\nSource URL:|$)/i,
    );
    clauseText = (clauseMatch0?.[1] || clauseMatch1?.[1] || clauseMatch2?.[1] || "").trim();

    const circMatch = user.match(/Related official circulars[\s\S]*?:\n([\s\S]+?)(?:\n\nProvide a concise|\nDetail level:|\nSource URL:|$)/i);
    const circText = circMatch?.[1]?.trim() ?? "";

    let circularNote = "";
    if (circText) {
      const lines = circText.split("\n").map((l) => l.trim()).filter(Boolean);
      const firstLine = lines.find((l) => l.startsWith("-")) ?? lines[0];
      if (firstLine) {
        circularNote = ` Also note ${firstLine.replace(/^-+\s*/, "").trim()}.`;
      }
    }

    if (clauseText) {
      const clean = clauseText
        .replace(/[\uE000-\uF8FF\u2022\u25CF\uF06C\uE1F2\uFFFD\u0000\f]/g, " ")
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
      let summary = sentences.slice(0, 3).join(" ").trim();
      if (summary.length > 280) {
        const cleanCut = summary.slice(0, 280).replace(/\s+\S*$/, "");
        summary = cleanCut.endsWith(".") ? cleanCut : cleanCut + ".";
      }
      if (!summary.endsWith(".")) summary += ".";

      return (
        `According to Vignan University policy: ${summary}` +
        circularNote
      );
    }
    return (
      "Based on official Vignan University policies, please check the verified Source Card below for specific rules and guidelines."
    );
  }

  return "Mock LLM response (set ANTHROPIC_API_KEY to use Claude).";
}

export function isLlmConfigured(): boolean {
  return Boolean(config.anthropicApiKey);
}
