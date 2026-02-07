# Hack Nation - Hackathon Starter Kit

A production-ready full-stack Next.js application scaffold designed for rapid development during hackathons.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **Database**: Prisma ORM (SQLite default, PostgreSQL/MySQL ready)
- **Authentication**: NextAuth.js
- **Code Quality**: ESLint, Prettier, Husky
- **Deployment**: Vercel, Docker, GitHub Actions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script                 | Description                  |
| ---------------------- | ---------------------------- |
| `npm run dev`          | Start development server     |
| `npm run build`        | Build for production         |
| `npm run start`        | Start production server      |
| `npm run lint`         | Run ESLint                   |
| `npm run format`       | Format code with Prettier    |
| `npm run format:check` | Check code formatting        |
| `npm run type-check`   | Run TypeScript type checking |
| `npm run db:generate`  | Generate Prisma Client       |
| `npm run db:push`      | Push schema to database      |
| `npm run db:migrate`   | Create and run migrations    |
| `npm run db:studio`    | Open Prisma Studio           |

## Project Structure

```
hack-nation/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── layout/       # Layout components
│   ├── lib/              # Utility functions
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Helper functions
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── prisma.ts     # Prisma client
│   │   └── utils.ts      # Tailwind utilities
│   └── types/            # TypeScript type definitions
├── prisma/
│   └── schema.prisma     # Database schema
├── public/               # Static files
└── ...config files
```

## Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL`: Database connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth.js
- `NEXTAUTH_URL`: Application URL

## Database Setup

### Using SQLite (Default)

SQLite is configured by default for quick development:

```bash
npm run db:push
```

### Switching to PostgreSQL

1. Update `DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

2. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:

```bash
npm run db:migrate
```

### Using Docker Compose

Start PostgreSQL with Docker:

```bash
docker-compose up -d
```

## Adding Custom Models

Edit `prisma/schema.prisma` to add your models:

```prisma
model YourModel {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Then run:

```bash
npm run db:push
```

## Authentication

### Default Setup

The project includes NextAuth.js with a credentials provider for development.

### Adding OAuth Providers

1. Uncomment providers in `src/lib/auth.ts`
2. Add credentials to `.env`:

```
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

### Protected Routes

Use NextAuth session in your components:

```tsx
import { useSession } from "next-auth/react";

export default function ProtectedPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <div>Access Denied</div>;

  return <div>Welcome {session.user?.email}</div>;
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Docker

Build and run with Docker:

```bash
docker build -t hack-nation .
docker run -p 3000:3000 hack-nation
```

Or use Docker Compose:

```bash
docker-compose up
```

## Utility Functions

### API Helpers

```typescript
import { apiGet, apiPost } from "@/lib/utils/api";

// GET request
const data = await apiGet("/api/example");

// POST request
const result = await apiPost("/api/example", { name: "Test" });
```

### Date Formatting

```typescript
import { formatDate, formatTimeAgo } from "@/lib/utils/date";

formatDate(new Date()); // "Jan 1, 2024"
formatTimeAgo(new Date()); // "2 hours ago"
```

### Validation

```typescript
import { emailSchema, validateData } from "@/lib/utils/validators";

const email = validateData(emailSchema, "test@example.com");
```

### Custom Hooks

```typescript
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useDebounce } from "@/lib/hooks/useDebounce";

const [value, setValue] = useLocalStorage("key", "default");
const debouncedValue = useDebounce(searchTerm, 500);
```

## GitHub Integration

### Create Repository

```bash
gh repo create hack-nation --public --source=. --remote=origin
git add .
git commit -m "Initial commit"
git push -u origin main
```

Or manually:

```bash
git remote add origin https://github.com/yourusername/hack-nation.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### CI/CD

GitHub Actions workflow is configured in `.github/workflows/ci.yml` and will:

- Run linting and type checking
- Build the application
- Build Docker image

## Tips for Hackathons

1. **Focus on Features**: All boilerplate is done, start building features immediately
2. **Use Templates**: Prisma schema has commented examples for common models
3. **Quick Database Changes**: Use `npm run db:push` for rapid schema iterations
4. **Component Library**: shadcn/ui components are ready to use
5. **API Routes**: Example API route in `src/app/api/example/route.ts`
6. **Deploy Early**: Use Vercel for instant deployments

## License

MIT

## Support

For issues or questions, open an issue on GitHub.

---

Built with Next.js, TypeScript, and TailwindCSS
