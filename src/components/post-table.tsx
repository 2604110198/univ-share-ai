import { Link } from "@tanstack/react-router";
import { Eye, Pin } from "lucide-react";
import { formatPostDate } from "@/lib/format";

export interface PostListItem {
  id: string;
  title: string;
  author_name: string;
  author_role: string;
  view_count: number;
  is_pinned?: boolean;
  created_at: string;
  due_date?: string | null;
  course_name?: string | null;
}

export function PostTable({
  posts, emptyText = "등록된 글이 없습니다.", showCourse = true, onTogglePin,
}: {
  posts: PostListItem[];
  emptyText?: string;
  showCourse?: boolean;
  onTogglePin?: (id: string, next: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/70 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left p-3 w-12">번호</th>
            <th className="text-left p-3">제목</th>
            {showCourse && <th className="text-left p-3 w-40 hidden md:table-cell">강의명</th>}
            <th className="text-left p-3 w-28 hidden sm:table-cell">작성자</th>
            <th className="text-left p-3 w-28 hidden md:table-cell">날짜</th>
            <th className="text-left p-3 w-16">조회</th>
            {onTogglePin && <th className="text-left p-3 w-20">고정</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {posts.length === 0 && (
            <tr>
              <td colSpan={onTogglePin ? 7 : 6} className="p-12 text-center text-muted-foreground">{emptyText}</td>
            </tr>
          )}
          {posts.map((p, i) => {
            const overdue = p.due_date && new Date(p.due_date) < new Date();
            return (
              <tr
                key={p.id}
                className={
                  p.is_pinned
                    ? "bg-muted/60 hover:bg-muted/80 transition-colors"
                    : "hover:bg-secondary/40 transition-colors"
                }
              >
                <td className="p-3 text-xs text-muted-foreground">
                  {p.is_pinned ? <Pin className="h-3.5 w-3.5 text-accent" /> : posts.length - i}
                </td>
                <td className="p-3">
                  <Link
                    to="/post/$postId"
                    params={{ postId: p.id }}
                    className={`hover:text-accent line-clamp-1 ${p.is_pinned ? "font-bold text-primary" : "font-medium"}`}
                  >
                    {p.title}
                  </Link>
                  {p.due_date && (
                    <span className={`ml-2 text-[11px] ${overdue ? "text-destructive" : "text-accent"}`}>
                      마감 {formatPostDate(p.due_date)}
                    </span>
                  )}
                </td>
                {showCourse && (
                  <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                    {p.course_name ?? "—"}
                  </td>
                )}
                <td className="p-3 text-xs hidden sm:table-cell">{p.author_name}</td>
                <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{formatPostDate(p.created_at)}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {p.view_count}</span>
                </td>
                {onTogglePin && (
                  <td className="p-3">
                    <button
                      onClick={(e) => { e.preventDefault(); onTogglePin(p.id, !p.is_pinned); }}
                      className={`text-[11px] px-2 py-1 rounded border ${p.is_pinned ? "bg-accent/20 border-accent/40 text-accent-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}
                    >
                      {p.is_pinned ? "고정해제" : "고정"}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
