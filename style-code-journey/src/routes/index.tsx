import { createFileRoute, Link } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { LEVELS, problems } from "@/data/problems";
import { fundamentals } from "@/data/fundamentals";
import { LevelBadge, levelMeta } from "@/components/LevelBadge";
import { ArrowRight, BookOpen, Cpu, LayoutGrid, Layers, Sparkles, Zap } from "lucide-react";
import { isAuthenticated, userIsAdmin } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RoyalDsa — 70 DSA Problems · 5 Levels · Java & Python" },
      {
        name: "description",
        content:
          "Level-up your DSA skills with 70 hand-picked problems across 5 levels and 25 fundamentals. Run Java & Python in your browser.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main>
        <Hero />
        <Stats />
        <LevelsSection />
        <FundamentalsPreview />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  const [showAdminEntry, setShowAdminEntry] = useState(false);
  useEffect(() => {
    setShowAdminEntry(isAuthenticated() && userIsAdmin());
  }, []);
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28 relative">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs font-mono text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-neon-cyan" />
            5 levels · 25 fundamentals · 70 problems
          </span>

          <h1 className="mt-6 font-extrabold tracking-tight text-5xl md:text-7xl leading-[1.05]">
            Master DSA the
            <br />
            <span className="text-gradient-primary">neon-fast</span> way.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            A curated path of 70 problems across 5 difficulty tiers, paired with 25 core
            fundamentals. Write Java &amp; Python directly in your browser.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/problems"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow-cyan transition-smooth hover:scale-[1.03]"
            >
              <Zap className="h-4 w-4" />
              Start Coding
            </Link>
            <Link
              to="/fundamentals"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/50 px-6 py-3 text-sm font-semibold text-foreground transition-smooth hover:border-neon-cyan/60 hover:text-neon-cyan"
            >
              <BookOpen className="h-4 w-4" />
              Study Fundamentals
            </Link>
            {showAdminEntry && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/50 px-6 py-3 text-sm font-semibold text-foreground transition-smooth hover:border-neon-magenta/60 hover:text-neon-magenta"
              >
                <LayoutGrid className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 md:gap-10 font-mono">
            {[
              { v: "70", l: "Problems" },
              { v: "5", l: "Levels" },
              { v: "25", l: "Concepts" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-3xl md:text-5xl font-extrabold text-gradient-primary">
                  {s.v}
                </div>
                <div className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const cards = [
    {
      icon: Layers,
      title: "5 difficulty tiers",
      body: "Initiate → Overlord. Each tier sharpens a different muscle.",
      color: "var(--neon-cyan)",
    },
    {
      icon: Cpu,
      title: "Run code in-browser",
      body: "Write Java or Python, hit Run, see verdicts against test cases.",
      color: "var(--neon-magenta)",
    },
    {
      icon: BookOpen,
      title: "25 fundamentals",
      body: "Crisp concept cards covering complexity, structures, and patterns.",
      color: "var(--neon-lime)",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-12">
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className="group relative rounded-2xl border border-border/60 bg-gradient-card p-6 transition-smooth hover:border-transparent overflow-hidden"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-smooth pointer-events-none"
              style={{
                background: `radial-gradient(400px circle at 50% 0%, color-mix(in oklab, ${c.color} 20%, transparent), transparent 60%)`,
              }}
            />
            <div
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in oklab, ${c.color} 15%, transparent)`,
                color: c.color,
                border: `1px solid color-mix(in oklab, ${c.color} 35%, transparent)`,
              }}
            >
              <c.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LevelsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-neon-cyan font-mono">
            The Path
          </div>
          <h2 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight">
            Five tiers. One mastery.
          </h2>
        </div>
        <Link
          to="/problems"
          className="hidden md:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth"
        >
          See all problems <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {LEVELS.map((lv) => {
          const m = levelMeta(lv.num);
          const count = problems.filter((p) => p.level === lv.num).length;
          return (
            <Link
              key={lv.num}
              to="/problems"
              search={{ level: lv.num }}
              className="group relative rounded-2xl border border-border/60 bg-gradient-card p-5 transition-smooth hover:scale-[1.02]"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <div
                className="absolute -top-px left-4 right-4 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`,
                }}
              />
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{
                    color: m.color,
                    background: `color-mix(in oklab, ${m.color} 12%, transparent)`,
                  }}
                >
                  {m.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{count} qs</span>
              </div>
              <h3 className="mt-3 text-xl font-bold" style={{ color: m.color }}>
                {lv.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{lv.tagline}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FundamentalsPreview() {
  const sample = fundamentals.slice(0, 6);
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-neon-magenta font-mono">
            Fundamentals
          </div>
          <h2 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight">
            25 concepts that unlock everything.
          </h2>
        </div>
        <Link
          to="/fundamentals"
          className="hidden md:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sample.map((f) => (
          <Link
            key={f.id}
            to="/fundamentals"
            hash={f.id}
            className="rounded-xl border border-border/60 bg-card/40 p-5 transition-smooth hover:border-neon-magenta/60 backdrop-blur"
          >
            <div className="text-[10px] uppercase tracking-widest text-neon-magenta font-mono">
              {f.category}
            </div>
            <h3 className="mt-2 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.summary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-20">
      <div
        className="relative overflow-hidden rounded-3xl border border-border/60 p-10 md:p-16 text-center"
        style={{ background: "var(--gradient-violet)" }}
      >
        <div className="absolute inset-0 grid-bg opacity-20" />
        <h2 className="relative text-3xl md:text-5xl font-extrabold tracking-tight text-primary-foreground">
          Your first problem is one click away.
        </h2>
        <p className="relative mt-3 text-primary-foreground/80 max-w-xl mx-auto">
          Pick a level, write code in Java or Python, run it against the test cases.
        </p>
        <Link
          to="/problems"
          className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-elegant transition-smooth hover:scale-[1.03]"
        >
          Browse Problems <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 mt-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="font-mono">
          <span className="text-gradient-primary font-bold">RoyalDsa</span> · built for builders
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-neon-lime animate-pulse-glow" />
          executor: simulated
        </div>
      </div>
    </footer>
  );
}

// Re-export so other Link `search` props compile
export const _ = LevelBadge;
