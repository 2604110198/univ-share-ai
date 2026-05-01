
-- Track read status for inquiry messages
CREATE TABLE public.post_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.post_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own reads"
ON public.post_reads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_post_reads_user ON public.post_reads(user_id);
CREATE INDEX idx_post_reads_post ON public.post_reads(post_id);

-- Inquiry replies: allow professors/admin to reply to inquiries (as 'submission' children of inquiry parent)
-- Update posts insert policy to allow inquiry replies
DROP POLICY IF EXISTS "Posts insert rules" ON public.posts;

CREATE POLICY "Posts insert rules"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  (author_id = auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR ((category = 'material'::post_category) AND has_role(auth.uid(), 'professor'::app_role))
    OR ((category = 'notice'::post_category) AND has_role(auth.uid(), 'professor'::app_role))
    OR ((category = 'assignment'::post_category) AND has_role(auth.uid(), 'professor'::app_role))
    OR (category = 'inquiry'::post_category)
    OR ((category = 'submission'::post_category) AND parent_post_id IS NOT NULL)
  )
);
