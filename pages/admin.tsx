import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

type Site = { id: string, name: string, center_lat: number, center_lng: number, radius_m: number }
type Profile = { id: string, email?: string, full_name?: string, phone?: string, role: 'worker'|'admin', site_id?: string }

export default function Admin() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [site, setSite] = useState<Site|null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [present, setPresent] = useState<Profile[]>([])
  const [absent, setAbsent] = useState<Profile[]>([])
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

  async function refresh() {
    if (!site) return
    setLoading(true)
    try {
      // local midnight to 23:59:59
      const start = new Date(); start.setHours(0,0,0,0)
      const end = new Date(); end.setHours(23,59,59,999)
      const { data: workers } = await supabase.from('profiles').select('id, full_name, phone, email, role').eq('role', 'worker').eq('site_id', site.id)
      const { data: atts } = await supabase
        .from('attendances')
        .select('id, user_id')
        .eq('site_id', site.id)
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())

      const ids = new Set((atts||[]).map(a=>a.user_id))
      setPresent((workers||[]).filter(w => ids.has(w.id)) as any)
      setAbsent((workers||[]).filter(w => !ids.has(w.id)) as any)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ if (site && canView) refresh() }, [site, canView])

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

      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Today’s attendance</h3>
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
