"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPost, ApiError } from "@/lib/utils/api";
import { parseFileToContacts, type ImportRow } from "@/lib/import/parse-file";
import type { PersonRecord } from "@/types";
import { RELATIONSHIP_STATES } from "@/types";

interface PersonWithCount extends PersonRecord {
  factCount?: number;
}

interface PeopleResponse {
  data: PersonWithCount[];
}

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
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
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filteredPeople = useMemo(() => {
    if (!search.trim()) return people;
    const q = search.toLowerCase().trim();
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.organization?.toLowerCase().includes(q) ||
        p.primaryEmail?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [people, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
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
      const addedName = form.name;
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
      setSuccess(`${addedName} added.`);
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create person");
    } finally {
      setSubmitting(false);
    }
  };

  const validRelationship = (s?: string) =>
    s && RELATIONSHIP_STATES.includes(s as (typeof RELATIONSHIP_STATES)[number]) ? s : undefined;

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    parseFileToContacts(file)
      .then((rows) => {
        if (rows.length === 0) {
          setImportError(
            "No valid contacts found. Use CSV (header row with Name), JSON (array of objects with name), or vCard (.vcf)."
          );
          return;
        }
        setImportRows(rows);
        setShowImport(true);
      })
      .catch(() => setImportError("Could not parse file. Use CSV, JSON, or vCard (.vcf)."));
  };

  const handleImportSubmit = async () => {
    setImportSubmitting(true);
    setError(null);
    setImportError(null);
    try {
      const payload = importRows.map((r) => ({
        name: r.name,
        primaryEmail: r.primaryEmail || undefined,
        phone: r.phone || undefined,
        organization: r.organization || undefined,
        role: r.role || undefined,
        tags: r.tags,
        notes: r.notes || undefined,
        relationshipState: validRelationship(r.relationshipState) ?? "ok",
      }));
      const res = await apiPost<{
        created: number;
        failed: number;
        total: number;
        errors?: string[];
      }>("/api/people/import", { people: payload });
      setSuccess(
        `Imported ${res.created} contact${res.created !== 1 ? "s" : ""}.${res.failed > 0 ? ` ${res.failed} skipped or failed.` : ""}`
      );
      setTimeout(() => setSuccess(null), 5000);
      setShowImport(false);
      setImportRows([]);
      if (res.errors?.length) setImportError(res.errors.slice(0, 5).join("; "));
      load();
    } catch (e) {
      setImportError(e instanceof ApiError ? e.message : "Import failed");
    } finally {
      setImportSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.vcf,.vcard,text/csv,application/json,text/vcard"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Import
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add person"}
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      {importError && <Alert variant="destructive">{importError}</Alert>}

      {showImport && importRows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Import {importRows.length} contact{importRows.length !== 1 ? "s" : ""}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowImport(false);
                  setImportRows([]);
                  setImportError(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={importSubmitting} onClick={handleImportSubmit}>
                {importSubmitting ? "Importing…" : "Import all"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Preview (first 15). CSV, JSON, or vCard (.vcf) with name, email, phone, organization,
              role, notes.
            </p>
            <div className="max-h-64 overflow-auto rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr className="text-left">
                    <th className="p-2 font-medium">Name</th>
                    <th className="p-2 font-medium">Email</th>
                    <th className="p-2 font-medium">Organization</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 15).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2 text-muted-foreground">{row.primaryEmail ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{row.organization ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importRows.length > 15 && (
              <p className="mt-2 text-xs text-muted-foreground">
                … and {importRows.length - 15} more
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New person</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name" className="mb-1 block">
                  Name *
                </Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label htmlFor="email" className="mb-1 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.primaryEmail}
                  onChange={(e) => setForm((f) => ({ ...f, primaryEmail: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1 block">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <Label htmlFor="org" className="mb-1 block">
                  Organization
                </Label>
                <Input
                  id="org"
                  value={form.organization}
                  onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                  placeholder="Acme Inc"
                />
              </div>
              <div>
                <Label htmlFor="role" className="mb-1 block">
                  Role
                </Label>
                <Input
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Design Lead"
                />
              </div>
              <div>
                <Label htmlFor="rel" className="mb-1 block">
                  Relationship
                </Label>
                <Select
                  id="rel"
                  value={form.relationshipState}
                  onChange={(e) => setForm((f) => ({ ...f, relationshipState: e.target.value }))}
                >
                  {RELATIONSHIP_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="tags" className="mb-1 block">
                  Tags (comma-separated)
                </Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="design, product, mentor"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes" className="mb-1 block">
                  Notes
                </Label>
                <Input
                  id="notes"
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

      {!showForm && people.length > 0 && (
        <div className="max-w-sm">
          <Label htmlFor="search" className="mb-1 block">
            Search
          </Label>
          <Input
            id="search"
            type="search"
            placeholder="Name, org, email, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/50" aria-hidden />
          ))}
        </div>
      ) : filteredPeople.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {people.length === 0 ? (
              <>No people yet. Click &quot;Add person&quot; to add your first contact.</>
            ) : (
              <>No one matches &quot;{search}&quot;. Try a different search.</>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filteredPeople.map((p) => (
            <li key={p.id}>
              <Link
                href={`/people/${p.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:border-muted-foreground/20 hover:bg-muted/50"
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
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {p.factCount ?? 0} fact{(p.factCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="text-sm capitalize text-muted-foreground">
                      {p.relationshipState.replace("_", " ")}
                    </span>
                  </div>
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
