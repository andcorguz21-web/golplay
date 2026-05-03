/**
 * GolPlay — pages/admin/tournaments/[id].tsx
 * Detalle y gestión de un torneo
 *
 * Tabs: Resumen / Equipos / Partidos / Configuración
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import {
  Tournament,
  TournamentTeam,
  TournamentMatch,
  TournamentStatus,
  SportType,
} from '@/types/tournaments'

// ─── Types ──────────────────────────────────────────────────

type TabId = 'overview' | 'teams' | 'matches' | 'config'

// ─── Constantes ─────────────────────────────────────────────

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽' },
  padel:    { label: 'Pádel',     emoji: '🎾' },
  otro:     { label: 'Otro',      emoji: '🏟️' },
}

const STATUS_CFG: Record<TournamentStatus, { label: string; color: string; bg: string }> = {
  DRAFT:       { label: 'Borrador',               color: '#6b7280', bg: '#f1f5f9' },
  OPEN:        { label: 'Inscripciones abiertas', color: '#16a34a', bg: '#f0fdf4' },
  FULL:        { label: 'Lleno',                  color: '#d97706', bg: '#fffbeb' },
  IN_PROGRESS: { label: 'En curso',               color: '#2563eb', bg: '#eff6ff' },
  FINISHED:    { label: 'Finalizado',             color: '#7c3aed', bg: '#f5f3ff' },
  CANCELLED:   { label: 'Cancelado',              color: '#dc2626', bg: '#fef2f2' },
}

const TEAM_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: 'Pendiente pago', color: '#d97706', bg: '#fffbeb' },
  CONFIRMED:       { label: 'Confirmado',     color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED:       { label: 'Cancelado',      color: '#dc2626', bg: '#fef2f2' },
}

// ─── Helpers ────────────────────────────────────────────────

const fmtCRC = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const fmtDateTime = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const fmtPhone = (p: string | null) => {
  if (!p) return '—'
  // Si tiene 8 dígitos, formato 8888-8888
  const digits = p.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4)}`
  return p
}

// ─── Page ──────────────────────────────────────────────────

export default function TournamentDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { isAdmin, loading: adminLoading, userId } = usePlatformAdmin()

  const [loading, setLoading]   = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [complexName, setComplexName] = useState<string | null>(null)
  const [teams, setTeams]       = useState<TournamentTeam[]>([])
  const [matches, setMatches]   = useState<TournamentMatch[]>([])

  const [tab, setTab]           = useState<TabId>('overview')
  const [acting, setActing]     = useState(false)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
    })
  }, [router])

  // ── Load all data ──
  const loadAll = useCallback(async () => {
    if (!id || typeof id !== 'string') return
    setLoading(true)

    // Tournament + complex name
    const { data: t, error: tErr } = await supabase
      .from('tournaments')
      .select(`
        id, complex_id, venue_name, venue_address, venue_city, venue_lat, venue_lng,
        is_external, managed_by, slug, name, description, rules, sport_type, format,
        start_date, end_date, max_teams, price_per_team, cover_image_url, status,
        sinpe_phone, sinpe_holder, contact_phone, created_at, updated_at,
        complexes ( name )
      `)
      .eq('id', id)
      .single()

    if (tErr || !t) {
      console.error('Error cargando torneo:', tErr)
      setLoading(false)
      return
    }

    const { complexes, ...rest } = t as any
    setTournament({
      ...rest,
      price_per_team: Number(rest.price_per_team),
      venue_lat: rest.venue_lat !== null ? Number(rest.venue_lat) : null,
      venue_lng: rest.venue_lng !== null ? Number(rest.venue_lng) : null,
    })
    setComplexName(complexes?.name ?? null)

    // Teams
    const { data: ts } = await supabase
      .from('tournament_teams')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true })

    setTeams((ts ?? []) as TournamentTeam[])

    // Matches
    const { data: ms } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    setMatches((ms ?? []) as TournamentMatch[])

    setLoading(false)
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Soy operating as super-admin? (gestionando torneo ajeno) ──
  const isSuperAdminOperating = useMemo(() => {
    if (!tournament || !userId) return false
    return isAdmin && tournament.managed_by !== userId
  }, [isAdmin, tournament, userId])

  // ── Stats ──
  const stats = useMemo(() => {
    const confirmed = teams.filter(t => t.status === 'CONFIRMED').length
    const pending   = teams.filter(t => t.status === 'PENDING_PAYMENT').length
    const cancelled = teams.filter(t => t.status === 'CANCELLED').length
    const revenue   = confirmed * (tournament?.price_per_team ?? 0)
    return { confirmed, pending, cancelled, revenue, total: teams.length }
  }, [teams, tournament])

  const publicUrl = useMemo(() => {
    if (!tournament) return ''
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/torneos/${tournament.slug}`
  }, [tournament])

  // ── Actions ──

  const updateStatus = async (newStatus: TournamentStatus, msg: string) => {
    if (!tournament) return
    setActing(true)
    const { error } = await supabase
      .from('tournaments')
      .update({ status: newStatus })
      .eq('id', tournament.id)
    setActing(false)
    if (error) {
      showToast('Error: ' + error.message, false)
      return
    }
    showToast(msg)
    loadAll()
  }

  const handleOpenRegistration = () => {
    if (!tournament) return
    if (tournament.is_external && (!tournament.sinpe_phone || !tournament.sinpe_holder)) {
      showToast('Configurá SINPE primero (titular y teléfono)', false)
      return
    }
    updateStatus('OPEN', '✅ Inscripciones abiertas — compartí el link público')
  }

  const handleCloseRegistration = () => {
    if (confirm('¿Cerrar inscripciones? El torneo no aceptará más equipos.')) {
      updateStatus('FULL', 'Inscripciones cerradas')
    }
  }

  const handleStartTournament = () => {
    if (confirm('¿Marcar torneo como en curso?')) {
      updateStatus('IN_PROGRESS', 'Torneo en curso')
    }
  }

  const handleFinishTournament = () => {
    if (confirm('¿Finalizar torneo? No vas a poder cargar más resultados.')) {
      updateStatus('FINISHED', 'Torneo finalizado 🏆')
    }
  }

  const handleCancelTournament = () => {
    if (confirm('¿Cancelar torneo? Esta acción solo se puede revertir desde la base de datos.')) {
      updateStatus('CANCELLED', 'Torneo cancelado')
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      showToast('Link copiado 📋')
    } catch {
      showToast('No se pudo copiar', false)
    }
  }

  const handleShareWhatsApp = () => {
    if (!tournament) return
    const text = `🏆 *${tournament.name}*\n\nInscribí tu equipo:\n${publicUrl}\n\nFecha: ${fmtDate(tournament.start_date)}\nPrecio por equipo: ${fmtCRC(tournament.price_per_team)}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  // ── Render guards ──
  if (loading || adminLoading) {
    return (
      <AdminLayout>
        <style>{CSS}</style>
        <div className="td"><div className="td__loader">Cargando torneo…</div></div>
      </AdminLayout>
    )
  }

  if (!tournament) {
    return (
      <AdminLayout>
        <style>{CSS}</style>
        <div className="td">
          <div className="td__error">
            <p>No se encontró el torneo o no tenés permiso para verlo.</p>
            <Link href="/admin/tournaments" className="tn-btn tn-btn--primary">← Volver a torneos</Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const sp = SPORT_META[tournament.sport_type] ?? SPORT_META.otro
  const st = STATUS_CFG[tournament.status]
  const venueLabel = tournament.is_external
    ? (tournament.venue_city ? `${tournament.venue_name} · ${tournament.venue_city}` : tournament.venue_name)
    : (complexName ?? 'Sin complejo')

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && (
        <div className={`tn-toast ${toast.ok ? 'tn-toast--ok' : 'tn-toast--err'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div className="td">
        {/* Super-admin warning banner */}
        {isSuperAdminOperating && (
          <div className="td__admin-banner">
            <span>🛡️</span>
            <span>Estás operando como super-admin · este torneo lo gestiona otro organizador</span>
          </div>
        )}

        {/* Back link */}
        <Link href="/admin/tournaments" className="td__back">← Volver a torneos</Link>

        {/* Header */}
        <div className="td__header">
          <div className="td__header-main">
            <div className="td__sport">{sp.emoji} {sp.label}</div>
            <h1 className="td__title">{tournament.name}</h1>
            <div className="td__header-meta">
              <span className="tn-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
              {tournament.is_external && (
                <span className="tn-badge tn-badge--external">GolPlay Organiza</span>
              )}
              <span className="td__meta-item">📅 {fmtDate(tournament.start_date)}{tournament.end_date ? ` → ${fmtDate(tournament.end_date)}` : ''}</span>
              <span className="td__meta-item">📍 {venueLabel}</span>
            </div>
          </div>

          {/* Status quick actions */}
          <div className="td__header-actions">
            {tournament.status === 'DRAFT' && (
              <button className="tn-btn tn-btn--primary" onClick={handleOpenRegistration} disabled={acting}>
                🚀 Abrir inscripciones
              </button>
            )}
            {(tournament.status === 'OPEN' || tournament.status === 'FULL') && (
              <>
                <button className="tn-btn tn-btn--ghost" onClick={handleCopyLink}>📋 Copiar link</button>
                <button className="tn-btn tn-btn--primary" onClick={handleShareWhatsApp}>📱 Compartir</button>
              </>
            )}
            {tournament.status === 'OPEN' && (
              <button className="tn-btn tn-btn--ghost" onClick={handleCloseRegistration} disabled={acting}>
                Cerrar inscripciones
              </button>
            )}
            {tournament.status === 'FULL' && (
              <button className="tn-btn tn-btn--primary" onClick={handleStartTournament} disabled={acting}>
                Iniciar torneo
              </button>
            )}
            {tournament.status === 'IN_PROGRESS' && (
              <button className="tn-btn tn-btn--primary" onClick={handleFinishTournament} disabled={acting}>
                🏆 Finalizar
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="td__tabs">
          {([
            { id: 'overview' as TabId, label: 'Resumen',  icon: '📊', count: null },
            { id: 'teams'    as TabId, label: 'Equipos',  icon: '👥', count: teams.length },
            { id: 'matches'  as TabId, label: 'Partidos', icon: '⚔️', count: matches.length },
            { id: 'config'   as TabId, label: 'Configuración', icon: '⚙️', count: null },
          ]).map(t => (
            <button
              key={t.id}
              className={`td__tab ${tab === t.id ? 'td__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
              {t.count !== null && <span className="td__tab-count">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ============================ TAB CONTENT ============================ */}

        {/* === OVERVIEW === */}
        {tab === 'overview' && (
          <div className="td__panel">
            {/* Stats */}
            <div className="td__stats">
              <div className="td__stat">
                <p className="td__stat-label">Equipos</p>
                <p className="td__stat-value">{stats.confirmed}<span className="td__stat-max"> / {tournament.max_teams}</span></p>
                <p className="td__stat-sub">{stats.pending > 0 ? `${stats.pending} pendiente${stats.pending !== 1 ? 's' : ''}` : 'Sin pendientes'}</p>
              </div>
              <div className="td__stat">
                <p className="td__stat-label">Recaudado</p>
                <p className="td__stat-value">{fmtCRC(stats.revenue)}</p>
                <p className="td__stat-sub">{fmtCRC(tournament.price_per_team)} por equipo</p>
              </div>
              <div className="td__stat">
                <p className="td__stat-label">Partidos</p>
                <p className="td__stat-value">{matches.length}</p>
                <p className="td__stat-sub">{matches.filter(m => m.status === 'FINISHED').length} jugados</p>
              </div>
            </div>

            {/* Public link */}
            {tournament.status !== 'DRAFT' && (
              <div className="td__card">
                <h3 className="td__card-title">🔗 Link público de inscripción</h3>
                <div className="td__link-box">
                  <code className="td__link">{publicUrl}</code>
                  <div className="td__link-actions">
                    <button className="tn-btn tn-btn--ghost" onClick={handleCopyLink}>Copiar</button>
                    <button className="tn-btn tn-btn--primary" onClick={handleShareWhatsApp}>WhatsApp</button>
                  </div>
                </div>
              </div>
            )}

            {/* Venue info */}
            <div className="td__card">
              <h3 className="td__card-title">📍 Ubicación</h3>
              <div className="td__rows">
                <div className="td__row">
                  <span className="td__row-label">{tournament.is_external ? 'Venue' : 'Complejo'}</span>
                  <span className="td__row-value">{tournament.is_external ? tournament.venue_name : complexName}</span>
                </div>
                {tournament.is_external && tournament.venue_address && (
                  <div className="td__row">
                    <span className="td__row-label">Dirección</span>
                    <span className="td__row-value">{tournament.venue_address}</span>
                  </div>
                )}
                {tournament.is_external && tournament.venue_city && (
                  <div className="td__row">
                    <span className="td__row-label">Ciudad</span>
                    <span className="td__row-value">{tournament.venue_city}</span>
                  </div>
                )}
                {tournament.is_external && tournament.venue_lat && tournament.venue_lng && (
                  <div className="td__row">
                    <span className="td__row-label">Mapa</span>
                    <a className="td__row-link" target="_blank" rel="noopener noreferrer"
                       href={`https://www.google.com/maps?q=${tournament.venue_lat},${tournament.venue_lng}`}>
                      Abrir en Google Maps →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Cobranza */}
            <div className="td__card">
              <h3 className="td__card-title">💰 Datos de cobranza</h3>
              <div className="td__rows">
                <div className="td__row">
                  <span className="td__row-label">SINPE a</span>
                  <span className="td__row-value">{fmtPhone(tournament.sinpe_phone)}</span>
                </div>
                <div className="td__row">
                  <span className="td__row-label">Titular</span>
                  <span className="td__row-value">{tournament.sinpe_holder ?? '—'}</span>
                </div>
                <div className="td__row">
                  <span className="td__row-label">WhatsApp público</span>
                  <span className="td__row-value">{fmtPhone(tournament.contact_phone)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {tournament.description && (
              <div className="td__card">
                <h3 className="td__card-title">📝 Descripción</h3>
                <p className="td__text">{tournament.description}</p>
              </div>
            )}

            {tournament.rules && (
              <div className="td__card">
                <h3 className="td__card-title">📋 Reglas</h3>
                <p className="td__text" style={{ whiteSpace: 'pre-wrap' }}>{tournament.rules}</p>
              </div>
            )}
          </div>
        )}

        {/* === TEAMS === */}
        {tab === 'teams' && (
          <div className="td__panel">
            {teams.length === 0 ? (
              <div className="td__empty">
                <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>👥</span>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>
                  Sin equipos inscritos aún
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 0 }}>
                  {tournament.status === 'DRAFT'
                    ? 'Abrí inscripciones desde el botón de arriba.'
                    : 'Compartí el link público por WhatsApp para que se inscriban.'}
                </p>
              </div>
            ) : (
              <div className="td__teams-table">
                <div className="td__teams-header">
                  <span>Equipo</span>
                  <span>Capitán</span>
                  <span>Contacto</span>
                  <span>Estado</span>
                  <span>Inscrito</span>
                </div>
                {teams.map(t => {
                  const ts = TEAM_STATUS_CFG[t.status]
                  return (
                    <div key={t.id} className="td__team-row">
                      <div className="td__team-name">
                        <strong>{t.team_name}</strong>
                        {Array.isArray(t.players) && t.players.length > 0 && (
                          <span className="td__team-players">{t.players.length} jugador{t.players.length !== 1 ? 'es' : ''}</span>
                        )}
                      </div>
                      <div>{t.captain_name}</div>
                      <div className="td__team-contact">
                        <span>{fmtPhone(t.captain_phone)}</span>
                        {t.captain_email && <span className="td__team-email">{t.captain_email}</span>}
                      </div>
                      <div>
                        <span className="tn-badge" style={{ color: ts.color, background: ts.bg }}>{ts.label}</span>
                        {t.payment_reference && (
                          <div className="td__team-ref">Ref: {t.payment_reference}</div>
                        )}
                      </div>
                      <div className="td__team-date">{fmtDateTime(t.created_at)}</div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="td__panel-hint">
              <span>💡 La validación de pagos se construye en la próxima fase. Por ahora podés ver los equipos y sus referencias SINPE.</span>
            </div>
          </div>
        )}

        {/* === MATCHES === */}
        {tab === 'matches' && (
          <div className="td__panel">
            <div className="td__empty">
              <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⚔️</span>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>
                Sin partidos creados
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>
                La gestión de partidos se construye en la siguiente fase.
              </p>
            </div>
          </div>
        )}

        {/* === CONFIG === */}
        {tab === 'config' && (
          <div className="td__panel">
            {/* Datos del torneo */}
            <div className="td__card">
              <h3 className="td__card-title">⚙️ Configuración</h3>
              <p className="td__card-sub">Para editar nombre, fechas o detalles, usá el SQL Editor de Supabase. La edición desde el panel se construye después.</p>

              <div className="td__rows">
                <div className="td__row">
                  <span className="td__row-label">Slug público</span>
                  <span className="td__row-value">/torneos/{tournament.slug}</span>
                </div>
                <div className="td__row">
                  <span className="td__row-label">Formato</span>
                  <span className="td__row-value">{tournament.format}</span>
                </div>
                <div className="td__row">
                  <span className="td__row-label">Cupo de equipos</span>
                  <span className="td__row-value">{tournament.max_teams}</span>
                </div>
                <div className="td__row">
                  <span className="td__row-label">Precio por equipo</span>
                  <span className="td__row-value">{fmtCRC(tournament.price_per_team)}</span>
                </div>
                <div className="td__row">
                  <span className="td__row-label">Creado</span>
                  <span className="td__row-value">{fmtDateTime(tournament.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Status actions */}
            <div className="td__card">
              <h3 className="td__card-title">🔄 Cambio de estado manual</h3>
              <div className="td__status-actions">
                {tournament.status === 'DRAFT' && (
                  <button className="tn-btn tn-btn--primary" onClick={handleOpenRegistration} disabled={acting}>
                    Abrir inscripciones
                  </button>
                )}
                {tournament.status === 'OPEN' && (
                  <button className="tn-btn tn-btn--ghost" onClick={handleCloseRegistration} disabled={acting}>
                    Cerrar inscripciones
                  </button>
                )}
                {tournament.status === 'FULL' && (
                  <button className="tn-btn tn-btn--primary" onClick={handleStartTournament} disabled={acting}>
                    Iniciar torneo
                  </button>
                )}
                {tournament.status === 'IN_PROGRESS' && (
                  <button className="tn-btn tn-btn--primary" onClick={handleFinishTournament} disabled={acting}>
                    Finalizar torneo
                  </button>
                )}
              </div>
            </div>

            {/* Danger zone */}
            {tournament.status !== 'CANCELLED' && tournament.status !== 'FINISHED' && (
              <div className="td__card td__card--danger">
                <h3 className="td__card-title" style={{ color: '#b91c1c' }}>⚠️ Zona peligrosa</h3>
                <p className="td__card-sub">Cancelar el torneo lo deshabilita para siempre desde el panel.</p>
                <button className="tn-btn tn-btn--danger" onClick={handleCancelTournament} disabled={acting}>
                  Cancelar torneo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ─── CSS ────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

.td { max-width: 1100px; margin: 0 auto; padding: 28px 20px 80px; font-family: 'DM Sans', sans-serif; }
.td__loader { padding: 60px; text-align: center; color: #94a3b8; }

.td__error { padding: 60px 24px; text-align: center; background: white; border: 1px solid #eaecf0; border-radius: 16px; }
.td__error p { color: #64748b; margin: 0 0 16px; }

.td__admin-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 16px; }

.td__back { font-size: 13px; color: #64748b; text-decoration: none; font-weight: 500; display: inline-block; margin-bottom: 16px; }
.td__back:hover { color: #16a34a; }

.td__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 28px; flex-wrap: wrap; }
.td__header-main { min-width: 0; flex: 1; }
.td__sport { font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 6px; }
.td__title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 12px; line-height: 1.15; }
.td__header-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.td__meta-item { font-size: 12px; color: #64748b; font-weight: 500; }
.td__header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.tn-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; text-transform: uppercase; letter-spacing: .03em; }
.tn-badge--external { background: linear-gradient(135deg, #052e16, #0B4D2C); color: white; }

.td__tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 0; }
.td__tab { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 10px 10px 0 0; font-size: 12.5px; font-weight: 600; font-family: inherit; border: none; background: transparent; color: #64748b; cursor: pointer; transition: all .13s; position: relative; bottom: -1px; }
.td__tab:hover { color: #0f172a; background: #f8fafc; }
.td__tab--active { color: #0f172a; background: white; border: 1px solid #f1f5f9; border-bottom: 1px solid white; font-weight: 700; }
.td__tab-count { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: #f1f5f9; color: #64748b; }
.td__tab--active .td__tab-count { background: #16a34a; color: white; }

.td__panel { display: flex; flex-direction: column; gap: 14px; }
.td__panel-hint { padding: 12px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; font-size: 12px; color: #1e40af; font-weight: 500; }

.td__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.td__stat { background: white; border: 1px solid #eaecf0; border-radius: 14px; padding: 18px; }
.td__stat-label { font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; margin: 0 0 6px; }
.td__stat-value { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1; }
.td__stat-max { font-size: 16px; color: #94a3b8; font-weight: 600; }
.td__stat-sub { font-size: 11px; color: #64748b; margin: 6px 0 0; }

.td__card { background: white; border: 1px solid #eaecf0; border-radius: 14px; padding: 20px; }
.td__card--danger { border-color: #fecaca; background: #fef2f2; }
.td__card-title { font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
.td__card-sub { font-size: 12px; color: #94a3b8; margin: 0 0 14px; }

.td__rows { display: flex; flex-direction: column; gap: 0; }
.td__row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc; gap: 12px; }
.td__row:last-child { border-bottom: none; }
.td__row-label { font-size: 12px; color: #94a3b8; font-weight: 600; flex-shrink: 0; }
.td__row-value { font-size: 13px; color: #0f172a; font-weight: 500; text-align: right; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.td__row-link { font-size: 13px; color: #16a34a; font-weight: 600; text-decoration: none; }
.td__row-link:hover { text-decoration: underline; }

.td__text { font-size: 13.5px; color: #374151; line-height: 1.6; margin: 0; }

.td__link-box { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.td__link { flex: 1; min-width: 240px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #0f172a; font-family: 'JetBrains Mono', ui-monospace, monospace; word-break: break-all; }
.td__link-actions { display: flex; gap: 6px; }

.td__teams-table { background: white; border: 1px solid #eaecf0; border-radius: 14px; overflow: hidden; }
.td__teams-header { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.2fr; gap: 12px; padding: 12px 16px; background: #f8fafc; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #f1f5f9; }
.td__team-row { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.2fr; gap: 12px; padding: 14px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f8fafc; align-items: center; }
.td__team-row:last-child { border-bottom: none; }
.td__team-row:hover { background: #fafbfc; }
.td__team-name strong { display: block; font-weight: 700; }
.td__team-players { font-size: 11px; color: #94a3b8; display: block; margin-top: 2px; }
.td__team-contact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.td__team-email { font-size: 11px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td__team-ref { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 500; }
.td__team-date { font-size: 11px; color: #94a3b8; }

.td__empty { background: white; border: 1px solid #eaecf0; border-radius: 14px; padding: 60px 24px; text-align: center; }

.td__status-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.tn-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; transition: all .15s; text-decoration: none; }
.tn-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 2px 12px rgba(22,163,74,.25); }
.tn-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(22,163,74,.35); }
.tn-btn--primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.tn-btn--ghost { background: #f1f5f9; color: #374151; }
.tn-btn--ghost:hover:not(:disabled) { background: #e2e8f0; }
.tn-btn--danger { background: #ef4444; color: white; }
.tn-btn--danger:hover:not(:disabled) { background: #dc2626; }

.tn-toast { position: fixed; bottom: 28px; right: 28px; z-index: 9999; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
.tn-toast--ok { background: #0f172a; color: white; }
.tn-toast--err { background: #ef4444; color: white; }

@media (max-width: 768px) {
  .td__stats { grid-template-columns: 1fr; }
  .td__teams-header { display: none; }
  .td__team-row { grid-template-columns: 1fr; padding: 14px; gap: 6px; }
  .td__team-row > div { font-size: 12.5px; }
  .td__team-row > div:before { content: attr(data-label); color: #94a3b8; font-size: 10px; text-transform: uppercase; display: block; }
  .td__title { font-size: 22px; }
  .td__header { flex-direction: column; }
  .td__header-actions { width: 100%; }
  .td__header-actions .tn-btn { flex: 1; justify-content: center; }
}
`