/*
  # Allow safe player deletion

  Changes foreign-key constraints so a player can be deleted without
  destroying tag history or causing FK violations.

  ## Changes
    - `tags.tagger_id`        NO ACTION → SET NULL (preserve tag record, null out the tagger reference)
    - `tags.tagged_player_id` NO ACTION → SET NULL (preserve tag record, null out the tagged reference)
    - `daily_games.eliminated_player_id` NO ACTION → SET NULL (preserve game record, null out the eliminated reference)
    - `active_tags.current_it_player_id` NO ACTION → SET NULL (so deleting a non-IT player doesn't fail; IT deletion is blocked in app logic)

  `player_schedules.player_id` already CASCADEs, so schedule data is removed automatically.

  No data is lost. Tag history rows remain; only the player-id columns become NULL
  for the deleted player's rows.
*/

-- Drop and recreate the tags → players FK for tagger_id
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_tagger_id_fkey;
ALTER TABLE tags
  ADD CONSTRAINT tags_tagger_id_fkey
  FOREIGN KEY (tagger_id) REFERENCES players(id) ON DELETE SET NULL;

-- Drop and recreate the tags → players FK for tagged_player_id
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_tagged_player_id_fkey;
ALTER TABLE tags
  ADD CONSTRAINT tags_tagged_player_id_fkey
  FOREIGN KEY (tagged_player_id) REFERENCES players(id) ON DELETE SET NULL;

-- Drop and recreate the daily_games → players FK for eliminated_player_id
ALTER TABLE daily_games DROP CONSTRAINT IF EXISTS daily_games_eliminated_player_id_fkey;
ALTER TABLE daily_games
  ADD CONSTRAINT daily_games_eliminated_player_id_fkey
  FOREIGN KEY (eliminated_player_id) REFERENCES players(id) ON DELETE SET NULL;

-- Drop and recreate the active_tags → players FK for current_it_player_id
ALTER TABLE active_tags DROP CONSTRAINT IF EXISTS active_tags_current_it_player_id_fkey;
ALTER TABLE active_tags
  ADD CONSTRAINT active_tags_current_it_player_id_fkey
  FOREIGN KEY (current_it_player_id) REFERENCES players(id) ON DELETE SET NULL;
