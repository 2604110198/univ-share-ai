
-- 1) Wipe existing auth users + related app data (clean slate)
DELETE FROM public.files;
DELETE FROM public.folders;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM public.allowed_student_ids;
DELETE FROM public.allowed_professor_emails;
DELETE FROM auth.users;

-- 2) Add name columns to allowed lists
ALTER TABLE public.allowed_student_ids
  ADD COLUMN IF NOT EXISTS student_name TEXT;

ALTER TABLE public.allowed_professor_emails
  ADD COLUMN IF NOT EXISTS professor_name TEXT;

-- 3) Update handle_new_user trigger to pull names from allowed lists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_student_id TEXT;
  v_full_name TEXT;
  v_signup_role TEXT;
  v_allowed_name TEXT;
BEGIN
  v_signup_role := COALESCE(NEW.raw_user_meta_data->>'signup_role', 'student');
  v_student_id := NEW.raw_user_meta_data->>'student_id';

  IF v_signup_role = 'admin' THEN
    -- Admin bootstrap: only allowed for the seeded student_id 0000
    IF v_student_id <> '0000' THEN
      RAISE EXCEPTION '관리자 계정은 학번 0000으로만 생성할 수 있습니다.';
    END IF;
    v_role := 'admin';
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '관리자');

    INSERT INTO public.profiles (id, full_name, student_id, email, role)
    VALUES (NEW.id, v_full_name, v_student_id, NEW.email, v_role);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
    RETURN NEW;
  END IF;

  IF v_signup_role = 'professor' THEN
    SELECT professor_name INTO v_allowed_name
      FROM public.allowed_professor_emails WHERE email = NEW.email;
    IF NOT FOUND THEN
      RAISE EXCEPTION '등록되지 않은 교수 이메일입니다. 관리자에게 문의하세요.';
    END IF;
    v_role := 'professor';
    v_full_name := COALESCE(v_allowed_name, split_part(NEW.email, '@', 1));
  ELSE
    SELECT student_name INTO v_allowed_name
      FROM public.allowed_student_ids WHERE student_id = v_student_id;
    IF v_student_id IS NULL OR NOT FOUND THEN
      RAISE EXCEPTION '등록되지 않은 학번입니다. 관리자에게 문의하세요.';
    END IF;
    v_role := 'student';
    v_full_name := COALESCE(v_allowed_name, '학생');
  END IF;

  INSERT INTO public.profiles (id, full_name, student_id, email, role)
  VALUES (NEW.id, v_full_name, v_student_id, NEW.email, v_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$function$;

-- 4) Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Seed admin allowed entry: student_id 0000 / name "관리자"
INSERT INTO public.allowed_student_ids (student_id, student_name, note)
VALUES ('0000', '관리자', '기본 관리자 계정 (최초 가입 시 admin 권한 부여)')
ON CONFLICT (student_id) DO UPDATE SET student_name = EXCLUDED.student_name;

-- 6) Helper RPC: change own password requires extra validation client-side.
--    Provide RPC for admin to update their own profile name easily.
CREATE OR REPLACE FUNCTION public.update_my_profile(_full_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;
  UPDATE public.profiles SET full_name = _full_name WHERE id = auth.uid();
END;
$$;
