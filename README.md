# Picket MVP (overnight demo)

A super-light web MVP you can deploy in minutes. Workers sign in with a magic link, choose a picket site, **check in**, and a timer runs **while they are inside** the geofence *and the page is open*. Admins can see a present/absent list for today.

> This is a foreground MVP for demo/pilot. Background geofencing needs a native app (we can ship next).

## Quick start

### 1) Create a Supabase project
- Go to supabase.com → New project.
- Grab your **Project URL** and **anon key**.

### 2) Run the SQL
Open the SQL editor in Supabase and run `supabase.sql` from this repo. It will:
- Create tables: `sites`, `profiles`, `attendances`
- Add a trigger to auto-create `profiles` on signup
- Add basic Row-Level Security so users see only their own data
- Insert an example site

### 3) Configure Auth (magic links)
In Supabase → Authentication → Providers → Email, enable Magic Links. Set the site URL later to your Vercel domain.

### 4) Deploy
- **Vercel**: New Project → import this repo. Set env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Or run locally: `npm i && npm run dev`

### 5) Add admins & assign site
- In Supabase Table Editor → `profiles`, set `role='admin'` and `site_id` for your admin(s).
- Add workers: they can sign in; their `profiles` row is created automatically. Assign `site_id` to them as needed.

### 6) Use it
- Workers: open the site, sign in, pick a site, **Check in**, keep page open while on the line, **Clock out**.
- Admins: `/admin` shows present/absent for **today** for their site.

## Notes
- Geofence radius defaults to ~120m. Tune per site.
- Timer pauses when the device leaves the radius (client-side).
- This is a demo: anti-spoofing is minimal, and background tracking is not enabled.

## Next steps (post-demo)
- Native app with real background geofencing.
- Server-side distance checks and anomaly flags.
- Scheduled 8:30 AM summary email to reps.
