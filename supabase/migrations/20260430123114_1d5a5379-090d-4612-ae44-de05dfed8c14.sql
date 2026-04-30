
-- 1. 기존 folders/files 정리
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
DROP FUNCTION IF EXISTS public.is_folder_owner(uuid, uuid) CASCADE;
DROP TYPE IF EXISTS public.file_kind CASCADE;

-- 2. 카테고리 enum
DO $$ BEGIN
  CREATE TYPE public.post_category AS ENUM ('material', 'assignment', 'notice', 'inquiry', 'submission');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.weekday AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. 강의 테이블
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  professor_id UUID,
  professor_name TEXT,
  weekday public.weekday NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  classroom TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view courses" ON public.courses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 4. 게시물 테이블
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.post_category NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role app_role NOT NULL,
  due_date TIMESTAMPTZ,                   -- 과제 공지용
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  parent_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE, -- 과제 제출이 어느 공지에 속하는지
  inquiry_target_professor_id UUID,       -- 1:1 문의 대상 교수
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_posts_category ON public.posts(category);
CREATE INDEX idx_posts_course ON public.posts(course_id);
CREATE INDEX idx_posts_parent ON public.posts(parent_post_id);

-- View: inquiry → 작성자/대상교수/관리자만. 그 외는 모두 열람
CREATE POLICY "Posts view rules" ON public.posts FOR SELECT TO authenticated USING (
  CASE
    WHEN category = 'inquiry' THEN
      author_id = auth.uid()
      OR inquiry_target_professor_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
    ELSE true
  END
);

-- Insert: 카테고리별 권한
CREATE POLICY "Posts insert rules" ON public.posts FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND (
    has_role(auth.uid(), 'admin')
    OR (category = 'material' AND has_role(auth.uid(), 'professor'))
    OR (category = 'notice' AND has_role(auth.uid(), 'professor'))
    OR (category = 'assignment' AND has_role(auth.uid(), 'professor'))
    OR (category = 'inquiry')   -- 누구나 문의 작성
    OR (category = 'submission' AND has_role(auth.uid(), 'student')
        AND parent_post_id IS NOT NULL)
  )
);

-- Update: 본인 또는 관리자
CREATE POLICY "Posts update rules" ON public.posts FOR UPDATE USING (
  author_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- Delete: 본인 또는 관리자(강제 삭제)
CREATE POLICY "Posts delete rules" ON public.posts FOR DELETE USING (
  author_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- 5. 첨부파일
CREATE TABLE public.post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT,
  uploader_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments view follows post" ON public.post_attachments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id)  -- post의 RLS가 먼저 필터링
);
CREATE POLICY "Attachments insert by uploader" ON public.post_attachments FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid());
CREATE POLICY "Attachments delete by uploader or admin" ON public.post_attachments FOR DELETE USING (
  uploader_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- 6. 조회수 카운터 (RPC)
CREATE OR REPLACE FUNCTION public.increment_post_view(_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = _post_id;
END;
$$;

-- 7. 관리자 부트스트랩 (학번 0000 가입을 매번 허용 → 항상 admin 부여)
-- handle_new_user는 이미 0000 처리 로직이 있으니 그대로 사용.
-- 추가로, 이미 admin이 있어도 0000 학번으로 가입하려는 경우를 위해 allowed_student_ids에 0000 시드.
INSERT INTO public.allowed_student_ids (student_id, student_name, note)
VALUES ('0000', '관리자', '시스템 관리자 계정')
ON CONFLICT (student_id) DO NOTHING;
