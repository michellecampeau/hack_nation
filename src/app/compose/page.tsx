"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPost, ApiError } from "@/lib/utils/api";
import { cn } from "@/lib/utils";
import type { PersonRecord } from "@/types";
import type { ComposeResponse } from "@/types";

interface PeopleResponse {
  data: PersonRecord[];
}

function ComposeForm() {
  const searchParams = useSearchParams();
  const personIdFromUrl = searchParams.get("personId");
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [personId, setPersonId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [format, setFormat] = useState<"email" | "text">("email");
  const [loading, setLoading] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposeResponse | null>(null);
  const [editableMessage, setEditableMessage] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [updating, setUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const restoredFromStorageRef = useRef(false);

  const COMPOSE_STORAGE_KEY = "compose_result";

  const filteredPeople = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q)
      return [...people].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return people
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [people, inputValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<PeopleResponse>("/api/people");
        const list = (res.data ?? []).filter((p) => !p.isOrigin);
        if (!cancelled) {
          setPeople(list);
          const initialId =
            personIdFromUrl && list.some((p) => p.id === personIdFromUrl)
              ? personIdFromUrl
              : list[0]?.id ?? "";
          const initialPerson = list.find((p) => p.id === initialId);
          setPersonId(initialId);
          setInputValue(initialPerson?.name ?? "");
        }
      } catch {
        if (!cancelled) setError("Failed to load nodes");
      } finally {
        if (!cancelled) setLoadingPeople(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [personIdFromUrl]);

  // Restore previously generated content when returning from View profile (same person)
  useEffect(() => {
    if (loadingPeople || !personId) return;
    try {
      const raw = sessionStorage.getItem(COMPOSE_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        personId?: string;
        result?: ComposeResponse;
        editableMessage?: string;
      };
      if (saved.personId !== personId || !saved.result) return;
      restoredFromStorageRef.current = true;
      setResult(saved.result);
      setEditableMessage(saved.editableMessage ?? saved.result.message ?? "");
    } catch {
      // ignore invalid or missing storage
    }
  }, [personId, loadingPeople]);

  // Persist result so "Back to extend" can restore it
  useEffect(() => {
    if (!result || !personId) return;
    try {
      sessionStorage.setItem(
        COMPOSE_STORAGE_KEY,
        JSON.stringify({ personId, result, editableMessage })
      );
    } catch {
      // ignore quota or other errors
    }
  }, [result, personId, editableMessage]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (restoredFromStorageRef.current) {
      restoredFromStorageRef.current = false;
      return;
    }
    if (result?.message) setEditableMessage(result.message);
  }, [result?.message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiPost<ComposeResponse>("/api/compose", {
        personId,
        goal: goal.trim() || undefined,
        format,
      });
      setResult(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to extend (check OPENAI_API_KEY?)"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = () => {
    const text = editableMessage.trim() || result?.message;
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleUpdateWithRefinement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || !refinement.trim()) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await apiPost<ComposeResponse>("/api/compose", {
        personId,
        goal: goal.trim() || undefined,
        format,
        refinement: refinement.trim(),
      });
      setResult(res);
      setRefinement("");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to extend (check OPENAI_API_KEY?)"
      );
    } finally {
      setUpdating(false);
    }
  };

  const selectedPerson = people.find((p) => p.id === personId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extend"
        description="Generate a short bio, connection points, and an outreach message for a contact. Uses your saved facts."
      />

      {loadingPeople ? (
        <div className="space-y-2">
          <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-muted/50" />
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted/50" />
        </div>
      ) : people.length === 0 ? (
        <Alert variant="default">
          Add nodes and facts first, then come back here.
          <Link href="/people" className="ml-2 font-medium underline">
            Add nodes →
          </Link>
        </Alert>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div ref={dropdownRef} className="relative max-w-md">
              <Label htmlFor="compose-person" className="mb-1 block">
                Person
              </Label>
              <Input
                id="compose-person"
                type="text"
                autoComplete="off"
                placeholder="Type to search by name…"
                value={inputValue}
                onChange={(e) => {
                  const v = e.target.value;
                  setInputValue(v);
                  setDropdownOpen(true);
                  if (!v.trim() && personId) setPersonId("");
                }}
                onFocus={() => setDropdownOpen(true)}
              />
              {dropdownOpen && (
                <ul
                  className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
                  role="listbox"
                >
                  {filteredPeople.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
                  ) : (
                    filteredPeople.map((p) => (
                      <li
                        key={p.id}
                        role="option"
                        aria-selected={p.id === personId}
                        className={cn(
                          "cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                          p.id === personId && "bg-accent/50"
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setPersonId(p.id);
                          setInputValue(p.name);
                          setDropdownOpen(false);
                        }}
                      >
                        {p.name}
                        {p.organization ? (
                          <span className="text-muted-foreground"> — {p.organization}</span>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              )}
              {selectedPerson && (
                <Link
                  href={`/people/${personId}?returnTo=/compose`}
                  className="mt-1 inline-block text-sm text-muted-foreground hover:underline"
                >
                  View profile →
                </Link>
              )}
            </div>
            <div>
              <Label htmlFor="compose-goal" className="mb-1 block">
                Goal or context (optional)
              </Label>
              <Input
                id="compose-goal"
                placeholder="e.g. Reconnect about design systems, ask for product feedback"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium">Format</span>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="format"
                  checked={format === "email"}
                  onChange={() => setFormat("email")}
                  className="rounded-full border-input"
                />
                Email
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="format"
                  checked={format === "text"}
                  onChange={() => setFormat("text")}
                  className="rounded-full border-input"
                />
                Text message
              </label>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating…" : "Generate"}
            </Button>
          </form>

          {error && <Alert variant="destructive">{error}</Alert>}

          {loading && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted/50" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
                </div>
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                  <p className="mt-1">{result.bio}</p>
                </div>
                {result.connectionPoints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Connection points
                    </h3>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      {result.connectionPoints.map((cp, i) => (
                        <li key={i}>{cp}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyMessage}
                      className={copyFeedback ? "border-green-500 text-green-600" : ""}
                    >
                      {copyFeedback ? "Copied!" : "Copy message"}
                    </Button>
                  </div>
                  {(selectedPerson?.primaryEmail || selectedPerson?.phone) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Send to:{" "}
                      {selectedPerson.primaryEmail && (
                        <span>{selectedPerson.primaryEmail}</span>
                      )}
                      {selectedPerson.primaryEmail && selectedPerson.phone && " · "}
                      {selectedPerson.phone && <span>{selectedPerson.phone}</span>}
                    </p>
                  )}
                  <textarea
                    className="mt-1 min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={editableMessage}
                    onChange={(e) => setEditableMessage(e.target.value)}
                    placeholder="Edit the message here (e.g. make it more friendly, more concise…)"
                  />
                  <form
                    onSubmit={handleUpdateWithRefinement}
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="compose-refinement" className="sr-only">
                        Add context to regenerate
                      </Label>
                      <Input
                        id="compose-refinement"
                        placeholder="e.g. Make it more concise, add a question about their new role…"
                        value={refinement}
                        onChange={(e) => setRefinement(e.target.value)}
                        disabled={updating}
                        className="min-w-[200px]"
                      />
                    </div>
                    <Button type="submit" variant="secondary" disabled={updating || !refinement.trim()}>
                      {updating ? "Updating…" : "Update"}
                    </Button>
                  </form>
                </div>
                {selectedPerson && (
                  <p className="text-sm text-muted-foreground">
                    <Link
                    href={`/people/${personId}?returnTo=/compose`}
                    className="hover:underline"
                  >
                    View {selectedPerson.name}&#39;s profile →
                  </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <ComposeForm />
    </Suspense>
  );
}
