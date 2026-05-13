import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, KeyRound, ShieldAlert } from "lucide-react";
import { issueTempPassword } from "@/lib/password-recovery.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "비밀번호 찾기 — Campus Drive" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [tab, setTab] = useState<"student" | "professor">("student");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ name: string; masked: string; ident: string } | null>(null);

  const issueFn = useServerFn(issueTempPassword);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await issueFn({
        data: tab === "student" ? { studentId } : { email },
      });
      setResult({ name: res.fullName, masked: res.maskedPassword, ident: res.identifier ?? "" });
      toast.success("임시 비밀번호가 발급되었습니다");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다";
      toast.error("비밀번호 찾기 실패", { description: msg });
    } finally {
      setSubmitting(false);
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
            보안을 위해 기존 비밀번호는 표시할 수 없습니다.<br />
            대신 <strong className="text-accent">임시 비밀번호</strong>를 새로 발급해 드립니다.<br />
            로그인 후 반드시 새 비밀번호로 변경하세요.
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

          {result ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-accent/40 bg-accent/10 p-5 space-y-3">
                <div className="text-xs text-muted-foreground">{result.ident}</div>
                <div className="font-medium">{result.name} 님</div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">임시 비밀번호 (마지막 2자리는 가려져 있음)</div>
                  <div className="font-mono text-2xl tracking-widest text-primary bg-card border border-border rounded-md p-3 text-center">
                    {result.masked}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                  유출 방지를 위해 마지막 2자리는 <strong>**</strong>로 표시됩니다. 본인의 학번/계정 기록이나 관리자 안내를 통해 마지막 2자리를 확인하세요. 로그인 후 반드시 새 비밀번호로 변경해야 합니다.
                </p>
              </div>
              <Link to="/login"><Button className="w-full">로그인 하러 가기</Button></Link>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "student" | "professor")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="student">학생</TabsTrigger>
                <TabsTrigger value="professor">교수</TabsTrigger>
              </TabsList>
              <form onSubmit={onSubmit} className="space-y-4 mt-6">
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
                  {submitting ? "확인 중..." : "임시 비밀번호 발급"}
                </Button>
              </form>
            </Tabs>
          )}

          <p className="mt-6 text-sm text-muted-foreground text-center">
            <Link to="/login" className="text-primary font-medium hover:text-accent">로그인으로 돌아가기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
