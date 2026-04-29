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

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "회원가입 — Campus Drive" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"student" | "professor">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          signup_role: role,
          student_id: role === "student" ? studentId.trim() : null,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      // surface the trigger's friendly Korean message if present
      const msg = error.message.includes("등록되지 않은") ? error.message :
        error.message.includes("Database error")
          ? "가입이 거부되었습니다. 학번 또는 교수 이메일이 사전 등록되어 있는지 관리자에게 확인하세요."
          : error.message;
      toast.error("회원가입 실패", { description: msg });
      return;
    }
    toast.success("가입이 완료되었습니다", { description: "로그인하여 시작하세요." });
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
            <li>• 가입 정보가 없다면 관리자에게 등록을 요청하세요</li>
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
            <TabsContent value="student" className="mt-4 text-xs text-muted-foreground">
              사전 등록된 <strong>학번</strong>이 있어야 가입할 수 있습니다.
            </TabsContent>
            <TabsContent value="professor" className="mt-4 text-xs text-muted-foreground">
              사전 등록된 <strong>학교 이메일</strong>이 있어야 가입할 수 있습니다.
            </TabsContent>
          </Tabs>

          <form onSubmit={onSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">이름</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {role === "student" && (
              <div className="space-y-2">
                <Label htmlFor="sid">학번</Label>
                <Input id="sid" required value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20241234" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 (8자 이상)</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "가입 중..." : "가입하기"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            이미 계정이 있나요?{" "}
            <Link to="/login" className="text-primary font-medium hover:text-accent">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
