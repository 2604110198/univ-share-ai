import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Upload, Download, Trash2, FileText, Clock, AlertTriangle } from "lucide-react";
import { formatBytes, formatDate, MAX_FILE_SIZE } from "@/lib/format";

export const Route = createFileRoute("/folder/$folderId")({
  head: () => ({ meta: [{ title: "폴더 — Campus Drive" }] }),
  component: FolderPage,
});

interface FolderDetail {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_assignment: boolean;
  due_date: string | null;
}

interface FileRow {
  id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string | null;
  kind: "material" | "submission";
  uploader_id: string;
  created_at: string;
  uploader_name?: string;
}

function FolderPage() {
  const { folderId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<FolderDetail | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    setLoadingData(true);
    const { data: f, error: fErr } = await supabase
      .from("folders").select("*").eq("id", folderId).maybeSingle();
    if (fErr || !f) {
      toast.error("폴더를 찾을 수 없습니다");
      navigate({ to: "/dashboard" });
      return;
    }
    setFolder(f as FolderDetail);

    const { data: fileData } = await supabase
      .from("files").select("*").eq("folder_id", folderId).order("created_at", { ascending: false });

    const uploaderIds = Array.from(new Set((fileData ?? []).map((x) => x.uploader_id)));
    const { data: profs } = uploaderIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", uploaderIds)
      : { data: [] as { id: string; full_name: string }[] };
    const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));

    setFiles((fileData ?? []).map((x) => ({ ...x, uploader_name: map.get(x.uploader_id) ?? "—" })) as FileRow[]);
    setLoadingData(false);
  }, [folderId, navigate]);

  useEffect(() => {
    if (user && profile) load();
  }, [user, profile, load]);

  if (loading || loadingData || !profile || !folder) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center text-muted-foreground">불러오는 중...</div>
      </div>
    );
  }

  const isOwner = folder.owner_id === user?.id;
  const isAdmin = profile.role === "admin";
  const isProfessor = profile.role === "professor";
  const isStudent = profile.role === "student";
  const dueDatePassed = folder.due_date ? new Date(folder.due_date) < new Date() : false;

  // Derive what kind of file the current user uploads here
  let canUpload = false;
  let uploadKind: "material" | "submission" | null = null;
  let uploadDisabledReason = "";

  if (isAdmin || isOwner) {
    canUpload = true;
    uploadKind = "material";
  } else if (folder.is_assignment && isStudent) {
    if (dueDatePassed) {
      uploadDisabledReason = "마감 시간이 지나 더 이상 제출할 수 없습니다.";
    } else {
      canUpload = true;
      uploadKind = "submission";
    }
  } else if (folder.is_assignment && isProfessor && !isOwner) {
    uploadDisabledReason = "다른 교수의 과제 폴더에는 업로드할 수 없습니다.";
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !uploadKind) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("파일이 너무 큽니다", { description: `최대 ${formatBytes(MAX_FILE_SIZE)}까지 가능합니다.` });
      e.target.value = "";
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-가-힣\s]/g, "_");
    const path = `${folder.id}/${user.id}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("course-files").upload(path, file, {
      contentType: file.type || undefined,
    });
    if (upErr) {
      setUploading(false);
      toast.error("업로드 실패", { description: upErr.message });
      e.target.value = "";
      return;
    }
    const { error: insErr } = await supabase.from("files").insert({
      folder_id: folder.id,
      uploader_id: user.id,
      file_name: file.name,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || null,
      kind: uploadKind,
    });
    setUploading(false);
    if (insErr) {
      toast.error("기록 실패", { description: insErr.message });
      return;
    }
    toast.success("업로드 완료");
    e.target.value = "";
    load();
  };

  const handleDownload = async (f: FileRow) => {
    const { data, error } = await supabase.storage.from("course-files").createSignedUrl(f.storage_path, 60);
    if (error || !data) {
      toast.error("다운로드 링크 생성 실패", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (f: FileRow) => {
    if (!confirm(`"${f.file_name}"을(를) 삭제할까요?`)) return;
    await supabase.storage.from("course-files").remove([f.storage_path]);
    const { error } = await supabase.from("files").delete().eq("id", f.id);
    if (error) {
      toast.error("삭제 실패", { description: error.message });
      return;
    }
    toast.success("삭제되었습니다");
    load();
  };

  const materialFiles = files.filter((f) => f.kind === "material");
  const submissionFiles = files.filter((f) => f.kind === "submission");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> 대시보드로
        </Link>

        {/* Folder header */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-paper mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {folder.is_assignment && (
                  <Badge variant="outline" className="border-accent text-accent">과제</Badge>
                )}
                {folder.is_assignment && folder.due_date && (
                  <span className={`inline-flex items-center text-xs ${dueDatePassed ? "text-destructive" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3 mr-1" />
                    마감 {formatDate(folder.due_date)} {dueDatePassed && "· 마감됨"}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl font-bold text-primary mb-2">{folder.name}</h1>
              {folder.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{folder.description}</p>
              )}
            </div>

            {canUpload ? (
              <div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  {uploading ? "업로드 중..." : uploadKind === "submission" ? "과제 제출" : "자료 업로드"}
                </Button>
              </div>
            ) : uploadDisabledReason ? (
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 max-w-xs">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {uploadDisabledReason}
              </div>
            ) : null}
          </div>
        </div>

        {/* Materials list */}
        <FileSection
          title={folder.is_assignment ? "과제 안내 자료" : "자료"}
          files={materialFiles}
          onDownload={handleDownload}
          onDelete={handleDelete}
          canDelete={(f) => isAdmin || isOwner || f.uploader_id === user?.id}
          empty="아직 자료가 없습니다."
        />

        {/* Submissions (assignment folders only) */}
        {folder.is_assignment && (
          <div className="mt-8">
            <FileSection
              title={isStudent ? "내 제출물" : "제출된 과제"}
              files={submissionFiles}
              onDownload={handleDownload}
              onDelete={handleDelete}
              canDelete={(f) => isAdmin || isOwner || f.uploader_id === user?.id}
              empty={isStudent ? "아직 제출한 파일이 없습니다." : "아직 제출된 과제가 없습니다."}
              showUploader
            />
          </div>
        )}
      </main>
    </div>
  );
}

function FileSection({
  title, files, onDownload, onDelete, canDelete, empty, showUploader = false,
}: {
  title: string;
  files: FileRow[];
  onDownload: (f: FileRow) => void;
  onDelete: (f: FileRow) => void;
  canDelete: (f: FileRow) => boolean;
  empty: string;
  showUploader?: boolean;
}) {
  return (
    <section>
      <h2 className="font-serif text-xl font-bold mb-3 flex items-center gap-2">
        {title} <Badge variant="secondary">{files.length}</Badge>
      </h2>
      {files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden shadow-paper">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition-colors">
              <div className="h-10 w-10 rounded-md bg-secondary text-primary grid place-items-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{f.file_name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(f.size_bytes)} · {formatDate(f.created_at)}
                  {showUploader && f.uploader_name ? ` · 제출자: ${f.uploader_name}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onDownload(f)}>
                <Download className="h-4 w-4" />
              </Button>
              {canDelete(f) && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(f)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
