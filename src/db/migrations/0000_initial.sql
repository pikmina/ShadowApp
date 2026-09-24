CREATE TYPE "public"."element_kind" AS ENUM('trait', 'weakness', 'skill', 'equipment', 'weapon', 'ammunition', 'consumable', 'license', 'permission', 'certification', 'character_resource', 'attribute_upgrade', 'technique_entitlement', 'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient', 'background', 'vehicle', 'real_estate', 'clandestine_asset');--> statement-breakpoint
CREATE TYPE "public"."element_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'scheduled', 'available', 'paused', 'ended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('player', 'moderator', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."technique_source_type" AS ENUM('quirk', 'physical', 'weapon');--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_uid" text NOT NULL,
	"action_type" text NOT NULL,
	"target_id" text,
	"details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canon_characters" (
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
--> statement-breakpoint
CREATE TABLE "character_employments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"character_id" integer,
	"canon_character_id" text,
	"position_id" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"requirements_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "character_employments_exactly_one_owner" CHECK (num_nonnulls("character_employments"."character_id", "character_employments"."canon_character_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "character_enrollments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"character_id" integer,
	"canon_character_id" text,
	"class_group_id" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "character_enrollments_exactly_one_owner" CHECK (num_nonnulls("character_enrollments"."character_id", "character_enrollments"."canon_character_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "character_sheet_fields" (
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
--> statement-breakpoint
CREATE TABLE "character_techniques" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"level" integer DEFAULT 1 NOT NULL,
	"source_type" "technique_source_type" NOT NULL,
	"mechanical_behaviors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "character_techniques_level_check" CHECK ("level" >= 1 AND "level" <= 5)
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"canon_character_id" text,
	"name" text NOT NULL,
	"exp" integer DEFAULT 0 NOT NULL,
	"yen" integer DEFAULT 0 NOT NULL,
	"profile_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "characters_canon_character_id_unique" UNIQUE("canon_character_id")
);
--> statement-breakpoint
CREATE TABLE "class_groups" (
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
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"institution_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "element_possessions" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"element_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"selected_choices" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"acquired_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employment_payments" (
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
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
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
--> statement-breakpoint
CREATE TABLE "shop_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"element_id" text NOT NULL,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"prices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requirements" jsonb DEFAULT '{"operator":"all","requirements":[]}'::jsonb NOT NULL,
	"global_stock" integer,
	"per_character_limit" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_elements" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "element_kind" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"status" "element_status" DEFAULT 'draft' NOT NULL,
	"effects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mechanical_behaviors" jsonb DEFAULT '[]'::jsonb,
	"requirements" jsonb DEFAULT '{"operator":"all","requirements":[]}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_rules" (
	"key" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"role" "role" DEFAULT 'player' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "character_employments" ADD CONSTRAINT "character_employments_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_employments" ADD CONSTRAINT "character_employments_canon_character_id_canon_characters_id_fk" FOREIGN KEY ("canon_character_id") REFERENCES "public"."canon_characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_employments" ADD CONSTRAINT "character_employments_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_enrollments" ADD CONSTRAINT "character_enrollments_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_enrollments" ADD CONSTRAINT "character_enrollments_canon_character_id_canon_characters_id_fk" FOREIGN KEY ("canon_character_id") REFERENCES "public"."canon_characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_enrollments" ADD CONSTRAINT "character_enrollments_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_canon_character_id_canon_characters_id_fk" FOREIGN KEY ("canon_character_id") REFERENCES "public"."canon_characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_techniques" ADD CONSTRAINT "character_techniques_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element_possessions" ADD CONSTRAINT "element_possessions_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element_possessions" ADD CONSTRAINT "element_possessions_element_id_system_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."system_elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_offers" ADD CONSTRAINT "shop_offers_element_id_system_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."system_elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_employments_active_character_position" ON "character_employments" USING btree ("character_id","position_id") WHERE "character_employments"."status" = 'active' AND "character_employments"."character_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "character_employments_active_canon_position" ON "character_employments" USING btree ("canon_character_id","position_id") WHERE "character_employments"."status" = 'active' AND "character_employments"."canon_character_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "character_enrollments_active_character" ON "character_enrollments" USING btree ("character_id") WHERE "character_enrollments"."status" = 'active' AND "character_enrollments"."character_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "character_enrollments_active_canon" ON "character_enrollments" USING btree ("canon_character_id") WHERE "character_enrollments"."status" = 'active' AND "character_enrollments"."canon_character_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "character_sheet_fields_core_key_unique" ON "character_sheet_fields" USING btree ("core_key");--> statement-breakpoint
CREATE INDEX "character_techniques_character_id_idx" ON "character_techniques" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "element_possessions_character_id_element_id_unique" ON "element_possessions" USING btree ("character_id","element_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employment_payments_employment_period_unique" ON "employment_payments" USING btree ("employment_id","period_label");