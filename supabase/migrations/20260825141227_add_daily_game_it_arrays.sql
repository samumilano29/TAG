/*
  # Record starting and final IT players per day

  Adds two array columns to `daily_games` so the Days history can show who
  started IT and who finished IT each day without parsing announcement text.

  ## Changes
    - `daily_games.starting_it_ids` (uuid[]) — the two players who began the
      day as IT (empty on the final day).
    - `daily_games.final_it_ids` (uuid[]) — the two players holding the tags
      when the day ended.

  Both default to an empty array. Existing rows are backfilled to empty.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_games' AND column_name = 'starting_it_ids'
  ) THEN
    ALTER TABLE daily_games ADD COLUMN starting_it_ids uuid[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_games' AND column_name = 'final_it_ids'
  ) THEN
    ALTER TABLE daily_games ADD COLUMN final_it_ids uuid[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
