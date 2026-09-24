import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

export async function runMigration() {
  console.log("Starting database migration...");

  // Create admin pool specifically for DDL
  let adminPool;
  if (process.env.DATABASE_URL) {
    adminPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  } else {
    adminPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
      password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
    });
  }
  
  const adminDb = drizzle(adminPool);

  try {
    // 1. Identify Target Database safely without leaking credentials
    const targetInfo = await adminPool.query(
      'SELECT current_database() as db_name, current_user as db_user, version() as db_version'
    );
    const dbName = targetInfo.rows[0]?.db_name || 'unknown';
    const dbUser = targetInfo.rows[0]?.db_user || 'unknown';
    console.log(`Connected to target database: "${dbName}" as user: "${dbUser}"`);

    // 2. Inspect Existing Tables and Types in public schema
    const tablesResult = await adminPool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const existingTables = new Set(tablesResult.rows.map((r: { table_name: string }) => r.table_name));
    console.log(`Existing tables found in public schema (${existingTables.size}):`, Array.from(existingTables));

    const coreExpectedTables = [
      'users', 'characters', 'system_rules', 'system_elements', 'shop_offers',
      'element_possessions', 'audit_logs', 'canon_characters', 'institutions',
      'departments', 'positions', 'character_employments', 'employment_payments',
      'academic_years', 'class_groups', 'character_enrollments', 'character_sheet_fields',
      'character_techniques'
    ];

    const legacyBaseTables = ['users', 'characters', 'system_rules', 'system_elements'];

    // CASE A: Truly Empty Database
    if (existingTables.size === 0) {
      console.log("Database is completely empty. Executing full transactional initial installation from 0000_initial.sql...");
      const initialSqlPath = path.resolve(process.cwd(), 'src/db/migrations/0000_initial.sql');
      if (!fs.existsSync(initialSqlPath)) {
        throw new Error(`Initial migration file not found at: ${initialSqlPath}`);
      }

      const initialSqlContent = fs.readFileSync(initialSqlPath, 'utf-8');
      const statements = initialSqlContent
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await adminDb.transaction(async (tx) => {
        for (const statement of statements) {
          await tx.execute(sql.raw(statement));
        }

        // Register initial migration in __drizzle_migrations
        await tx.execute(sql`
          CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
          );
        `);

        await tx.execute(sql`
          INSERT INTO "__drizzle_migrations" (hash, created_at)
          VALUES ('0000_initial', extract(epoch from now()) * 1000);
        `);
      });

      console.log("Initial transactional installation completed successfully.");
    }
    // CASE B: Existing Database with standard baseline tables
    else if (legacyBaseTables.every(t => existingTables.has(t))) {
      console.log("Existing database detected with baseline tables. Running safe incremental migrations...");

      // Ensure all enum types exist, creating them if missing (outside transaction block for ALTER TYPE safety)
      await adminPool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'element_kind') THEN
            CREATE TYPE "element_kind" AS ENUM(
              'trait', 'weakness', 'skill', 'equipment', 'weapon', 
              'ammunition', 'consumable', 'license', 'permission', 'certification',
              'character_resource', 'attribute_upgrade', 'technique_entitlement', 
              'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient',
              'background', 'vehicle', 'real_estate', 'clandestine_asset'
            );
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
            CREATE TYPE "role" AS ENUM('player', 'moderator', 'superadmin');
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'element_status') THEN
            CREATE TYPE "element_status" AS ENUM('draft', 'published', 'archived');
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
            CREATE TYPE "offer_status" AS ENUM('draft', 'scheduled', 'available', 'paused', 'ended', 'archived');
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'technique_source_type') THEN
            CREATE TYPE "technique_source_type" AS ENUM('quirk', 'physical', 'weapon');
          END IF;
        END $$;
      `);

      // Safely add missing enum values if enums already existed with fewer values
      const existingEnumsRes = await adminPool.query(`
        SELECT t.typname, e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid;
      `);
      const existingEnumMap = new Map<string, Set<string>>();
      for (const row of existingEnumsRes.rows) {
        if (!existingEnumMap.has(row.typname)) {
          existingEnumMap.set(row.typname, new Set());
        }
        existingEnumMap.get(row.typname)!.add(row.enumlabel);
      }

      const expectedEnums: Record<string, string[]> = {
        element_kind: [
          'trait', 'weakness', 'skill', 'equipment', 'weapon', 
          'ammunition', 'consumable', 'license', 'permission', 'certification',
          'character_resource', 'attribute_upgrade', 'technique_entitlement', 
          'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient',
          'background', 'vehicle', 'real_estate', 'clandestine_asset'
        ],
        role: ['player', 'moderator', 'superadmin'],
        element_status: ['draft', 'published', 'archived'],
        offer_status: ['draft', 'scheduled', 'available', 'paused', 'ended', 'archived'],
        technique_source_type: ['quirk', 'physical', 'weapon'],
      };

      for (const [typname, values] of Object.entries(expectedEnums)) {
        const existingValues = existingEnumMap.get(typname) || new Set();
        for (const val of values) {
          if (!existingValues.has(val)) {
            await adminPool.query(`ALTER TYPE "${typname}" ADD VALUE '${val}';`);
          }
        }
      }

      await adminDb.transaction(async (tx) => {
        // Create missing tables idempotently
        await tx.execute(sql`
          CREATE TABLE IF NOT EXISTS "canon_characters" (
            "id" text PRIMARY KEY NOT NULL,
            "name" text NOT NULL,
            "first_name" text,
            "last_name" text,
            "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
            "summary" text,
            "image_url" text,
            "affiliation" text,
            "profile_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
            "active" boolean DEFAULT true NOT NULL,
            "reserved" boolean DEFAULT false NOT NULL,
            "reserved_until" timestamp,
            "sort_order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now(),
            "updated_at" timestamp DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS "character_sheet_fields" (
            "id" text PRIMARY KEY NOT NULL,
            "core_key" text,
            "name" text NOT NULL,
            "type" text NOT NULL,
            "category" text NOT NULL,
            "options" jsonb DEFAULT '[]'::jsonb,
            "order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now(),
            "updated_at" timestamp DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS "institutions" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "name" varchar(255) NOT NULL,
            "description" text,
            "active" boolean DEFAULT true NOT NULL,
            "sort_order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "departments" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "institution_id" varchar(100) NOT NULL,
            "name" varchar(255) NOT NULL,
            "description" text,
            "active" boolean DEFAULT true NOT NULL,
            "sort_order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "positions" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "department_id" varchar(100) NOT NULL,
            "name" varchar(255) NOT NULL,
            "description" text,
            "capacity" integer,
            "level_id" varchar(100),
            "risk_id" varchar(100),
            "bonus_yen" integer DEFAULT 0 NOT NULL,
            "bonus_exp" integer DEFAULT 0 NOT NULL,
            "min_posts" integer,
            "requirements" jsonb DEFAULT '{"operator":"all","requirements":[]}'::jsonb NOT NULL,
            "optional_bonuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
            "active" boolean DEFAULT true NOT NULL,
            "sort_order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "character_employments" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "character_id" integer,
            "canon_character_id" text,
            "position_id" varchar(100) NOT NULL,
            "status" varchar(50) DEFAULT 'active' NOT NULL,
            "started_at" timestamp,
            "ended_at" timestamp,
            "requirements_verified" boolean DEFAULT false NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "academic_years" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "name" varchar(255) NOT NULL,
            "sort_order" integer DEFAULT 0 NOT NULL,
            "active" boolean DEFAULT true NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "class_groups" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "academic_year_id" varchar(100) NOT NULL,
            "name" varchar(255) NOT NULL,
            "description" text,
            "course_type" varchar(100),
            "capacity" integer NOT NULL,
            "active" boolean DEFAULT true NOT NULL,
            "sort_order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "character_enrollments" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "character_id" integer,
            "canon_character_id" text,
            "class_group_id" varchar(100) NOT NULL,
            "status" varchar(50) DEFAULT 'active' NOT NULL,
            "enrolled_at" timestamp,
            "ended_at" timestamp,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "character_techniques" (
            "id" text PRIMARY KEY NOT NULL,
            "character_id" integer NOT NULL,
            "name" text NOT NULL,
            "description" text DEFAULT '',
            "level" integer DEFAULT 1 NOT NULL,
            "source_type" "technique_source_type" NOT NULL,
            "mechanical_behaviors" jsonb DEFAULT '[]'::jsonb NOT NULL,
            "revision" integer DEFAULT 1 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "employment_payments" (
            "id" varchar(100) PRIMARY KEY NOT NULL,
            "batch_id" varchar(100) NOT NULL,
            "employment_id" varchar(100) NOT NULL,
            "character_id" integer NOT NULL,
            "position_id" varchar(100) NOT NULL,
            "character_name" varchar(255) NOT NULL,
            "position_name" varchar(255) NOT NULL,
            "period_label" varchar(100) NOT NULL,
            "posts_observed" integer NOT NULL,
            "minimum_posts_approved" boolean NOT NULL,
            "breakdown" jsonb NOT NULL,
            "total_yen" integer NOT NULL,
            "total_exp" integer NOT NULL,
            "notes" text,
            "moderator_uid" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL
          );
        `);

        // Add missing columns to existing tables
        await tx.execute(sql`
          ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;
          ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "summary" text;
          ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "image_url" text;
          ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "affiliation" text;
          ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "profile_data" jsonb DEFAULT '{}'::jsonb NOT NULL;
          ALTER TABLE "character_sheet_fields" ADD COLUMN IF NOT EXISTS "core_key" text;
          CREATE UNIQUE INDEX IF NOT EXISTS "character_sheet_fields_core_key_unique" ON "character_sheet_fields" ("core_key");
          ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text;
          ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
          ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
          ALTER TABLE "system_elements" ADD COLUMN IF NOT EXISTS "mechanical_behaviors" jsonb DEFAULT '[]'::jsonb;
          ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
          ALTER TABLE "class_groups" ADD COLUMN IF NOT EXISTS "course_type" varchar(100);
          ALTER TABLE "character_employments" ALTER COLUMN "character_id" DROP NOT NULL;
          ALTER TABLE "character_employments" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
          ALTER TABLE "character_employments" ADD COLUMN IF NOT EXISTS "requirements_verified" boolean DEFAULT false NOT NULL;
          ALTER TABLE "character_enrollments" ALTER COLUMN "character_id" DROP NOT NULL;
          ALTER TABLE "character_enrollments" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
          ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "level_id" varchar(100);
          ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "risk_id" varchar(100);
          ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "bonus_yen" integer DEFAULT 0 NOT NULL;
          ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "bonus_exp" integer DEFAULT 0 NOT NULL;
          ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "min_posts" integer;
          ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "requirements" jsonb DEFAULT '{"operator":"all","requirements":[]}'::jsonb NOT NULL;
          ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "optional_bonuses" jsonb DEFAULT '[]'::jsonb NOT NULL;
          ALTER TABLE "shop_offers" ADD COLUMN IF NOT EXISTS "requirements" jsonb DEFAULT '{"operator":"all","requirements":[]}'::jsonb NOT NULL;
          ALTER TABLE "character_techniques" ADD COLUMN IF NOT EXISTS "activation_attribute_id" text;
        `);

        // Preserve canon-owned relations
        await tx.execute(sql`
          UPDATE "character_employments" employment
          SET "canon_character_id" = character."canon_character_id", "character_id" = NULL
          FROM "characters" character
          WHERE employment."character_id" = character."id" AND character."canon_character_id" IS NOT NULL;

          UPDATE "character_enrollments" enrollment
          SET "canon_character_id" = character."canon_character_id", "character_id" = NULL
          FROM "characters" character
          WHERE enrollment."character_id" = character."id" AND character."canon_character_id" IS NOT NULL;
        `);

        // Foreign keys and check constraints
        await tx.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'characters_canon_character_id_canon_characters_id_fk') THEN
              ALTER TABLE "characters" ADD CONSTRAINT "characters_canon_character_id_canon_characters_id_fk" FOREIGN KEY ("canon_character_id") REFERENCES "public"."canon_characters"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_institution_id_institutions_id_fk') THEN
              ALTER TABLE "departments" ADD CONSTRAINT "departments_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'positions_department_id_departments_id_fk') THEN
              ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_employments_character_id_characters_id_fk') THEN
              ALTER TABLE "character_employments" ADD CONSTRAINT "character_employments_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_employments_position_id_positions_id_fk') THEN
              ALTER TABLE "character_employments" ADD CONSTRAINT "character_employments_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_employments_canon_character_id_canon_characters_id_fk') THEN
              ALTER TABLE "character_employments" ADD CONSTRAINT "character_employments_canon_character_id_canon_characters_id_fk" FOREIGN KEY ("canon_character_id") REFERENCES "public"."canon_characters"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_employments_exactly_one_owner') THEN
              ALTER TABLE "character_employments" ADD CONSTRAINT "character_employments_exactly_one_owner" CHECK (num_nonnulls("character_id", "canon_character_id") = 1);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_groups_academic_year_id_academic_years_id_fk') THEN
              ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_enrollments_character_id_characters_id_fk') THEN
              ALTER TABLE "character_enrollments" ADD CONSTRAINT "character_enrollments_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_enrollments_class_group_id_class_groups_id_fk') THEN
              ALTER TABLE "character_enrollments" ADD CONSTRAINT "character_enrollments_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_enrollments_canon_character_id_canon_characters_id_fk') THEN
              ALTER TABLE "character_enrollments" ADD CONSTRAINT "character_enrollments_canon_character_id_canon_characters_id_fk" FOREIGN KEY ("canon_character_id") REFERENCES "public"."canon_characters"("id") ON DELETE restrict ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_enrollments_exactly_one_owner') THEN
              ALTER TABLE "character_enrollments" ADD CONSTRAINT "character_enrollments_exactly_one_owner" CHECK (num_nonnulls("character_id", "canon_character_id") = 1);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_techniques_character_id_characters_id_fk') THEN
              ALTER TABLE "character_techniques" ADD CONSTRAINT "character_techniques_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_techniques_level_check') THEN
              ALTER TABLE "character_techniques" ADD CONSTRAINT "character_techniques_level_check" CHECK ("level" >= 1 AND "level" <= 5);
            END IF;
          END $$;
        `);

        // Partial unique indexes and entity indexes
        await tx.execute(sql`
          CREATE INDEX IF NOT EXISTS "character_techniques_character_id_idx"
            ON "character_techniques" ("character_id");
          CREATE UNIQUE INDEX IF NOT EXISTS "character_employments_active_character_position"
            ON "character_employments" ("character_id", "position_id") WHERE "status" = 'active' AND "character_id" IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS "character_employments_active_canon_position"
            ON "character_employments" ("canon_character_id", "position_id") WHERE "status" = 'active' AND "canon_character_id" IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS "character_enrollments_active_character"
            ON "character_enrollments" ("character_id") WHERE "status" = 'active' AND "character_id" IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS "character_enrollments_active_canon"
            ON "character_enrollments" ("canon_character_id") WHERE "status" = 'active' AND "canon_character_id" IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS "employment_payments_employment_period_unique"
            ON "employment_payments" ("employment_id", "period_label");
        `);

        // Check for duplicates before adding unique constraint on canon_character_id
        const duplicatesResult = await tx.execute(sql`
          SELECT canon_character_id, COUNT(*) as count 
          FROM characters 
          WHERE canon_character_id IS NOT NULL 
          GROUP BY canon_character_id 
          HAVING COUNT(*) > 1
        `);

        if (duplicatesResult.rows && duplicatesResult.rows.length > 0) {
          throw new Error("CRITICAL ERROR: Duplicate canon_character_id values found in characters table. Aborting migration.");
        }

        await tx.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'characters_canon_character_id_unique') THEN
              ALTER TABLE "characters" ADD CONSTRAINT "characters_canon_character_id_unique" UNIQUE("canon_character_id");
            END IF;
          END $$;
        `);

        // Register in __drizzle_migrations if table exists or create it
        await tx.execute(sql`
          CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
          );
        `);

        const mRes = await tx.execute(sql`SELECT count(*) FROM "__drizzle_migrations"`);
        if (Number(mRes.rows[0].count) === 0) {
          await tx.execute(sql`
            INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ('0000_initial', extract(epoch from now()) * 1000)
          `);
        }
      });

      console.log("Incremental migration completed successfully.");
    }
    // CASE C: Partial / Corrupt schema
    else {
      const missingBase = legacyBaseTables.filter(t => !existingTables.has(t));
      const present = Array.from(existingTables);
      const errorMsg = `DIAGNOSTIC FAILURE: Partial schema detected. Present tables: [${present.join(', ')}], Missing base tables: [${missingBase.join(', ')}]. Aborting to prevent data corruption. Manual resolution required.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Verification Step: Confirm all required core tables exist
    console.log("Verifying core schema integrity...");
    for (const table of coreExpectedTables) {
      const tableCheck = await adminPool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`,
        [table]
      );
      if (!tableCheck.rows[0].exists) {
        throw new Error(`Verification failed: Table '${table}' does not exist.`);
      }
    }

    const columnCheck = await adminPool.query(
      `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'canon_character_id') as exists`
    );
    if (!columnCheck.rows[0].exists) {
      throw new Error(`Verification failed: Column 'characters.canon_character_id' does not exist.`);
    }

    console.log("All schema verifications passed successfully.");
    return true;

  } catch (error) {
    console.error("Migration failed with error:", error);
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Auto-run when executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''))) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

