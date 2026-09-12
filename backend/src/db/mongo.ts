import { MongoClient, type Db } from "mongodb";
import { config } from "../config.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(config.mongodbUri?.trim());
}

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is not set");
  }
  client = new MongoClient(config.mongodbUri);
  await client.connect();
  db = client.db(config.mongodbDbName);
  console.log(`[mongo] Connected → db "${config.mongodbDbName}"`);
  return db;
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
