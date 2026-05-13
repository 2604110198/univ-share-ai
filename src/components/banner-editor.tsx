import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";
import { uploadSiteAsset, setSetting } from "@/lib/site-settings";
import { toast } from "sonner";

export function AdminImageEditButton({
  settingKey, prefix, userId, onUpdated, label = "편집",
}: {
  settingKey: string;
  prefix: string;
  userId: string;
  onUpdated: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const url = await uploadSiteAsset(file, prefix);
    if (!url) { setBusy(false); toast.error("업로드 실패"); return; }
    const { error } = await setSetting(settingKey, url, userId);
    setBusy(false);
    if (error) { toast.error("저장 실패", { description: error.message }); return; }
    toast.success("이미지가 변경되었습니다");
    onUpdated(url);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2 z-10 shadow-md"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Pencil className="h-3.5 w-3.5 mr-1" />}
        {label}
      </Button>
    </>
  );
}
