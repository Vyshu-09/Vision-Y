import cors from "cors";
import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { bootstrapPersistentStore } from "./db/persist.js";
import { isLlmConfigured } from "./llm/llmClient.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { circularsRouter } from "./routes/circulars.js";
import { clarificationsRouter } from "./routes/clarifications.js";
import { flagsRouter } from "./routes/flags.js";
import { notificationsRouter } from "./routes/notifications.js";
import { policiesRouter } from "./routes/policies.js";

bootstrapPersistentStore();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(config.uploadDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    store: config.useInMemoryStore ? "memory+file" : "postgres",
    data_file: path.resolve(config.dataFile),
    llm: isLlmConfigured() ? "anthropic" : "mock",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/flags", flagsRouter);
app.use("/api/policies", policiesRouter);
app.use("/api/circulars", circularsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/clarifications", clarificationsRouter);
app.use("/api/admin", adminRouter);

app.listen(config.port, () => {
  console.log(`UniPolicy AI API on http://localhost:${config.port}`);
  console.log(`LLM: ${isLlmConfigured() ? "Anthropic Claude" : "mock (set ANTHROPIC_API_KEY to enable)"}`);
  console.log("Demo: student@ / student123 | faculty vignan emails / faculty123 | admin@ / admin123");
  console.log(`Uploads: ${path.resolve(config.uploadDir)}`);
  console.log(`Data file: ${path.resolve(config.dataFile)}`);
});

export { app };
