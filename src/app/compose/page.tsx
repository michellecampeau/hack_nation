"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, ApiError } from "@/lib/utils/api";
import type { PersonRecord } from "@/types";
import type { ComposeResponse } from "@/types";

interface PeopleResponse {
  data: PersonRecord[];
}

export default function ComposePage() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [personId, setPersonId] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<PeopleResponse>("/api/people");
        const list = res.data ?? [];
        if (!cancelled) {
          setPeople(list);
          if (list.length > 0 && !personId) setPersonId(list[0].id);
        }
      } catch {
        if (!cancelled) setError("Failed to load people");
      } finally {
        if (!cancelled) setLoadingPeople(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to compose (check OPENAI_API_KEY?)");
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = () => {
    if (!result?.message) return;
    void navigator.clipboard.writeText(result.message);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compose</h1>
      <p className="text-muted-foreground">
        Generate a short bio, connection points, and an outreach message for a contact. Uses your
        saved facts.
      </p>

      {loadingPeople ? (
        <p className="text-muted-foreground">Loading people…</p>
      ) : people.length === 0 ? (
        <p className="text-muted-foreground">Add people and facts first, then come back here.</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Person</label>
              <select
                className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.organization ? ` (${p.organization})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Goal or context (optional)</label>
              <Input
                placeholder="e.g. Reconnect about design systems, ask for product feedback"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating…" : "Generate"}
            </Button>
          </form>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {result && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Result</CardTitle>
                <Button variant="outline" size="sm" onClick={copyMessage}>
                  Copy message
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                  <p className="mt-1">{result.bio}</p>
                </div>
                {result.connectionPoints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Connection points</h3>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      {result.connectionPoints.map((cp, i) => (
                        <li key={i}>{cp}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
                  <div className="mt-1 whitespace-pre-wrap rounded border bg-muted/30 p-3 text-sm">
                    {result.message}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
