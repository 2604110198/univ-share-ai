import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Generate a temporary password (letters + digits + 1 special char).
function genTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  // ensure special char to satisfy app password rule
  return pw + "!";
}

function maskTail(pw: string): string {
  if (pw.length <= 2) return "**";
  return pw.slice(0, pw.length - 2) + "**";
}

const STUDENT_DOMAIN = "students.campus.local";

/**
 * Issue a one-time temporary password.
 * Real passwords are stored hashed in Supabase Auth and cannot be retrieved.
 * For "비밀번호 찾기" we reset to a new temp password and show it once,
 * with the last 2 characters masked.
 */
export const issueTempPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { studentId?: string; email?: string }) => data)
  .handler(async ({ data }) => {
    const sid = data.studentId?.trim();
    const email = data.email?.trim().toLowerCase();
    if (!sid && !email) throw new Error("학번 또는 이메일을 입력하세요.");

    const lookupEmail = sid ? `${sid}@${STUDENT_DOMAIN}` : email!;

    // Find user via profiles (admin client bypasses RLS)
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, student_id")
      .eq("email", lookupEmail)
      .maybeSingle();

    if (pErr) throw new Error("조회 중 오류가 발생했습니다.");
    if (!profile) throw new Error("등록된 계정을 찾을 수 없습니다.");

    const tempPw = genTempPassword();
    const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: tempPw,
    });
    if (uErr) throw new Error("임시 비밀번호 발급에 실패했습니다.");

    return {
      fullName: profile.full_name,
      role: profile.role as "student" | "professor" | "admin",
      maskedPassword: maskTail(tempPw),
      identifier: profile.student_id ?? profile.email,
    };
  });
