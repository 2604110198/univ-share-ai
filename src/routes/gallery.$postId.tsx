import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, ImageOff } from "lucide-react";
import { galleryImageUrl } from "@/lib/attachments";
import { formatPostDate } from "@/lib/format";
import { toast } from "sonner";
import { PostComments } from "@/components/post-comments";

export const Route = createFileRoute("/gallery/$postId")({
  head: () => ({ meta: [{ title: "이미지 게시글 — 반도체장비소프트웨어학과" }] }),
  component: GalleryDetailPage,
});

interface PostRow { id: string; title: string; content: string | null; author_name: string; author_id: string; created_at: string }

function GalleryDetailPage() {
  const { postId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostRow | null>(null);
  const [images, setImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await supabase.rpc("increment_post_view", { _post_id: postId });
      const { data: p } = await supabase
        .from("posts")
        .select("id, title, content, author_name, author_id, created_at")
        .eq("id", postId).maybeSingle();
      setPost(p as PostRow | null);
      const { data: atts } = await supabase
        .from("post_attachments")
        .select("id, file_name, storage_path")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      setImages((atts ?? []).map((a) => ({ id: a.id, name: a.file_name, url: galleryImageUrl(a.storage_path) })));
      setBusy(false);
    })();
  }, [user, postId]);

  if (loading || busy) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user) return null;

  const canDelete = post && (post.author_id === user.id || profile?.role === "admin");

  const onDelete = async () => {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) toast.error("삭제 실패", { description: error.message });
    else { toast.success("삭제되었습니다"); navigate({ to: "/gallery" }); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-10">
        <Link to="/gallery" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> 이미지 게시판
        </Link>

        {!post ? (
          <div className="text-center text-muted-foreground py-20">게시글을 찾을 수 없습니다.</div>
        ) : (
          <article className="rounded-lg border border-border bg-card p-6 md:p-8">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">{post.title}</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                  {post.author_name} · {formatPostDate(post.created_at)}
                </div>
              </div>
              {canDelete && (
                <Button variant="outline" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-1" /> 삭제
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {images.length === 0 ? (
                <div className="aspect-video grid place-items-center bg-secondary rounded-md text-muted-foreground">
                  <ImageOff className="h-8 w-8" />
                </div>
              ) : images.map((img) => (
                <img key={img.id} src={img.url} alt={img.name} className="w-full rounded-md border border-border" />
              ))}
            </div>

            {post.content && (
              <div className="mt-6 pt-6 border-t border-border whitespace-pre-wrap text-sm leading-relaxed">
                {post.content}
              </div>
            )}
          </article>
        )}

        {post && profile && <PostComments postId={post.id} profile={profile} />}
      </main>
    </div>
  );
}
