import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { FileUp, ChevronRight, AlertTriangle, Bell, Clock } from "lucide-react";
import { WEEKDAY_LABEL } from "@/lib/format";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "과제 제출 — 반도체장비소프트웨어학과" }] }),
  component: AssignmentsPage,
});

interface Course { id: string; name: string; weekday: string; professor_name: string | null }
interface Assignment {
  id: string; title: string; course_id: string | null;
  due_date: string | null; created_at: string; author_name: string;
}

function timeLeft(due: string): { label: string; urgent: boolean; over: boolean } {
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return { label: "마감됨", urgent: false, over: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return { label: `D-${days}`, urgent: days <= 3, over: false };
  return { label: `${hours}시간 남음`, urgent: true, over: false };
}

function AssignmentsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cs }, { data: ps }] = await Promise.all([
        supabase.from("courses").select("id, name, weekday, professor_name").order("name"),
        supabase.from("posts")
          .select("id, title, course_id, due_date, created_at, author_name")
          .eq("category", "assignment")
          .order("created_at", { ascending: false }),
      ]);
      setCourses((cs ?? []) as Course[]);
      setAssignments((ps ?? []) as Assignment[]);
      setBusy(false);
    })();
  }, [user]);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    assignments.forEach((a) => { if (a.course_id) m[a.course_id] = (m[a.course_id] ?? 0) + 1; });
    return m;
  }, [assignments]);

  const latest = assignments[0];
  const upcoming = useMemo(
    () => assignments
      .filter((a) => a.due_date && new Date(a.due_date) >= new Date())
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()),
    [assignments],
  );
  const sortedByDue = useMemo(() => {
    return [...assignments].sort((a, b) => {
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [assignments]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <PageHeader
          icon={FileUp}
          title="과제 제출"
          description="과제 알림과 강의별 과제 보드를 확인하세요."
        />

        {/* Alerts */}
        {!busy && (latest || upcoming[0]) && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {latest && (
              <div className="rounded-lg border border-accent/40 bg-accent/5 p-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent mb-2">
                  <Bell className="h-3.5 w-3.5" /> 최신 과제 공지
                </div>
                <Link to="/post/$postId" params={{ postId: latest.id }} className="block">
                  <div className="font-serif font-bold text-primary text-lg line-clamp-2 hover:underline">
                    {latest.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {latest.course_id ? courseMap.get(latest.course_id) ?? "—" : "—"} · {latest.author_name}
                  </div>
                  {latest.due_date && (
                    <div className="text-xs mt-2 inline-flex items-center gap-1 text-accent font-medium">
                      <Clock className="h-3 w-3" /> {timeLeft(latest.due_date).label}
                    </div>
                  )}
                </Link>
              </div>
            )}
            {upcoming[0] && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-destructive mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> 마감 임박
                </div>
                <Link to="/post/$postId" params={{ postId: upcoming[0].id }} className="block">
                  <div className="font-serif font-bold text-primary text-lg line-clamp-2 hover:underline">
                    {upcoming[0].title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {upcoming[0].course_id ? courseMap.get(upcoming[0].course_id) ?? "—" : "—"}
                  </div>
                  <div className="text-xs mt-2 inline-flex items-center gap-1 text-destructive font-bold">
                    <Clock className="h-3 w-3" /> {timeLeft(upcoming[0].due_date!).label}
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Due-date sorted list */}
        <section className="mb-10">
          <h2 className="font-serif text-lg font-bold text-primary mb-3">마감 기한 순 과제</h2>
          {busy ? (
            <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
          ) : sortedByDue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              등록된 과제가 없습니다.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {sortedByDue.slice(0, 10).map((a) => {
                const tl = a.due_date ? timeLeft(a.due_date) : null;
                return (
                  <Link
                    key={a.id}
                    to="/post/$postId"
                    params={{ postId: a.id }}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-secondary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{a.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {a.course_id ? courseMap.get(a.course_id) ?? "—" : "—"} · {a.author_name}
                      </div>
                    </div>
                    {tl && (
                      <span className={`text-xs font-bold shrink-0 ${
                        tl.over ? "text-muted-foreground" : tl.urgent ? "text-destructive" : "text-accent"
                      }`}>
                        {tl.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Course boards */}
        <section>
          <h2 className="font-serif text-lg font-bold text-primary mb-3">강의별 과제 게시판</h2>
          {busy ? (
            <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
          ) : courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
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
                      <div className="text-xs text-muted-foreground">담당 {c.professor_name ?? "—"}</div>
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
        </section>
      </main>
    </div>
  );
}
