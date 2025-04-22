# My V0 Project

A Next.js feedback app backed by Supabase for persistent storage (users & feedback).

## Prerequisites

- Node.js ≥ v18
- pnpm (or npm/yarn)

## Environment Variables

Create a `.env.local` file in the project root with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Next‑Auth
NEXTAUTH_SECRET=<a-random-jwt-secret>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
GITHUB_CLIENT_ID=<your-github-oauth-client-id>
GITHUB_CLIENT_SECRET=<your-github-oauth-client-secret>

# CORS (optional)
NEXT_PUBLIC_ALLOWED_ORIGIN=http://localhost:3000
```

## Installation

```bash
pnpm install
```

(Or `npm install` / `yarn install`)

## Development

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

## Build & Production

```bash
pnpm build
pnpm start
```

## Testing

```bash
pnpm exec vitest
```
