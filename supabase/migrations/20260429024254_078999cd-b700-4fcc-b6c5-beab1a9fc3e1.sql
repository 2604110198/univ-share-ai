
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'student');

-- File kind enum
CREATE TYPE public.file_kind AS ENUM ('material', 'submission');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  student_id TEXT,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Allowed student IDs (pre-registered by admin)
CREATE TABLE public.allowed_student_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allowed professor emails (pre-registered by admin)
CREATE TABLE public.allowed_professor_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Folders (created by professors for their courses/assignments)
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_assignment BOOLEAN NOT NULL DEFAULT false,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT,
  kind file_kind NOT NULL DEFAULT 'material',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security definer function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: is folder owner
CREATE OR REPLACE FUNCTION public.is_folder_owner(_user_id UUID, _folder_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.folders
    WHERE id = _folder_id AND owner_id = _user_id
  )
$$;

-- Trigger: validate allowed signup + create profile + assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_student_id TEXT;
  v_full_name TEXT;
  v_signup_role TEXT;
BEGIN
  v_signup_role := COALESCE(NEW.raw_user_meta_data->>'signup_role', 'student');
  v_student_id := NEW.raw_user_meta_data->>'student_id';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  IF v_signup_role = 'professor' THEN
    -- Must be in allowed_professor_emails
    IF NOT EXISTS (SELECT 1 FROM public.allowed_professor_emails WHERE email = NEW.email) THEN
      RAISE EXCEPTION '등록되지 않은 교수 이메일입니다. 관리자에게 문의하세요.';
    END IF;
    v_role := 'professor';
  ELSE
    -- Student: must have student_id in allowed list
    IF v_student_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.allowed_student_ids WHERE student_id = v_student_id) THEN
      RAISE EXCEPTION '등록되지 않은 학번입니다. 관리자에게 문의하세요.';
    END IF;
    v_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, student_id, email, role)
  VALUES (NEW.id, v_full_name, v_student_id, NEW.email, v_role);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_student_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_professor_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- allowed_student_ids: admin only
CREATE POLICY "Admins manage allowed students" ON public.allowed_student_ids
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- allowed_professor_emails: admin only
CREATE POLICY "Admins manage allowed professors" ON public.allowed_professor_emails
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Folders policies
-- All authenticated users can view folders (so students see what's available)
CREATE POLICY "Authenticated can view folders" ON public.folders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Professors create own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Owners update own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete own folders" ON public.folders
  FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- Files policies
-- View rules:
--   - admin: all
--   - folder owner (professor): all files in their folder
--   - uploader: own files
--   - all authenticated: 'material' files (professor uploads visible to everyone)
CREATE POLICY "Files view rules" ON public.files
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_folder_owner(auth.uid(), folder_id)
    OR uploader_id = auth.uid()
    OR kind = 'material'
  );

-- Insert: 
--   - professor uploading material to own folder
--   - student uploading submission to assignment folder (before due date)
--   - admin always
CREATE POLICY "Files insert rules" ON public.files
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = uploader_id AND (
      public.has_role(auth.uid(), 'admin')
      OR (kind = 'material' AND public.is_folder_owner(auth.uid(), folder_id))
      OR (kind = 'submission' AND EXISTS (
        SELECT 1 FROM public.folders f
        WHERE f.id = folder_id
          AND f.is_assignment = true
          AND (f.due_date IS NULL OR f.due_date > now())
      ))
    )
  );

CREATE POLICY "Files delete rules" ON public.files
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin')
    OR uploader_id = auth.uid()
    OR public.is_folder_owner(auth.uid(), folder_id)
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-files', 'course-files', false, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (path format: {folder_id}/{user_id}/{filename})
CREATE POLICY "Authenticated can read course files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'course-files');

CREATE POLICY "Authenticated can upload course files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'course-files'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Owners can delete own course files" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'course-files'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );
