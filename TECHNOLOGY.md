# Technology and Data Sources

## Application stack

- **Language:** TypeScript
- **UI:** React 19
- **Build and development server:** Vite 8
- **Full-stack framework and routing:** TanStack Start and TanStack Router
- **Styling:** Tailwind CSS 4, with Radix UI-based components
- **Server runtime and deployment output:** Nitro, configured with its Vercel preset
- **Tests:** Vitest and Testing Library
- **Package managers:** npm (`package-lock.json`) and Bun (`bun.lock`)

## Database and authentication

- **Database:** PostgreSQL hosted by Supabase.
- **Database project selection:** The Supabase project URL configured in the local `.env` file. The browser reads `VITE_SUPABASE_URL`; server code uses `SUPABASE_URL`, falling back to `VITE_SUPABASE_URL` during local development.
- **Authentication:** Supabase Auth. Farmer and driver accounts use a phone/PIN experience backed by Supabase Auth identities.
- **Application data access:** The browser uses `@supabase/supabase-js` with `VITE_SUPABASE_PUBLISHABLE_KEY`, or the legacy `VITE_SUPABASE_ANON_KEY`. Server-only account endpoints use the Supabase Auth and REST APIs with a server-side service key.
- **Direct database administration:** `SUPABASE_DB_URL` is the direct PostgreSQL connection string for local schema administration. It is not used by browser application code.
- **Schema SQL:** The repository contains `database_changes/changes.sql`. Review it and apply it to the intended Supabase project separately; the application build does not apply schema changes.

The actual project URL, project ID, and database connection string are environment-specific and are intentionally not recorded in this file. Keep `.env` private. Never expose `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_DB_URL` to browser code or commit their values.

## Configuration

Copy `.env.example` to `.env` for local development and fill in the values from the Supabase project settings. The example file documents supported variable names; the real values belong only in the local environment or deployment secret settings.

For production, configure the Supabase URL and server-only credentials as server runtime environment variables. The service-role key bypasses Row Level Security and must remain server-side.

## Data integration status

Account authentication, profile, onboarding, farmer and driver registration, and the farmer dashboard use Supabase-backed APIs. Farm submissions collect location, area, expected seasonal production, and at least four photos. Photos upload to a private Supabase Storage bucket, and staff can assess and approve or reject submitted farms. Apply `database_changes/farm-assessment.sql` after the base farm table exists to enable the required database and storage configuration. Some operational apps and workflows are still mock-backed; check the relevant route before treating displayed operational data as live.

## Common commands

```sh
npm run dev
npm test
npm run lint
npm run build
```
