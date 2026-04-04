import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'

interface Field {
  id: number
  name: string
  sport: string | null
  price_day: number
  price_night: number | null
  night_from_hour: number
  slot_duration: number
}

interface Challenge {
  id: string
  complex_id: number
  field_id: number
  team_a_name: string
  team_a_captain: string | null
  team_a_phone: string | null
  team_a_cedula: string | null
  sport: string
  date: string
  hour: string
  court_price: number
  deposit_amount: number
  sinpe_number: string
  payment_deadline: string | null
  status: string
  notes: string | null
  created_at: string
  field_name?: string
}

interface ChallengeResponse {
  id: string
  challenge_id: string
  team_name: string
  captain_name: string
  captain_phone: string
  captain_email: string | null
  captain_cedula: string | null
  sinpe_reference: string | null
  payment_amount: number | null
  status: string
  responded_at: string
  payment_sent_at: string | null
  validated_at: string | null
  validation_notes: string | null
}

interface ComplexConfig {
  id: number
  whatsapp: string | null
  sinpe_number: string | null
  default_deposit: number
  challenge_deadline_hours: number
}

type TabId = 'open' | 'active' | 'history'

const SPORT_LABELS: Record<string, { label: string; emoji: string }> = {
  futbol5: { label: 'Futbol 5', emoji: '⚽' },
  futbol7: { label: 'Futbol 7', emoji: '⚽' },
  futbol8: { label: 'Futbol 8', emoji: '⚽' },
  futbol11: { label: 'Futbol 11', emoji: '⚽' },
  padel: { label: 'Padel', emoji: '🎾' },
  tenis: { label: 'Tenis', emoji: '🎾' },
  basquet: { label: 'Basquet', emoji: '🏀' },
  otro: { label: 'Otro', emoji: '🏟' },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Buscando rival', color: '#2563eb', bg: '#eff6ff' },
  challenged: { label: 'Rival encontrado', color: '#d97706', bg: '#fffbeb' },
  pending_pay: { label: 'Pago pendiente', color: '#d97706', bg: '#fffbeb' },
  confirmed: { label: 'Confirmado', color: '#16a34a', bg: '#f0fdf4' },
  expired: { label: 'Expirado', color: '#6b7280', bg: '#f1f5f9' },
  cancelled: { label: 'Cancelado', color: '#dc2626', bg: '#fef2f2' },
  completed: { label: 'Jugado', color: '#7c3aed', bg: '#f5f3ff' },
}

const RESP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  joined: { label: 'Esperando pago', color: '#d97706', bg: '#fffbeb' },
  payment_sent: { label: 'Pago enviado', color: '#2563eb', bg: '#eff6ff' },
  payment_ok: { label: 'Pago validado', color: '#16a34a', bg: '#f0fdf4' },
  rejected: { label: 'Rechazado', color: '#dc2626', bg: '#fef2f2' },
  no_payment: { label: 'No pago', color: '#6b7280', bg: '#f1f5f9' },
  cancelled: { label: 'Se retiro', color: '#6b7280', bg: '#f1f5f9' },
}

const ALL_HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

const fmtCRC = (v: number) => String.fromCharCode(8353) + Math.round(v).toLocaleString('es-CR')

function fmtDate(d: string) {
  const parts = d.split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '--'
  return new Date(d).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function AdminChallenges() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fields, setFields] = useState<Field[]>([])
  const [complexConfig, setComplexConfig] = useState<ComplexConfig | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [responses, setResponses] = useState<Record<string, ChallengeResponse[]>>({})

  const [tab, setTab] = useState<TabId>('open')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [acting, setActing] = useState(false)

  const [cFieldId, setCFieldId] = useState<number | null>(null)
  const [cDate, setCDate] = useState('')
  const [cHour, setCHour] = useState('')
  const [cTeamA, setCTeamA] = useState('')
  const [cCaptain, setCCaptain] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cCedula, setCCedula] = useState('')
  const [cDeposit, setCDeposit] = useState(2000)
  const [cSport, setCSport] = useState('futbol5')
  const [cNotes, setCNotes] = useState('')
  const [cSaving, setCSaving] = useState(false)
  const [cError, setCError] = useState('')

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
      else setUserId(data.session.user.id)
    })
  }, [router])

  useEffect(() => {
    if (!userId) return
    const run = async () => {
      const { data: f } = await supabase
        .from('fields')
        .select('id, name, sport, price_day, price_night, night_from_hour, slot_duration')
        .eq('owner_id', userId)
        .eq('active', true)
        .order('name')
      setFields(f ?? [])
      const { data: cx } = await supabase
        .from('complexes')
        .select('id, whatsapp, sinpe_number, default_deposit, challenge_deadline_hours')
        .eq('owner_id', userId)
        .single()
      if (cx) {
        setComplexConfig(cx)
        setCDeposit(cx.default_deposit ?? 2000)
      }
    }
    run()
  }, [userId])

  const loadChallenges = useCallback(async () => {
    if (!complexConfig) return
    setLoading(true)
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('complex_id', complexConfig.id)
      .order('date', { ascending: false })
      .order('hour', { ascending: false })

    if (data) {
      const fieldsMap = new Map(fields.map(f => [f.id, f.name]))
      const enriched = data.map((c: any) => ({ ...c, field_name: fieldsMap.get(c.field_id) || 'Cancha' }))
      setChallenges(enriched)
      const activeIds = data.filter((c: any) => ['challenged', 'pending_pay', 'confirmed'].includes(c.status)).map((c: any) => c.id)
      if (activeIds.length > 0) {
        const { data: resps } = await supabase
          .from('challenge_responses')
          .select('*')
          .in('challenge_id', activeIds)
          .order('responded_at', { ascending: false })
        const map: Record<string, ChallengeResponse[]> = {}
        resps?.forEach((r: any) => {
          if (!map[r.challenge_id]) map[r.challenge_id] = []
          map[r.challenge_id].push(r)
        })
        setResponses(map)
      }
    }
    setLoading(false)
  }, [complexConfig, fields])

  useEffect(() => {
    if (complexConfig && fields.length) loadChallenges()
  }, [complexConfig, fields, loadChallenges])

  const filtered = useMemo(() => {
    if (tab === 'open') return challenges.filter(c => c.status === 'open')
    if (tab === 'active') return challenges.filter(c => ['challenged', 'pending_pay', 'confirmed'].includes(c.status))
    return challenges.filter(c => ['expired', 'cancelled', 'completed'].includes(c.status))
  }, [challenges, tab])

  const counts = useMemo(() => ({
    open: challenges.filter(c => c.status === 'open').length,
    active: challenges.filter(c => ['challenged', 'pending_pay', 'confirmed'].includes(c.status)).length,
    history: challenges.filter(c => ['expired', 'cancelled', 'completed'].includes(c.status)).length,
  }), [challenges])

  const handleCreate = async () => {
    setCError('')
    if (!cFieldId || !cDate || !cHour || !cTeamA.trim()) {
      setCError('Completa cancha, fecha, hora y nombre del equipo')
      return
    }
    if (!cCedula.trim() || cCedula.length < 9) {
      setCError('La cedula del capitan debe tener al menos 9 digitos')
      return
    }
    if (!complexConfig) return
    const selectedField = fields.find(f => f.id === cFieldId)
    const sinpe = complexConfig.sinpe_number || complexConfig.whatsapp || ''
    if (!sinpe) {
      setCError('Configura tu numero de SINPE/WhatsApp en el perfil del complejo primero')
      return
    }
    const hourNum = Number(cHour.split(':')[0])
    const nightFrom = selectedField?.night_from_hour ?? 18
    const courtPrice = hourNum >= nightFrom
      ? Number(selectedField?.price_night ?? selectedField?.price_day ?? 0)
      : Number(selectedField?.price_day ?? 0)
    const deadlineHours = complexConfig.challenge_deadline_hours ?? 4
    const parts = cDate.split('-').map(Number)
    const matchTime = new Date(parts[0], parts[1] - 1, parts[2], hourNum)
    const deadline = new Date(matchTime.getTime() - deadlineHours * 60 * 60 * 1000)

    setCSaving(true)
    const { error } = await supabase.from('challenges').insert({
      complex_id: complexConfig.id,
      field_id: cFieldId,
      team_a_name: cTeamA.trim(),
      team_a_captain: cCaptain.trim() || null,
      team_a_phone: cPhone.trim() || null,
      team_a_cedula: cCedula.trim() || null,
      sport: selectedField?.sport || cSport,
      date: cDate,
      hour: cHour,
      court_price: courtPrice,
      deposit_amount: cDeposit,
      sinpe_number: sinpe,
      payment_deadline: deadline.toISOString(),
      expires_at: matchTime.toISOString(),
      status: 'open',
      notes: cNotes.trim() || null,
      created_by: userId,
    })
    setCSaving(false)
    if (error) { setCError(error.message); return }
    showToast('Reto publicado')
    setShowCreate(false)
    setCTeamA(''); setCCaptain(''); setCPhone(''); setCCedula(''); setCNotes(''); setCDate(''); setCHour('')
    loadChallenges()
  }

  const validatePayment = async (challengeId: string, responseId: string) => {
    setActing(true)
    await supabase.from('challenge_responses').update({ status: 'payment_ok', validated_at: new Date().toISOString(), validated_by: userId }).eq('id', responseId)
    await supabase.from('challenges').update({ status: 'confirmed' }).eq('id', challengeId)
    showToast('Pago validado - Partido confirmado!')
    setActing(false)
    loadChallenges()
  }

  const rejectPayment = async (responseId: string, challengeId: string) => {
    setActing(true)
    await supabase.from('challenge_responses').update({ status: 'rejected', validation_notes: 'Referencia SINPE no valida' }).eq('id', responseId)
    await supabase.from('challenges').update({ status: 'open' }).eq('id', challengeId)
    showToast('Pago rechazado - reto vuelve a estar abierto')
    setActing(false)
    loadChallenges()
  }

  const cancelChallenge = async (id: string) => {
    if (!confirm('Cancelar este reto?')) return
    setActing(true)
    await supabase.from('challenges').update({ status: 'cancelled' }).eq('id', id)
    showToast('Reto cancelado')
    setActing(false)
    loadChallenges()
  }

  const markCompleted = async (id: string) => {
    setActing(true)
    await supabase.from('challenges').update({ status: 'completed' }).eq('id', id)
    showToast('Partido marcado como jugado')
    setActing(false)
    loadChallenges()
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px', fontFamily: "'DM Sans', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 14, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 },
    sub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    headerRight: { display: 'flex', gap: 8 },
    tabs: { display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 20 },
    list: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
    card: { background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, overflow: 'hidden' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 12 },
    cardLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    cardSport: { fontSize: 28, flexShrink: 0 },
    cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a' },
    cardVs: { color: '#94a3b8', fontWeight: 400, fontStyle: 'italic' as const, margin: '0 4px' },
    cardMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    cardRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
    cardArrow: { fontSize: 10, color: '#94a3b8' },
    cardBody: { padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' },
    detailGrid: { display: 'flex', flexDirection: 'column' as const, gap: 0, marginTop: 16 },
    detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' },
    detailLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
    detailValue: { fontSize: 13, color: '#0f172a', fontWeight: 500 },
    cardActions: { display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' },
    badge: { fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999 },
    respSection: { marginTop: 16 },
    respTitle: { fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' },
    resp: { background: '#f8fafc', border: '1px solid #eaecf0', borderRadius: 12, padding: '14px 16px', marginBottom: 8 },
    respHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
    respTeam: { fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'block' as const },
    respCaptain: { fontSize: 12, color: '#64748b', display: 'block' as const, marginTop: 2 },
    respEmail: { fontSize: 11, color: '#94a3b8', display: 'block' as const },
    respSinpe: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, color: '#1e40af', flexWrap: 'wrap' as const },
    respActions: { display: 'flex', gap: 8, marginTop: 10 },
    respValidated: { fontSize: 12, color: '#16a34a', fontWeight: 600, margin: '8px 0 0' },
    noResp: { padding: 24, textAlign: 'center' as const, color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 12, marginTop: 16 },
    empty: { textAlign: 'center' as const, padding: '64px 24px', background: '#fff', borderRadius: 16, border: '1px solid #eaecf0', color: '#64748b' },
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 },
    modal: { background: '#fff', borderRadius: 22, width: '100%', maxWidth: 540, boxShadow: '0 24px 80px rgba(0,0,0,.2)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' as const },
    modalHeader: { padding: '24px 24px 20px', background: 'linear-gradient(160deg,#052e16 0%,#0B4D2C 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    modalLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' as const, margin: '0 0 4px' },
    modalTitle: { fontSize: 20, fontWeight: 800, margin: 0, color: '#fff' },
    modalClose: { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalBody: { padding: '20px 24px 24px', overflowY: 'auto' as const, flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 14 },
    modalActions: { display: 'flex', gap: 10, marginTop: 8 },
    formField: { display: 'flex', flexDirection: 'column' as const, gap: 5 },
    formLabel: { fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 },
    hint: { fontSize: 11, color: '#94a3b8', margin: 0 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', color: '#0f172a', outline: 'none', boxSizing: 'border-box' as const, background: '#fff' },
    error: { padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#b91c1c', fontWeight: 600 },
    fieldCards: { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
    toastStyle: { position: 'fixed' as const, bottom: 28, right: 28, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.18)' },
  }

  const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: 'none' }
  const btnPrimary: React.CSSProperties = { ...btnBase, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', boxShadow: '0 2px 12px rgba(22,163,74,.25)' }
  const btnGhost: React.CSSProperties = { ...btnBase, background: '#f1f5f9', color: '#374151' }
  const btnSuccess: React.CSSProperties = { ...btnBase, background: '#16a34a', color: '#fff', padding: '7px 14px', fontSize: 12 }
  const btnDanger: React.CSSProperties = { ...btnBase, background: '#ef4444', color: '#fff', padding: '7px 14px', fontSize: 12 }
  const btnSm: React.CSSProperties = { padding: '7px 14px', fontSize: 12, borderRadius: 8 }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit', border: '1.5px solid transparent',
    background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#64748b', cursor: 'pointer',
  })

  const tabCount = (active: boolean): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
    background: active ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.07)',
  })

  const fieldCardStyle = (sel: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
    border: sel ? '1.5px solid #16a34a' : '1.5px solid #e2e8f0',
    background: sel ? '#16a34a' : '#fff', color: sel ? '#fff' : '#374151',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
  })

  return (
    <AdminLayout>
      {toast && (
        <div style={{ ...S.toastStyle, background: toast.ok ? '#0f172a' : '#ef4444', color: '#fff' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div style={S.page}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Retos</h1>
            <p style={S.sub}>{loading ? 'Cargando...' : challenges.length + ' reto' + (challenges.length !== 1 ? 's' : '') + ' en total'}</p>
          </div>
          <div style={S.headerRight}>
            <button style={btnGhost} onClick={loadChallenges}>Actualizar</button>
            <button style={btnPrimary} onClick={() => setShowCreate(true)}>+ Crear reto</button>
          </div>
        </div>

        <div style={S.tabs}>
          {([
            { id: 'open' as TabId, label: 'Abiertos', icon: '📢' },
            { id: 'active' as TabId, label: 'En proceso', icon: '⚡' },
            { id: 'history' as TabId, label: 'Historial', icon: '📋' },
          ]).map(t => (
            <button key={t.id} style={tabStyle(tab === t.id)} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span> {t.label}
              <span style={tabCount(tab === t.id)}>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={S.empty}>Cargando retos...</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⚔</span>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {tab === 'open' ? 'Sin retos abiertos' : tab === 'active' ? 'Sin retos activos' : 'Sin historial'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              {tab === 'open' ? 'Crea un reto para que equipos rivales lo vean.' : ''}
            </p>
            {tab === 'open' && (
              <button style={{ ...btnPrimary, marginTop: 16 }} onClick={() => setShowCreate(true)}>+ Crear primer reto</button>
            )}
          </div>
        ) : (
          <div style={S.list}>
            {filtered.map(ch => {
              const st = STATUS_CFG[ch.status] || STATUS_CFG.open
              const sp = SPORT_LABELS[ch.sport] || SPORT_LABELS.otro
              const isExpanded = expandedChallenge === ch.id
              const resps = responses[ch.id] || []
              const activeResp = resps.find(r => ['joined', 'payment_sent', 'payment_ok'].includes(r.status))

              return (
                <div key={ch.id} style={S.card}>
                  <div style={S.cardHeader} onClick={() => setExpandedChallenge(isExpanded ? null : ch.id)}>
                    <div style={S.cardLeft}>
                      <span style={S.cardSport}>{sp.emoji}</span>
                      <div>
                        <div style={S.cardTitle}>
                          {ch.team_a_name}
                          <span style={S.cardVs}> vs </span>
                          {activeResp?.team_name || '?'}
                        </div>
                        <div style={S.cardMeta}>
                          {ch.field_name} - {fmtDate(ch.date)} - {ch.hour} - {fmtCRC(ch.court_price)}
                        </div>
                      </div>
                    </div>
                    <div style={S.cardRight}>
                      <span style={{ ...S.badge, color: st.color, background: st.bg }}>{st.label}</span>
                      <span style={S.cardArrow}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={S.cardBody}>
                      <div style={S.detailGrid}>
                        <div style={S.detailRow}><span style={S.detailLabel}>Deporte</span><span style={S.detailValue}>{sp.emoji} {sp.label}</span></div>
                        <div style={S.detailRow}><span style={S.detailLabel}>Senal requerida</span><span style={{ ...S.detailValue, color: '#16a34a', fontWeight: 700 }}>{fmtCRC(ch.deposit_amount)}</span></div>
                        <div style={S.detailRow}><span style={S.detailLabel}>SINPE a</span><span style={S.detailValue}>{ch.sinpe_number}</span></div>
                        <div style={S.detailRow}><span style={S.detailLabel}>Deadline pago</span><span style={S.detailValue}>{fmtDateTime(ch.payment_deadline)}</span></div>
                        {ch.team_a_captain && <div style={S.detailRow}><span style={S.detailLabel}>Capitan Eq. A</span><span style={S.detailValue}>{ch.team_a_captain} {ch.team_a_phone ? '- ' + ch.team_a_phone : ''}</span></div>}
                        {ch.team_a_cedula && <div style={S.detailRow}><span style={S.detailLabel}>Cedula Eq. A</span><span style={S.detailValue}>{ch.team_a_cedula}</span></div>}
                        {ch.notes && <div style={S.detailRow}><span style={S.detailLabel}>Notas</span><span style={S.detailValue}>{ch.notes}</span></div>}
                      </div>

                      {resps.length > 0 && (
                        <div style={S.respSection}>
                          <p style={S.respTitle}>Equipo{resps.length > 1 ? 's' : ''} rival{resps.length > 1 ? 'es' : ''}</p>
                          {resps.map(resp => {
                            const rs = RESP_STATUS[resp.status] || RESP_STATUS.joined
                            return (
                              <div key={resp.id} style={S.resp}>
                                <div style={S.respHeader}>
                                  <div>
                                    <span style={S.respTeam}>{resp.team_name}</span>
                                    <span style={S.respCaptain}>{resp.captain_name} - {resp.captain_phone}{resp.captain_cedula ? ' - Ced: ' + resp.captain_cedula : ''}</span>
                                    {resp.captain_email && <span style={S.respEmail}>{resp.captain_email}</span>}
                                  </div>
                                  <span style={{ ...S.badge, color: rs.color, background: rs.bg }}>{rs.label}</span>
                                </div>
                                {resp.sinpe_reference && (
                                  <div style={S.respSinpe}>
                                    <span>Referencia SINPE:</span>
                                    <strong style={{ fontSize: 16, letterSpacing: 1 }}>{resp.sinpe_reference}</strong>
                                    {resp.payment_sent_at && <span style={{ fontSize: 11, color: '#64748b' }}>Enviado {fmtDateTime(resp.payment_sent_at)}</span>}
                                  </div>
                                )}
                                {resp.status === 'payment_sent' && (
                                  <div style={S.respActions}>
                                    <button style={btnSuccess} disabled={acting} onClick={() => validatePayment(ch.id, resp.id)}>Validar pago</button>
                                    <button style={btnDanger} disabled={acting} onClick={() => rejectPayment(resp.id, ch.id)}>Rechazar</button>
                                  </div>
                                )}
                                {resp.status === 'payment_ok' && resp.validated_at && (
                                  <p style={S.respValidated}>Validado el {fmtDateTime(resp.validated_at)}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {resps.length === 0 && ch.status === 'open' && (
                        <div style={S.noResp}>Esperando que un equipo acepte el reto...</div>
                      )}

                      <div style={S.cardActions}>
                        {ch.status === 'confirmed' && (
                          <button style={{ ...btnPrimary, ...btnSm }} disabled={acting} onClick={() => markCompleted(ch.id)}>Marcar como jugado</button>
                        )}
                        {['open', 'challenged', 'pending_pay'].includes(ch.status) && (
                          <button style={{ ...btnDanger, ...btnSm }} disabled={acting} onClick={() => cancelChallenge(ch.id)}>Cancelar reto</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div>
                <p style={S.modalLabel}>NUEVO RETO</p>
                <h2 style={S.modalTitle}>Publicar partido abierto</h2>
              </div>
              <button style={S.modalClose} onClick={() => setShowCreate(false)}>X</button>
            </div>
            <div style={S.modalBody}>
              <div style={S.formField}>
                <label style={S.formLabel}>Cancha *</label>
                <div style={S.fieldCards}>
                  {fields.map(f => {
                    const sp = SPORT_LABELS[f.sport || ''] || SPORT_LABELS.otro
                    return (
                      <button key={f.id} type="button" style={fieldCardStyle(cFieldId === f.id)} onClick={() => { setCFieldId(f.id); setCSport(f.sport || 'futbol5') }}>
                        <span>{sp.emoji}</span> {f.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={S.grid2}>
                <div style={S.formField}>
                  <label style={S.formLabel}>Fecha *</label>
                  <input style={S.input} type="date" min={todayStr()} value={cDate} onChange={e => setCDate(e.target.value)} />
                </div>
                <div style={S.formField}>
                  <label style={S.formLabel}>Hora *</label>
                  <select style={S.input} value={cHour} onChange={e => setCHour(e.target.value)}>
                    <option value="">Seleccionar</option>
                    {ALL_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div style={S.formField}>
                <label style={S.formLabel}>Nombre del equipo A *</label>
                <input style={S.input} placeholder="Ej: Los Cracks FC" value={cTeamA} onChange={e => setCTeamA(e.target.value)} />
              </div>

              <div style={S.grid2}>
                <div style={S.formField}>
                  <label style={S.formLabel}>Capitan</label>
                  <input style={S.input} placeholder="Nombre del capitan" value={cCaptain} onChange={e => setCCaptain(e.target.value)} />
                </div>
                <div style={S.formField}>
                  <label style={S.formLabel}>Telefono capitan</label>
                  <input style={S.input} type="tel" placeholder="8888-8888" value={cPhone} onChange={e => setCPhone(e.target.value)} />
                </div>
              </div>

              <div style={S.formField}>
                <label style={S.formLabel}>Cedula del capitan *</label>
                <input style={S.input} placeholder="Ej: 112345678" value={cCedula} onChange={e => setCCedula(e.target.value.replace(/\D/g, ''))} maxLength={10} />
                <p style={S.hint}>9 digitos persona fisica, 10 digitos persona juridica. Sin guiones.</p>
              </div>

              <div style={S.formField}>
                <label style={S.formLabel}>Senal SINPE requerida (colones)</label>
                <input style={S.input} type="number" min={500} step={500} value={cDeposit} onChange={e => setCDeposit(Number(e.target.value))} />
                <p style={S.hint}>El equipo rival debe hacer SINPE de {fmtCRC(cDeposit)} al {complexConfig?.sinpe_number || complexConfig?.whatsapp || 'tu numero'} para confirmar.</p>
              </div>

              <div style={S.formField}>
                <label style={S.formLabel}>Notas (opcional)</label>
                <input style={S.input} placeholder="Ej: Nivel intermedio, con arbitro" value={cNotes} onChange={e => setCNotes(e.target.value)} />
              </div>

              {cError && <div style={S.error}>{cError}</div>}

              <div style={S.modalActions}>
                <button style={{ ...btnGhost, flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)} disabled={cSaving}>Cancelar</button>
                <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: (cSaving || !cFieldId || !cDate || !cHour || !cTeamA.trim() || cCedula.length < 9) ? 0.4 : 1 }} onClick={handleCreate} disabled={cSaving || !cFieldId || !cDate || !cHour || !cTeamA.trim() || cCedula.length < 9}>
                  {cSaving ? 'Publicando...' : 'Publicar reto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
