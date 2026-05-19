import { supabase } from "@/integrations/supabase/client";
import { MAX_FILE_SIZE } from "@/lib/format";

export async function uploadAttachments(opts: {
  postId: string;
  files: File[];
  uploaderId: string;
}) {
  const errors: string[] = [];
  for (const file of opts.files) {
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: 파일 크기 한도를 초과합니다`);
      continue;
    }
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const path = `${opts.postId}/${crypto.randomUUID()}${ext}`;
    const { error: upErr } = await supabase.storage.from("course-files").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) { errors.push(`${file.name}: ${upErr.message}`); continue; }
    const { error: insErr } = await supabase.from("post_attachments").insert({
      post_id: opts.postId,
      file_name: file.name,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || null,
      uploader_id: opts.uploaderId,
    });
    if (insErr) errors.push(`${file.name}: ${insErr.message}`);
  }
  return errors;
}

export async function downloadAttachment(storage_path: string, file_name: string) {
  const { data, error } = await supabase.storage.from("course-files").download(storage_path);
  if (error || !data) throw error ?? new Error("다운로드 실패");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url; a.download = file_name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Upload images to the public gallery bucket and record them as post_attachments rows. */
export async function uploadGalleryImages(opts: {
  postId: string;
  files: File[];
  uploaderId: string;
}) {
  const errors: string[] = [];
  for (const file of opts.files) {
    if (!file.type.startsWith("image/")) { errors.push(`${file.name}: 이미지 파일이 아닙니다`); continue; }
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const path = `${opts.postId}/${crypto.randomUUID()}${ext}`;
    const { error: upErr } = await supabase.storage.from("gallery-images").upload(path, file, {
      contentType: file.type, upsert: false,
    });
    if (upErr) { errors.push(`${file.name}: ${upErr.message}`); continue; }
    const { error: insErr } = await supabase.from("post_attachments").insert({
      post_id: opts.postId,
      file_name: file.name,
      storage_path: `gallery-images:${path}`,
      size_bytes: file.size,
      mime_type: file.type,
      uploader_id: opts.uploaderId,
    });
    if (insErr) errors.push(`${file.name}: ${insErr.message}`);
  }
  return errors;
}

/** Get a public URL for a gallery image stored with the `gallery-images:` path prefix. */
export function galleryImageUrl(storage_path: string): string {
  const path = storage_path.startsWith("gallery-images:") ? storage_path.slice("gallery-images:".length) : storage_path;
  return supabase.storage.from("gallery-images").getPublicUrl(path).data.publicUrl;
}
