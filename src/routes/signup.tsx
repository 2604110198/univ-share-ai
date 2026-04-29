import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import {
  studentIdToEmail,
  validatePassword,
  validateStudentId,
  ADMIN_STUDENT_ID,
} from "@/lib/credentials";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "회원가입 — Campus Drive" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"student" | "professor">("student");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast.error("비밀번호 확인이 일치하지 않습니다");
      return;
    }

    const isAdminBootstrap = role === "student" && studentId.trim() === ADMIN_STUDENT_ID;
    const pwErr = validatePassword(password, { allowAdminDefault: isAdminBootstrap });
    if (pwErr) {
      toast.error(pwErr);
      return;
    }

    let signupEmail: string;
    let signupRole: "student" | "professor" | "admin" = role;

    if (role === "student") {
      const sidErr = validateStudentId(studentId);
      if (sidErr) { toast.error(sidErr); return; }
      signupEmail = studentIdToEmail(studentId);
      if (isAdminBootstrap) signupRole = "admin";
    } else {
      if (!email.trim()) { toast.error("이메일을 입력하세요"); return; }
      signupEmail = email.trim().toLowerCase();
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          signup_role: signupRole,
          student_id: role === "student" ? studentId.trim() : null,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      const msg = error.message.includes("등록되지 않은") || error.message.includes("관리자 계정은")
        ? error.message
        : error.message.toLowerCase().includes("already")
          ? "이미 가입된 계정입니다. 로그인해주세요."
          : error.message.includes("Database error")
            ? "가입이 거부되었습니다. 학번 또는 교수 이메일이 사전 등록되어 있는지 관리자에게 확인하세요."
            : error.message;
      toast.error("회원가입 실패", { description: msg });
      return;
    }
    toast.success("가입이 완료되었습니다", { description: "이제 로그인할 수 있습니다." });
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_oklch(0.4_0.08_255)_0%,_transparent_60%)]" />
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
            사전 등록된 구성원만<br />가입할 수 있습니다.
          </h2>
          <ul className="space-y-2 text-primary-foreground/70 text-sm">
            <li>• 학생: 관리자가 등록한 학번이 있어야 가입 가능</li>
            <li>• 교수: 관리자가 등록한 학교 이메일이 있어야 가입 가능</li>
            <li>• 비밀번호: 8자 이상, 특수문자 1자 이상 포함</li>
          </ul>
        </div>
        <div className="relative text-xs text-primary-foreground/50">© Campus Drive</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl font-bold text-primary mb-2">회원가입</h1>
          <p className="text-sm text-muted-foreground mb-6">
            소속 유형을 선택하고 정보를 입력하세요.
          </p>

          <Tabs value={role} onValueChange={(v) => setRole(v as "student" | "professor")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="student">학생</TabsTrigger>
              <TabsTrigger value="professor">교수</TabsTrigger>
            </TabsList>

            <form onSubmit={onSubmit} className="space-y-4 mt-6">
              <TabsContent value="student" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="sid">학번</Label>
                  <Input id="sid" required value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20241234" />
                  <p className="text-[11px] text-muted-foreground">관리자가 사전 등록한 학번만 가입할 수 있습니다.</p>
                </div>
              </TabsContent>
              <TabsContent value="professor" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prof@university.ac.kr" />
                  <p className="text-[11px] text-muted-foreground">관리자가 사전 등록한 교수 이메일만 가입할 수 있습니다.</p>
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상, 특수문자 포함" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">비밀번호 확인</Label>
                <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "가입 중..." : "가입하기"}
              </Button>
            </form>
          </Tabs>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            이미 계정이 있나요?{" "}
            <Link to="/login" className="text-primary font-medium hover:text-accent">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
