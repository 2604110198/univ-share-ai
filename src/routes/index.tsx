import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { FolderOpen, Upload, ShieldCheck, GraduationCap, Clock, Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Drive — 대학 파일 공유 플랫폼" },
      { name: "description", content: "학생과 교수가 안전하게 파일을 공유하고 과제를 제출하는 대학 인터넷 디스크" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, user, profile, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent)_0%,_transparent_45%)] opacity-20 pointer-events-none" />
          <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                대학 공식 파일 공유 플랫폼
              </div>
              <h1 className="text-5xl md:text-6xl font-serif font-bold leading-[1.05] text-primary">
                강의 자료와 과제를<br />
                <span className="text-accent">한 곳에서</span> 안전하게.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                교수님은 강의 자료를 업로드하고 과제 폴더를 만들어 마감일을 설정합니다.
                학생은 사전 등록된 학번으로만 가입해 자신의 과제를 제출할 수 있습니다.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/login">
                  <Button size="lg" className="font-medium">로그인하여 시작하기</Button>
                </Link>
                <Link to="/signup">
                  <Button size="lg" variant="outline" className="font-medium">회원가입</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: GraduationCap, title: "교수 전용 자료실", desc: "교수님이 직접 강의 폴더를 만들고 자료를 업로드합니다. 모든 학생이 자유롭게 다운로드할 수 있습니다." },
                { icon: Upload, title: "과제 제출", desc: "교수님이 마감일을 설정한 과제 폴더에 학생이 파일을 제출합니다. 본인 제출물만 열람 가능합니다." },
                { icon: ShieldCheck, title: "사전 등록 인증", desc: "관리자가 등록한 학번과 교수 이메일만 가입할 수 있어 외부인의 접근을 원천 차단합니다." },
                { icon: FolderOpen, title: "최대 500MB", desc: "발표 자료, 영상 과제까지 한 번에 업로드. 파일당 최대 500MB를 지원합니다." },
                { icon: Clock, title: "마감 시간 자동 관리", desc: "마감 시간이 지나면 학생의 제출이 자동으로 차단되어 공정한 과제 관리가 가능합니다." },
                { icon: Lock, title: "권한별 접근 제어", desc: "관리자/교수/학생 권한이 분리되어 각자에게 허용된 파일만 볼 수 있습니다." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-lg border border-border bg-card p-6 shadow-paper">
                  <div className="h-10 w-10 rounded-md bg-secondary text-primary grid place-items-center mb-4">
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

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Campus Drive · University File Sharing
      </footer>
    </div>
  );
}
