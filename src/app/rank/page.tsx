"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { apiPost, ApiError } from "@/lib/utils/api";
import type { RankResponse } from "@/types";

export default function RankPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankResponse | null>(null);

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
      setError(e instanceof ApiError ? e.message : "Failed to rank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rank</h1>
      <p className="text-muted-foreground">
        Find who to reach out to for a given topic or goal. Results are ordered by relevance and
        recency.
      </p>

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
            {loading ? "Ranking…" : "Rank"}
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
                No matches. Add people and facts with relevant expertise or interests, then try
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
                        href={`/people/${entry.personId}`}
                        className="font-medium hover:underline"
                      >
                        {entry.personName}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.explanation}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Score: {entry.score.toFixed(2)}
                      </p>
                    </div>
                    <Link href={`/people/${entry.personId}`}>
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
