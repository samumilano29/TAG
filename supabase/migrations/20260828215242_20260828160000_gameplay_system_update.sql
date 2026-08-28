/*
# Gameplay System Update — Eliminations, Admin Revives, Manual Tags, Untouched Bonus

## Summary
This migration adds the database structures needed for:
1. Tying admin authorization to Chucho's player account (not just the shared PIN).
2. Tracking who eliminated a player and why (elimination audit trail).
3. Admin-recorded manual tags with 50% XP penalty for late registration.
4. Admin-controlled revive duels (replacing player-controlled revive requests).
5. Daily "Untouched Bonus" (+50 XP for surviving a full game day without being tagged).

## New Columns

### `competition` table
- `admin_player_id` (uuid, nullable) — links to the player who is the sole admin (Chucho).
  When set, admin actions require both the correct PIN AND that the requesting
  player's ID matches this value. This prevents anyone who isn't Chucho from
  accessing admin controls even if they know the PIN.

### `players` table
- `eliminated_by` (uuid, nullable) — the player who caused this elimination
  (e.g. the IT who tagged them, or the admin if manually eliminated).
- `elimination_reason` (text, nullable) — why the player was eliminated
  (e.g. "end_of_day_it", "admin_elimination", "final_day_loser").

### `tags` table
- `admin_recorded` (boolean, default false) — true when this tag was manually
  entered by the admin rather than registered live by the players.
- `admin_player_id` (uuid, nullable) — which admin entered the manual tag.
- `actual_tag_time` (timestamptz, nullable) — the real-world time the tag
  actually happened, as reported by the admin (may differ from `created_at`
  which is when the record was inserted).
- `late_penalty` (boolean, default false) — true when the 50% XP penalty
  was applied because the tag was not registered live.
- `manual_note` (text, nullable) — optional reason/note from the admin.

### `revives` table
- `admin_player_id` (uuid, nullable) — which admin recorded the revive duel.
- `notes` (text, nullable) — optional notes about the duel.

### `daily_games` table
- `untouched_bonus_awarded` (boolean, default false) — whether the +50 XP
  untouched bonus has been processed for this daily game. Prevents duplicate
  awards when end-of-day logic runs more than once.

### `player_xp_events` table
- `related_daily_game_id` (uuid, nullable) — links XP events to a specific
  daily game (used for the untouched bonus and survival XP).

## Security
- No new tables created.
- No RLS policy changes (the edge function uses the service role key which
  bypasses RLS; admin authorization is enforced in the edge function logic).
- The `admin_player_id` column on `competition` is the server-side anchor for
  admin authorization — the edge function checks that the requesting player
  matches this ID before performing admin actions.

## Idempotency
All column additions use `IF NOT EXISTS` checks via DO $$ blocks.
The migration is safe to re-run.
*/

-- Add admin_player_id to competition
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competition'
    AND column_name = 'admin_player_id'
  ) THEN
    ALTER TABLE competition ADD COLUMN admin_player_id uuid;
  END IF;
END $$;

-- Set admin_player_id to Chucho's player ID
UPDATE competition SET admin_player_id = '386bd983-51a1-4853-ac83-43584c228982'
WHERE admin_player_id IS NULL;

-- Add eliminated_by and elimination_reason to players
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players'
    AND column_name = 'eliminated_by'
  ) THEN
    ALTER TABLE players ADD COLUMN eliminated_by uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players'
    AND column_name = 'elimination_reason'
  ) THEN
    ALTER TABLE players ADD COLUMN elimination_reason text;
  END IF;
END $$;

-- Add admin tag columns to tags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags'
    AND column_name = 'admin_recorded'
  ) THEN
    ALTER TABLE tags ADD COLUMN admin_recorded boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags'
    AND column_name = 'admin_player_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN admin_player_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags'
    AND column_name = 'actual_tag_time'
  ) THEN
    ALTER TABLE tags ADD COLUMN actual_tag_time timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags'
    AND column_name = 'late_penalty'
  ) THEN
    ALTER TABLE tags ADD COLUMN late_penalty boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags'
    AND column_name = 'manual_note'
  ) THEN
    ALTER TABLE tags ADD COLUMN manual_note text;
  END IF;
END $$;

-- Add admin columns to revives
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revives'
    AND column_name = 'admin_player_id'
  ) THEN
    ALTER TABLE revives ADD COLUMN admin_player_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revives'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE revives ADD COLUMN notes text;
  END IF;
END $$;

-- Add untouched_bonus_awarded to daily_games
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_games'
    AND column_name = 'untouched_bonus_awarded'
  ) THEN
    ALTER TABLE daily_games ADD COLUMN untouched_bonus_awarded boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add related_daily_game_id to player_xp_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'player_xp_events'
    AND column_name = 'related_daily_game_id'
  ) THEN
    ALTER TABLE player_xp_events ADD COLUMN related_daily_game_id uuid;
  END IF;
END $$;

-- Seed the "Gameplay System Update" post idempotently
INSERT INTO app_updates (title_en, title_es, description_en, description_es, category, published)
SELECT
  'Gameplay System Update',
  'Actualización del sistema de juego',
  'Eliminated players now remain in the app and keep all of their progress while staying out of active gameplay. Revives are managed by the admin, forgotten tags can be added later with a 50% XP penalty, and players who survive an entire game day without being tagged earn a +50 XP bonus.',
  'Los jugadores eliminados ahora permanecen en la app y conservan todo su progreso aunque queden fuera del juego activo. Los revives son manejados por el admin, los tags olvidados pueden agregarse después con una penalización del 50% de XP y los jugadores que pasen todo el día sin ser tageados reciben un bonus de +50 XP.',
  'new_feature',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM app_updates WHERE title_en = 'Gameplay System Update'
);