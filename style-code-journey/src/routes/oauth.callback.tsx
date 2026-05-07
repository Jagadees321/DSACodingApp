import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { refreshCachedUserProfile, setAuthTokens, useApi } from "@/lib/api";
import { safeInternalPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/oauth/callback")({
  component: OauthCallbackPage,
});

function OauthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) {
        setError("No OAuth response. Start sign-in from the login page.");
        return;
      }
      const params = new URLSearchParams(hash);
      const err = params.get("error");
      if (err) {
        setError(decodeURIComponent(err));
        return;
      }
      const accessToken = params.get("accessToken");
      const refreshToken = params.get("refreshToken");
      if (accessToken && refreshToken) {
        setMessage("Signed in. Redirecting…");
        setAuthTokens({ accessToken, refreshToken });
        window.history.replaceState(null, "", window.location.pathname);
        const stored =
          typeof sessionStorage !== "undefined"
            ? sessionStorage.getItem("post_oauth_redirect")
            : null;
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("post_oauth_redirect");
        }
        const target = safeInternalPath(stored ?? undefined, "/problems");
        if (useApi) await refreshCachedUserProfile();
        await navigate({ to: target });
        return;
      }
      setError("Sign-in did not return tokens. Try again.");
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Signing in</h1>
        {error && (
          <p className="mt-4 text-sm text-destructive">
            {error}
            <br />
            <Link
              to="/login"
              search={{ mode: "login" }}
              className="text-neon-cyan hover:underline mt-2 inline-block"
            >
              Back to login
            </Link>
          </p>
        )}
        {!error && <p className="mt-4 text-sm text-muted-foreground">{message ?? "Completing sign-in…"}</p>}
      </main>
    </div>
  );
}
