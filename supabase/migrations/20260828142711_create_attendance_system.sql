/*
# Create Attendance / Player Availability System

1. New Tables
- `attendance` — one row per player per date. Tracks whether a player is present, absent, or left early.
  - `id` (uuid PK)
  - `player_id` (uuid FK → players.id, ON DELETE CASCADE)
  - `date` (date, not null) — the school day the attendance applies to
  - `status` (text, not null) — one of: 'present', 'absent', 'left_early', 'unknown'
  - `left_at` (timestamptz, nullable) — timestamp when player left early, set automatically when status becomes 'left_early'
  - `updated_at` (timestamptz, default now())
  - `updated_by` (text, nullable) — who made the change (admin pin hash or 'admin')
  - Unique constraint on (player_id, date) prevents duplicate records
- `attendance_audit` — append-only history of every attendance change for audit purposes.
  - `id` (uuid PK)
  - `player_id` (uuid FK → players.id, ON DELETE CASCADE)
  - `date` (date, not null)
  - `old_status` (text, nullable)
  - `new_status` (text, not null)
  - `old_left_at` (timestamptz, nullable)
  - `new_left_at` (timestamptz, nullable)
  - `changed_at` (timestamptz, default now())
  - `changed_by` (text, nullable)

2. Security
- RLS enabled on both tables.
- `attendance`: SELECT for anon+authenticated (app reads via anon key, no sign-in). All writes go through the edge function using the service role key, so no INSERT/UPDATE/DELETE policies for client roles — deny by default.
- `attendance_audit`: SELECT for anon+authenticated (read-only history). No client writes.

3. Indexes
- Index on `attendance(date)` for fast daily lookups.
- Index on `attendance(player_id)` for per-player queries.

4. Important Notes
- Attendance does NOT change the player's `status` column in the `players` table. It is a separate daily record.
- The edge function uses the service role key (bypasses RLS) to write attendance records when admins act.
- The unique constraint on (player_id, date) means upserts are used to update existing records.
- Absent and left-early players are excluded from event target selection and tag validation by the edge function.
*/

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('present', 'absent', 'left_early', 'unknown')),
  left_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  updated_by text,
  UNIQUE (player_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_player ON attendance(player_id);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Read-only for the app (anon key). Writes only via edge function (service role).
DROP POLICY IF EXISTS "anon_read_attendance" ON attendance;
CREATE POLICY "anon_read_attendance" ON attendance FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS attendance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date date NOT NULL,
  old_status text,
  new_status text NOT NULL,
  old_left_at timestamptz,
  new_left_at timestamptz,
  changed_at timestamptz DEFAULT now(),
  changed_by text
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_date ON attendance_audit(date);

ALTER TABLE attendance_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_attendance_audit" ON attendance_audit;
CREATE POLICY "anon_read_attendance_audit" ON attendance_audit FOR SELECT
  TO anon, authenticated USING (true);

-- Enable realtime on the attendance table so clients get push updates.
ALTER TABLE attendance REPLICA IDENTITY FULL;
