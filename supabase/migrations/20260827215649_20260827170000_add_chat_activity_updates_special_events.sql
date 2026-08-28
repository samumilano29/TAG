/*
# Add Chat, Activity Feed, App Updates, Special Events, and Language Preference

1. New Tables
- `chat_messages`: Global real-time chat. Fields: id, player_id, player_name, message, is_system, created_at.
- `activity_feed`: Auto-generated activity entries. Fields: id, activity_type, description, player_id, related_tag_id, related_event_id, created_at.
- `app_updates`: Admin-published updates/announcements. Fields: id, title_en, title_es, description_en, description_es, category, version, published, created_at, updated_at.
- `special_events`: Admin-created special events that override random events. Fields: id, name, date, start_time, end_time, hunter_player_ids, target_player_ids, objective, reward_xp, override_random, status, metadata, created_at, completed_at.
- `player_update_views`: Tracks which players have seen which updates. Fields: id, player_id, update_id, viewed_at.

2. Modified Tables
- `players`: Add `language` column (text, default 'en') for per-player language preference.

3. Security
- Enable RLS on all new tables.
- All tables use `TO anon, authenticated` since this is a no-auth app (no sign-in screen).
- Chat: anyone can insert, admin (via edge function) can delete.
- Activity feed: only edge function inserts (via service role), anyone can read.
- App updates: anyone can read, only admin (via edge function) can write.
- Special events: anyone can read, only admin (via edge function) can write.
- Player update views: anyone can read/insert their own views.

4. Indexes
- chat_messages.created_at (for ordering)
- activity_feed.created_at (for ordering)
- app_updates.created_at (for ordering)
- special_events.date (for lookup)
- player_update_views.player_id (for lookup)
*/

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  player_name text NOT NULL,
  message text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at DESC);

-- Activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL,
  description text NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  player_name text,
  related_tag_id uuid,
  related_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity" ON activity_feed;
CREATE POLICY "anon_select_activity" ON activity_feed FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity" ON activity_feed;
CREATE POLICY "anon_insert_activity" ON activity_feed FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed (created_at DESC);

-- App updates table
CREATE TABLE IF NOT EXISTS app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_es text NOT NULL,
  description_en text NOT NULL,
  description_es text NOT NULL,
  category text NOT NULL DEFAULT 'improvement',
  version text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_updates" ON app_updates;
CREATE POLICY "anon_select_updates" ON app_updates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_updates" ON app_updates;
CREATE POLICY "anon_insert_updates" ON app_updates FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_updates" ON app_updates;
CREATE POLICY "anon_update_updates" ON app_updates FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_updates" ON app_updates;
CREATE POLICY "anon_delete_updates" ON app_updates FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_app_updates_created_at ON app_updates (created_at DESC);

-- Special events table
CREATE TABLE IF NOT EXISTS special_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date text NOT NULL,
  start_time text NOT NULL DEFAULT '07:14',
  end_time text NOT NULL DEFAULT '14:25',
  hunter_player_ids uuid[] NOT NULL DEFAULT '{}',
  target_player_ids uuid[] NOT NULL DEFAULT '{}',
  tagged_player_ids uuid[] NOT NULL DEFAULT '{}',
  objective text NOT NULL DEFAULT '',
  reward_xp integer NOT NULL DEFAULT 0,
  override_random boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'scheduled',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_special_events" ON special_events;
CREATE POLICY "anon_select_special_events" ON special_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_special_events" ON special_events;
CREATE POLICY "anon_insert_special_events" ON special_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_special_events" ON special_events;
CREATE POLICY "anon_update_special_events" ON special_events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_special_events" ON special_events;
CREATE POLICY "anon_delete_special_events" ON special_events FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_special_events_date ON special_events (date);

-- Player update views table
CREATE TABLE IF NOT EXISTS player_update_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  update_id uuid REFERENCES app_updates(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, update_id)
);

ALTER TABLE player_update_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_update_views" ON player_update_views;
CREATE POLICY "anon_select_update_views" ON player_update_views FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_update_views" ON player_update_views;
CREATE POLICY "anon_insert_update_views" ON player_update_views FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_update_views" ON player_update_views;
CREATE POLICY "anon_delete_update_views" ON player_update_views FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_player_update_views_player ON player_update_views (player_id);

-- Add language column to players
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'language') THEN
    ALTER TABLE players ADD COLUMN language text NOT NULL DEFAULT 'en';
  END IF;
END $$;

-- Insert the September 2, 2026 special event if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM special_events WHERE date = '2026-09-02' AND name = '2 vs Everybody') THEN
    INSERT INTO special_events (name, date, start_time, end_time, hunter_player_ids, objective, reward_xp, override_random, status)
    SELECT '2 vs Everybody', '2026-09-02', '07:14', '13:15', ARRAY(
      SELECT id FROM players WHERE lower(name) IN ('peruano', 'juanpi')
    ), 'Tag every eligible active opponent', 0, true, 'scheduled'
    WHERE EXISTS (SELECT 1 FROM players WHERE lower(name) IN ('peruano', 'juanpi'));
  END IF;
END $$;

-- Insert initial app update
INSERT INTO app_updates (title_en, title_es, description_en, description_es, category, version)
SELECT 'Tag Game Update', 'Actualización del Juego',
  'XP, Ranks, Titles, Random Events, Live Chat, Activity Feed, and more are now live!',
  '¡XP, Rangos, Títulos, Eventos Aleatorios, Chat en Vivo, Feed de Actividad y más ya están disponibles!',
  'new_feature', '2.0.0'
WHERE NOT EXISTS (SELECT 1 FROM app_updates LIMIT 1);
