import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { PostTable, type PostListItem } from "@/components/post-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BookOpen, Megaphone, FileText, FileUp, Plus, Pin, Pencil, ExternalLink, ImageIcon } from "lucide-react";
import { formatDate, WEEKDAY_LABEL } from "@/lib/format";
import { galleryImageUrl } from "@/lib/attachments";
import { toast } from "sonner";

export const Route = createFileRoute("/course/$courseId")({
  head: () => ({ meta: [{ title: "강의 — 반도체장비소프트웨어학과" }] }),
  component: CoursePage,
});

interface Course {
  id: string;
  name: string;
  weekday: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
  professor_id: string | null;
  professor_name: string | null;
  description: string | null;
  textbook_title: string | null;
  textbook_info: string | null;
  textbook_image_path: string | null;
  textbook_purchase_url: string | null;
}

interface NoticeItem {
  id: string;
  title: string;
  author_name: string;
  created_at: string;
  is_pinned: boolean;
  read_at?: string | null;
}

function CoursePage() {
  const { courseId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [materials, setMaterials] = useState<PostListItem[]>([]);
  const [assignments, setAssignments] = useState<PostListItem[]>([]);
  const [busy, setBusy] = useState(true);

  // textbook editor
  const [tbOpen, setTbOpen] = useState(false);
  const [tbTitle, setTbTitle] = useState("");
  const [tbInfo, setTbInfo] = useState("");
  const [tbUrl, setTbUrl] = useState("");
  const [tbFile, setTbFile] = useState<File | null>(null);
  const [tbSaving, setTbSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      setCourse(c as Course | null);

      const [noticeRes, matRes, assignRes] = await Promise.all([
        supabase.from("posts")
          .select("id, title, author_name, created_at, is_pinned")
          .eq("course_id", courseId).eq("category", "notice")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("posts")
          .select("id, title, author_name, author_role, view_count, created_at, is_pinned")
          .eq("course_id", courseId).eq("category", "material")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("posts")
          .select("id, title, author_name, author_role, view_count, created_at, due_date, is_pinned")
          .eq("course_id", courseId).eq("category", "assignment")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      const noticeRows = (noticeRes.data ?? []) as NoticeItem[];
      const noticeIds = noticeRows.map((n) => n.id);
      const readMap = new Map<string, string>();
      if (noticeIds.length) {
        const { data: reads } = await supabase
          .from("post_reads")
          .select("post_id, read_at")
          .eq("user_id", user.id)
          .in("post_id", noticeIds);
        for (const r of reads ?? []) readMap.set(r.post_id, r.read_at);
      }
      setNotices(noticeRows.map((n) => ({ ...n, read_at: readMap.get(n.id) ?? null })));
      setMaterials((matRes.data ?? []) as PostListItem[]);
      setAssignments((assignRes.data ?? []) as PostListItem[]);
      setBusy(false);
    })();
  }, [user, courseId]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user || !profile) return null;

  const isAdmin = profile.role === "admin";
  const isOwningProf = profile.role === "professor" && course?.professor_id === profile.id;
  const canPostHere = isAdmin || isOwningProf;
  const canEditTextbook = isAdmin || isOwningProf || Boolean(profile.can_write_notice);

  const openTextbookEditor = () => {
    setTbTitle(course?.textbook_title ?? "");
    setTbInfo(course?.textbook_info ?? "");
    setTbUrl(course?.textbook_purchase_url ?? "");
    setTbFile(null);
    setTbOpen(true);
  };

  const saveTextbook = async () => {
    if (!course) return;
    setTbSaving(true);
    let imagePath = course.textbook_image_path ?? null;
    if (tbFile) {
      if (!tbFile.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드 가능합니다");
        setTbSaving(false);
        return;
      }
      const ext = tbFile.name.includes(".") ? tbFile.name.slice(tbFile.name.lastIndexOf(".")) : "";
      const path = `textbook/${course.id}/${crypto.randomUUID()}${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery-images").upload(path, tbFile, {
        contentType: tbFile.type, upsert: false,
      });
      if (upErr) { toast.error("이미지 업로드 실패", { description: upErr.message }); setTbSaving(false); return; }
      imagePath = `gallery-images:${path}`;
    }
    const { error } = await supabase.rpc("update_course_textbook", {
      _course_id: course.id,
      _title: tbTitle.trim(),
      _info: tbInfo.trim(),
      _image_path: imagePath ?? "",
      _purchase_url: tbUrl.trim(),
    });
    setTbSaving(false);
    if (error) { toast.error("저장 실패", { description: error.message }); return; }
    toast.success("교재 정보를 저장했습니다");
    setTbOpen(false);
    setCourse({
      ...course,
      textbook_title: tbTitle.trim() || null,
      textbook_info: tbInfo.trim() || null,
      textbook_purchase_url: tbUrl.trim() || null,
      textbook_image_path: imagePath,
    });
  };

  const textbookImg = course?.textbook_image_path ? galleryImageUrl(course.textbook_image_path) : null;
  const hasTextbook = Boolean(course?.textbook_title || course?.textbook_info || course?.textbook_image_path);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> 강의실로
        </Link>

        <PageHeader
          icon={BookOpen}
          title={course?.name ?? "강의"}
          description={
            course
              ? `${WEEKDAY_LABEL[course.weekday]} ${course.start_time.slice(0,5)}~${course.end_time.slice(0,5)}` +
                (course.classroom ? ` · ${course.classroom}` : "") +
                (course.professor_name ? ` · 담당 ${course.professor_name}` : "")
              : ""
          }
        />

        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : (
          <div className="space-y-10">
            {/* Recent notices banner */}
            <section className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                <div className="inline-flex items-center gap-2 font-serif font-bold">
                  <Megaphone className="h-4 w-4 text-accent" /> 강의 공지사항
                </div>
                {canPostHere && (
                  <Link to="/post/new" search={{ category: "notice", courseId }}>
                    <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> 공지 작성</Button>
                  </Link>
                )}
              </div>
              <div className="divide-y divide-border">
                {notices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</div>
                ) : (
                  notices.map((n) => {
                    const isRead = Boolean(n.read_at && new Date(n.read_at) >= new Date(n.created_at));
                    return (
                    <Link key={n.id} to="/post/$postId" params={{ postId: n.id }}
                      onClick={() => supabase.rpc("mark_post_read", { _post_id: n.id })}
                      className={`flex items-center justify-between p-3 hover:bg-secondary/40 ${n.is_pinned ? "bg-muted/40" : ""}`}>
                      <div className="min-w-0 flex items-center gap-2">
                        {n.is_pinned && <Pin className="h-3 w-3 text-accent shrink-0" />}
                        {!isRead && <span className="text-xs font-black text-accent shrink-0">New</span>}
                        <span className={`truncate ${isRead ? "text-muted-foreground" : "text-foreground"} ${n.is_pinned ? "font-bold" : "font-medium"}`}>{n.title}</span>
                        <Badge variant="outline" className="ml-1 shrink-0">{n.author_name}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-3">{formatDate(n.created_at)}</span>
                    </Link>
                  );})
                )}
              </div>
            </section>

            {/* Textbook */}
            <section className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                <div className="inline-flex items-center gap-2 font-serif font-bold">
                  <BookOpen className="h-4 w-4 text-accent" /> 교재 정보
                </div>
                {canEditTextbook && (
                  <Button size="sm" variant="outline" onClick={openTextbookEditor}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> {hasTextbook ? "교재 수정" : "교재 등록"}
                  </Button>
                )}
              </div>
              <div className="p-5">
                {hasTextbook ? (
                  <div className="grid md:grid-cols-[180px_1fr] gap-5">
                    <div className="aspect-[3/4] rounded-md border border-border bg-secondary overflow-hidden grid place-items-center">
                      {textbookImg ? (
                        <img src={textbookImg} alt={course?.textbook_title ?? "교재"} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      {course?.textbook_title && <div className="font-serif text-lg font-bold text-primary">{course.textbook_title}</div>}
                      {course?.textbook_info && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{course.textbook_info}</p>}
                      {course?.textbook_purchase_url && (
                        <a
                          href={course.textbook_purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                        >
                          구매 링크 <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">등록된 교재 정보가 없습니다.</div>
                )}
              </div>
            </section>

            {/* Materials */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-bold inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" /> 강의 자료 ({materials.length})
                </h2>
                {canPostHere && (
                  <Link to="/post/new" search={{ category: "material", courseId }}>
                    <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> 자료 등록</Button>
                  </Link>
                )}
              </div>
              <PostTable posts={materials} showCourse={false} emptyText="등록된 자료가 없습니다." />
            </section>

            {/* Assignments */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-bold inline-flex items-center gap-2">
                  <FileUp className="h-4 w-4" /> 과제 ({assignments.length})
                </h2>
                {canPostHere && (
                  <Link to="/post/new" search={{ category: "assignment", courseId }}>
                    <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> 과제 등록</Button>
                  </Link>
                )}
              </div>
              <PostTable posts={assignments} showCourse={false} emptyText="등록된 과제가 없습니다." />
            </section>
          </div>
        )}
      </main>

      <Dialog open={tbOpen} onOpenChange={setTbOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">교재 정보 {hasTextbook ? "수정" : "등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>교재명</Label>
              <Input value={tbTitle} onChange={(e) => setTbTitle(e.target.value)} placeholder="예: 반도체 공학의 이해 (3판)" />
            </div>
            <div className="space-y-2">
              <Label>교재 설명</Label>
              <Textarea value={tbInfo} onChange={(e) => setTbInfo(e.target.value)} rows={5} placeholder="저자, 출판사, 학습 범위, 준비물 등" />
            </div>
            <div className="space-y-2">
              <Label>구매 링크 (선택)</Label>
              <Input value={tbUrl} onChange={(e) => setTbUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>교재 이미지 (선택)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setTbFile(e.target.files?.[0] ?? null)} />
              {tbFile ? (
                <img src={URL.createObjectURL(tbFile)} alt="미리보기" className="mt-2 max-h-48 rounded-md border border-border" />
              ) : textbookImg ? (
                <img src={textbookImg} alt="현재 교재 이미지" className="mt-2 max-h-48 rounded-md border border-border" />
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTbOpen(false)}>취소</Button>
            <Button onClick={saveTextbook} disabled={tbSaving}>{tbSaving ? "저장 중..." : "저장"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
