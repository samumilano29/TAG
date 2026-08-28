/*
  # Single-IT conversion + updated game times

  Converts the TAG! game from two simultaneous IT players to exactly one IT
  player, and updates the daily game window to match the new Sledge Tag rules.

  ## 1. Game time changes
    - `competition.start_time` changed from '07:20' to '07:14'
      (tagging begins as soon as the morning bell rings).
    - `competition.end_time` changed from '14:20' to '14:25'
      (game ends at 2:20 PM + 5 additional minutes to tag).

  ## 2. Single-IT normalization
    - Deletes all `active_tags` rows with `tag_slot >= 2` so only slot 1
      remains. This safely normalizes any existing two-IT state to one IT
      without touching tag history, players, schedules, or announcements.
    - Adds a CHECK constraint on `active_tags.tag_slot` to enforce that only
      slot 1 can ever exist (tag_slot = 1). If a future migration needs to
      re-add slots, the constraint should be dropped first.

  ## 3. Safety
    - No tables are dropped or recreated.
    - No player data, schedules, tag history, or announcements are deleted.
    - Only slot 2+ active_tag rows (the now-obsolete second IT slot) are removed.
    - RLS policies are unchanged.
*/

UPDATE competition SET start_time = '07:14', end_time = '14:25';

DELETE FROM active_tags WHERE tag_slot >= 2;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'active_tags_single_slot'
  ) THEN
    ALTER TABLE active_tags ADD CONSTRAINT active_tags_single_slot CHECK (tag_slot = 1);
  END IF;
END $$;
