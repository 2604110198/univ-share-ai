import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { PostTable, type PostListItem } from "@/components/post-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Megaphone, FileText, FileUp, Plus, Pin } from "lucide-react";
import { formatPostDate, WEEKDAY_LABEL } from "@/lib/format";

export const Route = createFileRoute("/course/$courseId")({
  head: () => ({ meta: [{ title: "강의 — 반도체장비소프트웨어학과" }] }),
  component: CoursePage,
});

interface Course {
  id: string;
  name: string;
  weekday: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
  professor_id: string | null;
  professor_name: string | null;
  description: string | null;
}

interface NoticeItem {
  id: string;
  title: string;
  author_name: string;
  created_at: string;
  is_pinned: boolean;
}

function CoursePage() {
  const { courseId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [materials, setMaterials] = useState<PostListItem[]>([]);
  const [assignments, setAssignments] = useState<PostListItem[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      setCourse(c as Course | null);

      const [noticeRes, matRes, assignRes] = await Promise.all([
        supabase.from("posts")
          .select("id, title, author_name, created_at, is_pinned")
          .eq("course_id", courseId).eq("category", "notice")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("posts")
          .select("id, title, author_name, author_role, view_count, created_at, is_pinned")
          .eq("course_id", courseId).eq("category", "material")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("posts")
          .select("id, title, author_name, author_role, view_count, created_at, due_date, is_pinned")
          .eq("course_id", courseId).eq("category", "assignment")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      setNotices((noticeRes.data ?? []) as NoticeItem[]);
      setMaterials((matRes.data ?? []) as PostListItem[]);
      setAssignments((assignRes.data ?? []) as PostListItem[]);
      setBusy(false);
    })();
  }, [user, courseId]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user || !profile) return null;

  const isAdmin = profile.role === "admin";
  const isOwningProf = profile.role === "professor" && course?.professor_id === profile.id;
  const canPostHere = isAdmin || isOwningProf;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> 강의실로
        </Link>

        <PageHeader
          icon={BookOpen}
          title={course?.name ?? "강의"}
          description={
            course
              ? `${WEEKDAY_LABEL[course.weekday]} ${course.start_time.slice(0,5)}~${course.end_time.slice(0,5)}` +
                (course.classroom ? ` · ${course.classroom}` : "") +
                (course.professor_name ? ` · 담당 ${course.professor_name}` : "")
              : ""
          }
        />

        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : (
          <div className="space-y-10">
            {/* Recent notices banner */}
            <section className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                <div className="inline-flex items-center gap-2 font-serif font-bold">
                  <Megaphone className="h-4 w-4 text-accent" /> 강의 공지사항
                </div>
                {canPostHere && (
                  <Link to="/post/new" search={{ category: "notice", courseId }}>
                    <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> 공지 작성</Button>
                  </Link>
                )}
              </div>
              <div className="divide-y divide-border">
                {notices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</div>
                ) : (
                  notices.map((n) => (
                    <Link key={n.id} to="/post/$postId" params={{ postId: n.id }}
                      className={`flex items-center justify-between p-3 hover:bg-secondary/40 ${n.is_pinned ? "bg-muted/40" : ""}`}>
                      <div className="min-w-0 flex items-center gap-2">
                        {n.is_pinned && <Pin className="h-3 w-3 text-accent shrink-0" />}
                        <span className={`truncate ${n.is_pinned ? "font-bold" : "font-medium"}`}>{n.title}</span>
                        <Badge variant="outline" className="ml-1 shrink-0">{n.author_name}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-3">{formatPostDate(n.created_at)}</span>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* Materials */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-bold inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" /> 강의 자료 ({materials.length})
                </h2>
                {canPostHere && (
                  <Link to="/post/new" search={{ category: "material", courseId }}>
                    <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> 자료 등록</Button>
                  </Link>
                )}
              </div>
              <PostTable posts={materials} showCourse={false} emptyText="등록된 자료가 없습니다." />
            </section>

            {/* Assignments */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-bold inline-flex items-center gap-2">
                  <FileUp className="h-4 w-4" /> 과제 ({assignments.length})
                </h2>
                {canPostHere && (
                  <Link to="/post/new" search={{ category: "assignment", courseId }}>
                    <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> 과제 등록</Button>
                  </Link>
                )}
              </div>
              <PostTable posts={assignments} showCourse={false} emptyText="등록된 과제가 없습니다." />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
