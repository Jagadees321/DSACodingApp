export function levelMeta(level: 1 | 2 | 3 | 4 | 5) {
  const map = {
    1: { name: "Basic", color: "var(--level-1)", label: "L1" },
    2: { name: "Easy", color: "var(--level-2)", label: "L2" },
    3: { name: "Intermediate", color: "var(--level-3)", label: "L3" },
    4: { name: "Advanced", color: "var(--level-4)", label: "L4" },
    5: { name: "Expert", color: "var(--level-5)", label: "L5" },
  } as const;
  return map[level];
}

export function LevelBadge({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  const m = levelMeta(level);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold"
      style={{
        color: m.color,
        background: `color-mix(in oklab, ${m.color} 15%, transparent)`,
        border: `1px solid color-mix(in oklab, ${m.color} 40%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }}
      />
      {m.label} · {m.name}
    </span>
  );
}
