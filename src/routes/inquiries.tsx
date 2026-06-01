import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Plus, Lock, ChevronRight } from "lucide-react";
import { formatPostDate, ROLE_LABEL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/inquiries")({
  head: () => ({ meta: [{ title: "1:1 문의 — 반도체장비소프트웨어학과" }] }),
  component: InquiriesPage,
});

interface Thread {
  id: string;
  title: string;
  content: string | null;
  author_id: string;
  author_name: string;
  author_role: string;
  inquiry_target_professor_id: string | null;
  created_at: string;
  reply_count: number;
  last_at: string;
  unread: boolean;
}

interface Prof { id: string; full_name: string; role: string }

function InquiriesPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [busy, setBusy] = useState(true);
  const [profs, setProfs] = useState<Prof[]>([]);

  // new thread form
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const { data: items } = await supabase
      .from("posts")
      .select("id, title, content, author_id, author_name, author_role, inquiry_target_professor_id, created_at")
      .eq("category", "inquiry")
      .order("created_at", { ascending: false });

    const ids = (items ?? []).map((i) => i.id);
    // replies and reads in one shot
    const [{ data: replies }, { data: reads }] = await Promise.all([
      ids.length
        ? supabase.from("posts")
            .select("id, parent_post_id, created_at")
            .eq("category", "submission")
            .in("parent_post_id", ids)
        : Promise.resolve({ data: [] as { id: string; parent_post_id: string | null; created_at: string }[] }),
      ids.length
        ? supabase.from("post_reads")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
    ]);
    const replyMap = new Map<string, { count: number; last: string }>();
    (replies ?? []).forEach((r) => {
      if (!r.parent_post_id) return;
      const prev = replyMap.get(r.parent_post_id);
      if (!prev) replyMap.set(r.parent_post_id, { count: 1, last: r.created_at });
      else replyMap.set(r.parent_post_id, { count: prev.count + 1, last: r.created_at > prev.last ? r.created_at : prev.last });
    });
    const readSet = new Set((reads ?? []).map((r) => r.post_id));

    const list: Thread[] = (items ?? []).map((i) => {
      const r = replyMap.get(i.id);
      return {
        ...i,
        reply_count: r?.count ?? 0,
        last_at: r?.last ?? i.created_at,
        unread: i.author_id !== user.id && !readSet.has(i.id),
      };
    }).sort((a, b) => (b.last_at > a.last_at ? 1 : -1));
    setThreads(list);
    setBusy(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    if (profile) {
      // Build the target list based on the user's role.
      // - student: can contact any professor or admin
      // - professor: can contact any student, any other professor, or admin
      // - admin: can contact anyone (we still show profs + admins by default;
      //          message students by selecting them in the list)
      const wantedRoles: ("student" | "professor" | "admin")[] =
        profile.role === "professor"
          ? ["student", "professor", "admin"]
          : ["professor", "admin"];
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", wantedRoles)
        .neq("id", user.id)
        .then(({ data }) => setProfs((data ?? []) as Prof[]));
    }
  }, [user, profile, load]);

  const createThread = async () => {
    if (!user || !profile) return;
    if (!title.trim()) { toast.error("제목을 입력하세요"); return; }
    if (!content.trim()) { toast.error("내용을 입력하세요"); return; }
    if (!target) { toast.error("문의 대상을 선택하세요"); return; }
    setCreating(true);
    const { error } = await supabase.from("posts").insert({
      category: "inquiry",
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
      author_name: profile.full_name,
      author_role: profile.role,
      inquiry_target_professor_id: target,
    });
    setCreating(false);
    if (error) { toast.error("문의 작성 실패", { description: error.message }); return; }
    toast.success("문의가 전송되었습니다");
    setTitle(""); setContent(""); setTarget("");
    setOpen(false);
    load();
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10">
        <PageHeader
          icon={MessageSquare}
          title="1:1 문의"
          description="작성자와 문의 대상만 열람할 수 있는 비공개 문의처입니다."
          action={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> 새 문의</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-serif">새 1:1 문의</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>제목</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="문의 제목" />
                  </div>
                  <div className="space-y-2">
                    <Label>문의 대상</Label>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger><SelectValue placeholder="문의할 대상을 선택하세요" /></SelectTrigger>
                      <SelectContent>
                        {profs.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">선택 가능한 대상이 없습니다</div>}
                        {profs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name}
                            {p.role === "admin" ? " (관리자)" : p.role === "professor" ? " 교수님" : " (학생)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> 문의 대상만 열람 가능합니다.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>내용</Label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="문의 내용을 입력하세요" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                  <Button onClick={createThread} disabled={creating}>
                    {creating ? "전송 중..." : "전송"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        {busy ? (
          <div className="text-center text-muted-foreground py-12">불러오는 중...</div>
        ) : threads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <div className="text-muted-foreground mb-1">아직 문의가 없습니다.</div>
            <div className="text-xs text-muted-foreground">
              교수님 또는 관리자에게 비공개로 메시지를 남길 수 있습니다.
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {threads.map((t) => (
              <Link
                key={t.id}
                to="/inquiries/$threadId"
                params={{ threadId: t.id }}
                className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors"
              >
                <div className={`h-10 w-10 rounded-full grid place-items-center text-sm font-bold shrink-0 ${
                  t.unread ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {t.author_name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${t.unread ? "text-primary" : ""}`}>{t.title}</span>
                    {t.unread && <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />}
                    {t.reply_count > 0 && (
                      <span className="text-[10px] font-bold bg-secondary text-muted-foreground rounded-full px-1.5 py-0.5">
                        {t.reply_count + 1}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {t.author_name} · {ROLE_LABEL[t.author_role] ?? t.author_role}
                    {t.content && <> · {t.content.slice(0, 60)}</>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">{formatPostDate(t.last_at)}</div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 ml-auto mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
