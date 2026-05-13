
-- 1. site_settings table
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 2. Add 'gallery' to post_category enum
ALTER TYPE post_category ADD VALUE IF NOT EXISTS 'gallery';

-- 3. Storage buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('site-assets', 'site-assets', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('gallery-images', 'gallery-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: site-assets — admin only write, public read
CREATE POLICY "site-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');
CREATE POLICY "site-assets admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-assets' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "site-assets admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-assets' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "site-assets admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-assets' AND private.has_role(auth.uid(), 'admin'::app_role));

-- gallery-images: public read; authenticated write (RLS on posts gates who can attach)
CREATE POLICY "gallery-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');
CREATE POLICY "gallery-images auth write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gallery-images'
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'professor'::app_role)
    )
  );
CREATE POLICY "gallery-images owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gallery-images'
    AND (
      owner = auth.uid()
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  );
