# Hackathon Quick Start Guide

Get coding in under 5 minutes!

## Step 1: Install & Setup (2 minutes)

```bash
# Install dependencies
npm install

# Initialize database
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

Visit http://localhost:3000 to see your app running!

## Step 2: Customize for Your Project (1 minute)

### Update Branding

Edit `src/app/page.tsx` to change the home page content.

### Add Your Database Models

Edit `prisma/schema.prisma` - uncomment example models or add your own:

```prisma
model Task {
  id          String   @id @default(cuid())
  title       String
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

Then run:

```bash
npm run db:push
```

## Step 3: Start Building Features

### Create an API Route

Create `src/app/api/tasks/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tasks = await prisma.task.findMany();
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const data = await request.json();
  const task = await prisma.task.create({ data });
  return NextResponse.json(task);
}
```

### Create a Component

Create `src/components/TaskList.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TaskList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch("/api/tasks")
      .then(res => res.json())
      .then(setTasks);
  }, []);

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <Card key={task.id}>
          <CardContent className="p-4">
            <h3>{task.title}</h3>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Common Tasks

### Add a New Page

Create `src/app/dashboard/page.tsx`:

```typescript
export default function Dashboard() {
  return <div>Dashboard</div>;
}
```

Access at: http://localhost:3000/dashboard

### Use Authentication

```typescript
"use client";

import { useSession } from "next-auth/react";

export default function Profile() {
  const { data: session } = useSession();

  if (!session) return <div>Please sign in</div>;

  return <div>Hello {session.user?.email}</div>;
}
```

### Make API Calls

```typescript
import { apiGet, apiPost } from "@/lib/utils/api";

// Fetch data
const tasks = await apiGet("/api/tasks");

// Create data
const newTask = await apiPost("/api/tasks", {
  title: "New task",
  completed: false,
});
```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or push to GitHub and connect to Vercel dashboard.

## Need Help?

- Check the main README.md for detailed documentation
- Prisma Studio: `npm run db:studio` (visual database editor)
- Type errors? Run: `npm run type-check`
- Format issues? Run: `npm run format`

## Pro Tips

1. Use `npm run db:studio` to view and edit database visually
2. Hot reload is enabled - save files to see instant changes
3. All UI components are in `src/components/ui/`
4. Utility functions are in `src/lib/utils/`
5. Press Ctrl+C to stop the dev server

Now go build something awesome!
