-- Player join requests table — allows non-players to request entry.
-- Admin must approve before a player row is created.
CREATE TABLE IF NOT EXISTS player_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grade text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  rejection_reason text
);

-- Enforce valid statuses
ALTER TABLE player_join_requests
  ADD CONSTRAINT pj_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Enforce valid grades
ALTER TABLE player_join_requests
  ADD CONSTRAINT pj_requests_grade_check
  CHECK (grade IN ('Freshman', 'Sophomore', 'Junior', 'Senior'));

-- Enable RLS
ALTER TABLE player_join_requests ENABLE ROW LEVEL SECURITY;

-- Anon/authenticated can read (needed so devices can see their own request status and admin can see pending)
CREATE POLICY "read_join_requests" ON player_join_requests
  FOR SELECT TO anon, authenticated USING (true);

-- Anon can insert (submitting a request does not require admin pin)
CREATE POLICY "insert_join_requests" ON player_join_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only the service role (edge function) can update/delete — no client update policies.
