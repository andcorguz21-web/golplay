/**
 * GolPlay — pages/retos/mis-retos.tsx
 * Recuperar retos sin login: meté tu cédula y ves tus retos
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface MyChallenge {
  id: string
  slug: string
  status: string
  team_name: string
  sport: string
  match_date: string | null
  match_hour: string | null
  role: 'publisher' | 'acceptor'
  created_at: string
}

interface CaptainStats {
  preferred_name: string
  challenges_published: number
  challenges_accepted: number
  challenges_confirmed: number
  challenges_finished: number
  challenges_abandoned: number
  reliability_score: number | null
}

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  futbol5: { label: 'Fútbol 5', emoji: '⚽' },
  futbol7: { label: 'Fútbol 7', emoji: '⚽' },
  futbol8: { label: 'Fútbol 8', emoji: '⚽' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽' },
  padel: { label: 'Pádel', emoji: '🎾' },
  tenis: { label: 'Tenis', emoji: '🎾' },
  basquet: { label: 'Básquet', emoji: '🏀' },
  otro: { label: 'Otro', emoji: '🏟' },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  open: { label: 'Buscando rival', color: '#4ade80' },
  matched: { label: 'Aceptado', color: '#fbbf24' },
  confirmed: { label: 'Confirmado', color: '#4ade80' },
  finished: { label: 'Jugado', color: '#a78bfa' },
  cancelled: { label: 'Cancelado', color: '#f87171' },
  expired: { label: 'Expirado', color: 'rgba(245,242,236,.5)' },
}

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

const onlyDigits = (s: string, max?: number) => {
  const d = s.replace(/\D/g, '')
  return max ? d.slice(0, max) : d
}

export default function MisRetosPage() {
  const [cedula, setCedula] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [stats, setStats] = useState<CaptainStats | null>(null)
  const [published, setPublished] = useState<MyChallenge[]>([])
  const [accepted, setAccepted] = useState<MyChallenge[]>([])

  // Pre-cargar cédula si está en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('golplay_captain_data')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.cedula) setCedula(d.cedula)
      }
    } catch {}
  }, [])

  const handleSearch = async () => {
    setError('')
    if (cedula.length !== 9) {
      setError('Cédula debe tener 9 dígitos')
      return
    }

    setLoading(true)
    setSearched(true)

    // Cargar capitán
    const { data: captain, error: capErr } = await supabase
  .from('captains')
  .select('preferred_name, challenges_published, challenges_accepted, challenges_confirmed, challenges_finished, challenges_abandoned, reliability_score')
  .eq('cedula', cedula)
  .maybeSingle()

console.log('🔍 mis-retos search', { 
  cedula_length: cedula.length, 
  cedula_value: JSON.stringify(cedula),
  captain_found: !!captain, 
  captain_data: captain,
  error: capErr 
})

setStats(captain as CaptainStats | null)

    // Retos publicados por esta cédula
    const { data: pubs } = await supabase
      .from('challenges')
      .select('id, slug, status, team_name, sport, match_date, match_hour, created_at')
      .eq('captain_cedula', cedula)
      .order('created_at', { ascending: false })
      .limit(50)

    setPublished(((pubs ?? []) as any[]).map(c => ({ ...c, role: 'publisher' as const })))

    // Retos aceptados por esta cédula
    const { data: accs } = await supabase
      .from('challenge_acceptances')
      .select('challenge_id, created_at, status')
      .eq('captain_cedula', cedula)
      .order('created_at', { ascending: false })
      .limit(50)

    if (accs && accs.length > 0) {
      const challengeIds = accs.map((a: any) => a.challenge_id)
      const { data: chs } = await supabase
        .from('challenges')
        .select('id, slug, status, team_name, sport, match_date, match_hour, created_at')
        .in('id', challengeIds)

      setAccepted(((chs ?? []) as any[]).map(c => ({ ...c, role: 'acceptor' as const })))
    } else {
      setAccepted([])
    }

    // Guardar cédula para próxima vez
    try {
      const existingData = localStorage.getItem('golplay_captain_data')
      const data = existingData ? JSON.parse(existingData) : {}
      data.cedula = cedula
      localStorage.setItem('golplay_captain_data', JSON.stringify(data))
    } catch {}

    setLoading(false)
  }

  const allChallenges = [...published, ...accepted].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <>
      <Head>
        <title>Mis retos · GolPlay</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx global>{GLOBAL_CSS}</style>
      <style>{CSS}</style>

      <div className="mr">
        <div className="mr-top">
          <Link href="/retos" className="mr-top__back">← Volver al feed</Link>
          <Link href="/" className="mr-top__brand">GolPlay</Link>
        </div>

        <div className="mr-stage">
          <p className="mr-eyebrow">MIS RETOS</p>
          <h1 className="mr-h1">Recuperá tus retos</h1>
          <p className="mr-lead">Ingresá tu cédula y ves todos los retos que publicaste y aceptaste, con tus métricas de capitán.</p>

          <div className="mr-search">
            <input
              className="mr-input"
              type="tel"
              inputMode="numeric"
              placeholder="Tu cédula (9 dígitos)"
              value={cedula}
              onChange={e => setCedula(onlyDigits(e.target.value, 9))}
              maxLength={9}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            />
            <button
              className="mr-btn mr-btn--primary"
              onClick={handleSearch}
              disabled={loading || cedula.length !== 9}
            >
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {error && <div className="mr-error">⚠️ {error}</div>}

          {searched && !loading && !stats && (
            <div className="mr-empty">
              <span>🔍</span>
              <p>No encontramos retos asociados a esa cédula.</p>
              <Link href="/retos/publicar" className="mr-btn mr-btn--primary" style={{ marginTop: 12 }}>
                + Publicar tu primer reto
              </Link>
            </div>
          )}

          {searched && !loading && stats && (
            <>
              {/* Stats card */}
              <div className="mr-stats">
                <p className="mr-stats__name">{stats.preferred_name}</p>
                {stats.reliability_score !== null && (stats.challenges_published + stats.challenges_accepted) >= 3 ? (
                  <p className="mr-stats__score">⭐ {Math.round(stats.reliability_score * 100)}% de confiabilidad</p>
                ) : (
                  <p className="mr-stats__score mr-stats__score--new">Capitán nuevo</p>
                )}
                <div className="mr-stats__grid">
                  <div className="mr-stat">
                    <span className="mr-stat__value">{stats.challenges_published}</span>
                    <span className="mr-stat__label">Publicados</span>
                  </div>
                  <div className="mr-stat">
                    <span className="mr-stat__value">{stats.challenges_accepted}</span>
                    <span className="mr-stat__label">Aceptados</span>
                  </div>
                  <div className="mr-stat">
                    <span className="mr-stat__value">{stats.challenges_finished}</span>
                    <span className="mr-stat__label">Jugados</span>
                  </div>
                  {stats.challenges_abandoned > 0 && (
                    <div className="mr-stat mr-stat--bad">
                      <span className="mr-stat__value">{stats.challenges_abandoned}</span>
                      <span className="mr-stat__label">Abandonados</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de retos */}
              <h2 className="mr-section">Tu historial</h2>
              {allChallenges.length === 0 ? (
                <p className="mr-no-history">Sin retos todavía. <Link href="/retos/publicar">Publicá el primero</Link>.</p>
              ) : (
                <div className="mr-list">
                  {allChallenges.map(c => {
                    const sp = SPORT_META[c.sport] ?? SPORT_META.otro
                    const st = STATUS_META[c.status] ?? STATUS_META.open
                    return (
                      <Link key={`${c.id}-${c.role}`} href={`/retos/${c.slug}`} className="mr-card">
                        <div className="mr-card__left">
                          <span className="mr-card__role">
                            {c.role === 'publisher' ? '📢' : '⚡'}
                          </span>
                          <div>
                            <p className="mr-card__team">{c.team_name}</p>
                            <p className="mr-card__meta">
                              {sp.emoji} {sp.label}
                              {c.match_date && ` · ${fmtDate(c.match_date)}`}
                              {c.match_hour && ` · ${c.match_hour}`}
                            </p>
                          </div>
                        </div>
                        <span className="mr-card__status" style={{ color: st.color }}>
                          {st.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
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
.mr { min-height: 100vh; padding-bottom: 80px; }

.mr-top { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; max-width: 600px; margin: 0 auto; }
.mr-top__back { font-size: 13px; color: rgba(245,242,236,.6); text-decoration: none; font-weight: 500; }
.mr-top__back:hover { color: #4ade80; }
.mr-top__brand { font-family: 'DM Serif Display', serif; font-size: 18px; color: #F5F2EC; text-decoration: none; }

.mr-stage { max-width: 540px; margin: 0 auto; padding: 16px 22px 0; }
.mr-eyebrow { font-size: 11px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .12em; margin: 0 0 12px; }
.mr-h1 { font-family: 'DM Serif Display', serif; font-size: 38px; line-height: 1.05; letter-spacing: -.02em; color: #F5F2EC; margin: 0 0 14px; }
.mr-lead { font-size: 15px; color: rgba(245,242,236,.7); line-height: 1.6; margin: 0 0 28px; }

.mr-search { display: flex; gap: 8px; margin-bottom: 18px; }
.mr-input { flex: 1; padding: 13px 16px; border-radius: 12px; border: 1.5px solid rgba(245,242,236,.12); background: #16181A; color: #F5F2EC; font-family: inherit; font-size: 15px; outline: none; transition: all .15s; }
.mr-input:focus { border-color: #4ade80; }

.mr-error { padding: 12px 16px; border-radius: 10px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3); font-size: 13px; color: #f87171; font-weight: 500; margin-bottom: 14px; }

.mr-empty { text-align: center; padding: 40px 24px; background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.08); border-radius: 14px; }
.mr-empty span { font-size: 36px; display: block; margin-bottom: 12px; opacity: .6; }
.mr-empty p { font-size: 14px; color: rgba(245,242,236,.6); margin: 0; }

.mr-stats { padding: 20px; background: linear-gradient(160deg, rgba(74,222,128,.06), rgba(74,222,128,.02)); border: 1px solid rgba(74,222,128,.2); border-radius: 16px; margin-bottom: 24px; }
.mr-stats__name { font-family: 'DM Serif Display', serif; font-size: 24px; color: #F5F2EC; margin: 0 0 4px; }
.mr-stats__score { font-size: 13px; color: #fbbf24; font-weight: 700; margin: 0 0 16px; }
.mr-stats__score--new { color: rgba(245,242,236,.5); font-weight: 500; }
.mr-stats__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; }
.mr-stat { display: flex; flex-direction: column; align-items: center; padding: 10px; background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.06); border-radius: 10px; }
.mr-stat--bad { border-color: rgba(248,113,113,.25); }
.mr-stat__value { font-size: 20px; font-weight: 800; color: #F5F2EC; }
.mr-stat__label { font-size: 10px; color: rgba(245,242,236,.55); text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
.mr-stat--bad .mr-stat__value { color: #f87171; }

.mr-section { font-family: 'DM Serif Display', serif; font-size: 22px; color: #F5F2EC; margin: 0 0 14px; }

.mr-no-history { font-size: 14px; color: rgba(245,242,236,.55); text-align: center; padding: 30px; }
.mr-no-history a { color: #4ade80; }

.mr-list { display: flex; flex-direction: column; gap: 8px; }
.mr-card { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(245,242,236,.04); border: 1px solid rgba(245,242,236,.08); border-radius: 12px; text-decoration: none; color: inherit; transition: all .15s; }
.mr-card:hover { background: rgba(245,242,236,.06); border-color: rgba(74,222,128,.25); }
.mr-card__left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.mr-card__role { font-size: 18px; flex-shrink: 0; }
.mr-card__team { font-size: 14px; font-weight: 700; color: #F5F2EC; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mr-card__meta { font-size: 11.5px; color: rgba(245,242,236,.55); margin: 0; }
.mr-card__status { font-size: 11px; font-weight: 700; flex-shrink: 0; }

.mr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 22px; border-radius: 12px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; text-decoration: none; transition: all .15s; }
.mr-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 4px 16px rgba(22,163,74,.3); }
.mr-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(22,163,74,.4); }
.mr-btn--primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }

@media (max-width: 480px) {
  .mr-h1 { font-size: 30px; }
  .mr-search { flex-direction: column; }
}
`