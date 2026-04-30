import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { PostTable, type PostListItem } from "@/components/post-table";
import { Button } from "@/components/ui/button";
import { FileUp, Plus, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/assignments/$courseId")({
  head: () => ({ meta: [{ title: "강의 과제 — 반도체장비소프트웨어학과" }] }),
  component: CourseAssignmentsPage,
});

interface Course { id: string; name: string; professor_name: string | null; professor_id: string | null }

function CourseAssignmentsPage() {
  const { courseId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("courses").select("id, name, professor_name, professor_id").eq("id", courseId).maybeSingle();
      setCourse(c as Course | null);
      const { data: ps } = await supabase.from("posts")
        .select("id, title, author_name, author_role, view_count, created_at, due_date, is_pinned")
        .eq("course_id", courseId).eq("category", "assignment")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      setPosts((ps ?? []) as PostListItem[]);
      setBusy(false);
    })();
  }, [user, courseId]);

  if (loading || !profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;

  const canWriteAssignment = profile.role === "admin" ||
    (profile.role === "professor" && course?.professor_id === profile.id);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <Link to="/assignments" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> 강의 목록으로
        </Link>
        <PageHeader
          icon={FileUp}
          title={course?.name ?? "—"}
          description={`담당 ${course?.professor_name ?? "—"} · 과제 게시판`}
          action={canWriteAssignment && (
            <Link to="/post/new" search={{ category: "assignment", courseId }}>
              <Button><Plus className="h-4 w-4 mr-1" /> 과제 공지 등록</Button>
            </Link>
          )}
        />

        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : (
          <PostTable posts={posts} showCourse={false} emptyText="등록된 과제가 없습니다." />
        )}
      </main>
    </div>
  );
}
