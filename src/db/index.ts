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
        const colCheck = await pool.query(`
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name IN ('system_elements', 'institutions', 'departments', 'positions', 'characters', 'players');
        `);

        const existingCols = new Set(
          colCheck.rows.map((r: { table_name: string; column_name: string }) => `${r.table_name}.${r.column_name}`)
        );

        hasElementIconColumns = existingCols.has('system_elements.icon_type');

        if (!existingCols.has('system_elements.icon_type')) {
          try {
            await pool.query('ALTER TABLE "system_elements" ADD COLUMN IF NOT EXISTS "icon_type" text;');
            await pool.query('ALTER TABLE "system_elements" ADD COLUMN IF NOT EXISTS "icon_value" text;');
            hasElementIconColumns = true;
          } catch {
            hasElementIconColumns = false;
          }
        }

        if (!existingCols.has('institutions.icon_type')) {
          try {
            await pool.query('ALTER TABLE "institutions" ADD COLUMN IF NOT EXISTS "icon_type" varchar(20);');
            await pool.query('ALTER TABLE "institutions" ADD COLUMN IF NOT EXISTS "icon_value" varchar(255);');
          } catch {
            // Permission restricted (e.g. non-owner database user)
          }
        }

        if (!existingCols.has('departments.default_level_id')) {
          try {
            await pool.query('ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "default_level_id" varchar(100);');
            await pool.query('ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "default_risk_id" varchar(100);');
          } catch {
            // Permission restricted
          }
        }

        if (!existingCols.has('positions.min_posts')) {
          try {
            await pool.query('ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "min_posts" integer;');
          } catch {
            // Permission restricted
          }
        }

        if (!existingCols.has('players.id')) {
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
          } catch {
            // Table exists or permission restricted
          }
        }

        if (!existingCols.has('characters.player_id')) {
          try {
            await pool.query('ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "player_id" integer;');
          } catch {}
        }
        if (!existingCols.has('characters.active')) {
          try {
            await pool.query('ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;');
          } catch {}
        }
        if (!existingCols.has('characters.canon_character_id')) {
          try {
            await pool.query('ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "canon_character_id" text;');
          } catch {}
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
