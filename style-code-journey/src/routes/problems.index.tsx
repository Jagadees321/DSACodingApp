import { createFileRoute, Link } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { LEVELS, problems } from "@/data/problems";
import { LevelBadge, levelMeta } from "@/components/LevelBadge";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import { apiGet, useApi } from "@/lib/api";
import { requireAuthBeforeLoad } from "@/lib/auth-guard";

const searchSchema = z.object({
  level: z.coerce.number().int().min(1).max(5).optional(),
});

export const Route = createFileRoute("/problems/")({
  validateSearch: searchSchema,
  beforeLoad: () => requireAuthBeforeLoad(),
  loader: async () => {
    if (!useApi) {
      return {
        problems: problems.map((p) => ({
          id: p.id,
          title: p.title,
          level: p.level,
          topic: p.topic,
        })),
      };
    }
    const data = await apiGet<{ items: any[] }>("/problems");
    return {
      problems: data.items.map((p) => ({
        id: p.slug,
        title: p.title,
        level: p.level,
        topic: p.category,
      })),
    };
  },
  head: () => ({
    meta: [
      { title: "Problems — 70 DSA Challenges | RoyalDsa" },
      {
        name: "description",
        content:
          "Practice 70 DSA problems across 5 levels. Filter by topic, write Java or Python, run against test cases.",
      },
    ],
  }),
  component: ProblemsPage,
});

function ProblemsPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const [level, setLevel] = useState<number | undefined>(search.level);
  const [topic, setTopic] = useState<string>("All");
  const [q, setQ] = useState("");
  const allProblems = loaderData.problems;

  const topics = useMemo(() => ["All", ...Array.from(new Set(allProblems.map((p) => p.topic)))], [allProblems]);

  const filtered = useMemo(() => {
    return allProblems.filter((p) => {
      if (level && p.level !== level) return false;
      if (topic !== "All" && p.topic !== topic) return false;
      if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [allProblems, level, topic, q]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-neon-cyan font-mono">
              Problem Set
            </div>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="text-gradient-primary">70</span> handpicked challenges
            </h1>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search problems…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-card/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan transition-smooth"
            />
          </div>
        </div>

        {/* Level filter pills */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setLevel(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-smooth ${
              !level
                ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow-cyan"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Levels
          </button>
          {LEVELS.map((lv) => {
            const m = levelMeta(lv.num);
            const isActive = level === lv.num;
            return (
              <button
                key={lv.num}
                onClick={() => setLevel(isActive ? undefined : lv.num)}
                className="px-3 py-1.5 rounded-full text-xs font-mono border transition-smooth"
                style={{
                  borderColor: isActive ? m.color : undefined,
                  background: isActive
                    ? `color-mix(in oklab, ${m.color} 18%, transparent)`
                    : undefined,
                  color: isActive ? m.color : undefined,
                }}
              >
                {m.label} · {lv.name}
              </button>
            );
          })}
        </div>

        {/* Topic filter */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-smooth ${
                topic === t
                  ? "border-neon-magenta text-neon-magenta bg-card/40"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-xl border border-border/60 bg-card/30 backdrop-blur overflow-hidden">
          <div className="hidden md:grid grid-cols-[60px_1fr_140px_120px_60px] gap-4 px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-mono border-b border-border/60">
            <div>#</div>
            <div>Title</div>
            <div>Topic</div>
            <div>Level</div>
            <div className="text-right">Go</div>
          </div>
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              No problems match your filters.
            </div>
          )}
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              to="/problems/$id"
              params={{ id: p.id }}
              className="grid grid-cols-[1fr_auto] md:grid-cols-[60px_1fr_140px_120px_60px] items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-b-0 hover:bg-muted/40 transition-smooth group"
            >
              <div className="hidden md:block font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="font-medium group-hover:text-neon-cyan transition-smooth">
                  {p.title}
                </div>
                <div className="md:hidden mt-1 flex items-center gap-2">
                  <LevelBadge level={p.level} />
                  <span className="text-[10px] font-mono text-muted-foreground">{p.topic}</span>
                </div>
              </div>
              <div className="hidden md:block text-xs font-mono text-muted-foreground">
                {p.topic}
              </div>
              <div className="hidden md:block">
                <LevelBadge level={p.level} />
              </div>
              <div className="hidden md:block text-right text-muted-foreground group-hover:text-neon-cyan transition-smooth">
                →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
