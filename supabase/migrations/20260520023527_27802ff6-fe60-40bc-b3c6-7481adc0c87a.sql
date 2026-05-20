-- Course textbook fields
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS textbook_title text,
  ADD COLUMN IF NOT EXISTS textbook_info text;

-- Student notice-writing permission; keep existing can_pin column for compatibility but stop using it for pinning
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_write_notice boolean NOT NULL DEFAULT false;

-- Comments for posts, including secret comments for assignment/submission flows
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  author_role public.app_role NOT NULL,
  content text NOT NULL,
  is_secret boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created ON public.post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_author ON public.post_comments(author_id);

CREATE OR REPLACE FUNCTION public.is_course_professor(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = _course_id AND c.professor_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_post_comment(_comment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.post_comments pc
    JOIN public.posts p ON p.id = pc.post_id
    LEFT JOIN public.posts parent ON parent.id = p.parent_post_id
    WHERE pc.id = _comment_id
      AND (
        pc.is_secret = false
        OR pc.author_id = auth.uid()
        OR p.author_id = auth.uid()
        OR parent.author_id = auth.uid()
        OR public.is_course_professor(COALESCE(p.course_id, parent.course_id), auth.uid())
        OR private.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
$$;

DROP POLICY IF EXISTS "Comments view rules" ON public.post_comments;
CREATE POLICY "Comments view rules" ON public.post_comments
FOR SELECT TO authenticated
USING (public.can_view_post_comment(id));

DROP POLICY IF EXISTS "Comments insert rules" ON public.post_comments;
CREATE POLICY "Comments insert rules" ON public.post_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.category IN ('material'::public.post_category, 'assignment'::public.post_category, 'notice'::public.post_category, 'gallery'::public.post_category, 'submission'::public.post_category)
  )
);

DROP POLICY IF EXISTS "Comments update rules" ON public.post_comments;
CREATE POLICY "Comments update rules" ON public.post_comments
FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Comments delete rules" ON public.post_comments;
CREATE POLICY "Comments delete rules" ON public.post_comments
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_post_comment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_post_comment_updated_at ON public.post_comments;
CREATE TRIGGER trg_touch_post_comment_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_post_comment_updated_at();

-- Only admins can pin notices now
CREATE OR REPLACE FUNCTION public.enforce_pin_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
    IF private.has_role(auth.uid(),'admin'::public.app_role) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION '공지 고정 권한은 관리자에게만 있습니다.';
  END IF;
  RETURN NEW;
END;
$$;

-- Notice insert permission: admin, professor, or student explicitly granted notice-writing rights
DROP POLICY IF EXISTS "Posts insert rules" ON public.posts;
CREATE POLICY "Posts insert rules" ON public.posts
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR ((category = 'material'::public.post_category) AND private.has_role(auth.uid(), 'professor'::public.app_role))
    OR ((category = 'notice'::public.post_category) AND (
      private.has_role(auth.uid(), 'professor'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.can_write_notice = true)
    ))
    OR ((category = 'assignment'::public.post_category) AND private.has_role(auth.uid(), 'professor'::public.app_role))
    OR ((category = 'gallery'::public.post_category) AND private.has_role(auth.uid(), 'professor'::public.app_role))
    OR (category = 'inquiry'::public.post_category)
    OR ((category = 'submission'::public.post_category) AND (parent_post_id IS NOT NULL))
  )
);

-- Recovery request status helper values remain text for compatibility; add archive timestamp for admin confirmation/removal.
ALTER TABLE public.password_recovery_requests
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_recovery_visible_status ON public.password_recovery_requests(status, requested_at DESC)
  WHERE status <> 'archived';