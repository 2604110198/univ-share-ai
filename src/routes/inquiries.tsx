import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { PostTable, type PostListItem } from "@/components/post-table";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";

export const Route = createFileRoute("/inquiries")({
  head: () => ({ meta: [{ title: "1:1 문의 — 반도체장비소프트웨어학과" }] }),
  component: InquiriesPage,
});

function InquiriesPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // RLS already filters: only author / target professor / admin
      const { data } = await supabase.from("posts")
        .select("id, title, author_name, author_role, view_count, created_at")
        .eq("category", "inquiry")
        .order("created_at", { ascending: false });
      setPosts((data ?? []) as PostListItem[]);
      setBusy(false);
    })();
  }, [user]);

  if (loading || !profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <PageHeader
          icon={MessageSquare}
          title="1:1 문의"
          description="작성자, 지정한 교수, 관리자만 열람할 수 있는 비공개 문의입니다."
          action={
            <Link to="/post/new" search={{ category: "inquiry" }}>
              <Button><Plus className="h-4 w-4 mr-1" /> 문의 작성</Button>
            </Link>
          }
        />
        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : (
          <PostTable posts={posts} showCourse={false} emptyText="작성한 문의가 없습니다." />
        )}
      </main>
    </div>
  );
}
