import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "unipolicy-dev-secret-change-me",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  mongodbUri: process.env.MONGODB_URI ?? "",
  mongodbDbName: process.env.MONGODB_DB_NAME ?? "vision_y",
  useInMemoryStore: (process.env.USE_IN_MEMORY_STORE ?? "true") === "true",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  /** JSON snapshot of the in-memory store (survives restarts / Mongo backup). */
  dataFile: process.env.DATA_FILE ?? "./data/store.json",
  cloudinaryCloudName: (process.env.CLOUDINARY_CLOUD_NAME ?? "").trim().toLowerCase(),
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
};
