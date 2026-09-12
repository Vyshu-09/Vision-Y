import cors from "cors";
import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { bootstrapPersistentStore, getPersistMode } from "./db/persist.js";
import { isMongoConfigured } from "./db/mongo.js";
import { isLlmConfigured } from "./llm/llmClient.js";
import { isCloudinaryConfigured } from "./services/cloudinary.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { circularsRouter } from "./routes/circulars.js";
import { clarificationsRouter } from "./routes/clarifications.js";
import { flagsRouter } from "./routes/flags.js";
import { notificationsRouter } from "./routes/notifications.js";
import { policiesRouter } from "./routes/policies.js";

async function main() {
  await bootstrapPersistentStore();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(config.uploadDir));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      store: isMongoConfigured() && getPersistMode() === "mongo" ? "memory+mongodb" : "memory+file",
      mongodb: isMongoConfigured() ? "configured" : "off",
      data_file: path.resolve(config.dataFile),
      llm: isLlmConfigured() ? "anthropic" : "mock",
      cloudinary: isCloudinaryConfigured() ? "on" : "off",
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

  const port = config.port;
  app.listen(port, "0.0.0.0", () => {
    console.log(`UniPolicy AI API on http://0.0.0.0:${port}`);
    console.log(`Persist: ${getPersistMode()}${isMongoConfigured() ? " (MongoDB Atlas)" : ""}`);
    console.log(`LLM: ${isLlmConfigured() ? "Anthropic Claude" : "mock (set ANTHROPIC_API_KEY to enable)"}`);
    console.log("Demo: student@ / student123 | faculty vignan emails / faculty123 | admin@ / admin123");
    console.log(`Uploads: ${path.resolve(config.uploadDir)}`);
    console.log(`Data file backup: ${path.resolve(config.dataFile)}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
