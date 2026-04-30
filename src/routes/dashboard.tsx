import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { WEEKDAY_LABEL, WEEKDAY_ORDER } from "@/lib/format";
import { BookOpen, Clock, MapPin, User } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "강의실 — 반도체장비소프트웨어학과" }] }),
  component: DashboardPage,
});

interface Course {
  id: string;
  name: string;
  weekday: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
  professor_name: string | null;
}

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("courses").select("*").order("start_time");
      setCourses((data ?? []) as Course[]);
      setLoadingCourses(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <PageHeader
          icon={BookOpen}
          title="강의실"
          description={`${profile?.full_name ?? ""}님, 이번 학기 시간표입니다.`}
        />

        {loadingCourses ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
            등록된 강의가 없습니다.
            {profile?.role === "admin" && <div className="mt-2 text-sm">디스크 관리에서 강의를 등록할 수 있습니다.</div>}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {WEEKDAY_ORDER.map((day) => {
              const dayCourses = courses.filter((c) => c.weekday === day);
              return (
                <div key={day} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="bg-primary text-primary-foreground px-3 py-2 text-sm font-bold font-serif text-center">
                    {WEEKDAY_LABEL[day]}
                  </div>
                  <div className="p-3 space-y-2 min-h-32">
                    {dayCourses.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-6">강의 없음</div>
                    ) : (
                      dayCourses.map((c) => (
                        <div key={c.id} className="rounded-md border border-border p-3 bg-background hover:border-accent transition-colors">
                          <div className="font-bold text-sm mb-1">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.start_time.slice(0, 5)} ~ {c.end_time.slice(0, 5)}</div>
                            {c.classroom && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.classroom}</div>}
                            {c.professor_name && <div className="flex items-center gap-1"><User className="h-3 w-3" /> {c.professor_name}</div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
