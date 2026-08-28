/*
  # Player schedules for the TAG! game

  Adds a `player_schedules` table so each player can record which building/area
  they are normally in during each of the 7 class periods. This is used by the
  roster tap-to-view-schedule feature and the first-time onboarding flow.

  ## 1. New Table
    - `player_schedules`
        player_id        uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE
        period1          text  — location during period 1
        period2          text  — location during period 2
        period3          text  — location during period 3
        period4          text  — location during period 4
        period5_type     text  — either '5A' or '5B' (CHECK constraint)
        period5          text  — location during period 5 (5A or 5B)
        period6          text  — location during period 6
        period7          text  — location during period 7
        schedule_completed boolean NOT NULL DEFAULT false
        updated_at       timestamptz NOT NULL DEFAULT now()

  ## 2. Security
    - RLS enabled on `player_schedules`.
    - anon + authenticated get SELECT (read-only) so the app and Supabase
      Realtime can read schedules with the public anon key.
    - No write policies for anon: ALL mutations go through the `game` edge
      function using the service role, which bypasses RLS. This matches the
      existing pattern used by every other table in this schema.

  ## 3. Realtime
    - `player_schedules` is added to the supabase_realtime publication with
      REPLICA IDENTITY FULL so clients receive live updates when a player
      edits their schedule.

  ## 4. Notes
    - One row per player (player_id is the primary key).
    - Existing players have no schedule row yet — the frontend treats a
      missing row as schedule_completed = false and shows onboarding.
    - No existing tables are modified or deleted.
*/

CREATE TABLE IF NOT EXISTS player_schedules (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  period1 text NOT NULL DEFAULT '',
  period2 text NOT NULL DEFAULT '',
  period3 text NOT NULL DEFAULT '',
  period4 text NOT NULL DEFAULT '',
  period5_type text NOT NULL DEFAULT '5A',
  period5 text NOT NULL DEFAULT '',
  period6 text NOT NULL DEFAULT '',
  period7 text NOT NULL DEFAULT '',
  schedule_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT period5_type_check CHECK (period5_type IN ('5A', '5B'))
);

ALTER TABLE player_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_player_schedules" ON player_schedules;
CREATE POLICY "read_player_schedules" ON player_schedules FOR SELECT
  TO anon, authenticated USING (true);

ALTER TABLE player_schedules REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'player_schedules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE player_schedules;
  END IF;
END $$;
