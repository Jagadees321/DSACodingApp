import { createFileRoute, Link } from "@tanstack/react-router";
import { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { BookOpen, Database, FileCode2, Layers3 } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => requireAdminBeforeLoad(),
  component: AdminPanelPage,
});

function AdminPanelPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-neon-cyan font-mono">Control Center</div>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">Admin Panel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage content across separate pages. Choose an area below.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AdminCard
            to="/admin/problems"
            icon={<FileCode2 className="h-5 w-5 text-neon-cyan" />}
            title="Manage Problems"
            description="Create, edit, and bulk import coding problems and test cases."
          />
          <AdminCard
            to="/admin/fundamentals"
            icon={<BookOpen className="h-5 w-5 text-neon-magenta" />}
            title="Manage Fundamentals"
            description="Create and edit concept notes with clean markdown-style content."
          />
          <AdminCard
            to="/admin/fundamentals"
            icon={<Database className="h-5 w-5 text-neon-lime" />}
            title="Seed Defaults"
            description="Quickly populate starter fundamentals for a new environment."
          />
        </div>

        <div className="mt-8 rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2 font-semibold text-foreground">
            <Layers3 className="h-4 w-4 text-neon-amber" />
            Better flow
          </div>
          <p className="mt-1">
            You now have separate admin pages for each area, instead of a crowded single admin tab.
          </p>
        </div>
      </main>
    </div>
  );
}

function AdminCard({
  to,
  icon,
  title,
  description,
}: {
  to: "/admin/problems" | "/admin/fundamentals";
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-border/60 bg-gradient-card p-5 transition-smooth hover:border-neon-cyan/40 hover:shadow-elegant"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-card/70 border border-border">
        {icon}
      </div>
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

