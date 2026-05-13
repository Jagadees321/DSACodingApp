import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { apiGet, useApi } from "@/lib/api";
import { requireAdminBeforeLoad } from "@/lib/auth-guard";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/user-progress")({
  beforeLoad: () => requireAdminBeforeLoad(),
  component: AdminUserProgressPage,
});

type Row = {
  userId: string;
  username: string;
  email: string;
  role: string;
  solvedCount: number;
};

type Payload = {
  totalPublishedProblems: number;
  users: Row[];
};

function AdminUserProgressPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    if (!useApi) {
      toast.error("Enable VITE_USE_API=true.");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await apiGet<Payload>("/progress/admin/users-solved-summary");
        setData(res);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not load user progress.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = data?.totalPublishedProblems ?? 0;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/70">
            <BarChart3 className="h-5 w-5 text-neon-lime" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-neon-cyan font-mono">Admin</div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">User problem progress</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Solved counts are accepted submissions tracked per user. Total problems = published problems in the
              catalog ({total}).
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        )}

        {!loading && data && (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right tabular-nums">Solved</th>
                  <th className="px-4 py-3 text-right tabular-nums">Total</th>
                  <th className="px-4 py-3 text-right tabular-nums">%</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => {
                  const pct = total > 0 ? Math.round((u.solvedCount / total) * 1000) / 10 : 0;
                  return (
                    <tr key={u.userId} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]" title={u.email}>
                        {u.email}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.role}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-neon-lime font-semibold">{u.solvedCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{total}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
