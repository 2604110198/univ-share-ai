import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import { ROLE_LABEL } from "@/lib/format";
import { validatePassword } from "@/lib/credentials";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "회원 정보 변경 — 반도체장비소프트웨어학과" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);
  useEffect(() => { if (profile) setName(profile.full_name); }, [profile]);

  if (loading || !profile) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">불러오는 중...</div>;
  }

  const saveName = async () => {
    if (!name.trim()) { toast.error("이름을 입력하세요"); return; }
    setSavingName(true);
    const { error } = await supabase.rpc("update_my_profile", { _full_name: name.trim() });
    setSavingName(false);
    if (error) { toast.error("저장 실패", { description: error.message }); return; }
    toast.success("이름이 변경되었습니다");
    await refreshProfile();
  };

  const savePassword = async () => {
    if (!currentPw) { toast.error("현재 비밀번호를 입력하세요"); return; }
    if (newPw !== confirmPw) { toast.error("새 비밀번호 확인이 일치하지 않습니다"); return; }
    const pwErr = validatePassword(newPw);
    if (pwErr) { toast.error(pwErr); return; }

    setSavingPw(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile.email, password: currentPw,
    });
    if (signInErr) { setSavingPw(false); toast.error("현재 비밀번호가 올바르지 않습니다"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) { toast.error("비밀번호 변경 실패", { description: error.message }); return; }
    toast.success("비밀번호가 변경되었습니다");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-10">
        <PageHeader
          icon={UserCog}
          title="회원 정보 변경"
          description="이름과 비밀번호를 변경할 수 있습니다."
        />

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-lg border border-border bg-card p-6 shadow-paper">
            <h3 className="font-serif font-bold text-base mb-4">기본 정보</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>역할</Label>
                <Input value={ROLE_LABEL[profile.role] ?? profile.role} disabled />
              </div>
              <div className="space-y-2">
                <Label>{profile.student_id ? "학번" : "이메일"}</Label>
                <Input value={profile.student_id ?? profile.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>이름</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button onClick={saveName} disabled={savingName} className="w-full">
                {savingName ? "저장 중..." : "이름 변경"}
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-paper">
            <h3 className="font-serif font-bold text-base mb-4">비밀번호 변경</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>현재 비밀번호</Label>
                <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
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
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
