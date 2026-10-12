import { AsyncLocalStorage } from "node:async_hooks";
import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "pg";
import path from "node:path";

type Result = { rows: Record<string, any>[]; rowCount?: number | null };
type Database = {
  query: (sql: string, params?: unknown[]) => Promise<Result>;
  withWorkspace?: <T>(workspaceId: string, operation: () => Promise<T>) => Promise<T>;
};
type WorkspaceTransaction = { workspaceId: string; client: PoolClient };
const workspaceTransaction = new AsyncLocalStorage<WorkspaceTransaction>();

const schema = `
CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS opportunities (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  platform text NOT NULL,
  community text NOT NULL,
  author text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  pain text NOT NULL,
  intent text NOT NULL,
  relevance integer NOT NULL,
  engagement text NOT NULL,
  source_url text,
  source_kind text NOT NULL DEFAULT 'demo',
  observed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new'
);
CREATE UNIQUE INDEX IF NOT EXISTS manual_opportunity_source ON opportunities (workspace_id, source_url) WHERE source_kind = 'manual';
CREATE TABLE IF NOT EXISTS drafts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  opportunity_id text REFERENCES opportunities(id),
  platform text NOT NULL,
  kind text NOT NULL,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  origin text NOT NULL DEFAULT 'sample',
  approved_at timestamptz,
  approved_by text,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  opportunity_id text REFERENCES opportunities(id),
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  platform text NOT NULL,
  pain text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'identified',
  notes text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS approved_by text;
`;

declare global {
  // eslint-disable-next-line no-var
  var threadlyDb: Promise<Database> | undefined;
}

async function openDatabase(): Promise<Database> {
  let db: Database;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    // Hosted databases are managed by the checked-in Supabase migration.
    await pool.query("SELECT id FROM public.workspaces LIMIT 0");
    db = {
      query: async (sql, params) => {
        const transaction = workspaceTransaction.getStore();
        if (!transaction) throw new Error("Hosted database queries require an authenticated workspace");
        return transaction.client.query(sql, params as any[]);
      },
      withWorkspace: async (workspaceId, operation) => {
        const active = workspaceTransaction.getStore();
        if (active) {
          if (active.workspaceId !== workspaceId) throw new Error("Workspace context cannot change inside a database transaction");
          return operation();
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT set_config('threadly.workspace_id', $1, true)", [workspaceId]);
          const result = await workspaceTransaction.run({ workspaceId, client }, operation);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          throw error;
        } finally {
          client.release();
        }
      },
    };
  } else {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_LOGIN !== "true") {
      throw new Error("DATABASE_URL is required for a hosted production deployment");
    }
    const local = new PGlite(process.env.THREADLY_DATA_DIR || path.join(process.cwd(), ".threadly-data"));
    await local.waitReady;
    db = { query: (sql, params) => local.query(sql, params as any[]) };
    for (const statement of schema.split(";").map(part => part.trim()).filter(Boolean)) {
      await db.query(statement);
    }
  }
  return db;
}

async function baseDatabase(): Promise<Database> {
  globalThis.threadlyDb ??= openDatabase().catch(error => {
    globalThis.threadlyDb = undefined;
    throw error;
  });
  return globalThis.threadlyDb;
}

export async function database(workspaceId?: string): Promise<Database> {
  const db = await baseDatabase();
  if (!db.withWorkspace) return db;
  if (!workspaceId?.trim()) throw new Error("Authenticated workspace is required for hosted database access");
  const active = workspaceTransaction.getStore();
  if (active) {
    if (active.workspaceId !== workspaceId) throw new Error("Workspace context does not match the authenticated user");
    return db;
  }
  return {
    query: (sql, params) => db.withWorkspace!(workspaceId, () => db.query(sql, params)),
  };
}

export async function withWorkspace<T>(workspaceId: string, operation: () => Promise<T>): Promise<T> {
  const db = await baseDatabase();
  if (!db.withWorkspace) return operation();
  if (!workspaceId.trim()) throw new Error("Authenticated workspace is required for hosted database access");
  return db.withWorkspace(workspaceId, operation);
}
