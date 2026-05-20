import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, UserCog, GraduationCap, Users, Settings, BookOpen, Pencil, KeyRound, Copy, CheckCircle } from "lucide-react";
import { WEEKDAY_LABEL, WEEKDAY_ORDER } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABEL, formatDate } from "@/lib/format";
import { validatePassword } from "@/lib/credentials";
import { archiveRecoveryRequest, issueTempPasswordForRequest, markRecoveryRequestCompleted } from "@/lib/password-recovery.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "관리자 — Campus Drive" }] }),
  component: AdminPage,
});

interface AllowedStudent { id: string; student_id: string; student_name: string | null; note: string | null; created_at: string }
interface AllowedProf { id: string; email: string; professor_name: string | null; note: string | null; created_at: string }
interface ProfileRow { id: string; full_name: string; email: string; student_id: string | null; role: string; created_at: string; can_write_notice?: boolean }

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

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1.5" />관리자 설정</TabsTrigger>
            <TabsTrigger value="students"><GraduationCap className="h-4 w-4 mr-1.5" />허용 학번</TabsTrigger>
            <TabsTrigger value="professors"><UserCog className="h-4 w-4 mr-1.5" />허용 교수</TabsTrigger>
            <TabsTrigger value="courses"><BookOpen className="h-4 w-4 mr-1.5" />강의 관리</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" />가입 사용자</TabsTrigger>
            <TabsTrigger value="recovery"><KeyRound className="h-4 w-4 mr-1.5" />비밀번호 복구</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6"><AdminSettingsPanel /></TabsContent>
          <TabsContent value="students" className="mt-6"><AllowedStudentsPanel /></TabsContent>
          <TabsContent value="professors" className="mt-6"><AllowedProfessorsPanel /></TabsContent>
          <TabsContent value="courses" className="mt-6"><CoursesPanel /></TabsContent>
          <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>
          <TabsContent value="recovery" className="mt-6"><RecoveryPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AdminSettingsPanel() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile?.full_name]);

  const saveName = async () => {
    if (!name.trim()) { toast.error("이름을 입력하세요"); return; }
    if (!profile) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
    setSavingName(false);
    if (error) { toast.error("저장 실패", { description: error.message }); return; }
    toast.success("관리자 이름이 변경되었습니다");
    await refreshProfile();
  };

  const savePassword = async () => {
    if (!currentPw) { toast.error("현재 비밀번호를 입력하세요"); return; }
    if (newPw !== confirmPw) { toast.error("새 비밀번호 확인이 일치하지 않습니다"); return; }
    const pwErr = validatePassword(newPw);
    if (pwErr) { toast.error(pwErr); return; }

    if (!profile) return;
    setSavingPw(true);
    // Re-authenticate to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPw,
    });
    if (signInErr) {
      setSavingPw(false);
      toast.error("현재 비밀번호가 올바르지 않습니다");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) { toast.error("비밀번호 변경 실패", { description: error.message }); return; }
    toast.success("비밀번호가 변경되었습니다");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card title="관리자 정보">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>학번</Label>
            <Input value={profile?.student_id ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김관리" />
          </div>
          <Button onClick={saveName} disabled={savingName} className="w-full">
            {savingName ? "저장 중..." : "이름 변경"}
          </Button>
        </div>
      </Card>

      <Card title="비밀번호 변경">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>현재 비밀번호</Label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="초기값: 1234" />
          </div>
          <div className="space-y-2">
            <Label>새 비밀번호</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="8자 이상, 특수문자 포함" />
          </div>
          <div className="space-y-2">
            <Label>새 비밀번호 확인</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          <Button onClick={savePassword} disabled={savingPw} className="w-full">
            {savingPw ? "변경 중..." : "비밀번호 변경"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            보안을 위해 초기 비밀번호(1234)는 반드시 변경해 주세요.
          </p>
        </div>
      </Card>
    </div>
  );
}

function AllowedStudentsPanel() {
  const [rows, setRows] = useState<AllowedStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("allowed_student_ids").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as AllowedStudent[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!studentId.trim() || !studentName.trim()) {
      toast.error("학번과 이름을 모두 입력하세요");
      return;
    }
    const { error } = await supabase.from("allowed_student_ids").insert({
      student_id: studentId.trim(),
      student_name: studentName.trim(),
      note: note.trim() || null,
    });
    if (error) { toast.error("등록 실패", { description: error.message }); return; }
    toast.success(`${studentName.trim()} (${studentId.trim()}) 학번이 등록되었습니다`);
    setStudentId(""); setStudentName(""); setNote(""); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("allowed_student_ids").delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card title="학번 등록">
        <div className="space-y-3">
          <div className="space-y-2"><Label>학번</Label><Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20241234" /></div>
          <div className="space-y-2"><Label>학생 이름</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="예: 홍길동" /></div>
          <div className="space-y-2"><Label>메모 (선택)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 컴공 25학번" /></div>
          <Button onClick={add} className="w-full">등록</Button>
          <p className="text-[11px] text-muted-foreground">
            등록된 학번과 이름으로만 학생이 가입할 수 있습니다.
          </p>
        </div>
      </Card>

      <Card title={`등록된 학번 (${rows.length})`}>
        <div className="max-h-[600px] overflow-auto divide-y divide-border -m-4">
          {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">등록된 학번이 없습니다.</div>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 hover:bg-secondary/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.student_name ?? "—"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.student_id}</span>
                </div>
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
  const [profName, setProfName] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("allowed_professor_emails").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as AllowedProf[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!email.trim() || !profName.trim()) {
      toast.error("이메일과 교수 이름을 모두 입력하세요");
      return;
    }
    const { error } = await supabase.from("allowed_professor_emails")
      .insert({
        email: email.trim().toLowerCase(),
        professor_name: profName.trim(),
        note: note.trim() || null,
      });
    if (error) { toast.error("등록 실패", { description: error.message }); return; }
    toast.success(`${profName.trim()} 교수가 등록되었습니다`);
    setEmail(""); setProfName(""); setNote(""); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("allowed_professor_emails").delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card title="교수 등록">
        <div className="space-y-3">
          <div className="space-y-2"><Label>이메일</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prof@university.ac.kr" /></div>
          <div className="space-y-2"><Label>교수 이름</Label><Input value={profName} onChange={(e) => setProfName(e.target.value)} placeholder="예: 김철수" /></div>
          <div className="space-y-2"><Label>메모 (선택)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 컴공 학과" /></div>
          <Button onClick={add} className="w-full">등록</Button>
          <p className="text-[11px] text-muted-foreground">
            등록된 이메일로만 교수가 가입할 수 있습니다.
          </p>
        </div>
      </Card>

      <Card title={`등록된 교수 (${rows.length})`}>
        <div className="max-h-[600px] overflow-auto divide-y divide-border -m-4">
          {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">등록된 교수가 없습니다.</div>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 hover:bg-secondary/40">
              <div>
                <div className="font-medium">{r.professor_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{r.email}</div>
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

  const toggleNoticeWrite = async (id: string, next: boolean) => {
    const { error } = await supabase.from("profiles").update({ can_write_notice: next }).eq("id", id);
    if (error) { toast.error("변경 실패", { description: error.message }); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, can_write_notice: next } : r)));
  };

  return (
    <Card title={`전체 사용자 (${rows.length})`}>
      <div className="overflow-auto -m-4">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">이름</th>
              <th className="text-left p-3 font-medium">학번 / 이메일</th>
              <th className="text-left p-3 font-medium">역할</th>
              <th className="text-left p-3 font-medium">공지 작성 권한</th>
              <th className="text-left p-3 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <td className="p-3 font-medium">{r.full_name}</td>
                <td className="p-3 text-xs">
                  {r.student_id ? (
                    <span className="font-mono">{r.student_id}</span>
                  ) : (
                    <span className="text-muted-foreground">{r.email}</span>
                  )}
                </td>
                <td className="p-3">
                  <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                    {ROLE_LABEL[r.role] ?? r.role}
                  </Badge>
                </td>
                <td className="p-3">
                  {r.role === "admin" || r.role === "professor" ? (
                    <span className="text-xs text-muted-foreground">기본 권한</span>
                  ) : r.role === "student" ? (
                    <button
                      onClick={() => toggleNoticeWrite(r.id, !r.can_write_notice)}
                      className={`text-[11px] px-2 py-1 rounded border ${r.can_write_notice ? "bg-accent/20 border-accent/40 text-accent-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}
                    >
                      {r.can_write_notice ? "작성 가능 (해제)" : "작성 권한 부여"}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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

interface CourseRow {
  id: string; name: string; weekday: string;
  start_time: string; end_time: string; classroom: string | null;
  professor_id: string | null; professor_name: string | null;
  description?: string | null;
  textbook_title?: string | null; textbook_info?: string | null;
}

function CoursesPanel() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [profs, setProfs] = useState<{ id: string; full_name: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [weekday, setWeekday] = useState<string>("mon");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [classroom, setClassroom] = useState("");
  const [profId, setProfId] = useState("");
  const [description, setDescription] = useState("");
  const [textbookTitle, setTextbookTitle] = useState("");
  const [textbookInfo, setTextbookInfo] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("courses").select("*").order("weekday").order("start_time");
    setRows((data ?? []) as CourseRow[]);
    const { data: ps } = await supabase.from("profiles").select("id, full_name").eq("role", "professor");
    setProfs((ps ?? []) as { id: string; full_name: string }[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName(""); setWeekday("mon"); setStartTime("09:00"); setEndTime("10:30");
    setClassroom(""); setProfId(""); setDescription(""); setTextbookTitle(""); setTextbookInfo("");
  };

  const startEdit = (r: CourseRow) => {
    setEditingId(r.id);
    setName(r.name);
    setWeekday(r.weekday);
    setStartTime(r.start_time.slice(0, 5));
    setEndTime(r.end_time.slice(0, 5));
    setClassroom(r.classroom ?? "");
    setProfId(r.professor_id ?? "");
    setDescription(r.description ?? "");
    setTextbookTitle(r.textbook_title ?? "");
    setTextbookInfo(r.textbook_info ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!name.trim()) { toast.error("강의명을 입력하세요"); return; }
    const prof = profs.find((p) => p.id === profId);
    const payload = {
      name: name.trim(),
      weekday: weekday as "mon" | "tue" | "wed" | "thu" | "fri",
      start_time: startTime,
      end_time: endTime,
      classroom: classroom.trim() || null,
      professor_id: profId || null,
      professor_name: prof?.full_name ?? null,
      description: description.trim() || null,
      textbook_title: textbookTitle.trim() || null,
      textbook_info: textbookInfo.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editingId);
      if (error) { toast.error("수정 실패", { description: error.message }); return; }
      toast.success("강의가 수정되었습니다");
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast.error("등록 실패", { description: error.message }); return; }
      toast.success("강의가 등록되었습니다");
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error("삭제 실패", { description: error.message }); return; }
    if (editingId === id) resetForm();
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card title={editingId ? "강의 수정" : "강의 등록"}>
        <div className="space-y-3">
          <div className="space-y-2"><Label>강의명</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 반도체공정실습" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>요일</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAY_ORDER.map((d) => <SelectItem key={d} value={d}>{WEEKDAY_LABEL[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>강의실</Label>
              <Input value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder="예: 301호" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>시작 시간</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="space-y-2"><Label>종료 시간</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>담당 교수</Label>
            <Select value={profId} onValueChange={setProfId}>
              <SelectTrigger><SelectValue placeholder="가입한 교수 중 선택 (선택사항)" /></SelectTrigger>
              <SelectContent>
                {profs.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>설명 (선택)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="강의 설명" />
          </div>
          <div className="space-y-2">
            <Label>교재명 (선택)</Label>
            <Input value={textbookTitle} onChange={(e) => setTextbookTitle(e.target.value)} placeholder="예: 반도체 공정 기초" />
          </div>
          <div className="space-y-2">
            <Label>교재 정보 (선택)</Label>
            <Input value={textbookInfo} onChange={(e) => setTextbookInfo(e.target.value)} placeholder="출판사, 저자, ISBN 등" />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">{editingId ? "수정 저장" : "등록"}</Button>
            {editingId && <Button variant="outline" onClick={resetForm}>취소</Button>}
          </div>
        </div>
      </Card>

      <Card title={`등록된 강의 (${rows.length})`}>
        <div className="max-h-[600px] overflow-auto divide-y divide-border -m-4">
          {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">등록된 강의가 없습니다.</div>}
          {rows.map((r) => (
            <div key={r.id} className={`flex items-center justify-between p-3 hover:bg-secondary/40 ${editingId === r.id ? "bg-accent/10" : ""}`}>
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {WEEKDAY_LABEL[r.weekday]} {r.start_time.slice(0, 5)}~{r.end_time.slice(0, 5)}
                  {r.classroom && ` · ${r.classroom}`}
                  {r.professor_name && ` · ${r.professor_name}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(r)} title="수정">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive" title="삭제">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface RecoveryRow {
  id: string; user_id: string; identifier: string; full_name: string | null;
  role: string | null; status: string; temp_password: string | null;
  requested_at: string; completed_at: string | null;
}

function RecoveryPanel() {
  const [rows, setRows] = useState<RecoveryRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [tempPwInputs, setTempPwInputs] = useState<Record<string, string>>({});
  const issueFn = useServerFn(issueTempPasswordForRequest);
  const markCompletedFn = useServerFn(markRecoveryRequestCompleted);
  const archiveFn = useServerFn(archiveRecoveryRequest);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("password_recovery_requests")
      .select("*")
      .neq("status", "archived")
      .order("requested_at", { ascending: false });
    setRows((data ?? []) as RecoveryRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const issue = async (id: string) => {
    const pw = (tempPwInputs[id] ?? "").trim();
    if (pw.length < 6) { toast.error("임시 비밀번호는 6자 이상이어야 합니다"); return; }
    if (!confirm(`임시 비밀번호 "${pw}" 로 설정하시겠습니까? 발급 후 해당 사용자에게 직접 통보해 주세요.`)) return;
    setBusy(id);
    try {
      await issueFn({ data: { requestId: id, tempPassword: pw } });
      toast.success("임시 비밀번호가 발급되었습니다");
      setTempPwInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
      await load();
    } catch (err) {
      toast.error("발급 실패", { description: err instanceof Error ? err.message : "오류" });
    } finally {
      setBusy(null);
    }
  };

  const copy = async (pw: string) => {
    try { await navigator.clipboard.writeText(pw); toast.success("복사되었습니다"); } catch { toast.error("복사 실패"); }
  };

  const markCompleted = async (id: string) => {
    setBusy(id);
    try { await markCompletedFn({ data: { requestId: id } }); toast.success("처리 완료로 이동했습니다"); await load(); }
    catch (err) { toast.error("처리 실패", { description: err instanceof Error ? err.message : "오류" }); }
    finally { setBusy(null); }
  };

  const archive = async (id: string) => {
    setBusy(id);
    try { await archiveFn({ data: { requestId: id } }); toast.success("확인되어 목록에서 제거되었습니다"); await load(); }
    catch (err) { toast.error("확인 실패", { description: err instanceof Error ? err.message : "오류" }); }
    finally { setBusy(null); }
  };

  const pending = rows.filter((r) => r.status === "pending");
  const completed = rows.filter((r) => r.status === "completed");

  return (
    <div className="space-y-6">
      <Card title={`대기 중인 복구 신청 (${pending.length})`}>
        <div className="divide-y divide-border -m-4">
          {pending.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">대기 중인 신청이 없습니다.</div>}
          {pending.map((r) => (
            <div key={r.id} className="p-3 space-y-2">
              <div>
                <div className="font-medium">{r.full_name ?? "—"} <span className="text-xs text-muted-foreground ml-1">({ROLE_LABEL[r.role ?? ""] ?? r.role})</span></div>
                <div className="text-xs text-muted-foreground font-mono">{r.identifier}</div>
                <div className="text-[11px] text-muted-foreground">신청: {formatDate(r.requested_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="임시 비밀번호 입력 (6자 이상)"
                  value={tempPwInputs[r.id] ?? ""}
                  onChange={(e) => setTempPwInputs((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="flex-1"
                />
                <Button size="sm" onClick={() => issue(r.id)} disabled={busy === r.id}>
                  {busy === r.id ? "발급 중..." : "발급"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`처리 완료 (${completed.length})`}>
        <div className="divide-y divide-border -m-4 max-h-[400px] overflow-auto">
          {completed.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">처리된 신청이 없습니다.</div>}
          {completed.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{r.full_name ?? "—"} <span className="text-xs text-muted-foreground ml-1">({r.identifier})</span></div>
                <div className="text-[11px] text-muted-foreground">처리: {formatDate(r.completed_at)}</div>
                {r.temp_password && (
                  <div className="mt-1 inline-flex items-center gap-2">
                    <code className="font-mono text-sm bg-secondary px-2 py-0.5 rounded">{r.temp_password}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy(r.temp_password!)}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 px-1">
          관리자가 입력한 임시 비밀번호는 해당 사용자가 로그인 후 개인정보 수정에서 즉시 새 비밀번호로 변경할 수 있도록 안내해 주세요.
        </p>
      </Card>
    </div>
  );
}
