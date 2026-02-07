"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, ApiError } from "@/lib/utils/api";
import type { PersonRecord } from "@/types";
import { RELATIONSHIP_STATES } from "@/types";

interface PeopleResponse {
  data: (PersonRecord & { tags?: string[] | null })[];
}

export default function PeoplePage() {
  const [people, setPeople] = useState<(PersonRecord & { tags?: string[] | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    primaryEmail: "",
    phone: "",
    organization: "",
    role: "",
    relationshipState: "ok" as string,
    notes: "",
    tags: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<PeopleResponse>("/api/people");
      setPeople(res.data ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load people");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/api/people", {
        name: form.name,
        primaryEmail: form.primaryEmail || undefined,
        phone: form.phone || undefined,
        organization: form.organization || undefined,
        role: form.role || undefined,
        relationshipState: form.relationshipState,
        notes: form.notes || undefined,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      });
      setForm({
        name: "",
        primaryEmail: "",
        phone: "",
        organization: "",
        role: "",
        relationshipState: "ok",
        notes: "",
        tags: "",
      });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create person");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Add person"}</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New person</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name *</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.primaryEmail}
                  onChange={(e) => setForm((f) => ({ ...f, primaryEmail: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Organization</label>
                <Input
                  value={form.organization}
                  onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                  placeholder="Acme Inc"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Design Lead"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Relationship</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.relationshipState}
                  onChange={(e) => setForm((f) => ({ ...f, relationshipState: e.target.value }))}
                >
                  {RELATIONSHIP_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="design, product, mentor"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Met at conference..."
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Save person"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : people.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No people yet. Click &quot;Add person&quot; to add your first contact.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link
                href={`/people/${p.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    {p.organization && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {p.organization}
                        {p.role ? ` · ${p.role}` : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-sm capitalize text-muted-foreground">
                    {p.relationshipState.replace("_", " ")}
                  </span>
                </div>
                {p.primaryEmail && (
                  <p className="mt-1 text-sm text-muted-foreground">{p.primaryEmail}</p>
                )}
                {p.tags && p.tags.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{p.tags.join(", ")}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
