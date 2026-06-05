import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { AlignCenter, AlignLeft, AlignRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type GalleryImageAlign = "left" | "center" | "right";

export type GalleryEditorBlock =
  | { id: string; type: "text"; text: string }
  | {
      id: string;
      type: "image";
      file?: File;
      attachmentId?: string;
      url: string;
      name: string;
      widthPercent: number;
      heightPx: number | null;
      align: GalleryImageAlign;
      isCover: boolean;
    };

export interface GalleryStoredImage {
  id: string;
  url: string;
  name: string;
  storagePath?: string;
  widthPercent: number;
  heightPx: number | null;
  align: GalleryImageAlign;
  isCover: boolean;
  displayOrder: number;
}

export type GallerySavedBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      attachmentId: string;
      widthPercent: number;
      heightPx: number | null;
      align: GalleryImageAlign;
      isCover: boolean;
    };

const GALLERY_DOC_TYPE = "gallery-document-v1";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function parseGalleryDocument(content: string | null | undefined): GallerySavedBlock[] | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { type?: string; blocks?: GallerySavedBlock[] };
    if (parsed?.type !== GALLERY_DOC_TYPE || !Array.isArray(parsed.blocks)) return null;
    return parsed.blocks.filter((block) => block.type === "text" || block.type === "image");
  } catch {
    return null;
  }
}

export function serializeGalleryDocument(blocks: GalleryEditorBlock[]): string {
  const savedBlocks: GallerySavedBlock[] = blocks
    .map((block) => {
      if (block.type === "text") return { type: "text" as const, text: block.text };
      if (!block.attachmentId) return null;
      return {
        type: "image" as const,
        attachmentId: block.attachmentId,
        widthPercent: block.widthPercent,
        heightPx: block.heightPx,
        align: block.align,
        isCover: block.isCover,
      };
    })
    .filter((block): block is GallerySavedBlock => Boolean(block));

  return JSON.stringify({ type: GALLERY_DOC_TYPE, blocks: savedBlocks });
}

export function createInitialGalleryBlocks(content: string | null | undefined, images: GalleryStoredImage[]): GalleryEditorBlock[] {
  const doc = parseGalleryDocument(content);
  const imageById = new Map(images.map((image) => [image.id, image]));
  const used = new Set<string>();

  if (doc) {
    const blocks: GalleryEditorBlock[] = [];
    for (const block of doc) {
      if (block.type === "text") {
        blocks.push({ id: newId(), type: "text", text: block.text });
        continue;
      }
      const image = imageById.get(block.attachmentId);
      if (!image) continue;
      used.add(image.id);
      blocks.push({
        id: newId(),
        type: "image" as const,
        attachmentId: image.id,
        url: image.url,
        name: image.name,
        widthPercent: block.widthPercent ?? image.widthPercent,
        heightPx: block.heightPx ?? image.heightPx,
        align: block.align ?? image.align,
        isCover: block.isCover ?? image.isCover,
      });
    }
    for (const image of images) {
      if (!used.has(image.id)) blocks.push(imageToEditorBlock(image));
    }
    return ensureEditableTextBlock(blocks);
  }

  const legacyText = content ? [{ id: newId(), type: "text" as const, text: content }] : [{ id: newId(), type: "text" as const, text: "" }];
  return ensureEditableTextBlock([...legacyText, ...images.map(imageToEditorBlock)]);
}

export function ensureSingleCover(blocks: GalleryEditorBlock[]): GalleryEditorBlock[] {
  const imageBlocks = blocks.filter((block) => block.type === "image");
  const coverId = imageBlocks.find((block) => block.isCover)?.id ?? imageBlocks[0]?.id;
  return blocks.map((block) => block.type === "image" ? { ...block, isCover: block.id === coverId } : block);
}

function imageToEditorBlock(image: GalleryStoredImage): GalleryEditorBlock {
  return {
    id: newId(),
    type: "image",
    attachmentId: image.id,
    url: image.url,
    name: image.name,
    widthPercent: image.widthPercent,
    heightPx: image.heightPx,
    align: image.align,
    isCover: image.isCover,
  };
}

function ensureEditableTextBlock(blocks: GalleryEditorBlock[]) {
  if (blocks.length === 0) return [{ id: newId(), type: "text" as const, text: "" }];
  if (blocks[blocks.length - 1]?.type !== "text") return [...blocks, { id: newId(), type: "text" as const, text: "" }];
  return blocks;
}

interface GalleryPostEditorProps {
  blocks: GalleryEditorBlock[];
  onChange: (blocks: GalleryEditorBlock[]) => void;
}

export function GalleryPostEditor({ blocks, onChange }: GalleryPostEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const insertIndexRef = useRef(0);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selected = blocks.find((block) => block.type === "image" && block.isCover) ?? blocks.find((block) => block.type === "image");

  const openFilePicker = (index = blocks.length) => {
    insertIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const insertFiles = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const hasCover = blocks.some((block) => block.type === "image" && block.isCover);
    const imageBlocks: GalleryEditorBlock[] = imageFiles.map((file, index) => ({
      id: newId(),
      type: "image",
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      widthPercent: 100,
      heightPx: null,
      align: "center",
      isCover: !hasCover && index === 0,
    }));
    const next = [...blocks];
    next.splice(insertIndexRef.current, 0, ...imageBlocks);
    const withTextTail = next[next.length - 1]?.type === "text" ? next : [...next, { id: newId(), type: "text" as const, text: "" }];
    onChange(ensureSingleCover(withTextTail));
  };

  const updateBlock = (id: string, updater: (block: GalleryEditorBlock) => GalleryEditorBlock) => {
    onChange(blocks.map((block) => block.id === id ? updater(block) : block));
  };

  const removeBlock = (id: string) => {
    const next = blocks.filter((block) => block.id !== id);
    onChange(ensureSingleCover(ensureEditableTextBlock(next)));
  };

  const setCover = (id: string) => {
    onChange(blocks.map((block) => block.type === "image" ? { ...block, isCover: block.id === id } : block));
  };

  const startResize = (event: ReactPointerEvent, block: Extract<GalleryEditorBlock, { type: "image" }>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = block.widthPercent;
    const startHeight = block.heightPx ?? (event.currentTarget.parentElement?.getBoundingClientRect().height ?? 260);
    const editorWidth = editorRef.current?.getBoundingClientRect().width ?? 720;

    const move = (moveEvent: PointerEvent) => {
      const nextWidth = clamp(startWidth + ((moveEvent.clientX - startX) / editorWidth) * 100, 25, 100);
      const nextHeight = Math.round(clamp(startHeight + moveEvent.clientY - startY, 120, 900));
      updateBlock(block.id, (current) => current.type === "image" ? { ...current, widthPercent: Math.round(nextWidth), heightPx: nextHeight } : current);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
        <div className="text-sm font-medium">내용 작성</div>
        <Button type="button" size="sm" variant="outline" onClick={() => openFilePicker(blocks.length)}>
          <ImagePlus className="h-4 w-4 mr-1" /> 이미지 추가
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            insertFiles(Array.from(event.target.files ?? []));
            event.currentTarget.value = "";
          }}
        />
      </div>

      {selected?.type === "image" && (
        <div className="grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-[1fr_120px_120px_auto] md:items-end">
          <div className="space-y-2">
            <Label>선택 이미지 정렬</Label>
            <div className="flex gap-1">
              {([
                ["left", AlignLeft, "왼쪽"],
                ["center", AlignCenter, "가운데"],
                ["right", AlignRight, "오른쪽"],
              ] as const).map(([value, Icon, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={selected.align === value ? "default" : "outline"}
                  onClick={() => updateBlock(selected.id, (block) => block.type === "image" ? { ...block, align: value } : block)}
                >
                  <Icon className="h-4 w-4 mr-1" /> {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>가로(%)</Label>
            <Input
              type="number"
              min={25}
              max={100}
              value={selected.widthPercent}
              onChange={(event) => updateBlock(selected.id, (block) => block.type === "image" ? { ...block, widthPercent: clamp(Number(event.target.value) || 100, 25, 100) } : block)}
            />
          </div>
          <div className="space-y-2">
            <Label>세로(px)</Label>
            <Input
              type="number"
              min={120}
              placeholder="자동"
              value={selected.heightPx ?? ""}
              onChange={(event) => updateBlock(selected.id, (block) => block.type === "image" ? { ...block, heightPx: event.target.value ? clamp(Number(event.target.value), 120, 900) : null } : block)}
            />
          </div>
          <Button type="button" variant={selected.isCover ? "default" : "outline"} onClick={() => setCover(selected.id)}>
            <Star className="h-4 w-4 mr-1" /> 대표이미지
          </Button>
        </div>
      )}

      <div ref={editorRef} className="rounded-lg border border-border bg-card p-4 space-y-3">
        <InsertImageButton onClick={() => openFilePicker(0)} />
        {blocks.map((block, index) => (
          <div key={block.id} className="space-y-3">
            {block.type === "text" ? (
              <Textarea
                value={block.text}
                onChange={(event) => updateBlock(block.id, (current) => current.type === "text" ? { ...current, text: event.target.value } : current)}
                rows={4}
                className="min-h-24 resize-y border-dashed"
                placeholder="이미지 앞뒤로 내용을 작성할 수 있습니다."
              />
            ) : (
              <div className={cn("flex", block.align === "left" && "justify-start", block.align === "center" && "justify-center", block.align === "right" && "justify-end")}>
                <div
                  className={cn("group relative rounded-md border bg-secondary overflow-hidden", block.isCover ? "border-accent ring-2 ring-accent/30" : "border-border")}
                  style={{ width: `${block.widthPercent}%`, height: block.heightPx ? `${block.heightPx}px` : undefined }}
                  onClick={() => setCover(block.id)}
                >
                  <img src={block.url} alt={block.name} className="h-full w-full object-contain" />
                  <div className="absolute left-2 top-2 flex gap-1">
                    {block.isCover && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">대표</span>}
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button type="button" size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); setCover(block.id); }}>
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); removeBlock(block.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <button
                    type="button"
                    aria-label="이미지 크기 조절"
                    className="absolute bottom-1 right-1 h-6 w-6 rounded-md border border-border bg-background/90 cursor-nwse-resize"
                    onPointerDown={(event) => startResize(event, block)}
                  />
                </div>
              </div>
            )}
            <InsertImageButton onClick={() => openFilePicker(index + 1)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function InsertImageButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-accent hover:text-accent"
    >
      <ImagePlus className="h-3.5 w-3.5" /> 이 위치에 이미지 삽입
    </button>
  );
}