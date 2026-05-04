CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_post_view(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Admins manage allowed professors" ON public.allowed_professor_emails;
CREATE POLICY "Admins manage allowed professors"
ON public.allowed_professor_emails
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage allowed students" ON public.allowed_student_ids;
CREATE POLICY "Admins manage allowed students"
ON public.allowed_student_ids
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses"
ON public.courses
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Attachments delete by uploader or admin" ON public.post_attachments;
CREATE POLICY "Attachments delete by uploader or admin"
ON public.post_attachments
FOR DELETE
USING ((uploader_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Posts delete rules" ON public.posts;
CREATE POLICY "Posts delete rules"
ON public.posts
FOR DELETE
USING ((author_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Posts update rules" ON public.posts;
CREATE POLICY "Posts update rules"
ON public.posts
FOR UPDATE
USING ((author_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((author_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Posts insert rules" ON public.posts;
CREATE POLICY "Posts insert rules"
ON public.posts
FOR INSERT
WITH CHECK (
  (author_id = auth.uid())
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR ((category = 'material'::public.post_category) AND private.has_role(auth.uid(), 'professor'::public.app_role))
    OR ((category = 'notice'::public.post_category) AND private.has_role(auth.uid(), 'professor'::public.app_role))
    OR ((category = 'assignment'::public.post_category) AND private.has_role(auth.uid(), 'professor'::public.app_role))
    OR (category = 'inquiry'::public.post_category)
    OR ((category = 'submission'::public.post_category) AND (parent_post_id IS NOT NULL))
  )
);

DROP POLICY IF EXISTS "Posts view rules" ON public.posts;
CREATE POLICY "Posts view rules"
ON public.posts
FOR SELECT
USING (
  CASE
    WHEN category = 'inquiry'::public.post_category THEN (
      author_id = auth.uid()
      OR inquiry_target_professor_id = auth.uid()
      OR private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    ELSE true
  END
);

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING ((auth.uid() = id) OR private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'professor'::public.app_role));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));