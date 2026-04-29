import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";

export function SiteHeader() {
  const { profile, user, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center shadow-paper">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-serif font-bold text-lg text-primary">Campus Drive</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">University Disk</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {user && profile ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary transition-colors">
                대시보드
              </Link>
              {profile.role === "admin" && (
                <Link to="/admin" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary transition-colors">
                  관리자
                </Link>
              )}
              <div className="hidden md:flex items-center gap-2 px-3 ml-2 border-l border-border">
                <div className="text-right leading-tight">
                  <div className="text-sm font-medium">{profile.full_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {ROLE_LABEL[profile.role]}{profile.student_id ? ` · ${profile.student_id}` : ""}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-1.5" />
                로그아웃
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="default" size="sm">로그인</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
