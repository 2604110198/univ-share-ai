import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABEL } from "@/lib/format";
import { SCHOOL_NAME, DEPARTMENT_NAME } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMyNotifications, markRead, markAllRead, type NotificationRow } from "@/lib/notifications";
import { formatPostDate } from "@/lib/format";

const NAV = [
  { to: "/dashboard", label: "강의실", icon: BookOpen },
  { to: "/library", label: "자료실", icon: GraduationCap },
  { to: "/assignments", label: "과제 제출", icon: FileUp },
  { to: "/notices", label: "공지사항", icon: Megaphone },
  { to: "/inquiries", label: "1:1 문의", icon: MessageSquare },
  { to: "/admin", label: "관리실", icon: Settings, adminOnly: true },
] as const;

export function SiteHeader() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    const rows = await fetchMyNotifications(user.id);
    setNotifications(rows);
  }, [user]);

  useEffect(() => { load(); }, [load, pathname]);

  const unread = notifications.filter((n) => !n.read_at).length;

  const onNotifClick = async (n: NotificationRow) => {
    if (!n.read_at) {
      await markRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    }
    if (n.link) navigate({ to: n.link });
  };

  const onMarkAll = async () => {
    if (!user) return;
    await markAllRead(user.id);
    setNotifications((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
  };

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (to === "/admin" && profile?.role !== "admin") {
      e.preventDefault();
      toast.error("접근 권한이 없습니다");
      return;
    }
    if (!user) {
      e.preventDefault();
      navigate({ to: "/login" });
    }
  };

  const nameColor = profile
    ? profile.role === "admin"
      ? "text-red-400"
      : profile.role === "professor"
        ? "text-blue-300"
        : (profile.role === "student" && profile.can_write_notice)
          ? "text-orange-300"
          : "text-primary-foreground"
    : "text-primary-foreground";

  const dropdownNameColor = profile
    ? profile.role === "admin"
      ? "text-red-600"
      : profile.role === "professor"
        ? "text-blue-600"
        : (profile.role === "student" && profile.can_write_notice)
          ? "text-orange-500"
          : "text-foreground"
    : "text-foreground";

  const roleSuffix = profile
    ? profile.role === "admin"
      ? " 관리자님 환영합니다"
      : profile.role === "professor"
        ? " 교수님 환영합니다"
        : (profile.role === "student" && profile.can_write_notice)
          ? " 과대표님 환영합니다"
          : "님 환영합니다"
    : "";

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30 shadow-paper">
      {/* Top utility strip — larger school name */}
      <div className="border-b border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 min-h-14 py-2.5 flex items-center justify-between gap-4 text-xs">
          <span className="font-serif text-lg md:text-xl font-bold tracking-wide leading-tight">{SCHOOL_NAME}</span>
          <div className="flex items-center gap-3 opacity-95">
            {user && profile ? (
              <>
                <span className="hidden sm:inline font-semibold">
                  <span className={nameColor}>{profile.full_name}</span>{roleSuffix}
                </span>
                <span className="opacity-60">|</span>
                <Link to="/profile" className="hover:underline">개인정보 수정</Link>
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

        {/* Right cluster: bell + profile menu */}
        <div className="flex items-center gap-2 shrink-0">
          {user && profile ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                    aria-label="알림"
                  >
                    <Bell className="h-4 w-4" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-[480px] overflow-auto">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="p-0">알림 ({unread} 미확인)</DropdownMenuLabel>
                    {unread > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkAll}>
                        <CheckCheck className="h-3.5 w-3.5 mr-1" /> 모두 읽음
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">새 알림이 없습니다.</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => onNotifClick(n)}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-secondary border-l-2 transition-colors",
                          n.read_at ? "border-transparent" : "border-accent bg-accent/5",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[10px] uppercase font-bold tracking-wider", n.read_at ? "text-muted-foreground" : "text-accent")}>
                            {labelOfKind(n.kind)}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{formatPostDate(n.created_at)}</span>
                        </div>
                        <div className={cn("text-sm mt-0.5", n.read_at ? "" : "font-semibold")}>{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground line-clamp-1">{n.body}</div>}
                      </button>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md hover:bg-secondary transition-colors">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                      {profile.full_name.slice(0, 1)}
                    </div>
                    <span className={cn("hidden sm:inline text-sm font-medium", dropdownNameColor)}>{profile.full_name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className={cn("font-medium", dropdownNameColor)}>{profile.full_name}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {profile.role === "student" && profile.can_write_notice ? "과대표" : ROLE_LABEL[profile.role]}
                      {profile.student_id ? ` · ${profile.student_id}` : ` · ${profile.email}`}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                    <UserCog className="h-4 w-4 mr-2" /> 회원 정보 변경
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/inquiries" })}>
                    <MessageSquare className="h-4 w-4 mr-2" /> 1:1 문의함
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
            <div className="hidden md:block text-xs text-muted-foreground">로그인이 필요합니다.</div>
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
        </div>
      </nav>
    </header>
  );
}

function labelOfKind(kind: string): string {
  switch (kind) {
    case "notice": return "공지";
    case "course_notice": return "강의공지";
    case "assignment": return "과제";
    case "recovery_request": return "복구신청";
    case "temp_password": return "임시 비밀번호";
    default: return kind;
  }
}
