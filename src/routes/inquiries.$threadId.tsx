import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Lock, Trash2 } from "lucide-react";
import { formatDate, ROLE_LABEL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/inquiries/$threadId")({
  head: () => ({ meta: [{ title: "1:1 문의 — 반도체장비소프트웨어학과" }] }),
  component: InquiryThreadPage,
});

interface Thread {
  id: string; title: string; content: string | null;
  author_id: string; author_name: string; author_role: string;
  inquiry_target_professor_id: string | null; created_at: string;
}
interface Reply {
  id: string; content: string | null; author_id: string;
  author_name: string; author_role: string; created_at: string;
}

function InquiryThreadPage() {
  const { threadId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: t, error } = await supabase.from("posts").select("*").eq("id", threadId).maybeSingle();
    if (error || !t) {
      toast.error("문의를 찾을 수 없거나 접근 권한이 없습니다");
      navigate({ to: "/inquiries" });
      return;
    }
    setThread(t as Thread);
    if (t.inquiry_target_professor_id) {
      const { data: p } = await supabase.from("profiles").select("full_name")
        .eq("id", t.inquiry_target_professor_id).maybeSingle();
      setTargetName(p?.full_name ?? null);
    }
    const { data: rs } = await supabase.from("posts")
      .select("id, content, author_id, author_name, author_role, created_at")
      .eq("parent_post_id", threadId).eq("category", "submission")
      .order("created_at", { ascending: true });
    setReplies((rs ?? []) as Reply[]);
    setBusy(false);
    // mark as read
    await supabase.from("post_reads").upsert(
      { user_id: user.id, post_id: threadId },
      { onConflict: "user_id,post_id" },
    );
  }, [user, threadId, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!busy) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [busy, replies.length]);

  const send = async () => {
    if (!user || !profile || !thread) return;
    if (!msg.trim()) return;
    setSending(true);
    const { error } = await supabase.from("posts").insert({
      category: "submission",
      parent_post_id: thread.id,
      title: `RE: ${thread.title}`,
      content: msg.trim(),
      author_id: user.id,
      author_name: profile.full_name,
      author_role: profile.role,
    });
    setSending(false);
    if (error) { toast.error("전송 실패", { description: error.message }); return; }
    setMsg("");
    load();
  };

  const removeThread = async () => {
    if (!thread) return;
    if (!confirm("이 문의 전체를 삭제하시겠습니까? 답변도 함께 삭제됩니다.")) return;
    // delete replies first
    await supabase.from("posts").delete().eq("parent_post_id", thread.id);
    const { error } = await supabase.from("posts").delete().eq("id", thread.id);
    if (error) { toast.error("삭제 실패"); return; }
    toast.success("삭제되었습니다");
    navigate({ to: "/inquiries" });
  };

  if (loading || busy || !thread) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 grid place-items-center text-muted-foreground">불러오는 중...</main>
      </div>
    );
  }
  if (!user || !profile) return null;

  const isAdmin = profile.role === "admin";
  const canDelete = isAdmin || thread.author_id === user!.id;

  // Combined message stream: original + replies
  const messages: Reply[] = [
    {
      id: thread.id,
      content: thread.content,
      author_id: thread.author_id,
      author_name: thread.author_name,
      author_role: thread.author_role,
      created_at: thread.created_at,
    },
    ...replies,
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8 flex flex-col">
        <Link to="/inquiries" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> 문의함
        </Link>

        {/* Thread header */}
        <div className="rounded-t-lg border border-border border-b-0 bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-serif text-xl md:text-2xl font-bold text-primary mb-2">{thread.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> 비공개
                </Badge>
                <span>작성자 <span className="font-medium text-foreground">{thread.author_name}</span></span>
                {targetName && <span>· 문의 대상 <span className="font-medium text-foreground">{targetName}</span></span>}
                <span>· {formatDate(thread.created_at)}</span>
              </div>
            </div>
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={removeThread} className="text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 border border-border border-b-0 bg-secondary/30 p-5 space-y-4 min-h-[400px] overflow-y-auto">
          {messages.map((m) => {
            const mine = m.author_id === user!.id;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                {!mine && (
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0">
                    {m.author_name.slice(0, 1)}
                  </div>
                )}
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`text-[11px] text-muted-foreground mb-1 ${mine ? "text-right" : ""}`}>
                    {!mine && <span className="font-medium text-foreground">{m.author_name}</span>}
                    {!mine && <span className="mx-1">·</span>}
                    {ROLE_LABEL[m.author_role] ?? m.author_role}
                  </div>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm"
                  }`}>
                    {m.content || <span className="opacity-60">(내용 없음)</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="rounded-b-lg border border-border bg-card p-3 flex gap-2 items-end">
          <Textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
            }}
            placeholder="답장을 입력하세요... (Ctrl+Enter 전송)"
            rows={2}
            className="resize-none"
          />
          <Button onClick={send} disabled={sending || !msg.trim()} className="shrink-0">
            <Send className="h-4 w-4 mr-1" /> 전송
          </Button>
        </div>
      </main>
    </div>
  );
}
