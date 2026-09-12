import type {
  Circular,
  ClarificationTicket,
  ConflictRecord,
  FlagRecord,
  Notification,
  Policy,
  PolicyClause,
  QueryRecord,
  SupersessionReview,
  User,
} from "../types.js";
import { getMongoDb, MONGO_COLLECTIONS, type MongoCollectionName } from "./mongo.js";

export interface StoreSnapshot {
  version: 1;
  saved_at: string;
  users: User[];
  policies: Policy[];
  clauses: PolicyClause[];
  circulars: Circular[];
  queries: QueryRecord[];
  flags: FlagRecord[];
  conflicts: ConflictRecord[];
  supersessions: SupersessionReview[];
  notifications: Notification[];
  clarifications: ClarificationTicket[];
}

type DocWithId = { id: string };

function stripMongoId<T extends DocWithId>(doc: T & { _id?: unknown }): T {
  const { _id: _ignored, ...rest } = doc as T & { _id?: unknown };
  return rest as T;
}

async function replaceCollection(name: MongoCollectionName, rows: DocWithId[]): Promise<void> {
  const db = await getMongoDb();
  if (!db) throw new Error("MongoDB not connected");
  const col = db.collection(name);
  await col.deleteMany({});
  if (!rows.length) return;
  await col.insertMany(
    rows.map((row) => ({
      ...row,
      _id: row.id,
    })),
    { ordered: false },
  );
}

export async function saveSnapshotToMongo(snap: StoreSnapshot): Promise<void> {
  const db = await getMongoDb();
  if (!db) throw new Error("MongoDB not connected");

  await Promise.all([
    replaceCollection("users", snap.users),
    replaceCollection("policies", snap.policies),
    replaceCollection("clauses", snap.clauses),
    replaceCollection("circulars", snap.circulars),
    replaceCollection("queries", snap.queries),
    replaceCollection("flags", snap.flags),
    replaceCollection("conflicts", snap.conflicts),
    replaceCollection("supersessions", snap.supersessions),
    replaceCollection("notifications", snap.notifications),
    replaceCollection("clarifications", snap.clarifications),
  ]);

  await db.collection("meta").updateOne(
    { key: "store" },
    {
      $set: {
        key: "store",
        version: snap.version,
        saved_at: snap.saved_at,
        counts: {
          users: snap.users.length,
          policies: snap.policies.length,
          clauses: snap.clauses.length,
          circulars: snap.circulars.length,
          queries: snap.queries.length,
          flags: snap.flags.length,
          conflicts: snap.conflicts.length,
          supersessions: snap.supersessions.length,
          notifications: snap.notifications.length,
          clarifications: snap.clarifications.length,
        },
      },
    },
    { upsert: true },
  );
}

export async function loadSnapshotFromMongo(): Promise<StoreSnapshot | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const [
    users,
    policies,
    clauses,
    circulars,
    queries,
    flags,
    conflicts,
    supersessions,
    notifications,
    clarifications,
  ] = await Promise.all(
    MONGO_COLLECTIONS.map(async (name) => {
      const rows = await db.collection(name).find({}).toArray();
      return rows.map((r) => stripMongoId(r as unknown as DocWithId & { _id?: unknown }));
    }),
  );

  if (!users.length) return null;

  return {
    version: 1,
    saved_at: new Date().toISOString(),
    users: users as User[],
    policies: policies as Policy[],
    clauses: clauses as PolicyClause[],
    circulars: circulars as Circular[],
    queries: queries as QueryRecord[],
    flags: flags as FlagRecord[],
    conflicts: conflicts as ConflictRecord[],
    supersessions: supersessions as SupersessionReview[],
    notifications: notifications as Notification[],
    clarifications: clarifications as ClarificationTicket[],
  };
}
