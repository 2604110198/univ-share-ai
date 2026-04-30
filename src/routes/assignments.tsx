import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { FileUp, ChevronRight } from "lucide-react";
import { WEEKDAY_LABEL } from "@/lib/format";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "과제 제출 — 반도체장비소프트웨어학과" }] }),
  component: AssignmentsPage,
});

interface Course { id: string; name: string; weekday: string; professor_name: string | null }

function AssignmentsPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("courses").select("id, name, weekday, professor_name").order("name");
      const list = (data ?? []) as Course[];
      setCourses(list);
      // count assignment posts per course
      const { data: posts } = await supabase.from("posts").select("course_id").eq("category", "assignment");
      const cmap: Record<string, number> = {};
      (posts ?? []).forEach((p) => {
        if (p.course_id) cmap[p.course_id] = (cmap[p.course_id] ?? 0) + 1;
      });
      setCounts(cmap);
      setBusy(false);
    })();
  }, [user]);

  if (loading || !profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <PageHeader
          icon={FileUp}
          title="과제 제출"
          description="강의를 선택하면 해당 강의의 과제 공지와 제출물이 표시됩니다."
        />

        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
            등록된 강의가 없습니다.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <Link
                key={c.id}
                to="/assignments/$courseId"
                params={{ courseId: c.id }}
                className="group rounded-lg border border-border bg-card p-5 hover:border-accent hover:shadow-elevated transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      {WEEKDAY_LABEL[c.weekday]}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-primary mb-2 line-clamp-2">{c.name}</h3>
                    <div className="text-xs text-muted-foreground">
                      담당 {c.professor_name ?? "—"}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent" />
                </div>
                <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                  과제 {counts[c.id] ?? 0}건
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
