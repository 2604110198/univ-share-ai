DROP POLICY IF EXISTS "Attachments delete by uploader or admin" ON public.post_attachments;
DROP POLICY IF EXISTS "Attachments delete by uploader post owner or admin" ON public.post_attachments;
CREATE POLICY "Attachments delete by uploader post owner or admin"
ON public.post_attachments
FOR DELETE
TO authenticated
USING (public.can_manage_post_attachment(id));