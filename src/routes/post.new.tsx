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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Paperclip, FileEdit } from "lucide-react";
import { uploadAttachments, uploadGalleryImages } from "@/lib/attachments";
import type { Database } from "@/integrations/supabase/types";

type CategoryParam = "material" | "assignment" | "notice" | "inquiry" | "gallery";
const CATEGORY_LABEL: Record<CategoryParam, string> = {
  material: "자료실 글", assignment: "과제 공지", notice: "공지사항", inquiry: "1:1 문의", gallery: "이미지 게시글",
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
interface Prof { id: string; full_name: string; role: string }
type NotifyAudience = "none" | "all" | "students";

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
  const [notifyAudience, setNotifyAudience] = useState<NotifyAudience>("none");
  const [canPin, setCanPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      if (category === "material" || category === "assignment" || category === "notice") {
        const { data } = await supabase.from("courses").select("id, name, professor_id").order("name");
        setCourses((data ?? []) as Course[]);
      }
      if (category === "inquiry") {
        const wantedRoles: ("student" | "professor" | "admin")[] =
          profile.role === "professor"
            ? ["student", "professor", "admin"]
            : ["professor", "admin"];
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("role", wantedRoles)
          .neq("id", user.id);
        setProfs((data ?? []) as Prof[]);
      }
      setCanPin(profile.role === "admin");
    })();
  }, [user, profile, category]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user || !profile) return null;

  // Permission gate
  const canPost =
    profile.role === "admin" ||
    (category === "material" && profile.role === "professor") ||
    (category === "notice" && (profile.role === "professor" || Boolean(profile.can_write_notice))) ||
    (category === "assignment" && profile.role === "professor") ||
    (category === "gallery" && profile.role === "professor") ||
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

  const showCourseSelect = category === "material" || category === "assignment" || category === "notice";
  const showNotify = category === "notice" || category === "assignment";

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("제목을 입력하세요"); return; }
    if (category === "assignment" && !courseId) { toast.error("강의를 선택하세요"); return; }
    if (category === "inquiry" && !targetProf) { toast.error("문의 대상을 선택하세요"); return; }
    if (category === "gallery" && files.length === 0) { toast.error("이미지를 1개 이상 첨부하세요"); return; }
    setSubmitting(true);

    type Insert = Database["public"]["Tables"]["posts"]["Insert"];
    const insert: Insert = {
      category, title: title.trim(), content: content.trim() || null,
      author_id: user.id, author_name: profile.full_name, author_role: profile.role,
      course_id: showCourseSelect && courseId ? courseId : null,
      due_date: category === "assignment" && dueDate ? new Date(dueDate).toISOString() : null,
      is_pinned: canPin ? isPinned : false,
      inquiry_target_professor_id: category === "inquiry" ? targetProf : null,
      notify_audience: showNotify ? notifyAudience : "none",
    };

    const { data: created, error } = await supabase.from("posts").insert(insert).select("id").single();
    if (error || !created) {
      setSubmitting(false);
      toast.error("작성 실패", { description: error?.message });
      return;
    }
    if (files.length) {
      const errs = category === "gallery"
        ? await uploadGalleryImages({ postId: created.id, files, uploaderId: user.id })
        : await uploadAttachments({ postId: created.id, files, uploaderId: user.id });
      if (errs.length) toast.error("일부 파일 업로드 실패", { description: errs.join("\n") });
    }
    setSubmitting(false);
    toast.success("글이 등록되었습니다");
    if (category === "gallery") {
      navigate({ to: "/gallery" });
    } else {
      navigate({ to: "/post/$postId", params: { postId: created.id } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className={`flex-1 mx-auto w-full px-6 py-10 ${category === "gallery" ? "max-w-5xl" : "max-w-3xl"}`}>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> 돌아가기
        </Link>
        <PageHeader icon={FileEdit} title={`${CATEGORY_LABEL[category as CategoryParam]} 작성`} />

        <div className="space-y-5 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label>제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" />
          </div>

          {showCourseSelect && (
            <div className="space-y-2">
              <Label>강의 {category === "assignment" && <span className="text-destructive">*</span>}</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder={category === "notice" ? "전체 학과 공지 (선택사항)" : "강의 선택"} /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {category === "inquiry" && (
            <div className="space-y-2">
              <Label>문의 대상 <span className="text-destructive">*</span></Label>
              <Select value={targetProf} onValueChange={setTargetProf}>
                <SelectTrigger><SelectValue placeholder="문의할 대상을 선택하세요" /></SelectTrigger>
                <SelectContent>
                  {profs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                      {p.role === "admin" ? " (관리자)" : p.role === "professor" ? " 교수님" : " (학생)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">문의 대상만 열람 가능합니다.</p>
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
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={category === "gallery" ? 12 : 8}
              placeholder={category === "gallery" ? "사진에 대한 설명을 자유롭게 작성하세요" : "내용을 입력하세요"}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" />
              {category === "gallery" ? "이미지 첨부" : "첨부파일"}
            </Label>
            <Input
              type="file"
              multiple
              accept={category === "gallery" ? "image/*" : undefined}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && category !== "gallery" && (
              <div className="text-xs text-muted-foreground">{files.length}개 선택됨</div>
            )}
            {category === "gallery" && files.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-2">{files.length}개 이미지 · 미리보기</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-md border border-border overflow-hidden bg-secondary">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="absolute inset-0 w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white text-xs grid place-items-center hover:bg-black"
                        aria-label="삭제"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] text-white bg-gradient-to-t from-black/80 to-transparent truncate">
                        {f.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {category === "assignment" && (
              <p className="text-[11px] text-muted-foreground">학생이 다운로드 할 양식 파일을 첨부할 수 있습니다.</p>
            )}
          </div>

          {showNotify && (
            <div className="space-y-2 rounded-md border border-border p-3 bg-secondary/30">
              <Label>알림 대상</Label>
              <RadioGroup value={notifyAudience} onValueChange={(v) => setNotifyAudience(v as NotifyAudience)} className="space-y-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="none" /> 알림 보내지 않음
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="all" /> 모든 회원에게 알림
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="students" /> 학생에게만 알림
                </label>
              </RadioGroup>
            </div>
          )}

          {canPin && (
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

        {category === "gallery" && (
          <div className="mt-8">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">게시글 미리보기</div>
            <article className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-serif text-xl md:text-2xl font-bold text-primary">
                {title.trim() || <span className="text-muted-foreground/60">(제목)</span>}
              </h2>
              <div className="mt-1 text-xs text-muted-foreground">
                {profile.full_name} · 방금 전 · 사진 {files.length}장
              </div>
              {files.length > 0 ? (
                <>
                  <img
                    src={URL.createObjectURL(files[0])}
                    alt="대표 이미지"
                    className="mt-4 w-full max-h-[480px] object-contain rounded-md border border-border bg-secondary"
                  />
                  {files.length > 1 && (
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {files.slice(1).map((f, i) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border bg-secondary">
                          <img src={URL.createObjectURL(f)} alt={f.name} className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 aspect-video grid place-items-center bg-secondary rounded-md text-muted-foreground text-sm">
                  이미지를 첨부하면 여기에 표시됩니다
                </div>
              )}
              {content.trim() && (
                <div className="mt-6 pt-6 border-t border-border whitespace-pre-wrap text-sm leading-relaxed">
                  {content}
                </div>
              )}
            </article>
          </div>
        )}
      </main>
    </div>
  );
}
