
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS textbook_image_path text,
  ADD COLUMN IF NOT EXISTS textbook_purchase_url text;

-- Inquiry notification fanout: notify the target user (any role) when a new inquiry is created.
CREATE OR REPLACE FUNCTION public.notify_inquiry_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category = 'inquiry' AND NEW.inquiry_target_professor_id IS NOT NULL
     AND NEW.inquiry_target_professor_id <> NEW.author_id THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, post_id)
    VALUES (
      NEW.inquiry_target_professor_id,
      'inquiry',
      '새 1:1 문의',
      NEW.author_name || ' 님이 문의를 보냈습니다: ' || NEW.title,
      '/inquiries/' || NEW.id::text,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_inquiry_target ON public.posts;
CREATE TRIGGER trg_notify_inquiry_target
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_inquiry_target();

-- Make sure the existing fanout trigger is attached for notices/assignments.
DROP TRIGGER IF EXISTS trg_fanout_post_notifications ON public.posts;
CREATE TRIGGER trg_fanout_post_notifications
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.fanout_post_notifications();
