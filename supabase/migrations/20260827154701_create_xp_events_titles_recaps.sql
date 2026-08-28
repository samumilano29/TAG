-- XP system: xp column on players, xp event history, game events, player titles, daily recaps

-- Add XP column to players (defaults to 0)
ALTER TABLE players ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_title text;

-- XP event history (audit trail)
CREATE TABLE IF NOT EXISTS player_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id),
  event_type text NOT NULL,
  xp_amount integer NOT NULL,
  description text,
  related_tag_id uuid,
  related_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_player ON player_xp_events(player_id);

-- Prevent duplicate XP for the same tag (one XP event per tag_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_unique_tag ON player_xp_events(related_tag_id) WHERE related_tag_id IS NOT NULL;

-- Prevent duplicate survival XP per player per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_unique_survival ON player_xp_events(player_id, event_type, description) WHERE event_type = 'SURVIVE_DAY';

-- Prevent duplicate event-win XP
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_unique_event_win ON player_xp_events(player_id, related_event_id) WHERE related_event_id IS NOT NULL AND event_type IN ('SURVIVOR_WIN', 'KING_OF_THE_DAY', 'RIVALRY_WIN');

-- Prevent duplicate revive win XP
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_unique_revive ON player_xp_events(related_tag_id) WHERE event_type = 'REVIVE_WIN';

ALTER TABLE player_xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_xp_events" ON player_xp_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_xp_events" ON player_xp_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Random game events
CREATE TABLE IF NOT EXISTS game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL,
  daily_game_id uuid NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  selected_player_ids uuid[] NOT NULL DEFAULT '{}',
  winner_player_id uuid,
  reward_xp integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT game_events_status_check CHECK (status IN ('scheduled', 'active', 'completed', 'failed', 'expired')),
  CONSTRAINT game_events_type_check CHECK (event_type IN ('MOST_WANTED', 'DOUBLE_BOUNTY', 'SURVIVOR', 'KING_OF_THE_DAY', 'RIVALRY'))
);

CREATE INDEX idx_game_events_daily ON game_events(daily_game_id);
CREATE UNIQUE INDEX idx_game_events_one_per_day ON game_events(daily_game_id) WHERE status IN ('scheduled', 'active');

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_game_events" ON game_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_game_events" ON game_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Daily recaps
CREATE TABLE IF NOT EXISTS daily_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL,
  daily_game_id uuid NOT NULL UNIQUE,
  day_number integer NOT NULL,
  top_tagger_id uuid,
  top_tagger_count integer DEFAULT 0,
  most_tagged_id uuid,
  most_tagged_count integer DEFAULT 0,
  event_type text,
  event_winner_id uuid,
  revives_won integer DEFAULT 0,
  players_eliminated integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_daily_recaps" ON daily_recaps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_daily_recaps" ON daily_recaps FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Player titles (unlocked achievements)
CREATE TABLE IF NOT EXISTS player_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id),
  title text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, title)
);

ALTER TABLE player_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_player_titles" ON player_titles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_player_titles" ON player_titles FOR INSERT TO anon, authenticated WITH CHECK (true);
