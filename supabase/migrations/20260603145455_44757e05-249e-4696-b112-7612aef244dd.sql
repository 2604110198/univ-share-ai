
CREATE OR REPLACE FUNCTION public.update_course_textbook(
  _course_id uuid,
  _title text,
  _info text,
  _image_path text,
  _purchase_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
  v_can_write boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  SELECT private.has_role(v_uid, 'admin'::public.app_role) INTO v_is_admin;
  SELECT (professor_id = v_uid) INTO v_is_owner
    FROM public.courses WHERE id = _course_id;
  SELECT COALESCE(can_write_notice, false) INTO v_can_write
    FROM public.profiles WHERE id = v_uid;

  IF NOT (v_is_admin OR COALESCE(v_is_owner, false) OR COALESCE(v_can_write, false)) THEN
    RAISE EXCEPTION '교재 정보를 수정할 권한이 없습니다';
  END IF;

  UPDATE public.courses
  SET textbook_title = NULLIF(btrim(_title), ''),
      textbook_info = NULLIF(btrim(_info), ''),
      textbook_image_path = NULLIF(btrim(_image_path), ''),
      textbook_purchase_url = NULLIF(btrim(_purchase_url), '')
  WHERE id = _course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_course_textbook(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_course_textbook(uuid, text, text, text, text) TO authenticated;
