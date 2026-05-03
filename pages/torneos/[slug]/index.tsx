/**
 * GolPlay — pages/torneos/[slug]/index.tsx
 * Página pública del torneo
 *
 * - SSR para SEO + preview de WhatsApp
 * - Estética editorial dark (verde bosque sobre hueso)
 * - Botón gigante de inscripción (lleva a /torneos/[slug]/registrar)
 * - Equipos confirmados visibles
 * - Partidos
 * - WhatsApp flotante
 *
 * v1.1: queries separadas (sin embeds) para evitar bug de PostgREST
 *       con FK opcionales (cuando complex_id es NULL en torneos externos)
 */

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Types ──────────────────────────────────────────────────

type TournamentStatus =
  | 'DRAFT' | 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'

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
  status: TournamentStatus
  is_external: boolean
  venue_name: string | null
  venue_address: string | null
  venue_city: string | null
  venue_lat: number | null
  venue_lng: number | null
  contact_phone: string | null
  complex_name: string | null
  complex_slug: string | null
}

interface PublicTeam {
  id: number
  team_name: string
  captain_name: string
  player_count: number
}

interface PublicMatch {
  id: number
  round_label: string | null
  team_a_name: string | null
  team_b_name: string | null
  scheduled_at: string | null
  field_label: string | null
  team_a_score: number | null
  team_b_score: number | null
  status: string
}

interface Props {
  tournament: Tournament | null
  teams: PublicTeam[]
  matches: PublicMatch[]
}

// ─── Constantes ─────────────────────────────────────────────

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽' },
  padel:    { label: 'Pádel',     emoji: '🎾' },
  otro:     { label: 'Otro',      emoji: '🏟️' },
}

const STATUS_META: Record<TournamentStatus, { label: string; color: string; bg: string }> = {
  DRAFT:       { label: 'Borrador',                 color: '#94a3b8', bg: 'rgba(148,163,184,.15)' },
  OPEN:        { label: 'Inscripciones abiertas',   color: '#4ade80', bg: 'rgba(74,222,128,.15)' },
  FULL:        { label: 'Cupo completo',            color: '#fbbf24', bg: 'rgba(251,191,36,.15)' },
  IN_PROGRESS: { label: 'En curso',                 color: '#60a5fa', bg: 'rgba(96,165,250,.15)' },
  FINISHED:    { label: 'Finalizado',               color: '#a78bfa', bg: 'rgba(167,139,250,.15)' },
  CANCELLED:   { label: 'Cancelado',                color: '#f87171', bg: 'rgba(248,113,113,.15)' },
}

const FORMAT_LABEL: Record<string, string> = {
  manual: 'Formato libre',
  knockout: 'Eliminación directa',
  groups: 'Grupos + eliminación',
  league: 'Liga (todos contra todos)',
}

// ─── Helpers ────────────────────────────────────────────────

const fmtCRC = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const fmtDateRange = (start: string, end: string | null) => {
  if (!end) return fmtDate(start)
  return `${fmtDate(start)} → ${fmtDate(end)}`
}

const fmtPhone = (p: string | null) => {
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4)}`
  return p
}

const fmtMatchTime = (iso: string | null) => {
  if (!iso) return 'Por programar'
  return new Date(iso).toLocaleString('es-CR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ─── SSR ────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug
  console.log('[torneos/index] slug:', slug)

  if (typeof slug !== 'string') {
    return { props: { tournament: null, teams: [], matches: [] } }
  }

  console.log('[torneos/index] env URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[torneos/index] env ANON exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 1. Tournament SOLO (sin embed para evitar bug con FK opcional)
  const { data: t, error: tErr } = await supabase
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

  console.log('[torneos/index] data:', t ? 'FOUND' : 'NULL', '· error:', tErr)

  if (!t) {
    return { props: { tournament: null, teams: [], matches: [] } }
  }

  const tRow = t as any

  // 2. Si tiene complex_id, traemos el complejo aparte
  let complexName: string | null = null
  let complexSlug: string | null = null
  if (tRow.complex_id) {
    const { data: c } = await supabase
      .from('complexes')
      .select('name, slug')
      .eq('id', tRow.complex_id)
      .maybeSingle()
    if (c) {
      complexName = c.name
      complexSlug = c.slug
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
    contact_phone: tRow.contact_phone,
    complex_name: complexName,
    complex_slug: complexSlug,
  }

  // 3. Confirmed teams
  const { data: teamsData } = await supabase
    .from('tournament_teams')
    .select('id, team_name, captain_name, players')
    .eq('tournament_id', tournament.id)
    .eq('status', 'CONFIRMED')
    .order('created_at', { ascending: true })

  const teams: PublicTeam[] = (teamsData ?? []).map((tm: any) => ({
    id: tm.id,
    team_name: tm.team_name,
    captain_name: tm.captain_name,
    player_count: Array.isArray(tm.players) ? tm.players.length : 0,
  }))

  // 4. Matches (sin embed)
  const { data: matchesData } = await supabase
    .from('tournament_matches')
    .select(`
      id, round_label, team_a_id, team_b_id, team_a_label, team_b_label,
      scheduled_at, field_label, team_a_score, team_b_score, status
    `)
    .eq('tournament_id', tournament.id)
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  // 5. Lookup de team names para los matches (en una query)
  let teamNamesMap: Record<number, string> = {}
  if (matchesData && matchesData.length > 0) {
    const teamIds = Array.from(new Set(
      matchesData.flatMap(m => [m.team_a_id, m.team_b_id]).filter((x): x is number => x !== null)
    ))
    if (teamIds.length > 0) {
      const { data: teamLookup } = await supabase
        .from('tournament_teams')
        .select('id, team_name')
        .in('id', teamIds)
      teamNamesMap = (teamLookup ?? []).reduce((acc: Record<number, string>, t: any) => {
        acc[t.id] = t.team_name
        return acc
      }, {})
    }
  }

  const matches: PublicMatch[] = (matchesData ?? []).map((m: any) => ({
    id: m.id,
    round_label: m.round_label,
    team_a_name: m.team_a_id ? teamNamesMap[m.team_a_id] ?? null : m.team_a_label,
    team_b_name: m.team_b_id ? teamNamesMap[m.team_b_id] ?? null : m.team_b_label,
    scheduled_at: m.scheduled_at,
    field_label: m.field_label,
    team_a_score: m.team_a_score,
    team_b_score: m.team_b_score,
    status: m.status,
  }))

  return { props: { tournament, teams, matches } }
}

// ─── Page ──────────────────────────────────────────────────

export default function PublicTournamentPage({ tournament, teams, matches }: Props) {
  const [showShare, setShowShare] = useState(false)

  // 404 elegante
  if (!tournament) {
    return (
      <>
        <Head>
          <title>Torneo no encontrado · GolPlay</title>
        </Head>
        <style jsx global>{GLOBAL_CSS}</style>
        <style>{CSS}</style>
        <div className="pt-404">
          <div className="pt-404__inner">
            <span className="pt-404__emoji">🏆</span>
            <h1 className="pt-404__title">Torneo no encontrado</h1>
            <p className="pt-404__sub">
              Este torneo no existe o todavía no está disponible al público.
            </p>
            <Link href="/" className="pt-btn pt-btn--primary">Volver a GolPlay</Link>
          </div>
        </div>
      </>
    )
  }

  const sp = SPORT_META[tournament.sport_type] ?? SPORT_META.otro
  const st = STATUS_META[tournament.status]
  const canRegister = tournament.status === 'OPEN'
  const venueLabel = tournament.is_external
    ? tournament.venue_name
    : tournament.complex_name

  const wazeUrl = tournament.venue_lat && tournament.venue_lng
    ? `https://waze.com/ul?ll=${tournament.venue_lat},${tournament.venue_lng}&navigate=yes`
    : null
  const mapsUrl = tournament.venue_lat && tournament.venue_lng
    ? `https://www.google.com/maps?q=${tournament.venue_lat},${tournament.venue_lng}`
    : null

  const whatsappUrl = tournament.contact_phone
    ? `https://wa.me/506${tournament.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, tengo una consulta sobre el torneo "${tournament.name}"`)}`
    : null

  const ogImage = tournament.cover_image_url ?? '/golplay-og-default.jpg'
  const ogDescription = tournament.description
    ?? `${sp.label} · ${fmtDate(tournament.start_date)} · ${fmtCRC(tournament.price_per_team)} por equipo`

  return (
    <>
      <Head>
        <title>{tournament.name} · GolPlay</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={tournament.name} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <style jsx global>{GLOBAL_CSS}</style>
      <style>{CSS}</style>

      <div className="pt">
        {/* ============ HERO ============ */}
        <section className="pt-hero">
          {tournament.cover_image_url ? (
            <img src={tournament.cover_image_url} alt={tournament.name} className="pt-hero__img" />
          ) : (
            <div className="pt-hero__gradient" />
          )}
          <div className="pt-hero__overlay" />

          <div className="pt-hero__content">
            <Link href="/" className="pt-hero__brand">GolPlay</Link>

            <div className="pt-hero__main">
              <p className="pt-hero__sport">{sp.emoji} {sp.label}</p>
              <h1 className="pt-hero__title">{tournament.name}</h1>

              <div className="pt-hero__badges">
                <span className="pt-badge" style={{ color: st.color, background: st.bg }}>
                  {st.label}
                </span>
                <span className="pt-hero__date">📅 {fmtDateRange(tournament.start_date, tournament.end_date)}</span>
              </div>

              {/* CTA grande — solo si OPEN */}
              {canRegister && (
                <Link href={`/torneos/${tournament.slug}/registrar`} className="pt-hero__cta">
                  Inscribir mi equipo →
                </Link>
              )}
              {tournament.status === 'FULL' && (
                <div className="pt-hero__notice">
                  ⚠️ Cupo completo · {tournament.max_teams} equipos inscritos
                </div>
              )}
              {tournament.status === 'IN_PROGRESS' && (
                <div className="pt-hero__notice">
                  ⚡ Torneo en curso
                </div>
              )}
              {tournament.status === 'FINISHED' && (
                <div className="pt-hero__notice">
                  🏆 Torneo finalizado
                </div>
              )}
              {tournament.status === 'CANCELLED' && (
                <div className="pt-hero__notice">
                  ❌ Torneo cancelado
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ============ INFO STRIP ============ */}
        <section className="pt-info">
          <div className="pt-info__grid">
            <div className="pt-info__item">
              <p className="pt-info__label">Cupos</p>
              <p className="pt-info__value">
                <strong>{teams.length}</strong>
                <span className="pt-info__max"> / {tournament.max_teams}</span>
              </p>
            </div>
            <div className="pt-info__item">
              <p className="pt-info__label">Inscripción</p>
              <p className="pt-info__value">
                <strong>{fmtCRC(tournament.price_per_team)}</strong>
                <span className="pt-info__sub"> por equipo</span>
              </p>
            </div>
            <div className="pt-info__item">
              <p className="pt-info__label">Formato</p>
              <p className="pt-info__value">
                <strong>{FORMAT_LABEL[tournament.format] ?? tournament.format}</strong>
              </p>
            </div>
            <div className="pt-info__item">
              <p className="pt-info__label">Sede</p>
              <p className="pt-info__value">
                <strong>{venueLabel}</strong>
                {tournament.venue_city && <span className="pt-info__sub"> · {tournament.venue_city}</span>}
              </p>
            </div>
          </div>
        </section>

        {/* ============ DESCRIPTION ============ */}
        {tournament.description && (
          <section className="pt-section">
            <h2 className="pt-section__title">Sobre el torneo</h2>
            <p className="pt-section__text">{tournament.description}</p>
          </section>
        )}

        {/* ============ LOCATION ============ */}
        <section className="pt-section">
          <h2 className="pt-section__title">📍 Ubicación</h2>
          <div className="pt-card">
            <div className="pt-location">
              <div className="pt-location__info">
                <h3 className="pt-location__name">{venueLabel}</h3>
                {tournament.is_external && tournament.venue_address && (
                  <p className="pt-location__addr">{tournament.venue_address}</p>
                )}
                {tournament.venue_city && (
                  <p className="pt-location__city">{tournament.venue_city}</p>
                )}
              </div>
              {(mapsUrl || tournament.complex_slug) && (
                <div className="pt-location__actions">
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="pt-btn pt-btn--ghost">
                      📍 Google Maps
                    </a>
                  )}
                  {wazeUrl && (
                    <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="pt-btn pt-btn--ghost">
                      🚗 Waze
                    </a>
                  )}
                  {!tournament.is_external && tournament.complex_slug && (
                    <Link href={`/complexes/${tournament.complex_slug}`} className="pt-btn pt-btn--ghost">
                      Ver complejo →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ============ RULES ============ */}
        {tournament.rules && (
          <section className="pt-section">
            <h2 className="pt-section__title">📋 Reglas</h2>
            <div className="pt-card">
              <p className="pt-rules">{tournament.rules}</p>
            </div>
          </section>
        )}

        {/* ============ TEAMS ============ */}
        <section className="pt-section">
          <h2 className="pt-section__title">
            👥 Equipos confirmados
            <span className="pt-section__count">{teams.length}</span>
          </h2>

          {teams.length === 0 ? (
            <div className="pt-card pt-empty">
              <p>Aún no hay equipos confirmados.</p>
              {canRegister && <p className="pt-empty__sub">¡Sé el primero en inscribirte!</p>}
            </div>
          ) : (
            <div className="pt-teams">
              {teams.map((t, idx) => (
                <div key={t.id} className="pt-team">
                  <span className="pt-team__num">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="pt-team__info">
                    <p className="pt-team__name">{t.team_name}</p>
                    <p className="pt-team__captain">
                      Capitán: {t.captain_name}
                      {t.player_count > 0 && ` · ${t.player_count} jugador${t.player_count !== 1 ? 'es' : ''}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ============ MATCHES ============ */}
        {matches.length > 0 && (
          <section className="pt-section">
            <h2 className="pt-section__title">⚔️ Partidos</h2>
            <div className="pt-matches">
              {matches.map(m => (
                <div key={m.id} className="pt-match">
                  {m.round_label && <p className="pt-match__round">{m.round_label}</p>}
                  <div className="pt-match__teams">
                    <span className="pt-match__team">{m.team_a_name ?? '¿?'}</span>
                    {m.status === 'FINISHED' && m.team_a_score !== null && m.team_b_score !== null ? (
                      <span className="pt-match__score">
                        <strong>{m.team_a_score}</strong>
                        <span className="pt-match__sep">·</span>
                        <strong>{m.team_b_score}</strong>
                      </span>
                    ) : (
                      <span className="pt-match__vs">vs</span>
                    )}
                    <span className="pt-match__team">{m.team_b_name ?? '¿?'}</span>
                  </div>
                  <div className="pt-match__meta">
                    <span>{fmtMatchTime(m.scheduled_at)}</span>
                    {m.field_label && <span>· {m.field_label}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============ CTA FOOTER ============ */}
        {canRegister && (
          <section className="pt-cta-footer">
            <h2 className="pt-cta-footer__title">¿Listos para jugar?</h2>
            <p className="pt-cta-footer__sub">Inscribí tu equipo en menos de 2 minutos</p>
            <Link href={`/torneos/${tournament.slug}/registrar`} className="pt-btn pt-btn--primary pt-btn--lg">
              Inscribir mi equipo →
            </Link>
            {tournament.contact_phone && (
              <p className="pt-cta-footer__contact">
                ¿Dudas? Escribinos al {fmtPhone(tournament.contact_phone)}
              </p>
            )}
          </section>
        )}

        {/* ============ FOOTER ============ */}
        <footer className="pt-footer">
          <Link href="/" className="pt-footer__brand">GolPlay</Link>
          <p className="pt-footer__copy">Torneos amateur en LATAM</p>
        </footer>

        {/* ============ FLOATING WHATSAPP ============ */}
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="pt-wa" aria-label="Contactar por WhatsApp">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
          </a>
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
.pt { min-height: 100vh; background: #0C0D0B; color: #F5F2EC; padding-bottom: 80px; }

/* ── 404 ── */
.pt-404 { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #0C0D0B; }
.pt-404__inner { text-align: center; max-width: 420px; }
.pt-404__emoji { font-size: 64px; display: block; margin-bottom: 16px; opacity: .7; }
.pt-404__title { font-family: 'DM Serif Display', serif; font-size: 32px; color: #F5F2EC; margin: 0 0 12px; }
.pt-404__sub { font-size: 14px; color: rgba(245,242,236,.6); margin: 0 0 28px; line-height: 1.6; }

/* ── HERO ── */
.pt-hero { position: relative; min-height: 60vh; overflow: hidden; }
.pt-hero__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pt-hero__gradient { position: absolute; inset: 0; background: linear-gradient(160deg, #052e16 0%, #0B4D2C 50%, #0C0D0B 100%); }
.pt-hero__overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(12,13,11,.4) 0%, rgba(12,13,11,.85) 75%, #0C0D0B 100%); }

.pt-hero__content { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: space-between; min-height: 60vh; padding: 28px 24px 40px; max-width: 800px; margin: 0 auto; }

.pt-hero__brand { font-family: 'DM Serif Display', serif; font-size: 22px; color: #F5F2EC; text-decoration: none; letter-spacing: -.01em; }
.pt-hero__brand:hover { color: #4ade80; }

.pt-hero__main { margin-top: auto; }
.pt-hero__sport { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .12em; margin: 0 0 12px; }
.pt-hero__title { font-family: 'DM Serif Display', serif; font-size: 48px; line-height: 1.05; color: #F5F2EC; margin: 0 0 18px; letter-spacing: -.02em; }
.pt-hero__badges { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 28px; }
.pt-hero__date { font-size: 13px; color: rgba(245,242,236,.7); font-weight: 500; }

.pt-badge { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em; }

.pt-hero__cta { display: inline-flex; align-items: center; justify-content: center; padding: 16px 28px; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; border-radius: 14px; text-decoration: none; box-shadow: 0 8px 28px rgba(22,163,74,.3); transition: transform .15s, box-shadow .15s; align-self: flex-start; }
.pt-hero__cta:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(22,163,74,.4); }

.pt-hero__notice { display: inline-block; padding: 12px 20px; background: rgba(245,242,236,.08); border: 1px solid rgba(245,242,236,.15); border-radius: 12px; font-size: 13px; color: #F5F2EC; font-weight: 600; align-self: flex-start; }

/* ── INFO STRIP ── */
.pt-info { max-width: 800px; margin: -28px auto 0; padding: 0 24px; position: relative; z-index: 3; }
.pt-info__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(245,242,236,.1); border: 1px solid rgba(245,242,236,.1); border-radius: 16px; overflow: hidden; }
.pt-info__item { background: #16181A; padding: 18px 16px; }
.pt-info__label { font-size: 10px; font-weight: 700; color: rgba(245,242,236,.5); text-transform: uppercase; letter-spacing: .1em; margin: 0 0 6px; }
.pt-info__value { font-size: 16px; margin: 0; color: #F5F2EC; line-height: 1.3; }
.pt-info__value strong { font-weight: 700; }
.pt-info__max, .pt-info__sub { color: rgba(245,242,236,.5); font-weight: 400; font-size: 13px; }

/* ── SECTIONS ── */
.pt-section { max-width: 800px; margin: 40px auto 0; padding: 0 24px; }
.pt-section__title { font-family: 'DM Serif Display', serif; font-size: 24px; color: #F5F2EC; margin: 0 0 16px; display: flex; align-items: center; gap: 10px; }
.pt-section__count { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: rgba(74,222,128,.15); color: #4ade80; }
.pt-section__text { font-size: 15px; line-height: 1.7; color: rgba(245,242,236,.8); margin: 0; }

.pt-card { background: #16181A; border: 1px solid rgba(245,242,236,.08); border-radius: 14px; padding: 20px 22px; }

/* ── LOCATION ── */
.pt-location { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.pt-location__info { min-width: 0; }
.pt-location__name { font-size: 17px; font-weight: 700; color: #F5F2EC; margin: 0 0 4px; }
.pt-location__addr { font-size: 13px; color: rgba(245,242,236,.7); margin: 0 0 2px; }
.pt-location__city { font-size: 12px; color: rgba(245,242,236,.5); margin: 0; }
.pt-location__actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ── RULES ── */
.pt-rules { font-size: 14px; color: rgba(245,242,236,.85); line-height: 1.7; margin: 0; white-space: pre-wrap; }

/* ── TEAMS ── */
.pt-empty { text-align: center; color: rgba(245,242,236,.6); }
.pt-empty p { margin: 0; font-size: 14px; }
.pt-empty__sub { margin-top: 8px !important; color: #4ade80; font-weight: 600; }

.pt-teams { display: flex; flex-direction: column; gap: 8px; }
.pt-team { display: flex; align-items: center; gap: 16px; background: #16181A; border: 1px solid rgba(245,242,236,.08); border-radius: 12px; padding: 14px 18px; }
.pt-team__num { font-family: 'DM Serif Display', serif; font-size: 18px; color: rgba(74,222,128,.7); width: 28px; flex-shrink: 0; }
.pt-team__info { min-width: 0; flex: 1; }
.pt-team__name { font-size: 15px; font-weight: 700; color: #F5F2EC; margin: 0; }
.pt-team__captain { font-size: 12px; color: rgba(245,242,236,.55); margin: 2px 0 0; }

/* ── MATCHES ── */
.pt-matches { display: flex; flex-direction: column; gap: 8px; }
.pt-match { background: #16181A; border: 1px solid rgba(245,242,236,.08); border-radius: 12px; padding: 16px 18px; }
.pt-match__round { font-size: 10px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .1em; margin: 0 0 8px; }
.pt-match__teams { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pt-match__team { font-size: 15px; font-weight: 700; color: #F5F2EC; flex: 1; }
.pt-match__team:last-child { text-align: right; }
.pt-match__vs, .pt-match__score { font-family: 'DM Serif Display', serif; font-size: 16px; color: rgba(245,242,236,.5); padding: 0 12px; flex-shrink: 0; }
.pt-match__score { color: #F5F2EC; }
.pt-match__score strong { color: #F5F2EC; font-weight: 800; }
.pt-match__sep { color: rgba(245,242,236,.3); margin: 0 6px; }
.pt-match__meta { font-size: 12px; color: rgba(245,242,236,.5); margin-top: 8px; }

/* ── CTA FOOTER ── */
.pt-cta-footer { max-width: 600px; margin: 60px auto 0; padding: 40px 24px; text-align: center; background: linear-gradient(135deg, rgba(11,77,44,.4), rgba(22,163,74,.15)); border: 1px solid rgba(74,222,128,.2); border-radius: 20px; margin-left: 24px; margin-right: 24px; }
.pt-cta-footer__title { font-family: 'DM Serif Display', serif; font-size: 28px; color: #F5F2EC; margin: 0 0 8px; }
.pt-cta-footer__sub { font-size: 14px; color: rgba(245,242,236,.7); margin: 0 0 24px; }
.pt-cta-footer__contact { font-size: 12px; color: rgba(245,242,236,.5); margin: 16px 0 0; }

/* ── FOOTER ── */
.pt-footer { max-width: 800px; margin: 80px auto 0; padding: 32px 24px; text-align: center; border-top: 1px solid rgba(245,242,236,.08); }
.pt-footer__brand { font-family: 'DM Serif Display', serif; font-size: 18px; color: #F5F2EC; text-decoration: none; }
.pt-footer__copy { font-size: 12px; color: rgba(245,242,236,.4); margin: 6px 0 0; }

/* ── BUTTONS ── */
.pt-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; transition: all .15s; text-decoration: none; }
.pt-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 2px 12px rgba(22,163,74,.25); }
.pt-btn--primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(22,163,74,.35); }
.pt-btn--lg { padding: 16px 32px; font-size: 15px; border-radius: 14px; }
.pt-btn--ghost { background: rgba(245,242,236,.08); color: #F5F2EC; border: 1px solid rgba(245,242,236,.12); }
.pt-btn--ghost:hover { background: rgba(245,242,236,.14); }

/* ── FLOATING WHATSAPP ── */
.pt-wa { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(37,211,102,.4); z-index: 100; transition: transform .15s; }
.pt-wa:hover { transform: scale(1.08); }

/* ── MOBILE ── */
@media (max-width: 640px) {
  .pt-hero { min-height: 70vh; }
  .pt-hero__title { font-size: 36px; }
  .pt-hero__cta { width: 100%; }
  .pt-hero__notice { width: 100%; text-align: center; }
  .pt-info__grid { grid-template-columns: 1fr 1fr; }
  .pt-section__title { font-size: 20px; }
  .pt-cta-footer__title { font-size: 22px; }
  .pt-cta-footer { margin-left: 16px; margin-right: 16px; padding: 32px 20px; }
  .pt-location { flex-direction: column; }
  .pt-location__actions { width: 100%; }
  .pt-location__actions .pt-btn { flex: 1; justify-content: center; }
}
`