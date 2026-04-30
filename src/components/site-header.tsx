import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABEL } from "@/lib/format";
import { SCHOOL_NAME, DEPARTMENT_NAME } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { LogOut, GraduationCap, BookOpen, FileUp, Megaphone, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "강의실", icon: BookOpen },
  { to: "/library", label: "자료실", icon: GraduationCap },
  { to: "/assignments", label: "과제 제출", icon: FileUp },
  { to: "/notices", label: "공지사항", icon: Megaphone },
  { to: "/inquiries", label: "1:1 문의", icon: MessageSquare },
] as const;

export function SiteHeader() {
  const { profile, user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30 shadow-paper">
      {/* Top: school identity */}
      <div className="border-b border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 h-9 flex items-center justify-between text-[11px]">
          <span className="tracking-wider">{SCHOOL_NAME}</span>
          {user && profile && (
            <div className="flex items-center gap-3">
              <span className="opacity-80">
                {ROLE_LABEL[profile.role]} · {profile.full_name}
                {profile.student_id ? ` (${profile.student_id})` : ""}
              </span>
              <button onClick={() => signOut()} className="hover:underline inline-flex items-center gap-1">
                <LogOut className="h-3 w-3" /> 로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle: department + nav */}
      <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground grid place-items-center shadow-paper">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Kopo · Semiconductor Campus</div>
            <div className="font-serif font-bold text-xl text-primary">{DEPARTMENT_NAME}</div>
          </div>
        </Link>

        {!user && (
          <Link to="/login">
            <Button>로그인</Button>
          </Link>
        )}
      </div>

      {/* Bottom: navigation */}
      {user && profile && (
        <nav className="border-t border-border bg-secondary/50">
          <div className="mx-auto max-w-7xl px-6 flex items-center gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 h-11 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-accent text-primary"
                      : "border-transparent text-muted-foreground hover:text-primary hover:border-border",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            {profile.role === "admin" && (
              <Link
                to="/admin"
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 h-11 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ml-auto",
                  pathname.startsWith("/admin")
                    ? "border-accent text-primary"
                    : "border-transparent text-muted-foreground hover:text-primary hover:border-border",
                )}
              >
                <Settings className="h-4 w-4" />
                디스크 관리
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
