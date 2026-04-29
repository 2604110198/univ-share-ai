import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FolderOpen, Plus, Calendar, BookMarked, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "대시보드 — Campus Drive" }] }),
  component: DashboardPage,
});

interface FolderRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_assignment: boolean;
  due_date: string | null;
  created_at: string;
  owner_name?: string;
}

function DashboardPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    const { data: foldersData } = await supabase
      .from("folders")
      .select("*")
      .order("created_at", { ascending: false });

    const ownerIds = Array.from(new Set((foldersData ?? []).map((f) => f.owner_id)));
    const { data: profs } = ownerIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : { data: [] as { id: string; full_name: string }[] };
    const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));

    setFolders(
      (foldersData ?? []).map((f) => ({ ...f, owner_name: map.get(f.owner_id) ?? "—" })) as FolderRow[],
    );
    setLoadingFolders(false);
  }, []);

  useEffect(() => {
    if (user && profile) {
      loadFolders();
      supabase.rpc("admin_exists").then(({ data }) => setAdminExists(Boolean(data)));
    }
  }, [user, profile, loadFolders]);

  const claimAdmin = async () => {
    const { error } = await supabase.rpc("bootstrap_admin");
    if (error) {
      toast.error("관리자 전환 실패", { description: error.message });
      return;
    }
    toast.success("관리자로 전환되었습니다");
    await refreshProfile();
    setAdminExists(true);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>
    );
  }

  const canCreateFolders = profile.role === "professor" || profile.role === "admin";
  const assignmentFolders = folders.filter((f) => f.is_assignment);
  const materialFolders = folders.filter((f) => !f.is_assignment);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        {/* Greeting */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-muted-foreground mb-1">환영합니다,</p>
            <h1 className="font-serif text-3xl font-bold text-primary">
              {profile.full_name} <span className="text-muted-foreground font-normal text-xl">님</span>
            </h1>
          </div>
          {canCreateFolders && (
            <CreateFolderDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadFolders} />
          )}
        </div>

        {/* Bootstrap admin banner */}
        {adminExists === false && (
          <div className="mb-8 rounded-lg border border-accent bg-accent/10 p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-md bg-accent text-accent-foreground grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif font-bold text-base mb-1">최초 관리자가 아직 없습니다</h3>
              <p className="text-sm text-muted-foreground mb-3">
                이 시스템을 처음 시작하셨다면, 본 계정을 관리자로 전환해 학번/교수 이메일 등록을 시작하세요.
                관리자가 한 명이라도 존재하면 이 옵션은 사라집니다.
              </p>
              <Button size="sm" onClick={claimAdmin} className="bg-accent text-accent-foreground hover:bg-accent/90">
                내 계정을 관리자로 전환
              </Button>
            </div>
          </div>
        )}

        {/* Materials section */}
        <Section title="강의 자료" icon={BookMarked} count={materialFolders.length}>
          {loadingFolders ? (
            <SkeletonGrid />
          ) : materialFolders.length === 0 ? (
            <EmptyState text="아직 등록된 자료 폴더가 없습니다." />
          ) : (
            <FolderGrid folders={materialFolders} />
          )}
        </Section>

        {/* Assignments section */}
        <Section title="과제 폴더" icon={Calendar} count={assignmentFolders.length} className="mt-12">
          {loadingFolders ? (
            <SkeletonGrid />
          ) : assignmentFolders.length === 0 ? (
            <EmptyState text="아직 과제 폴더가 없습니다." />
          ) : (
            <FolderGrid folders={assignmentFolders} />
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({ title, icon: Icon, count, children, className = "" }: {
  title: string; icon: any; count: number; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-serif text-xl font-bold">{title}</h2>
        <Badge variant="secondary" className="ml-1">{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function FolderGrid({ folders }: { folders: FolderRow[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {folders.map((f) => (
        <Link
          key={f.id}
          to="/folder/$folderId"
          params={{ folderId: f.id }}
          className="group rounded-lg border border-border bg-card p-5 shadow-paper hover:shadow-elevated hover:border-accent/50 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`h-10 w-10 rounded-md grid place-items-center ${f.is_assignment ? "bg-accent/15 text-accent" : "bg-secondary text-primary"}`}>
              <FolderOpen className="h-5 w-5" />
            </div>
            {f.is_assignment && (
              <Badge variant="outline" className="text-xs border-accent text-accent">과제</Badge>
            )}
          </div>
          <h3 className="font-serif font-bold text-lg mb-1 group-hover:text-accent transition-colors line-clamp-1">
            {f.name}
          </h3>
          {f.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{f.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
            <span>👤 {f.owner_name}</span>
            {f.is_assignment && f.due_date ? (
              <span className={new Date(f.due_date) < new Date() ? "text-destructive" : ""}>
                ~{formatDate(f.due_date)}
              </span>
            ) : (
              <span>{formatDate(f.created_at)}</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/30 p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 rounded-lg border border-border bg-card animate-pulse" />
      ))}
    </div>
  );
}

function CreateFolderDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAssignment, setIsAssignment] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || !name.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("folders").insert({
      name: name.trim(),
      description: description.trim() || null,
      owner_id: user.id,
      is_assignment: isAssignment,
      due_date: isAssignment && dueDate ? new Date(dueDate).toISOString() : null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("폴더 생성 실패", { description: error.message });
      return;
    }
    toast.success("폴더가 생성되었습니다");
    setName(""); setDescription(""); setIsAssignment(false); setDueDate("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1.5" /> 새 폴더</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">새 폴더 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>폴더 이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 알고리즘 1주차 자료" />
          </div>
          <div className="space-y-2">
            <Label>설명 (선택)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="cursor-pointer">과제 폴더</Label>
              <p className="text-xs text-muted-foreground mt-0.5">학생이 파일을 제출할 수 있습니다</p>
            </div>
            <Switch checked={isAssignment} onCheckedChange={setIsAssignment} />
          </div>
          {isAssignment && (
            <div className="space-y-2">
              <Label>제출 마감 (선택)</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">비워두면 마감 없이 항상 제출 가능합니다</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            {submitting ? "생성 중..." : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
