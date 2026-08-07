/**
 * GolPlay — pages/retos/index.tsx
 * Feed público de retos
 *
 * Migrado al DS oficial:
 *   - Theme: dark (envuelto en <div className="theme-dark">).
 *   - Navbar: <Navbar dark={true} /> reemplaza el header inline.
 *   - Tipografía: Syne (var(--font-d)) + DM Sans (body default).
 *   - Tokens CSS: var(--blue), var(--blue), var(--g6), var(--g7).
 *   - Link "Mis retos" movido al hero como botón secundario.
 *
 * Sin cambios:
 *   - GetServerSideProps con enriquecimiento de complexes + captains.
 *   - Filtros (deporte, ciudad).
 *   - Recovery de tokens via localStorage.
 *   - Layout y estructura de cards.
 */

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import Navbar from '@/components/ui/Navbar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Challenge {
  id: string
  slug: string
  status: string
  venue_type: string
  complex_name: string | null
  complex_city: string | null
  venue_name: string | null
  venue_city: string | null
  field_label: string | null
  sport: string
  match_date: string | null
  match_hour: string | null
  description: string | null
  team_name: string
  captain_cedula: string
  captain_name: string
  captain_score: number | null
  captain_finished: number
  created_at: string
}

interface Props {
  challenges: Challenge[]
}

interface MyChallengeRef {
  slug: string
  role: 'publisher' | 'acceptor'
  token: string
  team_name: string
  saved_at: string
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

const fmtTimeUntil = (date: string | null, hour: string | null) => {
  if (!date) return 'Fecha a definir'
  const [y, m, d] = date.split('-').map(Number)
  const h   = hour ? Number(hour.split(':')[0]) : 12
  const min = hour ? Number(hour.split(':')[1] ?? 0) : 0
  const target = new Date(y, m - 1, d, h, min)
  const now    = new Date()
  const diff   = target.getTime() - now.getTime()
  if (diff < 0) return 'Ya pasó'
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(hours / 24)
  if (days > 1)   return `En ${days} días`
  if (days === 1) return 'Mañana'
  if (hours >= 2) return `En ${hours} horas`
  return 'Hoy'
}

// ─── SSR ──────────────────────────────────────────────────────────────────────
export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: rawChallenges } = await sb
    .from('challenges')
    .select(`
      id, slug, status, venue_type, complex_id, venue_name, venue_city,
      field_label, sport, match_date, match_hour, description,
      team_name, captain_cedula, created_at
    `)
    .eq('status', 'open')
    .order('match_date', { ascending: true, nullsFirst: false })
    .order('match_hour', { ascending: true, nullsFirst: false })
    .limit(60)

  const arr = (rawChallenges ?? []) as any[]
  if (arr.length === 0) return { props: { challenges: [] } }

  const complexIds = arr
    .map(c => c.complex_id)
    .filter((id): id is number => !!id)

  const { data: complexes } = complexIds.length > 0
    ? await sb.from('complexes').select('id, name, city').in('id', complexIds)
    : { data: [] }

  const complexMap = new Map((complexes ?? []).map((c: any) => [c.id, c]))

  const cedulas = [...new Set(arr.map(c => c.captain_cedula))]
  const { data: captains } = await sb
    .from('captains')
    .select('cedula, preferred_name, reliability_score, challenges_finished')
    .in('cedula', cedulas)

  const captainMap = new Map((captains ?? []).map((c: any) => [c.cedula, c]))

  const enriched: Challenge[] = arr.map(c => {
    const cx  = c.complex_id ? complexMap.get(c.complex_id) : null
    const cap = captainMap.get(c.captain_cedula)
    return {
      id: c.id,
      slug: c.slug,
      status: c.status,
      venue_type: c.venue_type,
      complex_name: cx?.name ?? null,
      complex_city: cx?.city ?? null,
      venue_name: c.venue_name,
      venue_city: c.venue_city,
      field_label: c.field_label,
      sport: c.sport,
      match_date: c.match_date,
      match_hour: c.match_hour,
      description: c.description,
      team_name: c.team_name,
      captain_cedula: c.captain_cedula,
      captain_name:    cap?.preferred_name ?? 'Capitán',
      captain_score:   cap?.reliability_score ?? null,
      captain_finished: cap?.challenges_finished ?? 0,
      created_at: c.created_at,
    }
  })

  return { props: { challenges: enriched } }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RetosFeedPage({ challenges }: Props) {
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [cityFilter,  setCityFilter]  = useState<string>('all')
  const [myChallenges, setMyChallenges] = useState<MyChallengeRef[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('golplay_my_challenges')
      if (stored) {
        const parsed = JSON.parse(stored)
        setMyChallenges(Array.isArray(parsed) ? parsed : [])
      }
    } catch (e) {
      console.warn('No pude leer mis retos:', e)
    }
  }, [])

  const cities = useMemo(() => {
    const set = new Set<string>()
    challenges.forEach(c => {
      const city = c.complex_city || c.venue_city
      if (city) set.add(city)
    })
    return Array.from(set).sort()
  }, [challenges])

  const sports = useMemo(() => {
    return Array.from(new Set(challenges.map(c => c.sport)))
  }, [challenges])

  const filtered = useMemo(() => {
    return challenges.filter(c => {
      if (sportFilter !== 'all' && c.sport !== sportFilter) return false
      if (cityFilter !== 'all') {
        const city = c.complex_city || c.venue_city
        if (city !== cityFilter) return false
      }
      return true
    })
  }, [challenges, sportFilter, cityFilter])

  return (
    <>
      <Head>
        <title>Retos · GolPlay</title>
        <meta name="description" content="Equipos buscando rival. Encontrá tu próximo partido." />
      </Head>
      <style>{CSS}</style>

      <div className="theme-light">
        <Navbar />

        <div className="rt-wrap">
          {/* Hero */}
          <section className="rt-hero">
            <p className="rt-hero__eyebrow">RETOS ABIERTOS</p>
            <h1 className="rt-hero__title">Equipos buscan rival</h1>
            <p className="rt-hero__sub">Aceptá un reto y a jugar. Sin trámites, sin pagos por adelantado.</p>
            <div className="rt-hero-ctas">
              <Link href="/retos/publicar" className="rt-btn rt-btn--primary rt-btn--big">
                + Publicar mi reto
              </Link>
              <Link href="/retos/mis-retos" className="rt-btn rt-btn--secondary">
                📋 Mis retos
              </Link>
            </div>
          </section>

          {/* Tus retos activos (recovery por localStorage) */}
          {myChallenges.length > 0 && (
            <section className="rt-mine">
              <h2 className="rt-mine__title">Tus retos en este navegador</h2>
              <div className="rt-mine__list">
                {myChallenges.slice(0, 4).map(m => (
                  <Link key={m.slug} href={`/retos/${m.slug}?ref=${m.token}`} className="rt-mine__card">
                    <span className="rt-mine__role">
                      {m.role === 'publisher' ? '📢 Publicado' : '⚡ Aceptado'}
                    </span>
                    <span className="rt-mine__team">{m.team_name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Filtros */}
          <section className="rt-filters">
            <div className="rt-filter-group">
              <button
                className={`rt-filter ${sportFilter === 'all' ? 'rt-filter--active' : ''}`}
                onClick={() => setSportFilter('all')}
              >
                Todos los deportes
              </button>
              {sports.map(sp => {
                const meta = SPORT_META[sp] ?? SPORT_META.otro
                return (
                  <button
                    key={sp}
                    className={`rt-filter ${sportFilter === sp ? 'rt-filter--active' : ''}`}
                    onClick={() => setSportFilter(sp)}
                  >
                    {meta.emoji} {meta.label}
                  </button>
                )
              })}
            </div>

            {cities.length > 1 && (
              <div className="rt-filter-group">
                <button
                  className={`rt-filter ${cityFilter === 'all' ? 'rt-filter--active' : ''}`}
                  onClick={() => setCityFilter('all')}
                >
                  Toda Costa Rica
                </button>
                {cities.map(c => (
                  <button
                    key={c}
                    className={`rt-filter ${cityFilter === c ? 'rt-filter--active' : ''}`}
                    onClick={() => setCityFilter(c)}
                  >
                    📍 {c}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Feed */}
          {filtered.length === 0 ? (
            <div className="rt-empty">
              <span className="rt-empty__emoji">⚔️</span>
              <p className="rt-empty__title">
                {challenges.length === 0 ? 'No hay retos abiertos todavía' : 'Sin retos con esos filtros'}
              </p>
              <p className="rt-empty__sub">
                {challenges.length === 0
                  ? 'Sé el primero. Publicá tu reto y otros capitanes te van a encontrar.'
                  : 'Probá cambiando los filtros o publicá tu propio reto.'}
              </p>
              <Link href="/retos/publicar" className="rt-btn rt-btn--primary">
                + Publicar mi reto
              </Link>
            </div>
          ) : (
            <div className="rt-grid">
              {filtered.map(c => {
                const sp = SPORT_META[c.sport] ?? SPORT_META.otro
                const venue = c.complex_name
                  ? `${c.complex_name}${c.field_label ? ' · ' + c.field_label : ''}`
                  : c.venue_name
                  ? c.venue_name
                  : 'Cancha a definir'
                const city     = c.complex_city || c.venue_city
                const verified = c.venue_type === 'golplay'
                const tbd      = c.venue_type === 'tbd'

                return (
                  <Link key={c.id} href={`/retos/${c.slug}`} className="rt-card">
                    <div className="rt-card__head">
                      <span className="rt-card__sport" style={{ color: sp.color, background: sp.color + '18' }}>
                        {sp.emoji} {sp.label}
                      </span>
                      {c.captain_score !== null && c.captain_finished >= 3 ? (
                        <span className="rt-card__score">⭐ {Math.round(c.captain_score * 100)}%</span>
                      ) : (
                        <span className="rt-card__score rt-card__score--new">Capitán nuevo</span>
                      )}
                    </div>

                    <div className="rt-card__matchup">
                      <div className="rt-card__team">
                        <div className="rt-card__avatar">{c.team_name[0].toUpperCase()}</div>
                        <span className="rt-card__team-name">{c.team_name}</span>
                      </div>
                      <span className="rt-card__vs">VS</span>
                      <div className="rt-card__team">
                        <div className="rt-card__avatar rt-card__avatar--empty">?</div>
                        <span className="rt-card__team-name rt-card__team-name--empty">Tu equipo</span>
                      </div>
                    </div>

                    <div className="rt-card__details">
                      <div className="rt-card__detail">
                        <span className="rt-card__icon">📍</span>
                        <span>
                          {venue}
                          {city && ` · ${city}`}
                          {verified && <span className="rt-card__badge rt-card__badge--ok"> ✓</span>}
                          {tbd      && <span className="rt-card__badge rt-card__badge--tbd"> 🤝</span>}
                        </span>
                      </div>
                      <div className="rt-card__detail">
                        <span className="rt-card__icon">📅</span>
                        <span>
                          {c.match_date ? fmtDate(c.match_date) : 'A definir'}
                          {c.match_hour && ` · ${c.match_hour}`}
                        </span>
                      </div>
                      {c.description && (
                        <div className="rt-card__detail">
                          <span className="rt-card__icon">💬</span>
                          <span className="rt-card__desc">{c.description}</span>
                        </div>
                      )}
                    </div>

                    <div className="rt-card__foot">
                      <span className="rt-card__when">{fmtTimeUntil(c.match_date, c.match_hour)}</span>
                      <span className="rt-card__cta">Aceptar reto →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Footer */}
          <footer className="rt-foot">
            <p className="rt-foot__brand">GolPlay</p>
            <p className="rt-foot__sub">Encontrá rival, jugá hoy.</p>
          </footer>
        </div>
      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
.rt-wrap {
  padding-bottom: 60px;
  min-height: 100vh;
}

/* — Hero ─────────────────────────────────────────────────────── */
.rt-hero {
  text-align: center;
  padding: calc(62px + 40px) 24px 32px;
  max-width: 600px;
  margin: 0 auto;
}
.rt-hero__eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: .14em;
  margin: 0 0 12px;
}
.rt-hero__title {
  font-family: var(--font-d);
  font-size: clamp(36px, 6vw, 52px);
  font-weight: 800;
  letter-spacing: -.02em;
  color:var(--ink);
  margin: 0 0 14px;
  line-height: 1.05;
}
.rt-hero__sub {
  font-size: 15px;
  color: var(--ink2);
  margin: 0 0 24px;
  line-height: 1.6;
}
.rt-hero-ctas {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

/* — Mis retos (localStorage recovery) ────────────────────────── */
.rt-mine {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 24px;
}
.rt-mine__title {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .08em;
  margin: 0 0 10px;
}
.rt-mine__list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.rt-mine__card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: rgba(58,91,240,.08);
  border: 1px solid rgba(58,91,240,.2);
  border-radius: 10px;
  text-decoration: none;
  min-width: 140px;
  transition: all .15s;
}
.rt-mine__card:hover { background: rgba(58,91,240,.14); }
.rt-mine__role {
  font-size: 10px;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: .06em;
}
.rt-mine__team {
  font-size: 14px;
  font-weight: 700;
  color:var(--ink);
}

/* — Filtros ──────────────────────────────────────────────────── */
.rt-filters {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rt-filter-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.rt-filter {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink2);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all .13s;
}
.rt-filter:hover {
  color:var(--ink);
  border-color: var(--faint);
}
.rt-filter--active {
  border-color: var(--blue);
  background: rgba(58,91,240,.12);
  color: var(--blue);
  font-weight: 700;
}

/* — Grid ─────────────────────────────────────────────────────── */
.rt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* — Card ─────────────────────────────────────────────────────── */
.rt-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px;
  cursor: pointer;
  transition: all .2s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.rt-card:hover {
  background: var(--line);
  border-color: rgba(58,91,240,.3);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(20,26,51,.12);
}

.rt-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rt-card__sport {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.rt-card__score {
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
}
.rt-card__score--new {
  color: var(--muted);
  font-weight: 500;
}

.rt-card__matchup {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.rt-card__team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.rt-card__avatar {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: rgba(58,91,240,.15);
  border: 2px solid rgba(58,91,240,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: var(--blue);
  font-family: var(--font-d);
}
.rt-card__avatar--empty {
  background: #fff;
  border: 2px dashed var(--line);
  color: var(--muted);
}
.rt-card__team-name {
  font-size: 12px;
  font-weight: 700;
  color:var(--ink);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.rt-card__team-name--empty {
  color: var(--muted);
  font-weight: 500;
}
.rt-card__vs {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 800;
  color: var(--muted);
  flex-shrink: 0;
  letter-spacing: .05em;
  font-family: var(--font-d);
}

.rt-card__details {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.rt-card__detail {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  color: var(--ink2);
  line-height: 1.4;
}
.rt-card__icon {
  width: 18px;
  flex-shrink: 0;
  text-align: center;
}
.rt-card__desc {
  font-style: italic;
  color: var(--muted);
}
.rt-card__badge { font-size: 11px; }
.rt-card__badge--ok  { color: var(--blue); }
.rt-card__badge--tbd { color: #fbbf24; }

.rt-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.rt-card__when {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.rt-card__cta {
  font-size: 12px;
  font-weight: 700;
  color: var(--blue);
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(58,91,240,.1);
  border: 1px solid rgba(58,91,240,.2);
}

/* — Empty state ──────────────────────────────────────────────── */
.rt-empty {
  max-width: 480px;
  margin: 40px auto;
  padding: 60px 24px;
  text-align: center;
}
.rt-empty__emoji {
  font-size: 56px;
  display: block;
  margin-bottom: 16px;
  opacity: .6;
}
.rt-empty__title {
  font-family: var(--font-d);
  font-size: 26px;
  font-weight: 800;
  color:var(--ink);
  margin: 0 0 8px;
}
.rt-empty__sub {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 22px;
  line-height: 1.6;
}

/* — Buttons ──────────────────────────────────────────────────── */
.rt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 26px;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-u);
  cursor: pointer;
  border: none;
  text-decoration: none;
  transition: all .15s;
}
.rt-btn--big {
  padding: 16px 32px;
  font-size: 15px;
}
.rt-btn--primary {
  background: var(--blue);
  color:#fff;
  box-shadow: 0 8px 22px rgba(58,91,240,.28);
}
.rt-btn--primary:hover {
  background: var(--blue2);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(58,91,240,.35);
}
.rt-btn--secondary {
  background: #fff;
  color: var(--ink2);
  border: 1px solid var(--line);
}
.rt-btn--secondary:hover {
  background: var(--paper);
  border-color: var(--faint);
}

/* — Footer ───────────────────────────────────────────────────── */
.rt-foot {
  max-width: 1200px;
  margin: 60px auto 0;
  padding: 30px 24px;
  text-align: center;
  border-top: 1px solid var(--line);
}
.rt-foot__brand {
  font-family: var(--font-d);
  font-size: 18px;
  font-weight: 800;
  color:var(--ink);
  margin: 0 0 4px;
}
.rt-foot__sub {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

@media (max-width: 600px) {
  .rt-hero { padding: calc(62px + 24px) 20px 24px; }
  .rt-hero__title { font-size: 32px; }
  .rt-grid { grid-template-columns: 1fr; }
}
`