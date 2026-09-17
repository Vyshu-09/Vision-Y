import { MongoClient, type Db, type MongoClientOptions } from "mongodb";
import { config } from "../config.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(config.mongodbUri?.trim());
}

/** Ensure Atlas URI has TLS / retry flags Render expects. */
function normalizeMongoUri(uri: string): string {
  let out = uri.trim();
  if (!out.includes("retryWrites=")) {
    out += (out.includes("?") ? "&" : "?") + "retryWrites=true";
  }
  if (!out.includes("w=")) {
    out += (out.includes("?") ? "&" : "?") + "w=majority";
  }
  return out;
}

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is not set");
  }

  const options: MongoClientOptions = {
    // Fail fast on Render so the API still boots if Atlas is blocked
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
    // IPv4-only avoids common Render → Atlas TLS handshake failures
    family: 4,
  };

  client = new MongoClient(normalizeMongoUri(config.mongodbUri), options);
  await client.connect();
  db = client.db(config.mongodbDbName);
  // Quick ping so we know the cluster is actually reachable
  await db.command({ ping: 1 });
  console.log(`[mongo] Connected → db "${config.mongodbDbName}"`);
  return db;
}

/** Create useful indexes for policy versioning / clause lookup. Idempotent. */
export async function ensureIndexes(): Promise<void> {
  const database = await getMongoDb();
  if (!database) return;
  const policies = database.collection("policies");
  const clauses = database.collection("clauses");
  await Promise.all([
    policies.createIndex({ family_id: 1 }),
    policies.createIndex({ status: 1 }),
    policies.createIndex({ family_id: 1, version_label: 1 }),
    policies.createIndex({ effective_date: 1 }),
    policies.createIndex({ effective_until: 1 }),
    policies.createIndex({ category: 1 }),
    clauses.createIndex({ policy_id: 1 }),
    clauses.createIndex({ policy_id: 1, clause_number: 1 }),
    clauses.createIndex({ hierarchy_path: 1 }),
  ]);
  console.log("[mongo] Policy/clause indexes ensured");
}

export async function getMongoDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null;
  return connectMongo();
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export const MONGO_COLLECTIONS = [
  "users",
  "policies",
  "clauses",
  "circulars",
  "queries",
  "flags",
  "conflicts",
  "supersessions",
  "notifications",
  "clarifications",
] as const;

export type MongoCollectionName = (typeof MONGO_COLLECTIONS)[number];
