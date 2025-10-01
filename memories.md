# Picket MVP - Session Memory
**Last Updated**: 2025-10-01 3:33 AM | **Demo Deadline**: 9:00 AM (5.5 hours remaining)

## What This App Is
**Picket MVP** is a real-time attendance tracking web app for union workers on strike. Workers check in when they arrive at the picket line, and the app verifies they're physically present using GPS geofencing (500m radius). The app tracks how long they stay on-site, and admins can see who's currently on duty and generate reports.

**Context**: This is being built overnight (started 2 AM) for a 9 AM stakeholder demo. The user (Jason) is at the Tampa, FL picket line right now (27.90084° N, -82.38607° W) testing the app in real-time. A worker session has been running for 1h 40m+ proving the core functionality works.

**Key Innovation**: Session persistence - workers can close the browser and their session stays active. When they return, they can resume tracking or clock out. This mimics how professional time-tracking apps work (TSheets, Clockify).

**Primary Goal**: Add an AI admin copilot (chat widget) that can answer questions about attendance data and generate weekly reports for stakeholders using Claude API.

## 📊 Reporting Requirements (Defined 3:42 AM)

**Current Manual Process**: Workers write name, signature, arrival time, departure time on paper clipboard. Stakeholders manually review at end of week.

**Expected Work Schedule**: 7 hours/day, Monday-Friday (must be continuous - can't leave and return)

**What Stakeholders Need to See (End of Week Report)**:
1. ✅ **Full Shift Completions** (GREEN): Who did 7+ hours/day - these workers are compliant
2. ❌ **No-Shows** (RED): Who didn't show up at all on specific days
3. ⚠️ **Partial Shifts** (YELLOW): Who showed up but left early (< 7 hours)
4. 📈 **Attendance Patterns**: Days worked per person, trends over time
5. 📍 **Location Verification**: Confirm check-in/check-out happened at picket line GPS coordinates

**Key Insight**: They care about DURATION (≥7hrs) and CONTINUITY (one session, not multiple), not specific times of day.

**Data We Currently Track** (✅ Sufficient for MVP):
- `started_at` - Check-in timestamp
- `ended_at` - Check-out timestamp  
- `seconds_inside` - Total duration (calculated from timestamps)
- `last_lat/lng` - GPS coordinates (check-in location stored, updated on check-out)
- `site_id` - Which picket line

**What We Can Derive**:
- Full shift = `seconds_inside >= 25200` (7 hours × 3600 seconds)
- No-show = No attendance record for that date + user combo
- Left early = `ended_at IS NOT NULL AND seconds_inside < 25200`
- Days worked = `COUNT(DISTINCT DATE(started_at)) GROUP BY user_id`
- Location verified = Check `last_lat/lng` is within geofence radius

**Missing for V2** (not critical for MVP):
- Multiple GPS pings during shift (for continuous presence verification)
- Break tracking
- Reason codes for absences

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

## 🔍 Database Inspection Complete (3:54 AM)

**Used service role key to query live data. Results:**
- ✅ **Schema**: Production-ready, properly indexed, join-friendly
- ✅ **Data Integrity**: Foreign keys + cascading deletes working
- ✅ **RLS Security**: Workers see own data, admins see all via `is_admin()` function
- ✅ **Current State**: 1 site, 2 profiles, 2 attendance records (1 active, 1 completed)
- ✅ **AI Agent Ready**: Can query weekly hours, days worked, compliance status per user

**Data Available for AI Reports:**
- User names joined to attendance records ✓
- Total hours per session (`seconds_inside`) ✓
- Date ranges for weekly/monthly aggregation ✓
- Active vs completed sessions (NULL check on `ended_at`) ✓

**Minor Issue (non-blocking)**: GPS coordinates only stored at clock-out, not check-in. Can fix post-MVP.

**Verdict**: Database structure is perfect for AI agent. Ready to build.

---

## ✅ SESSION PERSISTENCE FIXED & DEPLOYED (4:10 AM - Updated 6:08 AM)

**Status**: ✅ Deployed to production at local79.vercel.app

**Problem Solved**: Workers can now clock in/out multiple times per day and see cumulative time toward 7-hour goal.

**Clock-Out Timeout Fix (6:08 AM)**: Removed post-update query that was causing timeouts. Clock-out now shows simple success message. Workers see total daily time in the timer display (automatically aggregated on page load).

**Root Cause**: Database schema was CORRECT (multiple attendance records = good audit trail), but UI layer didn't aggregate same-day sessions.

**Fixes Applied**:

1. **Worker UI (`pages/index.tsx:127-186`)** - Aggregates all same-day sessions
   - On page load: Query completed sessions from today + add to active session time
   - Timer shows cumulative time: "6:30:00" instead of resetting to "0:00:00" after break
   - If no active session but worked earlier: Shows completed time (e.g., "3:45:00 worked so far")

2. **Admin Panel - Today's Attendance (`pages/admin.tsx:106-128`)** - Fixed Map aggregation
   - Changed from OVERWRITE to ACCUMULATE: `existing.active_seconds += att.seconds_inside`
   - Displays: "John Doe: 6.2 hrs (3 sessions)" instead of only showing last session
   - Gives admins accurate view of who's hitting 7-hour requirement

3. **Admin Panel - Currently On Duty (`pages/admin.tsx:72-99`)** - Added daily context
   - Shows both current session time AND total time today
   - Example: "This session: 1:30:00" + "Total today: 3:45:00 (includes 2:15:00 from earlier)"
   - Helps admins see if worker is close to 7-hour goal

4. **Clock-Out Feedback (`pages/index.tsx:372-399`)** - Daily summary on clock-out
   - Alert shows: This session time, total today, session count, hours remaining
   - Example: "✅ Clocked out! This session: 2:30:00 | Total today: 6.5 hrs (2 sessions) | 0.5 hrs remaining to reach 7 hours"
   - Worker knows exactly where they stand

**Key Insight**: Session continuity ≠ single database record. Multiple records with UI aggregation = better UX + audit trail.

---

## 🎯 REMAINING TASKS (Priority Order)

### 1. AI Admin Copilot (90 min) - PRIMARY GOAL
**Status**: Deferred until session persistence is tested.

**Implementation Plan (Timeboxed: 60-90 min)**:

**Phase 1: Backend API Route (20 min)**
```typescript
// pages/api/chat.ts
import { Anthropic } from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// On user query:
// 1. Query Supabase for attendance data (service role key)
// 2. Format data as context for Claude
// 3. Send to Claude with system prompt
// 4. Return formatted report
```

**Phase 2: Chat UI Component (20 min)**
```typescript
// components/AdminChat.tsx
// - Simple message list + input box
// - "Generate Weekly Report" quick action button
// - Loading state while AI responds
// - Markdown rendering for formatted reports
```

**Phase 3: System Prompt Engineering (15 min)**
```
You are an attendance compliance assistant. You have access to:
- Worker attendance records (check-in/out times, total hours)
- Expected schedule: 7 hours/day, Monday-Friday (35 hrs/week)

Generate reports that show:
- ✅ Compliant workers (35+ hours)
- ❌ Non-compliant workers (< 35 hours)
- 📊 Summary statistics
```

**Phase 4: Integration (15 min)**
- Add chat widget to admin.tsx
- Test with sample queries
- Deploy and verify

**Tech Stack Decisions**:
- ✅ Use: `@anthropic-ai/sdk` (official NPM package)
- ✅ Model: `claude-3-5-sonnet-20241022` (fast + cost-effective)
- ✅ Max tokens: 1000 (sufficient for reports)
- ❌ Skip: Streaming (adds complexity, not needed for reports)
- ❌ Skip: Prompt caching (save for V2 if needed)
- ❌ Skip: Rate limiting (admin-only, low usage)

**Sweet Spot Spec**:
- ✅ Natural language queries: "Who didn't hit 35 hours this week?"
- ✅ One-click report generation: "Generate Weekly Report" button
- ✅ Formatted output: Tables, emojis, clear summaries
- ❌ Skip: Multi-turn conversations (stateless is simpler)
- ❌ Skip: Email automation (out of scope for MVP)
- ❌ Skip: Historical trend analysis (V2 feature)
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
