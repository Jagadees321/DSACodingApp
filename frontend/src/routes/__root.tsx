import { Outlet, Link, createRootRoute, HeadContent, Scripts, redirect } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { isAuthenticated } from "@/lib/api";

import appCss from "../styles.css?url";

/** Routes that do not require a session (everything else redirects to `/login`). */
function isAuthPublicPath(pathname: string): boolean {
  return pathname === "/signup" || pathname === "/login" || pathname === "/oauth/callback";
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    if (isAuthPublicPath(location.pathname)) return;
    if (!isAuthenticated()) {
      const next = `${location.pathname}${location.search}`;
      throw redirect({
        to: "/login",
        search: { mode: "login", next },
      });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RoyalDsa — Master 70 DSA Problems in Java & Python" },
      {
        name: "description",
        content:
          "Practice 70 hand-picked DSA problems across 5 levels with 25 core fundamentals. Run Java & Python code in your browser.",
      },
      { name: "author", content: "RoyalDsa" },
      { property: "og:title", content: "RoyalDsa — Master 70 DSA Problems in Java & Python" },
      { property: "og:description", content: "DSA Playground is a web application for practicing data structures and algorithms with interactive coding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "RoyalDsa — Master 70 DSA Problems in Java & Python" },
      { name: "description", content: "DSA Playground is a web application for practicing data structures and algorithms with interactive coding." },
      { name: "twitter:description", content: "DSA Playground is a web application for practicing data structures and algorithms with interactive coding." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5eec9cd2-31c6-490b-8e09-66b2e793d9a1/id-preview-6c2a3b77--239b995c-8d83-4610-8cb6-0c4fbc58f1b4.lovable.app-1777033752968.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5eec9cd2-31c6-490b-8e09-66b2e793d9a1/id-preview-6c2a3b77--239b995c-8d83-4610-8cb6-0c4fbc58f1b4.lovable.app-1777033752968.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
    <>
      <Outlet />
      <Toaster richColors position="top-center" closeButton duration={5000} />
    </>
  );
}
