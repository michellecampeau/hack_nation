"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, apiPatch, ApiError } from "@/lib/utils/api";
import type { PersonRecord, FactRecord } from "@/types";
import { RELATIONSHIP_STATES, FACT_TYPES } from "@/types";

interface PersonDetail extends PersonRecord {
  tags?: string[] | null;
  facts: FactRecord[];
}

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [factForm, setFactForm] = useState({ type: "expertise" as string, value: "" });
  const [factSubmitting, setFactSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ data: PersonDetail }>(`/api/people/${id}`);
      setPerson(res.data);
      setEditForm({
        name: res.data.name,
        primaryEmail: res.data.primaryEmail ?? "",
        phone: res.data.phone ?? "",
        organization: res.data.organization ?? "",
        role: res.data.role ?? "",
        relationshipState: res.data.relationshipState,
        notes: res.data.notes ?? "",
        tags: (res.data.tags ?? []).join(", "),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load person");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPatch(`/api/people/${id}`, {
        name: editForm.name,
        primaryEmail: editForm.primaryEmail || undefined,
        phone: editForm.phone || undefined,
        organization: editForm.organization || undefined,
        role: editForm.role || undefined,
        relationshipState: editForm.relationshipState,
        notes: editForm.notes || undefined,
        tags: editForm.tags
          ? editForm.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      });
      setEditing(false);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factForm.value.trim()) return;
    setFactSubmitting(true);
    setError(null);
    try {
      await apiPost("/api/facts", {
        personId: id,
        type: factForm.type,
        value: factForm.value.trim(),
        author: "me",
      });
      setFactForm({ type: "expertise", value: "" });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add fact");
    } finally {
      setFactSubmitting(false);
    }
  };

  if (loading || !person) {
    return (
      <div className="space-y-4">
        <Link href="/people" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to People
        </Link>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <p className="text-muted-foreground">Not found</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/people" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to People
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contact</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSaveEdit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={editForm.primaryEmail}
                  onChange={(e) => setEditForm((f) => ({ ...f, primaryEmail: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Organization</label>
                <Input
                  value={editForm.organization}
                  onChange={(e) => setEditForm((f) => ({ ...f, organization: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <Input
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Relationship</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.relationshipState}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, relationshipState: e.target.value }))
                  }
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
                  value={editForm.tags}
                  onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </form>
          ) : (
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="font-medium">{person.name}</dd>
              </div>
              {person.primaryEmail && (
                <div>
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd>{person.primaryEmail}</dd>
                </div>
              )}
              {person.phone && (
                <div>
                  <dt className="text-sm text-muted-foreground">Phone</dt>
                  <dd>{person.phone}</dd>
                </div>
              )}
              {person.organization && (
                <div>
                  <dt className="text-sm text-muted-foreground">Organization</dt>
                  <dd>{person.organization}</dd>
                </div>
              )}
              {person.role && (
                <div>
                  <dt className="text-sm text-muted-foreground">Role</dt>
                  <dd>{person.role}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-muted-foreground">Relationship</dt>
                <dd className="capitalize">{person.relationshipState.replace("_", " ")}</dd>
              </div>
              {person.tags && person.tags.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Tags</dt>
                  <dd>{person.tags.join(", ")}</dd>
                </div>
              )}
              {person.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{person.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Things you know about this person (expertise, interests, shared context). Used for
            ranking and compose.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddFact} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px]">
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={factForm.type}
                onChange={(e) => setFactForm((f) => ({ ...f, type: e.target.value }))}
              >
                {FACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-sm font-medium">Value</label>
              <Input
                placeholder="e.g. Design systems, React"
                value={factForm.value}
                onChange={(e) => setFactForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={factSubmitting || !factForm.value.trim()}>
              {factSubmitting ? "Adding…" : "Add fact"}
            </Button>
          </form>
          {person.facts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No facts yet. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {person.facts.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span className="text-sm capitalize text-muted-foreground">
                    {f.type.replace("_", " ")}:
                  </span>
                  <span className="text-sm">{f.value}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
