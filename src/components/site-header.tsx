import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABEL } from "@/lib/format";
import { SCHOOL_NAME, DEPARTMENT_NAME } from "@/lib/branding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GraduationCap,
  BookOpen,
  FileUp,
  Megaphone,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  UserCog,
  ChevronDown,
} from "lucide-react";
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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    // Get all inquiries the user can see (RLS filters), then subtract reads.
    const { data: visible } = await supabase
      .from("posts")
      .select("id, author_id, created_at")
      .eq("category", "inquiry");
    if (!visible) return;
    // Exclude items I authored that nobody replied to (still count if I'm target/admin and unread)
    const ids = visible.map((p) => p.id);
    if (ids.length === 0) { setUnread(0); return; }
    const { data: reads } = await supabase
      .from("post_reads")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", ids);
    const readSet = new Set((reads ?? []).map((r) => r.post_id));
    // Don't count items I authored as "unread for me"
    const count = visible.filter((p) => p.author_id !== user.id && !readSet.has(p.id)).length;
    setUnread(count);
  }, [user]);

  useEffect(() => { loadUnread(); }, [loadUnread, pathname]);

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (!user) {
      e.preventDefault();
      navigate({ to: "/login" });
    }
  };

  const greeting = profile
    ? profile.role === "admin"
      ? `${profile.full_name} 관리자님 환영합니다`
      : profile.role === "professor"
        ? `${profile.full_name} 교수님 환영합니다`
        : `${profile.full_name}님 환영합니다`
    : null;

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30 shadow-paper">
      {/* Top utility strip */}
      <div className="border-b border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 h-9 flex items-center justify-between text-[11px]">
          <span className="tracking-wider">{SCHOOL_NAME}</span>
          <div className="flex items-center gap-3 opacity-90">
            {user && profile ? (
              <>
                <span>{ROLE_LABEL[profile.role]}</span>
                <span className="opacity-60">|</span>
                <button onClick={() => signOut()} className="hover:underline inline-flex items-center gap-1">
                  <LogOut className="h-3 w-3" /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:underline">로그인</Link>
                <span className="opacity-60">|</span>
                <Link to="/signup" className="hover:underline">회원가입</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Brand row */}
      <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground grid place-items-center shadow-paper shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground truncate">
              Kopo · Semiconductor Campus
            </div>
            <div className="font-serif font-bold text-lg md:text-xl text-primary truncate">
              {DEPARTMENT_NAME}
            </div>
          </div>
        </Link>

        {/* Right cluster: welcome + bell + profile menu */}
        <div className="flex items-center gap-2 shrink-0">
          {user && profile ? (
            <>
              <span className="hidden md:inline text-xs text-muted-foreground mr-1">
                {greeting}
              </span>

              <Link
                to="/inquiries"
                className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                aria-label="메시지함"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md hover:bg-secondary transition-colors">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                      {profile.full_name.slice(0, 1)}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">{profile.full_name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium">{profile.full_name}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {ROLE_LABEL[profile.role]}
                      {profile.student_id ? ` · ${profile.student_id}` : ` · ${profile.email}`}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                    <UserCog className="h-4 w-4 mr-2" /> 회원 정보 변경
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/inquiries" })}>
                    <MessageSquare className="h-4 w-4 mr-2" /> 메시지함
                    {unread > 0 && (
                      <span className="ml-auto text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                        {unread}
                      </span>
                    )}
                  </DropdownMenuItem>
                  {profile.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                      <Settings className="h-4 w-4 mr-2" /> 관리실
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> 로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/login">
              <Button>로그인</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main nav — always visible */}
      <nav className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-6 flex items-center gap-1 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                onClick={(e) => handleNavClick(e, to)}
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
          {profile?.role === "admin" && (
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
              관리실
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
