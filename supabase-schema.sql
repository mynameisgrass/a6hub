-- ============================================================
-- ClassSpace Database Schema
-- Chạy file SQL này trong Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Người dùng',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'leader', 'vice_leader')),
  first_login BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Announcements (only leaders can post)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Channels (chat rooms)
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('group', 'private', 'hidden', 'dm')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Channel members
CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- 5. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Trades (marketplace)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL DEFAULT 'Miễn phí',
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('homework', 'tutoring', 'notes', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Documents (file library)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_size TEXT,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone logged in can read, users can update own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Announcements: anyone can read, leaders can insert
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('leader', 'vice_leader'))
  );
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Channels: anyone can read group channels, members can read private
CREATE POLICY "channels_select" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "channels_insert" ON public.channels FOR INSERT TO authenticated WITH CHECK (true);

-- Channel members: can see own memberships
CREATE POLICY "channel_members_select" ON public.channel_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "channel_members_insert" ON public.channel_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "channel_members_delete" ON public.channel_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Messages: members can read/write in their channels
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Trades: anyone can read, authors can manage own
CREATE POLICY "trades_select" ON public.trades FOR SELECT TO authenticated USING (true);
CREATE POLICY "trades_insert" ON public.trades FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "trades_update" ON public.trades FOR UPDATE TO authenticated USING (author_id = auth.uid());

-- Documents: anyone can read, anyone logged in can upload
CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- Enable Realtime for messages
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- ============================================================
-- Create default channels
-- ============================================================
INSERT INTO public.channels (name, type) VALUES
  ('Chat chung', 'group'),
  ('Hỏi bài tập', 'group'),
  ('Tán gẫu', 'group')
ON CONFLICT DO NOTHING;
