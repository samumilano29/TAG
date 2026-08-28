-- Revive system: tracks challenges between eliminated players of the same grade.
CREATE TABLE IF NOT EXISTS revives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_player_id uuid NOT NULL REFERENCES players(id),
  opponent_player_id uuid NOT NULL REFERENCES players(id),
  grade text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  winner_player_id uuid REFERENCES players(id),
  loser_player_id uuid REFERENCES players(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT revives_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  CONSTRAINT revives_grade_check CHECK (grade IN ('Freshman', 'Sophomore', 'Junior', 'Senior')),
  CONSTRAINT revives_different_players CHECK (challenger_player_id <> opponent_player_id)
);

CREATE INDEX idx_revives_status ON revives(status);
CREATE INDEX idx_revives_players ON revives(challenger_player_id, opponent_player_id);

ALTER TABLE revives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_revives" ON revives
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_revives" ON revives
  FOR INSERT TO anon, authenticated WITH CHECK (true);
