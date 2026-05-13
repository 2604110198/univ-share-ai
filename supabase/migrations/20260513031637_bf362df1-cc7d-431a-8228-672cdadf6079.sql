
DROP POLICY IF EXISTS "Posts insert rules" ON public.posts;
CREATE POLICY "Posts insert rules" ON public.posts
  FOR INSERT
  WITH CHECK (
    (author_id = auth.uid()) AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR ((category = 'material'::post_category) AND private.has_role(auth.uid(), 'professor'::app_role))
      OR ((category = 'notice'::post_category) AND private.has_role(auth.uid(), 'professor'::app_role))
      OR ((category = 'assignment'::post_category) AND private.has_role(auth.uid(), 'professor'::app_role))
      OR ((category = 'gallery'::post_category) AND private.has_role(auth.uid(), 'professor'::app_role))
      OR (category = 'inquiry'::post_category)
      OR ((category = 'submission'::post_category) AND (parent_post_id IS NOT NULL))
    )
  );
