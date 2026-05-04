/**
 * GolPlay — pages/admin/tournaments/[id].tsx
 * Detalle y gestión de un torneo
 *
 * v3.0 (Fase 9): Gestión de partidos
 * - Crear partido (team A vs team B, fecha, ronda, cancha)
 * - Cargar resultado (scores + auto-detección de ganador)
 * - Editar / Eliminar partido
 * - Lista agrupada por ronda
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
} from '@/types/tournaments'

type TabId = 'overview' | 'teams' | 'matches' | 'config'
type TeamFilter = 'ALL' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED'
type MatchModal = null | { mode: 'create' } | { mode: 'edit'; match: TournamentMatch } | { mode: 'result'; match: TournamentMatch }

interface FieldOption {
  id: number
  name: string
}

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

const MATCH_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Programado', color: '#2563eb', bg: '#eff6ff' },
  FINISHED:  { label: 'Finalizado', color: '#7c3aed', bg: '#f5f3ff' },
  CANCELLED: { label: 'Cancelado',  color: '#dc2626', bg: '#fef2f2' },
}

const TEAM_FILTERS: Array<{ id: TeamFilter; label: string; icon: string }> = [
  { id: 'ALL',             label: 'Todos',       icon: '👥' },
  { id: 'PENDING_PAYMENT', label: 'Pendientes',  icon: '⏳' },
  { id: 'CONFIRMED',       label: 'Confirmados', icon: '✅' },
  { id: 'CANCELLED',       label: 'Cancelados',  icon: '❌' },
]

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

const fmtMatchDateTime = (d: string | null) => {
  if (!d) return 'Sin fecha'
  return new Date(d).toLocaleString('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const fmtPhone = (p: string | null) => {
  if (!p) return '—'
  const digits = p.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4)}`
  return p
}

// Convierte ISO a formato datetime-local input
const toDateTimeLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TournamentDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { isAdmin, loading: adminLoading, userId } = usePlatformAdmin()

  const [loading, setLoading]   = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [complexName, setComplexName] = useState<string | null>(null)
  const [teams, setTeams]       = useState<TournamentTeam[]>([])
  const [matches, setMatches]   = useState<TournamentMatch[]>([])
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([])

  const [tab, setTab]           = useState<TabId>('overview')
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('ALL')
  const [acting, setActing]     = useState(false)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null)
  const [adminNotesInput, setAdminNotesInput] = useState('')

  const [matchModal, setMatchModal] = useState<MatchModal>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
    })
  }, [router])

  const loadAll = useCallback(async () => {
    if (!id || typeof id !== 'string') return
    setLoading(true)

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

    // Si tiene complex_id, cargar las canchas para el select de partidos
    if (rest.complex_id) {
      const { data: fs } = await supabase
        .from('fields')
        .select('id, name')
        .eq('complex_id', rest.complex_id)
        .eq('active', true)
        .order('name')
      setFieldOptions((fs ?? []) as FieldOption[])
    } else {
      setFieldOptions([])
    }

    const { data: ts } = await supabase
      .from('tournament_teams')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true })

    setTeams((ts ?? []) as TournamentTeam[])

    const { data: ms } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round_label', { ascending: true, nullsFirst: false })
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    setMatches((ms ?? []) as TournamentMatch[])

    setLoading(false)
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  const isSuperAdminOperating = useMemo(() => {
    if (!tournament || !userId) return false
    return isAdmin && tournament.managed_by !== userId
  }, [isAdmin, tournament, userId])

  const stats = useMemo(() => {
    const confirmed = teams.filter(t => t.status === 'CONFIRMED').length
    const pending   = teams.filter(t => t.status === 'PENDING_PAYMENT').length
    const cancelled = teams.filter(t => t.status === 'CANCELLED').length
    const revenue   = confirmed * (tournament?.price_per_team ?? 0)
    return { confirmed, pending, cancelled, revenue, total: teams.length }
  }, [teams, tournament])

  const filteredTeams = useMemo(() => {
    if (teamFilter === 'ALL') return teams
    return teams.filter(t => t.status === teamFilter)
  }, [teams, teamFilter])

  const teamCounts = useMemo(() => ({
    ALL:             teams.length,
    PENDING_PAYMENT: teams.filter(t => t.status === 'PENDING_PAYMENT').length,
    CONFIRMED:       teams.filter(t => t.status === 'CONFIRMED').length,
    CANCELLED:       teams.filter(t => t.status === 'CANCELLED').length,
  }), [teams])

  // Confirmados (para selects de partidos)
  const confirmedTeams = useMemo(
    () => teams.filter(t => t.status === 'CONFIRMED'),
    [teams]
  )

  // Agrupar partidos por ronda
  const matchesByRound = useMemo(() => {
    const groups = new Map<string, TournamentMatch[]>()
    matches.forEach(m => {
      const key = m.round_label || 'Sin clasificar'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(m)
    })
    return Array.from(groups.entries())
  }, [matches])

  // Mapa id → equipo (para mostrar nombres en partidos)
  const teamMap = useMemo(() => {
    const m = new Map<number, TournamentTeam>()
    teams.forEach(t => m.set(t.id, t))
    return m
  }, [teams])

  const publicUrl = useMemo(() => {
    if (!tournament) return ''
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/torneos/${tournament.slug}`
  }, [tournament])

  // ── Tournament status actions ──

  const updateTournamentStatus = async (newStatus: TournamentStatus, msg: string) => {
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
    updateTournamentStatus('OPEN', '✅ Inscripciones abiertas — compartí el link público')
  }

  const handleCloseRegistration = () => {
    if (confirm('¿Cerrar inscripciones? El torneo no aceptará más equipos.')) {
      updateTournamentStatus('FULL', 'Inscripciones cerradas')
    }
  }

  const handleStartTournament = () => {
    if (confirm('¿Marcar torneo como en curso?')) {
      updateTournamentStatus('IN_PROGRESS', 'Torneo en curso')
    }
  }

  const handleFinishTournament = () => {
    if (confirm('¿Finalizar torneo? No vas a poder cargar más resultados.')) {
      updateTournamentStatus('FINISHED', 'Torneo finalizado 🏆')
    }
  }

  const handleCancelTournament = () => {
    if (confirm('¿Cancelar torneo? Esta acción solo se puede revertir desde la base de datos.')) {
      updateTournamentStatus('CANCELLED', 'Torneo cancelado')
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

  // ── Team actions (Fase 8) ──

  const openTeamModal = (team: TournamentTeam) => {
    setSelectedTeam(team)
    setAdminNotesInput(team.admin_notes ?? '')
  }

  const closeTeamModal = () => {
    setSelectedTeam(null)
    setAdminNotesInput('')
  }

  const handleValidatePayment = async () => {
    if (!selectedTeam || !userId) return
    if (!confirm(`¿Confirmar pago de "${selectedTeam.team_name}"? El equipo va a aparecer públicamente como CONFIRMADO.`)) return
    setActing(true)
    const { error } = await supabase
      .from('tournament_teams')
      .update({
        status: 'CONFIRMED',
        payment_confirmed_at: new Date().toISOString(),
        payment_confirmed_by: userId,
        admin_notes: adminNotesInput.trim() || null,
      })
      .eq('id', selectedTeam.id)
    setActing(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast(`✅ ${selectedTeam.team_name} confirmado`)
    closeTeamModal()
    loadAll()
  }

  const handleRejectPayment = async () => {
    if (!selectedTeam) return
    if (!confirm(`¿Rechazar pago de "${selectedTeam.team_name}"? El equipo va a quedar como CANCELADO.`)) return
    setActing(true)
    const { error } = await supabase
      .from('tournament_teams')
      .update({
        status: 'CANCELLED',
        admin_notes: adminNotesInput.trim() || 'Pago rechazado',
      })
      .eq('id', selectedTeam.id)
    setActing(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast(`❌ ${selectedTeam.team_name} cancelado`)
    closeTeamModal()
    loadAll()
  }

  const handleReactivateTeam = async () => {
    if (!selectedTeam) return
    if (!confirm(`¿Reactivar "${selectedTeam.team_name}"? Volverá a estado PENDIENTE de pago.`)) return
    setActing(true)
    const { error } = await supabase
      .from('tournament_teams')
      .update({
        status: 'PENDING_PAYMENT',
        payment_confirmed_at: null,
        payment_confirmed_by: null,
      })
      .eq('id', selectedTeam.id)
    setActing(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast(`${selectedTeam.team_name} reactivado`)
    closeTeamModal()
    loadAll()
  }

  const handleSaveNotes = async () => {
    if (!selectedTeam) return
    setActing(true)
    const { error } = await supabase
      .from('tournament_teams')
      .update({ admin_notes: adminNotesInput.trim() || null })
      .eq('id', selectedTeam.id)
    setActing(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast('Notas guardadas')
    loadAll()
    setSelectedTeam(prev => prev ? { ...prev, admin_notes: adminNotesInput.trim() || null } : null)
  }

  const captainWhatsAppUrl = useMemo(() => {
    if (!selectedTeam) return null
    const digits = selectedTeam.captain_phone.replace(/\D/g, '')
    if (digits.length < 8) return null
    let text = ''
    if (selectedTeam.status === 'PENDING_PAYMENT') {
      text = `Hola ${selectedTeam.captain_name}, te escribo del torneo *${tournament?.name}*. ¿Ya hiciste el SINPE para confirmar la inscripción de *${selectedTeam.team_name}*?`
    } else if (selectedTeam.status === 'CONFIRMED') {
      text = `Hola ${selectedTeam.captain_name}, ¡pago confirmado! Tu equipo *${selectedTeam.team_name}* ya está oficialmente inscrito en *${tournament?.name}*. Te contactaremos con el calendario de partidos.`
    } else {
      text = `Hola ${selectedTeam.captain_name}, te escribo del torneo *${tournament?.name}*.`
    }
    return `https://wa.me/506${digits}?text=${encodeURIComponent(text)}`
  }, [selectedTeam, tournament])

  // ── Match actions (Fase 9) ──

  const handleDeleteMatch = async (match: TournamentMatch) => {
    const lbl = match.round_label ? `${match.round_label}: ` : ''
    const a = match.team_a_id ? teamMap.get(match.team_a_id)?.team_name : (match.team_a_label || 'Equipo A')
    const b = match.team_b_id ? teamMap.get(match.team_b_id)?.team_name : (match.team_b_label || 'Equipo B')
    if (!confirm(`¿Eliminar el partido ${lbl}${a} vs ${b}? Esta acción no se puede deshacer.`)) return

    setActing(true)
    const { error } = await supabase
      .from('tournament_matches')
      .delete()
      .eq('id', match.id)
    setActing(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast('Partido eliminado')
    loadAll()
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
        {isSuperAdminOperating && (
          <div className="td__admin-banner">
            <span>🛡️</span>
            <span>Estás operando como super-admin · este torneo lo gestiona otro organizador</span>
          </div>
        )}

        <Link href="/admin/tournaments" className="td__back">← Volver a torneos</Link>

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

        <div className="td__tabs">
          {([
            { id: 'overview' as TabId, label: 'Resumen',  icon: '📊', count: null },
            { id: 'teams'    as TabId, label: 'Equipos',  icon: '👥', count: teams.length, alert: stats.pending > 0 ? stats.pending : null },
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
              {(t as any).alert && <span className="td__tab-alert">{(t as any).alert}</span>}
            </button>
          ))}
        </div>

        {/* === OVERVIEW === */}
        {tab === 'overview' && (
          <div className="td__panel">
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

            {stats.pending > 0 && (
              <div className="td__alert" onClick={() => setTab('teams')}>
                <div>
                  <strong>⏳ {stats.pending} pago{stats.pending !== 1 ? 's' : ''} pendiente{stats.pending !== 1 ? 's' : ''}</strong>
                  <p>Revisá la pestaña "Equipos" para validarlos.</p>
                </div>
                <span className="td__alert-arrow">→</span>
              </div>
            )}

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
            <div className="td__team-filters">
              {TEAM_FILTERS.map(f => (
                <button
                  key={f.id}
                  className={`td__team-filter ${teamFilter === f.id ? 'td__team-filter--active' : ''}`}
                  onClick={() => setTeamFilter(f.id)}
                >
                  <span>{f.icon}</span> {f.label}
                  <span className="td__team-filter-count">{teamCounts[f.id]}</span>
                </button>
              ))}
            </div>

            {filteredTeams.length === 0 ? (
              <div className="td__empty">
                <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>👥</span>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>
                  {teamFilter === 'ALL' ? 'Sin equipos inscritos aún' :
                   teamFilter === 'PENDING_PAYMENT' ? 'Sin equipos pendientes' :
                   teamFilter === 'CONFIRMED' ? 'Sin equipos confirmados' :
                                                'Sin equipos cancelados'}
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 0 }}>
                  {teamFilter === 'ALL' && tournament.status === 'DRAFT'
                    ? 'Abrí inscripciones desde el botón de arriba.'
                    : teamFilter === 'ALL'
                    ? 'Compartí el link público por WhatsApp para que se inscriban.'
                    : 'Cambiá el filtro para ver otros equipos.'}
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
                  <span></span>
                </div>
                {filteredTeams.map(t => {
                  const ts = TEAM_STATUS_CFG[t.status]
                  return (
                    <div key={t.id} className="td__team-row" onClick={() => openTeamModal(t)}>
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
                      <div className="td__team-action-cell">
                        {t.status === 'PENDING_PAYMENT' && <span className="td__pulse">●</span>}
                        →
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* === MATCHES (Fase 9) === */}
        {tab === 'matches' && (
          <div className="td__panel">
            <div className="td__matches-header">
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Partidos del torneo
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                  {matches.length === 0
                    ? 'Aún no hay partidos creados.'
                    : `${matches.length} partido${matches.length !== 1 ? 's' : ''} · ${matches.filter(m => m.status === 'FINISHED').length} jugado${matches.filter(m => m.status === 'FINISHED').length !== 1 ? 's' : ''}`}
                </p>
              </div>
              {confirmedTeams.length >= 2 ? (
                <button className="tn-btn tn-btn--primary" onClick={() => setMatchModal({ mode: 'create' })}>
                  + Crear partido
                </button>
              ) : (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Necesitás al menos 2 equipos confirmados.
                </span>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="td__empty">
                <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⚔️</span>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>
                  Sin partidos creados
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                  Crea el primer partido cuando tengas al menos 2 equipos confirmados.
                </p>
              </div>
            ) : (
              <div className="td__rounds">
                {matchesByRound.map(([round, ms]) => (
                  <div key={round} className="td__round">
                    <h4 className="td__round-title">{round}</h4>
                    <div className="td__matches">
                      {ms.map(m => {
                        const ms_cfg = MATCH_STATUS_CFG[m.status] ?? MATCH_STATUS_CFG.SCHEDULED
                        const teamA = m.team_a_id ? teamMap.get(m.team_a_id) : null
                        const teamB = m.team_b_id ? teamMap.get(m.team_b_id) : null
                        const aName = teamA?.team_name ?? m.team_a_label ?? 'Por definir'
                        const bName = teamB?.team_name ?? m.team_b_label ?? 'Por definir'
                        const fieldName = m.field_id
                          ? fieldOptions.find(f => f.id === m.field_id)?.name ?? m.field_label ?? '—'
                          : (m.field_label ?? '—')
                        const isFinished = m.status === 'FINISHED'
                        const isWinnerA = isFinished && m.winner_team_id === m.team_a_id
                        const isWinnerB = isFinished && m.winner_team_id === m.team_b_id

                        return (
                          <div key={m.id} className={`td__match ${isFinished ? 'td__match--finished' : ''}`}>
                            <div className="td__match-info">
                              <span className="tn-badge" style={{ color: ms_cfg.color, background: ms_cfg.bg }}>
                                {ms_cfg.label}
                              </span>
                              <span className="td__match-meta">📅 {fmtMatchDateTime(m.scheduled_at)}</span>
                              <span className="td__match-meta">📍 {fieldName}</span>
                            </div>

                            <div className="td__match-teams">
                              <div className={`td__match-team ${isWinnerA ? 'td__match-team--winner' : ''}`}>
                                <span className="td__match-team-name">{aName}</span>
                                {isFinished && (
                                  <span className="td__match-score">{m.team_a_score ?? 0}</span>
                                )}
                              </div>
                              <span className="td__match-vs">vs</span>
                              <div className={`td__match-team ${isWinnerB ? 'td__match-team--winner' : ''}`}>
                                <span className="td__match-team-name">{bName}</span>
                                {isFinished && (
                                  <span className="td__match-score">{m.team_b_score ?? 0}</span>
                                )}
                              </div>
                            </div>

                            {isFinished && m.winner_team_id === null && (
                              <p className="td__match-tie">Empate</p>
                            )}

                            <div className="td__match-actions">
                              <button className="tn-btn-mini" onClick={() => setMatchModal({ mode: 'result', match: m })}>
                                {isFinished ? 'Editar resultado' : 'Cargar resultado'}
                              </button>
                              <button className="tn-btn-mini tn-btn-mini--ghost" onClick={() => setMatchModal({ mode: 'edit', match: m })}>
                                Editar
                              </button>
                              <button className="tn-btn-mini tn-btn-mini--danger" onClick={() => handleDeleteMatch(m)}>
                                Eliminar
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === CONFIG === */}
        {tab === 'config' && (
          <div className="td__panel">
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

      {/* ============ MODAL VALIDACIÓN DE EQUIPO ============ */}
      {selectedTeam && (
        <div className="td-modal-bg" onClick={e => { if (e.target === e.currentTarget) closeTeamModal() }}>
          <div className="td-modal">
            <div className="td-modal__header">
              <div>
                <p className="td-modal__eyebrow">EQUIPO INSCRITO</p>
                <h2 className="td-modal__title">{selectedTeam.team_name}</h2>
                <span className="tn-badge" style={{
                  color: TEAM_STATUS_CFG[selectedTeam.status].color,
                  background: TEAM_STATUS_CFG[selectedTeam.status].bg,
                  marginTop: 6, display: 'inline-block',
                }}>
                  {TEAM_STATUS_CFG[selectedTeam.status].label}
                </span>
              </div>
              <button className="td-modal__close" onClick={closeTeamModal}>✕</button>
            </div>

            <div className="td-modal__body">
              <div className="td-modal__section">
                <h4 className="td-modal__section-title">👤 Capitán</h4>
                <div className="td__rows">
                  <div className="td__row">
                    <span className="td__row-label">Nombre</span>
                    <span className="td__row-value">{selectedTeam.captain_name}</span>
                  </div>
                  <div className="td__row">
                    <span className="td__row-label">Teléfono</span>
                    <span className="td__row-value">{fmtPhone(selectedTeam.captain_phone)}</span>
                  </div>
                  {selectedTeam.captain_email && (
                    <div className="td__row">
                      <span className="td__row-label">Email</span>
                      <span className="td__row-value">{selectedTeam.captain_email}</span>
                    </div>
                  )}
                </div>
                {captainWhatsAppUrl && (
                  <a href={captainWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="tn-btn tn-btn--whatsapp" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                    💬 Escribir al capitán
                  </a>
                )}
              </div>

              <div className="td-modal__section">
                <h4 className="td-modal__section-title">💰 Pago SINPE</h4>
                {selectedTeam.payment_reference ? (
                  <div className="td-modal__sinpe-box">
                    <p className="td-modal__sinpe-label">Últimos 4 dígitos de la referencia</p>
                    <p className="td-modal__sinpe-ref">{selectedTeam.payment_reference}</p>
                    <p className="td-modal__sinpe-hint">Verificá en tu app bancaria que llegó un SINPE de <strong>{fmtCRC(tournament.price_per_team)}</strong> con esta referencia.</p>
                  </div>
                ) : (
                  <div className="td-modal__sinpe-empty">
                    El capitán todavía no envió la referencia SINPE.
                  </div>
                )}
                {selectedTeam.payment_confirmed_at && (
                  <p className="td-modal__confirmed-at">
                    ✅ Confirmado el {fmtDateTime(selectedTeam.payment_confirmed_at)}
                  </p>
                )}
              </div>

              {Array.isArray(selectedTeam.players) && selectedTeam.players.length > 0 && (
                <div className="td-modal__section">
                  <h4 className="td-modal__section-title">⚽ Jugadores ({selectedTeam.players.length})</h4>
                  <div className="td-modal__players">
                    {selectedTeam.players.map((p: any, i: number) => (
                      <div key={i} className="td-modal__player">{i + 1}. {p.name}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="td-modal__section">
                <h4 className="td-modal__section-title">📝 Notas internas (privadas)</h4>
                <textarea
                  className="td-modal__notes"
                  placeholder="Ej: Pago verificado en BAC. Capitán confirma asistencia."
                  value={adminNotesInput}
                  onChange={e => setAdminNotesInput(e.target.value)}
                  rows={3}
                />
                <button className="tn-btn tn-btn--ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={handleSaveNotes} disabled={acting}>
                  Guardar notas
                </button>
              </div>
            </div>

            <div className="td-modal__actions">
              {selectedTeam.status === 'PENDING_PAYMENT' && (
                <>
                  <button className="tn-btn tn-btn--danger" onClick={handleRejectPayment} disabled={acting}>
                    ❌ Rechazar pago
                  </button>
                  <button className="tn-btn tn-btn--success" onClick={handleValidatePayment} disabled={acting}>
                    ✅ Validar pago
                  </button>
                </>
              )}
              {selectedTeam.status === 'CONFIRMED' && (
                <button className="tn-btn tn-btn--ghost" onClick={handleReactivateTeam} disabled={acting}>
                  Marcar como pendiente
                </button>
              )}
              {selectedTeam.status === 'CANCELLED' && (
                <button className="tn-btn tn-btn--ghost" onClick={handleReactivateTeam} disabled={acting}>
                  Reactivar equipo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL CREAR / EDITAR PARTIDO ============ */}
      {matchModal && (matchModal.mode === 'create' || matchModal.mode === 'edit') && (
        <MatchFormModal
          mode={matchModal.mode}
          match={matchModal.mode === 'edit' ? matchModal.match : null}
          tournamentId={tournament.id}
          confirmedTeams={confirmedTeams}
          fieldOptions={fieldOptions}
          onClose={() => setMatchModal(null)}
          onSaved={(msg) => { showToast(msg); setMatchModal(null); loadAll() }}
        />
      )}

      {/* ============ MODAL CARGAR RESULTADO ============ */}
      {matchModal && matchModal.mode === 'result' && (
        <MatchResultModal
          match={matchModal.match}
          teamMap={teamMap}
          onClose={() => setMatchModal(null)}
          onSaved={(msg) => { showToast(msg); setMatchModal(null); loadAll() }}
        />
      )}
    </AdminLayout>
  )
}

// ════════════════════════════════════════════════════════════
//  SUB-COMPONENTES
// ════════════════════════════════════════════════════════════

interface MatchFormModalProps {
  mode: 'create' | 'edit'
  match: TournamentMatch | null
  tournamentId: number
  confirmedTeams: TournamentTeam[]
  fieldOptions: FieldOption[]
  onClose: () => void
  onSaved: (msg: string) => void
}

function MatchFormModal({ mode, match, tournamentId, confirmedTeams, fieldOptions, onClose, onSaved }: MatchFormModalProps) {
  const [roundLabel, setRoundLabel] = useState(match?.round_label ?? '')
  const [teamAId, setTeamAId]       = useState<string>(match?.team_a_id?.toString() ?? '')
  const [teamBId, setTeamBId]       = useState<string>(match?.team_b_id?.toString() ?? '')
  const [scheduledAt, setScheduledAt] = useState(toDateTimeLocal(match?.scheduled_at ?? null))
  const [fieldId, setFieldId]       = useState<string>(match?.field_id?.toString() ?? '')
  const [fieldLabel, setFieldLabel] = useState(match?.field_label ?? '')
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')

  const canSave = teamAId && teamBId && teamAId !== teamBId

  const handleSave = async () => {
    setErr('')
    if (!canSave) {
      setErr('Seleccioná dos equipos diferentes.')
      return
    }
    setSaving(true)

    const payload: any = {
      tournament_id: tournamentId,
      round_label: roundLabel.trim() || null,
      team_a_id: parseInt(teamAId, 10),
      team_b_id: parseInt(teamBId, 10),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      field_id: fieldId ? parseInt(fieldId, 10) : null,
      field_label: !fieldId && fieldLabel.trim() ? fieldLabel.trim() : null,
    }

    if (mode === 'create') {
      payload.status = 'SCHEDULED'
      const { error } = await supabase.from('tournament_matches').insert(payload)
      setSaving(false)
      if (error) { setErr(error.message); return }
      onSaved('⚔️ Partido creado')
    } else {
      const { error } = await supabase
        .from('tournament_matches')
        .update(payload)
        .eq('id', match!.id)
      setSaving(false)
      if (error) { setErr(error.message); return }
      onSaved('Partido actualizado')
    }
  }

  return (
    <div className="td-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="td-modal">
        <div className="td-modal__header">
          <div>
            <p className="td-modal__eyebrow">{mode === 'create' ? 'NUEVO PARTIDO' : 'EDITAR PARTIDO'}</p>
            <h2 className="td-modal__title">⚔️ {mode === 'create' ? 'Crear partido' : 'Editar datos del partido'}</h2>
          </div>
          <button className="td-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="td-modal__body">
          <div className="td-mform">
            <div className="td-mform__field">
              <label className="td-mform__label">Ronda / Fase (opcional)</label>
              <input
                className="td-mform__input"
                placeholder="Ej: Cuartos, Final, Fecha 1"
                value={roundLabel}
                onChange={e => setRoundLabel(e.target.value)}
                maxLength={50}
              />
              <p className="td-mform__hint">Texto libre. Sirve para agrupar partidos en la página pública.</p>
            </div>

            <div className="td-mform__grid-2">
              <div className="td-mform__field">
                <label className="td-mform__label">Equipo A *</label>
                <select className="td-mform__input" value={teamAId} onChange={e => setTeamAId(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {confirmedTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.team_name}</option>
                  ))}
                </select>
              </div>
              <div className="td-mform__field">
                <label className="td-mform__label">Equipo B *</label>
                <select className="td-mform__input" value={teamBId} onChange={e => setTeamBId(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {confirmedTeams.map(t => (
                    <option key={t.id} value={t.id} disabled={t.id.toString() === teamAId}>{t.team_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="td-mform__field">
              <label className="td-mform__label">Fecha y hora (opcional)</label>
              <input
                className="td-mform__input"
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
              />
              <p className="td-mform__hint">Podés crearlo sin fecha y completarla después.</p>
            </div>

            {fieldOptions.length > 0 ? (
              <div className="td-mform__field">
                <label className="td-mform__label">Cancha (opcional)</label>
                <select
                  className="td-mform__input"
                  value={fieldId}
                  onChange={e => { setFieldId(e.target.value); setFieldLabel('') }}
                >
                  <option value="">— Sin asignar —</option>
                  {fieldOptions.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {!fieldId && (
                  <input
                    className="td-mform__input"
                    style={{ marginTop: 8 }}
                    placeholder="O escribí el nombre de la cancha"
                    value={fieldLabel}
                    onChange={e => setFieldLabel(e.target.value)}
                    maxLength={80}
                  />
                )}
              </div>
            ) : (
              <div className="td-mform__field">
                <label className="td-mform__label">Cancha (opcional)</label>
                <input
                  className="td-mform__input"
                  placeholder="Ej: Cancha 1, Sintética A"
                  value={fieldLabel}
                  onChange={e => setFieldLabel(e.target.value)}
                  maxLength={80}
                />
              </div>
            )}

            {err && <div className="td-mform__error">⚠️ {err}</div>}
          </div>
        </div>

        <div className="td-modal__actions">
          <button className="tn-btn tn-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="tn-btn tn-btn--success" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Guardando…' : (mode === 'create' ? '+ Crear partido' : 'Guardar cambios')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface MatchResultModalProps {
  match: TournamentMatch
  teamMap: Map<number, TournamentTeam>
  onClose: () => void
  onSaved: (msg: string) => void
}

function MatchResultModal({ match, teamMap, onClose, onSaved }: MatchResultModalProps) {
  const [scoreA, setScoreA] = useState<string>(match.team_a_score?.toString() ?? '')
  const [scoreB, setScoreB] = useState<string>(match.team_b_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const teamA = match.team_a_id ? teamMap.get(match.team_a_id) : null
  const teamB = match.team_b_id ? teamMap.get(match.team_b_id) : null
  const aName = teamA?.team_name ?? match.team_a_label ?? 'Equipo A'
  const bName = teamB?.team_name ?? match.team_b_label ?? 'Equipo B'

  const handleSave = async () => {
    setErr('')
    const a = parseInt(scoreA, 10)
    const b = parseInt(scoreB, 10)
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      setErr('Pegá un puntaje válido para ambos equipos (números mayores o iguales a 0).')
      return
    }
    setSaving(true)

    let winner_team_id: number | null = null
    if (a > b) winner_team_id = match.team_a_id
    else if (b > a) winner_team_id = match.team_b_id

    const { error } = await supabase
      .from('tournament_matches')
      .update({
        team_a_score: a,
        team_b_score: b,
        winner_team_id,
        status: 'FINISHED',
      })
      .eq('id', match.id)

    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved('🏁 Resultado guardado')
  }

  const handleClear = async () => {
    if (!confirm('¿Borrar el resultado? El partido vuelve a estado PROGRAMADO.')) return
    setSaving(true)
    const { error } = await supabase
      .from('tournament_matches')
      .update({
        team_a_score: null,
        team_b_score: null,
        winner_team_id: null,
        status: 'SCHEDULED',
      })
      .eq('id', match.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved('Resultado borrado')
  }

  return (
    <div className="td-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="td-modal">
        <div className="td-modal__header">
          <div>
            <p className="td-modal__eyebrow">CARGAR RESULTADO</p>
            <h2 className="td-modal__title">🏁 {match.round_label || 'Partido'}</h2>
          </div>
          <button className="td-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="td-modal__body">
          <div className="td-result">
            <div className="td-result__row">
              <div className="td-result__team">
                <span className="td-result__team-name">{aName}</span>
              </div>
              <input
                className="td-result__score"
                type="tel"
                inputMode="numeric"
                placeholder="0"
                value={scoreA}
                onChange={e => setScoreA(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </div>

            <div className="td-result__divider">vs</div>

            <div className="td-result__row">
              <div className="td-result__team">
                <span className="td-result__team-name">{bName}</span>
              </div>
              <input
                className="td-result__score"
                type="tel"
                inputMode="numeric"
                placeholder="0"
                value={scoreB}
                onChange={e => setScoreB(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </div>

            {scoreA !== '' && scoreB !== '' && (
              <p className="td-result__preview">
                {parseInt(scoreA) > parseInt(scoreB) && `🏆 Gana ${aName}`}
                {parseInt(scoreB) > parseInt(scoreA) && `🏆 Gana ${bName}`}
                {parseInt(scoreA) === parseInt(scoreB) && '🤝 Empate'}
              </p>
            )}

            {err && <div className="td-mform__error">⚠️ {err}</div>}
          </div>
        </div>

        <div className="td-modal__actions">
          {match.status === 'FINISHED' && (
            <button className="tn-btn tn-btn--ghost" onClick={handleClear} disabled={saving}>
              Borrar resultado
            </button>
          )}
          <button className="tn-btn tn-btn--success" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar resultado'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CSS ────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&display=swap');

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
.td__tab-alert { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; background: #f97316; color: white; animation: pulse 1.6s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .65; } }

.td__panel { display: flex; flex-direction: column; gap: 14px; }

.td__alert { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 20px; background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1.5px solid #fbbf24; border-radius: 14px; cursor: pointer; transition: all .15s; }
.td__alert:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(245,158,11,.2); }
.td__alert strong { display: block; font-size: 14px; color: #92400e; margin-bottom: 4px; }
.td__alert p { margin: 0; font-size: 12px; color: #78350f; }
.td__alert-arrow { font-size: 20px; color: #92400e; font-weight: 700; }

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

.td__team-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.td__team-filter { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; font-size: 12px; font-weight: 600; font-family: inherit; border: 1.5px solid transparent; background: white; color: #64748b; cursor: pointer; transition: all .13s; }
.td__team-filter:hover { background: #f8fafc; color: #0f172a; border-color: #e2e8f0; }
.td__team-filter--active { background: #0f172a; color: white; border-color: #0f172a; }
.td__team-filter-count { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: rgba(0,0,0,.07); }
.td__team-filter--active .td__team-filter-count { background: rgba(255,255,255,.18); }

.td__teams-table { background: white; border: 1px solid #eaecf0; border-radius: 14px; overflow: hidden; }
.td__teams-header { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.2fr 0.5fr; gap: 12px; padding: 12px 16px; background: #f8fafc; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #f1f5f9; }
.td__team-row { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.2fr 0.5fr; gap: 12px; padding: 14px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f8fafc; align-items: center; cursor: pointer; transition: background .12s; }
.td__team-row:last-child { border-bottom: none; }
.td__team-row:hover { background: #fafbfc; }
.td__team-name strong { display: block; font-weight: 700; }
.td__team-players { font-size: 11px; color: #94a3b8; display: block; margin-top: 2px; }
.td__team-contact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.td__team-email { font-size: 11px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td__team-ref { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 500; }
.td__team-date { font-size: 11px; color: #94a3b8; }
.td__team-action-cell { display: flex; align-items: center; justify-content: flex-end; gap: 6px; color: #94a3b8; font-weight: 700; }
.td__pulse { color: #f97316; animation: pulse 1.6s infinite; font-size: 14px; }

.td__empty { background: white; border: 1px solid #eaecf0; border-radius: 14px; padding: 60px 24px; text-align: center; }

.td__status-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* === MATCHES === */
.td__matches-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; background: white; border: 1px solid #eaecf0; border-radius: 14px; flex-wrap: wrap; }

.td__rounds { display: flex; flex-direction: column; gap: 18px; }
.td__round { background: white; border: 1px solid #eaecf0; border-radius: 14px; overflow: hidden; }
.td__round-title { margin: 0; padding: 12px 18px; font-size: 12px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: .08em; background: #f0fdf4; border-bottom: 1px solid #d1fae5; }

.td__matches { display: flex; flex-direction: column; }
.td__match { padding: 14px 18px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 10px; }
.td__match:last-child { border-bottom: none; }
.td__match--finished { background: #fafbfc; }

.td__match-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 11px; color: #64748b; }
.td__match-meta { font-weight: 500; }

.td__match-teams { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; padding: 8px 0; }
.td__match-team { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; min-width: 0; }
.td__match-team--winner { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-color: #16a34a; }
.td__match-team-name { font-size: 13.5px; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td__match-team--winner .td__match-team-name { color: #15803d; }
.td__match-score { font-family: 'DM Serif Display', serif; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1; flex-shrink: 0; }
.td__match-team--winner .td__match-score { color: #15803d; }
.td__match-vs { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .1em; }
.td__match-tie { text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600; margin: 0; }

.td__match-actions { display: flex; gap: 6px; flex-wrap: wrap; }

.tn-btn-mini { font-size: 11px; font-weight: 600; font-family: inherit; padding: 6px 12px; border-radius: 7px; border: 1px solid #e2e8f0; background: white; color: #0f172a; cursor: pointer; transition: all .12s; }
.tn-btn-mini:hover { background: #f1f5f9; border-color: #cbd5e1; }
.tn-btn-mini--ghost { color: #64748b; }
.tn-btn-mini--danger { color: #dc2626; border-color: #fecaca; }
.tn-btn-mini--danger:hover { background: #fef2f2; border-color: #fca5a5; }

/* === Botones generales === */
.tn-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; transition: all .15s; text-decoration: none; }
.tn-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 2px 12px rgba(22,163,74,.25); }
.tn-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(22,163,74,.35); }
.tn-btn--primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.tn-btn--success { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 2px 12px rgba(22,163,74,.25); }
.tn-btn--success:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(22,163,74,.35); }
.tn-btn--success:disabled { opacity: .4; cursor: not-allowed; }
.tn-btn--ghost { background: #f1f5f9; color: #374151; }
.tn-btn--ghost:hover:not(:disabled) { background: #e2e8f0; }
.tn-btn--danger { background: #ef4444; color: white; }
.tn-btn--danger:hover:not(:disabled) { background: #dc2626; }
.tn-btn--whatsapp { background: #25D366; color: white; }
.tn-btn--whatsapp:hover { background: #1ebe5b; }

.tn-toast { position: fixed; bottom: 28px; right: 28px; z-index: 9999; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,.18); animation: tnToastIn .25s ease; }
@keyframes tnToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.tn-toast--ok { background: #0f172a; color: white; }
.tn-toast--err { background: #ef4444; color: white; }

/* === Modales === */
.td-modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 500; padding: 20px; animation: tdMbIn .15s ease; }
@keyframes tdMbIn { from { opacity: 0; } to { opacity: 1; } }
.td-modal { background: white; border-radius: 22px; width: 100%; max-width: 560px; box-shadow: 0 24px 80px rgba(0,0,0,.25); animation: tdMdIn .2s ease; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }
@keyframes tdMdIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }

.td-modal__header { padding: 22px 24px 20px; background: linear-gradient(160deg, #052e16 0%, #0B4D2C 100%); color: white; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.td-modal__eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .12em; color: rgba(255,255,255,.55); text-transform: uppercase; margin: 0 0 6px; }
.td-modal__title { font-size: 22px; font-weight: 800; margin: 0; line-height: 1.2; }
.td-modal__close { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); color: rgba(255,255,255,.7); width: 34px; height: 34px; border-radius: 10px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
.td-modal__close:hover { background: rgba(255,255,255,.2); color: white; }

.td-modal__body { padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
.td-modal__section { }
.td-modal__section-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 10px; }

.td-modal__sinpe-box { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1.5px solid #16a34a; border-radius: 14px; padding: 18px 20px; text-align: center; }
.td-modal__sinpe-label { font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 8px; }
.td-modal__sinpe-ref { font-family: 'DM Serif Display', serif; font-size: 44px; font-weight: 700; color: #15803d; margin: 0 0 12px; letter-spacing: .15em; }
.td-modal__sinpe-hint { font-size: 12px; color: #15803d; margin: 0; line-height: 1.5; }
.td-modal__sinpe-hint strong { font-weight: 700; }

.td-modal__sinpe-empty { padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; text-align: center; font-size: 13px; color: #64748b; }
.td-modal__confirmed-at { font-size: 12px; color: #16a34a; font-weight: 600; margin: 10px 0 0; text-align: center; }

.td-modal__players { display: flex; flex-direction: column; gap: 4px; }
.td-modal__player { font-size: 13px; color: #374151; padding: 4px 0; }

.td-modal__notes { width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #f8fafc; font-family: inherit; font-size: 13px; color: #0f172a; resize: vertical; outline: none; min-height: 70px; box-sizing: border-box; }
.td-modal__notes:focus { border-color: #16a34a; background: white; box-shadow: 0 0 0 3px rgba(22,163,74,.08); }

.td-modal__actions { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; justify-content: flex-end; }
.td-modal__actions .tn-btn { flex: 1; justify-content: center; }

/* === Match form === */
.td-mform { display: flex; flex-direction: column; gap: 14px; }
.td-mform__field { display: flex; flex-direction: column; gap: 4px; }
.td-mform__grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.td-mform__label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
.td-mform__hint { font-size: 11px; color: #94a3b8; margin: 4px 0 0; }
.td-mform__input { width: 100%; padding: 11px 13px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #f8fafc; color: #0f172a; font-family: inherit; font-size: 14px; outline: none; transition: all .12s; box-sizing: border-box; }
.td-mform__input:focus { border-color: #16a34a; background: white; box-shadow: 0 0 0 3px rgba(22,163,74,.08); }
.td-mform__error { padding: 10px 14px; border-radius: 9px; background: #fef2f2; border: 1px solid #fca5a5; font-size: 12px; color: #b91c1c; font-weight: 500; }

/* === Match result === */
.td-result { display: flex; flex-direction: column; gap: 12px; }
.td-result__row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
.td-result__team { flex: 1; min-width: 0; }
.td-result__team-name { font-size: 15px; font-weight: 700; color: #0f172a; }
.td-result__score { width: 80px; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: white; font-family: 'DM Serif Display', serif; font-size: 28px; font-weight: 700; text-align: center; color: #0f172a; outline: none; transition: all .12s; }
.td-result__score:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.08); }
.td-result__divider { text-align: center; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .1em; }
.td-result__preview { text-align: center; padding: 10px; background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 10px; font-size: 13px; color: #15803d; font-weight: 700; margin: 4px 0 0; }

@media (max-width: 768px) {
  .td__stats { grid-template-columns: 1fr; }
  .td__teams-header { display: none; }
  .td__team-row { grid-template-columns: 1fr; padding: 14px; gap: 6px; }
  .td__title { font-size: 22px; }
  .td__header { flex-direction: column; }
  .td__header-actions { width: 100%; }
  .td__header-actions .tn-btn { flex: 1; justify-content: center; }
  .td-modal__sinpe-ref { font-size: 36px; }
  .td-mform__grid-2 { grid-template-columns: 1fr; }
  .td__match-teams { grid-template-columns: 1fr; }
  .td__match-vs { transform: none; }
  .td__matches-header { flex-direction: column; align-items: flex-start; }
}
`