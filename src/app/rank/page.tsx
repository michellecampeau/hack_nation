"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { apiPost, ApiError } from "@/lib/utils/api";
import type { RankResponse } from "@/types";

export default function RankPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankResponse | null>(null);

  // When returning from person detail with ?query= in URL, restore and run search
  useEffect(() => {
    const q = searchParams.get("query");
    if (q?.trim()) {
      setQuery(q);
      setLoading(true);
      setError(null);
      setResult(null);
      apiPost<RankResponse>("/api/rank", { query: q.trim() })
        .then((res) => setResult(res))
        .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to find edges"))
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiPost<RankResponse>("/api/rank", { query: query.trim() });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to find edges");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edges"
        description="Find who to reach out to for a given topic or goal. Results are ordered by relevance and recency."
      />

      <form onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="rank-query">Query</Label>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            id="rank-query"
            className="min-w-[200px] flex-1"
            placeholder="e.g. design systems, hiring, product feedback"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Finding…" : "Find"}
          </Button>
        </div>
      </form>

      {error && <Alert variant="destructive">{error}</Alert>}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border bg-muted/50"
              aria-hidden
            />
          ))}
        </div>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Results for &quot;{result.query}&quot;</CardTitle>
          </CardHeader>
          <CardContent>
            {result.ranked.length === 0 ? (
              <p className="text-muted-foreground">
                No matches. Add nodes and facts with relevant expertise or interests, then try
                another query.
              </p>
            ) : (
              <ol className="space-y-3">
                {result.ranked.map((entry, i) => (
                  <li
                    key={entry.personId}
                    className="flex gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                  >
                    <span className="font-mono text-sm text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/people/${entry.personId}?returnTo=/rank&query=${encodeURIComponent(result.query)}`}
                        className="font-medium hover:underline"
                      >
                        {entry.personName}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.explanation}</p>
                      {entry.originInfluence && entry.originInfluence.length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                          {entry.originInfluence.map((inf, j) => (
                            <li key={j}>{inf}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Score: {entry.score.toFixed(2)}
                      </p>
                    </div>
                    <Link
                      href={`/people/${entry.personId}?returnTo=/rank&query=${encodeURIComponent(result.query)}`}
                    >
                      <Button variant="ghost" size="sm">
                        View →
                      </Button>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
