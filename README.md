# BizDev B2B Organizer — Frontend

Next.js 16 frontend for the B2B email outreach platform.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI/Styling:** Tailwind CSS v4 + shadcn/ui
- **State Management:** Zustand (auth + language) + TanStack Query v5 (data fetching)
- **Forms & Validation:** React Hook Form + Zod
- **i18n:** Bulgarian (default) / English toggle — no external library
- **Font:** Geist

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Point this at wherever the `-api` server is running.

### 3. Start development

```bash
npm run dev
```

Opens on `http://localhost:3001` (or `3000` if the API is on a different port).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Always | Base URL of the `-api` server |

---

## Pages

| Route | Description |
|---|---|
| `/login` | Email + password login |
| `/register` | Create a new company account |
| `/accept-invite?token=` | Accept team invitation and register |
| `/verify-email?code=` | Verify email address |
| `/campaigns` | List all campaigns |
| `/campaigns/new` | Create a campaign |
| `/campaigns/[id]` | Campaign detail, stats, pause/resume/delete |
| `/sequences` | List all sequences |
| `/sequences/new` | Create a sequence |
| `/sequences/[id]` | Sequence step builder |
| `/target-groups` | List target groups with lead counts |
| `/target-groups/new` | Create a target group |
| `/target-groups/[id]` | View leads, import from Excel |
| `/mailboxes` | Manage sender mailboxes (IMAP config) |
| `/settings` | Company profile, team invitations, and members |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/         # Login, register, accept-invite, verify-email — no sidebar
│   └── (dashboard)/    # All main pages — fixed sidebar layout
├── components/
│   ├── layout/         # Sidebar
│   ├── shared/         # PageHeader, EmptyState, StatusBadge, etc.
│   └── ui/             # shadcn/ui primitives
├── hooks/
│   └── useTranslations.ts
├── lib/
│   ├── api.ts          # Axios client + all API functions
│   ├── queryKeys.ts    # TanStack Query key factory
│   └── i18n/           # bg.ts + en.ts translation objects
├── proxy.ts            # Next.js 16 route protection middleware
└── stores/
    ├── authStore.ts    # Token, user, cookie-backed persistence
    └── langStore.ts    # Language toggle (bg/en)
```

---

## Team Management

The app uses an **invite** team model:

- Team members are added via email invitations from the Settings page
- Invitations expire after 24 hours
- Invited users register directly (no need for existing account)
- All team members have equal access (no role hierarchy)
- Any member can invite or remove others

---

## Authentication

Session is stored in a cookie (`auth-storage`) via a custom Zustand storage adapter. This allows the `proxy.ts` middleware to read the token server-side and redirect unauthenticated users to `/login`.

The axios client automatically refreshes expired tokens on 401 and retries the original request.

---

## i18n

The default language is **Bulgarian**. Switch to English using the `BG | EN` toggle at the bottom of the sidebar. The selected language persists across sessions via `localStorage`.

To add a translation key, add it to both `src/lib/i18n/bg.ts` and `src/lib/i18n/en.ts`.

---

## Production Build

```bash
npm run build
npm run start
```

For Docker deployment, Next.js is configured with `output: 'standalone'` for optimized container images.

---

## Docker — Multi-platform Build & Push to Docker Hub

Required for cross-OS compatibility (e.g. building on Mac M-series and deploying on Linux servers).
Builds for both `linux/amd64` (Intel/Windows/Linux servers) and `linux/arm64` (Mac M1/M2/M3, AWS Graviton).

**One-time setup — create the multi-platform builder:**

```bash
docker buildx create --name multibuilder --driver docker-container --use
```

**Build and push to Docker Hub:**

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t name/b2b-organizer-frontend:latest \
  --push \
  ./ai-first-biz-dev-b2b-organizer-fe
```

> Run `docker login` first if not already authenticated.
> The `--push` flag builds and pushes directly to Docker Hub in one step — no separate `docker push` needed.
> `NEXT_PUBLIC_API_URL` is baked in at build time — set it via `--build-arg NEXT_PUBLIC_API_URL=https://your-api.com/api` if different from the default.
