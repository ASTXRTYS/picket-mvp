# Picket MVP - Session Memory
**Last Updated**: 2025-10-01 3:33 AM | **Demo Deadline**: 9:00 AM (5.5 hours remaining)

## What This App Is
**Picket MVP** is a real-time attendance tracking web app for union workers on strike. Workers check in when they arrive at the picket line, and the app verifies they're physically present using GPS geofencing (500m radius). The app tracks how long they stay on-site, and admins can see who's currently on duty and generate reports.

**Context**: This is being built overnight (started 2 AM) for a 9 AM stakeholder demo. The user (Jason) is at the Tampa, FL picket line right now (27.90084° N, -82.38607° W) testing the app in real-time. A worker session has been running for 1h 40m+ proving the core functionality works.

**Key Innovation**: Session persistence - workers can close the browser and their session stays active. When they return, they can resume tracking or clock out. This mimics how professional time-tracking apps work (TSheets, Clockify).

**Primary Goal**: Add an AI admin copilot (chat widget) that can answer questions about attendance data and generate weekly reports for stakeholders using Claude API.

## Current Status: ✅ CORE APP WORKING

### Production URLs
- **Main**: https://local79.vercel.app
- **Admin**: https://local79.vercel.app/admin

### What's Working (Verified 3:28 AM)
1. ✅ **Worker Flow**: Magic link auth → Check in → Geofence tracking (1h 37m session active)
2. ✅ **Admin Dashboard**: Shows "Currently On Duty (1)" + "Today's Attendance"
3. ✅ **Geofencing**: Accurate distance calc (68m from center), Tampa FL coordinates
4. ✅ **Session Persistence**: Workers can close browser, session survives

### Critical Tech Details
- **Stack**: Next.js 14, React 18, TypeScript, Supabase PostgreSQL
- **Supabase Project**: `vjiaepyxiibkllhyjert`
- **Site Coordinates**: 27.90084° N, -82.38607° W (Tampa, FL)
  - ⚠️ **CRITICAL**: Longitude MUST be negative (-82.38607) for Western Hemisphere
- **Geofence Radius**: 500m (Main Picket Line)

### Database Schema (Key Tables)
```sql
-- profiles: id (FK to auth.users), email, full_name, phone, role, site_id
-- sites: id, name, center_lat, center_lng, radius_m
-- attendances: id, user_id (FK to profiles.id), site_id, started_at, ended_at, seconds_inside
```

### Critical Fixes Applied This Session
1. **Geofence Bug**: Missing negative sign on longitude (was 82.38739, fixed to -82.38739)
2. **Admin Dashboard**: Auto-select first site if admin has no site_id assigned
3. **Database Relationship**: Added FK from `attendances.user_id` to `profiles.id` (enables joins)

---

## 🎯 REMAINING TASKS (Priority Order)

### 1. AI Admin Copilot (90 min) - PRIMARY GOAL
**Requirements**:
- Chat widget on admin page (like customer support chat)
- Uses Anthropic Claude SDK with prompt caching
- Has read access to Supabase `attendances`, `profiles`, `sites` tables
- Can generate weekly reports: who didn't complete shifts, insights for stakeholders
- Budget: $10-15 total (should last months with caching)

**Implementation**:
- Create API route: `/api/chat` that accepts messages
- Query Supabase data server-side
- Call Claude API with attendance context
- Return formatted responses
- Add chat UI component to admin page

### 2. Estimated Clock-Out Time (10 min) - Nice-to-have
- Display: "Clocked in at 8:05 AM • Est. clock-out: 3:05 PM" (7-hour shifts)
- Add to worker UI on `pages/index.tsx`

### 3. Final Testing (30 min)
- Test AI copilot queries
- Verify reports generate correctly
- Demo walkthrough practice

---

## Key Files
- `pages/index.tsx` - Worker UI (geofence tracking, check-in/out)
- `pages/admin.tsx` - Admin dashboard (currently on duty, attendance)
- `lib/geo.ts` - Haversine distance calculation
- `supabase.sql` - Database schema + RLS policies

## User Roles & Access
- **Workers**: Sign up with email/name/phone → Check in at picket line → Track time → Clock out
  - Currently: Jason Madruga (3054331322) - Worker account testing the app live
- **Admins**: View all worker attendance, see who's on duty, access reports
  - Currently: jason.gitdev@gmail.com - Admin account with full dashboard access

## Auth Flow (Passwordless Magic Links)
1. User enters email → Magic link sent to email
2. New users: provide name + phone (stored in localStorage temporarily)
3. Click magic link → Profile created via Supabase trigger
4. App reads localStorage → Updates profile with name/phone
5. Returning users: Skip signup, go straight to app
6. Role assignment: Manual in Supabase (set `role='admin'` for admins)

## How Workers Use the App
1. Open local79.vercel.app on phone
2. Sign in with email (gets magic link)
3. Select "Main Picket Line" from dropdown
4. Hit "Check In" (GPS verified, geofence starts)
5. Can close browser - session persists in database
6. Reopen later → See "Active Session Found" → Resume or Clock Out
7. Clock Out → Final GPS verification → Total time calculated from database

## How Admins Use the App
1. Go to local79.vercel.app/admin
2. Sign in with admin email
3. Dashboard auto-loads showing:
   - "Currently On Duty": Live list of clocked-in workers with elapsed time
   - "Today's Attendance": Completed shifts with total hours
4. Can switch between sites (if multiple exist)
5. Click "Refresh" to update data

## Deployment
- **Auto-deploy**: `git push` → Vercel builds + deploys to `local79.vercel.app`
- **Manual deploy**: `vercel --prod` (faster, bypasses GitHub, ~30 seconds)
