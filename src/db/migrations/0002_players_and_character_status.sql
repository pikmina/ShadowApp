DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_status') THEN
    CREATE TYPE "player_status" AS ENUM('active', 'absent', 'inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "players" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "status" "player_status" DEFAULT 'active' NOT NULL,
  "user_id" integer,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_user_id_users_id_fk') THEN
    ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "player_id" integer;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
ALTER TABLE "characters" ALTER COLUMN "user_id" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'characters_player_id_players_id_fk') THEN
    ALTER TABLE "characters" ADD CONSTRAINT "characters_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
