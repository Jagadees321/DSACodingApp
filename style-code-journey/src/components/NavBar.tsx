import { Link } from "@tanstack/react-router";
import { ClipboardList, Code2, LayoutDashboard, ListChecks, LogOut, Menu, Trophy, User, X, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearAuthTokens,
  getCachedUserProfile,
  getJwtUserId,
  isAuthenticated,
  refreshCachedUserProfile,
  useApi,
  userIsAdmin,
  type CachedUserProfile,
} from "@/lib/api";

export function NavBar() {
  const [open, setOpen] = useState(false);
  /** Delay auth-derived UI until after mount so SSR HTML matches the client (no localStorage on server). */
  const [authed, setAuthed] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [profile, setProfile] = useState<CachedUserProfile | null>(null);

  useEffect(() => {
    const signedIn = isAuthenticated();
    setAuthed(signedIn);
    setAdmin(userIsAdmin());
    setProfile(getCachedUserProfile());
    if (signedIn && useApi && !getCachedUserProfile()) {
      void refreshCachedUserProfile().then(setProfile);
    }
  }, [open]);

  const jwtId = authed ? getJwtUserId() : null;
  const displayName =
    profile?.username ?? (jwtId ? `User …${jwtId.slice(-6)}` : authed ? "Signed in" : "");
  const profileTitle = profile?.email ?? profile?.username ?? displayName;
  const link =
    "px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth";
  const active = { className: link + " text-foreground" };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-cyan group-hover:animate-pulse-glow">
            <Code2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-none">
            <div className="font-extrabold tracking-tight text-lg">
              <span className="text-gradient-primary">RoyalDsa</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Java · Python
            </div>
          </div>
        </Link>

        <div className="relative ml-auto flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={link} activeOptions={{ exact: true }} activeProps={active}>
              Home
            </Link>
            <Link to="/fundamentals" className={link} activeProps={active}>
              Fundamentals
            </Link>
            <Link to="/problems" className={link} activeProps={active}>
              Problems
            </Link>
            {authed ? (
              <div
                className="ml-2 flex max-w-[200px] items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5"
                title={profileTitle}
              >
                <User className="h-4 w-4 shrink-0 text-neon-cyan" aria-hidden />
                <span className="truncate text-xs font-medium text-foreground">{displayName}</span>
              </div>
            ) : (
              <Link
                to="/login"
                search={{ mode: "login", next: undefined }}
                className="ml-2 inline-flex items-center rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-smooth hover:opacity-95"
              >
                Sign in
              </Link>
            )}
            {authed && (
              <button
                type="button"
                title="Log out"
                onClick={() => {
                  clearAuthTokens();
                  window.location.href = "/login";
                }}
                className="hidden md:inline-flex rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </nav>

          {/* Single identity strip on small screens (desktop shows user inside nav above). */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            {authed ? (
              <>
                <div
                  className="flex max-w-[min(42vw,9rem)] items-center gap-1 rounded-lg border border-border/70 bg-card/50 px-2 py-1"
                  title={profileTitle}
                >
                  <User className="h-3.5 w-3.5 shrink-0 text-neon-cyan" aria-hidden />
                  <span className="truncate text-[11px] font-medium text-foreground">{displayName}</span>
                </div>
                <button
                  type="button"
                  title="Log out"
                  onClick={() => {
                    clearAuthTokens();
                    window.location.href = "/login";
                  }}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                search={{ mode: "login", next: undefined }}
                className="inline-flex items-center rounded-lg bg-gradient-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm"
              >
                Sign in
              </Link>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-md hover:bg-muted"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {open && (
            <>
              <button
                type="button"
                className="fixed inset-x-0 bottom-0 top-16 z-[55] bg-black/30 backdrop-blur-[1px]"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <div
                role="menu"
                className="fixed right-4 top-[calc(4rem+0.5rem)] z-[60] flex max-h-[min(80vh,calc(100dvh-5rem))] w-[min(calc(100vw-2rem),18rem)] flex-col overflow-y-auto rounded-xl border border-border/80 bg-background/95 py-2 shadow-elegant backdrop-blur-md"
              >
                <Link to="/" className={link + " px-4"} onClick={() => setOpen(false)}>
                  Home
                </Link>
                <Link to="/fundamentals" className={link + " px-4"} onClick={() => setOpen(false)}>
                  Fundamentals
                </Link>
                <Link to="/problems" className={link + " px-4"} onClick={() => setOpen(false)}>
                  Problems
                </Link>
                {authed && (
                  <Link to="/leaderboard" className={link + " inline-flex items-center gap-2 px-4"} onClick={() => setOpen(false)}>
                    <Trophy className="h-4 w-4 shrink-0 text-neon-amber" />
                    Leaderboard
                  </Link>
                )}
                {!authed ? (
                  <Link
                    to="/login"
                    search={{ mode: "login", next: undefined }}
                    className={link + " mx-3 mt-2 inline-flex justify-center rounded-lg bg-gradient-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"}
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                ) : (
                  <>
                    <div className="my-2 mx-3 h-px bg-border/70" />
                    {admin && (
                      <>
                        <Link to="/admin" className={link + " inline-flex items-center gap-2 px-4"} onClick={() => setOpen(false)}>
                          <ClipboardList className="h-4 w-4 shrink-0 text-neon-cyan" />
                          Admin Panel
                        </Link>
                        <Link to="/tests/assign" className={link + " inline-flex items-center gap-2 px-4"} onClick={() => setOpen(false)}>
                          <ListChecks className="h-4 w-4 shrink-0 text-neon-magenta" />
                          DSA Test Assign
                        </Link>
                        <Link to="/admin/user-progress" className={link + " inline-flex items-center gap-2 px-4"} onClick={() => setOpen(false)}>
                          <BarChart3 className="h-4 w-4 shrink-0 text-neon-lime" />
                          User progress
                        </Link>
                        <Link to="/admin/dashboard" className={link + " inline-flex items-center gap-2 px-4"} onClick={() => setOpen(false)}>
                          <LayoutDashboard className="h-4 w-4 shrink-0 text-neon-amber" />
                          Admin Dashboard
                        </Link>
                      </>
                    )}
                    <Link to="/tests/assigned" className={link + " inline-flex items-center gap-2 px-4"} onClick={() => setOpen(false)}>
                      <Code2 className="h-4 w-4 shrink-0 text-neon-lime" />
                      Take Assigned Test
                    </Link>
                    <div className="my-2 mx-3 h-px bg-border/70" />
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthTokens();
                        window.location.href = "/login";
                      }}
                      className={link + " px-4 text-left inline-flex items-center gap-2"}
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Log out
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
