# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Start dev server (Vite)
- `pnpm build` — Type-check (`tsc -b`) then build (`vite build`)
- `pnpm lint` — Run ESLint

Package manager: **pnpm** (lockfile is `pnpm-lock.yaml`)

No test framework is configured.

## Architecture

React Query best-practices demo app using JSONPlaceholder API. Stack: React 19, TanStack React Query v5, React Router DOM v7, Vite 8, TypeScript 6.

### Data flow pattern

Three-layer separation, all typed via `src/types/index.ts`:

1. **`src/api/index.ts`** — Raw fetch calls, returns typed promises. No React Query knowledge.
2. **`src/queries/*.ts`** — Centralized query keys + `queryOptions()` factories. Each domain (users, posts) exports its own keys and query option builders.
3. **`src/components/*.tsx`** — Consume queries via `useSuspenseQuery()` / `useMutation()`. No direct API imports (except mutations calling `api.*`).

### Key conventions

- **Query keys** are co-located with their query options and follow a hierarchical pattern: `["users", "list"]`, `["users", "detail", id]`, `["posts", "byUser", userId]`.
- **`queryOptions()`** from `@tanstack/react-query` is used exclusively — no inline `useQuery({ queryKey, queryFn })`.
- **`useSuspenseQuery`** in components (not `useQuery`), so components always receive defined data.
- **Mutation cache updates** use `queryClient.setQueryData()` to write the API response directly into cache (e.g., append `newPost` to the posts list). This is preferred over `invalidateQueries` because JSONPlaceholder is a mock API that doesn't persist POST data — refetching won't return the newly created resource.
- **Route-level prefetch** in `App.tsx` via `queryClient.ensureQueryData()` on route `loader`.
- **Lazy loading** — route components are `lazy()` imported with `Suspense` fallback.

### Routing

- `/` → `UserList` (prefetched on route load)
- `/users/:userId/posts` → `UserPosts`
- `*` → redirect to `/`
