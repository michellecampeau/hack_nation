"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPost, ApiError } from "@/lib/utils/api";

interface OriginFact {
  id?: string;
  type: "goal" | "preference" | "constraint";
  value: string;
}

interface OriginResponse {
  person: {
    id: string;
    name: string;
    role: string | null;
    notes: string | null;
    interests?: string[] | null;
  };
  facts: Array<{ id: string; type: string; value: string }>;
}

export default function OriginPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [person, setPerson] = useState<OriginResponse["person"] | null>(null);
  const [facts, setFacts] = useState<OriginFact[]>([]);
  const [form, setForm] = useState({ name: "", role: "", notes: "", interests: "" });
  const [newGoal, setNewGoal] = useState("");
  const [newPreference, setNewPreference] = useState("");
  const [newConstraint, setNewConstraint] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<OriginResponse>("/api/origin");
      setPerson(res.person);
      setForm({
        name: res.person.name,
        role: res.person.role ?? "",
        notes: res.person.notes ?? "",
        interests: Array.isArray(res.person.interests) ? res.person.interests.join(", ") : "",
      });
      setFacts(
        res.facts.map((f) => ({
          id: f.id,
          type: f.type as OriginFact["type"],
          value: f.value,
        }))
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load Origin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/origin", {
        person: {
          name: form.name.trim() || undefined,
          role: form.role.trim() || undefined,
          notes: form.notes.trim() || undefined,
          interests: form.interests.trim()
            ? form.interests.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
        },
      });
      setSuccess("Summary saved.");
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFacts = async (
    updatedFacts: OriginFact[],
    clearInput?: { goal?: boolean; preference?: boolean; constraint?: boolean }
  ) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/origin", {
        facts: updatedFacts.map((f) => ({ type: f.type, value: f.value })),
      });
      setSuccess("Saved.");
      setTimeout(() => setSuccess(null), 3000);
      if (clearInput) {
        if (clearInput.goal) setNewGoal("");
        if (clearInput.preference) setNewPreference("");
        if (clearInput.constraint) setNewConstraint("");
      }
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    handleSaveFacts([...facts, { type: "goal", value: newGoal.trim() }], {
      goal: true,
    });
  };
  const addPreference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPreference.trim()) return;
    handleSaveFacts([...facts, { type: "preference", value: newPreference.trim() }], {
      preference: true,
    });
  };
  const addConstraint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConstraint.trim()) return;
    handleSaveFacts([...facts, { type: "constraint", value: newConstraint.trim() }], {
      constraint: true,
    });
  };
  const removeFact = (idx: number) => {
    const updated = facts.filter((_, i) => i !== idx);
    handleSaveFacts(updated);
  };

  const goals = facts.filter((f) => f.type === "goal");
  const preferences = facts.filter((f) => f.type === "preference");
  const constraints = facts.filter((f) => f.type === "constraint");

  if (loading || !person) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Origin</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <p className="text-muted-foreground">Origin not found</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Origin"
        description="Your profile, goals, preferences, and constraints. Used to shape Edges (ranking) and Extend (outreach). Linked to your Node; Origin does not appear in Nodes list or Edges search."
        actions={
          <Link href={`/people/${person.id}`}>
            <Button variant="bridge-outline" size="sm">
              View profile (Node)
            </Button>
          </Link>
        }
      />

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Origin Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Name, current focus, and about me. Used for outreach tone and framing.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSummary} className="space-y-4">
            <div>
              <Label htmlFor="origin-name" className="mb-1 block">
                Name
              </Label>
              <Input
                id="origin-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Michelle Campeau"
              />
            </div>
            <div>
              <Label htmlFor="origin-role" className="mb-1 block">
                Current focus / role
              </Label>
              <Input
                id="origin-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Founder, investor relations"
              />
            </div>
            <div>
              <Label htmlFor="origin-interests" className="mb-1 block">
                Interests (comma-separated)
              </Label>
              <Input
                id="origin-interests"
                value={form.interests}
                onChange={(e) => setForm((f) => ({ ...f, interests: e.target.value }))}
                placeholder="e.g. scuba, design systems, humanoid robotics"
              />
            </div>
            <div>
              <Label htmlFor="origin-notes" className="mb-1 block">
                About me
              </Label>
              <textarea
                id="origin-notes"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Short paragraph used for outreach tone"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save summary"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
          <p className="text-sm text-muted-foreground">
            What you want to achieve. Influences ranking relevance and message framing.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addGoal} className="flex gap-2">
            <Input
              placeholder="e.g. Build relationships in humanoid robotics"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={submitting || !newGoal.trim()}>
              Add
            </Button>
          </form>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet.</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((f, i) => (
                <li
                  key={f.id ?? i}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span className="text-sm">{f.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      removeFact(facts.findIndex((x) => x === f))
                    }
                    disabled={submitting}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <p className="text-sm text-muted-foreground">
            How you prefer to communicate. Adjusts ranking and outreach style.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addPreference} className="flex gap-2">
            <Input
              placeholder="e.g. Prefer short, thoughtful messages"
              value={newPreference}
              onChange={(e) => setNewPreference(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={submitting || !newPreference.trim()}>
              Add
            </Button>
          </form>
          {preferences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No preferences yet.</p>
          ) : (
            <ul className="space-y-2">
              {preferences.map((f, i) => (
                <li
                  key={f.id ?? i}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span className="text-sm">{f.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      removeFact(facts.findIndex((x) => x === f))
                    }
                    disabled={submitting}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Constraints / Sensitive Context</CardTitle>
          <p className="text-sm text-muted-foreground">
            People or situations to avoid. Excluded or penalized in ranking; caution in outreach.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addConstraint} className="flex gap-2">
            <Input
              placeholder="e.g. Avoid intros without warm context"
              value={newConstraint}
              onChange={(e) => setNewConstraint(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={submitting || !newConstraint.trim()}>
              Add
            </Button>
          </form>
          {constraints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No constraints yet.</p>
          ) : (
            <ul className="space-y-2">
              {constraints.map((f, i) => (
                <li
                  key={f.id ?? i}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span className="text-sm">{f.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      removeFact(facts.findIndex((x) => x === f))
                    }
                    disabled={submitting}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
