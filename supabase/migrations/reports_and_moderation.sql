CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'fake', 'offensive', 'other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  created_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  admin_notes text,
  CONSTRAINT unique_report_per_user_per_post UNIQUE (post_id, reporter_id)
);

-- Indexes for performance
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_post_id ON public.reports(post_id);
CREATE INDEX idx_reports_post_owner_id ON public.reports(post_owner_id);

-- Moderation and Reporting Migration
-- 1. Add admin and ban fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES public.users(id) ON DELETE SET NULL;


-- 5. Enable RLS on reports, users, and posts tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for reports
-- Users can select their own reports
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can select their own reports' AND tablename = 'reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can select their own reports" ON public.reports FOR SELECT USING (reporter_id = auth.uid())';
  END IF;
END $$;

-- Users can insert their own reports
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own reports' AND tablename = 'reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own reports" ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid())';
  END IF;
END $$;

-- Admins can select all reports
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can select all reports' AND tablename = 'reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can select all reports" ON public.reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))';
  END IF;
END $$;

-- Admins can update all reports
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all reports' AND tablename = 'reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update all reports" ON public.reports FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))';
  END IF;
END $$;

-- Admins can delete all reports
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete all reports' AND tablename = 'reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete all reports" ON public.reports FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))';
  END IF;
END $$;

-- 7. RLS Policies for users
-- Admins can update all users (for banning)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all users' AND tablename = 'users'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update all users" ON public.users FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))';
  END IF;
END $$;

-- Users can update their own profile, but not admin fields
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'users'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.users WHERE id = auth.uid()))';
  END IF;
END $$;

-- 8. RLS Policies for posts
-- Admins can update all posts (for removing posts)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all posts' AND tablename = 'posts'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update all posts" ON public.posts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))';
  END IF;
END $$;
