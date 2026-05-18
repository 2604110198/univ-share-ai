import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STUDENT_DOMAIN = "students.campus.local";

/** Derive a 32-byte AES key from the service-role secret (already private). */
async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptPw(plain: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return { ciphertext: b64(ct), iv: b64(iv) };
}
async function decryptPw(ciphertext: string, iv: string): Promise<string> {
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ciphertext));
  return new TextDecoder().decode(pt);
}

function maskTail(pw: string): string {
  if (pw.length <= 2) return "**";
  return pw.slice(0, 2) + "*".repeat(pw.length - 2);
}

/** Store / update a user's password hint. Call right after signup or password change. */
export const storePasswordHint = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; password: string }) => data)
  .handler(async ({ data }) => {
    if (!data.userId || !data.password) throw new Error("invalid input");
    const enc = await encryptPw(data.password);
    const { error } = await supabaseAdmin
      .from("password_hints")
      .upsert({ user_id: data.userId, ciphertext: enc.ciphertext, iv: enc.iv, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Look up the user by student id or email and return the masked password hint. */
export const lookupPasswordHint = createServerFn({ method: "POST" })
  .inputValidator((data: { studentId?: string; email?: string }) => data)
  .handler(async ({ data }) => {
    const sid = data.studentId?.trim();
    const email = data.email?.trim().toLowerCase();
    if (!sid && !email) throw new Error("학번 또는 이메일을 입력하세요.");
    const lookupEmail = sid ? `${sid}@${STUDENT_DOMAIN}` : email!;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, student_id")
      .eq("email", lookupEmail)
      .maybeSingle();
    if (!profile) throw new Error("등록된 계정을 찾을 수 없습니다.");

    const { data: hint } = await supabaseAdmin
      .from("password_hints")
      .select("ciphertext, iv")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!hint) {
      return {
        found: false as const,
        fullName: profile.full_name,
        identifier: profile.student_id ?? profile.email,
      };
    }
    const plain = await decryptPw(hint.ciphertext, hint.iv);
    return {
      found: true as const,
      fullName: profile.full_name,
      identifier: profile.student_id ?? profile.email,
      masked: maskTail(plain),
    };
  });
