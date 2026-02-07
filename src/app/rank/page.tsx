"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-sm font-medium">Query</label>
          <Input
            placeholder="e.g. design systems, hiring, product feedback"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Ranking…" : "Rank"}
        </Button>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Results for &quot;{result.query}&quot;</CardTitle>
          </CardHeader>
          <CardContent>
            {result.ranked.length === 0 ? (
              <p className="text-muted-foreground">
                No matches. Add people and facts, then try again.
              </p>
            ) : (
              <ol className="space-y-3">
                {result.ranked.map((entry, i) => (
                  <li key={entry.personId} className="flex gap-4 rounded-lg border p-3">
                    <span className="font-mono text-sm text-muted-foreground">{i + 1}</span>
                    <div className="flex-1">
                      <a href={`/people/${entry.personId}`} className="font-medium hover:underline">
                        View contact →
                      </a>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.explanation}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {entry.score.toFixed(2)}
                      </p>
                    </div>
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
