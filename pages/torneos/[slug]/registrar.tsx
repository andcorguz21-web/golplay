/**
 * GolPlay — pages/torneos/[slug]/registrar.tsx
 * Inscripción pública de equipos a un torneo
 *
 * Flujo de 2 pantallas:
 *   1. Datos del equipo (nombre, capitán, jugadores)
 *   2. Pago SINPE (instrucciones + ref + confirmación)
 *
 * Tras submit: el equipo queda en DB con status PENDING_PAYMENT.
 * El admin valida después manualmente desde el panel.
 *
 * v1.1: queries separadas (sin embeds) para evitar bug de PostgREST
 *       con FK opcionales (cuando complex_id es NULL en torneos externos)
 */

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────

interface Tournament {
  id: number
  complex_id: number | null
  slug: string
  name: string
  sport_type: string
  start_date: string
  end_date: string | null
  max_teams: number
  price_per_team: number
  cover_image_url: string | null
  status: string
  is_external: boolean
  venue_name: string | null
  complex_name: string | null
  sinpe_phone: string | null
  sinpe_holder: string | null
  contact_phone: string | null
  confirmed_count: number
  pending_count: number
}

type Stage = 'form' | 'payment' | 'done'

interface Props {
  tournament: Tournament | null
}

// ─── Constantes ─────────────────────────────────────────────

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽' },
  padel:    { label: 'Pádel',     emoji: '🎾' },
  otro:     { label: 'Otro',      emoji: '🏟️' },
}

// ─── Helpers ────────────────────────────────────────────────

const fmtCRC = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const fmtPhone = (p: string | null) => {
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4)}`
  return p
}

const onlyDigits = (s: string, max?: number) => {
  const d = s.replace(/\D/g, '')
  return max ? d.slice(0, max) : d
}

// ─── SSR ────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug
  console.log('[registrar] slug:', slug)

  if (typeof slug !== 'string') {
    return { props: { tournament: null } }
  }

  console.log('[registrar] env URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[registrar] env ANON exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 1. Tournament solo (sin embed)
  const { data: t, error } = await sb
    .from('tournaments')
    .select(`
      id, complex_id, slug, name, sport_type, start_date, end_date,
      max_teams, price_per_team, cover_image_url, status,
      is_external, venue_name, sinpe_phone, sinpe_holder, contact_phone
    `)
    .eq('slug', slug)
    .neq('status', 'DRAFT')
    .maybeSingle()

  console.log('[registrar] data:', t ? 'FOUND' : 'NULL', '· error:', error)

  if (!t) return { props: { tournament: null } }

  const tRow = t as any

  // 2. Complex name (si aplica)
  let complexName: string | null = null
  if (tRow.complex_id) {
    const { data: c } = await sb
      .from('complexes')
      .select('name')
      .eq('id', tRow.complex_id)
      .maybeSingle()
    complexName = c?.name ?? null
  }

  // 3. Teams para contar
  const { data: teams } = await sb
    .from('tournament_teams')
    .select('id, status')
    .eq('tournament_id', tRow.id)

  const teamsArr = teams ?? []

  const tournament: Tournament = {
    id: tRow.id,
    complex_id: tRow.complex_id,
    slug: tRow.slug,
    name: tRow.name,
    sport_type: tRow.sport_type,
    start_date: tRow.start_date,
    end_date: tRow.end_date,
    max_teams: tRow.max_teams,
    price_per_team: Number(tRow.price_per_team),
    cover_image_url: tRow.cover_image_url,
    status: tRow.status,
    is_external: tRow.is_external,
    venue_name: tRow.venue_name,
    complex_name: complexName,
    sinpe_phone: tRow.sinpe_phone,
    sinpe_holder: tRow.sinpe_holder,
    contact_phone: tRow.contact_phone,
    confirmed_count: teamsArr.filter((tm: any) => tm.status === 'CONFIRMED').length,
    pending_count:   teamsArr.filter((tm: any) => tm.status === 'PENDING_PAYMENT').length,
  }

  return { props: { tournament } }
}

// ─── Page ──────────────────────────────────────────────────

export default function RegistrarTorneoPage({ tournament }: Props) {
  const router = useRouter()

  // ── State ──
  const [stage, setStage] = useState<Stage>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Datos del equipo
  const [teamName, setTeamName]         = useState('')
  const [captainName, setCaptainName]   = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')
  const [playerInput, setPlayerInput]   = useState('')
  const [players, setPlayers]           = useState<string[]>([])

  // Resultado de la inscripción
  const [createdTeamId, setCreatedTeamId] = useState<number | null>(null)
  const [paymentRef, setPaymentRef]       = useState('')
  const [confirming, setConfirming]       = useState(false)

  // ── Page guards ──
  if (!tournament) {
    return (
      <>
        <Head><title>Torneo no encontrado · GolPlay</title></Head>
        <style jsx global>{GLOBAL_CSS}</style>
        <style>{CSS}</style>
        <div className="rg-404">
          <span className="rg-404__emoji">🏆</span>
          <h1 className="rg-404__title">Torneo no encontrado</h1>
          <p className="rg-404__sub">Este torneo no existe o no está disponible.</p>
          <Link href="/" className="rg-btn rg-btn--primary">Volver a GolPlay</Link>
        </div>
      </>
    )
  }

  if (tournament.status !== 'OPEN') {
    return (
      <>
        <Head><title>{tournament.name} · GolPlay</title></Head>
        <style jsx global>{GLOBAL_CSS}</style>
        <style>{CSS}</style>
        <div className="rg-closed">
          <span className="rg-closed__emoji">🚫</span>
          <h1 className="rg-closed__title">Inscripciones cerradas</h1>
          <p className="rg-closed__sub">
            {tournament.status === 'FULL'      && 'El torneo ya tiene cupo completo.'}
            {tournament.status === 'IN_PROGRESS' && 'El torneo ya está en curso.'}
            {tournament.status === 'FINISHED'  && 'El torneo ya finalizó.'}
            {tournament.status === 'CANCELLED' && 'El torneo fue cancelado.'}
          </p>
          <Link href={`/torneos/${tournament.slug}`} className="rg-btn rg-btn--primary">
            Ver detalles del torneo
          </Link>
        </div>
      </>
    )
  }

  const sp = SPORT_META[tournament.sport_type] ?? SPORT_META.otro
  const venueLabel = tournament.is_external ? tournament.venue_name : tournament.complex_name
  const slotsLeft = tournament.max_teams - tournament.confirmed_count

  // ── Validation ──
  const canSubmitForm = useMemo(() => {
    return teamName.trim().length >= 2
      && captainName.trim().length >= 2
      && captainPhone.replace(/\D/g, '').length >= 8
  }, [teamName, captainName, captainPhone])

  // ── Players helpers ──
  const addPlayer = () => {
    const v = playerInput.trim()
    if (!v || players.length >= 30) return
    setPlayers([...players, v])
    setPlayerInput('')
  }

  const removePlayer = (i: number) => {
    setPlayers(players.filter((_, idx) => idx !== i))
  }

  // ── Submit equipo ──
  const handleSubmitTeam = async () => {
    setError('')
    if (!canSubmitForm) {
      setError('Completá nombre del equipo, capitán y teléfono.')
      return
    }

    setSubmitting(true)

    const payload = {
      tournament_id: tournament.id,
      team_name: teamName.trim(),
      captain_name: captainName.trim(),
      captain_phone: captainPhone.replace(/\D/g, ''),
      captain_email: captainEmail.trim() || null,
      players: players.map(p => ({ name: p })),
      status: 'PENDING_PAYMENT',
    }

    const { data, error: insErr } = await supabase
      .from('tournament_teams')
      .insert(payload)
      .select('id')
      .single()

    setSubmitting(false)

    if (insErr) {
      if (insErr.code === '23505') {
        setError('Ya existe un equipo con ese nombre en el torneo. Cambiá el nombre.')
      } else if (insErr.code === '23503' || insErr.message?.includes('OPEN')) {
        setError('El torneo dejó de estar abierto. Refrescá la página.')
      } else {
        setError(insErr.message || 'Error al registrar el equipo.')
      }
      return
    }

    setCreatedTeamId(data.id)
    setStage('payment')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Confirmar pago ──
  const handleConfirmPayment = async () => {
    if (!createdTeamId) return
    setError('')

    if (paymentRef.length !== 4) {
      setError('Pegá los últimos 4 dígitos de la referencia SINPE.')
      return
    }

    setConfirming(true)

    const { error: upErr } = await supabase
      .from('tournament_teams')
      .update({ payment_reference: paymentRef })
      .eq('id', createdTeamId)
      .eq('status', 'PENDING_PAYMENT')

    setConfirming(false)

    if (upErr) {
      setError('Error guardando referencia. Intentá de nuevo.')
      return
    }

    setStage('done')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── WhatsApp helpers ──
  const adminWhatsAppUrl = useMemo(() => {
    if (!tournament.contact_phone) return null
    const digits = tournament.contact_phone.replace(/\D/g, '')
    const text = `Hola, acabo de inscribir el equipo *${teamName || '___'}* en el torneo *${tournament.name}*. Adjunto comprobante SINPE.`
    return `https://wa.me/506${digits}?text=${encodeURIComponent(text)}`
  }, [tournament, teamName])

  // ── Render ──

  return (
    <>
      <Head>
        <title>Inscribir equipo · {tournament.name} · GolPlay</title>
        <meta name="robots" content="noindex" />
      </Head>

      <style jsx global>{GLOBAL_CSS}</style>
      <style>{CSS}</style>

      <div className="rg">
        {/* ── Top bar ── */}
        <div className="rg-top">
          <Link href={`/torneos/${tournament.slug}`} className="rg-top__back">← Volver al torneo</Link>
          <Link href="/" className="rg-top__brand">GolPlay</Link>
        </div>

        {/* ── Stage: FORM ── */}
        {stage === 'form' && (
          <div className="rg-stage">
            <p className="rg-eyebrow">{sp.emoji} {sp.label}</p>
            <h1 className="rg-h1">Inscribí tu equipo</h1>
            <p className="rg-lead">
              <strong>{tournament.name}</strong>
              <br />
              {fmtDate(tournament.start_date)}
              {venueLabel && ` · ${venueLabel}`}
            </p>

            <div className="rg-stat-strip">
              <div className="rg-stat">
                <span className="rg-stat__label">Inscripción</span>
                <span className="rg-stat__value">{fmtCRC(tournament.price_per_team)}</span>
              </div>
              <div className="rg-stat">
                <span className="rg-stat__label">Cupos</span>
                <span className="rg-stat__value">{slotsLeft} libres</span>
              </div>
            </div>

            {/* FORM */}
            <div className="rg-form">
              <div className="rg-field">
                <label className="rg-label">Nombre del equipo *</label>
                <input
                  className="rg-input"
                  placeholder="Ej: Los Cracks FC"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  maxLength={50}
                />
              </div>

              <div className="rg-field">
                <label className="rg-label">Nombre del capitán *</label>
                <input
                  className="rg-input"
                  placeholder="Tu nombre completo"
                  value={captainName}
                  onChange={e => setCaptainName(e.target.value)}
                  maxLength={80}
                />
              </div>

              <div className="rg-grid-2">
                <div className="rg-field">
                  <label className="rg-label">Teléfono *</label>
                  <input
                    className="rg-input"
                    type="tel"
                    inputMode="numeric"
                    placeholder="8888-8888"
                    value={captainPhone}
                    onChange={e => setCaptainPhone(onlyDigits(e.target.value, 8))}
                  />
                </div>
                <div className="rg-field">
                  <label className="rg-label">Email (opcional)</label>
                  <input
                    className="rg-input"
                    type="email"
                    placeholder="tu@email.com"
                    value={captainEmail}
                    onChange={e => setCaptainEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Players (opcional) */}
              <div className="rg-field">
                <label className="rg-label">
                  Jugadores (opcional)
                  <span className="rg-label-sub"> · {players.length} agregado{players.length !== 1 ? 's' : ''}</span>
                </label>
                <div className="rg-player-input">
                  <input
                    className="rg-input"
                    placeholder="Escribí un nombre y dale +"
                    value={playerInput}
                    onChange={e => setPlayerInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayer() } }}
                  />
                  <button
                    type="button"
                    className="rg-player-add"
                    onClick={addPlayer}
                    disabled={!playerInput.trim() || players.length >= 30}
                  >
                    +
                  </button>
                </div>
                {players.length > 0 && (
                  <div className="rg-chips">
                    {players.map((p, i) => (
                      <span key={i} className="rg-chip">
                        {p}
                        <button type="button" className="rg-chip__x" onClick={() => removePlayer(i)} aria-label="Quitar">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="rg-hint">Podés agregarlos después también.</p>
              </div>

              {error && <div className="rg-error">⚠️ {error}</div>}

              <button
                type="button"
                className="rg-btn rg-btn--primary rg-btn--full"
                onClick={handleSubmitTeam}
                disabled={submitting || !canSubmitForm}
              >
                {submitting ? 'Inscribiendo…' : 'Continuar al pago →'}
              </button>

              <p className="rg-fineprint">
                Al inscribir tu equipo confirmás que vas a pagar la inscripción por SINPE en las próximas horas.
              </p>
            </div>
          </div>
        )}

        {/* ── Stage: PAYMENT ── */}
        {stage === 'payment' && (
          <div className="rg-stage">
            <p className="rg-eyebrow">Paso 2 de 2</p>
            <h1 className="rg-h1">Pagá tu inscripción</h1>
            <p className="rg-lead">
              Hacé el SINPE y pegá los últimos 4 dígitos del número de referencia.
            </p>

            {/* SINPE box destacada */}
            <div className="rg-sinpe">
              <p className="rg-sinpe__label">Hacé SINPE móvil de</p>
              <p className="rg-sinpe__amount">{fmtCRC(tournament.price_per_team)}</p>

              <div className="rg-sinpe__rows">
                <div className="rg-sinpe__row">
                  <span className="rg-sinpe__row-label">Al número</span>
                  <span className="rg-sinpe__row-value">
                    {fmtPhone(tournament.sinpe_phone)}
                    <button
                      type="button"
                      className="rg-sinpe__copy"
                      onClick={() => {
                        navigator.clipboard.writeText(tournament.sinpe_phone?.replace(/\D/g,'') ?? '')
                      }}
                    >
                      copiar
                    </button>
                  </span>
                </div>
                <div className="rg-sinpe__row">
                  <span className="rg-sinpe__row-label">A nombre de</span>
                  <span className="rg-sinpe__row-value">{tournament.sinpe_holder ?? '—'}</span>
                </div>
                <div className="rg-sinpe__row">
                  <span className="rg-sinpe__row-label">Concepto</span>
                  <span className="rg-sinpe__row-value">{tournament.name.slice(0, 25)} · {teamName}</span>
                </div>
              </div>
            </div>

            {/* Confirmación */}
            <div className="rg-form">
              <div className="rg-field">
                <label className="rg-label">Últimos 4 dígitos del SINPE *</label>
                <input
                  className="rg-input rg-input--big"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0000"
                  maxLength={4}
                  value={paymentRef}
                  onChange={e => setPaymentRef(onlyDigits(e.target.value, 4))}
                  autoFocus
                />
                <p className="rg-hint">
                  Después de hacer el SINPE te llega un mensaje con un número de referencia (ej: <strong>123456789012</strong>). Pegá los últimos 4: <strong>9012</strong>.
                </p>
              </div>

              {error && <div className="rg-error">⚠️ {error}</div>}

              <button
                type="button"
                className="rg-btn rg-btn--primary rg-btn--full"
                onClick={handleConfirmPayment}
                disabled={confirming || paymentRef.length !== 4}
              >
                {confirming ? 'Guardando…' : 'Ya pagué ✓'}
              </button>

              <button
                type="button"
                className="rg-link-btn"
                onClick={() => setStage('done')}
              >
                Voy a pagar después
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: DONE ── */}
        {stage === 'done' && (
          <div className="rg-stage rg-stage--done">
            <div className="rg-done">
              <div className="rg-done__check">✓</div>
              <h1 className="rg-h1">¡Listo!</h1>
              <p className="rg-lead">
                Tu equipo <strong>{teamName}</strong> está inscrito.
                {paymentRef
                  ? ' El organizador va a validar tu pago en las próximas horas.'
                  : ' Acordate de hacer el SINPE para confirmar tu cupo.'}
              </p>

              <div className="rg-done__card">
                <h3 className="rg-done__card-title">¿Qué sigue?</h3>
                <ol className="rg-done__list">
                  {!paymentRef && (
                    <li>Hacé el SINPE de <strong>{fmtCRC(tournament.price_per_team)}</strong> al <strong>{fmtPhone(tournament.sinpe_phone)}</strong></li>
                  )}
                  <li>El organizador valida tu pago manualmente</li>
                  <li>Tu equipo aparece en la página pública del torneo</li>
                  <li>Te contactan con el calendario de partidos</li>
                </ol>
              </div>

              {adminWhatsAppUrl && (
                <a href={adminWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="rg-btn rg-btn--whatsapp rg-btn--full">
                  💬 Avisar al organizador por WhatsApp
                </a>
              )}

              <Link href={`/torneos/${tournament.slug}`} className="rg-btn rg-btn--ghost rg-btn--full">
                Volver al torneo
              </Link>

              <p className="rg-fineprint" style={{ marginTop: 24 }}>
                Compartí el link con tu equipo:
                <br />
                <code style={{ color: '#4ade80' }}>golplay.app/torneos/{tournament.slug}</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── CSS ────────────────────────────────────────────────────

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&display=swap');

html, body {
  margin: 0; padding: 0;
  background: #0C0D0B;
  color: #F5F2EC;
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
* { box-sizing: border-box; }
`

const CSS = `
.rg { min-height: 100vh; background: #0C0D0B; color: #F5F2EC; padding-bottom: 80px; }

/* ── 404 / Closed ── */
.rg-404, .rg-closed { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; gap: 12px; }
.rg-404__emoji, .rg-closed__emoji { font-size: 64px; opacity: .7; margin-bottom: 8px; }
.rg-404__title, .rg-closed__title { font-family: 'DM Serif Display', serif; font-size: 32px; color: #F5F2EC; margin: 0; }
.rg-404__sub, .rg-closed__sub { font-size: 14px; color: rgba(245,242,236,.6); max-width: 400px; line-height: 1.6; margin: 0 0 20px; }

/* ── Top bar ── */
.rg-top { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; max-width: 600px; margin: 0 auto; }
.rg-top__back { font-size: 13px; color: rgba(245,242,236,.6); text-decoration: none; font-weight: 500; }
.rg-top__back:hover { color: #4ade80; }
.rg-top__brand { font-family: 'DM Serif Display', serif; font-size: 18px; color: #F5F2EC; text-decoration: none; }

/* ── Stage container ── */
.rg-stage { max-width: 540px; margin: 0 auto; padding: 16px 22px 0; }
.rg-stage--done { padding-top: 60px; }

.rg-eyebrow { font-size: 11px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .12em; margin: 0 0 12px; }
.rg-h1 { font-family: 'DM Serif Display', serif; font-size: 38px; line-height: 1.05; letter-spacing: -.02em; color: #F5F2EC; margin: 0 0 14px; }
.rg-lead { font-size: 15px; color: rgba(245,242,236,.75); line-height: 1.6; margin: 0 0 28px; }
.rg-lead strong { color: #F5F2EC; font-weight: 700; }

/* ── Stat strip ── */
.rg-stat-strip { display: flex; gap: 1px; background: rgba(245,242,236,.1); border: 1px solid rgba(245,242,236,.1); border-radius: 14px; overflow: hidden; margin-bottom: 28px; }
.rg-stat { flex: 1; background: #16181A; padding: 14px 16px; }
.rg-stat__label { display: block; font-size: 10px; font-weight: 700; color: rgba(245,242,236,.5); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px; }
.rg-stat__value { display: block; font-size: 16px; font-weight: 700; color: #F5F2EC; }

/* ── Form ── */
.rg-form { display: flex; flex-direction: column; gap: 16px; }

.rg-field { display: flex; flex-direction: column; gap: 6px; }
.rg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.rg-label { font-size: 12px; font-weight: 700; color: rgba(245,242,236,.85); text-transform: uppercase; letter-spacing: .04em; }
.rg-label-sub { font-weight: 500; color: rgba(245,242,236,.4); text-transform: none; letter-spacing: 0; }

.rg-hint { font-size: 11.5px; color: rgba(245,242,236,.5); margin: 4px 0 0; line-height: 1.5; }
.rg-hint strong { color: #4ade80; font-weight: 700; }

.rg-input { width: 100%; padding: 13px 16px; border-radius: 12px; border: 1.5px solid rgba(245,242,236,.12); background: #16181A; color: #F5F2EC; font-family: inherit; font-size: 15px; outline: none; transition: border-color .15s, background .15s; box-sizing: border-box; }
.rg-input:focus { border-color: #4ade80; background: #1B1E1A; }
.rg-input::placeholder { color: rgba(245,242,236,.3); }

.rg-input--big { font-size: 28px; font-weight: 700; text-align: center; letter-spacing: .15em; padding: 18px; font-family: 'DM Serif Display', serif; }

/* ── Players ── */
.rg-player-input { display: flex; gap: 8px; }
.rg-player-input .rg-input { flex: 1; }
.rg-player-add { width: 48px; flex-shrink: 0; border-radius: 12px; border: 1.5px solid rgba(74,222,128,.4); background: rgba(74,222,128,.1); color: #4ade80; font-size: 22px; font-weight: 700; cursor: pointer; transition: all .15s; }
.rg-player-add:hover:not(:disabled) { background: rgba(74,222,128,.2); border-color: #4ade80; }
.rg-player-add:disabled { opacity: .3; cursor: not-allowed; }

.rg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.rg-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; border-radius: 999px; background: rgba(74,222,128,.08); border: 1px solid rgba(74,222,128,.2); color: #F5F2EC; font-size: 13px; }
.rg-chip__x { background: none; border: none; color: rgba(245,242,236,.5); font-size: 16px; cursor: pointer; padding: 0 6px; line-height: 1; transition: color .12s; }
.rg-chip__x:hover { color: #f87171; }

/* ── SINPE box ── */
.rg-sinpe { background: linear-gradient(160deg, #052e16 0%, #0B4D2C 100%); border: 1px solid rgba(74,222,128,.25); border-radius: 18px; padding: 24px 22px; margin-bottom: 28px; }
.rg-sinpe__label { font-size: 11px; font-weight: 700; color: rgba(245,242,236,.6); text-transform: uppercase; letter-spacing: .12em; margin: 0 0 6px; }
.rg-sinpe__amount { font-family: 'DM Serif Display', serif; font-size: 44px; line-height: 1; color: #F5F2EC; margin: 0 0 22px; letter-spacing: -.02em; }

.rg-sinpe__rows { display: flex; flex-direction: column; gap: 0; border-top: 1px solid rgba(245,242,236,.1); }
.rg-sinpe__row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(245,242,236,.08); }
.rg-sinpe__row:last-child { border-bottom: none; }
.rg-sinpe__row-label { font-size: 12px; color: rgba(245,242,236,.6); font-weight: 500; flex-shrink: 0; }
.rg-sinpe__row-value { font-size: 14px; color: #F5F2EC; font-weight: 700; text-align: right; display: flex; align-items: center; gap: 8px; }
.rg-sinpe__copy { background: none; border: 1px solid rgba(245,242,236,.2); color: rgba(245,242,236,.7); font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; cursor: pointer; font-family: inherit; }
.rg-sinpe__copy:hover { background: rgba(245,242,236,.1); color: #F5F2EC; }

/* ── Done stage ── */
.rg-done { text-align: center; }
.rg-done__check { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #16a34a, #15803d); color: white; font-size: 36px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 8px 24px rgba(22,163,74,.3); }
.rg-done__card { text-align: left; background: #16181A; border: 1px solid rgba(245,242,236,.08); border-radius: 14px; padding: 20px; margin: 28px 0 20px; }
.rg-done__card-title { font-size: 13px; font-weight: 700; color: rgba(245,242,236,.85); text-transform: uppercase; letter-spacing: .08em; margin: 0 0 12px; }
.rg-done__list { font-size: 14px; color: rgba(245,242,236,.8); line-height: 1.7; padding-left: 22px; margin: 0; }
.rg-done__list li { margin-bottom: 4px; }
.rg-done__list strong { color: #4ade80; font-weight: 700; }

/* ── Buttons ── */
.rg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; border-radius: 14px; font-size: 15px; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; transition: all .15s; text-decoration: none; }
.rg-btn--full { width: 100%; }
.rg-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 4px 18px rgba(22,163,74,.3); }
.rg-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(22,163,74,.4); }
.rg-btn--primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.rg-btn--ghost { background: rgba(245,242,236,.08); color: #F5F2EC; border: 1px solid rgba(245,242,236,.12); margin-top: 10px; }
.rg-btn--ghost:hover { background: rgba(245,242,236,.14); }
.rg-btn--whatsapp { background: #25D366; color: white; }
.rg-btn--whatsapp:hover { background: #1ebe5b; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,211,102,.3); }

.rg-link-btn { background: none; border: none; color: rgba(245,242,236,.55); font-size: 13px; font-family: inherit; cursor: pointer; padding: 12px; text-decoration: underline; margin: 0 auto; display: block; }
.rg-link-btn:hover { color: #F5F2EC; }

/* ── Error / fineprint ── */
.rg-error { padding: 12px 16px; border-radius: 10px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3); font-size: 13px; color: #f87171; font-weight: 500; }

.rg-fineprint { font-size: 11px; color: rgba(245,242,236,.4); text-align: center; line-height: 1.6; margin: 14px 0 0; }

/* ── Mobile ── */
@media (max-width: 480px) {
  .rg-h1 { font-size: 30px; }
  .rg-grid-2 { grid-template-columns: 1fr; }
  .rg-sinpe { padding: 20px 18px; }
  .rg-sinpe__amount { font-size: 38px; }
  .rg-input--big { font-size: 24px; }
}
`