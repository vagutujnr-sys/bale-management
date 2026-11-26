# Tobacco Contract Management

A tobacco contracting and bale-management system with dedicated apps for farmers, drivers, and staff operations.

## Applications

- Farmer
- Driver/Transporter
- Contracting
- Gate Operations
- Transport
- Quality Control
- Finance
- Warehouse
- Operations Workstation
- Main Administration

## Development

You need Node.js and npm.

```sh
npm install
npm run dev
```

Run the test suite with `npm test` and create a production build with `npm run build`.

## Data services

The browser Supabase client uses `VITE_SUPABASE_URL` and a publishable key (or legacy anon key) from `.env`. The server auth bridge uses `SUPABASE_URL` (locally it can fall back to `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. Configure both as server runtime bindings in production. `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only credentials; never expose them to browser code. The service-role key bypasses Row Level Security.

Farmer and Driver/Transporter sign-up create email/password Auth identities using normalized phone-derived addresses on the reserved `.invalid` domain. A server-only API validates each registration, creates the corresponding database rows with the service-role key, assigns generated farmer/transporter references, records the new Auth user as `created_by`, and links the account in `profiles`. The service-role key bypasses Row Level Security, so it must remain server-only and these endpoints must not be expanded into general-purpose database writes. The Farmer sign-up form shows profile completion as required details are entered. Staff sign-in also uses phone plus a six-digit PIN, but public staff registration is not available. A phone number or registration identifier already attached to a record cannot be claimed through public sign-up; existing accounts must sign in or be resolved by an administrator.

For local schema administration, set `SUPABASE_DB_URL` to the direct Postgres connection string from the Supabase project’s Connect settings. It contains a database password, must remain private, and is not used by browser code. The service-role key grants Data API access but cannot run arbitrary SQL to create tables. Operational dashboards and workflows beyond account registration remain mock-backed and must be connected before the full application is production-ready.
