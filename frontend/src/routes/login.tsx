import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import {
  apiBaseUrl,
  apiPost,
  isAuthenticated,
  setAuthTokens,
  setCachedUserProfile,
  useApi,
} from "@/lib/api";
import { safeInternalPath } from "@/lib/safe-redirect";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; email: string; role: string };
};

export const Route = createFileRoute("/login")({
  validateSearch: (raw: Record<string, unknown>) => ({
    mode: raw.mode === "signup" ? "signup" : "login",
    next: typeof raw.next === "string" ? raw.next : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated()) return;
    throw redirect({ to: safeInternalPath(search.next, "/problems") });
  },
  component: LoginPage,
});

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const nextPath = safeInternalPath(search.next, "/problems");
  const [mode, setMode] = useState<"login" | "signup">(search.mode);

  useEffect(() => {
    setMode(search.mode);
  }, [search.mode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginSearch = { mode: "login" as const, ...(search.next ? { next: search.next } : {}) };
  const signupSearch = { mode: "signup" as const, ...(search.next ? { next: search.next } : {}) };

  const storeOAuthReturn = () => {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem("post_oauth_redirect", nextPath);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!useApi) {
      setError("Enable VITE_USE_API=true to use backend auth.");
      return;
    }

    try {
      setLoading(true);
      if (mode === "login") {
        const data = await apiPost<LoginResponse>("/auth/login", { email, password });
        setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        setCachedUserProfile({ username: data.user.username, email: data.user.email });
        await navigate({ to: nextPath });
      } else {
        const data = await apiPost<LoginResponse>("/auth/register", { username, email, password });
        setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        setCachedUserProfile({ username: data.user.username, email: data.user.email });
        await navigate({ to: nextPath });
      }
    } catch {
      setError(
        mode === "login"
          ? "Sign-in failed. Check email/password and that the API is running."
          : "Sign-up failed. That email or username may already be in use.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <NavBar />
      <main className="mx-auto max-w-[420px] px-4 py-12 md:py-16">
        <div className="rounded-2xl border border-border bg-card px-8 py-10 shadow-lg">
          {mode === "login" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Don&apos;t have an account?{" "}
                <Link
                  to="/login"
                  search={signupSearch}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-offset-background transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-offset-background transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-smooth hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Log in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Already have an account?{" "}
                <Link
                  to="/login"
                  search={loginSearch}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-foreground">
                    Username
                  </label>
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    type="text"
                    required
                    minLength={3}
                    maxLength={32}
                    autoComplete="username"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-offset-background transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                <div>
                  <label htmlFor="su-email" className="mb-1.5 block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    id="su-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-offset-background transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                <div>
                  <label htmlFor="su-password" className="mb-1.5 block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <input
                    id="su-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-offset-background transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-smooth hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          )}

          {useApi && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="bg-card px-3 text-muted-foreground">or</span>
                </div>
              </div>

              <a
                href={`${apiBaseUrl}/auth/oauth/google/start`}
                onClick={storeOAuthReturn}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#EA4335] px-4 py-3 text-sm font-semibold text-white shadow-md transition-smooth hover:bg-[#d93025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA4335]/50 focus-visible:ring-offset-2"
              >
                <GoogleMark className="h-5 w-5 shrink-0 text-white opacity-95" />
                Continue with Google
              </a>
            </>
          )}

          <p className="mt-10 text-center text-sm text-muted-foreground">
            <Link to="/" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
