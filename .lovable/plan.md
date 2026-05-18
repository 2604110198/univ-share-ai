## 작업 범위

### 1. 메인 페이지 레이아웃 재배치 (`src/routes/index.tsx`)
- 3컬럼 그리드로 재구성: **좌(학과 갤러리) / 중(주요 기능 6개) / 우(학교 홈페이지)**
- 학교 홈페이지 링크 변경: `https://www.kopo.ac.kr` → `https://www.kopo.ac.kr/semi/index.do` (반도체융합캠퍼스)

### 2. 파일 업로드 용량 확대
- `src/lib/format.ts`의 `MAX_FILE_SIZE` 상수를 현재 500MB → **5GB**로 확대 (강의 영상 보관 목적)
- 클라이언트 검증 제거에 가깝게 완화. (실제 storage 버킷 한도는 Supabase 플랜에 따름 — 안내 문구 추가)
- `src/lib/attachments.ts` 에러 메시지도 갱신.

### 3. 강의 관리 — 수정 기능
- `src/routes/admin.tsx`의 강의 목록에 **수정 버튼**(삭제 왼쪽)을 추가.
- 클릭 시 등록 폼에 기존 값(name, weekday, start/end, classroom, professor, description)을 prefill하고 "수정" 모드로 전환.
- 저장 시 `UPDATE courses` 실행 후 폼 리셋, 강의실 페이지에 즉시 반영.

### 4. 로그인 동작 점검
- `src/routes/login.tsx`의 학생 로그인 흐름 점검:
  - `studentIdToEmail` 정상 동작 확인 (`{sid}@students.campus.local`)
  - 성공 후 `auth-context`가 profile을 가져와 메인 진입까지 막힘 없도록 useEffect 의존성 정리.
- 로그인 직후 navigate가 profile 로드 전 발생하면 `/` 의 로딩 상태가 보일 수 있어, 토스트 후 `window.location.replace("/")` 대신 router navigate 유지하고 `__root` 의 onAuthStateChange invalidate가 작동하는지 확인.

### 5. 비밀번호 찾기 — 두 가지 모드로 재설계

**중요한 제약 (사용자에게 안내):**
Supabase Auth는 비밀번호를 단방향 해시(bcrypt)로만 저장하므로 "원래 비밀번호의 앞 2자리 + 나머지 \*"를 그대로 보여주는 것은 **기술적으로 불가능**합니다. 어떤 방식으로도 원본을 복원할 수 없습니다.

대안 — 사용자 의도에 가장 가까운 2단계 흐름으로 구현:

**(A) 비밀번호 힌트 보기 (즉시)**
- 회원가입/비밀번호 변경 시점에 비밀번호를 **암호화**(AES-GCM, 서버측 비밀키 사용)해서 `password_hints` 테이블에 별도 저장.
- 비밀번호 찾기 화면에서 학번/이메일 입력 → 서버 함수가 복호화 후 **앞 2자리 + 나머지 \*** 형식으로 반환.
- 보안 고지: "이 힌트는 본인 확인용이며 화면 캡처에 주의" 안내 문구 표시.
- 신규 가입/변경부터 적용되며, 기존 사용자는 힌트가 없으므로 **(B)** 안내.

**(B) 복구 신청 (관리자 처리)**
- "복구 신청" 버튼 → `recovery_requests` 테이블에 학번/이메일·신청시각 insert.
- 관리자 페이지에 **복구 신청 목록** 섹션 신설. 각 신청에 "임시 비밀번호 발급" 버튼.
- 발급 시 서버함수가 `auth.admin.updateUserById`로 임시 PW 설정 + 신청 상태 `완료`로 갱신 + 결과(임시 PW)를 **관리자에게만** 표시 → 관리자가 학생에게 통보.
- 로그인 후 학생은 `/profile` 에서 새 비밀번호로 변경 가능 (기존 기능 활용 + 비밀번호 변경 UI 추가).

### 기술 세부사항

**DB 마이그레이션:**
```sql
-- 비밀번호 힌트 (암호화 저장)
CREATE TABLE password_hints (
  user_id uuid PRIMARY KEY,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE password_hints ENABLE ROW LEVEL SECURITY;
-- 본인만 읽기 / 서비스롤만 쓰기 (RLS: id = auth.uid())

-- 복구 신청
CREATE TABLE password_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending | completed
  temp_password_issued_at timestamptz
);
-- 본인 insert/select, 관리자 전체 관리
```

**Secret 추가 필요:** `PASSWORD_HINT_KEY` (32바이트 base64) — 힌트 암복호화용.

**서버 함수:**
- `storePasswordHint(userId, plain)` — 가입·변경 시 호출 (admin 클라이언트).
- `getPasswordHint({studentId|email})` — 마스킹된 힌트 반환.
- `requestPasswordRecovery({studentId|email})` — 신청 행 생성.
- `issueTempPasswordForRequest(requestId)` — 관리자 전용, 임시 PW 생성.

### 변경 파일
- 수정: `src/routes/index.tsx`, `src/lib/format.ts`, `src/lib/attachments.ts`, `src/routes/admin.tsx`, `src/routes/login.tsx`, `src/routes/forgot-password.tsx`, `src/routes/profile.tsx`, `src/routes/signup.tsx`.
- 신규: `src/lib/password-hint.functions.ts`, `src/lib/password-recovery-requests.functions.ts`.
- 마이그레이션 1건, secret 1건.

### 확인 필요
1. **비밀번호 힌트 저장 방식**: 위의 (A)+(B) 조합으로 진행해도 될까요? 아니면 (B) 복구 신청만 구현할까요?
2. **PASSWORD_HINT_KEY** secret을 추가해도 될까요? (필요 시 자동 요청)
3. 파일 업로드 한도를 **5GB**로 설정하면 될까요? (더 크게 원하시면 알려주세요)
