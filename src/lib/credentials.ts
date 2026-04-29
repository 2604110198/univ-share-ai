// Helpers for student-id ↔ internal-email conversion and password validation.
// Students log in with a student ID + password. Supabase requires an email,
// so we transparently map: 20241234 → 20241234@students.campus.local

export const STUDENT_EMAIL_DOMAIN = "students.campus.local";

export function studentIdToEmail(studentId: string): string {
  return `${studentId.trim()}@${STUDENT_EMAIL_DOMAIN}`;
}

export function isStudentInternalEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${STUDENT_EMAIL_DOMAIN}`);
}

export const ADMIN_STUDENT_ID = "0000";
export const ADMIN_DEFAULT_PASSWORD = "1234";

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

/** Returns null if valid, otherwise a Korean error message. */
export function validatePassword(pw: string, opts?: { allowAdminDefault?: boolean }): string | null {
  if (opts?.allowAdminDefault && pw === ADMIN_DEFAULT_PASSWORD) return null;
  if (pw.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (!SPECIAL_CHARS.test(pw)) return "비밀번호에 특수문자(!@#$ 등)를 1자 이상 포함해야 합니다.";
  return null;
}

export function validateStudentId(sid: string): string | null {
  const v = sid.trim();
  if (!v) return "학번을 입력하세요.";
  if (!/^[0-9A-Za-z]+$/.test(v)) return "학번은 영문/숫자만 사용할 수 있습니다.";
  return null;
}
