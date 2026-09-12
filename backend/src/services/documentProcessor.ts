import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { embedText } from "../embeddings/embedder.js";
import { runConflictAgent } from "../agents/conflictAgent.js";
import { toCandidate } from "../agents/types.js";
import { store } from "../db/store.js";
import { notifyForEvent } from "./notificationEngine.js";
import type { Policy, PolicyClause, Role } from "../types.js";

const CLAUSE_HEADING =
  /(?:^|\n)\s*((?:clause|section|article)\s+)?(\d+(?:\.\d+){0,3})[.)]?\s+([^\n]+)/gi;

export interface ExtractedClause {
  clause_number: string;
  clause_text: string;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist handles more real-world PDFs than the old pdf-parse bundle
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .filter(Boolean)
      .join(" ");
    if (line.trim()) pages.push(line.trim());
  }

  return pages.join("\n\n");
}

export async function extractTextFromFile(filePath: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName || filePath).toLowerCase();

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value?.trim() ?? "";
    if (!text) throw new Error("Could not extract text from this DOCX file.");
    return text;
  }

  if (ext === ".pdf") {
    const buffer = await fs.readFile(filePath);
    if (buffer.length < 100) {
      throw new Error("PDF file appears empty or corrupted.");
    }

    try {
      const text = (await extractPdfText(buffer)).trim();
      if (!text) {
        throw new Error(
          "No readable text found in this PDF (it may be a scanned image). Paste the policy text instead, or upload a text-based PDF/DOCX.",
        );
      }
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown PDF error";
      if (message.includes("No readable text") || message.includes("scanned image")) {
        throw err;
      }
      throw new Error(
        `Could not read this PDF (${message}). Try re-saving it as PDF, upload DOCX/TXT, or paste the policy text.`,
      );
    }
  }

  if (ext === ".txt" || ext === ".md" || ext === "") {
    const text = (await fs.readFile(filePath, "utf8")).trim();
    if (!text) throw new Error("Uploaded text file is empty.");
    return text;
  }

  throw new Error(`Unsupported file type "${ext || "unknown"}". Use PDF, DOCX, or TXT.`);
}

export function splitIntoClauses(text: string): ExtractedClause[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  if (!cleaned) {
    return [{ clause_number: "1", clause_text: "No clause text extracted." }];
  }

  const matches = [...cleaned.matchAll(CLAUSE_HEADING)];
  if (matches.length >= 2) {
    const clauses: ExtractedClause[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index ?? 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
      const body = cleaned.slice(start, end).trim();
      clauses.push({
        clause_number: matches[i][2],
        clause_text: body.replace(/^(?:clause|section|article)\s+/i, "").trim().slice(0, 4000),
      });
    }
    return clauses;
  }

  const paras = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  if (paras.length === 0) {
    // Chunk long plain text so embeddings still work
    const chunks: ExtractedClause[] = [];
    const size = 900;
    for (let i = 0; i < cleaned.length; i += size) {
      chunks.push({
        clause_number: String(chunks.length + 1),
        clause_text: cleaned.slice(i, i + size).trim(),
      });
    }
    return chunks.length ? chunks : [{ clause_number: "1", clause_text: cleaned.slice(0, 2000) }];
  }

  return paras.map((p, i) => ({
    clause_number: String(i + 1),
    clause_text: p.slice(0, 4000),
  }));
}

export interface ProcessUploadInput {
  title: string;
  category: string;
  version_year: number;
  effective_date: string;
  authority_level: Policy["authority_level"];
  department: string | null;
  uploaded_by: string;
  source_file_url: string;
  text: string;
  audience?: Role[];
}

export interface ProcessUploadResult {
  policy: Policy;
  clauses: PolicyClause[];
  supersession_id: string | null;
  new_conflicts: number;
}

/**
 * Admin document pipeline:
 * extract (caller) → split clauses → embed → version supersession review → conflict scan.
 */
export function processUploadedPolicy(input: ProcessUploadInput): ProcessUploadResult {
  const policy: Policy = {
    id: store.newId(),
    title: input.title,
    category: input.category,
    version_year: input.version_year,
    effective_date: input.effective_date,
    status: "under_review",
    source_file_url: input.source_file_url,
    uploaded_by: input.uploaded_by,
    uploaded_at: store.now(),
    authority_level: input.authority_level,
    department: input.department,
    audience: input.audience?.length
      ? Array.from(new Set([...input.audience, "super_admin" as Role]))
      : ["student", "faculty", "staff", "super_admin"],
    supersedes_id: null,
  };
  store.insertPolicy(policy);

  const extracted = splitIntoClauses(input.text);
  const clauses: PolicyClause[] = extracted.map((c, i) => ({
    id: randomUUID(),
    policy_id: policy.id,
    clause_number: c.clause_number,
    clause_text: c.clause_text,
    section: input.category || "General",
    page_number: i + 1,
    embedding_vector: embedText(`${c.clause_number} ${c.clause_text}`),
  }));
  for (const c of clauses) store.insertClause(c);

  let supersession_id: string | null = null;
  const sameCategoryActive = store
    .policiesByCategory(input.category)
    .filter((p) => p.id !== policy.id && p.status === "active" && p.authority_level === policy.authority_level);

  const older = sameCategoryActive.filter(
    (p) => p.version_year < policy.version_year || p.effective_date < policy.effective_date,
  );
  if (older.length > 0) {
    const previous = older.sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];
    const review = store.insertSupersession({
      id: store.newId(),
      old_policy_id: previous.id,
      new_policy_id: policy.id,
      status: "pending",
      created_at: store.now(),
    });
    supersession_id = review.id;
  }

  const activePolicies = store.listPolicies().filter((p) => p.status === "active" || p.id === policy.id);
  const candidates = activePolicies.flatMap((p) =>
    store.clausesForPolicy(p.id).map((cl) => toCandidate(p, cl, 1)),
  );
  const sameCat = candidates.filter((c) => c.category.toLowerCase() === policy.category.toLowerCase());
  const detected = runConflictAgent({ current_candidates: sameCat });
  let new_conflicts = 0;
  for (const pair of detected.conflicting_pairs) {
    if (!store.findOpenConflict(pair.a.policy_id, pair.b.policy_id, pair.a.clause_number, pair.b.clause_number)) {
      store.insertConflict({
        id: store.newId(),
        policy_a_id: pair.a.policy_id,
        policy_b_id: pair.b.policy_id,
        clause_a: pair.a.clause_number,
        clause_b: pair.b.clause_number,
        description: pair.description,
        status: "open",
        resolved_by: null,
        created_at: store.now(),
      });
      new_conflicts += 1;
      notifyForEvent({
        event: "conflict_detected",
        roles: ["super_admin", "staff"],
        severity: "critical",
        title: "Conflict found on upload",
        body: pair.description,
        policyId: policy.id,
      });
    }
  }

  notifyForEvent({
    event: "new_document",
    roles: ["super_admin", "staff"],
    severity: "info",
    title: `New document uploaded: ${policy.title}`,
    body: `${policy.category} (${policy.version_year}) is under review.`,
    policyId: policy.id,
  });

  if (supersession_id) {
    notifyForEvent({
      event: "review_pending",
      roles: ["super_admin"],
      severity: "warning",
      title: "Version supersession pending",
      body: `${policy.title} may supersede an older policy — approve or reject in the review queue.`,
      policyId: policy.id,
    });
  }

  return { policy, clauses, supersession_id, new_conflicts };
}
