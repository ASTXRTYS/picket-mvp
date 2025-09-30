# Picket MVP - Running Memory

## Project Overview
- **App Name**: Picket MVP
- **Purpose**: Union picket line attendance tracking via geofencing
- **Tech Stack**: Next.js 14, React 18, TypeScript, Supabase
- **Deployment**: Local dev (can deploy to Vercel)

## Current Status (2025-09-30)

### Completed Setup
- ✅ Created `.env.local` with Supabase credentials
  - Project URL: `https://vjiaepyxibkllhyjert.supabase.co`
  - Anon key: (stored in .env.local)
- ✅ Dependencies installed (`npm install`)
- ✅ User will run `supabase.sql` manually in Supabase dashboard

### Supabase Configuration (User Action Required)
1. Run `supabase.sql` in SQL Editor
2. Configure Authentication:
   - Go to: Authentication > Providers > Email
   - Enable Magic Link
   - Set Site URL to `http://localhost:3000`

### Current State
- Single site setup (Main Picket Line - NYC coords)
- Multi-site UI exists but only one site in database
- ✅ **UI Redesign Complete** - Polished Teamsters-branded interface

## Key Features
1. **Worker Flow**: Sign in/up → Provide name & phone (new users) → Select site → Check in → Timer tracks while inside geofence
2. **Admin Dashboard**: View present/absent workers for today
3. **Geofencing**: Client-side, ~120m radius, pauses when outside
4. **New User Registration**: Collects full name and phone number on first sign-up

## UI Changes (2025-09-30)
- ✅ Teamsters gold (#FFB81C) and black color scheme
- ✅ Centered, polished card-based design
- ✅ Logo placement (placeholder SVG - replace with actual logo)
- ✅ Name and phone collection for new users
- ✅ Improved buttons with hover effects
- ✅ Better visual hierarchy
- ✅ Check-in box styled as main card with gold border

## Database Updates
- ✅ Added `phone` field to `profiles` table
- ✅ Fixed SQL policy syntax (removed unsupported `IF NOT EXISTS`)

## Notes
- Foreground-only tracking (page must be open)
- Background tracking requires native app (future feature)
- Logo is placeholder SVG - replace with actual Teamsters logo image
- Phone number stored in profiles table

## Bug Fixes (2025-09-30 17:45)
- ✅ **Fixed sign-up error**: Reordered logic - now checks for name/phone first before profile lookup
  - New logic: If name+phone provided → send magic link immediately
  - Profile check only happens for returning users (email-only sign-in)
- ✅ **Fixed UX**: Removed redundant email field from sign-up form
- ℹ️ Logo placeholder SVG works but doesn't show actual Teamsters logo (expected)

## How Sign-up Flow Works Now
1. User enters email → checks if profile exists
2. If NO profile → shows sign-up form (name + phone)
3. User fills name/phone → sends magic link → stores data in localStorage
4. User clicks magic link → logs in → app reads localStorage → updates profile
5. If profile EXISTS → sends magic link directly (returning user)

## Git Commits
1. ✅ "desired UI for signing in" - Initial UI redesign with Teamsters branding
2. ✅ "fix: sign-up error and remove redundant email field" - Bug fixes

## Smoke Test Plan (2025-09-30 17:51)
**Best way to test**: Check if profile is saved in Supabase after sign-up

### Manual SQL Update (Recommended - Simplest):
1. Go to: https://supabase.com/dashboard/project/vjiaepyxibkllhyjert/sql/new
2. Copy entire `supabase.sql` from local repo (has `phone` field added!)
3. Paste and run in SQL Editor
4. SQL will automatically drop old policies and recreate everything

**Why Manual?** Supabase doesn't expose SQL execution via REST API (security). The dashboard SQL Editor is the safest way to run DDL statements.

### Test Flow:
5. Go to http://localhost:3000
6. Enter NEW email (one you haven't used)
7. Fill name + phone, click Continue
8. Check email, click magic link
9. **VERIFY IN SUPABASE**: 
   - Go to Table Editor → `profiles` table
   - Should see your new profile with: email, full_name, phone, role='worker'
10. If profile exists with all data → ✅ Auth + profile creation working!
11. Then test check-in functionality

### Note on Supabase MCP:
- MCP server needs access token configured at startup (can't set from here)
- Manual SQL update is actually simpler and faster for this use case

## Successful Tests (2025-09-30 18:17)
- ✅ **Auth flow working**: Sign-up → magic link → email sent → clicked link → logged in
- ✅ **Worker UI loaded**: Can see site selection, picket time tracker
- ⏳ **Verifying profile data**: Checking Supabase Table Editor → profiles

## Issues Resolved
### 1. Supabase URL typo (2025-09-30 18:09)
- **Problem**: "Failed to fetch" error - wrong Supabase URL (typo: missing one 'i')
- **Fix**: Updated .env.local with correct URL: `vjiaepyxiibkllhyjert` (double 'ii')
- **Result**: Auth flow now working!

### 2. Returning user sign-in bug (2025-09-30 18:24)
- **Problem**: Existing users shown "complete signup" page instead of just getting magic link
- **Root Cause**: RLS policies block profile check when user not authenticated
- **Fix**: Simplified logic - just send magic link for all users (no pre-auth profile check)
- **Result**: Returning users now get magic link directly without sign-up form

## Current Testing (2025-09-30 18:48)
- **User Coordinates**: 28.04339° N, 82.46805° W (Florida location)
- **Site coords updated in Supabase**: Ready for geofence testing
- **Status**: Auth working, profiles working, admin role working

## Remaining Tasks for Demo
1. ✅ Fix user display (show name instead of UUID in admin dashboard)
2. 🚀 Deploy to Vercel (production environment)
3. 🧪 Real-world smoke test: Check in → Drive away → Verify timer pauses

## Completed Items
- [x] Commit current UI as "desired UI for signing in" 
- [x] Fix sign-up error (profile check timing issue)
- [x] Hide redundant email field on sign-up form
- [x] Run updated SQL in Supabase with `phone` field
- [x] Fix Supabase URL typo (double 'ii')
- [x] Test auth flow (WORKING!)
- [x] Fix RLS circular dependency (removed "profiles admin read" policy)
- [x] Profile loading working (shows role, name, phone)
- [x] Admin role assignment working (manual in Supabase)
- [x] Update site coords to user location for geofence test

## Next Steps
- [ ] **IN PROGRESS**: Fix user display in admin dashboard (name + contact vs UUID)
- [ ] Deploy to Vercel
- [ ] Real-world geofence test (check-in → drive away)
- [ ] Replace placeholder logo with actual Teamsters logo PNG/SVG
- [ ] (Future) Add address geocoding feature for easier site creation
