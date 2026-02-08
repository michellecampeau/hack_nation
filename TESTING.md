# Testing Chief of Staff

## Prerequisites

1. **Environment**
   - Copy `.env.example` to `.env` and set at least `DATABASE_URL` (default SQLite is fine).
   - For **Compose**: set `OPENAI_API_KEY` in `.env`. Without it, Compose returns 503.

2. **Database**
   ```bash
   npm run db:push
   ```

3. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## 1. Manual UI flow (recommended first pass)

This is the fastest way to confirm everything works end-to-end.

1. **Home** – You should see “Chief of Staff” and links to People, Rank, Compose.

2. **People**
   - Click **Add person**. Fill name (required), email, org, role, relationship, tags (comma-separated), notes. Save.
   - You should see the new person in the list. Add **2–3 more** people with different orgs/roles.

3. **Person detail**
   - Click a person. Add **facts**: e.g. type “expertise”, value “Design systems”; type “interest”, value “running”. Add a few facts per person so Rank has something to match.

4. **Rank**
   - Enter a query that matches one person’s facts (e.g. “design” or “running”). Click **Rank**.
   - You should see a ranked list with explanations and scores. “View contact →” should open that person’s page.

5. **Compose**
   - Pick a person, optionally enter a goal (e.g. “Reconnect about design”). Click **Generate**.
   - You should see bio, connection points, and message. **Copy message** should copy the message to the clipboard.
   - If you see “Compose unavailable” or 503, check `OPENAI_API_KEY` in `.env`.

6. **Edit person**
   - On a person’s page, click **Edit**, change a field, **Save**. Changes should persist after refresh.

---

## 2. API testing (curl)

Useful to verify the backend without the UI. Run with the dev server up (`npm run dev`).

**Create a person**
```bash
curl -s -X POST http://localhost:3000/api/people \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","primaryEmail":"test@example.com","organization":"Acme","relationshipState":"ok"}' \
  | jq .
```
Note the returned `id` (e.g. `clxx...`) for the next calls.

**List people**
```bash
curl -s http://localhost:3000/api/people | jq .
```

**Get one person (use a real id)**
```bash
curl -s http://localhost:3000/api/people/YOUR_PERSON_ID | jq .
```

**Add a fact**
```bash
curl -s -X POST http://localhost:3000/api/facts \
  -H "Content-Type: application/json" \
  -d '{"personId":"YOUR_PERSON_ID","type":"expertise","value":"Product design"}' \
  | jq .
```

**Rank**
```bash
curl -s -X POST http://localhost:3000/api/rank \
  -H "Content-Type: application/json" \
  -d '{"query":"design"}' \
  | jq .
```

**Compose (requires OPENAI_API_KEY)**
```bash
curl -s -X POST http://localhost:3000/api/compose \
  -H "Content-Type: application/json" \
  -d '{"personId":"YOUR_PERSON_ID","goal":"Catch up"}' \
  | jq .
```

**Update person**
```bash
curl -s -X PATCH http://localhost:3000/api/people/YOUR_PERSON_ID \
  -H "Content-Type: application/json" \
  -d '{"organization":"New Org"}' \
  | jq .
```

(`jq` is optional; it just pretty-prints JSON.)

---

## 3. Inspect data (Prisma Studio)

To see or debug what’s in the database:

```bash
npm run db:studio
```

Opens a browser UI for SQLite tables (Person, Fact, Event, etc.).

---

## 4. Lint and build

Before committing or deploying:

```bash
npm run lint
npm run type-check
npm run build
```

CI already runs these plus Docker build.

---

## 5. WhatsApp import and facts

- **Facts from chat:** Message significance (expertise, interests, shared context) is extracted only when `OPENAI_API_KEY` is set. If you imported a chat without it, no facts were created. Re-uploading the same chat will **append** messages and run extraction (new facts added); you do **not** need to delete contacts.
- **API response:** After import, the response includes `factsExtracted: true` when the key was set and extraction ran; otherwise `factsExtracted: false`.

---

## 6. Unit tests (Vitest)

Install and run parser tests (uses `_chat.txt` in project root):

```bash
npm install
npm run test
```

Tests live in `src/lib/ingestion/__tests__/parse-whatsapp.test.ts` and validate WhatsApp parsing: participants, message count, first/last message, multi-line messages, and optional group name.

---

## Optional: unit test for ranking

The ranking logic in `src/lib/ranking/rank.ts` is a pure function. You can add a test runner (e.g. Vitest) and a test that passes mock people and a query and asserts the order and that explanations exist. See the plan’s “Testing as you go” section for the idea.
