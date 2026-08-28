/*
# Add elimination audit columns and untagged bonus tracking

1. Modified Tables
- `players`: add `eliminated_by` (uuid, nullable) and `elimination_reason` (text, nullable)
  to track who eliminated a player and why, without deleting any data.
- `player_xp_events`: add `untagged_bonus_date` (date, nullable) to make the daily
  untagged bonus idempotent — the unique constraint prevents duplicate +50 awards
  for the same player on the same date.

2. Security
- No RLS policy changes needed; existing policies on both tables already cover
  the new columns (they are nullable and set only by the service role / edge function).
*/

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS eliminated_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS elimination_reason text DEFAULT NULL;

ALTER TABLE player_xp_events
  ADD COLUMN IF NOT EXISTS untagged_bonus_date date DEFAULT NULL;

-- Idempotent unique constraint: one untagged bonus per player per date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_xp_events_untagged_bonus_unique'
  ) THEN
    CREATE UNIQUE INDEX player_xp_events_untagged_bonus_unique
      ON player_xp_events (player_id, untagged_bonus_date)
      WHERE untagged_bonus_date IS NOT NULL;
  END IF;
END $$;
