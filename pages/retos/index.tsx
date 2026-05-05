/**
 * GolPlay — pages/retos/index.tsx
 * Feed público de retos
 *
 * - Lista retos abiertos + matched (sin contactos)
 * - Filtros: deporte, ciudad, fecha
 * - Card con reliability_score
 * - Botón "+ Publicar mi reto"
 * - Sección "Tus retos activos" (si hay tokens en localStorage)
 */

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

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

const SPORT_META: Record<string, { label: string; emoji: string; color: string }> = {
  futbol5: { label: 'Fútbol 5', emoji: '⚽', color: '#16a34a' },
  futbol7: { label: 'Fútbol 7', emoji: '⚽', color: '#16a34a' },
  futbol8: { label: 'Fútbol 8', emoji: '⚽', color: '#16a34a' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽', color: '#16a34a' },
  padel: { label: 'Pádel', emoji: '🎾', color: '#eab308' },
  tenis: { label: 'Tenis', emoji: '🎾', color: '#eab308' },
  basquet: { label: 'Básquet', emoji: '🏀', color: '#f97316' },
  otro: { label: 'Otro', emoji: '🏟', color: '#6b7280' },
}

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

const fmtTimeUntil = (date: string | null, hour: string | null) => {
  if (!date) return 'Fecha a definir'
  const [y, m, d] = date.split('-').map(Number)
  const h = hour ? Number(hour.split(':')[0]) : 12
  const min = hour ? Number(hour.split(':')[1] ?? 0) : 0
  const target = new Date(y, m - 1, d, h, min)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  if (diff < 0) return 'Ya pasó'
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 1) return `En ${days} días`
  if (days === 1) return 'Mañana'
  if (hours >= 2) return `En ${hours} horas`
  return 'Hoy'
}

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

  // Cargar complejos referenciados
  const complexIds = arr
    .map(c => c.complex_id)
    .filter((id): id is number => !!id)

  const { data: complexes } = complexIds.length > 0
    ? await sb.from('complexes').select('id, name, city').in('id', complexIds)
    : { data: [] }

  const complexMap = new Map((complexes ?? []).map((c: any) => [c.id, c]))

  // Cargar capitanes
  const cedulas = [...new Set(arr.map(c => c.captain_cedula))]
  const { data: captains } = await sb
    .from('captains')
    .select('cedula, preferred_name, reliability_score, challenges_finished')
    .in('cedula', cedulas)

  const captainMap = new Map((captains ?? []).map((c: any) => [c.cedula, c]))

  const enriched: Challenge[] = arr.map(c => {
    const cx = c.complex_id ? complexMap.get(c.complex_id) : null
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
      captain_name: cap?.preferred_name ?? 'Capitán',
      captain_score: cap?.reliability_score ?? null,
      captain_finished: cap?.challenges_finished ?? 0,
      created_at: c.created_at,
    }
  })

  return { props: { challenges: enriched } }
}

interface MyChallengeRef {
  slug: string
  role: 'publisher' | 'acceptor'
  token: string
  team_name: string
  saved_at: string
}

export default function RetosFeedPage({ challenges }: Props) {
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [myChallenges, setMyChallenges] = useState<MyChallengeRef[]>([])

  // Cargar retos guardados en localStorage
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
      <style jsx global>{GLOBAL_CSS}</style>
      <style>{CSS}</style>

      <div className="rt">
        <header className="rt-top">
          <Link href="/" className="rt-top__brand">GolPlay</Link>
          <Link href="/retos/mis-retos" className="rt-top__link">Mis retos</Link>
        </header>

        <section className="rt-hero">
          <p className="rt-hero__eyebrow">RETOS ABIERTOS</p>
          <h1 className="rt-hero__title">Equipos buscan rival</h1>
          <p className="rt-hero__sub">Aceptá un reto y a jugar. Sin trámites, sin pagos por adelantado.</p>
          <Link href="/retos/publicar" className="rt-btn rt-btn--primary rt-btn--big">
            + Publicar mi reto
          </Link>
        </section>

        {/* Mis retos activos (recovery por localStorage) */}
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
              const city = c.complex_city || c.venue_city
              const verified = c.venue_type === 'golplay'
              const tbd = c.venue_type === 'tbd'

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
                        {tbd && <span className="rt-card__badge rt-card__badge--tbd"> 🤝</span>}
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

        <footer className="rt-foot">
          <p className="rt-foot__brand">GolPlay</p>
          <p className="rt-foot__sub">Encontrá rival, jugá hoy.</p>
        </footer>
      </div>
    </>
  )
}

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&display=swap');
html, body { margin: 0; padding: 0; background: #0C0D0B; color: #F5F2EC; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
`

const CSS = `
.rt { min-height: 100vh; background: #0C0D0B; padding-bottom: 60px; }

.rt-top { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; max-width: 1200px; margin: 0 auto; }
.rt-top__brand { font-family: 'DM Serif Display', serif; font-size: 22px; color: #F5F2EC; text-decoration: none; }
.rt-top__link { font-size: 13px; color: rgba(245,242,236,.65); text-decoration: none; padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(245,242,236,.12); font-weight: 600; }
.rt-top__link:hover { color: #4ade80; border-color: rgba(74,222,128,.3); }

.rt-hero { text-align: center; padding: 36px 24px 28px; max-width: 600px; margin: 0 auto; }
.rt-hero__eyebrow { font-size: 11px; font-weight: 700; color: #4ade80; letter-spacing: .14em; margin: 0 0 12px; }
.rt-hero__title { font-family: 'DM Serif Display', serif; font-size: clamp(36px, 6vw, 52px); font-weight: 400; letter-spacing: -.02em; color: #F5F2EC; margin: 0 0 14px; line-height: 1.05; }
.rt-hero__sub { font-size: 15px; color: rgba(245,242,236,.6); margin: 0 0 24px; line-height: 1.6; }

.rt-mine { max-width: 1200px; margin: 0 auto; padding: 0 24px 24px; }
.rt-mine__title { font-size: 12px; font-weight: 700; color: rgba(245,242,236,.5); text-transform: uppercase; letter-spacing: .08em; margin: 0 0 10px; }
.rt-mine__list { display: flex; gap: 8px; flex-wrap: wrap; }
.rt-mine__card { display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; background: rgba(74,222,128,.08); border: 1px solid rgba(74,222,128,.2); border-radius: 10px; text-decoration: none; min-width: 140px; transition: all .15s; }
.rt-mine__card:hover { background: rgba(74,222,128,.14); }
.rt-mine__role { font-size: 10px; font-weight: 700; color: #4ade80; letter-spacing: .06em; }
.rt-mine__team { font-size: 14px; font-weight: 700; color: #F5F2EC; }

.rt-filters { max-width: 1200px; margin: 0 auto; padding: 0 24px 24px; display: flex; flex-direction: column; gap: 10px; }
.rt-filter-group { display: flex; gap: 6px; flex-wrap: wrap; }
.rt-filter { padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(245,242,236,.1); background: transparent; color: rgba(245,242,236,.6); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all .13s; }
.rt-filter:hover { color: #F5F2EC; border-color: rgba(245,242,236,.25); }
.rt-filter--active { border-color: #22c55e; background: rgba(34,197,94,.12); color: #4ade80; font-weight: 700; }

.rt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; max-width: 1200px; margin: 0 auto; padding: 0 24px; }

.rt-card { background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.08); border-radius: 18px; padding: 20px; cursor: pointer; transition: all .2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 16px; }
.rt-card:hover { background: rgba(245,242,236,.06); border-color: rgba(74,222,128,.3); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,.3); }

.rt-card__head { display: flex; justify-content: space-between; align-items: center; }
.rt-card__sport { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.rt-card__score { font-size: 11px; font-weight: 700; color: #fbbf24; }
.rt-card__score--new { color: rgba(245,242,236,.4); font-weight: 500; }

.rt-card__matchup { display: flex; align-items: center; justify-content: center; gap: 14px; }
.rt-card__team { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.rt-card__avatar { width: 44px; height: 44px; border-radius: 13px; background: rgba(34,197,94,.15); border: 2px solid rgba(34,197,94,.3); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: #4ade80; }
.rt-card__avatar--empty { background: rgba(245,242,236,.04); border: 2px dashed rgba(245,242,236,.18); color: rgba(245,242,236,.4); }
.rt-card__team-name { font-size: 12px; font-weight: 700; color: #F5F2EC; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
.rt-card__team-name--empty { color: rgba(245,242,236,.4); font-weight: 500; }
.rt-card__vs { width: 32px; height: 32px; border-radius: 50%; background: rgba(245,242,236,.06); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: rgba(245,242,236,.4); flex-shrink: 0; letter-spacing: .05em; }

.rt-card__details { display: flex; flex-direction: column; gap: 7px; }
.rt-card__detail { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: rgba(245,242,236,.7); line-height: 1.4; }
.rt-card__icon { width: 18px; flex-shrink: 0; text-align: center; }
.rt-card__desc { font-style: italic; color: rgba(245,242,236,.55); }
.rt-card__badge { font-size: 11px; }
.rt-card__badge--ok { color: #4ade80; }
.rt-card__badge--tbd { color: #fbbf24; }

.rt-card__foot { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid rgba(245,242,236,.06); }
.rt-card__when { font-size: 11px; font-weight: 600; color: rgba(245,242,236,.4); }
.rt-card__cta { font-size: 12px; font-weight: 700; color: #4ade80; padding: 6px 12px; border-radius: 8px; background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.2); }

.rt-empty { max-width: 480px; margin: 40px auto; padding: 60px 24px; text-align: center; }
.rt-empty__emoji { font-size: 56px; display: block; margin-bottom: 16px; opacity: .6; }
.rt-empty__title { font-family: 'DM Serif Display', serif; font-size: 26px; color: #F5F2EC; margin: 0 0 8px; }
.rt-empty__sub { font-size: 14px; color: rgba(245,242,236,.55); margin: 0 0 22px; line-height: 1.6; }

.rt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 26px; border-radius: 12px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; text-decoration: none; transition: all .15s; }
.rt-btn--big { padding: 16px 30px; font-size: 15px; }
.rt-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 4px 18px rgba(22,163,74,.3); }
.rt-btn--primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(22,163,74,.4); }

.rt-foot { max-width: 1200px; margin: 60px auto 0; padding: 30px 24px; text-align: center; border-top: 1px solid rgba(245,242,236,.06); }
.rt-foot__brand { font-family: 'DM Serif Display', serif; font-size: 18px; color: #F5F2EC; margin: 0 0 4px; }
.rt-foot__sub { font-size: 12px; color: rgba(245,242,236,.4); margin: 0; }

@media (max-width: 600px) {
  .rt-hero__title { font-size: 32px; }
  .rt-grid { grid-template-columns: 1fr; }
}
`