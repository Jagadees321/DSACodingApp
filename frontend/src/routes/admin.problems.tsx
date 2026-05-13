import { Link, createFileRoute } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { apiGet, apiPost, apiPut, useApi } from "@/lib/api";
import { requireAdminBeforeLoad } from "@/lib/auth-guard";

type Example = { input: string; output: string; explanation?: string };
type TestCaseInput = {
  stdin: string;
  expectedOutput: string | unknown;
  isHidden: boolean;
  label: string;
  orderIndex: number;
};

export const Route = createFileRoute("/admin/problems")({
  beforeLoad: () => requireAdminBeforeLoad(),
  component: AdminProblemsPage,
});

function AdminProblemsPage() {
  const levelOptions: Array<{ value: 1 | 2 | 3 | 4 | 5; label: string }> = [
    { value: 1, label: "L1 - Basic" },
    { value: 2, label: "L2 - Easy" },
    { value: 3, label: "L3 - Intermediate" },
    { value: 4, label: "L4 - Advanced" },
    { value: 5, label: "L5 - Expert" },
  ];

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [level, setLevel] = useState(1);
  const [category, setCategory] = useState("Arrays");
  const [description, setDescription] = useState("");
  const [constraintsText, setConstraintsText] = useState("1 <= n <= 10000");
  const [examplesText, setExamplesText] = useState(
    '[\n  {\n    "input": "[1,2,3]",\n    "output": "6",\n    "explanation": "Sum the array: 1+2+3 = 6"\n  }\n]',
  );
  const [starterJava, setStarterJava] = useState("class Solution {\n  // TODO\n}");
  const [starterPython, setStarterPython] = useState("def solve():\n    pass");
  const [solutionJava, setSolutionJava] = useState("// add solution");
  const [solutionPython, setSolutionPython] = useState("# add solution");
  const [sampleTestsText, setSampleTestsText] = useState(
    '[{"stdin":"[1,2,3]","expectedOutput":"6"}]',
  );
  const [hiddenTestsText, setHiddenTestsText] = useState(
    '[{"stdin":"[3,2,4,1,5,6,2,7]\\n9","expectedOutput":{"anyOf":[[1,7],[0,5]]}}]',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [bulkJson, setBulkJson] = useState(
    () =>
      `{\n  "problems": [\n    {\n      "slug": "example-slug",\n      "title": "Example",\n      "level": 1,\n      "difficulty": "L1",\n      "category": "Arrays",\n      "description": "...",\n      "constraints": ["1 <= n <= 100"],\n      "examples": [{"input":"[1]","output":"1","explanation":"Briefly why this is the output."}],\n      "tags": ["Arrays"],\n      "xpReward": 60,\n      "orderIndex": 1,\n      "isPublished": true,\n      "starter": { "java": "class Solution {}", "python": "def solve(): pass" },\n      "solution": { "java": "//", "python": "#" },\n      "sampleTests": [\n        {"stdin":"[1]","expectedOutput":"1"},\n        {"stdin":"[3,2,4]\\n6","expectedOutput":{"anyOf":[[1,2],[2,1]]}}\n      ],\n      "hiddenTests": [\n        {"stdin":"[3,2,4,1,5,6,2,7]\\n9","expectedOutput":{"anyOf":[[1,7],[0,5]]}}\n      ]\n    }\n  ]\n}`,
  );
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const canUseApi = useMemo(() => useApi, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!canUseApi) {
      setError("Enable VITE_USE_API=true to use admin APIs.");
      return;
    }

    try {
      setSubmitting(true);
      const constraints = constraintsText
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
      const examples = JSON.parse(examplesText) as Example[];
      const sampleTests = JSON.parse(sampleTestsText) as Array<{ stdin: string; expectedOutput: unknown }>;
      const hiddenTests = JSON.parse(hiddenTestsText) as Array<{ stdin: string; expectedOutput: unknown }>;

      const payload = {
        slug,
        title,
        level,
        difficulty: `L${level}`,
        category,
        description,
        constraints,
        examples,
        tags: [category],
        xpReward: 50 + level * 10,
        orderIndex: Date.now(),
        isPublished: true,
        starter: { java: starterJava, python: starterPython },
        solution: { java: solutionJava, python: solutionPython },
      };
      if (editMode) {
        await apiPut(`/problems/${slug}`, payload);
      } else {
        await apiPost("/problems", payload);
      }

      const testCases: TestCaseInput[] = [
        ...sampleTests.map((t, i) => ({
          stdin: t.stdin,
          expectedOutput: typeof t.expectedOutput === "string" ? t.expectedOutput : JSON.stringify(t.expectedOutput),
          isHidden: false,
          label: `Sample ${i + 1}`,
          orderIndex: i + 1,
        })),
        ...hiddenTests.map((t, i) => ({
          stdin: t.stdin,
          expectedOutput: typeof t.expectedOutput === "string" ? t.expectedOutput : JSON.stringify(t.expectedOutput),
          isHidden: true,
          label: `Hidden ${i + 1}`,
          orderIndex: sampleTests.length + i + 1,
        })),
      ];

      await apiPost(`/submissions/admin/problem/${slug}/test-cases`, testCases);
      setMessage(editMode ? "Problem and test cases updated successfully." : "Problem and test cases created successfully.");
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  const onLoadBySlug = async () => {
    setMessage(null);
    setError(null);
    if (!canUseApi) {
      setError("Enable VITE_USE_API=true to use admin APIs.");
      return;
    }
    if (!slug.trim()) {
      setError("Enter slug to load.");
      return;
    }
    try {
      setLoadingSlug(true);
      const p = await apiGet<any>(`/problems/${slug}`);
      setTitle(p.title ?? "");
      setLevel(Number(p.level ?? 1));
      setCategory(p.category ?? "Arrays");
      setDescription(p.description ?? "");
      setConstraintsText((p.constraints ?? []).join("\n"));
      setExamplesText(JSON.stringify(p.examples ?? [], null, 2));
      setStarterJava(p.starter?.java ?? "");
      setStarterPython(p.starter?.python ?? "");
      setSolutionJava(p.solution?.java ?? "");
      setSolutionPython(p.solution?.python ?? "");

      const allTests = await apiGet<any[]>(`/submissions/admin/problem/${slug}/test-cases`);
      const sample = allTests
        .filter((t) => !t.isHidden)
        .map((t) => ({ stdin: t.stdin, expectedOutput: t.expectedOutput }));
      const hidden = allTests
        .filter((t) => t.isHidden)
        .map((t) => ({ stdin: t.stdin, expectedOutput: t.expectedOutput }));
      setSampleTestsText(JSON.stringify(sample, null, 2));
      setHiddenTestsText(JSON.stringify(hidden, null, 2));
      setEditMode(true);
      setMessage("Loaded. You can edit and save.");
    } catch (err: unknown) {
      setError(String((err as { message?: string })?.message ?? err));
    } finally {
      setLoadingSlug(false);
    }
  };

  type BulkResponse = {
    createdCount: number;
    createdSlugs: string[];
    failed: { slug: string; error: string }[];
  };

  const onBulkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBulkMessage(null);
    setBulkError(null);
    if (!canUseApi) {
      setBulkError("Enable VITE_USE_API=true to use admin APIs.");
      return;
    }
    try {
      setBulkSubmitting(true);
      const payload = JSON.parse(bulkJson) as { problems?: unknown };
      if (!Array.isArray(payload.problems)) {
        setBulkError('JSON must be an object with a "problems" array.');
        return;
      }
      const res = await apiPost<BulkResponse>("/problems/bulk", payload);
      const { createdCount, createdSlugs, failed } = res;
      const parts = [`Created ${createdCount}: ${createdSlugs.join(", ") || "(none)"}`];
      if (failed.length) {
        parts.push(
          `Failed (${failed.length}): ${failed.map((f) => `${f.slug}: ${f.error}`).join("; ")}`,
        );
      }
      setBulkMessage(parts.join("\n"));
    } catch (err: unknown) {
      setBulkError(String((err as { message?: string })?.message ?? err));
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Admin · Problems</h1>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setBulkMessage(null);
                setBulkError(null);
                setShowBulkModal(true);
              }}
              className="rounded-md border border-border bg-background px-3 py-1.5 font-semibold hover:bg-muted"
            >
              Bulk import
            </button>
            <Link to="/admin" className="text-muted-foreground hover:text-foreground hover:underline">
              Admin Panel
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Create, edit, and bulk import problems.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-border/60 bg-card/30 p-5">
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
            <div>
              <label className="mb-1 block text-sm">Level (no Level 0; use Basic)</label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TextArea label="Description" value={description} onChange={setDescription} rows={4} />
          <TextArea label="Constraints (one per line)" value={constraintsText} onChange={setConstraintsText} rows={4} />
          <TextArea
            label='Examples JSON — each object may include optional "explanation" (shown on problem & test pages)'
            value={examplesText}
            onChange={setExamplesText}
            rows={8}
          />
          <TextArea label="Starter Java" value={starterJava} onChange={setStarterJava} rows={6} />
          <TextArea label="Starter Python" value={starterPython} onChange={setStarterPython} rows={6} />
          <TextArea label="Solution Java" value={solutionJava} onChange={setSolutionJava} rows={6} />
          <TextArea label="Solution Python" value={solutionPython} onChange={setSolutionPython} rows={6} />
          <TextArea
            label='Sample Tests JSON (visible) (e.g. [{"stdin":"[1,2]","expectedOutput":"3"}])'
            value={sampleTestsText}
            onChange={setSampleTestsText}
            rows={4}
          />
          <TextArea
            label='Hidden Tests JSON (private) (e.g. [{"stdin":"[7]","expectedOutput":"7"}]). For multiple valid answers, use expectedOutput like {"anyOf":[[1,7],[0,5]]}'
            value={hiddenTestsText}
            onChange={setHiddenTestsText}
            rows={4}
          />

          {error && <div className="text-sm text-destructive">{error}</div>}
          {message && <div className="text-sm text-neon-lime">{message}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Submitting..." : editMode ? "Update Problem + Test Cases" : "Create Problem + Test Cases"}
          </button>
        </form>

      </main>

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-background shadow-elegant">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <h2 className="text-xl font-bold">Bulk import problems</h2>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
              >
                Close
              </button>
            </div>
            <form onSubmit={onBulkSubmit} className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                Paste JSON with a top-level <code className="rounded bg-muted px-1">problems</code> array. Each item matches single-problem fields plus{" "}
                <code className="rounded bg-muted px-1">sampleTests</code> and <code className="rounded bg-muted px-1">hiddenTests</code>. Up to 200 problems per request.
              </p>
              <TextArea label="Bulk JSON" value={bulkJson} onChange={setBulkJson} rows={16} />
              {bulkError && <div className="text-sm text-destructive whitespace-pre-wrap">{bulkError}</div>}
              {bulkMessage && <div className="text-sm text-neon-lime whitespace-pre-wrap">{bulkMessage}</div>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {bulkSubmitting ? "Importing..." : "Import in bulk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
      />
    </div>
  );
}

