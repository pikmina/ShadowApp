DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'technique_classification') THEN
    CREATE TYPE "technique_classification" AS ENUM('offensive', 'support', 'defensive', 'control');
  END IF;
END $$;

ALTER TABLE "character_techniques" ADD COLUMN IF NOT EXISTS "classification" "technique_classification";
