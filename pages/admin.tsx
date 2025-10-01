import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

type Site = { id: string, name: string, center_lat: number, center_lng: number, radius_m: number }
type Profile = { id: string, email?: string, full_name?: string, phone?: string, role: 'worker'|'admin', site_id?: string, attendance?: {started_at: string, active_seconds: number} }

export default function Admin() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [site, setSite] = useState<Site|null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [present, setPresent] = useState<Profile[]>([])
  const [absent, setAbsent] = useState<Profile[]>([])
  const [onDuty, setOnDuty] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    }
    init()
  }, [])

  useEffect(() => { (async () => {
    if (!session) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    setProfile(prof)
    const { data: s } = await supabase.from('sites').select('*').order('name')
    setSites(s || [])
    if (prof?.site_id) {
      const found = (s || []).find(x => x.id === prof.site_id)
      if (found) setSite(found)
    }
  })() }, [session])

  const canView = profile?.role === 'admin'

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  }

  const refresh = useCallback(async () => {
    if (!site) return
    setLoading(true)
    try {
      // Query for currently clocked in workers (ended_at IS NULL)
      const { data: activeAttendances } = await supabase
        .from('attendances')
        .select('*, profiles(full_name, phone, email)')
        .eq('site_id', site.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })

      // Calculate elapsed time for each active session
      const onDutyWorkers = (activeAttendances || []).map(att => {
        const startTime = new Date(att.started_at)
        const now = new Date()
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
        return {
          ...att,
          elapsed: elapsedSeconds
        }
      })
      setOnDuty(onDutyWorkers)

      // TODAY'S ATTENDANCE - Get all completed shifts today at this site
      const start = new Date(); start.setHours(0,0,0,0)
      const end = new Date(); end.setHours(23,59,59,999)
      
      // Get all attendances for today at this site with profile info
      const { data: todayAtts } = await supabase
        .from('attendances')
        .select('*, profiles(id, full_name, phone, email)')
        .eq('site_id', site.id)
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())
        .not('ended_at', 'is', null) // Only completed shifts

      // Group by user_id (in case someone checked in multiple times today)
      const userMap = new Map()
      ;(todayAtts || []).forEach(att => {
        const userId = att.user_id
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            full_name: att.profiles?.full_name,
            phone: att.profiles?.phone,
            email: att.profiles?.email,
            attendance: {
              started_at: att.started_at,
              active_seconds: att.seconds_inside
            }
          })
        }
      })

      const presentWorkers = Array.from(userMap.values())
      setPresent(presentWorkers as any)
      setAbsent([]) // For MVP, we don't track "expected" workers
    } finally {
      setLoading(false)
    }
  }, [site])

  useEffect(()=>{ if (site && canView) refresh() }, [site, canView, refresh])

  if (!session) return (
    <div className="container"><div className="card"><p>Please <Link href="/">sign in</Link>.</p></div></div>
  )

  if (!canView) return (
    <div className="container"><div className="card"><p>Admins only. Ask an admin to set your role.</p></div></div>
  )

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div><strong>Admin:</strong> {session.user.email}</div>
          <div className="row">
            <Link href="/"><button>Worker</button></Link>
            <button onClick={()=> supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Site</h3>
        <select value={site?.id || ''} onChange={(e)=> setSite(sites.find(x=>x.id === e.target.value) || null)}>
          <option value="">-- Select a site --</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {onDuty.length > 0 && (
        <div className="card">
          <h3>Currently On Duty ({onDuty.length})</h3>
          <table><tbody>
            {onDuty.map(worker => (
              <tr key={worker.id}>
                <td>
                  <div><strong>{worker.profiles?.full_name || worker.profiles?.email || 'Unknown'}</strong></div>
                  {worker.profiles?.phone && <div style={{fontSize: '13px', color: '#9ca3af'}}>{worker.profiles.phone}</div>}
                  <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                    Checked in: {new Date(worker.started_at).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}
                    {' • '}
                    Elapsed: {formatTime(worker.elapsed)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}

      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Today&apos;s attendance</h3>
          <button onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        <div className="row">
          <div className="card" style={{flex:1}}>
            <h4>Present ({present.length})</h4>
            <table><tbody>
              {present.map(p => (
                <tr key={p.id}>
                  <td>
                    <div><strong>{p.full_name || p.email || p.id}</strong></div>
                    {p.phone && <div style={{fontSize: '13px', color: '#9ca3af'}}>{p.phone}</div>}
                    {p.attendance && (
                      <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                        Checked in: {new Date(p.attendance.started_at).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}
                        {' • '}
                        {(p.attendance.active_seconds / 3600).toFixed(1)} hrs
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="card" style={{flex:1}}>
            <h4>Absent ({absent.length})</h4>
            <table><tbody>
              {absent.map(p => (
                <tr key={p.id}>
                  <td>
                    <div><strong>{p.full_name || p.email || p.id}</strong></div>
                    {p.phone && <div style={{fontSize: '13px', color: '#9ca3af'}}>{p.phone}</div>}
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  )
}
