import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { PostTable, type PostListItem } from "@/components/post-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Search, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "자료실 — 반도체장비소프트웨어학과" }] }),
  component: LibraryPage,
});

interface Row extends PostListItem {}

function LibraryPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: posts } = await supabase.from("posts")
        .select("id, title, author_name, author_role, view_count, created_at, course_id")
        .eq("category", "material")
        .order("created_at", { ascending: false });
      const courseIds = Array.from(new Set((posts ?? []).map((p) => p.course_id).filter(Boolean) as string[]));
      const { data: courses } = courseIds.length
        ? await supabase.from("courses").select("id, name").in("id", courseIds)
        : { data: [] as { id: string; name: string }[] };
      const cmap = new Map((courses ?? []).map((c) => [c.id, c.name]));
      setRows((posts ?? []).map((p) => ({
        ...p,
        course_name: p.course_id ? cmap.get(p.course_id) ?? null : null,
      })) as Row[]);
      setBusy(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      r.title.toLowerCase().includes(t) ||
      r.author_name.toLowerCase().includes(t) ||
      (r.course_name ?? "").toLowerCase().includes(t),
    );
  }, [rows, q]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user) return null;

  const canWrite = !profile || profile.role === "professor" || profile.role === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <PageHeader
          icon={GraduationCap}
          title="자료실"
          description="강의 자료, 참고 문서 등 학과의 모든 학습 자료가 모입니다."
          action={canWrite && (
            <Link to="/post/new" search={{ category: "material" }}>
              <Button><Plus className="h-4 w-4 mr-1" /> 자료 업로드</Button>
            </Link>
          )}
        />

        <div className="relative mb-4 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목, 강의명, 교수 이름으로 검색..."
            className="pl-9"
          />
        </div>

        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : (
          <PostTable posts={filtered} emptyText={q ? "검색 결과가 없습니다." : "등록된 자료가 없습니다."} />
        )}
      </main>
    </div>
  );
}
