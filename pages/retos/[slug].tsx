/**
 * GolPlay — pages/retos/[slug].tsx
 * Detalle del reto (público + panel privado vía ?ref=token)
 *
 * Migrado al DS oficial:
 *   - Theme: dark (envuelto en <div className="theme-light">).
 *   - Navbar: <Navbar /> reemplaza el header inline.
 *   - Tipografía: Syne (var(--font-d)) + DM Sans (body default).
 *   - Tokens CSS: var(--blue), var(--g6), var(--g7), var(--dark).
 *   - Back link "← Todos los retos" arriba (entrada al detalle).
 *   - Bug fix: useState(publicUrl) + useEffect movidos arriba del early return.
 *
 * Sin cambios:
 *   - getServerSideProps con resolución de role (publisher/acceptor/anonymous).
 *   - handleAccept / handleConfirm / handleCancel / handleFinish.
 *   - Edge function calls (manage-challenge).
 *   - localStorage de captain data + my challenges.
 *   - Construcción de URLs de WhatsApp.
 *
 * Vistas: anónimo · publisher (?ref=publisher_token) · acceptor (?ref=acceptance_token)
 */

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Captain {
  cedula: string
  preferred_name: string
  preferred_phone: string
  reliability_score: number | null
  challenges_finished: number
}

interface Acceptance {
  id: string
  team_name: string
  captain_cedula: string
  status: string
  created_at: string
  acceptance_token: string
  captain?: Captain
}

interface Challenge {
  id: string
  slug: string
  status: string
  venue_type: string
  complex_id: number | null
  complex_name: string | null
  complex_city: string | null
  complex_address: string | null
  complex_whatsapp: string | null
  complex_lat: number | null
  complex_lng: number | null
  field_id: number | null
  field_name: string | null
  venue_name: string | null
  venue_city: string | null
  venue_address: string | null
  venue_maps_url: string | null
  field_label: string | null
  sport: string
  match_date: string | null
  match_hour: string | null
  description: string | null
  team_name: string
  captain_cedula: string
  captain: Captain | null
  publisher_token_match: boolean
  publisher_phone: string | null
  active_acceptance: Acceptance | null
  matched_at: string | null
  match_expires_at: string | null
  created_at: string
}

type ViewerRole = 'anonymous' | 'publisher' | 'acceptor'

interface Props {
  challenge: Challenge | null
  viewerRole: ViewerRole
  acceptanceTokenPresent: string | null
  justCreated: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORT_META: Record<string, { label: string; emoji: string; color: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽',  color: '#3a5bf0' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽',  color: '#3a5bf0' },
  futbol8:  { label: 'Fútbol 8',  emoji: '⚽',  color: '#3a5bf0' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽',  color: '#3a5bf0' },
  padel:    { label: 'Pádel',     emoji: '🎾',  color: '#eab308' },
  tenis:    { label: 'Tenis',     emoji: '🎾',  color: '#eab308' },
  basquet:  { label: 'Básquet',   emoji: '🏀',  color: '#f97316' },
  otro:     { label: 'Otro',      emoji: '🏟', color: '#6b7280' },
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:      { label: 'Buscando rival', color: '#d4f24d',              bg: 'rgba(58,91,240,.1)'  },
  matched:   { label: 'Rival aceptó',   color: '#fbbf24',              bg: 'rgba(251,191,36,.1)'  },
  confirmed: { label: 'Confirmado',     color: '#d4f24d',              bg: 'rgba(58,91,240,.15)' },
  finished:  { label: 'Jugado',         color: '#a78bfa',              bg: 'rgba(167,139,250,.1)' },
  cancelled: { label: 'Cancelado',      color: '#f87171',              bg: 'rgba(248,113,113,.1)' },
  expired:   { label: 'Expirado',       color: 'var(--muted)', bg: 'var(--line)' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const fmtPhone = (p: string | null) => {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`
  return p
}

const onlyDigits = (s: string, max?: number) => {
  const d = s.replace(/\D/g, '')
  return max ? d.slice(0, max) : d
}

// ─── SSR ──────────────────────────────────────────────────────────────────────
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.slug ?? '').toLowerCase()
  const ref = ctx.query.ref ? String(ctx.query.ref) : null
  const justCreated = ctx.query.just_created === '1'

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: rawCh } = await sb
    .from('challenges')
    .select(`
      id, slug, status, venue_type, complex_id, field_id,
      venue_name, venue_city, venue_address, venue_maps_url, field_label,
      sport, match_date, match_hour, description,
      team_name, captain_cedula, publisher_token,
      matched_at, match_expires_at, created_at
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (!rawCh) {
    return { props: { challenge: null, viewerRole: 'anonymous', acceptanceTokenPresent: null, justCreated: false } }
  }

  const ch = rawCh as any

  let viewerRole: ViewerRole = 'anonymous'
  let acceptanceTokenPresent: string | null = null
  let publisher_token_match = false

  if (ref) {
    if (ref === ch.publisher_token) {
      viewerRole = 'publisher'
      publisher_token_match = true
    } else {
      const { data: acc } = await sb
        .from('challenge_acceptances')
        .select('id, acceptance_token, challenge_id')
        .eq('acceptance_token', ref)
        .eq('challenge_id', ch.id)
        .maybeSingle()
      if (acc) {
        viewerRole = 'acceptor'
        acceptanceTokenPresent = ref
      }
    }
  }

  let complex_name: string | null = null
  let complex_city: string | null = null
  let complex_address: string | null = null
  let complex_whatsapp: string | null = null
  let complex_lat: number | null = null
  let complex_lng: number | null = null
  let field_name: string | null = null

  if (ch.complex_id) {
    const { data: cx } = await sb
      .from('complexes')
      .select('name, city, address, whatsapp, latitude, longitude')
      .eq('id', ch.complex_id)
      .maybeSingle()
    if (cx) {
      complex_name     = (cx as any).name
      complex_city     = (cx as any).city
      complex_address  = (cx as any).address
      complex_whatsapp = (cx as any).whatsapp
      complex_lat      = (cx as any).latitude
      complex_lng      = (cx as any).longitude
    }
  }

  if (ch.field_id) {
    const { data: fd } = await sb.from('fields').select('name').eq('id', ch.field_id).maybeSingle()
    if (fd) field_name = (fd as any).name
  }

  const { data: pubCap } = await sb
    .from('captains')
    .select('cedula, preferred_name, preferred_phone, reliability_score, challenges_finished')
    .eq('cedula', ch.captain_cedula)
    .maybeSingle()

  const { data: rawAcc } = await sb
    .from('challenge_acceptances')
    .select('id, team_name, captain_cedula, status, created_at, acceptance_token')
    .eq('challenge_id', ch.id)
    .eq('status', 'active')
    .maybeSingle()

  let active_acceptance: Acceptance | null = null

  if (rawAcc) {
    const { data: accCap } = await sb
      .from('captains')
      .select('cedula, preferred_name, preferred_phone, reliability_score, challenges_finished')
      .eq('cedula', (rawAcc as any).captain_cedula)
      .maybeSingle()

    active_acceptance = {
      id:               (rawAcc as any).id,
      team_name:        (rawAcc as any).team_name,
      captain_cedula:   (rawAcc as any).captain_cedula,
      status:           (rawAcc as any).status,
      created_at:       (rawAcc as any).created_at,
      acceptance_token: viewerRole === 'publisher' ? (rawAcc as any).acceptance_token : '',
      captain:          (accCap as Captain | null) ?? undefined,
    }
  }

  const publisher_phone = viewerRole === 'acceptor' || viewerRole === 'publisher'
    ? (pubCap as any)?.preferred_phone ?? null
    : null

  const challenge: Challenge = {
    id: ch.id,
    slug: ch.slug,
    status: ch.status,
    venue_type: ch.venue_type,
    complex_id: ch.complex_id,
    complex_name, complex_city, complex_address, complex_whatsapp, complex_lat, complex_lng,
    field_id: ch.field_id,
    field_name,
    venue_name: ch.venue_name,
    venue_city: ch.venue_city,
    venue_address: ch.venue_address,
    venue_maps_url: ch.venue_maps_url,
    field_label: ch.field_label,
    sport: ch.sport,
    match_date: ch.match_date,
    match_hour: ch.match_hour,
    description: ch.description,
    team_name: ch.team_name,
    captain_cedula: ch.captain_cedula,
    captain: pubCap as Captain | null,
    publisher_token_match,
    publisher_phone,
    active_acceptance,
    matched_at: ch.matched_at,
    match_expires_at: ch.match_expires_at,
    created_at: ch.created_at,
  }

  return { props: { challenge, viewerRole, acceptanceTokenPresent, justCreated } }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChallengeDetailPage({ challenge, viewerRole, acceptanceTokenPresent, justCreated }: Props) {
  const router = useRouter()

  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [acting, setActing] = useState(false)
  const [error,  setError]  = useState('')
  const [toast,  setToast]  = useState<{ msg: string; ok: boolean } | null>(null)

  const [aCedula,       setACedula]       = useState('')
  const [aTeamName,     setATeamName]     = useState('')
  const [aCaptainName,  setACaptainName]  = useState('')
  const [aCaptainPhone, setACaptainPhone] = useState('')
  const [aCaptainEmail, setACaptainEmail] = useState('')

  // Moved up from after the early return (was a hooks-order bug).
  const [publicUrl, setPublicUrl] = useState('')
  useEffect(() => {
    if (typeof window !== 'undefined' && challenge) {
      setPublicUrl(`${window.location.origin}/retos/${challenge.slug}`)
    }
  }, [challenge])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('golplay_captain_data')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.cedula)        setACedula(d.cedula)
        if (d.captain_name)  setACaptainName(d.captain_name)
        if (d.captain_phone) setACaptainPhone(d.captain_phone)
        if (d.captain_email) setACaptainEmail(d.captain_email)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (justCreated) {
      showToast('🎉 Reto publicado — guardá este link para volver')
    }
  }, [justCreated])

  const canSubmitAccept = useMemo(() => {
    return aCedula.length === 9
      && aTeamName.trim().length > 0
      && aCaptainName.trim().length > 0
      && aCaptainPhone.length === 8
  }, [aCedula, aTeamName, aCaptainName, aCaptainPhone])

  const handleAccept = async () => {
    if (!challenge || !canSubmitAccept) return
    setError('')

    if (challenge.captain_cedula === aCedula) {
      setError('No podés aceptar tu propio reto')
      return
    }

    setActing(true)

    const { data, error: fnErr } = await supabase.functions.invoke('manage-challenge?action=accept', {
      body: {
        challenge_id:  challenge.id,
        cedula:        aCedula,
        team_name:     aTeamName.trim(),
        captain_name:  aCaptainName.trim(),
        captain_phone: aCaptainPhone,
        captain_email: aCaptainEmail.trim() || null,
      },
    })

    setActing(false)

    if (fnErr || !data?.ok) {
      const msg = (data as any)?.error ?? fnErr?.message ?? 'Error aceptando el reto'
      setError(msg)
      return
    }

    try {
      localStorage.setItem('golplay_captain_data', JSON.stringify({
        cedula: aCedula, captain_name: aCaptainName, captain_phone: aCaptainPhone, captain_email: aCaptainEmail,
      }))
      const stored = localStorage.getItem('golplay_my_challenges')
      const arr = stored ? JSON.parse(stored) : []
      arr.unshift({
        slug:      challenge.slug,
        role:      'acceptor',
        token:     data.acceptance_token,
        team_name: aTeamName,
        saved_at:  new Date().toISOString(),
      })
      localStorage.setItem('golplay_my_challenges', JSON.stringify(arr.slice(0, 20)))
    } catch {}

    const pubPhone = data.publisher?.phone
    const pubName  = data.publisher?.name ?? 'capitán'

    if (pubPhone) {
      const text = `Hola ${pubName}, soy ${aCaptainName} del equipo *${aTeamName}*. Acepté tu reto de *${SPORT_META[challenge.sport]?.label ?? challenge.sport}* en GolPlay. ¿Confirmamos?\n\nEnlace del reto: golplay.app/retos/${challenge.slug}`
      const wa = `https://wa.me/506${pubPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
      window.open(wa, '_blank')
    }

    router.replace(`/retos/${challenge.slug}?ref=${data.acceptance_token}`)
  }

  const handleConfirm = async () => {
    if (!challenge || !router.query.ref) return
    if (!confirm('¿Confirmás que ya hablaste con el rival y van a jugar?')) return
    setActing(true)
    const { data, error: fnErr } = await supabase.functions.invoke('manage-challenge?action=confirm', {
      body: { challenge_id: challenge.id, publisher_token: String(router.query.ref) },
    })
    setActing(false)
    if (fnErr || !data?.ok) {
      showToast((data as any)?.error ?? 'Error confirmando', false)
      return
    }
    showToast('✅ Reto confirmado')
    router.replace(router.asPath)
  }

  const handleCancel = async () => {
    if (!challenge || !router.query.ref) return
    if (!confirm('¿Cancelar el reto? Esta acción no se puede deshacer.')) return
    setActing(true)
    const { data, error: fnErr } = await supabase.functions.invoke('manage-challenge?action=cancel', {
      body: { challenge_id: challenge.id, publisher_token: String(router.query.ref) },
    })
    setActing(false)
    if (fnErr || !data?.ok) {
      showToast((data as any)?.error ?? 'Error cancelando', false)
      return
    }
    showToast('Reto cancelado')
    router.push('/retos')
  }

  const handleFinish = async () => {
    if (!challenge || !router.query.ref) return
    if (!confirm('¿Marcar el partido como jugado?')) return
    setActing(true)
    const { data, error: fnErr } = await supabase.functions.invoke('manage-challenge?action=finish', {
      body: { challenge_id: challenge.id, token: String(router.query.ref) },
    })
    setActing(false)
    if (fnErr || !data?.ok) {
      showToast((data as any)?.error ?? 'Error', false)
      return
    }
    showToast('🏆 Partido marcado como jugado')
    router.replace(router.asPath)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      showToast('Link copiado 📋')
    } catch {
      showToast('No se pudo copiar', false)
    }
  }

  // ─── Not found ────────────────────────────────────────────────────────────
  if (!challenge) {
    return (
      <>
        <Head><title>Reto no encontrado · GolPlay</title></Head>
        <style>{CSS}</style>
        <div className="theme-light">
          <Navbar />
          <div className="rd-404">
            <span className="rd-404__emoji">⚔️</span>
            <h1 className="rd-404__title">Reto no encontrado</h1>
            <p className="rd-404__sub">Este reto no existe o ya fue eliminado.</p>
            <Link href="/retos" className="rd-btn rd-btn--primary">← Ver todos los retos</Link>
          </div>
        </div>
      </>
    )
  }

  // ─── Computed ─────────────────────────────────────────────────────────────
  const sp = SPORT_META[challenge.sport] ?? SPORT_META.otro
  const st = STATUS_META[challenge.status] ?? STATUS_META.open

  const venue = challenge.venue_type === 'golplay' && challenge.complex_name
    ? `${challenge.complex_name}${challenge.field_name ? ' · ' + challenge.field_name : ''}`
    : challenge.venue_type === 'external' && challenge.venue_name
    ? `${challenge.venue_name}${challenge.field_label ? ' · ' + challenge.field_label : ''}`
    : 'Cancha a definir'

  const city    = challenge.complex_city || challenge.venue_city
  const address = challenge.complex_address || challenge.venue_address
  const mapsUrl = challenge.venue_maps_url
    ?? (challenge.complex_lat && challenge.complex_lng
        ? `https://www.google.com/maps?q=${challenge.complex_lat},${challenge.complex_lng}`
        : null)
  const wazeUrl = (challenge.complex_lat && challenge.complex_lng)
    ? `https://waze.com/ul?ll=${challenge.complex_lat},${challenge.complex_lng}&navigate=yes`
    : null

  const pubScore     = challenge.captain?.reliability_score
  const pubFinished  = challenge.captain?.challenges_finished ?? 0
  const showPubScore = pubScore !== null && pubScore !== undefined && pubFinished >= 3

  const accScore     = challenge.active_acceptance?.captain?.reliability_score ?? null
  const accFinished  = challenge.active_acceptance?.captain?.challenges_finished ?? 0
  const showAccScore = accScore !== null && accFinished >= 3

  const isClosed = ['cancelled', 'finished', 'expired'].includes(challenge.status)

  const handleShareWhatsApp = () => {
    const text = `⚔️ Reto en GolPlay\n\n${challenge.team_name} busca rival\n${sp.emoji} ${sp.label}\n📅 ${challenge.match_date ? fmtDate(challenge.match_date) : 'Fecha a definir'}${challenge.match_hour ? ' · ' + challenge.match_hour : ''}\n📍 ${venue}${city ? ' · ' + city : ''}\n\n${publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  // URLs de WhatsApp pre-armadas
  const acceptorWhatsAppText = challenge.publisher_phone
    ? `Hola ${challenge.captain?.preferred_name ?? ''}, soy del equipo que aceptó tu reto de ${sp.label} en GolPlay. ¿Confirmamos?`
    : ''
  const acceptorWhatsAppUrl = challenge.publisher_phone
    ? `https://wa.me/506${challenge.publisher_phone.replace(/\D/g, '')}?text=${encodeURIComponent(acceptorWhatsAppText)}`
    : '#'

  const publisherWhatsAppText = challenge.active_acceptance?.captain?.preferred_phone
    ? `Hola, soy del equipo ${challenge.team_name}. Aceptaste mi reto en GolPlay, ¿confirmamos los detalles?`
    : ''
  const publisherWhatsAppUrl = challenge.active_acceptance?.captain?.preferred_phone
    ? `https://wa.me/506${challenge.active_acceptance.captain.preferred_phone.replace(/\D/g, '')}?text=${encodeURIComponent(publisherWhatsAppText)}`
    : '#'

  const complexWhatsAppText = challenge.complex_whatsapp
    ? `Hola, vimos un reto publicado en ${challenge.complex_name} en GolPlay. ¿Tienen disponibilidad?`
    : ''
  const complexWhatsAppUrl = challenge.complex_whatsapp
    ? `https://wa.me/506${challenge.complex_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(complexWhatsAppText)}`
    : '#'

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>{challenge.team_name} busca rival · GolPlay</title>
        <meta name="description" content={`${challenge.team_name} busca rival para ${sp.label}${challenge.match_date ? ' el ' + fmtDate(challenge.match_date) : ''}${city ? ' en ' + city : ''}.`} />
      </Head>
      <style>{CSS}</style>

      {toast && (
        <div className={`rd-toast ${toast.ok ? 'rd-toast--ok' : 'rd-toast--err'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div className="theme-light">
        <Navbar />

        <div className="rd">
          <div className="rd-top">
            <Link href="/retos" className="rd-top__back">← Todos los retos</Link>
          </div>

          <div className="rd-hero">
            <div className="rd-hero__head">
              <span className="rd-hero__sport" style={{ color: sp.color, background: sp.color + '20' }}>
                {sp.emoji} {sp.label}
              </span>
              <span className="rd-hero__status" style={{ color: st.color, background: st.bg }}>
                {st.label}
              </span>
            </div>

            <div className="rd-hero__matchup">
              <div className="rd-hero__team">
                <div className="rd-hero__avatar">{challenge.team_name[0].toUpperCase()}</div>
                <p className="rd-hero__team-name">{challenge.team_name}</p>
                {showPubScore && (
                  <span className="rd-hero__score">⭐ {Math.round(pubScore! * 100)}% · {pubFinished} jugados</span>
                )}
                {!showPubScore && <span className="rd-hero__score rd-hero__score--new">Capitán nuevo</span>}
              </div>

              <span className="rd-hero__vs">VS</span>

              <div className="rd-hero__team">
                {challenge.active_acceptance ? (
                  <>
                    <div className="rd-hero__avatar rd-hero__avatar--matched">
                      {challenge.active_acceptance.team_name[0].toUpperCase()}
                    </div>
                    <p className="rd-hero__team-name">{challenge.active_acceptance.team_name}</p>
                    {showAccScore && (
                      <span className="rd-hero__score">⭐ {Math.round(accScore! * 100)}% · {accFinished} jugados</span>
                    )}
                    {!showAccScore && <span className="rd-hero__score rd-hero__score--new">Capitán nuevo</span>}
                  </>
                ) : (
                  <>
                    <div className="rd-hero__avatar rd-hero__avatar--empty">?</div>
                    <p className="rd-hero__team-name rd-hero__team-name--empty">¿Tu equipo?</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {viewerRole === 'acceptor' && challenge.publisher_phone && (
            <div className="rd-panel rd-panel--acceptor">
              <p className="rd-panel__eyebrow">TU LADO</p>
              <h2 className="rd-panel__title">Aceptaste este reto ✓</h2>
              <p className="rd-panel__sub">Contactá al publicador para confirmar fecha, hora y detalles.</p>

              <div className="rd-contact">
                <div className="rd-contact__avatar">{challenge.captain?.preferred_name?.[0]?.toUpperCase() ?? '?'}</div>
                <div className="rd-contact__info">
                  <p className="rd-contact__name">{challenge.captain?.preferred_name}</p>
                  <p className="rd-contact__role">Capitán de {challenge.team_name}</p>
                  <p className="rd-contact__phone">{fmtPhone(challenge.publisher_phone)}</p>
                </div>
              </div>

              <a href={acceptorWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="rd-btn rd-btn--whatsapp rd-btn--full">
                💬 Contactar por WhatsApp
              </a>

              <div className="rd-warning">
                ⚠️ Si no contactás al publicador en las próximas horas, el reto vuelve a estar abierto y tu aceptación se cancela.
              </div>

              {challenge.status === 'matched' && (
                <button className="rd-btn rd-btn--ghost rd-btn--full" onClick={handleFinish} disabled={acting}>
                  🏆 Marcar como jugado
                </button>
              )}
            </div>
          )}

          {viewerRole === 'publisher' && (
            <div className="rd-panel rd-panel--publisher">
              <p className="rd-panel__eyebrow">PANEL DEL PUBLICADOR</p>
              <h2 className="rd-panel__title">Tu reto: {challenge.team_name}</h2>

              {challenge.status === 'open' && (
                <>
                  <p className="rd-panel__sub">Compartí el link con grupos de WhatsApp para que más equipos lo vean.</p>
                  <div className="rd-link-box">
                    <code className="rd-link">{publicUrl}</code>
                  </div>
                  <div className="rd-actions-row">
                    <button className="rd-btn rd-btn--ghost" onClick={handleCopyLink}>📋 Copiar link</button>
                    <button className="rd-btn rd-btn--whatsapp" onClick={handleShareWhatsApp}>💬 Compartir</button>
                  </div>
                  <button className="rd-btn rd-btn--danger rd-btn--full" onClick={handleCancel} disabled={acting} style={{ marginTop: 16 }}>
                    Cancelar reto
                  </button>
                </>
              )}

              {challenge.status === 'matched' && challenge.active_acceptance && (
                <>
                  <p className="rd-panel__sub">Un equipo aceptó tu reto. Esperá su WhatsApp o contactalos vos.</p>

                  <div className="rd-contact">
                    <div className="rd-contact__avatar">
                      {challenge.active_acceptance.captain?.preferred_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="rd-contact__info">
                      <p className="rd-contact__name">{challenge.active_acceptance.captain?.preferred_name}</p>
                      <p className="rd-contact__role">Capitán de {challenge.active_acceptance.team_name}</p>
                      <p className="rd-contact__phone">{fmtPhone(challenge.active_acceptance.captain?.preferred_phone ?? null)}</p>
                    </div>
                  </div>

                  {challenge.active_acceptance.captain?.preferred_phone && (
                    <a href={publisherWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="rd-btn rd-btn--whatsapp rd-btn--full">
                      💬 WhatsApp al rival
                    </a>
                  )}

                  <p className="rd-hint">Cuando ya hayan acordado todo, marcá "Reto confirmado" para fijar el partido.</p>

                  <div className="rd-actions-row">
                    <button className="rd-btn rd-btn--danger" onClick={handleCancel} disabled={acting}>
                      Cancelar
                    </button>
                    <button className="rd-btn rd-btn--primary" onClick={handleConfirm} disabled={acting}>
                      ✅ Reto confirmado
                    </button>
                  </div>
                </>
              )}

              {challenge.status === 'confirmed' && (
                <>
                  <p className="rd-panel__sub">El partido está confirmado. Cuando jueguen, marcalo como finalizado.</p>
                  <button className="rd-btn rd-btn--primary rd-btn--full" onClick={handleFinish} disabled={acting}>
                    🏆 Marcar como jugado
                  </button>
                </>
              )}

              {isClosed && (
                <p className="rd-panel__sub">Este reto está cerrado.</p>
              )}
            </div>
          )}

          {viewerRole === 'anonymous' && challenge.status === 'open' && (
            <div className="rd-cta">
              <button className="rd-btn rd-btn--primary rd-btn--big rd-btn--full" onClick={() => setAcceptModalOpen(true)}>
                ⚡ Aceptar este reto
              </button>
              <p className="rd-cta__sub">El primero que acepte gana. Después se ponen de acuerdo por WhatsApp.</p>
            </div>
          )}

          {viewerRole === 'anonymous' && challenge.status === 'matched' && (
            <div className="rd-cta-closed">
              <span>🤝</span>
              <p>Otro equipo ya aceptó este reto. Estamos esperando que confirmen los detalles.</p>
            </div>
          )}

          {viewerRole === 'anonymous' && (challenge.status === 'confirmed' || challenge.status === 'finished') && (
            <div className="rd-cta-closed">
              <span>{challenge.status === 'finished' ? '🏆' : '✅'}</span>
              <p>{challenge.status === 'finished' ? 'Este partido ya se jugó.' : 'Este reto ya está confirmado.'}</p>
            </div>
          )}

          <section className="rd-section">
            <h2 className="rd-section__title">Detalles del partido</h2>
            <div className="rd-details">
              <div className="rd-detail">
                <span className="rd-detail__icon">📅</span>
                <div>
                  <p className="rd-detail__label">Fecha</p>
                  <p className="rd-detail__value">{challenge.match_date ? fmtDate(challenge.match_date) : 'A definir entre capitanes'}</p>
                </div>
              </div>
              {challenge.match_hour && (
                <div className="rd-detail">
                  <span className="rd-detail__icon">⏰</span>
                  <div>
                    <p className="rd-detail__label">Hora</p>
                    <p className="rd-detail__value">{challenge.match_hour}</p>
                  </div>
                </div>
              )}
              <div className="rd-detail">
                <span className="rd-detail__icon">📍</span>
                <div>
                  <p className="rd-detail__label">{challenge.venue_type === 'golplay' ? 'Cancha verificada' : challenge.venue_type === 'external' ? 'Cancha externa' : 'A definir'}</p>
                  <p className="rd-detail__value">{venue}</p>
                  {city && <p className="rd-detail__sub">{city}</p>}
                  {address && <p className="rd-detail__sub">{address}</p>}
                </div>
              </div>
              {challenge.description && (
                <div className="rd-detail">
                  <span className="rd-detail__icon">💬</span>
                  <div>
                    <p className="rd-detail__label">Descripción</p>
                    <p className="rd-detail__value">{challenge.description}</p>
                  </div>
                </div>
              )}
            </div>

            {(mapsUrl || wazeUrl || challenge.complex_whatsapp) && (
              <div className="rd-detail-actions">
                {mapsUrl && (
                  <a className="rd-btn rd-btn--ghost rd-btn--sm" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    🗺 Google Maps
                  </a>
                )}
                {wazeUrl && (
                  <a className="rd-btn rd-btn--ghost rd-btn--sm" href={wazeUrl} target="_blank" rel="noopener noreferrer">
                    🚗 Waze
                  </a>
                )}
                {challenge.complex_whatsapp && (
                  <a className="rd-btn rd-btn--ghost rd-btn--sm" href={complexWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                    💬 WhatsApp del complejo
                  </a>
                )}
              </div>
            )}
          </section>

          <footer className="rd-foot">
            <p className="rd-foot__brand">GolPlay</p>
            <p className="rd-foot__sub">Encontrá rival, jugá hoy.</p>
          </footer>
        </div>
      </div>

      {acceptModalOpen && (
        <div className="rd-modal-bg" onClick={e => { if (e.target === e.currentTarget) setAcceptModalOpen(false) }}>
          <div className="rd-modal">
            <div className="rd-modal__header">
              <div>
                <p className="rd-modal__eyebrow">ACEPTAR RETO</p>
                <h3 className="rd-modal__title">{challenge.team_name} vs tu equipo</h3>
              </div>
              <button className="rd-modal__close" onClick={() => setAcceptModalOpen(false)}>✕</button>
            </div>

            <div className="rd-modal__body">
              <div className="rd-field">
                <label className="rd-label">Cédula * <span className="rd-label-sub">(9 dígitos)</span></label>
                <input className="rd-input" type="tel" inputMode="numeric" placeholder="123456789" value={aCedula} onChange={e => setACedula(onlyDigits(e.target.value, 9))} maxLength={9} />
              </div>

              <div className="rd-field">
                <label className="rd-label">Nombre de tu equipo *</label>
                <input className="rd-input" placeholder="Ej: Tigres FC" value={aTeamName} onChange={e => setATeamName(e.target.value)} maxLength={50} />
              </div>

              <div className="rd-field">
                <label className="rd-label">Tu nombre completo *</label>
                <input className="rd-input" placeholder="Tu nombre" value={aCaptainName} onChange={e => setACaptainName(e.target.value)} maxLength={80} />
              </div>

              <div className="rd-grid-2">
                <div className="rd-field">
                  <label className="rd-label">Teléfono *</label>
                  <input className="rd-input" type="tel" inputMode="numeric" placeholder="8888-8888" value={aCaptainPhone} onChange={e => setACaptainPhone(onlyDigits(e.target.value, 8))} />
                </div>
                <div className="rd-field">
                  <label className="rd-label">Email (opcional)</label>
                  <input className="rd-input" type="email" placeholder="tu@email.com" value={aCaptainEmail} onChange={e => setACaptainEmail(e.target.value)} />
                </div>
              </div>

              {error && <div className="rd-error">⚠️ {error}</div>}

              <button className="rd-btn rd-btn--primary rd-btn--full" onClick={handleAccept} disabled={acting || !canSubmitAccept}>
                {acting ? 'Aceptando…' : '⚡ Aceptar y abrir WhatsApp'}
              </button>

              <p className="rd-hint" style={{ textAlign: 'center', marginTop: 8 }}>
                Después de aceptar, te abrimos WhatsApp con un mensaje al publicador.
                Tenés 8 horas para contactarlo o el reto vuelve a estar abierto.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
.rd {
  min-height: 100vh;
  padding-top: 62px;
  padding-bottom: 80px;
}

/* — 404 ──────────────────────────────────────────────────────── */
.rd-404 {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  gap: 12px;
}
.rd-404__emoji { font-size: 64px; opacity: .6; margin-bottom: 8px; }
.rd-404__title {
  font-family: var(--font-d);
  font-size: 32px;
  font-weight: 800;
  color:var(--ink);
  margin: 0;
}
.rd-404__sub {
  font-size: 14px;
  color: var(--muted);
  max-width: 400px;
  line-height: 1.6;
  margin: 0 0 20px;
}

/* — Top back ─────────────────────────────────────────────────── */
.rd-top {
  display: flex;
  align-items: center;
  padding: 18px 22px;
  max-width: 720px;
  margin: 0 auto;
}
.rd-top__back {
  font-size: 13px;
  color: var(--ink2);
  text-decoration: none;
  font-weight: 500;
  transition: color .15s;
}
.rd-top__back:hover { color: var(--blue); }

/* — Hero ─────────────────────────────────────────────────────── */
.rd-hero {
  max-width: 720px;
  margin: 8px auto 24px;
  padding: 24px 22px;
  background: linear-gradient(160deg, #141a33 0%, #26379e 100%);
  border-radius: 22px;
}
.rd-hero__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.rd-hero__sport,
.rd-hero__status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.rd-hero__matchup {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
}
.rd-hero__team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.rd-hero__avatar {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: rgba(58,91,240,.2);
  border: 2px solid rgba(58,91,240,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: var(--blue);
  font-family: var(--font-d);
}
.rd-hero__avatar--empty {
  background: var(--line);
  border: 2px dashed var(--faint);
  color: var(--muted);
}
.rd-hero__avatar--matched {
  background: rgba(251,191,36,.18);
  border-color: rgba(251,191,36,.4);
  color: #fbbf24;
}
.rd-hero__team-name {
  font-size: 14px;
  font-weight: 800;
  color:var(--ink);
  margin: 0;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.rd-hero__team-name--empty { color: var(--muted); font-weight: 500; }
.rd-hero__score { font-size: 11px; color: #fbbf24; font-weight: 600; }
.rd-hero__score--new { color: var(--muted); font-weight: 500; }
.rd-hero__vs {
  font-family: var(--font-d);
  font-size: 24px;
  font-weight: 800;
  color: var(--muted);
  letter-spacing: .05em;
}

/* — Panels ───────────────────────────────────────────────────── */
.rd-panel {
  max-width: 720px;
  margin: 0 auto 22px;
  padding: 22px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid var(--line);
}
.rd-panel--acceptor {
  border-color: rgba(58,91,240,.3);
  background: linear-gradient(160deg, rgba(58,91,240,.04), rgba(58,91,240,.08));
}
.rd-panel--publisher {
  border-color: rgba(251,191,36,.3);
  background: linear-gradient(160deg, rgba(251,191,36,.04), rgba(251,191,36,.08));
}
.rd-panel__eyebrow {
  font-size: 10px;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: .12em;
  margin: 0 0 6px;
}
.rd-panel--publisher .rd-panel__eyebrow { color: #fbbf24; }
.rd-panel__title {
  font-family: var(--font-d);
  font-size: 24px;
  font-weight: 800;
  color:var(--ink);
  margin: 0 0 8px;
}
.rd-panel__sub {
  font-size: 14px;
  color: var(--ink2);
  line-height: 1.5;
  margin: 0 0 16px;
}

/* — Contact card ─────────────────────────────────────────────── */
.rd-contact {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  margin-bottom: 16px;
}
.rd-contact__avatar {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: rgba(58,91,240,.18);
  border: 2px solid rgba(58,91,240,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: var(--blue);
  flex-shrink: 0;
  font-family: var(--font-d);
}
.rd-contact__info { flex: 1; min-width: 0; }
.rd-contact__name {
  font-size: 16px;
  font-weight: 700;
  color:var(--ink);
  margin: 0 0 3px;
}
.rd-contact__role {
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 4px;
}
.rd-contact__phone {
  font-size: 14px;
  color: var(--blue);
  font-weight: 600;
  margin: 0;
}

.rd-warning {
  padding: 12px 14px;
  background: rgba(251,191,36,.08);
  border: 1px solid rgba(251,191,36,.25);
  border-radius: 10px;
  font-size: 12.5px;
  color: #fbbf24;
  line-height: 1.5;
  margin: 14px 0;
}

.rd-link-box {
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 12px;
}
.rd-link {
  font-size: 12px;
  color: var(--ink2);
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.rd-actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.rd-actions-row .rd-btn { flex: 1; justify-content: center; }

/* — CTA ──────────────────────────────────────────────────────── */
.rd-cta {
  max-width: 720px;
  margin: 0 auto 22px;
  padding: 0 22px;
  text-align: center;
}
.rd-cta__sub {
  font-size: 12px;
  color: var(--muted);
  margin: 12px 0 0;
}
.rd-cta-closed {
  max-width: 720px;
  margin: 0 auto 22px;
  padding: 18px 22px;
  text-align: center;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
}
.rd-cta-closed span {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
  opacity: .8;
}
.rd-cta-closed p {
  font-size: 14px;
  color: var(--ink2);
  margin: 0;
}

/* — Section ──────────────────────────────────────────────────── */
.rd-section {
  max-width: 720px;
  margin: 0 auto 22px;
  padding: 0 22px;
}
.rd-section__title {
  font-family: var(--font-d);
  font-size: 22px;
  font-weight: 800;
  color:var(--ink);
  margin: 0 0 14px;
}
.rd-details {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.rd-detail {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}
.rd-detail:last-child { border-bottom: none; }
.rd-detail__icon {
  font-size: 18px;
  opacity: .8;
  flex-shrink: 0;
  width: 24px;
}
.rd-detail__label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin: 0 0 4px;
}
.rd-detail__value {
  font-size: 14px;
  color:var(--ink);
  font-weight: 500;
  margin: 0 0 2px;
  line-height: 1.4;
}
.rd-detail__sub {
  font-size: 12.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

.rd-detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

/* — Footer ───────────────────────────────────────────────────── */
.rd-foot {
  max-width: 720px;
  margin: 50px auto 0;
  padding: 30px 24px;
  text-align: center;
  border-top: 1px solid var(--line);
}
.rd-foot__brand {
  font-family: var(--font-d);
  font-size: 18px;
  font-weight: 800;
  color:var(--ink);
  margin: 0 0 4px;
}
.rd-foot__sub {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

/* — Buttons ──────────────────────────────────────────────────── */
.rd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-d);
  cursor: pointer;
  border: none;
  text-decoration: none;
  transition: all .15s;
}
.rd-btn--full { width: 100%; }
.rd-btn--big  { padding: 16px 28px; font-size: 15px; }
.rd-btn--sm   { padding: 8px 14px; font-size: 12px; }
.rd-btn--primary {
  background: var(--blue);
  color:#fff;
  box-shadow: 0 4px 16px rgba(58,91,240,.3);
}
.rd-btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(58,91,240,.4);
}
.rd-btn--primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.rd-btn--ghost {
  background: var(--line);
  color:var(--ink);
  border: 1px solid var(--line);
}
.rd-btn--ghost:hover { background: rgba(255,255,255,.14); }
.rd-btn--whatsapp { background: #25D366; color:var(--ink); }
.rd-btn--whatsapp:hover { background: #4a68f5; transform: translateY(-1px); }
.rd-btn--danger {
  background: rgba(248,113,113,.1);
  color: #f87171;
  border: 1px solid rgba(248,113,113,.25);
}
.rd-btn--danger:hover:not(:disabled) { background: rgba(248,113,113,.18); }

.rd-hint {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 8px 0;
}

/* — Toast ────────────────────────────────────────────────────── */
.rd-toast {
  position: fixed;
  top: 22px;
  right: 22px;
  z-index: 1000;
  padding: 12px 18px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 8px 28px rgba(20,26,51,.12);
  animation: rdSlideIn .25s ease;
}
@keyframes rdSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: none; }
}
.rd-toast--ok  { background: var(--g7); color:var(--ink); }
.rd-toast--err { background: #b91c1c; color:var(--ink); }

/* — Modal ────────────────────────────────────────────────────── */
.rd-modal-bg {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9500;
  padding: 20px;
  animation: rdFadeIn .15s ease;
}
@keyframes rdFadeIn { from { opacity: 0; } to { opacity: 1; } }
.rd-modal {
  background:#fff;
  border: 1px solid var(--line);
  border-radius: 22px;
  width: 100%;
  max-width: 480px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: rdSlideUp .2s ease;
}
@keyframes rdSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}
.rd-modal__header {
  padding: 22px 24px 20px;
  background: linear-gradient(160deg, #141a33, #26379e);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.rd-modal__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
  color: var(--muted);
  text-transform: uppercase;
  margin: 0 0 4px;
}
.rd-modal__title {
  font-family: var(--font-d);
  font-size: 18px;
  font-weight: 800;
  color:var(--ink);
  margin: 0;
}
.rd-modal__close {
  background: var(--line);
  border: 1px solid var(--line);
  color: var(--ink2);
  width: 32px;
  height: 32px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}
.rd-modal__close:hover { background: var(--faint); color:var(--ink); }
.rd-modal__body {
  padding: 20px 24px 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* — Fields ───────────────────────────────────────────────────── */
.rd-field { display: flex; flex-direction: column; gap: 6px; }
.rd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rd-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.rd-label-sub {
  font-weight: 500;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0;
}
.rd-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 11px;
  border: 1.5px solid var(--line);
  background: #fff;
  color:var(--ink);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: all .15s;
  box-sizing: border-box;
}
.rd-input:focus { border-color: var(--blue); background: var(--line); }
.rd-input::placeholder { color: var(--faint); }
.rd-error {
  padding: 10px 14px;
  border-radius: 9px;
  background: rgba(248,113,113,.1);
  border: 1px solid rgba(248,113,113,.3);
  font-size: 12px;
  color: #fca5a5;
  font-weight: 500;
}

@media (max-width: 600px) {
  .rd-hero__matchup { grid-template-columns: 1fr; gap: 14px; }
  .rd-hero__vs { display: none; }
  .rd-grid-2 { grid-template-columns: 1fr; }
}
`