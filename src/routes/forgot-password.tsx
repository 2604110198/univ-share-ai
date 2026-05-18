import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, KeyRound, ShieldAlert, MailQuestion } from "lucide-react";
import { lookupPasswordHint } from "@/lib/password-hint.functions";
import { requestPasswordRecovery } from "@/lib/password-recovery.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "비밀번호 찾기 — Campus Drive" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [tab, setTab] = useState<"student" | "professor">("student");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [result, setResult] = useState<
    | { kind: "hint"; name: string; masked: string; ident: string }
    | { kind: "no-hint"; name: string; ident: string }
    | { kind: "requested"; alreadyPending: boolean }
    | null
  >(null);

  const lookupFn = useServerFn(lookupPasswordHint);
  const requestFn = useServerFn(requestPasswordRecovery);

  const input = () => (tab === "student" ? { studentId } : { email });

  const onLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await lookupFn({ data: input() });
      if (res.found) {
        setResult({ kind: "hint", name: res.fullName, masked: res.masked, ident: res.identifier ?? "" });
      } else {
        setResult({ kind: "no-hint", name: res.fullName, ident: res.identifier ?? "" });
      }
    } catch (err) {
      toast.error("조회 실패", { description: err instanceof Error ? err.message : "오류" });
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestRecovery = async () => {
    setRequesting(true);
    try {
      const res = await requestFn({ data: input() });
      setResult({ kind: "requested", alreadyPending: res.alreadyPending });
      toast.success(res.alreadyPending ? "이미 신청된 복구 요청이 있습니다" : "복구 신청이 접수되었습니다");
    } catch (err) {
      toast.error("신청 실패", { description: err instanceof Error ? err.message : "오류" });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_oklch(0.4_0.08_255)_0%,_transparent_60%)]" />
        <Link to="/" className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-accent text-accent-foreground grid place-items-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif font-bold text-xl">Campus Drive</div>
            <div className="text-xs text-primary-foreground/60 uppercase tracking-widest">University Disk</div>
          </div>
        </Link>
        <div className="relative">
          <h2 className="font-serif text-3xl font-bold leading-tight mb-4">
            비밀번호를 잊으셨나요?
          </h2>
          <p className="text-primary-foreground/70 text-sm">
            본인 확인용으로 비밀번호의 <strong className="text-accent">앞 2자리</strong>를 확인할 수 있습니다.<br />
            기억이 나지 않으면 <strong className="text-accent">복구 신청</strong> 후 관리자가 임시 비밀번호를 발급합니다.
          </p>
        </div>
        <div className="relative text-xs text-primary-foreground/50">© Campus Drive</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl font-bold text-primary mb-2 inline-flex items-center gap-2">
            <KeyRound className="h-7 w-7" /> 비밀번호 찾기
          </h1>
          <p className="text-sm text-muted-foreground mb-6">학번 또는 교수 이메일을 입력하세요.</p>

          <Tabs value={tab} onValueChange={(v) => { setTab(v as "student" | "professor"); setResult(null); }}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="student">학생</TabsTrigger>
              <TabsTrigger value="professor">교수</TabsTrigger>
            </TabsList>
            <form onSubmit={onLookup} className="space-y-4 mt-6">
              <TabsContent value="student" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="sid">학번</Label>
                  <Input id="sid" required value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20241234" />
                </div>
              </TabsContent>
              <TabsContent value="professor" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prof@university.ac.kr" />
                </div>
              </TabsContent>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "조회 중..." : "비밀번호 확인"}
              </Button>
            </form>
          </Tabs>

          {result?.kind === "hint" && (
            <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-5 space-y-3">
              <div className="text-xs text-muted-foreground">{result.ident}</div>
              <div className="font-medium">{result.name} 님</div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">앞 2자리만 표시 (나머지는 * 처리)</div>
                <div className="font-mono text-2xl tracking-widest text-primary bg-card border border-border rounded-md p-3 text-center">
                  {result.masked}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1">
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                앞 2자리 힌트로 본인의 비밀번호를 떠올려 보세요. 기억나지 않으면 아래 복구 신청을 이용하세요.
              </p>
              <Button onClick={onRequestRecovery} disabled={requesting} variant="outline" className="w-full">
                <MailQuestion className="h-4 w-4 mr-1.5" />
                {requesting ? "신청 중..." : "기억나지 않음 — 복구 신청"}
              </Button>
            </div>
          )}

          {result?.kind === "no-hint" && (
            <div className="mt-6 rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="text-sm">{result.name} 님 ({result.ident})</div>
              <p className="text-sm text-muted-foreground">
                저장된 비밀번호 힌트가 없습니다. (기존 가입자이거나 비밀번호 변경 이력이 없는 경우)
              </p>
              <Button onClick={onRequestRecovery} disabled={requesting} className="w-full">
                <MailQuestion className="h-4 w-4 mr-1.5" />
                {requesting ? "신청 중..." : "관리자에게 비밀번호 복구 신청"}
              </Button>
            </div>
          )}

          {result?.kind === "requested" && (
            <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-5">
              <p className="text-sm">
                {result.alreadyPending
                  ? "이미 신청하신 복구 요청이 처리 대기 중입니다."
                  : "복구 신청이 관리자에게 전달되었습니다."}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                관리자가 임시 비밀번호를 설정한 뒤 학번/이메일 보유자에게 통보합니다. 로그인 후 즉시 새 비밀번호로 변경하세요.
              </p>
            </div>
          )}

          <p className="mt-6 text-sm text-muted-foreground text-center">
            <Link to="/login" className="text-primary font-medium hover:text-accent">로그인으로 돌아가기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
