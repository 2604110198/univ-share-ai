import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, ImageOff, Images, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { galleryImageUrl, uploadGalleryEditorImages } from "@/lib/attachments";
import { formatPostDate } from "@/lib/format";
import { toast } from "sonner";
import { PostComments } from "@/components/post-comments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GalleryPostEditor,
  createInitialGalleryBlocks,
  ensureSingleCover,
  parseGalleryDocument,
  serializeGalleryDocument,
  type GalleryEditorBlock,
  type GalleryImageAlign,
  type GallerySavedBlock,
} from "@/components/gallery-post-editor";

export const Route = createFileRoute("/gallery/$postId")({
  head: () => ({ meta: [{ title: "이미지 게시글 — 반도체장비소프트웨어학과" }] }),
  component: GalleryDetailPage,
});

interface PostRow { id: string; title: string; content: string | null; author_name: string; author_id: string; created_at: string }
interface ImgItem { id: string; url: string; name: string }

function GalleryDetailPage() {
  const { postId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostRow | null>(null);
  const [images, setImages] = useState<ImgItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

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

  const showPrev = () => setLightbox((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  const showNext = () => setLightbox((i) => (i === null ? null : (i + 1) % images.length));

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10">
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
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="inline-flex items-center gap-1">
                  <Images className="h-3 w-3" /> 사진 {images.length}장
                </Badge>
                {canDelete && (
                  <Button variant="outline" size="sm" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-1" /> 삭제
                  </Button>
                )}
              </div>
            </div>

            {images.length === 0 ? (
              <div className="aspect-video grid place-items-center bg-secondary rounded-md text-muted-foreground">
                <ImageOff className="h-8 w-8" />
              </div>
            ) : (
              <>
                {/* Hero image */}
                <button
                  type="button"
                  onClick={() => setLightbox(0)}
                  className="block w-full rounded-md overflow-hidden border border-border bg-secondary"
                >
                  <img src={images[0].url} alt={images[0].name} className="w-full max-h-[560px] object-contain bg-black/5" />
                </button>

                {/* Grid of remaining images */}
                {images.length > 1 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {images.slice(1).map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setLightbox(idx + 1)}
                        className="relative aspect-square rounded-md overflow-hidden border border-border bg-secondary group"
                      >
                        <img src={img.url} alt={img.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {post.content && (
              <div className="mt-6 pt-6 border-t border-border whitespace-pre-wrap text-sm leading-relaxed">
                {post.content}
              </div>
            )}
          </article>
        )}

        {post && profile && <PostComments postId={post.id} profile={profile} />}
      </main>

      {/* Lightbox */}
      <Dialog open={lightbox !== null} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-5xl bg-black/95 border-none p-2 sm:p-4">
          {lightbox !== null && images[lightbox] && (
            <div className="relative">
              <img
                src={images[lightbox].url}
                alt={images[lightbox].name}
                className="w-full max-h-[80vh] object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={showPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white grid place-items-center"
                    aria-label="이전"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={showNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white grid place-items-center"
                    aria-label="다음"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/60 rounded-full px-3 py-1">
                    {lightbox + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
