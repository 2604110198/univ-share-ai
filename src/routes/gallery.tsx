import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Images, Plus, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { galleryImageUrl } from "@/lib/attachments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [{ title: "이미지 게시판 — 반도체장비소프트웨어학과" }] }),
  component: GalleryListPage,
});

const PAGE_SIZE = 12;

interface Item { id: string; title: string; author_name: string; created_at: string; thumb: string | null }

function GalleryListPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title, author_name, created_at")
        .eq("category", "gallery")
        .order("created_at", { ascending: false });
      const ids = (posts ?? []).map((p) => p.id);
      let attMap = new Map<string, string>();
      if (ids.length) {
        const { data: atts } = await supabase
          .from("post_attachments")
          .select("post_id, storage_path, is_cover, display_order, created_at")
          .in("post_id", ids)
          .order("is_cover", { ascending: false })
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });
        for (const a of atts ?? []) {
          if (!attMap.has(a.post_id)) attMap.set(a.post_id, galleryImageUrl(a.storage_path));
        }
      }
      setItems((posts ?? []).map((p) => ({
        id: p.id, title: p.title, author_name: p.author_name, created_at: p.created_at,
        thumb: attMap.get(p.id) ?? null,
      })));
      setBusy(false);
    })();
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user) return null;
  if (pathname !== "/gallery") return <Outlet />;
  const canWrite = profile?.role === "professor" || profile?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <PageHeader
          icon={Images}
          title="이미지 게시판"
          description="학과 행사, 활동 사진을 공유합니다."
          action={canWrite && (
            <Link to="/post/new" search={{ category: "gallery" }}>
              <Button><Plus className="h-4 w-4 mr-1" /> 이미지 글 작성</Button>
            </Link>
          )}
        />

        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card py-20 text-center text-muted-foreground">
            게시된 이미지가 없습니다.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pageItems.map((it) => (
                <Link
                  key={it.id}
                  to="/gallery/$postId"
                  params={{ postId: it.id }}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
                >
                  {it.thumb ? (
                    <img src={it.thumb} alt={it.title} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center"><ImageOff className="h-8 w-8 text-muted-foreground" /></div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-center">
                    <div className="text-white text-sm font-medium line-clamp-1">{it.title}</div>
                    <div className="text-white/70 text-[11px]">{it.author_name}</div>
                  </div>
                </Link>
              ))}
            </div>

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
