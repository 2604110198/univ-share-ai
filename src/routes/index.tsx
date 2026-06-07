import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, FileUp, Megaphone, MessageSquare, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";
import { SCHOOL_NAME, DEPARTMENT_NAME } from "@/lib/branding";
import { ImageCarousel, type CarouselSlide } from "@/components/image-carousel";
import { supabase } from "@/integrations/supabase/client";
import { galleryImageUrl } from "@/lib/attachments";
import { getSetting, SETTING_KEYS } from "@/lib/site-settings";
import { AdminImageEditButton } from "@/components/banner-editor";

const SCHOOL_LINK = "https://www.kopo.ac.kr/semi/index.do";

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
  const isAdmin = profile?.role === "admin";

  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [schoolImg, setSchoolImg] = useState<string | null>(null);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);

  useEffect(() => {
    (async () => {
      const [b, s] = await Promise.all([
        getSetting(SETTING_KEYS.bannerImage),
        getSetting(SETTING_KEYS.schoolLinkImage),
      ]);
      setBannerUrl(b);
      setSchoolImg(s);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title, created_at")
        .eq("category", "gallery")
        .order("created_at", { ascending: false })
        .limit(3);
      const ids = (posts ?? []).map((p) => p.id);
      const thumbs = new Map<string, string>();
      if (ids.length) {
        const { data: atts } = await supabase
          .from("post_attachments")
          .select("post_id, storage_path, created_at")
          .in("post_id", ids)
          .order("created_at", { ascending: true });
        for (const a of atts ?? []) {
          if (!thumbs.has(a.post_id)) thumbs.set(a.post_id, galleryImageUrl(a.storage_path));
        }
      }
      setSlides((posts ?? []).map((p) => ({
        id: p.id, title: p.title, imageUrl: thumbs.get(p.id) ?? null, href: `/gallery/${p.id}`,
      })));
    })();
  }, []);

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
        {/* Hero with admin-editable banner background */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          {bannerUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent)_0%,_transparent_55%)] opacity-20 pointer-events-none" />

          {isAdmin && user && (
            <AdminImageEditButton
              settingKey={SETTING_KEYS.bannerImage}
              prefix="banner"
              userId={user.id}
              onUpdated={setBannerUrl}
              label="배너 편집"
            />
          )}

          <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 text-xs font-medium mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {SCHOOL_NAME}
              </div>
              {greeting && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 border border-accent text-primary text-sm font-bold shadow-paper mb-6">
                  <Sparkles className="h-4 w-4 text-accent" />
                  {greeting}
                </div>
              )}
              <h1
                className="text-4xl md:text-6xl font-bold leading-[1.15] break-keep tracking-tight"
                style={{ fontFamily: '"Black Han Sans", "Jua", "Noto Sans KR", sans-serif', letterSpacing: "0.01em" }}
              >
                <span className="whitespace-nowrap">{DEPARTMENT_NAME} </span>
                <span className="text-accent whitespace-nowrap">CTL</span>
              </h1>
              <div className="mt-3 text-sm md:text-base tracking-[0.18em] uppercase text-primary-foreground/70 font-medium">
                Semiconductor Equipment SW CTL
              </div>
              <p className="mt-6 text-[13px] sm:text-base md:text-lg text-primary-foreground/85 max-w-none leading-snug break-keep">
                <span className="block whitespace-nowrap">강의 자료·과제·공지사항을 한 곳에서 공유하는 반도체장비소프트웨어학과 전용 디스크입니다.</span>
                <span className="block whitespace-nowrap mt-1">교수와 학생 모두 강의실, 자료실, 과제, 1:1 문의를 편하게 이용할 수 있습니다.</span>
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

        {/* Features (center) flanked by gallery (left) and school link (right) */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-4 gap-8 items-start">
            {/* LEFT — Gallery */}
            <aside className="lg:col-span-1 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif text-lg font-bold text-primary">학과 갤러리</h3>
                <Link to="/gallery" className="text-xs text-muted-foreground hover:text-primary">전체보기 →</Link>
              </div>
              <ImageCarousel slides={slides} />
            </aside>

            {/* CENTER — Features */}
            <div className="lg:col-span-2">
              <div className="mb-10 text-center">
                <h2 className="font-serif text-3xl font-bold text-primary">학과 디스크 주요 기능</h2>
                <p className="mt-2 text-muted-foreground">교수와 학생을 위한 메뉴</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  { icon: BookOpen, title: "강의실", desc: "월요일부터 금요일까지의 강의 시간표를 한눈에 확인합니다." },
                  { icon: GraduationCap, title: "자료실", desc: "교수님이 업로드한 모든 강의 자료를 검색하고 다운로드합니다." },
                  { icon: FileUp, title: "과제 제출", desc: "강의별 과제 공지를 확인하고 마감 시간 내에 파일을 제출합니다." },
                  { icon: Megaphone, title: "공지사항", desc: "학사, 취업 등 학과의 모든 공지사항을 한 곳에서 봅니다." },
                  { icon: MessageSquare, title: "1:1 문의", desc: "지정한 교수님 또는 관리자에게만 비공개로 문의할 수 있습니다." },
                  { icon: ShieldCheck, title: "안전한 접근", desc: "사전 등록된 학번/이메일만 가입 가능, 외부 접근을 차단합니다." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-lg border border-border bg-card p-5 shadow-paper">
                    <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground grid place-items-center mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-base font-bold mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — School link */}
            <aside className="lg:col-span-1 lg:sticky lg:top-24">
              <h3 className="font-serif text-lg font-bold text-primary mb-2">학교 홈페이지</h3>
              <div className="relative">
                {isAdmin && user && (
                  <AdminImageEditButton
                    settingKey={SETTING_KEYS.schoolLinkImage}
                    prefix="school-link"
                    userId={user.id}
                    onUpdated={setSchoolImg}
                  />
                )}
                <a
                  href={SCHOOL_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative aspect-[16/9] rounded-lg overflow-hidden border border-border bg-primary text-primary-foreground group"
                >
                  {schoolImg ? (
                    <img src={schoolImg} alt="한국폴리텍대학교 반도체융합캠퍼스" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary to-primary/70">
                      <div className="text-center px-4">
                        <GraduationCap className="h-8 w-8 mx-auto mb-2 text-accent" />
                        <div className="font-serif font-bold text-sm">한국폴리텍대학교</div>
                        <div className="text-xs opacity-80">반도체융합캠퍼스</div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-black/50 text-white text-xs flex items-center justify-between">
                    <span>반도체융합캠퍼스 바로가기</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </div>
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground bg-card/40">
        © {new Date().getFullYear()} {SCHOOL_NAME} · {DEPARTMENT_NAME}
      </footer>
    </div>
  );
}
