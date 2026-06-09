import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Plus, Lock, ChevronRight, Search, Check } from "lucide-react";
import { formatPostDate } from "@/lib/format";
import { roleColorClass, roleLabelOf } from "@/lib/role-color";
import { cn } from "@/lib/utils";
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

interface Candidate { id: string; full_name: string; role: string; can_write_notice: boolean }

function InquiriesPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [busy, setBusy] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [authorMeta, setAuthorMeta] = useState<Map<string, { can_write_notice: boolean }>>(new Map());

  // new thread form
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [target, setTarget] = useState<Candidate | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
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

    // fetch author can_write_notice for student authors (for class-rep coloring)
    const authorIds = Array.from(new Set(list.map((t) => t.author_id)));
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, can_write_notice")
        .in("id", authorIds);
      const map = new Map<string, { can_write_notice: boolean }>();
      (profs ?? []).forEach((p) => map.set(p.id, { can_write_notice: !!p.can_write_notice }));
      setAuthorMeta(map);
    }
    setBusy(false);
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    load();
    // Role-based contact list
    //  - admin    -> students + professors
    //  - professor-> students + other professors + admin
    //  - student  -> professors + admin + class reps (students with can_write_notice)
    let q = supabase.from("profiles").select("id, full_name, role, can_write_notice").neq("id", user.id);
    if (profile.role === "admin") {
      q = q.in("role", ["student", "professor"]);
    } else if (profile.role === "professor") {
      q = q.in("role", ["student", "professor", "admin"]);
    } else {
      // student
      q = q.or("role.eq.professor,role.eq.admin,and(role.eq.student,can_write_notice.eq.true)");
    }
    q.then(({ data }) => setCandidates((data ?? []) as Candidate[]));
  }, [user, profile, load]);

  const filteredCandidates = useMemo(() => {
    const q = targetQuery.trim().toLowerCase();
    const base = candidates;
    if (!q) return base.slice(0, 12);
    return base.filter((c) => c.full_name.toLowerCase().includes(q)).slice(0, 12);
  }, [candidates, targetQuery]);

  const resetForm = () => {
    setTitle(""); setContent(""); setTarget(null); setTargetQuery(""); setShowSuggest(false);
  };

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
      inquiry_target_professor_id: target.id,
    });
    setCreating(false);
    if (error) { toast.error("문의 작성 실패", { description: error.message }); return; }
    toast.success("문의가 전송되었습니다");
    resetForm();
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
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
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
                  <div className="space-y-2 relative">
                    <Label>문의 대상</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={targetQuery}
                        onChange={(e) => {
                          setTargetQuery(e.target.value);
                          setTarget(null);
                          setShowSuggest(true);
                        }}
                        onFocus={() => setShowSuggest(true)}
                        onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                        placeholder="이름을 입력하세요"
                        className="pl-8"
                      />
                    </div>
                    {showSuggest && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-md">
                        {filteredCandidates.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">일치하는 대상이 없습니다</div>
                        ) : (
                          filteredCandidates.map((c) => {
                            const selected = target?.id === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setTarget(c);
                                  setTargetQuery(c.full_name);
                                  setShowSuggest(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-secondary",
                                  selected && "bg-secondary",
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className={cn("font-medium truncate", roleColorClass(c.role, c.can_write_notice))}>
                                    {c.full_name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground shrink-0">
                                    {roleLabelOf(c.role, c.can_write_notice)}
                                  </span>
                                </span>
                                {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
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
                  <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>취소</Button>
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
              교수, 학생, 관리자에게 비공개로 메시지를 남길 수 있습니다.
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {threads.map((t) => {
              const canRep = authorMeta.get(t.author_id)?.can_write_notice ?? false;
              return (
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
                      <span className={cn("font-medium", roleColorClass(t.author_role, canRep))}>{t.author_name}</span>
                      <> · {roleLabelOf(t.author_role, canRep)}</>
                      {t.content && <> · {t.content.slice(0, 60)}</>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{formatPostDate(t.last_at)}</div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 ml-auto mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
