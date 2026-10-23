import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const baseConfig = {
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    if (process.env.DATABASE_URL) {
      global._postgresPool = new Pool({
        ...baseConfig,
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
    } else {
      global._postgresPool = new Pool({
        ...baseConfig,
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
      });
    }

    global._postgresPool.on('error', (err: any) => {
      // In remote / serverless environments (Cloud SQL, Cloud Run, firewalls), idle connections
      // are closed after periods of inactivity. node-postgres automatically removes the dead client
      // from the pool and establishes fresh connections on subsequent queries.
      const isIdleDisconnect =
        err?.message?.includes('Connection terminated unexpectedly') ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'EPIPE' ||
        err?.code === '57P01';

      if (isIdleDisconnect) {
        console.warn('PostgreSQL pool: idle client closed by remote host (pool will replace on demand):', err?.message || err);
        return;
      }

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
            AND table_name IN ('system_elements', 'institutions', 'departments', 'positions', 'characters', 'players', 'character_employments', 'character_techniques');
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
            // Permission restricted
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

        // Auto-provision missing positions columns
        if (
          !existingCols.has('positions.institution_id') ||
          !existingCols.has('positions.level_id') ||
          !existingCols.has('positions.risk_id') ||
          !existingCols.has('positions.bonus_yen') ||
          !existingCols.has('positions.bonus_exp') ||
          !existingCols.has('positions.min_posts') ||
          !existingCols.has('positions.requirements') ||
          !existingCols.has('positions.optional_bonuses')
        ) {
          try {
            await pool.query(`
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "level_id" varchar(100);
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "risk_id" varchar(100);
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "bonus_yen" integer DEFAULT 0 NOT NULL;
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "bonus_exp" integer DEFAULT 0 NOT NULL;
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "min_posts" integer;
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "requirements" jsonb DEFAULT '{"operator":"all","requirements":[]}'::jsonb NOT NULL;
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "optional_bonuses" jsonb DEFAULT '[]'::jsonb NOT NULL;
              ALTER TABLE "positions" ALTER COLUMN "department_id" DROP NOT NULL;
              ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "institution_id" varchar(100);
              UPDATE "positions" p SET "institution_id" = d."institution_id" FROM "departments" d WHERE p."department_id" = d."id" AND p."institution_id" IS NULL;
            `);
          } catch (e) {
            console.warn("Could not alter table positions:", e);
          }
        }

        // Auto-provision missing character_employments columns
        if (!existingCols.has('character_employments.canon_character_id') || !existingCols.has('character_employments.requirements_verified')) {
          try {
            await pool.query(`
              ALTER TABLE "character_employments" ALTER COLUMN "character_id" DROP NOT NULL;
              ALTER TABLE "character_employments" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
              ALTER TABLE "character_employments" ADD COLUMN IF NOT EXISTS "requirements_verified" boolean DEFAULT false NOT NULL;
            `);
          } catch (e) {
            console.warn("Could not alter table character_employments:", e);
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
