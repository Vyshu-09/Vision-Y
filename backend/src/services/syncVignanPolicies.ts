import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { store } from "../db/store.js";
import { extractTextFromFile, processUploadedPolicy } from "./documentProcessor.js";
import {
  VIGNAN_POLICY_CATALOG,
  VIGNAN_REGULATIONS_CATALOG,
  type VignanCatalogEntry,
} from "./vignanCatalog.js";

export interface SyncVignanResult {
  imported: number;
  failed: Array<{ title: string; error: string }>;
  removed: number;
  skipped: number;
}

export function getAllOfficialVignanCatalog(): VignanCatalogEntry[] {
  return [...VIGNAN_REGULATIONS_CATALOG, ...VIGNAN_POLICY_CATALOG];
}

export function needsOfficialPolicySync(): boolean {
  const policies = store.listPolicies();
  if (!policies.length) return true;
  const hasOfficial = policies.some(
    (p) => (p.source_type === "OFFICIAL_VIGNAN" || p.source_type === "REGULATION") && p.status === "active",
  );
  return !hasOfficial;
}

function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadPdf(url: string, dest: string): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; UniPolicyAI/1.0; +https://vignan.ac.in/newvignan/policies.php)",
          Accept: "application/pdf,*/*",
          Referer: "https://vignan.ac.in/newvignan/policies.php",
        },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) throw new Error("Downloaded file too small");
      fs.writeFileSync(dest, buf);
      return buf;
    } catch (err) {
      lastErr = err;
      await sleep(800 * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Download official Vignan PDFs (policies, regulations, handbooks),
 * compute SHA-256 hashes, extract clauses, and index into the active knowledge base.
 */
export async function syncVignanPolicies(opts?: {
  catalog?: VignanCatalogEntry[];
  replaceExisting?: boolean;
  uploadedBy?: string | null;
  cacheDir?: string;
  limit?: number;
}): Promise<SyncVignanResult> {
  const catalog = opts?.catalog ?? getAllOfficialVignanCatalog();
  const cacheDir =
    opts?.cacheDir ?? path.resolve(process.cwd(), "uploads", "vignan-cache");
  fs.mkdirSync(cacheDir, { recursive: true });

  // Avoid hammering Mongo/file saves on every clause insert during a bulk sync
  const resume = store.pauseChangeNotifications();

  let removed = 0;
  // Mark any remaining legacy mock seed docs as demo_only so they are never retrieved
  for (const p of [...store.listPolicies()]) {
    if ((p.source_file_url ?? "").startsWith("seed://") || p.status === "demo_only") {
      if (opts?.replaceExisting) {
        store.deletePolicy(p.id);
        removed += 1;
      }
    }
  }

  const adminId =
    opts?.uploadedBy ??
    [...store.users.values()].find((u) => u.role === "super_admin")?.id ??
    "vignan-sync";

  const failed: Array<{ title: string; error: string }> = [];
  let imported = 0;
  let skipped = 0;
  const list = typeof opts?.limit === "number" ? catalog.slice(0, opts.limit) : catalog;

  try {
    for (const entry of list) {
      if (!entry.pdf_url.toLowerCase().endsWith(".pdf") && !entry.pdf_url.includes(".pdf")) {
        skipped += 1;
        continue;
      }
      const safeName = entry.title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
      const dest = path.join(cacheDir, `${safeName}.pdf`);
      try {
        let buf: Buffer;
        if (!fs.existsSync(dest) || fs.statSync(dest).size < 500) {
          buf = await downloadPdf(entry.pdf_url, dest);
          await sleep(300);
        } else {
          buf = fs.readFileSync(dest);
        }

        const hash = computeSha256(buf);
        const retrieved_at = new Date().toISOString();

        // Check if existing policy with same hash already exists
        const existingPolicies = store.listPolicies().filter(
          (p) => p.source_file_url === entry.pdf_url || (p.source_url === entry.pdf_url && p.title === entry.title),
        );
        const exactMatch = existingPolicies.find((p) => p.content_hash === hash && p.status === "active");
        if (exactMatch && opts?.replaceExisting === false) {
          skipped += 1;
          continue;
        }

        const text = await extractTextFromFile(dest, path.basename(dest));
        if (!text.trim() || text.trim().length < 80) {
          throw new Error("Extracted text too short");
        }

        const isRegulation = entry.document_type === "REGULATION" || entry.category.toLowerCase().includes("regulation");
        const docType = entry.document_type ?? (isRegulation ? "REGULATION" : "POLICY");
        const srcType = entry.source_type ?? (isRegulation ? "REGULATION" : "OFFICIAL_VIGNAN");
        const version_year = entry.version_year ?? (isRegulation ? 2026 : 2024);
        const version_label = entry.version_label ?? String(version_year);
        const effective_date = entry.effective_date ?? (isRegulation ? `${version_year}-07-01` : "2024-01-01");

        // If replacing existing matching version, clean old copy or mark superseded
        if (opts?.replaceExisting !== false) {
          for (const old of existingPolicies) {
            store.deletePolicy(old.id);
            removed += 1;
          }
        }

        const result = processUploadedPolicy({
          title: entry.title.trim(),
          category: entry.category,
          version_year,
          version_label,
          effective_date,
          effective_until: entry.effective_until ?? null,
          authority_level: "university",
          department: null,
          uploaded_by: adminId,
          source_file_url: entry.pdf_url,
          source_url: entry.pdf_url,
          source_type: srcType,
          document_type: docType,
          regulation: entry.regulation ?? (version_label.startsWith("R") ? version_label : null),
          program: entry.program ?? (entry.title.includes("B.Tech") ? "B.Tech" : null),
          content_hash: hash,
          retrieved_at,
          document_version: version_label,
          document_name: path.basename(dest),
          description: `${entry.description} Source: https://vignan.ac.in`,
          text,
          audience: entry.audience,
          approved_by: "Vignan University (official PDF)",
          approval_date: effective_date,
          family_id: entry.family_id ?? (isRegulation && entry.program === "B.Tech" ? "BTECH_REGULATIONS" : undefined),
        });

        store.updatePolicy(result.policy.id, {
          status: "active",
          source_type: srcType,
          document_type: docType,
          content_hash: hash,
          retrieved_at,
          updated_at: store.now(),
        });

        imported += 1;
        console.log(`[vignan-sync] OK ${entry.title} (${result.clauses.length} clauses, hash ${hash.slice(0, 8)})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ title: entry.title, error: msg });
        console.warn(`[vignan-sync] FAIL ${entry.title}: ${msg}`);
      }
    }
  } finally {
    resume();
  }

  return { imported, failed, removed, skipped };
}
