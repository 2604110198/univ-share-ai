import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { PostTable, type PostListItem } from "@/components/post-table";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notices")({
  head: () => ({ meta: [{ title: "공지사항 — 반도체장비소프트웨어학과" }] }),
  component: NoticesPage,
});

const PAGE_SIZE = 10;

function NoticesPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("posts")
        .select("id, title, author_name, author_role, view_count, created_at, is_pinned")
        .eq("category", "notice")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      setPosts((data ?? []) as PostListItem[]);
      setBusy(false);
    })();
  }, [user]);

  const pinned = useMemo(() => posts.filter((p) => p.is_pinned), [posts]);
  const rest = useMemo(() => posts.filter((p) => !p.is_pinned), [posts]);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageRest = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visible = [...pinned, ...pageRest];

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user) return null;
  const canWrite = profile?.role === "professor" || profile?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <PageHeader
          icon={Megaphone}
          title="공지사항"
          description="학교, 학과, 수업 공지를 한 곳에서 확인하세요."
          action={canWrite && (
            <Link to="/post/new" search={{ category: "notice" }}>
              <Button><Plus className="h-4 w-4 mr-1" /> 공지 작성</Button>
            </Link>
          )}
        />
        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : (
          <>
            <PostTable posts={visible} showCourse={false} emptyText="등록된 공지가 없습니다." />
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      "h-8 min-w-8 px-2 rounded-md text-sm",
                      n === page ? "bg-primary text-primary-foreground font-bold" : "hover:bg-secondary text-muted-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
