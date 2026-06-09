import { useEffect, useState } from "react";
import { Lock, MessageCircle, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/lib/auth-context";
import { formatDate, ROLE_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  content: string;
  is_secret: boolean;
  created_at: string;
}

export function PostComments({ postId, profile, allowSecret = false }: { postId: string; profile: Profile; allowSecret?: boolean }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [content, setContent] = useState("");
  const [secret, setSecret] = useState(false);
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("post_comments")
      .select("id, author_id, author_name, author_role, content, is_secret, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) toast.error("댓글을 불러오지 못했습니다", { description: error.message });
    setComments((data ?? []) as CommentRow[]);
    setBusy(false);
  };

  useEffect(() => { load(); }, [postId]);

  const submit = async () => {
    if (!content.trim()) return;
    setSending(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      author_id: profile.id,
      author_name: profile.full_name,
      author_role: profile.role,
      content: content.trim(),
      is_secret: allowSecret ? secret : false,
    });
    setSending(false);
    if (error) { toast.error("댓글 등록 실패", { description: error.message }); return; }
    setContent("");
    setSecret(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) { toast.error("댓글 삭제 실패", { description: error.message }); return; }
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <section className="mt-8 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <h2 className="font-serif text-lg font-bold inline-flex items-center gap-2">
          <MessageCircle className="h-4 w-4" /> 댓글 ({comments.length})
        </h2>
      </div>

      <div className="divide-y divide-border">
        {busy ? (
          <div className="p-6 text-center text-sm text-muted-foreground">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">아직 댓글이 없습니다.</div>
        ) : comments.map((c) => {
          const canDelete = c.author_id === profile.id || profile.role === "admin";
          return (
            <div key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className={`font-medium ${
                      c.author_role === "admin" ? "text-red-600" :
                      c.author_role === "professor" ? "text-blue-600" :
                      "text-foreground"
                    }`}>{c.author_name}</span>
                    <span>{ROLE_LABEL[c.author_role] ?? c.author_role}</span>
                    {c.is_secret && <span className="inline-flex items-center gap-1 text-accent"><Lock className="h-3 w-3" /> 비밀댓글</span>}
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.content}</p>
                </div>
                {canDelete && (
                  <Button variant="ghost" size="sm" onClick={() => remove(c.id)} className="text-destructive shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border space-y-3">
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="댓글을 입력하세요" />
        <div className="flex items-center justify-between gap-3">
          {allowSecret ? (
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={secret} onCheckedChange={(v) => setSecret(Boolean(v))} />
              비밀댓글
            </label>
          ) : <span />}
          <Button onClick={submit} disabled={sending || !content.trim()}>
            <Send className="h-4 w-4 mr-1" /> {sending ? "등록 중..." : "댓글 등록"}
          </Button>
        </div>
      </div>
    </section>
  );
}