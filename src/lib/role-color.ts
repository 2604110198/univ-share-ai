import type { AppRole } from "@/lib/auth-context";

/**
 * Return a tailwind class for a name displayed by role.
 * - admin: red
 * - professor: blue
 * - student + class-rep (can_write_notice): orange
 * - student: foreground (black-ish)
 */
export function roleColorClass(role: string | null | undefined, canWriteNotice?: boolean | null): string {
  if (role === "admin") return "text-red-600";
  if (role === "professor") return "text-blue-600";
  if (role === "student" && canWriteNotice) return "text-orange-500";
  return "text-foreground";
}

export function roleLabelOf(role: string | null | undefined, canWriteNotice?: boolean | null): string {
  if (role === "admin") return "관리자";
  if (role === "professor") return "교수";
  if (role === "student" && canWriteNotice) return "과대표";
  if (role === "student") return "학생";
  return role ?? "";
}

export type RoleLike = AppRole | string;
