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
import { studentIdToEmail } from "@/lib/credentials";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 — Campus Drive" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"student" | "professor">("student");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const loginEmail = tab === "student" ? studentIdToEmail(studentId) : email.trim();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setSubmitting(false);
    if (error) {
      toast.error("로그인 실패", {
        description:
          tab === "student"
            ? "학번 또는 비밀번호가 올바르지 않습니다."
            : "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    } else {
      toast.success("환영합니다");
      navigate({ to: "/" });
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
          <h2 className="font-serif text-4xl font-bold leading-tight mb-4">
            "지식은 나눌수록<br />더욱 깊어집니다."
          </h2>
          <p className="text-primary-foreground/70 max-w-md">
            교수와 학생이 한 공간에서 강의 자료와 과제를 안전하게 주고받을 수 있는 대학 전용 공간입니다.
          </p>
        </div>
        <div className="relative text-xs text-primary-foreground/50">© Campus Drive</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl font-bold text-primary mb-2">로그인</h1>
          <p className="text-sm text-muted-foreground mb-6">
            소속에 맞는 탭을 선택하여 로그인하세요.
          </p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "student" | "professor")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="student">학생 / 관리자</TabsTrigger>
              <TabsTrigger value="professor">교수</TabsTrigger>
            </TabsList>

            <form onSubmit={onSubmit} className="space-y-4 mt-6">
              <TabsContent value="student" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="sid">학번</Label>
                  <Input id="sid" required value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20241234 (관리자: 0000)" />
                </div>
              </TabsContent>
              <TabsContent value="professor" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prof@university.ac.kr" />
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </Tabs>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            계정이 없으신가요?{" "}
            <Link to="/signup" className="text-primary font-medium hover:text-accent">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
