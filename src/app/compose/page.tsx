"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPost, ApiError } from "@/lib/utils/api";
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
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposeResponse | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<PeopleResponse>("/api/people");
        const list = res.data ?? [];
        if (!cancelled) {
          setPeople(list);
          const initial =
            personIdFromUrl && list.some((p) => p.id === personIdFromUrl)
              ? personIdFromUrl
              : list[0]?.id ?? "";
          setPersonId(initial);
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
  }, [personIdFromUrl]);

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
      setError(
        e instanceof ApiError ? e.message : "Failed to compose (check OPENAI_API_KEY?)"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = () => {
    if (!result?.message) return;
    void navigator.clipboard.writeText(result.message);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const selectedPerson = people.find((p) => p.id === personId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compose</h1>
      <p className="text-muted-foreground">
        Generate a short bio, connection points, and an outreach message for a contact. Uses your
        saved facts.
      </p>

      {loadingPeople ? (
        <div className="space-y-2">
          <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-muted/50" />
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted/50" />
        </div>
      ) : people.length === 0 ? (
        <Alert variant="default">
          Add people and facts first, then come back here.
          <Link href="/people" className="ml-2 font-medium underline">
            Add people →
          </Link>
        </Alert>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="compose-person" className="mb-1 block">
                Person
              </Label>
              <Select
                id="compose-person"
                className="max-w-md"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.organization ? ` (${p.organization})` : ""}
                  </option>
                ))}
              </Select>
              {selectedPerson && (
                <Link
                  href={`/people/${personId}`}
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
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle>Result</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMessage}
                  className={copyFeedback ? "border-green-500 text-green-600" : ""}
                >
                  {copyFeedback ? "Copied!" : "Copy message"}
                </Button>
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
                  <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
                  <div className="mt-1 whitespace-pre-wrap rounded border bg-muted/30 p-3 text-sm">
                    {result.message}
                  </div>
                </div>
                {selectedPerson && (
                  <p className="text-sm text-muted-foreground">
                    <Link href={`/people/${personId}`} className="hover:underline">
                      Edit {selectedPerson.name}&#39;s profile →
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
