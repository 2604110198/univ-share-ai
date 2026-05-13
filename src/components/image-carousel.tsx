import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselSlide {
  id: string;
  imageUrl: string | null;
  title: string;
  href?: string;
}

export function ImageCarousel({ slides, className }: { slides: CarouselSlide[]; className?: string }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (!count) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % count), 5000);
    return () => window.clearInterval(id);
  }, [count]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: active * el.clientWidth, behavior: "smooth" });
  }, [active]);

  if (!count) {
    return (
      <div className={cn("relative aspect-[4/3] w-full rounded-lg border border-border bg-secondary grid place-items-center", className)}>
        <div className="text-center text-muted-foreground">
          <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">게시된 이미지가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg border border-border bg-card group", className)}>
      <div ref={trackRef} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar">
        {slides.map((s) => {
          const inner = (
            <div className="relative aspect-[4/3] w-full">
              {s.imageUrl ? (
                <img src={s.imageUrl} alt={s.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-secondary">
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-center">
                <span className="text-white text-sm font-medium line-clamp-1">{s.title}</span>
              </div>
            </div>
          );
          return (
            <div key={s.id} className="min-w-full snap-start">
              {s.href ? (
                <Link to="/gallery/$postId" params={{ postId: s.id }} className="block">{inner}</Link>
              ) : inner}
            </div>
          );
        })}
      </div>

      {/* Dots — hover scrolls to that slide */}
      <div className="absolute bottom-2 right-2 flex gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur">
        {slides.map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              i === active ? "bg-white w-4" : "bg-white/50 hover:bg-white/80",
            )}
          />
        ))}
      </div>
    </div>
  );
}
