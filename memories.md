# Picket MVP - Session Memory
**Last Updated**: 2025-10-01 3:28 AM | **Demo Deadline**: 9:00 AM (5.5 hours remaining)

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

## Auth Flow
1. User enters email → Magic link sent
2. New users: provide name + phone (stored in localStorage)
3. Click magic link → Profile created via trigger
4. App reads localStorage → Updates profile with name/phone
5. Returning users: Skip signup, go straight to app

## Deployment
- **Auto-deploy**: `git push` → Vercel builds + deploys to `local79.vercel.app`
- **Manual deploy**: `vercel --prod` (faster, bypasses GitHub)
