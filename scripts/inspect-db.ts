// Quick script to inspect database structure and data
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS and see all data
const supabase = createClient(
  'https://vjiaepyxiibkllhyjert.supabase.co',
  'sb_secret_Lj-6YwCkZHzNn56s9YgsCQ_7Aa10-iT'
)

async function inspectDatabase() {
  console.log('🔍 INSPECTING DATABASE\n')

  // Query all tables
  console.log('📊 SITES:')
  const { data: sites } = await supabase.from('sites').select('*')
  console.table(sites)

  console.log('\n👥 PROFILES:')
  const { data: profiles } = await supabase.from('profiles').select('*')
  console.table(profiles)

  console.log('\n⏰ ATTENDANCES:')
  const { data: attendances } = await supabase.from('attendances').select('*')
  console.table(attendances)

  // Count records
  console.log('\n📈 RECORD COUNTS:')
  console.log(`Sites: ${sites?.length || 0}`)
  console.log(`Profiles: ${profiles?.length || 0}`)
  console.log(`Attendances: ${attendances?.length || 0}`)

  // Active sessions
  const activeSessions = attendances?.filter(a => a.ended_at === null) || []
  console.log(`Active Sessions: ${activeSessions.length}`)

  // Completed sessions
  const completedSessions = attendances?.filter(a => a.ended_at !== null) || []
  console.log(`Completed Sessions: ${completedSessions.length}`)

  // Show full attendances with joins
  console.log('\n📋 ATTENDANCES WITH USER NAMES:')
  const { data: fullData } = await supabase
    .from('attendances')
    .select('*, profiles(full_name, email, phone)')
    .order('started_at', { ascending: false })
  
  console.table(fullData?.map(a => ({
    name: a.profiles?.full_name || a.profiles?.email,
    phone: a.profiles?.phone,
    started: new Date(a.started_at).toLocaleString(),
    ended: a.ended_at ? new Date(a.ended_at).toLocaleString() : 'ACTIVE',
    hours: (a.seconds_inside / 3600).toFixed(2)
  })))
}

inspectDatabase().catch(console.error)
