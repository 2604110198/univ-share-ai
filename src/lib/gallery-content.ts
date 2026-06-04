export type GalleryTextBlock = {
  id: string;
  kind: "text";
  text: string;
};

export type GalleryImageBlock = {
  id: string;
  kind: "image";
  file?: File;
  attachmentId?: string;
  url: string;
  name: string;
  widthPercent: number;
  heightPx: number | null;
  isCover: boolean;
};

export type GalleryBlock = GalleryTextBlock | GalleryImageBlock;

export type GalleryAttachmentLike = {
  id: string;
  file_name: string;
  storage_path: string;
  display_order?: number | null;
  is_cover?: boolean | null;
  width_percent?: number | null;
  height_px?: number | null;
};

type SavedGalleryDoc = {
  type?: string;
  blocks?: Array<{ kind?: "text" | "image"; type?: "text" | "image"; text?: string; attachmentId?: string }>;
};

export const isGalleryDoc = (content: string | null | undefined) => {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content) as SavedGalleryDoc;
    return parsed.type === "gallery-doc" && Array.isArray(parsed.blocks);
  } catch {
    return false;
  }
};

export const serializeGalleryBlocks = (blocks: GalleryBlock[]) =>
  JSON.stringify({
    type: "gallery-doc",
    blocks: blocks.flatMap<{ type: "text"; text: string } | { type: "image"; attachmentId: string }>((block) => {
      if (block.kind === "text") return block.text.trim() ? [{ type: "text", text: block.text }] : [];
      return [{ type: "image", attachmentId: block.attachmentId ?? block.id }];
    }),
  });

export function hydrateGalleryBlocks(
  content: string | null | undefined,
  attachments: GalleryAttachmentLike[],
  getUrl: (storagePath: string) => string,
): GalleryBlock[] {
  const imageBlocks = attachments
    .slice()
    .sort((a, b) => {
      if (Boolean(a.is_cover) !== Boolean(b.is_cover)) return a.is_cover ? -1 : 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    })
    .map<GalleryImageBlock>((att) => ({
      id: att.id,
      kind: "image",
      attachmentId: att.id,
      url: getUrl(att.storage_path),
      name: att.file_name,
      widthPercent: att.width_percent ?? 100,
      heightPx: att.height_px ?? null,
      isCover: Boolean(att.is_cover),
    }));

  if (!content) return imageBlocks.length ? imageBlocks : [{ id: crypto.randomUUID(), kind: "text", text: "" }];

  try {
    const parsed = JSON.parse(content) as SavedGalleryDoc;
    if (parsed.type === "gallery-doc" && Array.isArray(parsed.blocks)) {
      const remaining = new Map(imageBlocks.map((img) => [img.attachmentId ?? img.id, img]));
      const blocks: GalleryBlock[] = [];
      for (const saved of parsed.blocks) {
        const kind = saved.kind ?? saved.type;
        if (kind === "text") {
          blocks.push({ id: crypto.randomUUID(), kind: "text", text: saved.text ?? "" });
        }
        if (kind === "image" && saved.attachmentId && remaining.has(saved.attachmentId)) {
          blocks.push(remaining.get(saved.attachmentId)!);
          remaining.delete(saved.attachmentId);
        }
      }
      blocks.push(...remaining.values());
      return blocks.length ? blocks : [{ id: crypto.randomUUID(), kind: "text", text: "" }];
    }
  } catch {
    // Existing plain-text gallery posts fall through to the legacy rendering shape.
  }

  return [
    ...imageBlocks,
    ...(content.trim() ? [{ id: crypto.randomUUID(), kind: "text" as const, text: content }] : []),
  ];
}