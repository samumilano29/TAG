-- Add grade and rank columns to the players table.
-- Existing players get 'Unranked' rank and NULL grade (to be filled by admin).

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS grade text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rank text NOT NULL DEFAULT 'Unranked';

-- Normalize any NULL ranks to 'Unranked' (shouldn't be any, but just in case).
UPDATE players SET rank = 'Unranked' WHERE rank IS NULL OR rank = '';

-- Add a CHECK constraint to enforce valid rank values.
ALTER TABLE players
  ADD CONSTRAINT players_rank_check
  CHECK (rank IN ('Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum'));
