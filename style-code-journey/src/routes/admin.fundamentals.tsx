import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { apiGet, apiPost, apiPut, useApi } from "@/lib/api";
import { requireAdminBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/admin/fundamentals")({
  beforeLoad: () => requireAdminBeforeLoad(),
  component: AdminFundamentalsPage,
});

function AdminFundamentalsPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Arrays");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [relatedProblemSlugs, setRelatedProblemSlugs] = useState("two-sum,binary-search");
  const [orderIndex, setOrderIndex] = useState(1);
  const [isPublished, setIsPublished] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const onCreateOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!useApi) {
      setError("Enable VITE_USE_API=true to use admin APIs.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title,
        slug,
        category,
        summary,
        content,
        relatedProblemSlugs: relatedProblemSlugs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        orderIndex,
        isPublished,
      };
      if (editMode) {
        await apiPut(`/fundamentals/${slug}`, payload);
        setMessage("Fundamental updated successfully.");
      } else {
        await apiPost("/fundamentals", payload);
        setMessage("Fundamental created successfully.");
      }
    } catch (err: unknown) {
      setError(String((err as { message?: string })?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  const onLoadBySlug = async () => {
    setMessage(null);
    setError(null);
    if (!useApi) {
      setError("Enable VITE_USE_API=true to use admin APIs.");
      return;
    }
    if (!slug.trim()) {
      setError("Enter slug to load.");
      return;
    }
    try {
      setLoadingSlug(true);
      const all = await apiGet<any[]>("/fundamentals");
      const found = all.find((f) => f.slug === slug.trim());
      if (!found) {
        setError("Fundamental not found.");
        return;
      }
      setTitle(found.title ?? "");
      setCategory(found.category ?? "");
      setSummary(found.summary ?? "");
      setContent(found.content ?? "");
      setRelatedProblemSlugs((found.relatedProblemSlugs ?? []).join(","));
      setOrderIndex(Number(found.orderIndex ?? 1));
      setIsPublished(Boolean(found.isPublished));
      setEditMode(true);
      setMessage("Loaded. You can edit and save.");
    } catch (err: unknown) {
      setError(String((err as { message?: string })?.message ?? err));
    } finally {
      setLoadingSlug(false);
    }
  };

  const onSeedDefaults = async () => {
    setMessage(null);
    setError(null);
    if (!useApi) {
      setError("Enable VITE_USE_API=true to use admin APIs.");
      return;
    }
    try {
      setSeeding(true);
      const result = await apiPost<{
        createdCount: number;
        createdSlugs: string[];
        existingCount: number;
        existingSlugs: string[];
      }>("/fundamentals/seed-defaults", {});
      setMessage(
        `Seeded fundamentals. Created: ${result.createdCount} (${result.createdSlugs.join(", ") || "none"}). ` +
          `Already existed: ${result.existingCount} (${result.existingSlugs.join(", ") || "none"}).`,
      );
    } catch (err: unknown) {
      setError(String((err as { message?: string })?.message ?? err));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Admin · Fundamentals</h1>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground hover:underline">
              Admin Panel
            </Link>
            <Link to="/admin/problems" className="text-neon-cyan hover:underline">
              Problems Admin
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Create, edit, and seed fundamentals.
        </p>

        <div className="mt-4">
          <button
            onClick={onSeedDefaults}
            disabled={seeding}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            {seeding ? "Seeding..." : "Seed default fundamentals"}
          </button>
        </div>

        <form onSubmit={onCreateOrUpdate} className="mt-6 space-y-4 rounded-xl border border-border/60 bg-card/30 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Title" value={title} onChange={setTitle} />
            <div>
              <Input label="Slug" value={slug} onChange={setSlug} />
              <button
                type="button"
                onClick={onLoadBySlug}
                disabled={loadingSlug}
                className="mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
              >
                {loadingSlug ? "Loading..." : "Load by slug (for edit)"}
              </button>
            </div>
            <Input label="Category" value={category} onChange={setCategory} />
            <Input label="Order Index" value={String(orderIndex)} onChange={(v) => setOrderIndex(Number(v || 1))} />
          </div>

          <TextArea label="Summary" value={summary} onChange={setSummary} rows={3} />
          <TextArea label="Content" value={content} onChange={setContent} rows={6} />
          <Input
            label="Related Problem Slugs (comma separated)"
            value={relatedProblemSlugs}
            onChange={setRelatedProblemSlugs}
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Published
          </label>

          {error && <div className="text-sm text-destructive">{error}</div>}
          {message && <div className="text-sm text-neon-lime">{message}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Saving..." : editMode ? "Update Fundamental" : "Create Fundamental"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

