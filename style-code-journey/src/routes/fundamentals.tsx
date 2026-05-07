import { createFileRoute, Link } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { fundamentals } from "@/data/fundamentals";
import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { apiGet, useApi, userIsAdmin } from "@/lib/api";
import { requireAuthBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/fundamentals")({
  beforeLoad: () => requireAuthBeforeLoad(),
  loader: async () => {
    if (!useApi) return { fundamentals };
    const data = await apiGet<any[]>("/fundamentals");
    return {
      fundamentals: data.map((f) => ({
        id: f.slug,
        title: f.title,
        category: f.category,
        summary: f.summary,
        content: f.content,
      })),
    };
  },
  head: () => ({
    meta: [
      { title: "Fundamentals — 25 DSA Concepts | RoyalDsa" },
      {
        name: "description",
        content:
          "25 essential DSA fundamentals — arrays, trees, graphs, DP, complexity — with Java & Python snippets.",
      },
    ],
  }),
  component: FundamentalsPage,
});

function FundamentalsPage() {
  const loaderData = Route.useLoaderData();
  const allFundamentals = loaderData.fundamentals ?? [];
  const firstFundamental = allFundamentals[0];
  const [q, setQ] = useState("");
  const [active, setActive] = useState(firstFundamental?.id ?? "");
  const [canSeeFundamentalsAdmin, setCanSeeFundamentalsAdmin] = useState(false);

  useEffect(() => {
    if (!active && firstFundamental?.id) setActive(firstFundamental.id);
  }, [active, firstFundamental?.id]);

  useEffect(() => {
    setCanSeeFundamentalsAdmin(userIsAdmin());
  }, []);

  // Sync hash on mount
  useEffect(() => {
    const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (h && allFundamentals.some((f) => f.id === h)) setActive(h);
  }, [allFundamentals]);

  const categories = useMemo(() => {
    const map: Record<string, typeof allFundamentals> = {};
    for (const f of allFundamentals) {
      if (q && !(f.title + f.summary + f.category).toLowerCase().includes(q.toLowerCase()))
        continue;
      (map[f.category] ||= []).push(f);
    }
    return map;
  }, [allFundamentals, q]);

  const current = allFundamentals.find((f) => f.id === active) || firstFundamental;

  if (!current) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-3xl font-bold">No fundamentals available</h1>
          <p className="mt-3 text-muted-foreground">
            Seed backend data or disable API mode to use local fundamentals.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {canSeeFundamentalsAdmin && (
              <Link
                to="/admin/fundamentals"
                className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Open Fundamentals Admin
              </Link>
            )}
            <Link
              to="/"
              className="inline-flex items-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Go home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-neon-cyan font-mono">
            Knowledge Base
          </div>
          <h1 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight">
            25 Core <span className="text-gradient-primary">Fundamentals</span>
          </h1>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 self-start space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search concepts…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-card/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan transition-smooth"
              />
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {Object.entries(categories).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                    {cat}
                  </div>
                  <div className="space-y-1">
                    {items.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActive(f.id);
                          history.replaceState(null, "", `#${f.id}`);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-smooth ${
                          active === f.id
                            ? "bg-gradient-primary text-primary-foreground shadow-glow-cyan"
                            : "hover:bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Content */}
          <article className="rounded-2xl border border-border/60 bg-gradient-card p-6 md:p-10 shadow-elegant">
            <div className="text-xs uppercase tracking-widest text-neon-magenta font-mono">
              {current.category}
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold">{current.title}</h2>
            <p className="mt-3 text-muted-foreground">{current.summary}</p>
            <div className="mt-4">
              <FormattedContent content={current.content} />
            </div>

            {(current.java || current.python) && (
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                {current.java && (
                  <CodeBlock label="Java" code={current.java} accent="var(--neon-amber)" />
                )}
                {current.python && (
                  <CodeBlock label="Python" code={current.python} accent="var(--neon-cyan)" />
                )}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between">
              <Link
                to="/problems"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-neon-cyan transition-smooth"
              >
                Try problems on this topic →
              </Link>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}

function CodeBlock({ label, code, accent }: { label: string; code: string; accent: string }) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-border"
      style={{ background: "var(--editor-bg)" }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 text-[11px] font-mono uppercase tracking-widest border-b border-border"
        style={{ color: accent }}
      >
        {label}
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
      </div>
      <pre className="p-4 text-[12.5px] leading-6 font-mono overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  const sections = content
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
        const first = lines[0] ?? "";
        const isHeading = /^#{1,3}\s+/.test(first);
        const isBulletBlock = lines.every((l) => /^(-|\*|\d+\.)\s+/.test(l));
        const isCodeBlock =
          lines.length >= 2 && lines[0].startsWith("```") && lines[lines.length - 1].startsWith("```");

        if (isCodeBlock) {
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre
              key={`code-${idx}`}
              className="rounded-lg border border-border p-4 text-[12.5px] leading-6 font-mono overflow-x-auto whitespace-pre"
              style={{ background: "var(--editor-bg)" }}
            >
              {code}
            </pre>
          );
        }

        if (isHeading) {
          const level = first.match(/^#{1,3}/)?.[0].length ?? 3;
          const text = first.replace(/^#{1,3}\s+/, "");
          const cls =
            level === 1
              ? "text-2xl font-bold"
              : level === 2
                ? "text-xl font-semibold"
                : "text-lg font-semibold";
          return (
            <h3 key={`heading-${idx}`} className={cls}>
              {text}
            </h3>
          );
        }

        if (isBulletBlock) {
          return (
            <ul key={`list-${idx}`} className="list-disc space-y-1 pl-5 text-foreground/90">
              {lines.map((line, i) => (
                <li key={i}>{line.replace(/^(-|\*|\d+\.)\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${idx}`} className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {section}
          </p>
        );
      })}
    </div>
  );
}
