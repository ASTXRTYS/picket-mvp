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

## Current Status (2025-09-30 21:31)
- **Production**: https://local79.vercel.app ✅ DEPLOYED
- **CRITICAL BUG**: Sign-up form (name/phone) not appearing for new users
- **Root Cause**: Profile created by trigger with only email, app not detecting and showing form
- **Impact**: Users can log in but have no name/phone in profile → admin dashboard shows incomplete data

## What's Broken
1. User signs up with email → magic link sent ✅
2. Trigger creates profile with ONLY email (no name/phone) ✅
3. User logs in → App should detect empty `full_name` and show "Complete Sign Up" form ❌
4. Instead: App goes straight to site selection page ❌
5. Result: Profiles exist but are incomplete (no full_name, no phone)

## 🔬 Active Research (In Progress)
**Question**: Is pure-web background location tracking viable for MVP, or do we need to pivot?

**Research Context Provided**:
- Tech stack: Next.js 14 PWA, Vercel, Supabase
- Current implementation: `navigator.geolocation.watchPosition` (stops when tab closes)
- Requirement: Track location every 2-3 minutes ONLY while user clocked in
- Constraint: NO native wrappers (Capacitor/Cordova) - must stay pure web for MVP
- Critical platform: iOS Safari (most restrictive - if it works there, works everywhere)

**Fallback Strategy if Research Says "No"**:
- PWA with "Add to Home Screen" prompt
- Screen Wake Lock API to prevent sleep
- Accept "keep tab open" limitation for demo, document as V2 native app requirement

## 🎯 Revised Scope Based on Research Outcome
**IF background tracking viable → Implement + AI agent (90 min)**
**IF NOT viable → Focus on AI agent only + polish existing UX (45 min)**

## Production URLs
- **Main**: https://local79.vercel.app
- **Admin Dashboard**: https://local79.vercel.app/admin

## 🔬 RESEARCH NEEDED (Confidence: Low)
### 1. Background Location Tracking - Web PWA
**Question**: Can we get persistent background geolocation after auth?
- Service Workers + Background Sync API?
- Geolocation API + Wake Lock API?
- Progressive Web App (PWA) install + permissions?
- Web Push API for periodic check-ins?

**Research**: Need to investigate browser capabilities for:
- iOS Safari limitations
- Android Chrome PWA mode
- Permission persistence after app close

### 2. Timer Persistence Without Open Window
**Current Problem**: Timer state lost when tab closes
**Desired Behavior**: 
- User checks in → Timer starts
- User closes window → Timer continues server-side
- Server periodically checks if user still in geofence
- Timer only stops if: (a) user leaves geofence OR (b) user manually clocks out

**Implementation Options**:
- Server-side cron job checking last known location?
- Web Worker + periodic location pings?
- Service Worker with Background Fetch?

## 🤖 NEW FEATURE: AI Reporting Agent
**Goal**: Daily attendance reports sent to Jeff & Brandon automatically

### Specs:
- **Platform**: Anthropic Claude SDK (use prompt caching for cost efficiency)
- **Budget**: $10-15 total (should last months with caching)
- **Memory**: Use MCP memory tools for context persistence
- **Trigger**: End of day (e.g., 8pm) or on-demand via chat interface

### Report Contents:
1. Total workers checked in today
2. Who didn't show up (absent)
3. Who left early (< 7 hours)
4. Who stayed overtime (> 8 hours)
5. Total hours logged per person

### Implementation:
- **Admin Dashboard**: Add chat box UI component
- **Backend**: Edge function or API route
- **Query**: Fetch attendance data from Supabase
- **Agent**: Claude analyzes, generates natural language report
- **Delivery**: In-app chat + optional email/SMS

**Time Estimate**: 45 minutes to build

## 📋 Action Plan (PENDING Research Results)
### Current State: ⏸️ WAITING
- Research query submitted to external tools
- User is gathering insights on background location viability
- Decision point: Once research returns, choose path A or B

### Path A: If Background Tracking Viable (90 min)
1. **Implement** chosen solution (Service Worker / Wake Lock / etc)
2. **Remove** "keep tab open" warning
3. **Test**: Check in → Close window → Verify tracking
4. **Build** AI reporting agent (chat UI + Anthropic integration)
5. **Deploy** to production

### Path B: If Background Tracking NOT Viable (45 min)
1. **Accept** limitation, add Wake Lock + "Add to Home Screen" prompt
2. **Focus** entirely on AI reporting agent
3. **Polish** existing UX (better messaging about keeping tab open)
4. **Document** background tracking as V2 (native app) requirement
5. **Deploy** to production

### Next Immediate Action (Once Research Complete):
- Update this plan based on findings
- Execute chosen path
- Test on actual picket line tonight

## Completed Today
- [x] Full auth + geofencing + timer
- [x] Admin dashboard with hours/timestamps
- [x] Deployed to Vercel

## Completed Items (Session 2025-09-30)
- [x] UI redesign with Teamsters branding
- [x] Fix sign-up error (profile check timing issue)
- [x] Hide redundant email field on sign-up form
- [x] Run updated SQL in Supabase with `phone` field
- [x] Fix Supabase URL typo (double 'ii')
- [x] Test auth flow (WORKING!)
- [x] Fix RLS circular dependency (removed "profiles admin read" policy)
- [x] Profile loading working (shows role, name, phone)
- [x] Admin role assignment working (manual in Supabase)
- [x] Update site coords to user location (28.04339° N, 82.46805° W)
- [x] Enhanced admin dashboard (shows names + phone numbers)
- [x] Push to GitHub (clean repo, no node_modules)

## Immediate Next Steps
1. **Research**: Background tracking options (15 min)
2. **Implement**: Background location persistence (30 min)
3. **Build**: AI reporting agent (30 min)
4. **Test**: Real picket line test tonight
5. **Demo**: Ready for tomorrow morning

## Post-Demo Priorities (V2)
- [ ] Native app for true background tracking
- [ ] Server-side timer calculation
- [ ] Offline support
- [ ] Push notifications
- [ ] Address geocoding for site creation
