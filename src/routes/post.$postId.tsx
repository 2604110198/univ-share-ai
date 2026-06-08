import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Download, Eye, Trash2, Paperclip, FileUp, Pencil, Check, X } from "lucide-react";
import { formatBytes, formatDate, ROLE_LABEL } from "@/lib/format";
import { downloadAttachment, uploadAttachments } from "@/lib/attachments";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PostComments } from "@/components/post-comments";

export const Route = createFileRoute("/post/$postId")({
  head: () => ({ meta: [{ title: "글 보기 — 반도체장비소프트웨어학과" }] }),
  component: PostPage,
});

interface Post {
  id: string; category: string; title: string; content: string | null;
  author_id: string; author_name: string; author_role: string;
  course_id: string | null; due_date: string | null; is_pinned: boolean;
  parent_post_id: string | null; inquiry_target_professor_id: string | null;
  view_count: number; created_at: string;
}
interface Attachment {
  id: string; file_name: string; storage_path: string; size_bytes: number; uploader_id: string; created_at: string;
}
interface Submission { id: string; title: string; author_name: string; created_at: string; author_id: string }

function PostPage() {
  const { postId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [courseName, setCourseName] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [busy, setBusy] = useState(true);

  // submission form
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submittingAns, setSubmittingAns] = useState(false);

  // edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const load = async () => {
    const { data: p } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
    if (!p) { toast.error("글을 찾을 수 없거나 접근 권한이 없습니다"); navigate({ to: "/dashboard" }); return; }
    setPost(p as Post);
    if (p.course_id) {
      const { data: c } = await supabase.from("courses").select("name").eq("id", p.course_id).maybeSingle();
      setCourseName(c?.name ?? null);
    }
    const { data: atts } = await supabase.from("post_attachments").select("*").eq("post_id", postId).order("created_at");
    setAttachments((atts ?? []) as Attachment[]);

    if (p.category === "assignment") {
      const { data: subs } = await supabase.from("posts")
        .select("id, title, author_name, created_at, author_id")
        .eq("parent_post_id", postId).eq("category", "submission")
        .order("created_at", { ascending: false });
      setSubmissions((subs ?? []) as Submission[]);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, postId]);

  const submitAssignment = async () => {
    if (!user || !post) return;
    if (!submitTitle.trim()) { toast.error("제출 제목을 입력하세요"); return; }
    if (submitFiles.length === 0) { toast.error("제출 파일을 첨부하세요"); return; }
    setSubmittingAns(true);
    const { data: created, error } = await supabase.from("posts").insert({
      category: "submission",
      title: submitTitle.trim(),
      author_id: user.id,
      author_name: profile!.full_name,
      author_role: profile!.role,
      course_id: post.course_id,
      parent_post_id: post.id,
    }).select("id").single();
    if (error || !created) { setSubmittingAns(false); toast.error("제출 실패", { description: error?.message }); return; }
    const errs = await uploadAttachments({ postId: created.id, files: submitFiles, uploaderId: user.id });
    setSubmittingAns(false);
    if (errs.length) toast.error("일부 파일 업로드 실패", { description: errs.join("\n") });
    else toast.success("과제가 제출되었습니다");
    setSubmitTitle(""); setSubmitFiles([]);
    load();
  };

  const deletePost = async () => {
    if (!post) return;
    if (!confirm("정말 삭제하시겠습니까? 첨부파일도 함께 삭제됩니다.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { toast.error("삭제 실패", { description: error.message }); return; }
    toast.success("글이 삭제되었습니다");
    navigate({ to: "/dashboard" });
  };

  const beginEdit = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content ?? "");
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    if (!post) return;
    if (!editTitle.trim()) { toast.error("제목을 입력하세요"); return; }
    setSavingEdit(true);
    const { error } = await supabase.from("posts")
      .update({ title: editTitle.trim(), content: editContent.trim() || null })
      .eq("id", post.id);
    setSavingEdit(false);
    if (error) { toast.error("수정 실패", { description: error.message }); return; }
    toast.success("수정되었습니다");
    setEditing(false);
    load();
  };

  if (loading || busy || !post) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 grid place-items-center text-muted-foreground">불러오는 중...</main>
      </div>
    );
  }
  if (!user || !profile) return null;

  const isOwner = post.author_id === user!.id;
  const isAdmin = profile.role === "admin";
  const canDelete = isOwner || isAdmin;

  const isAssignment = post.category === "assignment";
  const dueOver = post.due_date && new Date(post.due_date) < new Date();
  const canSubmit = isAssignment && profile.role === "student" && !dueOver;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-10">
        <button onClick={() => window.history.back()} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" /> 돌아가기
        </button>

        <article className="rounded-lg border border-border bg-card overflow-hidden">
          <header className="border-b border-border p-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">{categoryLabel(post.category)}</Badge>
              {courseName && <Badge variant="outline">{courseName}</Badge>}
              {post.is_pinned && <Badge className="bg-accent text-accent-foreground">고정</Badge>}
            </div>
            {editing ? (
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mb-3 text-2xl font-bold" />
            ) : (
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary mb-3">{post.title}</h1>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">{post.author_name}</span>
                <span className="mx-1.5">·</span>
                {ROLE_LABEL[post.author_role] ?? post.author_role}
                <span className="mx-1.5">·</span>
                {formatDate(post.created_at)}
              </div>
              <div className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {post.view_count}</div>
            </div>
            {isAssignment && post.due_date && (
              <div className={`mt-3 text-sm ${dueOver ? "text-destructive" : "text-accent"}`}>
                제출 마감: {formatDate(post.due_date)} {dueOver && "(마감됨)"}
              </div>
            )}
          </header>

          <div className="p-6">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
              {post.content || <span className="text-muted-foreground">내용이 없습니다.</span>}
            </div>

            {attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> 첨부파일 ({attachments.length})
                </div>
                <div className="space-y-2">
                  {attachments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => downloadAttachment(a.storage_path, a.file_name).catch(() => toast.error("다운로드 실패"))}
                      className="w-full flex items-center justify-between rounded-md border border-border p-3 hover:bg-secondary/40 text-left"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{a.file_name}</div>
                        <div className="text-xs text-muted-foreground">{formatBytes(a.size_bytes)}</div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canDelete && (
            <footer className="border-t border-border p-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={deletePost} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> {isAdmin && !isOwner ? "강제 삭제" : "삭제"}
              </Button>
            </footer>
          )}
        </article>

        <PostComments postId={post.id} profile={profile} allowSecret={post.category === "assignment" || post.category === "submission"} />

        {/* Assignment submissions */}
        {isAssignment && (
          <section className="mt-8">
            <h2 className="font-serif text-lg font-bold mb-3 inline-flex items-center gap-2">
              <FileUp className="h-4 w-4" /> 제출 현황 ({submissions.length})
            </h2>

            {canSubmit && (
              <div className="rounded-lg border border-border bg-card p-4 mb-4 space-y-3">
                <div className="text-sm font-medium">내 과제 제출</div>
                <Input value={submitTitle} onChange={(e) => setSubmitTitle(e.target.value)} placeholder="제출 제목 (예: 1주차 과제 - 홍길동)" />
                <Input type="file" multiple onChange={(e) => setSubmitFiles(Array.from(e.target.files ?? []))} />
                <Button onClick={submitAssignment} disabled={submittingAns} className="w-full">
                  {submittingAns ? "제출 중..." : "과제 제출"}
                </Button>
              </div>
            )}

            {submissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                아직 제출된 과제가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => (
                  <Link key={s.id} to="/post/$postId" params={{ postId: s.id }}
                    className="block rounded-md border border-border bg-card p-3 hover:border-accent">
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.author_name} · {formatDate(s.created_at)}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function categoryLabel(c: string) {
  return ({ material: "자료", assignment: "과제", notice: "공지", inquiry: "1:1 문의", submission: "과제 제출" } as Record<string, string>)[c] ?? c;
}
