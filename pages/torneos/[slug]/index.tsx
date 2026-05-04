/**
 * GolPlay — pages/torneos/[slug]/index.tsx
 * Página pública del torneo
 *
 * v2.0 (Fase 9): Sección de partidos
 * - Lista pública de partidos agrupados por ronda
 * - Resultados con destaque del equipo ganador
 * - Empates marcados como tal
 */

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Tournament {
  id: number
  complex_id: number | null
  slug: string
  name: string
  description: string | null
  rules: string | null
  sport_type: string
  format: string
  start_date: string
  end_date: string | null
  max_teams: number
  price_per_team: number
  cover_image_url: string | null
  status: string
  is_external: boolean
  venue_name: string | null
  venue_address: string | null
  venue_city: string | null
  venue_lat: number | null
  venue_lng: number | null
  complex_name: string | null
  complex_address: string | null
  complex_city: string | null
  complex_lat: number | null
  complex_lng: number | null
  contact_phone: string | null
}

interface Team {
  id: number
  team_name: string
  captain_name: string
  players: any
  status: string
  created_at: string
}

interface Match {
  id: number
  round_label: string | null
  team_a_id: number | null
  team_b_id: number | null
  team_a_label: string | null
  team_b_label: string | null
  scheduled_at: string | null
  field_id: number | null
  field_label: string | null
  team_a_score: number | null
  team_b_score: number | null
  winner_team_id: number | null
  status: string
}

interface Props {
  tournament: Tournament | null
  teams: Team[]
  matches: Match[]
}

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽' },
  padel:    { label: 'Pádel',     emoji: '🎾' },
  otro:     { label: 'Otro',      emoji: '🏟️' },
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:       'Borrador',
  OPEN:        'Inscripciones abiertas',
  FULL:        'Cupo completo',
  IN_PROGRESS: 'En curso',
  FINISHED:    'Finalizado',
  CANCELLED:   'Cancelado',
}

const fmtCRC = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const fmtMatchDateTime = (d: string | null) => {
  if (!d) return 'Sin fecha definida'
  return new Date(d).toLocaleString('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const fmtPhone = (p: string | null) => {
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4)}`
  return p
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const rawSlug = ctx.params?.slug
  if (typeof rawSlug !== 'string') {
    return { props: { tournament: null, teams: [], matches: [] } }
  }
  const slug = rawSlug.toLowerCase()

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: t } = await sb
    .from('tournaments')
    .select(`
      id, complex_id, slug, name, description, rules, sport_type, format,
      start_date, end_date, max_teams, price_per_team, cover_image_url, status,
      is_external, venue_name, venue_address, venue_city, venue_lat, venue_lng,
      contact_phone
    `)
    .eq('slug', slug)
    .neq('status', 'DRAFT')
    .maybeSingle()

  if (!t) return { props: { tournament: null, teams: [], matches: [] } }

  const tRow = t as any

  let complexName: string | null = null
  let complexAddress: string | null = null
  let complexCity: string | null = null
  let complexLat: number | null = null
  let complexLng: number | null = null

  if (tRow.complex_id) {
    const { data: c } = await sb
      .from('complexes')
      .select('name, address, city, lat, lng')
      .eq('id', tRow.complex_id)
      .maybeSingle()
    if (c) {
      complexName    = (c as any).name ?? null
      complexAddress = (c as any).address ?? null
      complexCity    = (c as any).city ?? null
      complexLat     = (c as any).lat !== null ? Number((c as any).lat) : null
      complexLng     = (c as any).lng !== null ? Number((c as any).lng) : null
    }
  }

  const tournament: Tournament = {
    id: tRow.id,
    complex_id: tRow.complex_id,
    slug: tRow.slug,
    name: tRow.name,
    description: tRow.description,
    rules: tRow.rules,
    sport_type: tRow.sport_type,
    format: tRow.format,
    start_date: tRow.start_date,
    end_date: tRow.end_date,
    max_teams: tRow.max_teams,
    price_per_team: Number(tRow.price_per_team),
    cover_image_url: tRow.cover_image_url,
    status: tRow.status,
    is_external: tRow.is_external,
    venue_name: tRow.venue_name,
    venue_address: tRow.venue_address,
    venue_city: tRow.venue_city,
    venue_lat: tRow.venue_lat !== null ? Number(tRow.venue_lat) : null,
    venue_lng: tRow.venue_lng !== null ? Number(tRow.venue_lng) : null,
    complex_name: complexName,
    complex_address: complexAddress,
    complex_city: complexCity,
    complex_lat: complexLat,
    complex_lng: complexLng,
    contact_phone: tRow.contact_phone,
  }

  const { data: teamsData } = await sb
    .from('tournament_teams')
    .select('id, team_name, captain_name, players, status, created_at')
    .eq('tournament_id', tRow.id)
    .eq('status', 'CONFIRMED')
    .order('created_at', { ascending: true })

  const teams: Team[] = (teamsData ?? []) as Team[]

  const { data: matchesData } = await sb
    .from('tournament_matches')
    .select(`
      id, round_label, team_a_id, team_b_id, team_a_label, team_b_label,
      scheduled_at, field_id, field_label, team_a_score, team_b_score,
      winner_team_id, status
    `)
    .eq('tournament_id', tRow.id)
    .order('round_label', { ascending: true, nullsFirst: false })
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  const matches: Match[] = (matchesData ?? []) as Match[]

  return { props: { tournament, teams, matches } }
}

export default function PublicTournamentPage({ tournament, teams, matches }: Props) {
  // ── Hooks SIEMPRE primero, antes de cualquier early return ──
  const teamsMap = useMemo(() => {
    const m = new Map<number, Team>()
    teams.forEach(t => m.set(t.id, t))
    return m
  }, [teams])

  const matchesByRound = useMemo(() => {
    const groups = new Map<string, Match[]>()
    matches.forEach(m => {
      const key = m.round_label || 'Próximamente'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(m)
    })
    return Array.from(groups.entries())
  }, [matches])

  const whatsappUrl = useMemo(() => {
    if (!tournament?.contact_phone) return null
    const digits = tournament.contact_phone.replace(/\D/g, '')
    if (digits.length < 8) return null
    const text = `Hola, me interesa el torneo *${tournament.name}*. ¿Me podés dar más info?`
    return `https://wa.me/506${digits}?text=${encodeURIComponent(text)}`
  }, [tournament])

  // ── Early return si no hay torneo ──
  if (!tournament) {
    return (
      <>
        <Head><title>Torneo no encontrado · GolPlay</title></Head>
        <style jsx global>{GLOBAL_CSS}</style>
        <style>{CSS}</style>
        <div className="pt-404">
          <span className="pt-404__emoji">🏆</span>
          <h1 className="pt-404__title">Torneo no encontrado</h1>
          <p className="pt-404__sub">Este torneo no existe o no está disponible.</p>
          <Link href="/" className="pt-btn pt-btn--primary">Volver a GolPlay</Link>
        </div>
      </>
    )
  }

  const sp = SPORT_META[tournament.sport_type] ?? SPORT_META.otro
  const venueLabel = tournament.is_external
    ? tournament.venue_name
    : tournament.complex_name

  const venueAddress = tournament.is_external
    ? tournament.venue_address
    : tournament.complex_address

  const venueCity = tournament.is_external
    ? tournament.venue_city
    : tournament.complex_city

  const venueLat = tournament.is_external ? tournament.venue_lat : tournament.complex_lat
  const venueLng = tournament.is_external ? tournament.venue_lng : tournament.complex_lng

  const slotsLeft = tournament.max_teams - teams.length
  const isOpen = tournament.status === 'OPEN'
  const showMatches = matches.length > 0

  return (
    <>
      <Head>
        <title>{tournament.name} · Torneo · GolPlay</title>
        <meta name="description" content={tournament.description ?? `Inscribí tu equipo en ${tournament.name}`} />
        {tournament.cover_image_url && <meta property="og:image" content={tournament.cover_image_url} />}
      </Head>

      <style jsx global>{GLOBAL_CSS}</style>
      <style>{CSS}</style>

      <div className="pt">
        {/* ─── HERO ─── */}
        <section className="pt-hero">
          {tournament.cover_image_url ? (
            <img src={tournament.cover_image_url} alt={tournament.name} className="pt-hero__img" />
          ) : (
            <div className="pt-hero__bg" />
          )}

          <div className="pt-hero__overlay" />

          <div className="pt-hero__top">
            <Link href="/" className="pt-hero__brand">GolPlay</Link>
          </div>

          <div className="pt-hero__content">
            <p className="pt-hero__eyebrow">{sp.emoji} {sp.label} · {STATUS_LABEL[tournament.status]}</p>
            <h1 className="pt-hero__title">{tournament.name}</h1>
            <p className="pt-hero__date">
              {fmtDate(tournament.start_date)}
              {tournament.end_date && tournament.end_date !== tournament.start_date && ` → ${fmtDate(tournament.end_date)}`}
            </p>
          </div>
        </section>

        {/* ─── INFO STRIP ─── */}
        <section className="pt-strip">
          <div className="pt-strip__item">
            <span className="pt-strip__label">Cupos</span>
            <span className="pt-strip__value">
              {teams.length}<span className="pt-strip__max"> / {tournament.max_teams}</span>
            </span>
          </div>
          <div className="pt-strip__sep" />
          <div className="pt-strip__item">
            <span className="pt-strip__label">Por equipo</span>
            <span className="pt-strip__value">{fmtCRC(tournament.price_per_team)}</span>
          </div>
          <div className="pt-strip__sep" />
          <div className="pt-strip__item">
            <span className="pt-strip__label">Formato</span>
            <span className="pt-strip__value pt-strip__value--small">{tournament.format}</span>
          </div>
          {venueLabel && (
            <>
              <div className="pt-strip__sep" />
              <div className="pt-strip__item">
                <span className="pt-strip__label">Sede</span>
                <span className="pt-strip__value pt-strip__value--small">{venueLabel}</span>
              </div>
            </>
          )}
        </section>

        {/* ─── PRIMARY CTA ─── */}
        {isOpen && slotsLeft > 0 && (
          <section className="pt-cta">
            <Link href={`/torneos/${tournament.slug}/registrar`} className="pt-btn pt-btn--primary pt-btn--big">
              Inscribir mi equipo →
            </Link>
            <p className="pt-cta__sub">{slotsLeft} cupo{slotsLeft !== 1 ? 's' : ''} disponible{slotsLeft !== 1 ? 's' : ''}</p>
          </section>
        )}

        {!isOpen && (
          <section className="pt-cta">
            <div className="pt-cta__closed">
              <span className="pt-cta__closed-icon">🔒</span>
              <p className="pt-cta__closed-msg">
                {tournament.status === 'FULL'        && 'Cupo completo. Si querés estar en lista de espera, escribinos.'}
                {tournament.status === 'IN_PROGRESS' && 'Torneo en curso. Mirá los partidos abajo.'}
                {tournament.status === 'FINISHED'    && 'Torneo finalizado. ¡Gracias a todos los equipos!'}
                {tournament.status === 'CANCELLED'   && 'Torneo cancelado.'}
              </p>
            </div>
          </section>
        )}

        {/* ─── DESCRIPTION ─── */}
        {tournament.description && (
          <section className="pt-section">
            <h2 className="pt-section__title">Sobre el torneo</h2>
            <p className="pt-section__text">{tournament.description}</p>
          </section>
        )}

        {/* ─── LOCATION ─── */}
        {(venueAddress || venueLabel) && (
          <section className="pt-section">
            <h2 className="pt-section__title">Dónde se juega</h2>
            <div className="pt-location">
              <p className="pt-location__name">{venueLabel}</p>
              {venueAddress && <p className="pt-location__addr">{venueAddress}</p>}
              {venueCity && <p className="pt-location__city">{venueCity}</p>}
              {venueLat && venueLng && (
                <div className="pt-location__actions">
                  <a href={`https://www.google.com/maps?q=${venueLat},${venueLng}`} target="_blank" rel="noopener noreferrer" className="pt-btn pt-btn--ghost">
                    📍 Google Maps
                  </a>
                  <a href={`https://waze.com/ul?ll=${venueLat},${venueLng}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="pt-btn pt-btn--ghost">
                    🚗 Waze
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── RULES ─── */}
        {tournament.rules && (
          <section className="pt-section">
            <h2 className="pt-section__title">Reglas</h2>
            <p className="pt-section__text" style={{ whiteSpace: 'pre-wrap' }}>{tournament.rules}</p>
          </section>
        )}

        {/* ─── TEAMS ─── */}
        {teams.length > 0 && (
          <section className="pt-section">
            <h2 className="pt-section__title">Equipos confirmados ({teams.length})</h2>
            <div className="pt-teams">
              {teams.map(t => (
                <div key={t.id} className="pt-team">
                  <span className="pt-team__name">{t.team_name}</span>
                  <span className="pt-team__captain">cap. {t.captain_name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── MATCHES (Fase 9) ─── */}
        {showMatches && (
          <section className="pt-section">
            <h2 className="pt-section__title">Partidos</h2>
            {matchesByRound.map(([round, ms]) => (
              <div key={round} className="pt-round">
                <h3 className="pt-round__title">{round}</h3>
                <div className="pt-matches">
                  {ms.map(m => {
                    const teamA = m.team_a_id ? teamsMap.get(m.team_a_id) : null
                    const teamB = m.team_b_id ? teamsMap.get(m.team_b_id) : null
                    const aName = teamA?.team_name ?? m.team_a_label ?? 'Por definir'
                    const bName = teamB?.team_name ?? m.team_b_label ?? 'Por definir'
                    const isFinished = m.status === 'FINISHED'
                    const isWinnerA = isFinished && m.winner_team_id === m.team_a_id
                    const isWinnerB = isFinished && m.winner_team_id === m.team_b_id
                    const isTie = isFinished && m.winner_team_id === null

                    return (
                      <div key={m.id} className={`pt-match ${isFinished ? 'pt-match--finished' : ''}`}>
                        <div className="pt-match__head">
                          <span className="pt-match__date">{fmtMatchDateTime(m.scheduled_at)}</span>
                          {isFinished && <span className="pt-match__status">Finalizado</span>}
                          {!isFinished && m.status === 'SCHEDULED' && <span className="pt-match__status pt-match__status--scheduled">Programado</span>}
                        </div>
                        <div className="pt-match__body">
                          <div className={`pt-match__team ${isWinnerA ? 'pt-match__team--winner' : ''}`}>
                            <span className="pt-match__team-name">{aName}</span>
                            {isFinished && <span className="pt-match__score">{m.team_a_score ?? 0}</span>}
                          </div>
                          <span className="pt-match__vs">vs</span>
                          <div className={`pt-match__team ${isWinnerB ? 'pt-match__team--winner' : ''}`}>
                            <span className="pt-match__team-name">{bName}</span>
                            {isFinished && <span className="pt-match__score">{m.team_b_score ?? 0}</span>}
                          </div>
                        </div>
                        {isTie && <p className="pt-match__tie">Empate</p>}
                        {(m.field_label || m.field_id) && !isFinished && (
                          <p className="pt-match__field">📍 {m.field_label || `Cancha #${m.field_id}`}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ─── FOOTER CTA ─── */}
        {isOpen && slotsLeft > 0 && (
          <section className="pt-footer-cta">
            <h2 className="pt-footer-cta__title">¿Listo para inscribir tu equipo?</h2>
            <p className="pt-footer-cta__sub">Quedan {slotsLeft} cupo{slotsLeft !== 1 ? 's' : ''} libre{slotsLeft !== 1 ? 's' : ''}.</p>
            <Link href={`/torneos/${tournament.slug}/registrar`} className="pt-btn pt-btn--primary pt-btn--big">
              Inscribirme →
            </Link>
          </section>
        )}

        {/* ─── BRAND FOOTER ─── */}
        <footer className="pt-foot">
          <p className="pt-foot__brand">GolPlay</p>
          <p className="pt-foot__line">Encontrá y reservá tus canchas favoritas.</p>
          <Link href="/" className="pt-foot__link">golplay.app</Link>
        </footer>

        {/* ─── FLOATING WHATSAPP ─── */}
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="pt-fab" aria-label="Contactar por WhatsApp">
            💬
          </a>
        )}
      </div>
    </>
  )
}

// ─── ESTILOS ────────────────────────────────────────────────

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
.pt { min-height: 100vh; background: #0C0D0B; color: #F5F2EC; padding-bottom: 100px; }

.pt-404 { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; gap: 12px; }
.pt-404__emoji { font-size: 64px; opacity: .7; margin-bottom: 8px; }
.pt-404__title { font-family: 'DM Serif Display', serif; font-size: 36px; color: #F5F2EC; margin: 0; }
.pt-404__sub { font-size: 14px; color: rgba(245,242,236,.6); max-width: 400px; line-height: 1.6; margin: 0 0 20px; }

/* ─── HERO ─── */
.pt-hero { position: relative; height: 56vh; min-height: 380px; max-height: 540px; overflow: hidden; display: flex; flex-direction: column; }
.pt-hero__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.pt-hero__bg { position: absolute; inset: 0; background: linear-gradient(160deg, #052e16 0%, #0B4D2C 50%, #0C0D0B 100%); z-index: 0; }
.pt-hero__overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(12,13,11,.4) 0%, rgba(12,13,11,.55) 50%, rgba(12,13,11,.95) 100%); z-index: 1; }
.pt-hero__top { position: relative; z-index: 2; padding: 22px 24px; }
.pt-hero__brand { font-family: 'DM Serif Display', serif; font-size: 22px; color: #F5F2EC; text-decoration: none; opacity: .9; }
.pt-hero__brand:hover { opacity: 1; }
.pt-hero__content { position: relative; z-index: 2; margin-top: auto; padding: 24px 24px 36px; max-width: 720px; }
.pt-hero__eyebrow { font-size: 11px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .12em; margin: 0 0 10px; }
.pt-hero__title { font-family: 'DM Serif Display', serif; font-size: 56px; line-height: 1; letter-spacing: -.02em; color: #F5F2EC; margin: 0 0 14px; }
.pt-hero__date { font-size: 16px; color: rgba(245,242,236,.85); font-weight: 500; margin: 0; }

/* ─── STRIP ─── */
.pt-strip { display: flex; max-width: 720px; margin: -1px auto 0; padding: 24px; gap: 0; align-items: center; flex-wrap: wrap; row-gap: 16px; }
.pt-strip__item { flex: 1; min-width: 0; }
.pt-strip__sep { width: 1px; height: 30px; background: rgba(245,242,236,.15); margin: 0 16px; flex-shrink: 0; }
.pt-strip__label { display: block; font-size: 10px; font-weight: 700; color: rgba(245,242,236,.5); text-transform: uppercase; letter-spacing: .12em; margin-bottom: 5px; }
.pt-strip__value { display: block; font-family: 'DM Serif Display', serif; font-size: 22px; color: #F5F2EC; font-weight: 400; line-height: 1; letter-spacing: -.01em; }
.pt-strip__value--small { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; }
.pt-strip__max { font-size: 14px; color: rgba(245,242,236,.4); }

/* ─── CTAs ─── */
.pt-cta { max-width: 720px; margin: 0 auto; padding: 16px 24px 12px; text-align: center; }
.pt-cta__sub { font-size: 12px; color: rgba(74,222,128,.7); margin: 12px 0 0; font-weight: 600; }
.pt-cta__closed { background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.08); border-radius: 16px; padding: 22px; text-align: center; }
.pt-cta__closed-icon { display: block; font-size: 28px; margin-bottom: 8px; opacity: .7; }
.pt-cta__closed-msg { font-size: 14px; color: rgba(245,242,236,.7); margin: 0; line-height: 1.6; }

/* ─── SECTIONS ─── */
.pt-section { max-width: 720px; margin: 32px auto 0; padding: 0 24px; }
.pt-section__title { font-family: 'DM Serif Display', serif; font-size: 28px; color: #F5F2EC; margin: 0 0 16px; letter-spacing: -.01em; }
.pt-section__text { font-size: 15px; color: rgba(245,242,236,.78); line-height: 1.65; margin: 0; }

/* ─── LOCATION ─── */
.pt-location { background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.08); border-radius: 16px; padding: 22px; }
.pt-location__name { font-size: 17px; font-weight: 700; color: #F5F2EC; margin: 0 0 6px; }
.pt-location__addr { font-size: 14px; color: rgba(245,242,236,.7); margin: 0 0 2px; line-height: 1.5; }
.pt-location__city { font-size: 13px; color: rgba(245,242,236,.5); margin: 0 0 16px; }
.pt-location__actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ─── TEAMS ─── */
.pt-teams { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.pt-team { background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.08); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.pt-team__name { font-size: 14px; font-weight: 700; color: #F5F2EC; line-height: 1.3; }
.pt-team__captain { font-size: 11px; color: rgba(245,242,236,.5); }

/* ─── MATCHES (Fase 9) ─── */
.pt-round { margin-bottom: 24px; }
.pt-round:last-child { margin-bottom: 0; }
.pt-round__title { font-family: 'DM Serif Display', serif; font-size: 22px; color: #F5F2EC; margin: 0 0 14px; letter-spacing: -.01em; }
.pt-matches { display: flex; flex-direction: column; gap: 10px; }

.pt-match { background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.08); border-radius: 14px; padding: 14px 18px; }
.pt-match--finished { background: rgba(74,222,128,.04); border-color: rgba(74,222,128,.15); }

.pt-match__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 11px; color: rgba(245,242,236,.5); font-weight: 600; text-transform: uppercase; letter-spacing: .08em; gap: 8px; }
.pt-match__date { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-match__status { color: #4ade80; flex-shrink: 0; }
.pt-match__status--scheduled { color: rgba(96,165,250,.85); }

.pt-match__body { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; }
.pt-match__team { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(245,242,236,.06); border: 1px solid rgba(245,242,236,.1); border-radius: 10px; min-width: 0; }
.pt-match__team--winner { background: rgba(74,222,128,.1); border-color: rgba(74,222,128,.3); }
.pt-match__team-name { font-size: 14px; font-weight: 600; color: #F5F2EC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-match__team--winner .pt-match__team-name { color: #4ade80; font-weight: 700; }
.pt-match__score { font-family: 'DM Serif Display', serif; font-size: 22px; font-weight: 700; color: #F5F2EC; flex-shrink: 0; }
.pt-match__team--winner .pt-match__score { color: #4ade80; }
.pt-match__vs { font-size: 11px; font-weight: 700; color: rgba(245,242,236,.4); text-transform: uppercase; letter-spacing: .1em; }
.pt-match__tie { text-align: center; font-size: 11px; color: rgba(245,242,236,.5); margin: 8px 0 0; font-weight: 500; text-transform: uppercase; letter-spacing: .08em; }
.pt-match__field { text-align: center; font-size: 11px; color: rgba(245,242,236,.4); margin: 8px 0 0; font-weight: 500; }

/* ─── FOOTER CTA ─── */
.pt-footer-cta { max-width: 720px; margin: 60px auto 0; padding: 36px 24px; text-align: center; background: linear-gradient(160deg, rgba(74,222,128,.06), rgba(74,222,128,.02)); border-top: 1px solid rgba(74,222,128,.15); border-bottom: 1px solid rgba(74,222,128,.15); }
.pt-footer-cta__title { font-family: 'DM Serif Display', serif; font-size: 28px; color: #F5F2EC; margin: 0 0 8px; }
.pt-footer-cta__sub { font-size: 13px; color: rgba(245,242,236,.6); margin: 0 0 22px; }

/* ─── FOOTER ─── */
.pt-foot { max-width: 720px; margin: 40px auto 0; padding: 30px 24px; text-align: center; border-top: 1px solid rgba(245,242,236,.08); }
.pt-foot__brand { font-family: 'DM Serif Display', serif; font-size: 18px; color: #F5F2EC; margin: 0 0 4px; }
.pt-foot__line { font-size: 12px; color: rgba(245,242,236,.5); margin: 0 0 8px; }
.pt-foot__link { font-size: 12px; color: #4ade80; text-decoration: none; }
.pt-foot__link:hover { text-decoration: underline; }

/* ─── BUTTONS ─── */
.pt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 26px; border-radius: 14px; font-size: 14px; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; transition: all .15s; text-decoration: none; }
.pt-btn--big { padding: 17px 32px; font-size: 16px; }
.pt-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 4px 18px rgba(22,163,74,.3); }
.pt-btn--primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(22,163,74,.4); }
.pt-btn--ghost { background: rgba(245,242,236,.08); color: #F5F2EC; border: 1px solid rgba(245,242,236,.12); }
.pt-btn--ghost:hover { background: rgba(245,242,236,.14); }

/* ─── FAB WhatsApp ─── */
.pt-fab { position: fixed; bottom: 22px; right: 22px; width: 56px; height: 56px; border-radius: 50%; background: #25D366; color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; text-decoration: none; box-shadow: 0 6px 24px rgba(37,211,102,.4); z-index: 100; transition: transform .15s; }
.pt-fab:hover { transform: scale(1.08); }

/* ─── RESPONSIVE ─── */
@media (max-width: 600px) {
  .pt-hero { height: 50vh; min-height: 340px; }
  .pt-hero__title { font-size: 38px; }
  .pt-hero__date { font-size: 14px; }
  .pt-strip { flex-direction: column; gap: 0; row-gap: 14px; }
  .pt-strip__sep { display: none; }
  .pt-strip__item { width: 100%; display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid rgba(245,242,236,.08); }
  .pt-strip__item:last-child { border-bottom: none; }
  .pt-strip__label { margin-bottom: 0; }
  .pt-section__title { font-size: 22px; }
  .pt-footer-cta__title { font-size: 22px; }
  .pt-teams { grid-template-columns: 1fr; }
  .pt-round__title { font-size: 18px; }
  .pt-match__body { grid-template-columns: 1fr; gap: 6px; }
  .pt-match__vs { display: none; }
}
`