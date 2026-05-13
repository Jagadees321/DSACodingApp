import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { apiGet, apiPost, useApi } from "@/lib/api";
import { Check, ChevronRight, ListChecks, Plus, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { requireAdminBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/tests/assign")({
  beforeLoad: () => requireAdminBeforeLoad(),
  component: DsaTestAssignPage,
});

type ProblemItem = {
  _id: string;
  slug: string;
  title: string;
  category: string;
  level: number;
};

type GroupItem = {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
};

type UserItem = {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin";
};

function DsaTestAssignPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [problemSearch, setProblemSearch] = useState("");

  const [testId, setTestId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  /** Expands per-group UI to pick users and POST /tests/groups/:id/members */
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);
  const [memberAddSearch, setMemberAddSearch] = useState("");
  const [memberAddUserIds, setMemberAddUserIds] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!useApi) {
        toast.error("Enable VITE_USE_API=true to use test assignment APIs.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [problemData, groupData, userData] = await Promise.all([
          apiGet<ProblemItem[]>("/problems?limit=100"),
          apiGet<GroupItem[]>("/tests/groups"),
          apiGet<UserItem[]>("/tests/users?limit=100"),
        ]);
        setProblems(Array.isArray(problemData) ? problemData : (problemData as any).items ?? []);
        setGroups(groupData ?? []);
        setUsers(userData ?? []);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load assign-test data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredProblems = useMemo(() => {
    const q = problemSearch.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter((p) => `${p.title} ${p.category} ${p.slug}`.toLowerCase().includes(q));
  }, [problemSearch, problems]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.username} ${u.email}`.toLowerCase().includes(q));
  }, [userSearch, users]);

  const filteredUsersForGroupAdd = useMemo(() => {
    const q = memberAddSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.username} ${u.email}`.toLowerCase().includes(q));
  }, [memberAddSearch, users]);

  const canGoNext = title.trim().length >= 2 && selectedProblemIds.length > 0;
  const canAssign = Boolean(testId) && dueAt && (selectedGroupIds.length > 0 || selectedUserIds.length > 0);

  const toggle = (id: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const createTestAndProceed = async () => {
    if (!canGoNext) return;
    setSubmitting(true);
    try {
      const created = await apiPost<{ _id: string }>("/tests", {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        durationMin,
        problemIds: selectedProblemIds,
        status: "published",
      });
      setTestId(created._id);
      setStep(2);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create test.");
    } finally {
      setSubmitting(false);
    }
  };

  const assignTest = async () => {
    if (!testId || !canAssign) return;
    setSubmitting(true);
    try {
      const due = new Date(dueAt);
      const start = new Date();
      await apiPost<{ assignmentId: string; notifiedUsers: number }>(`/tests/${testId}/assign`, {
        targetUsers: selectedUserIds,
        targetGroups: selectedGroupIds,
        startAt: start.toISOString(),
        dueAt: due.toISOString(),
        allowLate: false,
        maxAttemptsPerUser: 1,
      });
      toast.success("Test assigned successfully.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign test.");
    } finally {
      setSubmitting(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const created = await apiPost<GroupItem>("/tests/groups", {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
      });
      setGroups((prev) => [created, ...prev]);
      setNewGroupName("");
      setNewGroupDescription("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const addUsersToGroup = async (groupId: string) => {
    if (memberAddUserIds.length === 0) return;
    setAddingMembers(true);
    const addedCount = memberAddUserIds.length;
    try {
      const res = await apiPost<{ groupId: string; memberCount: number }>(`/tests/groups/${groupId}/members`, {
        userIds: memberAddUserIds,
      });
      setGroups((prev) =>
        prev.map((g) => (g._id === groupId ? { ...g, memberCount: res.memberCount } : g)),
      );
      setMemberAddUserIds([]);
      setMemberAddSearch("");
      setManageGroupId(null);
      toast.success(`Added ${addedCount} user(s) to the group (${res.memberCount} members total).`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add users to group.");
    } finally {
      setAddingMembers(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1400px] px-3 md:px-6 py-6 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-neon-magenta">
              <ListChecks className="h-5 w-5" />
              <span className="text-xs font-mono uppercase tracking-widest">Admin Tools</span>
            </div>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold">DSA Test Assign</h1>
            <p className="text-sm text-muted-foreground">Assign tests to users and groups.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-mono">
            <span className={`px-2 py-1 rounded ${step === 1 ? "bg-gradient-primary text-primary-foreground" : "bg-muted"}`}>1 Build test</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className={`px-2 py-1 rounded ${step === 2 ? "bg-gradient-primary text-primary-foreground" : "bg-muted"}`}>2 Pick audience</span>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-border/60 bg-card/30 p-8 text-sm text-muted-foreground">
            Loading test assignment data...
          </div>
        ) : step === 1 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
            <section className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3 h-fit">
              <h2 className="font-semibold">Test details</h2>
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm min-h-20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Instructions</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm min-h-24" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Duration (minutes)</label>
                <input type="number" min={1} max={1440} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value || 60))} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  Timer starts when a learner opens the test. After this limit, the UI shows overdue time in red; they can keep editing until they submit or the assignment due passes. Switching away from the test tab still auto-submits.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">Selected: {selectedProblemIds.length} problems</div>
              <button disabled={!canGoNext || submitting} onClick={() => void createTestAndProceed()} className="w-full inline-flex items-center justify-center gap-2 rounded bg-gradient-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-60">
                {submitting ? "Creating..." : "Next"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </section>

            <section className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold">Pick problems</h2>
                <div className="relative min-w-[220px]">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-2.5" />
                  <input value={problemSearch} onChange={(e) => setProblemSearch(e.target.value)} placeholder="Search problems..." className="w-full rounded border border-border bg-background pl-8 pr-3 py-2 text-sm" />
                </div>
              </div>
              <div className="space-y-2 max-h-[65vh] overflow-auto pr-1">
                {filteredProblems.map((p) => {
                  const selected = selectedProblemIds.includes(p._id);
                  return (
                    <button key={p._id} onClick={() => toggle(p._id, selectedProblemIds, setSelectedProblemIds)} className={`w-full text-left rounded-lg border px-3 py-2 transition-smooth ${selected ? "border-neon-cyan bg-neon-cyan/10" : "border-border hover:bg-muted/40"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">{p.category}</div>
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs font-mono">
                          <span className="px-2 py-0.5 rounded bg-muted">Lv {p.level}</span>
                          {selected && <Check className="h-4 w-4 text-neon-cyan" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Groups</h2>
                <span className="text-xs text-muted-foreground">{selectedGroupIds.length} selected</span>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Create group</div>
                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                <input value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                <button disabled={!newGroupName.trim() || creatingGroup} onClick={() => void createGroup()} className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs hover:bg-muted/50 disabled:opacity-60">
                  <Plus className="h-3.5 w-3.5" /> {creatingGroup ? "Creating..." : "Create Group"}
                </button>
              </div>
              <div className="space-y-2 max-h-[55vh] overflow-auto pr-1">
                {groups.map((g) => {
                  const selected = selectedGroupIds.includes(g._id);
                  const managing = manageGroupId === g._id;
                  return (
                    <div key={g._id} className="rounded-xl border border-border/80 bg-card/50 shadow-sm overflow-hidden">
                      <div className="flex gap-1.5 p-1.5">
                        <button
                          type="button"
                          onClick={() => toggle(g._id, selectedGroupIds, setSelectedGroupIds)}
                          className={`flex-1 text-left rounded-lg border px-3 py-2.5 transition-smooth ${selected ? "border-neon-cyan bg-neon-cyan/10" : "border-transparent hover:bg-muted/40"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">{g.name}</div>
                              <div className="text-xs text-muted-foreground tabular-nums">
                                {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                              </div>
                            </div>
                            {selected && <Check className="h-4 w-4 shrink-0 text-neon-cyan" />}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManageGroupId(managing ? null : g._id);
                            setMemberAddUserIds([]);
                            setMemberAddSearch("");
                          }}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${managing ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background/80 hover:bg-muted/60"}`}
                          title={managing ? "Close member picker" : "Add members to this group"}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {managing ? "Close" : "Members"}
                        </button>
                      </div>
                      {managing && (
                        <div className="flex max-h-[min(52vh,440px)] flex-col overflow-hidden border-t border-border/60 bg-gradient-to-b from-muted/30 to-background/80">
                          <div className="shrink-0 space-y-2 p-3 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">Add to {g.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Search and select accounts, then confirm below.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setManageGroupId(null);
                                  setMemberAddUserIds([]);
                                  setMemberAddSearch("");
                                }}
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="Close"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="relative">
                              <Search className="pointer-events-none h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
                              <input
                                value={memberAddSearch}
                                onChange={(e) => setMemberAddSearch(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm shadow-inner"
                              />
                            </div>
                          </div>

                          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-2">
                            {filteredUsersForGroupAdd.length === 0 ? (
                              <p className="py-6 text-center text-xs text-muted-foreground">No users match your search.</p>
                            ) : (
                              filteredUsersForGroupAdd.map((u) => {
                                const picked = memberAddUserIds.includes(u._id);
                                return (
                                  <button
                                    key={u._id}
                                    type="button"
                                    onClick={() => toggle(u._id, memberAddUserIds, setMemberAddUserIds)}
                                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${picked ? "border-primary/50 bg-primary/8 shadow-sm" : "border-border/70 bg-background/60 hover:bg-muted/50"}`}
                                  >
                                    <span
                                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${picked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-background"}`}
                                      aria-hidden
                                    >
                                      {picked && <Check className="h-3 w-3" strokeWidth={3} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="font-medium block truncate">{u.username}</span>
                                      <span className="text-xs text-muted-foreground truncate block">{u.email}</span>
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>

                          <div className="shrink-0 border-t border-border/60 bg-muted/40 p-3 backdrop-blur-sm">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {memberAddUserIds.length === 0 ? "No users selected" : `${memberAddUserIds.length} selected`}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={memberAddUserIds.length === 0 || addingMembers}
                              onClick={() => void addUsersToGroup(g._id)}
                              className="w-full rounded-lg bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-45"
                            >
                              {addingMembers
                                ? "Adding…"
                                : memberAddUserIds.length === 0
                                  ? "Select users above"
                                  : `Add ${memberAddUserIds.length} to group`}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Individual users</h2>
                <span className="text-xs text-muted-foreground">{selectedUserIds.length} selected</span>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-2.5" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users..." className="w-full rounded border border-border bg-background pl-8 pr-3 py-2 text-sm" />
              </div>
              <div className="space-y-2 max-h-[45vh] overflow-auto pr-1">
                {filteredUsers.map((u) => {
                  const selected = selectedUserIds.includes(u._id);
                  return (
                    <button key={u._id} onClick={() => toggle(u._id, selectedUserIds, setSelectedUserIds)} className={`w-full text-left rounded-lg border px-3 py-2 ${selected ? "border-neon-cyan bg-neon-cyan/10" : "border-border hover:bg-muted/40"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{u.username}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                        {selected && <Check className="h-4 w-4 text-neon-cyan" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="xl:col-span-2 rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Due date & time</label>
                  <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="px-4 py-2 rounded border border-border text-sm hover:bg-muted/50">Back</button>
                  <button disabled={!canAssign || submitting} onClick={() => void assignTest()} className="px-4 py-2 rounded bg-gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
                    {submitting ? "Assigning..." : "Assign test"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

