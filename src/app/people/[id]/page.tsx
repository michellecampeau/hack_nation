"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPost, apiPatch, ApiError } from "@/lib/utils/api";
import type { PersonRecord, FactRecord } from "@/types";
import { RELATIONSHIP_STATES, FACT_TYPES } from "@/types";

interface PersonDetail extends PersonRecord {
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
  const [success, setSuccess] = useState<string | null>(null);

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
        hometown: res.data.hometown ?? "",
        role: res.data.role ?? "",
        relationshipState: res.data.relationshipState,
        notes: res.data.notes ?? "",
        tags: (res.data.tags ?? []).join(", "),
        birthday: res.data.birthday ?? "",
        venmo: res.data.venmo ?? "",
        universities: (res.data.universities ?? []).join(", "),
        interests: (res.data.interests ?? []).join(", "),
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
        hometown: editForm.hometown || undefined,
        role: editForm.role || undefined,
        relationshipState: editForm.relationshipState,
        notes: editForm.notes || undefined,
        tags: editForm.tags ? editForm.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        birthday: editForm.birthday || undefined,
        venmo: editForm.venmo || undefined,
        universities: editForm.universities ? editForm.universities.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        interests: editForm.interests ? editForm.interests.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      });
      setEditing(false);
      setSuccess("Contact updated.");
      setTimeout(() => setSuccess(null), 3000);
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
      setSuccess("Fact added.");
      setTimeout(() => setSuccess(null), 3000);
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

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{person.name}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Link href={`/compose?personId=${id}`}>
              <Button variant="outline" size="sm">
                Compose message
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSaveEdit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block">Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block">Email</Label>
                <Input
                  type="email"
                  value={editForm.primaryEmail}
                  onChange={(e) => setEditForm((f) => ({ ...f, primaryEmail: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block">Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block">Organization</Label>
                <Input
                  value={editForm.organization}
                  onChange={(e) => setEditForm((f) => ({ ...f, organization: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block">Role</Label>
                <Input
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block">Relationship</Label>
                <Select
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
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Hometown</Label>
                <Input
                  value={editForm.hometown}
                  onChange={(e) => setEditForm((f) => ({ ...f, hometown: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block">Birthday</Label>
                <Input
                  value={editForm.birthday}
                  onChange={(e) => setEditForm((f) => ({ ...f, birthday: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block">Venmo</Label>
                <Input
                  value={editForm.venmo}
                  onChange={(e) => setEditForm((f) => ({ ...f, venmo: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block">Universities (comma-separated)</Label>
                <Input
                  value={editForm.universities}
                  onChange={(e) => setEditForm((f) => ({ ...f, universities: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block">Interests (comma-separated)</Label>
                <Input
                  value={editForm.interests}
                  onChange={(e) => setEditForm((f) => ({ ...f, interests: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block">Tags (comma-separated)</Label>
                <Input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block">Notes</Label>
                <textarea
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              {person.hometown && (
                <div>
                  <dt className="text-sm text-muted-foreground">Hometown</dt>
                  <dd>{person.hometown}</dd>
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
              {person.birthday && (
                <div>
                  <dt className="text-sm text-muted-foreground">Birthday</dt>
                  <dd>{person.birthday}</dd>
                </div>
              )}
              {person.venmo && (
                <div>
                  <dt className="text-sm text-muted-foreground">Venmo</dt>
                  <dd>{person.venmo}</dd>
                </div>
              )}
              {person.universities && person.universities.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Universities</dt>
                  <dd>{person.universities.join(", ")}</dd>
                </div>
              )}
              {person.interests && person.interests.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Interests</dt>
                  <dd>{person.interests.join(", ")}</dd>
                </div>
              )}
              {person.tags && person.tags.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Tags</dt>
                  <dd>{person.tags.join(", ")}</dd>
                </div>
              )}
              {person.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Notes</dt>
                  <dd className="min-h-[4rem]">
                    <div className="mt-1 max-h-none overflow-visible rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                      {person.notes}
                    </div>
                  </dd>
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
              <Label className="mb-1 block">Type</Label>
              <Select
                value={factForm.type}
                onChange={(e) => setFactForm((f) => ({ ...f, type: e.target.value }))}
              >
                {FACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <Label className="mb-1 block">Value</Label>
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
