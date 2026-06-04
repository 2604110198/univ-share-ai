ALTER TABLE public.post_attachments
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS width_percent integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS align text NOT NULL DEFAULT 'center';

CREATE INDEX IF NOT EXISTS idx_post_attachments_gallery_order
  ON public.post_attachments(post_id, is_cover DESC, display_order ASC, created_at ASC);

CREATE OR REPLACE FUNCTION public.can_manage_post_attachment(_attachment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.post_attachments a
    JOIN public.posts p ON p.id = a.post_id
    WHERE a.id = _attachment_id
      AND (a.uploader_id = auth.uid() OR p.author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  )
$$;

DROP POLICY IF EXISTS "Attachments update by uploader post owner or admin" ON public.post_attachments;
CREATE POLICY "Attachments update by uploader post owner or admin"
ON public.post_attachments
FOR UPDATE
TO authenticated
USING (public.can_manage_post_attachment(id))
WITH CHECK (public.can_manage_post_attachment(id));

CREATE OR REPLACE FUNCTION public.mark_post_read(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  INSERT INTO public.post_reads(user_id, post_id, read_at)
  VALUES (auth.uid(), _post_id, now())
  ON CONFLICT (user_id, post_id)
  DO UPDATE SET read_at = excluded.read_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_gallery_cover(_attachment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  SELECT a.post_id INTO v_post_id
  FROM public.post_attachments a
  JOIN public.posts p ON p.id = a.post_id
  WHERE a.id = _attachment_id
    AND p.category = 'gallery'
    AND (p.author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

  IF v_post_id IS NULL THEN
    RAISE EXCEPTION '대표 이미지를 설정할 권한이 없습니다';
  END IF;

  UPDATE public.post_attachments SET is_cover = false WHERE post_id = v_post_id;
  UPDATE public.post_attachments SET is_cover = true WHERE id = _attachment_id;
END;
$$;