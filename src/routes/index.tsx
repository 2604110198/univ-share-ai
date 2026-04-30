import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, FileUp, Megaphone, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { SCHOOL_NAME, DEPARTMENT_NAME } from "@/lib/branding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${DEPARTMENT_NAME} 디스크 — ${SCHOOL_NAME}` },
      { name: "description", content: `${SCHOOL_NAME} ${DEPARTMENT_NAME} 학생과 교수가 강의 자료, 과제, 공지사항을 공유하는 학과 전용 디스크` },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile } = useAuth();

  const greeting = profile
    ? profile.role === "admin"
      ? `${profile.full_name} 관리자님, 환영합니다.`
      : profile.role === "professor"
        ? `${profile.full_name} 교수님, 환영합니다.`
        : `${profile.full_name}님, 환영합니다.`
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent)_0%,_transparent_55%)] opacity-25 pointer-events-none" />
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 text-xs font-medium mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {SCHOOL_NAME}
              </div>
              {greeting && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/40 text-accent-foreground/90 text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4 text-accent" />
                  {greeting}
                </div>
              )}
              <h1 className="text-4xl md:text-6xl font-serif font-bold leading-[1.1]">
                {DEPARTMENT_NAME}<br />
                <span className="text-accent">학과 전용 디스크</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-primary-foreground/80 max-w-xl leading-relaxed">
                강의 자료, 과제 제출, 공지사항, 1:1 문의까지 한 곳에서.
                관리자가 등록한 학번과 교수 이메일만 가입 가능합니다.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                {user ? (
                  <Link to="/dashboard"><Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">강의실로 이동</Button></Link>
                ) : (
                  <>
                    <Link to="/login"><Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">로그인</Button></Link>
                    <Link to="/signup"><Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">회원가입</Button></Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-bold text-primary">학과 디스크 주요 기능</h2>
              <p className="mt-2 text-muted-foreground">교수와 학생을 위한 6가지 메뉴</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: BookOpen, title: "강의실", desc: "월요일부터 금요일까지의 강의 시간표를 한눈에 확인합니다." },
                { icon: GraduationCap, title: "자료실", desc: "교수님이 업로드한 모든 강의 자료를 검색하고 다운로드합니다." },
                { icon: FileUp, title: "과제 제출", desc: "강의별 과제 공지를 확인하고 마감 시간 내에 파일을 제출합니다." },
                { icon: Megaphone, title: "공지사항", desc: "학사, 취업 등 학과의 모든 공지사항을 한 곳에서 봅니다." },
                { icon: MessageSquare, title: "1:1 문의", desc: "지정한 교수님 또는 관리자에게만 비공개로 문의할 수 있습니다." },
                { icon: ShieldCheck, title: "안전한 접근", desc: "사전 등록된 학번/이메일만 가입 가능, 외부 접근을 차단합니다." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-lg border border-border bg-card p-6 shadow-paper">
                  <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground grid place-items-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground bg-card/40">
        © {new Date().getFullYear()} {SCHOOL_NAME} · {DEPARTMENT_NAME}
      </footer>
    </div>
  );
}
