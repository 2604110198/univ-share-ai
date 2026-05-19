
-- 1. posts.notify_audience
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS notify_audience text NOT NULL DEFAULT 'none'
  CHECK (notify_audience IN ('none','all','students'));

-- 2. profiles.can_pin
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_pin boolean NOT NULL DEFAULT false;

-- 3. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,  -- 'notice' | 'course_notice' | 'assignment' | 'recovery_request' | 'temp_password'
  title text NOT NULL,
  body text,
  link text,
  post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins delete notifications" ON public.notifications;
CREATE POLICY "Admins delete notifications" ON public.notifications
  FOR DELETE USING (private.has_role(auth.uid(),'admin') OR user_id = auth.uid());

-- 4. Replace posts INSERT policy to allow course-assigned professors to post notice/material/assignment/gallery for their course
DROP POLICY IF EXISTS "Posts insert rules" ON public.posts;
CREATE POLICY "Posts insert rules" ON public.posts FOR INSERT WITH CHECK (
  author_id = auth.uid() AND (
    private.has_role(auth.uid(),'admin')
    OR (category = 'material'   AND private.has_role(auth.uid(),'professor'))
    OR (category = 'notice'     AND private.has_role(auth.uid(),'professor'))
    OR (category = 'assignment' AND private.has_role(auth.uid(),'professor'))
    OR (category = 'gallery'    AND private.has_role(auth.uid(),'professor'))
    OR (category = 'inquiry')
    OR (category = 'submission' AND parent_post_id IS NOT NULL)
  )
);

-- 5. Pin permission enforcement via trigger
CREATE OR REPLACE FUNCTION public.enforce_pin_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_pin boolean;
BEGIN
  IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
    IF private.has_role(auth.uid(),'admin') THEN
      RETURN NEW;
    END IF;
    SELECT can_pin INTO v_can_pin FROM public.profiles WHERE id = auth.uid();
    IF COALESCE(v_can_pin,false) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION '공지 고정 권한이 없습니다.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pin ON public.posts;
CREATE TRIGGER trg_enforce_pin
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pin_permission();

-- 6. Fan-out notifications on post insert
CREATE OR REPLACE FUNCTION public.fanout_post_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
  v_kind text;
BEGIN
  IF NEW.notify_audience = 'none' THEN
    RETURN NEW;
  END IF;
  IF NEW.category NOT IN ('notice','assignment') THEN
    RETURN NEW;
  END IF;

  IF NEW.category = 'notice' AND NEW.course_id IS NOT NULL THEN
    v_kind := 'course_notice';
    v_link := '/course/' || NEW.course_id::text;
  ELSIF NEW.category = 'notice' THEN
    v_kind := 'notice';
    v_link := '/post/' || NEW.id::text;
  ELSE
    v_kind := 'assignment';
    v_link := '/post/' || NEW.id::text;
  END IF;

  INSERT INTO public.notifications(user_id, kind, title, body, link, post_id)
  SELECT p.id, v_kind, NEW.title, NEW.author_name, v_link, NEW.id
  FROM public.profiles p
  WHERE p.id <> NEW.author_id
    AND (NEW.notify_audience = 'all' OR (NEW.notify_audience = 'students' AND p.role = 'student'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fanout_post ON public.posts;
CREATE TRIGGER trg_fanout_post
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fanout_post_notifications();

-- 7. Notify admins on recovery request
CREATE OR REPLACE FUNCTION public.notify_admin_recovery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, kind, title, body, link)
  SELECT ur.user_id, 'recovery_request',
    '비밀번호 복구 신청',
    COALESCE(NEW.full_name, NEW.identifier) || ' 님이 비밀번호 복구를 신청했습니다.',
    '/admin'
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_recovery ON public.password_recovery_requests;
CREATE TRIGGER trg_notify_recovery
  AFTER INSERT ON public.password_recovery_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_recovery();
