다음 6가지 영역의 피드백을 순차 구현합니다.

## 1. 메인 화면 가독성

`src/routes/index.tsx` 및 `src/components/site-header.tsx`:
- 상단 남색 바의 "한국폴리텍대학교 반도체융합캠퍼스" 텍스트를 `text-lg md:text-xl` 로 키움.
- 환영 메시지 영역(`greeting` 칩)에 더 진한 배경과 흰색 텍스트(예: `bg-primary-foreground/15 text-white border-white/30 backdrop-blur`)를 적용해 가독성 향상.

## 2. 강의실 → 강의 상세 페이지

새 라우트 `src/routes/course.$courseId.tsx`:
- 강의 목록(`dashboard.tsx`)에서 각 강의 카드를 `Link to="/course/$courseId"` 로 변경.
- 상세 페이지 구성:
  - 상단: 해당 과목의 최근 공지사항(category=`notice` AND `course_id`) 1~3개 카드.
  - 탭/섹션: **자료**(category=`material`, course_id) · **과제**(category=`assignment`, course_id) 목록.
  - 교수(담당) 또는 관리자에게만 "공지 작성", "자료 작성", "과제 작성" 버튼 노출.
  - 각 게시글은 작성자 또는 관리자만 수정/삭제(기존 RLS에 부합).
- `posts` 카테고리 enum에 `notice`가 강의별로도 등록될 수 있도록 RLS 정책의 INSERT 조건 확장(course_id 있는 notice를 담당 교수가 작성 가능하게). 마이그레이션으로 정책 갱신.

## 3. 과제 게시판 권한

`src/routes/assignments.$courseId.tsx`, `src/routes/post.new.tsx`:
- 학생 화면에서는 과제 작성 버튼을 완전히 렌더링하지 않음(이미 `canWriteAssignment` 가드 있음 — 확인 후 정리).
- `post.new.tsx`에서 카테고리 `assignment` 진입 시 비교수/비관리자면 즉시 `/assignments` 로 redirect + 토스트.
- 과제 작성 폼에 마감기한(`due_date`) 입력과 양식 파일 다중 첨부 기능 보강(기존 첨부 로직 재사용).
- 게시글 상세(`post.$postId.tsx`)에서 첨부파일 다운로드 링크와 수정/삭제 버튼은 작성자/관리자에게만.

## 4. 알림 시스템 통합

`posts` 테이블에 `notify_audience` 컬럼 추가(`none | all | students`, 기본 `none`).

새 테이블 `notifications`:
```
id uuid pk, user_id uuid, post_id uuid, kind text ('notice'|'course_notice'|'recovery_request'), 
title text, created_at timestamptz, read_at timestamptz null
```
RLS: 본인 행만 SELECT/UPDATE, 관리자 ALL.

트리거 `on_post_insert_notify`: notice/course_notice 게시 시 `notify_audience` 에 따라
- `all` → 모든 profiles
- `students` → role='student'
대상으로 notifications 행 fan-out.

비밀번호 복구 신청 시 트리거로 모든 admin 에게 notification 생성.

`site-header.tsx`의 종(Bell) 아이콘이 이제 `notifications` 테이블의 미읽음 카운트를 표시하고, 클릭 시 드롭다운에서 항목별 링크(공지/과제/복구신청) 제공. 항목 클릭 시 `read_at` 업데이트.

## 5. 공지사항 작성 옵션

`post.new.tsx` 공지/과목공지 작성 시 라디오:
- "알림 보내지 않음" / "모든 회원" / "학생만"

`notices.tsx` 목록에서 작성자 또는 관리자만 수정/삭제(기존 RLS 유지, UI 버튼 가드).

### 고정 권한
- `profiles` (또는 `user_roles`) 외에 새 컬럼/플래그 필요 → 가장 단순한 방식으로 `profiles.can_pin boolean default false` 추가.
- `posts` 의 `is_pinned` UPDATE를 관리자 또는 `can_pin=true` 교수에게만 허용하도록 RLS의 별도 정책 또는 트리거로 enforce.
- 관리실(`admin.tsx`)에 교수 목록 옆 "고정 권한" 토글 추가.

## 6. 비밀번호 복구 알림 + 관리자 임시 비밀번호 입력

- 4번의 트리거로 복구 신청 → admin notifications 생성 (벨 표시).
- `admin.tsx` 복구 요청 탭: 기존 자동 생성 대신 관리자가 **직접 임시 비밀번호 입력** UI(텍스트 인풋 + "발급" 버튼). 서버함수 `setTempPassword(userId, tempPassword)` 가 `supabaseAdmin.auth.admin.updateUserById` 호출하고 요청을 `completed` 처리.
- `profile.tsx` 비밀번호 변경 UX는 기존대로 (임시 비밀번호로 로그인 후 변경 가능).

## 마이그레이션 요약
1. `ALTER TABLE posts ADD COLUMN notify_audience text DEFAULT 'none' CHECK (notify_audience IN ('none','all','students'));`
2. `ALTER TABLE profiles ADD COLUMN can_pin boolean DEFAULT false;`
3. `CREATE TABLE notifications (...)` + RLS.
4. Posts INSERT/UPDATE 정책 갱신 (강의 담당 교수의 course notice 작성, can_pin 가드).
5. 트리거: post insert → notifications fan-out, recovery request insert → admin notification.

## 파일 변경 목록
- 신규: `src/routes/course.$courseId.tsx`, `src/lib/notifications.ts`
- 수정: `src/routes/index.tsx`, `src/components/site-header.tsx`, `src/routes/dashboard.tsx`, `src/routes/assignments.$courseId.tsx`, `src/routes/post.new.tsx`, `src/routes/post.$postId.tsx`, `src/routes/notices.tsx`, `src/routes/admin.tsx`, `src/lib/password-recovery.functions.ts`
- 마이그레이션 1개

승인해주시면 마이그레이션부터 진행하겠습니다.