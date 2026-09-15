import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log("Starting production migration...");

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
    // 1 & 2. Create canon_characters and other missing tables (Idempotent)
    console.log("Creating new tables IF NOT EXISTS...");
    await adminDb.transaction(async (tx) => {
    
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
        "active" boolean DEFAULT true NOT NULL,
        "reserved" boolean DEFAULT false NOT NULL,
        "reserved_until" timestamp,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    await tx.execute(sql`
      ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;
      ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "summary" text;
      ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "image_url" text;
      ALTER TABLE "canon_characters" ADD COLUMN IF NOT EXISTS "affiliation" text;
    `);

    // 6. Employments and Classes tables
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "institutions" (
        "id" varchar(100) PRIMARY KEY NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "active" boolean DEFAULT true NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await tx.execute(sql`
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
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "positions" (
        "id" varchar(100) PRIMARY KEY NOT NULL,
        "department_id" varchar(100) NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "capacity" integer,
        "active" boolean DEFAULT true NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "character_employments" (
        "id" varchar(100) PRIMARY KEY NOT NULL,
        "character_id" integer NOT NULL,
        "position_id" varchar(100) NOT NULL,
        "status" varchar(50) DEFAULT 'active' NOT NULL,
        "started_at" timestamp,
        "ended_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "academic_years" (
        "id" varchar(100) PRIMARY KEY NOT NULL,
        "name" varchar(255) NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "class_groups" (
        "id" varchar(100) PRIMARY KEY NOT NULL,
        "academic_year_id" varchar(100) NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "capacity" integer NOT NULL,
        "active" boolean DEFAULT true NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "course_type" varchar(100)
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "character_enrollments" (
        "id" varchar(100) PRIMARY KEY NOT NULL,
        "character_id" integer NOT NULL,
        "class_group_id" varchar(100) NOT NULL,
        "status" varchar(50) DEFAULT 'active' NOT NULL,
        "enrolled_at" timestamp,
        "ended_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await tx.execute(sql`
      ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
      ALTER TABLE "class_groups" ADD COLUMN IF NOT EXISTS "course_type" varchar(100);
      ALTER TABLE "character_employments" ALTER COLUMN "character_id" DROP NOT NULL;
      ALTER TABLE "character_employments" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
      ALTER TABLE "character_enrollments" ALTER COLUMN "character_id" DROP NOT NULL;
      ALTER TABLE "character_enrollments" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
    `);

    // Canon-owned relations survive creation, unlinking, and deletion of their optional sheet.
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

    // 3. Add characters.canon_character_id as nullable
    console.log("Adding canon_character_id to characters if not exists...");
    await tx.execute(sql`
      ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "canon_character_id" text;
    `);

    // Add other missing constraints if they don't exist (using DO block for idempotency)
    console.log("Applying foreign keys and constraints...");
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
      END $$;
    `);

    await tx.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "character_employments_active_character_position"
        ON "character_employments" ("character_id", "position_id") WHERE "status" = 'active' AND "character_id" IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "character_employments_active_canon_position"
        ON "character_employments" ("canon_character_id", "position_id") WHERE "status" = 'active' AND "canon_character_id" IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "character_enrollments_active_character"
        ON "character_enrollments" ("character_id") WHERE "status" = 'active' AND "character_id" IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "character_enrollments_active_canon"
        ON "character_enrollments" ("canon_character_id") WHERE "status" = 'active' AND "canon_character_id" IS NOT NULL;
    `);

    // Verify duplicates before adding unique constraint
    console.log("Checking for duplicates in canon_character_id...");
    const duplicatesResult = await tx.execute(sql`
      SELECT canon_character_id, COUNT(*) as count 
      FROM characters 
      WHERE canon_character_id IS NOT NULL 
      GROUP BY canon_character_id 
      HAVING COUNT(*) > 1
    `);

    if (duplicatesResult.rows && duplicatesResult.rows.length > 0) {
      console.error("CRITICAL ERROR: Duplicate canon_character_id values found in characters table:");
      console.error(duplicatesResult.rows);
      console.error("Aborting migration to prevent data loss. Please resolve duplicates manually.");
      process.exit(1);
    }

    // 5. Add unique constraint
    console.log("Adding unique constraint characters_canon_character_id_unique...");
    await tx.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'characters_canon_character_id_unique') THEN
          ALTER TABLE "characters" ADD CONSTRAINT "characters_canon_character_id_unique" UNIQUE("canon_character_id");
        END IF;
      END $$;
    `);

    // Add Drizzle migrations table record for completeness (if you want to use drizzle-kit migrate later)
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);
    
    // Check if the record for the initial migration exists
    const mRes = await tx.execute(sql`SELECT count(*) FROM "__drizzle_migrations"`);
    if (Number(mRes.rows[0].count) === 0) {
      await tx.execute(sql`
        INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ('manual_migration_v1', extract(epoch from now()) * 1000)
      `);
    }

    console.log("Verification step: checking required tables and columns...");
    const requiredTables = [
      'canon_characters', 'institutions', 'departments', 'positions', 
      'character_employments', 'academic_years', 'class_groups', 'character_enrollments'
    ];
    for (const table of requiredTables) {
      const tableCheck = await tx.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${table}
        );
      `);
      if (!tableCheck.rows[0].exists) {
        throw new Error(`Verification failed: Table '${table}' does not exist.`);
      }
    }

    const columnCheck = await tx.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'canon_character_id'
      );
    `);
    if (!columnCheck.rows[0].exists) {
      throw new Error(`Verification failed: Column 'characters.canon_character_id' does not exist.`);
    }

      }); // End transaction

    console.log("Migration completed successfully.");
    process.exit(0);

  } catch (error) {
    console.error("Migration failed with error:", error);
    process.exit(1);
  } finally {
    await adminPool.end();
  }
}

runMigration();
