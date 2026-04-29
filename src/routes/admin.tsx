import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, UserCog, GraduationCap, Users } from "lucide-react";
import { ROLE_LABEL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "관리자 — Campus Drive" }] }),
  component: AdminPage,
});

interface AllowedStudent { id: string; student_id: string; note: string | null; created_at: string }
interface AllowedProf { id: string; email: string; note: string | null; created_at: string }
interface ProfileRow { id: string; full_name: string; email: string; student_id: string | null; role: string; created_at: string }

function AdminPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || (profile && profile.role !== "admin"))) {
      toast.error("접근 권한이 없습니다");
      navigate({ to: "/dashboard" });
    }
  }, [loading, user, profile, navigate]);

  if (loading || !profile) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  }
  if (profile.role !== "admin") return null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-1">시스템 관리</p>
          <h1 className="font-serif text-3xl font-bold text-primary">관리자 패널</h1>
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students"><GraduationCap className="h-4 w-4 mr-1.5" />허용 학번</TabsTrigger>
            <TabsTrigger value="professors"><UserCog className="h-4 w-4 mr-1.5" />허용 교수 이메일</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" />가입 사용자</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <AllowedStudentsPanel />
          </TabsContent>
          <TabsContent value="professors" className="mt-6">
            <AllowedProfessorsPanel />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AllowedStudentsPanel() {
  const [rows, setRows] = useState<AllowedStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [note, setNote] = useState("");
  const [bulk, setBulk] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("allowed_student_ids").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as AllowedStudent[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!studentId.trim()) return;
    const { error } = await supabase.from("allowed_student_ids").insert({
      student_id: studentId.trim(), note: note.trim() || null,
    });
    if (error) { toast.error("등록 실패", { description: error.message }); return; }
    toast.success("학번이 등록되었습니다");
    setStudentId(""); setNote(""); load();
  };

  const addBulk = async () => {
    const ids = bulk.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    const { error, count } = await supabase.from("allowed_student_ids")
      .upsert(ids.map((id) => ({ student_id: id })), { onConflict: "student_id", ignoreDuplicates: true, count: "exact" });
    if (error) { toast.error("일괄 등록 실패", { description: error.message }); return; }
    toast.success(`${count ?? ids.length}건 등록되었습니다`);
    setBulk(""); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("allowed_student_ids").delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card title="학번 단건 등록">
          <div className="space-y-3">
            <div className="space-y-2"><Label>학번</Label><Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20241234" /></div>
            <div className="space-y-2"><Label>메모 (선택)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 컴공 25학번" /></div>
            <Button onClick={add} className="w-full">등록</Button>
          </div>
        </Card>
        <Card title="일괄 등록">
          <div className="space-y-3">
            <Label>학번 목록 (쉼표/공백/줄바꿈으로 구분)</Label>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={bulk} onChange={(e) => setBulk(e.target.value)}
              placeholder="20241234&#10;20241235&#10;20241236"
            />
            <Button onClick={addBulk} variant="secondary" className="w-full">일괄 등록</Button>
          </div>
        </Card>
      </div>

      <Card title={`등록된 학번 (${rows.length})`}>
        <div className="max-h-[600px] overflow-auto divide-y divide-border -m-4">
          {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">등록된 학번이 없습니다.</div>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 hover:bg-secondary/40">
              <div>
                <div className="font-mono font-medium">{r.student_id}</div>
                {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AllowedProfessorsPanel() {
  const [rows, setRows] = useState<AllowedProf[]>([]);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("allowed_professor_emails").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as AllowedProf[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!email.trim()) return;
    const { error } = await supabase.from("allowed_professor_emails")
      .insert({ email: email.trim().toLowerCase(), note: note.trim() || null });
    if (error) { toast.error("등록 실패", { description: error.message }); return; }
    toast.success("교수 이메일이 등록되었습니다");
    setEmail(""); setNote(""); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("allowed_professor_emails").delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card title="교수 이메일 등록">
        <div className="space-y-3">
          <div className="space-y-2"><Label>이메일</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prof@university.ac.kr" /></div>
          <div className="space-y-2"><Label>메모 (선택)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 김철수 교수 - 컴공" /></div>
          <Button onClick={add} className="w-full">등록</Button>
        </div>
      </Card>

      <Card title={`등록된 교수 이메일 (${rows.length})`}>
        <div className="max-h-[600px] overflow-auto divide-y divide-border -m-4">
          {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">등록된 이메일이 없습니다.</div>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 hover:bg-secondary/40">
              <div>
                <div className="font-medium">{r.email}</div>
                {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function UsersPanel() {
  const [rows, setRows] = useState<ProfileRow[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as ProfileRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Card title={`전체 사용자 (${rows.length})`}>
      <div className="overflow-auto -m-4">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">이름</th>
              <th className="text-left p-3 font-medium">이메일</th>
              <th className="text-left p-3 font-medium">학번</th>
              <th className="text-left p-3 font-medium">역할</th>
              <th className="text-left p-3 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <td className="p-3 font-medium">{r.full_name}</td>
                <td className="p-3 text-muted-foreground">{r.email}</td>
                <td className="p-3 font-mono text-xs">{r.student_id ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                    {ROLE_LABEL[r.role] ?? r.role}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">아직 가입한 사용자가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-paper">
      <h3 className="font-serif font-bold text-base mb-4 px-1">{title}</h3>
      <div>{children}</div>
    </div>
  );
}
