import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OpenChallenge {
  id: string
  team_a_name: string
  team_a_captain: string | null
  sport: string
  date: string
  hour: string
  court_price: number
  deposit_amount: number
  sinpe_number: string
  payment_deadline: string | null
  notes: string | null
  status: string
  field_name: string
  complex_name: string
  complex_city: string | null
  complex_slug: string
}

const SPORT_META: Record<string, { label: string; emoji: string; color: string }> = {
  futbol5: { label: 'Futbol 5', emoji: '⚽', color: '#16a34a' },
  futbol7: { label: 'Futbol 7', emoji: '⚽', color: '#16a34a' },
  futbol8: { label: 'Futbol 8', emoji: '⚽', color: '#16a34a' },
  futbol11: { label: 'Futbol 11', emoji: '⚽', color: '#16a34a' },
  padel: { label: 'Padel', emoji: '🎾', color: '#eab308' },
  tenis: { label: 'Tenis', emoji: '🎾', color: '#eab308' },
  basquet: { label: 'Basquet', emoji: '🏀', color: '#f97316' },
  otro: { label: 'Otro', emoji: '🏟', color: '#6b7280' },
}

const fmtCRC = (v: number) => String.fromCharCode(8353) + Math.round(v).toLocaleString('es-CR')

function fmtDate(d: string) {
  const parts = d.split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtDateShort(d: string) {
  const parts = d.split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function timeUntil(dateStr: string, hour: string) {
  const parts = dateStr.split('-').map(Number)
  const match = new Date(parts[0], parts[1] - 1, parts[2], Number(hour.split(':')[0]))
  const now = new Date()
  const diff = match.getTime() - now.getTime()
  if (diff < 0) return 'Ya paso'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return 'En ' + days + ' dia' + (days > 1 ? 's' : '')
  if (hours > 0) return 'En ' + hours + ' hora' + (hours > 1 ? 's' : '')
  return 'Hoy'
}

export default function RetosPage() {
  const [challenges, setChallenges] = useState<OpenChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OpenChallenge | null>(null)
  const [sportFilter, setSportFilter] = useState<string>('all')

  const [teamName, setTeamName] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')
  const [captainCedula, setCaptainCedula] = useState('')
  const [sending, setSending] = useState(false)
  const [step, setStep] = useState<'form' | 'sinpe' | 'done'>('form')
  const [sinpeRef, setSinpeRef] = useState('')
  const [responseId, setResponseId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadChallenges() }, [])

  const loadChallenges = async () => {
    setLoading(true)
    const { data: retos } = await supabase
      .from('challenges')
      .select('id, team_a_name, team_a_captain, sport, date, hour, court_price, deposit_amount, sinpe_number, payment_deadline, notes, status, field_id, complex_id')
      .eq('status', 'open')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('hour', { ascending: true })

    if (!retos || retos.length === 0) { setChallenges([]); setLoading(false); return }

    const fieldIds = [...new Set(retos.map(r => r.field_id))]
    const complexIds = [...new Set(retos.map(r => r.complex_id))]

    const { data: fields } = await supabase.from('fields').select('id, name').in('id', fieldIds)
    const { data: complexes } = await supabase.from('complexes').select('id, name, city, slug').in('id', complexIds)

    const fieldMap = new Map((fields || []).map(f => [f.id, f.name]))
    const complexMap = new Map((complexes || []).map(c => [c.id, c]))

    const enriched: OpenChallenge[] = retos.map(r => {
      const cx = complexMap.get(r.complex_id)
      return { ...r, field_name: fieldMap.get(r.field_id) || 'Cancha', complex_name: cx?.name || 'Complejo', complex_city: cx?.city || null, complex_slug: cx?.slug || '' }
    })
    setChallenges(enriched)
    setLoading(false)
  }

  const filteredChallenges = sportFilter === 'all' ? challenges : challenges.filter(c => c.sport === sportFilter)
  const sports = [...new Set(challenges.map(c => c.sport))]

  const handleAccept = async () => {
    setError('')
    if (!teamName.trim() || !captainName.trim() || !captainPhone.trim()) {
      setError('Completa nombre del equipo, capitan y telefono')
      return
    }
    if (!captainCedula.trim() || captainCedula.length < 9) {
      setError('La cedula debe tener al menos 9 digitos')
      return
    }
    if (!selected) return
    setSending(true)

    const { data: resp, error: insertErr } = await supabase
      .from('challenge_responses')
      .insert({
        challenge_id: selected.id,
        team_name: teamName.trim(),
        captain_name: captainName.trim(),
        captain_phone: captainPhone.trim(),
        captain_email: captainEmail.trim() || null,
        captain_cedula: captainCedula.trim(),
        status: 'joined',
      })
      .select('id')
      .single()

    if (insertErr) { setError(insertErr.message); setSending(false); return }

    await supabase.from('challenges').update({ status: 'challenged' }).eq('id', selected.id)
    setResponseId(resp.id)
    setSending(false)
    setStep('sinpe')
  }

  const handleSinpeSubmit = async () => {
    if (!sinpeRef.trim() || !responseId) return
    setSending(true)
    await supabase.from('challenge_responses').update({
      sinpe_reference: sinpeRef.trim(),
      payment_amount: selected?.deposit_amount,
      status: 'payment_sent',
      payment_sent_at: new Date().toISOString(),
    }).eq('id', responseId)
    await supabase.from('challenges').update({ status: 'pending_pay' }).eq('id', selected!.id)
    setSending(false)
    setStep('done')
  }

  const closeModal = () => {
    setSelected(null); setStep('form')
    setTeamName(''); setCaptainName(''); setCaptainPhone(''); setCaptainEmail(''); setCaptainCedula('')
    setSinpeRef(''); setResponseId(null); setError('')
    if (step === 'done' || step === 'sinpe') loadChallenges()
  }

  return (
    <>
      <Head>
        <title>Retos - GolPlay</title>
        <meta name="description" content="Partidos abiertos buscando rival. Acepta un reto y juga hoy." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />
      </Head>

      <div style={S.page}>
        <header style={S.header}>
          <Link href="/" style={S.logo}><img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 50 }} /></Link>
          <Link href="/login" style={S.loginLink}>Ingresar</Link>
        </header>

        <div style={S.hero}>
          <span style={S.heroTag}>PARTIDOS ABIERTOS</span>
          <h1 style={S.heroTitle}>Busca rival, acepta el reto</h1>
          <p style={S.heroSub}>Equipos buscan contrincante. Acepta, paga la senal y llega a jugar.</p>
        </div>

        {sports.length > 1 && (
          <div style={S.filters}>
            <button style={sportFilter === 'all' ? S.filterActive : S.filter} onClick={() => setSportFilter('all')}>Todos</button>
            {sports.map(sp => {
              const meta = SPORT_META[sp] || SPORT_META.otro
              return <button key={sp} style={sportFilter === sp ? S.filterActive : S.filter} onClick={() => setSportFilter(sp)}>{meta.emoji} {meta.label}</button>
            })}
          </div>
        )}

        {loading ? (
          <p style={S.emptyText}>Cargando retos...</p>
        ) : filteredChallenges.length === 0 ? (
          <div style={S.empty}>
            <span style={{ fontSize: 56, display: 'block', marginBottom: 16 }}>⚔</span>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>No hay retos abiertos</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>Vuelve pronto, los complejos publican nuevos partidos constantemente.</p>
          </div>
        ) : (
          <div style={S.grid}>
            {filteredChallenges.map(ch => {
              const sp = SPORT_META[ch.sport] || SPORT_META.otro
              const when = timeUntil(ch.date, ch.hour)
              return (
                <div key={ch.id} style={S.card} onClick={() => setSelected(ch)}>
                  <div style={{ ...S.cardSportBadge, background: sp.color + '18', color: sp.color }}>{sp.emoji} {sp.label}</div>
                  <div style={S.cardMatchup}>
                    <div style={S.cardTeam}>
                      <div style={S.cardTeamAvatar}>{ch.team_a_name[0]}</div>
                      <span style={S.cardTeamName}>{ch.team_a_name}</span>
                    </div>
                    <div style={S.cardVsCircle}>VS</div>
                    <div style={S.cardTeam}>
                      <div style={{ ...S.cardTeamAvatar, background: 'rgba(255,255,255,.06)', border: '2px dashed rgba(255,255,255,.2)' }}>?</div>
                      <span style={{ ...S.cardTeamName, color: 'rgba(255,255,255,.4)' }}>Tu equipo</span>
                    </div>
                  </div>
                  <div style={S.cardDetails}>
                    <div style={S.cardDetailRow}><span style={S.cardDetailIcon}>📍</span><span>{ch.complex_name} - {ch.field_name}</span></div>
                    <div style={S.cardDetailRow}><span style={S.cardDetailIcon}>📅</span><span>{fmtDateShort(ch.date)} - {ch.hour}</span></div>
                    <div style={S.cardDetailRow}><span style={S.cardDetailIcon}>💰</span><span>Senal: {fmtCRC(ch.deposit_amount)}</span></div>
                  </div>
                  <div style={S.cardFooter}>
                    <span style={S.cardWhen}>{when}</span>
                    <span style={S.cardCta}>Aceptar reto</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && filteredChallenges.length > 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 12, margin: '32px 0 0' }}>
            {filteredChallenges.length} reto{filteredChallenges.length !== 1 ? 's' : ''} disponible{filteredChallenges.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {selected && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div>
                <p style={S.modalLabel}>{step === 'form' ? 'ACEPTAR RETO' : step === 'sinpe' ? 'CONFIRMAR PAGO' : 'LISTO'}</p>
                <h2 style={S.modalTitle}>{step === 'done' ? 'Reto aceptado' : selected.team_a_name + ' vs tu equipo'}</h2>
              </div>
              <button style={S.modalClose} onClick={closeModal}>X</button>
            </div>

            <div style={S.modalBody}>
              <div style={S.matchInfo}>
                <div style={S.matchInfoRow}><span>📍</span> {selected.complex_name} - {selected.field_name}</div>
                <div style={S.matchInfoRow}><span>📅</span> {fmtDate(selected.date)} - {selected.hour}</div>
                <div style={S.matchInfoRow}><span>💰</span> Senal: <strong>{fmtCRC(selected.deposit_amount)}</strong></div>
                {selected.notes && <div style={S.matchInfoRow}><span>📝</span> {selected.notes}</div>}
              </div>

              {step === 'form' && (
                <>
                  <div style={S.formField}>
                    <label style={S.formLabel}>Nombre de tu equipo *</label>
                    <input style={S.input} placeholder="Ej: Los Galacticos" value={teamName} onChange={e => setTeamName(e.target.value)} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.formLabel}>Nombre del capitan *</label>
                    <input style={S.input} placeholder="Tu nombre" value={captainName} onChange={e => setCaptainName(e.target.value)} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.formLabel}>Cedula del capitan *</label>
                    <input style={S.input} placeholder="Ej: 112345678" value={captainCedula} onChange={e => setCaptainCedula(e.target.value.replace(/\D/g, ''))} maxLength={10} />
                    <p style={S.hintText}>9 digitos persona fisica, 10 persona juridica. Sin guiones.</p>
                  </div>
                  <div style={S.grid2}>
                    <div style={S.formField}>
                      <label style={S.formLabel}>Telefono *</label>
                      <input style={S.input} type="tel" placeholder="8888-8888" value={captainPhone} onChange={e => setCaptainPhone(e.target.value)} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.formLabel}>Email (opcional)</label>
                      <input style={S.input} type="email" placeholder="tu@email.com" value={captainEmail} onChange={e => setCaptainEmail(e.target.value)} />
                    </div>
                  </div>
                  {error && <div style={S.errorBox}>{error}</div>}
                  <button style={{ ...S.btnPrimary, opacity: sending ? 0.5 : 1, width: '100%', justifyContent: 'center' }} onClick={handleAccept} disabled={sending}>
                    {sending ? 'Enviando...' : 'Aceptar reto'}
                  </button>
                </>
              )}

              {step === 'sinpe' && (
                <>
                  <div style={S.sinpeCard}>
                    <p style={S.sinpeTitle}>Hace un SINPE para confirmar</p>
                    <div style={S.sinpeAmount}>{fmtCRC(selected.deposit_amount)}</div>
                    <p style={S.sinpeNumber}>Al numero: <strong>{selected.sinpe_number}</strong></p>
                    <p style={S.sinpeHint}>Este monto se descuenta del precio de la cancha cuando llegues a jugar.</p>
                  </div>
                  <div style={S.formField}>
                    <label style={S.formLabel}>Ultimos 4 digitos de la referencia SINPE *</label>
                    <input
                      style={{ ...S.input, fontSize: 20, fontWeight: 800, textAlign: 'center' as const, letterSpacing: 4 }}
                      placeholder="0000"
                      maxLength={4}
                      value={sinpeRef}
                      onChange={e => setSinpeRef(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                  </div>
                  <button style={{ ...S.btnPrimary, opacity: (sending || sinpeRef.length < 4) ? 0.5 : 1, width: '100%', justifyContent: 'center' }} onClick={handleSinpeSubmit} disabled={sending || sinpeRef.length < 4}>
                    {sending ? 'Enviando...' : 'Confirmar pago'}
                  </button>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', textAlign: 'center', margin: 0 }}>
                    El complejo va a validar tu pago y te confirmamos por email.
                  </p>
                </>
              )}

              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Reto aceptado</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Tu pago esta siendo validado por el complejo. Te confirmaremos por email cuando el partido quede listo.
                  </p>
                  <button style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center' }} onClick={closeModal}>Cerrar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#050a05', fontFamily: "'DM Sans', sans-serif", color: '#fff', padding: '0 0 60px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: 1200, margin: '0 auto' },
  logo: { display: 'flex', alignItems: 'center', textDecoration: 'none' },
  loginLink: { fontSize: 13, color: 'rgba(255,255,255,.6)', textDecoration: 'none', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)' },
  hero: { textAlign: 'center' as const, padding: '48px 24px 32px', maxWidth: 600, margin: '0 auto' },
  heroTag: { fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '.12em', display: 'block', marginBottom: 14 },
  heroTitle: { fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,.5)', margin: 0, lineHeight: 1.6 },
  filters: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' as const, padding: '0 24px 24px' },
  filter: { padding: '7px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  filterActive: { padding: '7px 16px', borderRadius: 999, border: '1px solid #22c55e', background: 'rgba(34,197,94,.12)', color: '#4ade80', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
  card: { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 24, cursor: 'pointer', transition: 'all .2s' },
  cardSportBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, marginBottom: 18 },
  cardMatchup: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 },
  cardTeam: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 },
  cardTeamAvatar: { width: 48, height: 48, borderRadius: 14, background: 'rgba(34,197,94,.15)', border: '2px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#4ade80' },
  cardTeamName: { fontSize: 12, fontWeight: 700, color: '#fff', textAlign: 'center' as const, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  cardVsCircle: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.4)', flexShrink: 0 },
  cardDetails: { display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 18 },
  cardDetailRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,.6)' },
  cardDetailIcon: { fontSize: 14, width: 20, textAlign: 'center' as const, flexShrink: 0 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.06)' },
  cardWhen: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.3)' },
  cardCta: { fontSize: 12, fontWeight: 700, color: '#22c55e', padding: '6px 14px', borderRadius: 8, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)' },
  emptyText: { textAlign: 'center' as const, color: 'rgba(255,255,255,.4)', fontSize: 14, padding: 40 },
  empty: { textAlign: 'center' as const, padding: '80px 24px', maxWidth: 400, margin: '0 auto' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(5,10,5,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 },
  modal: { background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, width: '100%', maxWidth: 480, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' as const },
  modalHeader: { padding: '24px 24px 20px', background: 'linear-gradient(160deg,#052e16 0%,#0B4D2C 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' as const, margin: '0 0 4px' },
  modalTitle: { fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' },
  modalClose: { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: '20px 24px 28px', overflowY: 'auto' as const, flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 16 },
  matchInfo: { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 8 },
  matchInfoRow: { fontSize: 13, color: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', gap: 8 },
  formField: { display: 'flex', flexDirection: 'column' as const, gap: 5 },
  formLabel: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', margin: 0 },
  hintText: { fontSize: 11, color: 'rgba(255,255,255,.3)', margin: 0 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.12)', fontSize: 14, fontFamily: 'inherit', color: '#fff', outline: 'none', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,.04)' },
  errorBox: { padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#fca5a5', fontWeight: 600 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '13px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', boxShadow: '0 2px 16px rgba(22,163,74,.3)' },
  sinpeCard: { background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 16, padding: 24, textAlign: 'center' as const },
  sinpeTitle: { fontSize: 13, color: 'rgba(255,255,255,.5)', margin: '0 0 8px', fontWeight: 600 },
  sinpeAmount: { fontSize: 32, fontWeight: 900, color: '#4ade80', margin: '0 0 8px', letterSpacing: '-1px' },
  sinpeNumber: { fontSize: 14, color: 'rgba(255,255,255,.7)', margin: '0 0 12px' },
  sinpeHint: { fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0, lineHeight: 1.5 },
}
