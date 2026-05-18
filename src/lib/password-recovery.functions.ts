import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STUDENT_DOMAIN = "students.campus.local";

function genTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw + "!";
}

/** Create a recovery request that the admin will fulfill. */
export const requestPasswordRecovery = createServerFn({ method: "POST" })
  .inputValidator((data: { studentId?: string; email?: string }) => data)
  .handler(async ({ data }) => {
    const sid = data.studentId?.trim();
    const email = data.email?.trim().toLowerCase();
    if (!sid && !email) throw new Error("학번 또는 이메일을 입력하세요.");
    const lookupEmail = sid ? `${sid}@${STUDENT_DOMAIN}` : email!;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, student_id, email")
      .eq("email", lookupEmail)
      .maybeSingle();
    if (!profile) throw new Error("등록된 계정을 찾을 수 없습니다.");

    // Avoid duplicate pending requests
    const { data: existing } = await supabaseAdmin
      .from("password_recovery_requests")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return { ok: true, alreadyPending: true as const };

    const { error } = await supabaseAdmin.from("password_recovery_requests").insert({
      user_id: profile.id,
      identifier: profile.student_id ?? profile.email,
      full_name: profile.full_name,
      role: profile.role,
    });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyPending: false as const };
  });

/** Admin issues a temp password for a recovery request. */
export const issueTempPasswordForRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => data)
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("관리자 권한이 필요합니다.");

    const { data: req } = await supabaseAdmin
      .from("password_recovery_requests")
      .select("id, user_id, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!req) throw new Error("신청을 찾을 수 없습니다.");

    const tempPw = genTempPassword();
    const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(req.user_id, { password: tempPw });
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin
      .from("password_recovery_requests")
      .update({ status: "completed", temp_password: tempPw, completed_at: new Date().toISOString() })
      .eq("id", req.id);

    return { tempPassword: tempPw };
  });
