/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { haversineMeters } from '../lib/geo'
import Link from 'next/link'

type Site = { id: string, name: string, center_lat: number, center_lng: number, radius_m: number }

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [status, setStatus] = useState<'idle'|'ready'|'in'|'paused'|'done'>('idle')
  const [pos, setPos] = useState<{lat:number,lng:number}|null>(null)
  const [distance, setDistance] = useState<number|null>(null)
  const [watchId, setWatchId] = useState<number|undefined>(undefined)
  const [attendanceId, setAttendanceId] = useState<string|null>(null)
  const [activeSeconds, setActiveSeconds] = useState(0)
  const tickRef = useRef<number|null>(null)
  const wakeLockRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [profileResolved, setProfileResolved] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [signUpData, setSignUpData] = useState({ fullName: '', phone: '', email: '' })
  const [activeSession, setActiveSession] = useState<any>(null)

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) setSession(session)
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    setProfile(null)
    setSites([])
    setSelectedSiteId('')
    setStatus('idle')
    setIsNewUser(false)
    setSignUpData({ fullName: '', phone: '', email: '' })
    setActiveSession(null)
    setAttendanceId(null)
    setActiveSeconds(0)

    if (!session) {
      setProfileResolved(true)
      return
    }

    setProfileResolved(false)

    const load = async () => {
      try {
        let { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        console.log('🔍 Loaded profile:', prof)

        if (!prof) {
          console.log('⚠️ Profile missing - creating fallback profile')
          const { error: insertError } = await supabase.from('profiles').insert({
            id: session.user.id,
            email: session.user.email,
            role: 'worker'
          })
          if (!insertError) {
            const { data: newProf } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
            prof = newProf ?? null
            console.log('✅ Created fallback profile:', prof)
          }
        }

        let workingProfile = prof ?? null

        const pending = typeof window !== 'undefined' ? localStorage.getItem('pendingProfile') : null
        if (pending && workingProfile && (!workingProfile.full_name || !workingProfile.phone)) {
          try {
            const { fullName, phone } = JSON.parse(pending)
            const { error: updateError } = await supabase.from('profiles').update({
              full_name: fullName,
              phone: phone
            }).eq('id', session.user.id)
            if (updateError) {
              console.error('Failed to update profile from pending data:', updateError)
              throw updateError
            }
            localStorage.removeItem('pendingProfile')
            const { data: refreshed } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
            workingProfile = refreshed ?? workingProfile
            console.log('✅ Updated profile from pending data:', workingProfile)
          } catch (parseErr) {
            console.error('Failed to apply pending profile data', parseErr)
          }
        }

        if (cancelled) return

        setProfile(workingProfile)

        if (workingProfile && (!workingProfile.full_name || !workingProfile.phone)) {
          setSignUpData({
            email: session.user.email || '',
            fullName: workingProfile.full_name || '',
            phone: workingProfile.phone || ''
          })
        } else {
          setSignUpData(prev => ({ ...prev, email: session.user.email || prev.email }))
        }

        const { data } = await supabase.from('sites').select('*').order('name')
        if (!cancelled) {
          setSites(data || [])
          if (workingProfile?.site_id) setSelectedSiteId(workingProfile.site_id)

          // Check for active session (PHASE 1: Session Detection)
          const { data: existingSession } = await supabase
            .from('attendances')
            .select('*, sites(name)')
            .eq('user_id', session.user.id)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (existingSession) {
            console.log('🔄 Active session found:', existingSession)
            setActiveSession(existingSession)
            setAttendanceId(existingSession.id)
            setSelectedSiteId(existingSession.site_id)

            // Calculate elapsed time from active session + any completed sessions today
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { data: todaySessions } = await supabase
              .from('attendances')
              .select('started_at, ended_at, seconds_inside')
              .eq('user_id', session.user.id)
              .gte('started_at', today.toISOString())
              .not('ended_at', 'is', null)

            // Sum up completed sessions today
            const completedSeconds = (todaySessions || []).reduce((sum, s) => sum + (s.seconds_inside || 0), 0)

            // Add current active session time
            const startTime = new Date(existingSession.started_at)
            const now = new Date()
            const currentSessionSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)

            const totalSeconds = completedSeconds + currentSessionSeconds
            setActiveSeconds(totalSeconds)
            console.log(`📊 Total time today: ${totalSeconds}s (${completedSeconds}s completed + ${currentSessionSeconds}s active)`)

            // Set status to indicate session exists but not actively tracking
            setStatus('paused')
          } else {
            // No active session, but check if they worked earlier today
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { data: todaySessions } = await supabase
              .from('attendances')
              .select('started_at, ended_at, seconds_inside, site_id')
              .eq('user_id', session.user.id)
              .gte('started_at', today.toISOString())
              .not('ended_at', 'is', null)

            if (todaySessions && todaySessions.length > 0) {
              // They have completed sessions today
              const totalSeconds = todaySessions.reduce((sum, s) => sum + (s.seconds_inside || 0), 0)
              setActiveSeconds(totalSeconds)
              setSelectedSiteId(todaySessions[0].site_id)
              console.log(`📊 Found ${todaySessions.length} completed session(s) today, total: ${totalSeconds}s`)
            }
            setStatus('ready')
          }
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to load profile', err)
      } finally {
        if (!cancelled) setProfileResolved(true)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [session])

  // watch location when timing
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    if (status === 'in' || status === 'paused') {
      const id = navigator.geolocation.watchPosition((p)=>{
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude }
        setPos(coords)
      }, (err)=>{ console.error(err) }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 })
      setWatchId(id as any)
      return () => navigator.geolocation.clearWatch(id as any)
    }
  }, [status])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    if (status !== 'in' && status !== 'paused' && watchId) {
      navigator.geolocation.clearWatch(watchId as any)
      setWatchId(undefined)
    }
  }, [status, watchId])

  // update distance + timer tick loop
  useEffect(() => {
    const site = sites.find(s=>s.id===selectedSiteId)
    if (!site || !pos) return
    const d = haversineMeters(pos.lat, pos.lng, site.center_lat, site.center_lng)
    setDistance(d)
    const inside = d <= site.radius_m
    if (status === 'in' && !inside) setStatus('paused')
    if (status === 'paused' && inside) setStatus('in')
  }, [pos, selectedSiteId, sites, status])

  useEffect(() => {
    if (status === 'in') {
      tickRef.current = window.setInterval(()=> setActiveSeconds(s=>s+1), 1000)
      return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
    } else {
      if (tickRef.current) window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [status])

  const site = useMemo(()=> sites.find(s=>s.id===selectedSiteId) || null, [sites, selectedSiteId])
  const inside = useMemo(()=> (site && distance!=null ? distance <= site.radius_m : false), [site, distance])

  async function signIn(email:string, fullName?: string, phone?: string) {
    setLoading(true)
    try {
      // If name and phone provided, this is sign-up flow
      if (fullName && phone) {
        // Check if already logged in (completing profile)
        if (session) {
          // Update existing profile
          await supabase.from('profiles').update({
            full_name: fullName,
            phone: phone
          }).eq('id', session.user.id)
          
          // Refresh profile
          const { data: updated } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
          setProfile(updated)
          setIsNewUser(false)
          return
        }
        
        // Send magic link for new user
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) throw error
        
        // Store name/phone to update profile after magic link click
        localStorage.setItem('pendingProfile', JSON.stringify({ fullName, phone }))
        alert('Check your email for the magic link.')
        setIsNewUser(false)
        return
      }

      // For MVP: Just send magic link (can't check profile due to RLS when not authenticated)
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      
      alert('Check your email for the magic link.')
    } catch (e: any) {
      alert(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckIn() {
    if (!site) return alert('Pick a site first.')
    setLoading(true)
    try {
      // Ensure location permission by reading once
      await new Promise<void>((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported.'))
        navigator.geolocation.getCurrentPosition((p)=>{
          setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
          resolve()
        }, (err)=> reject(err), { enableHighAccuracy: true, timeout: 10000 })
      })
      // create attendance row
      const { data, error } = await supabase.from('attendances').insert({
        user_id: session.user.id,
        site_id: site.id,
      }).select('id').single()
      if (error) throw error
      setAttendanceId(data.id)
      setActiveSeconds(0)

      // Request wake lock to keep screen on during shift
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
          console.log('✅ Wake lock active - screen will stay on')
        } else {
          console.warn('⚠️ Wake Lock API not supported - please disable auto-lock in settings')
        }
      } catch (wakeLockErr) {
        console.error('Failed to acquire wake lock:', wakeLockErr)
        // Continue anyway - wake lock is nice-to-have, not required
      }

      setStatus('in')
    } catch (e:any) {
      alert(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  function formatTime(s:number) {
    const h = Math.floor(s/3600).toString().padStart(2,'0')
    const m = Math.floor((s%3600)/60).toString().padStart(2,'0')
    const ss = Math.floor(s%60).toString().padStart(2,'0')
    return `${h}:${m}:${ss}`
  }

  async function handleClockOut() {
    if (!attendanceId) return
    setLoading(true)
    try {
      // Get current location
      const p = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      })
      const last = { lat: p.coords.latitude, lng: p.coords.longitude }

      // PHASE 4: Calculate ACTUAL elapsed time from database
      // Fetch the session start time to calculate true elapsed seconds
      const { data: currentAttendance } = await supabase
        .from('attendances')
        .select('started_at')
        .eq('id', attendanceId)
        .single()

      if (!currentAttendance) throw new Error('Session not found')

      const startTime = new Date(currentAttendance.started_at)
      const endTime = new Date()
      const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      // Update attendance with calculated time from database
      const { error } = await supabase.from('attendances').update({
        ended_at: endTime.toISOString(),
        seconds_inside: totalSeconds, // Use calculated time, not timer
        last_lat: last.lat,
        last_lng: last.lng,
      }).eq('id', attendanceId)
      if (error) throw error

      // Show simple success message
      const sessionHours = (totalSeconds / 3600).toFixed(1)
      alert(`✅ Clocked out successfully!\n\nThis session: ${formatTime(totalSeconds)} (${sessionHours} hrs)\n\nCheck the app to see your total time for today.`)

      // Release wake lock when clocking out
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
          console.log('✅ Wake lock released')
        } catch (wakeLockErr) {
          console.error('Failed to release wake lock:', wakeLockErr)
        }
      }

      // Clear session state
      setActiveSession(null)
      setAttendanceId(null)
      setActiveSeconds(0)
      setStatus('done')
    } catch (e:any) {
      alert(e.message || String(e))
      setLoading(false)
    }
  }

  const profileComplete = !!profile?.full_name && !!profile?.phone

  if (!session) {
    return (
      <div className="container">
        <div className="logo-header">
          <img src="/teamsters-logo.svg" alt="Teamsters Logo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <h1>Union Picket Check-In</h1>
          <p>Track your time on the line</p>
        </div>
        <div className="card main-card">
          {!isNewUser ? (
            <>
              <h2>Sign In</h2>
              <p style={{marginBottom: '24px', color: '#9ca3af'}}>Enter your email to get a magic link</p>
              <div className="form-group">
                <input 
                  type="email"
                  placeholder="your@email.com" 
                  value={signUpData.email}
                  onChange={(e)=> setSignUpData({...signUpData, email: e.target.value})} 
                />
              </div>
              <button
                style={{width: '100%'}}
                disabled={loading}
                onClick={()=> signUpData.email ? signIn(signUpData.email) : alert('Enter email')}
              >
                {loading ? 'Sending...' : 'Sign In'}
              </button>
              <button
                className="secondary"
                style={{width: '100%', marginTop: '12px'}}
                disabled={loading}
                onClick={()=> {
                  if (!signUpData.email) {
                    alert('Enter your email first')
                    return
                  }
                  setIsNewUser(true)
                }}
              >
                First time here? Create an account
              </button>
            </>
          ) : (
            <>
              <h2>Complete Sign Up</h2>
              <p style={{marginBottom: '24px', color: '#9ca3af'}}>First time? Tell us about yourself</p>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={signUpData.email}
                  onChange={(e)=> setSignUpData({...signUpData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text"
                  placeholder="John Doe" 
                  value={signUpData.fullName}
                  onChange={(e)=> setSignUpData({...signUpData, fullName: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel"
                  placeholder="(555) 123-4567" 
                  value={signUpData.phone}
                  onChange={(e)=> setSignUpData({...signUpData, phone: e.target.value})} 
                />
              </div>
              <div className="row" style={{gap: '12px'}}>
                <button 
                  className="secondary"
                  style={{flex: 1}}
                  onClick={()=> { setIsNewUser(false); setSignUpData({fullName: '', phone: '', email: ''}) }}
                >
                  Back
                </button>
                <button 
                  style={{flex: 1}}
                  disabled={loading || !signUpData.fullName || !signUpData.phone}
                  onClick={()=> signIn(signUpData.email, signUpData.fullName, signUpData.phone)}
                >
                  {loading ? 'Sending...' : 'Continue'}
                </button>
              </div>
            </>
          )}
        </div>
        <footer>Demo build — works in the foreground. For background tracking we&apos;ll ship native.</footer>
      </div>
    )
  }

  if (!profileResolved) {
    return (
      <div className="container">
        <div className="logo-header">
          <img src="/teamsters-logo.svg" alt="Teamsters Logo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <h1>Union Picket Check-In</h1>
        </div>
        <div className="card main-card">
          <p style={{textAlign: 'center', color: '#9ca3af'}}>Loading your profile…</p>
        </div>
      </div>
    )
  }

  if (session && profileResolved && !profile) {
    return (
      <div className="container">
        <div className="logo-header">
          <img src="/teamsters-logo.svg" alt="Teamsters Logo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <h1>Union Picket Check-In</h1>
        </div>
        <div className="card main-card">
          <p style={{textAlign: 'center', color: '#ef4444'}}>We couldn&apos;t load your profile. Please try signing out and back in.</p>
          <button className="secondary" style={{marginTop: '16px'}} onClick={()=> supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    )
  }

  // If logged in but profile incomplete, show completion form
  if (session && profileResolved && !profileComplete && profile) {
    return (
      <div className="container">
        <div className="logo-header">
          <img src="/teamsters-logo.svg" alt="Teamsters Logo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <h1>Union Picket Check-In</h1>
          <p>Track your time on the line</p>
        </div>
        <div className="card main-card">
          <h2>Complete Your Profile</h2>
          <p style={{marginBottom: '24px', color: '#9ca3af'}}>Please provide your information to continue</p>
          <div className="form-group" style={{marginTop: '16px'}}>
            <label>Full Name</label>
            <input 
              type="text"
              placeholder="John Doe" 
              value={signUpData.fullName}
              onChange={(e)=> setSignUpData({...signUpData, fullName: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="tel"
              placeholder="(555) 123-4567" 
              value={signUpData.phone}
              onChange={(e)=> setSignUpData({...signUpData, phone: e.target.value})} 
            />
          </div>
          <button 
            style={{width: '100%'}} 
            disabled={loading}
            onClick={async ()=> {
              if (!signUpData.fullName || !signUpData.phone) {
                alert('Please fill in all fields')
                return
              }
              setLoading(true)
              try {
                const { error: updateError } = await supabase.from('profiles').update({
                  full_name: signUpData.fullName,
                  phone: signUpData.phone
                }).eq('id', session.user.id)
                if (updateError) throw updateError

                // Refresh profile
                const { data: updated } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
                setProfile(updated)
                setSignUpData({ email: '', fullName: '', phone: '' })
              } catch (e: any) {
                alert(e.message || String(e))
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{justifyContent: 'flex-start', paddingTop: '40px'}}>
      <div className="logo-header">
        <img src="/teamsters-logo.svg" alt="Teamsters Logo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      </div>
      
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap'}}>
          <div style={{flex: 1, minWidth: '200px'}}>
            <strong>{profile?.full_name || session.user.email}</strong>
            {profile?.role === 'admin' && <span className="badge" style={{marginLeft: '8px'}}>ADMIN</span>}
          </div>
          <div className="row" style={{gap: '8px'}}>
            {profile?.role === 'admin' && <Link href="/admin"><button className="secondary">Admin</button></Link>}
            <button className="secondary" onClick={()=> supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Select Site</h3>
        <select value={selectedSiteId} onChange={(e)=> setSelectedSiteId(e.target.value)}>
          <option value="">-- Select a picket site --</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name} (r={s.radius_m}m)</option>)}
        </select>
      </div>

      <div className="card main-card">
        <h2 style={{marginBottom: '20px'}}>Picket Time Tracker</h2>

        {/* PHASE 2: Resume Session UI */}
        {activeSession && status === 'paused' && (
          <div style={{
            padding: '16px',
            background: 'rgba(255, 184, 28, 0.1)',
            border: '2px solid #FFB81C',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#FFB81C'}}>
              🕒 Active Session Found
            </div>
            <div style={{fontSize: '14px', color: '#9ca3af', marginBottom: '12px'}}>
              You checked in at {new Date(activeSession.started_at).toLocaleTimeString()}
              {activeSession.sites?.name && ` at ${activeSession.sites.name}`}
            </div>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: 'var(--teamster-gold)', fontFamily: 'monospace', textAlign: 'center', marginBottom: '12px'}}>
              {formatTime(activeSeconds)}
            </div>
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                style={{flex: 1}}
                disabled={loading}
                onClick={async ()=> {
                  console.log('🔵 Resume Tracking clicked')
                  setLoading(true)
                  try {
                    // PHASE 3: Resume Tracking logic
                    console.log('📍 Requesting location permission...')
                    // Start location watch
                    await new Promise<void>((resolve, reject) => {
                      if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported.'))
                      navigator.geolocation.getCurrentPosition((p)=>{
                        console.log('✅ Location acquired:', p.coords.latitude, p.coords.longitude)
                        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
                        resolve()
                      }, (err)=> {
                        console.error('❌ Location error:', err)
                        reject(err)
                      }, { enableHighAccuracy: true, timeout: 10000 })
                    })

                    // Re-acquire wake lock
                    try {
                      if ('wakeLock' in navigator) {
                        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
                        console.log('✅ Wake lock reacquired')
                      }
                    } catch (wakeLockErr) {
                      console.error('Failed to reacquire wake lock:', wakeLockErr)
                    }

                    console.log('✅ Setting status to IN')
                    setStatus('in')
                    console.log('✅ Resume complete!')
                  } catch (e: any) {
                    console.error('❌ Resume failed:', e)
                    alert('Failed to resume tracking: ' + (e.message || String(e)))
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {loading ? 'Starting...' : 'Resume Tracking'}
              </button>
              <button
                className="secondary"
                style={{flex: 1}}
                disabled={loading}
                onClick={handleClockOut}
              >
                Clock Out
              </button>
            </div>
          </div>
        )}

        {attendanceId && status === 'in' && (
          <div style={{
            padding: '12px 16px',
            background: '#FFB81C',
            color: '#000',
            borderRadius: '8px',
            marginBottom: '16px',
            fontWeight: '500',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            📍 Location tracking active
            <div style={{fontSize: '12px', marginTop: '4px', fontWeight: '400'}}>
              Session will persist if you close this app. You can return anytime to clock out.
            </div>
          </div>
        )}
        
        <div className="status" style={{marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
          <div className={'dot ' + (inside ? 'ok' : '')} />
          <div>
            <strong>{inside ? 'Inside' : 'Outside'}</strong> geofence
            {distance!=null && site && <span style={{color: '#9ca3af', marginLeft: '8px'}}>~{distance.toFixed(0)}m from center</span>}
          </div>
        </div>
        <div style={{textAlign: 'center', margin: '24px 0'}}>
          <div style={{fontSize: '48px', fontWeight: 'bold', color: 'var(--teamster-gold)', fontFamily: 'monospace'}}>
            {formatTime(activeSeconds)}
          </div>
          <p className="small" style={{marginTop: '8px'}}>Timer runs only when you&apos;re inside the radius and this page is open.</p>
        </div>
        <div className="row" style={{gap: '12px'}}>
          <button 
            style={{flex: 1}} 
            disabled={!selectedSiteId || status==='in' || loading} 
            onClick={handleCheckIn}
          >
            {loading ? 'Starting...' : 'Check In'}
          </button>
          <button 
            style={{flex: 1}}
            className="secondary"
            disabled={status!=='in' && status!=='paused'} 
            onClick={handleClockOut}
          >
            Clock Out
          </button>
        </div>
      </div>
    </div>
  )
}
