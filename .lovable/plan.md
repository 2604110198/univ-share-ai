## 작업 계획

### 1. 로그인 화면 정리 (`src/routes/login.tsx`)
- 탭 UI 제거 → 학생/관리자 공통 학번 입력 + 교수 탭만 별도 유지 (또는 "학번/이메일" 단일 입력)
- 단순화: 탭 2개 유지하되 라벨을 "학생" / "교수"로 변경 (관리자는 학번 0000으로 학생 탭에서 로그인)
- "비밀번호 찾기" 링크 추가

### 2. 비밀번호 찾기 (`src/routes/forgot-password.tsx` 신규)
- 학번 또는 교수 이메일 입력
- 서버 함수(createServerFn + service role)로 `auth.users` 조회 후 비밀번호 표시
- ⚠️ Supabase는 비밀번호를 해시로만 저장하므로 **원본 비밀번호 복구 불가**
  - 대신 **임시 비밀번호 발급** 방식으로 구현: 새 임시 비밀번호 생성 → 사용자에게 1회 표시(맨 뒤 2자 `**` 마스킹) → DB 업데이트
  - 사용자에게 이 정책을 안내 메시지로 표시

### 3. 메인 배너 배경 이미지 (관리자 편집)
- 신규 테이블 `site_settings` (key/value): banner_image_url, school_link_image_url 저장
- Storage 버킷 `site-assets` (public)
- 메인 화면(`src/routes/index.tsx`)에 배너 영역 + 관리자만 보이는 "편집" 버튼

### 4. 이미지 게시판
- 신규 카테고리 `gallery` 추가 (post_category enum)
- 메인 화면 좌측 중하단: 최근 이미지 3개 캐러셀 (점 3개 hover 시 스크롤)
- 이미지 없으면 placeholder
- 클릭 시 `/gallery` 전체 목록 (한 페이지 12개)
- 글 작성: 제목 + 여러 이미지 + 설명. 미리보기 카드 중앙 하단에 제목 오버레이

### 5. 학교 홈페이지 링크 이미지
- 메인 화면에 클릭 시 www.kopo.ac.kr 새 탭으로 이동
- 관리자 로그인 시 "편집" 버튼 노출 → site_settings에서 이미지 변경

### 6. 공지사항 고정/해제
- `posts.is_pinned` 컬럼 이미 존재 → 관리자 UI 토글 추가
- `src/routes/notices.tsx`에서 고정 공지 행 배경을 `bg-muted/40`로 표시

### 기술 세부

**DB 마이그레이션**:
```sql
-- 1. site_settings 테이블
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
-- RLS: 모든 인증 사용자 SELECT, 관리자만 UPDATE/INSERT

-- 2. gallery 카테고리 추가
ALTER TYPE post_category ADD VALUE 'gallery';
-- posts insert RLS 갱신: gallery는 관리자/교수만 작성

-- 3. 스토리지 버킷
INSERT INTO storage.buckets(id,name,public) VALUES ('site-assets','site-assets',true);
-- gallery 이미지는 기존 course-files 버킷 또는 신규 gallery-images(public) 사용
```

**임시 비밀번호 발급 서버 함수** (`src/lib/password-recovery.functions.ts`):
- middleware 없이 호출 (비로그인 상태에서 호출)
- `supabaseAdmin.auth.admin.updateUserById()` 로 임시 비밀번호 설정
- 응답: `{ tempPassword: "abcdef**" }` (마지막 2자 `**` 마스킹)

**파일 변경 요약**:
- 신규: `src/routes/forgot-password.tsx`, `src/routes/gallery.tsx`, `src/routes/gallery.$postId.tsx`, `src/components/banner-editor.tsx`, `src/components/image-carousel.tsx`, `src/lib/password-recovery.functions.ts`, `src/lib/site-settings.ts`
- 수정: `src/routes/login.tsx` (탭 단순화 + 비밀번호 찾기 링크), `src/routes/index.tsx` (배너+캐러셀+학교링크), `src/routes/notices.tsx` (고정 토글 + 배경 색), `src/routes/post.new.tsx` (gallery 카테고리 지원), `src/components/site-header.tsx` (gallery 메뉴 제외 확인)
- 마이그레이션 1개

### 확인사항
- 비밀번호는 해시로만 저장되어 원본 복구가 불가능합니다. 대신 **임시 비밀번호를 새로 발급**해서 보여드리는 방식으로 구현해도 될까요? (보안 표준 방식)
