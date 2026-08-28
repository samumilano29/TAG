/*
  # TAG! multi-day competition schema

  Creates the full backend for the TAG! schoolyard game: a multi-day
  elimination competition with two simultaneous "IT" tags, device-based
  player identity (no email accounts), realtime announcements, and a
  server-authoritative daily schedule (7:20 AM start, 2:20 PM end).

  ## 1. New Tables
    - `competition`   Single ongoing competition. Holds timezone, daily
                      start/end times, current day counter, status
                      (active | paused | finished) and an admin pin.
    - `players`       The 14 players. status = active | eliminated, plus
                      elimination day/time and the device that claimed them.
    - `daily_games`   One row per school day. Tracks day number, local date,
                      status (running | ended | final_pending | final_done),
                      start/end timestamps, the eliminated player and a
                      final-day flag.
    - `active_tags`   Exactly two rows per running day (tag_slot 1 and 2),
                      each pointing at the player currently IT in that slot.
    - `tags`          Every tag attempt: which slot, tagger, tagged player,
                      status (pending | confirmed | rejected | undone) and
                      timestamps.
    - `announcements` Broadcast messages shown live on every device.

  ## 2. Security
    - RLS enabled on every table.
    - anon + authenticated get SELECT (read-only) so the app and Supabase
      Realtime can read game state with the public anon key.
    - No write policies for anon: ALL mutations go through the `game` edge
      function using the service role, which bypasses RLS. This keeps the
      random elimination and schedule server-authoritative and tamper-proof.

  ## 3. Realtime
    - competition, players, daily_games, active_tags, tags and announcements
      are added to the supabase_realtime publication with REPLICA IDENTITY
      FULL so clients receive live updates.

  ## 4. Seed data
    - One competition row (TAG!) and the 14 named players (all active).
*/

CREATE TABLE IF NOT EXISTS competition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'TAG!',
  timezone text NOT NULL DEFAULT 'America/New_York',
  start_time text NOT NULL DEFAULT '07:20',
  end_time text NOT NULL DEFAULT '14:20',
  current_day integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  admin_pin text NOT NULL DEFAULT '2200',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  eliminated_day integer,
  eliminated_at timestamptz,
  claimed_device_id text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  date text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  is_final boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  ended_at timestamptz,
  eliminated_player_id uuid REFERENCES players(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, date)
);

CREATE TABLE IF NOT EXISTS active_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_game_id uuid NOT NULL REFERENCES daily_games(id) ON DELETE CASCADE,
  current_it_player_id uuid NOT NULL REFERENCES players(id),
  tag_slot integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_game_id, tag_slot)
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_game_id uuid NOT NULL REFERENCES daily_games(id) ON DELETE CASCADE,
  tag_slot integer NOT NULL,
  tagger_id uuid NOT NULL REFERENCES players(id),
  tagged_player_id uuid NOT NULL REFERENCES players(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
  daily_game_id uuid REFERENCES daily_games(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_games_competition ON daily_games(competition_id);
CREATE INDEX IF NOT EXISTS idx_active_tags_game ON active_tags(daily_game_id);
CREATE INDEX IF NOT EXISTS idx_tags_game ON tags(daily_game_id);
CREATE INDEX IF NOT EXISTS idx_tags_tagged ON tags(tagged_player_id);
CREATE INDEX IF NOT EXISTS idx_announcements_competition ON announcements(competition_id);

ALTER TABLE competition ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_competition" ON competition;
CREATE POLICY "read_competition" ON competition FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "read_players" ON players;
CREATE POLICY "read_players" ON players FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "read_daily_games" ON daily_games;
CREATE POLICY "read_daily_games" ON daily_games FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "read_active_tags" ON active_tags;
CREATE POLICY "read_active_tags" ON active_tags FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "read_tags" ON tags;
CREATE POLICY "read_tags" ON tags FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "read_announcements" ON announcements;
CREATE POLICY "read_announcements" ON announcements FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE competition REPLICA IDENTITY FULL;
ALTER TABLE players REPLICA IDENTITY FULL;
ALTER TABLE daily_games REPLICA IDENTITY FULL;
ALTER TABLE active_tags REPLICA IDENTITY FULL;
ALTER TABLE tags REPLICA IDENTITY FULL;
ALTER TABLE announcements REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'competition'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE competition;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'daily_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_games;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_tags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE active_tags;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tags;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
  END IF;
END $$;

INSERT INTO competition (name, timezone, start_time, end_time, current_day, status)
SELECT 'TAG!', 'America/New_York', '07:20', '14:20', 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM competition);

INSERT INTO players (name, sort_order) VALUES
  ('Santiago', 1),
  ('Samir', 2),
  ('Desa', 3),
  ('Ubita', 4),
  ('Cesar', 5),
  ('Diego Larez', 6),
  ('Toto', 7),
  ('Peruano', 8),
  ('Ryam', 9),
  ('Andres', 10),
  ('Cristian', 11),
  ('Matias', 12),
  ('Amir', 13),
  ('Chucho', 14)
ON CONFLICT (name) DO NOTHING;
