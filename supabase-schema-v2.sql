-- ============================================================
-- A6Hub Database Schema — PHẦN BỔ SUNG
-- Chạy file SQL này SAU KHI đã chạy supabase-schema.sql
-- ============================================================

-- 1. Custom Roles table (managed via Console)
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#000000',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_roles_select" ON public.custom_roles FOR SELECT TO authenticated USING (true);

-- Remove the old CHECK constraint on profiles.role to allow custom roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Insert default roles
INSERT INTO public.custom_roles (name, label, color) VALUES
  ('student', 'Học sinh', '#6b7280'),
  ('leader', 'Lớp trưởng', '#000000'),
  ('vice_leader', 'Lớp phó', '#374151')
ON CONFLICT (name) DO NOTHING;

-- 2. Confessions table (anonymous)
CREATE TABLE IF NOT EXISTS public.confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  reactions JSONB NOT NULL DEFAULT '{"❤️": 0, "😂": 0, "😢": 0, "😮": 0, "🔥": 0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confessions_select" ON public.confessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "confessions_insert" ON public.confessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "confessions_update" ON public.confessions FOR UPDATE TO authenticated USING (true);

-- 3. Notes table (personal, private)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#ffffff',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "notes_update" ON public.notes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notes_delete" ON public.notes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Enable Realtime for confessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;
