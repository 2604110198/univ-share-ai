import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Paperclip, FileEdit } from "lucide-react";
import { uploadAttachments } from "@/lib/attachments";
import type { Database } from "@/integrations/supabase/types";

type CategoryParam = "material" | "assignment" | "notice" | "inquiry";
const CATEGORY_LABEL: Record<CategoryParam, string> = {
  material: "자료실 글", assignment: "과제 공지", notice: "공지사항", inquiry: "1:1 문의",
};

interface Search { category?: CategoryParam; courseId?: string }

export const Route = createFileRoute("/post/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    category: (s.category as CategoryParam) ?? "material",
    courseId: typeof s.courseId === "string" ? s.courseId : undefined,
  }),
  head: () => ({ meta: [{ title: "글 작성 — 반도체장비소프트웨어학과" }] }),
  component: NewPostPage,
});

interface Course { id: string; name: string; professor_id: string | null }
interface Prof { id: string; full_name: string }

function NewPostPage() {
  const search = Route.useSearch();
  const category = search.category ?? "material";
  const initialCourseId = search.courseId ?? "";

  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [courseId, setCourseId] = useState(initialCourseId);
  const [dueDate, setDueDate] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [targetProf, setTargetProf] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (category === "material" || category === "assignment") {
        const { data } = await supabase.from("courses").select("id, name, professor_id").order("name");
        setCourses((data ?? []) as Course[]);
      }
      if (category === "inquiry") {
        const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "professor");
        setProfs((data ?? []) as Prof[]);
      }
    })();
  }, [user, category]);

  if (loading || !profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;

  // Permission gate
  const canPost =
    profile.role === "admin" ||
    (category === "material" && profile.role === "professor") ||
    (category === "notice" && profile.role === "professor") ||
    (category === "assignment" && profile.role === "professor") ||
    category === "inquiry";

  if (!canPost) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 grid place-items-center text-muted-foreground">
          이 카테고리에 글을 작성할 권한이 없습니다.
        </main>
      </div>
    );
  }

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("제목을 입력하세요"); return; }
    if (category === "assignment" && !courseId) { toast.error("강의를 선택하세요"); return; }
    if (category === "inquiry" && !targetProf) { toast.error("문의 대상 교수를 선택하세요"); return; }
    setSubmitting(true);

    type Insert = Database["public"]["Tables"]["posts"]["Insert"];
    const insert: Insert = {
      category, title: title.trim(), content: content.trim() || null,
      author_id: user.id, author_name: profile.full_name, author_role: profile.role,
      course_id: (category === "material" || category === "assignment") && courseId ? courseId : null,
      due_date: category === "assignment" && dueDate ? new Date(dueDate).toISOString() : null,
      is_pinned: profile.role !== "student" ? isPinned : false,
      inquiry_target_professor_id: category === "inquiry" ? targetProf : null,
    };

    const { data: created, error } = await supabase.from("posts").insert(insert).select("id").single();
    if (error || !created) {
      setSubmitting(false);
      toast.error("작성 실패", { description: error?.message });
      return;
    }
    if (files.length) {
      const errs = await uploadAttachments({ postId: created.id, files, uploaderId: user.id });
      if (errs.length) toast.error("일부 파일 업로드 실패", { description: errs.join("\n") });
    }
    setSubmitting(false);
    toast.success("글이 등록되었습니다");
    navigate({ to: "/post/$postId", params: { postId: created.id } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> 돌아가기
        </Link>
        <PageHeader icon={FileEdit} title={`${CATEGORY_LABEL[category]} 작성`} />

        <div className="space-y-5 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label>제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" />
          </div>

          {(category === "material" || category === "assignment") && (
            <div className="space-y-2">
              <Label>강의 {category === "assignment" && <span className="text-destructive">*</span>}</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="강의 선택 (선택사항)" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {category === "inquiry" && (
            <div className="space-y-2">
              <Label>문의 대상 교수 <span className="text-destructive">*</span></Label>
              <Select value={targetProf} onValueChange={setTargetProf}>
                <SelectTrigger><SelectValue placeholder="교수를 선택하세요" /></SelectTrigger>
                <SelectContent>
                  {profs.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">선택한 교수와 관리자만 문의 내용을 열람할 수 있습니다.</p>
            </div>
          )}

          {category === "assignment" && (
            <div className="space-y-2">
              <Label>제출 마감</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">비워두면 마감 없이 항상 제출 가능합니다.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>내용</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="내용을 입력하세요" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Paperclip className="h-4 w-4" /> 첨부파일 (최대 500MB)</Label>
            <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && (
              <div className="text-xs text-muted-foreground">{files.length}개 선택됨</div>
            )}
          </div>

          {profile.role !== "student" && (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label className="cursor-pointer">상단 고정</Label>
                <p className="text-xs text-muted-foreground mt-0.5">목록 맨 위에 항상 표시됩니다</p>
              </div>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => window.history.back()}>취소</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "등록 중..." : "등록"}</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
