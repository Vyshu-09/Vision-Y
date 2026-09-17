import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { embedText } from "../embeddings/embedder.js";
import { runConflictAgent } from "../agents/conflictAgent.js";
import { toCandidate } from "../agents/types.js";
import { store } from "../db/store.js";
import { normalizeClause, normalizePolicy, validateEffectiveRange } from "../db/normalize.js";
import { notifyForEvent } from "./notificationEngine.js";
import type { Policy, PolicyClause, Role } from "../types.js";

const CLAUSE_HEADING =
  /(?:^|\n)\s*((?:clause|section|article)\s+)?(\d+(?:\.\d+){0,3})[.)]?\s+([^\n]+)/gi;

const CHAPTER_RE = /(?:^|\n)\s*chapter\s+(\d+)\s*[:.\-–]?\s*([^\n]*)/i;
const SECTION_TITLE_RE = /(?:^|\n)\s*(?:section\s+)?(\d+(?:\.\d+)*)\s+([A-Za-z][^\n]{2,80})/;

/** Marker embedded between PDF pages so clause split can recover real page numbers. */
export const PAGE_MARKER = (n: number) => `\n<<<PAGE ${n}>>>\n`;
const PAGE_MARKER_RE = /<<<PAGE\s+(\d+)>>>/g;

export interface ExtractedClause {
  clause_number: string;
  sub_clause_number: string | null;
  clause_text: string;
  page_number: number | null;
  /** True when page_number came from a real PDF page, not a clause index. */
  page_from_pdf: boolean;
  chapter_number: string | null;
  chapter_title: string | null;
  section_number: string | null;
  section_title: string | null;
  hierarchy_path: string;
  parent_clause_number: string | null;
}

export interface PdfPageText {
  page: number;
  text: string;
}

async function extractPdfPages(buffer: Buffer): Promise<PdfPageText[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;
  const pages: PdfPageText[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .filter(Boolean)
      .join(" ");
    if (line.trim()) pages.push({ page: pageNum, text: line.trim() });
  }

  return pages;
}

/** Join PDF pages with markers for page-aware clause splitting. */
export function joinPagesWithMarkers(pages: PdfPageText[]): string {
  return pages.map((p) => `${PAGE_MARKER(p.page)}${p.text}`).join("\n\n");
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pages = await extractPdfPages(buffer);
  return joinPagesWithMarkers(pages);
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

function pageAtOffset(text: string, offset: number): { page: number | null; fromPdf: boolean } {
  let lastPage: number | null = null;
  PAGE_MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAGE_MARKER_RE.exec(text)) !== null) {
    if ((m.index ?? 0) > offset) break;
    lastPage = Number(m[1]);
  }
  return { page: lastPage, fromPdf: lastPage != null };
}

function stripPageMarkers(text: string): string {
  return text.replace(PAGE_MARKER_RE, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseHierarchy(clauseNumber: string, body: string, fallbackSection: string): {
  sub_clause_number: string | null;
  chapter_number: string | null;
  chapter_title: string | null;
  section_number: string | null;
  section_title: string | null;
  hierarchy_path: string;
  parent_clause_number: string | null;
} {
  const parts = clauseNumber.split(".");
  const parent_clause_number = parts.length > 1 ? parts.slice(0, -1).join(".") : null;
  const sub_clause_number = parts.length > 2 ? clauseNumber : parts.length === 2 ? null : null;

  let chapter_number: string | null = null;
  let chapter_title: string | null = null;
  const ch = body.match(CHAPTER_RE);
  if (ch) {
    chapter_number = ch[1];
    chapter_title = ch[2]?.trim() || null;
  } else if (parts.length >= 1 && /^\d+$/.test(parts[0]) && parts.length >= 2) {
    // Heuristic: first segment as chapter when multi-level (e.g. 4.2.1 → chapter 4)
    chapter_number = parts[0];
  }

  let section_number: string | null = parts.length >= 2 ? parts.slice(0, 2).join(".") : parts[0] ?? null;
  let section_title: string | null = fallbackSection;
  const sec = body.match(SECTION_TITLE_RE);
  if (sec && sec[2]) {
    section_number = sec[1];
    section_title = sec[2].trim();
  }

  const pathParts = [
    chapter_number ? `Chapter ${chapter_number}${chapter_title ? ` ${chapter_title}` : ""}` : null,
    section_title || null,
    `Clause ${clauseNumber}`,
  ].filter(Boolean);

  return {
    sub_clause_number: parts.length >= 3 ? clauseNumber : null,
    chapter_number,
    chapter_title,
    section_number,
    section_title,
    hierarchy_path: pathParts.join(" > ") || clauseNumber,
    parent_clause_number,
  };
}

/**
 * Split policy text into clauses.
 * If text contains <<<PAGE N>>> markers (from PDF extract), page_number is the real PDF page.
 * Otherwise page_number is null (caller may fall back to index — do not claim PDF page).
 */
export function splitIntoClauses(text: string, fallbackSection = "General"): ExtractedClause[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  if (!cleaned) {
    return [
      {
        clause_number: "1",
        sub_clause_number: null,
        clause_text: "No clause text extracted.",
        page_number: null,
        page_from_pdf: false,
        chapter_number: null,
        chapter_title: null,
        section_number: null,
        section_title: fallbackSection,
        hierarchy_path: "1",
        parent_clause_number: null,
      },
    ];
  }

  const hasPdfPages = /<<<PAGE\s+\d+>>>/.test(cleaned);
  const matches = [...cleaned.matchAll(CLAUSE_HEADING)];

  if (matches.length >= 2) {
    const clauses: ExtractedClause[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index ?? 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
      const rawBody = cleaned.slice(start, end).trim();
      const body = stripPageMarkers(rawBody)
        .replace(/^(?:clause|section|article)\s+/i, "")
        .trim()
        .slice(0, 4000);
      const clause_number = matches[i][2];
      const pageInfo = hasPdfPages ? pageAtOffset(cleaned, start) : { page: null, fromPdf: false };
      const hier = parseHierarchy(clause_number, body, fallbackSection);
      clauses.push({
        clause_number,
        sub_clause_number: hier.sub_clause_number,
        clause_text: body,
        page_number: pageInfo.page,
        page_from_pdf: pageInfo.fromPdf,
        chapter_number: hier.chapter_number,
        chapter_title: hier.chapter_title,
        section_number: hier.section_number,
        section_title: hier.section_title,
        hierarchy_path: hier.hierarchy_path,
        parent_clause_number: hier.parent_clause_number,
      });
    }
    return clauses;
  }

  // Paragraph / chunk split — track page markers if present
  const segments: { text: string; offset: number }[] = [];
  if (hasPdfPages) {
    const parts = cleaned.split(/(<<<PAGE\s+\d+>>>)/);
    let offset = 0;
    let buf = "";
    let bufStart = 0;
    for (const part of parts) {
      if (/^<<<PAGE\s+\d+>>>/.test(part)) {
        if (buf.trim().length > 40) {
          for (const para of buf.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 40)) {
            const idx = cleaned.indexOf(para, bufStart);
            segments.push({ text: para, offset: idx >= 0 ? idx : bufStart });
          }
        }
        buf = "";
        bufStart = offset + part.length;
        offset += part.length;
        continue;
      }
      if (!buf) bufStart = offset;
      buf += part;
      offset += part.length;
    }
    if (buf.trim().length > 40) {
      for (const para of buf.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 40)) {
        const idx = cleaned.indexOf(para, bufStart);
        segments.push({ text: stripPageMarkers(para), offset: idx >= 0 ? idx : bufStart });
      }
    }
  }

  const paras =
    segments.length > 0
      ? segments
      : cleaned
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 40)
          .map((p, i) => ({ text: p, offset: cleaned.indexOf(p) >= 0 ? cleaned.indexOf(p) : i }));

  if (paras.length === 0) {
    const chunks: ExtractedClause[] = [];
    const size = 900;
    const plain = stripPageMarkers(cleaned);
    for (let i = 0; i < plain.length; i += size) {
      const clause_number = String(chunks.length + 1);
      const slice = plain.slice(i, i + size).trim();
      const hier = parseHierarchy(clause_number, slice, fallbackSection);
      const pageInfo = hasPdfPages ? pageAtOffset(cleaned, i) : { page: null, fromPdf: false };
      chunks.push({
        clause_number,
        sub_clause_number: null,
        clause_text: slice,
        page_number: pageInfo.page,
        page_from_pdf: pageInfo.fromPdf,
        chapter_number: hier.chapter_number,
        chapter_title: hier.chapter_title,
        section_number: hier.section_number,
        section_title: hier.section_title,
        hierarchy_path: hier.hierarchy_path,
        parent_clause_number: null,
      });
    }
    return chunks.length
      ? chunks
      : [
          {
            clause_number: "1",
            sub_clause_number: null,
            clause_text: plain.slice(0, 2000),
            page_number: hasPdfPages ? 1 : null,
            page_from_pdf: hasPdfPages,
            chapter_number: null,
            chapter_title: null,
            section_number: null,
            section_title: fallbackSection,
            hierarchy_path: "1",
            parent_clause_number: null,
          },
        ];
  }

  return paras.map((p, i) => {
    const clause_number = String(i + 1);
    const body = stripPageMarkers(p.text).slice(0, 4000);
    const hier = parseHierarchy(clause_number, body, fallbackSection);
    const pageInfo = hasPdfPages ? pageAtOffset(cleaned, p.offset) : { page: null, fromPdf: false };
    return {
      clause_number,
      sub_clause_number: null,
      clause_text: body,
      page_number: pageInfo.page,
      page_from_pdf: pageInfo.fromPdf,
      chapter_number: hier.chapter_number,
      chapter_title: hier.chapter_title,
      section_number: hier.section_number,
      section_title: hier.section_title || fallbackSection,
      hierarchy_path: hier.hierarchy_path,
      parent_clause_number: null,
    };
  });
}

export interface ProcessUploadInput {
  title: string;
  category: string;
  version_year: number;
  version_label?: string | null;
  effective_date: string;
  effective_until?: string | null;
  authority_level: Policy["authority_level"];
  department: string | null;
  uploaded_by: string;
  source_file_url: string;
  source_url?: string | null;
  source_type?: Policy["source_type"];
  document_type?: Policy["document_type"];
  regulation?: string | null;
  program?: string | null;
  content_hash?: string | null;
  document_version?: string | null;
  retrieved_at?: string;
  document_name?: string | null;
  description?: string | null;
  approved_by?: string | null;
  approval_date?: string | null;
  text: string;
  audience?: Role[];
  family_id?: string | null;
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
  const rangeErr = validateEffectiveRange(input.effective_date, input.effective_until);
  if (rangeErr) throw new Error(rangeErr);

  const now = store.now();
  const id = store.newId();
  const version_label = input.version_label?.trim() || String(input.version_year);

  const sameTitle = store
    .listPolicies()
    .filter((p) => p.title.toLowerCase() === input.title.toLowerCase() && p.category === input.category);
  const family_id =
    input.family_id?.trim() ||
    sameTitle.find((p) => p.status === "active")?.family_id ||
    sameTitle[0]?.family_id ||
    id;

  const document_name =
    input.document_name ??
    (input.source_file_url.startsWith("pasted://") ? "pasted-text.txt" : path.basename(input.source_file_url));

  const policy = normalizePolicy({
    id,
    family_id,
    title: input.title,
    category: input.category,
    description: input.description ?? null,
    version_year: input.version_year,
    version_label,
    effective_date: input.effective_date,
    effective_until: input.effective_until ?? null,
    status: "under_review",
    source_type: input.source_type,
    document_type: input.document_type,
    source_file_url: input.source_file_url,
    source_url: input.source_url ?? input.source_file_url,
    retrieved_at: input.retrieved_at ?? now,
    content_hash: input.content_hash ?? null,
    document_version: input.document_version ?? version_label,
    program: input.program ?? null,
    regulation: input.regulation ?? null,
    document_name,
    uploaded_by: input.uploaded_by,
    uploaded_at: now,
    updated_at: now,
    authority_level: input.authority_level,
    department: input.department,
    audience: input.audience?.length
      ? Array.from(new Set([...input.audience, "super_admin" as Role]))
      : ["student", "faculty", "staff", "super_admin"],
    supersedes_id: null,
    superseded_by_id: null,
    approved_by: input.approved_by ?? null,
    approval_date: input.approval_date ?? null,
    metadata: null,
  });
  store.insertPolicy(policy);

  const extracted = splitIntoClauses(input.text, input.category || "General");
  const idByNumber = new Map<string, string>();
  const clauses: PolicyClause[] = extracted.map((c, i) => {
    const clauseId = randomUUID();
    idByNumber.set(c.clause_number, clauseId);
    // Real PDF page when markers present; otherwise leave null (do not fake as PDF page index)
    const page_number = c.page_number;
    return normalizeClause({
      id: clauseId,
      policy_id: policy.id,
      policy_version_label: version_label,
      clause_number: c.clause_number,
      sub_clause_number: c.sub_clause_number,
      clause_text: c.clause_text,
      section: c.section_title || input.category || "General",
      section_number: c.section_number,
      section_title: c.section_title,
      chapter_number: c.chapter_number,
      chapter_title: c.chapter_title,
      parent_clause_id: c.parent_clause_number ? idByNumber.get(c.parent_clause_number) ?? null : null,
      hierarchy_path: c.hierarchy_path,
      page_number: page_number ?? null,
      source_document: document_name,
      source_type: policy.source_type,
      document_type: policy.document_type,
      regulation: policy.regulation,
      program: policy.program,
      source_url: policy.source_url,
      retrieved_at: policy.retrieved_at,
      embedding_vector: embedText(`${c.clause_number} ${c.clause_text}`),
      created_at: now,
      updated_at: now,
    }, version_label, policy);
  });
  // Second pass: resolve parent ids for clauses whose parent appeared later (rare)
  for (let i = 0; i < extracted.length; i++) {
    const parentNum = extracted[i].parent_clause_number;
    if (parentNum && !clauses[i].parent_clause_id) {
      const parentId = idByNumber.get(parentNum);
      if (parentId) {
        clauses[i] = { ...clauses[i], parent_clause_id: parentId };
      }
    }
  }
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
    store.updatePolicy(policy.id, {
      supersedes_id: previous.id,
      family_id: previous.family_id || previous.id,
      updated_at: now,
    });
    const review = store.insertSupersession({
      id: store.newId(),
      old_policy_id: previous.id,
      new_policy_id: policy.id,
      status: "pending",
      created_at: now,
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

  return {
    policy: store.getPolicy(policy.id) ?? policy,
    clauses,
    supersession_id,
    new_conflicts,
  };
}

