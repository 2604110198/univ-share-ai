import { supabase } from "@/integrations/supabase/client";

export async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}

export async function setSetting(key: string, value: string, userId: string) {
  return supabase.from("site_settings").upsert({ key, value, updated_by: userId, updated_at: new Date().toISOString() });
}

export async function uploadSiteAsset(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

export const SETTING_KEYS = {
  bannerImage: "banner_image_url",
  schoolLinkImage: "school_link_image_url",
} as const;
