import { useRef, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { GalleryBlock, GalleryImageBlock } from "@/lib/gallery-content";

export function GalleryEditor({ blocks, onChange }: { blocks: GalleryBlock[]; onChange: (blocks: GalleryBlock[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = blocks.find((b): b is GalleryImageBlock => b.kind === "image" && b.id === selectedId) ?? null;

  const patchBlocks = (next: GalleryBlock[]) => onChange(next.length ? next : [{ id: crypto.randomUUID(), kind: "text", text: "" }]);

  const addFiles = (files: FileList | null, index = activeIndex) => {
    const picked = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
    if (!picked.length) return;
    const hasCover = blocks.some((b) => b.kind === "image" && b.isCover);
    const additions: GalleryBlock[] = picked.flatMap((file, i) => [
      {
        id: crypto.randomUUID(),
        kind: "image" as const,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        widthPercent: 100,
        heightPx: null,
        isCover: !hasCover && i === 0,
      },
      { id: crypto.randomUUID(), kind: "text" as const, text: "" },
    ]);
    patchBlocks([...blocks.slice(0, index + 1), ...additions, ...blocks.slice(index + 1)]);
  };

  const updateBlock = (id: string, patch: Partial<GalleryImageBlock>) => {
    patchBlocks(blocks.map((b) => (b.kind === "image" && b.id === id ? { ...b, ...patch } : b)));
  };

  const setCover = (id: string) => patchBlocks(blocks.map((b) => (b.kind === "image" ? { ...b, isCover: b.id === id } : b)));
  const removeBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    if (!next.some((b) => b.kind === "image" && b.isCover)) {
      const first = next.find((b) => b.kind === "image") as GalleryImageBlock | undefined;
      if (first) first.isCover = true;
    }
    setSelectedId(null);
    patchBlocks(next);
  };

  const startResize = (image: GalleryImageBlock, startX: number) => {
    const initial = image.widthPercent;
    const onMove = (event: MouseEvent) => {
      const next = Math.max(25, Math.min(100, Math.round(initial + (event.clientX - startX) / 6)));
      updateBlock(image.id, { widthPercent: next });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 p-2">
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="h-4 w-4 mr-1" /> 이미지 추가
        </Button>
        <span className="text-xs text-muted-foreground">커서를 둔 위치 뒤에 이미지가 들어갑니다.</span>
      </div>

      <div className="rounded-md border border-input bg-background p-4 space-y-4 min-h-[520px]">
        {blocks.map((block, index) =>
          block.kind === "text" ? (
            <Textarea
              key={block.id}
              value={block.text}
              onFocus={() => setActiveIndex(index)}
              onChange={(e) => patchBlocks(blocks.map((b) => (b.id === block.id && b.kind === "text" ? { ...b, text: e.target.value } : b)))}
              rows={4}
              placeholder="내용을 입력하세요"
              className="resize-y border-dashed bg-card/60"
            />
          ) : (
            <div key={block.id} className="group relative" onClick={() => setSelectedId(block.id)}>
              <div
                className={cn("relative rounded-md border bg-secondary overflow-hidden", selectedId === block.id ? "border-accent ring-1 ring-accent" : "border-border")}
                style={{ width: `${block.widthPercent}%`, marginInline: "auto" }}
              >
                <img src={block.url} alt={block.name} className="w-full object-contain" style={{ height: block.heightPx ? `${block.heightPx}px` : "auto" }} />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); startResize(block, e.clientX); }}
                  className="absolute right-0 top-0 h-full w-3 cursor-ew-resize bg-accent/40 opacity-0 group-hover:opacity-100"
                  aria-label="이미지 크기 조절"
                />
                {block.isCover && <div className="absolute left-2 top-2 rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">대표</div>}
              </div>
              {selectedId === block.id && (
                <div className="mt-2 grid gap-3 rounded-md border border-border bg-card p-3 sm:grid-cols-[1fr_120px_120px_auto_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label>가로 크기</Label>
                    <Slider value={[block.widthPercent]} min={25} max={100} step={1} onValueChange={([v]) => updateBlock(block.id, { widthPercent: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>가로(%)</Label>
                    <Input type="number" min={25} max={100} value={block.widthPercent} onChange={(e) => updateBlock(block.id, { widthPercent: Number(e.target.value) || 100 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>세로(px)</Label>
                    <Input type="number" min={80} placeholder="자동" value={block.heightPx ?? ""} onChange={(e) => updateBlock(block.id, { heightPx: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <Button type="button" variant={block.isCover ? "default" : "outline"} size="sm" onClick={() => setCover(block.id)}>
                    <Star className="h-4 w-4 mr-1" /> 대표
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeBlock(block.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> 삭제
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}