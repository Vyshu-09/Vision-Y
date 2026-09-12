import { Router } from "express";
import { runPolicyPipeline } from "../agents/pipeline.js";
import { store } from "../db/store.js";
import { requireAuth } from "../middleware/auth.js";

export const chatRouter = Router();

chatRouter.post("/", requireAuth, async (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  if (!question) {
    res.status(400).json({ error: "question is required" });
    return;
  }
  const auth = req.auth!;
  try {
    const result = await runPolicyPipeline({
      question,
      role: auth.role,
      userId: auth.userId,
    });
    res.json({
      answer_text: result.answer_text,
      sources: result.sources,
      low_confidence: result.low_confidence,
      escalated: result.escalated,
      flagged_for_admin: result.flagged_for_admin,
      needs_clarification: result.needs_clarification,
      clarification_prompt: result.clarification_prompt,
      clarification_options: (result.clarification_options ?? []).map((o) =>
        typeof o === "string" ? o : o.label,
      ),
      pipeline_stages: result.logs.map((l) => l.stage),
      logs: result.logs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pipeline failed" });
  }
});

chatRouter.get("/history", requireAuth, (req, res) => {
  const rows = store.queriesForUser(req.auth!.userId).slice(0, 20);
  res.json({ queries: rows });
});
