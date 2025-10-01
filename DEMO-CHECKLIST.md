# Demo Checklist for Tomorrow Morning

## Pre-Demo Setup (Do Tonight)
- [ ] **Test on your phone** - Go to https://local79.vercel.app on mobile browser
- [ ] **Real geofence test** - Check in → Drive 200m away → Verify timer pauses
- [ ] **Create Jeff & Brandon accounts**:
  1. Go to Supabase → Table Editor → profiles
  2. After they sign up, change their `role` to `'admin'`
  
## Demo Flow (Show Jeff & Brandon)

### Worker Flow (5 min)
1. **Sign up**: https://local79.vercel.app
   - Enter email
   - Fill name + phone
   - Click magic link from email
   - ✅ Logged in!

2. **Check in**:
   - Select "Main Picket Line" (or your test site)
   - Click "Check In"
   - Allow location permission
   - ✅ Should show "Inside geofence" (green dot)
   - ✅ Timer starts counting

3. **Show warning**: 
   - Point out gold "Keep this tab open" banner
   - Explain: Web apps can't track in background (need native app for that)

4. **Test geofence**:
   - Walk/drive 200m away
   - ✅ Should show "Outside geofence" (red dot)
   - ✅ Timer pauses

### Admin Flow (3 min)
1. **Show admin dashboard**: https://local79.vercel.app/admin
   - Click "Admin" button (top right)
   - ✅ See present/absent workers
   - ✅ See check-in times
   - ✅ See hours worked

2. **Explain features**:
   - Real-time attendance tracking
   - No manual time cards
   - Automatic geofence verification

## Common Issues & Solutions

### "Magic link not working"
- **Check**: Supabase Auth Site URL = `https://local79.vercel.app`
- **Check**: User clicked latest email (old links expire)

### "Can't see Admin button"
- **Check**: User's role = `'admin'` in Supabase profiles table

### "Timer not starting"
- **Check**: Location permission granted
- **Check**: User clicked "Check In" button
- **Check**: Inside geofence (green dot showing)

### "Outside geofence" even though at location
- **Check**: Site coordinates in Supabase match actual location
- **Adjust**: Increase `radius_m` in sites table (currently 150m)

## Key Talking Points

### ✅ What Works (MVP)
- Magic link auth (no passwords!)
- Geofence-based attendance
- Real-time timer tracking
- Admin dashboard with hours
- Works on any device (phone/tablet/laptop)

### 🚧 Known Limitations (V2)
- **Must keep tab open** (no background tracking)
  - *Solution*: Native app (React Native)
- **Timer resets if tab closes**
  - *Solution*: Server-side timer calculation
- **No offline support**
  - *Solution*: Service worker + queue

## After Demo - Immediate Next Steps
1. Collect feedback from Jeff & Brandon
2. Document any bugs/issues
3. Discuss timeline for V2 (native app)
4. Get real picket line addresses for production sites

---

## Emergency Contact
- **Production URL**: https://local79.vercel.app
- **Supabase Dashboard**: https://supabase.com/dashboard/project/vjiaepyxiibkllhyjert
- **GitHub Repo**: https://github.com/ASTXRTYS/picket-mvp
- **Vercel Dashboard**: https://vercel.com/jason-madrugas-projects/local79
