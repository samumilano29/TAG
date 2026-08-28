-- Idempotently seed the "New Attendance System" update post.
-- Uses ON CONFLICT on a unique constraint keyed by title_en to prevent duplicates
-- if this migration runs more than once.

-- First, add a unique constraint on app_updates.title_en so we can upsert safely.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_updates_title_en_unique'
  ) THEN
    ALTER TABLE app_updates ADD CONSTRAINT app_updates_title_en_unique UNIQUE (title_en);
  END IF;
END $$;

INSERT INTO app_updates (
  title_en,
  title_es,
  description_en,
  description_es,
  category,
  version,
  published,
  created_at,
  updated_at
) VALUES (
  'New Attendance System',
  'Nuevo sistema de asistencia',
  'Admins can now mark players as Present, Absent, or Left Early. Players who are absent or leave early will automatically stop counting for events and other gameplay systems when appropriate.',
  'Ahora los admins pueden marcar jugadores como Presentes, Ausentes o Se fue temprano. Los jugadores que falten o se vayan temprano dejarán de contar automáticamente para eventos y otros sistemas del juego cuando corresponda.',
  'new_feature',
  NULL,
  true,
  now(),
  now()
)
ON CONFLICT (title_en) DO NOTHING;
