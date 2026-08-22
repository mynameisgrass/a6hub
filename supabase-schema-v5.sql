-- Fix RLS policies for announcements to use the custom_roles table

-- 1. Drop the old policies
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

-- 2. Create the new insert policy checking perm_post_announcements
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      LEFT JOIN custom_roles cr ON p.role = cr.name
      WHERE p.id = auth.uid() AND (cr.perm_post_announcements = true OR p.role IN ('leader', 'vice_leader'))
    )
  );

-- 3. Create the new delete policy checking perm_post_announcements
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      LEFT JOIN custom_roles cr ON p.role = cr.name
      WHERE p.id = auth.uid() AND (cr.perm_post_announcements = true OR p.role IN ('leader', 'vice_leader'))
    )
  );
