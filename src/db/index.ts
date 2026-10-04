import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    if (process.env.DATABASE_URL) {
      global._postgresPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export let hasElementIconColumns = true;

let ensureColsPromise: Promise<void> | null = null;
export async function ensureSystemSchemaColumns() {
  if (!ensureColsPromise) {
    ensureColsPromise = (async () => {
      try {
        const check = await pool.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'system_elements' AND column_name = 'icon_type'
          LIMIT 1;
        `);
        if (check.rows.length === 0) {
          hasElementIconColumns = false;
          try {
            await pool.query('ALTER TABLE "system_elements" ADD COLUMN IF NOT EXISTS "icon_type" text;');
            await pool.query('ALTER TABLE "system_elements" ADD COLUMN IF NOT EXISTS "icon_value" text;');
            hasElementIconColumns = true;
          } catch {
            // Alter permission not granted; legacy fallback projection will be used
            hasElementIconColumns = false;
          }
        } else {
          hasElementIconColumns = true;
        }

        // Safely attempt to ensure players and character extension columns
        try {
          await pool.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_status') THEN
                CREATE TYPE "player_status" AS ENUM('active', 'absent', 'inactive');
              END IF;
            END $$;
          `);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS "players" (
              "id" serial PRIMARY KEY NOT NULL,
              "name" text NOT NULL,
              "status" "player_status" DEFAULT 'active' NOT NULL,
              "user_id" integer,
              "identity" text,
              "discord" text,
              "notes" text,
              "created_at" timestamp DEFAULT now(),
              "updated_at" timestamp DEFAULT now()
            );
          `);
          await pool.query('ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "player_id" integer;');
          await pool.query('ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;');
          await pool.query('ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "canon_character_id" text;');
        } catch {
          // Schema additions skipped if user lacks DDL permissions
        }
      } catch {
        // Safe check
      }
    })();
  }
  return ensureColsPromise;
}

// Automatically provision schema columns when pool initializes
void ensureSystemSchemaColumns();

export const db = drizzle(pool, { schema });
