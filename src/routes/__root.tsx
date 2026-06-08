import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

import "../styles.css";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-serif font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">페이지를 찾을 수 없습니다</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "한국폴리텍대학 반도체융합캡퍼스 반도체장비SW학과 CTL" },
      { name: "description", content: "한국폴리텍대학교 반도체융합캠퍼스 반도체장비소프트웨어학과 전용 CTL 사이트입니다." },
      { property: "og:title", content: "한국폴리텍대학 반도체융합캡퍼스 반도체장비SW학과 CTL" },
      { name: "twitter:title", content: "한국폴리텍대학 반도체융합캡퍼스 반도체장비SW학과 CTL" },
      { property: "og:description", content: "한국폴리텍대학교 반도체융합캠퍼스 반도체장비소프트웨어학과 전용 CTL 사이트입니다." },
      { name: "twitter:description", content: "한국폴리텍대학교 반도체융합캠퍼스 반도체장비소프트웨어학과 전용 CTL 사이트입니다." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a47c928-5a29-40f9-a81e-3a69214aed60/id-preview-62dc67df--0a2b8ceb-1088-4e33-920e-83c7940a7217.lovable.app-1780924961950.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a47c928-5a29-40f9-a81e-3a69214aed60/id-preview-62dc67df--0a2b8ceb-1088-4e33-920e-83c7940a7217.lovable.app-1780924961950.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: "/@tanstack-start/styles.css?routes=__root__%2C%2F" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Jua&family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@500;700;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
