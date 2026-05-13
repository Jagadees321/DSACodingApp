import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { apiGet, useApi } from "@/lib/api";
import { Trophy } from "lucide-react";
import { requireAuthBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/leaderboard")({
  beforeLoad: () => requireAuthBeforeLoad(),
  component: LeaderboardPage,
});

type Period = "weekly" | "monthly" | "overall";
type LeaderRow = { rank: number; userId: string; username: string; solvedCount: number };
type LeaderboardPayload = {
  period: Period;
  generatedAt: string;
  leaders: LeaderRow[];
  currentUser: { rank: number | null; userId: string; username: string; solvedCount: number };
};

function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("overall");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!useApi) {
        setError("Enable VITE_USE_API=true to use leaderboard.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const d = await apiGet<LeaderboardPayload>(`/progress/leaderboard?period=${period}&limit=50`);
        setData(d);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not load leaderboard.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [period]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 md:px-6 py-8">
        <div className="flex items-center gap-2 text-neon-amber">
          <Trophy className="h-5 w-5" />
          <span className="text-xs font-mono uppercase tracking-widest">Leaderboard</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Top Problem Solvers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ranked by unique accepted problems solved.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["weekly", "monthly", "overall"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-xs font-mono uppercase transition-smooth ${
                period === p
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <section className="mt-5 rounded-xl border border-border/60 bg-card/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 text-xs text-muted-foreground">
            {loading
              ? "Loading..."
              : data
                ? `Updated ${new Date(data.generatedAt).toLocaleString()}`
                : "No data"}
          </div>

          {error && <div className="px-4 py-4 text-sm text-destructive">{error}</div>}

          {!error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Solved</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && data?.leaders?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                        No accepted solves in this period yet.
                      </td>
                    </tr>
                  ) : (
                    data?.leaders?.map((row) => (
                      <tr key={row.userId} className="border-t border-border/60">
                        <td className="px-4 py-2.5 font-mono">#{row.rank}</td>
                        <td className="px-4 py-2.5">{row.username}</td>
                        <td className="px-4 py-2.5 font-semibold">{row.solvedCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {data?.currentUser && (
          <section className="mt-4 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Your rank</div>
            <div className="mt-1 text-sm">
              {data.currentUser.rank ? (
                <>
                  <span className="font-semibold">#{data.currentUser.rank}</span> · {data.currentUser.username} ·{" "}
                  <span className="font-semibold">{data.currentUser.solvedCount}</span> solved
                </>
              ) : (
                <>
                  {data.currentUser.username} · <span className="font-semibold">0</span> solved · not ranked yet
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

