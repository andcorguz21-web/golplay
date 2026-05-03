/**
 * GolPlay — pages/admin/tournaments/index.tsx
 * Panel de gestión de Torneos
 *
 * Features:
 * - Listado de torneos con tabs por estado
 * - Super-admin ve TODOS los torneos
 * - Owner solo ve los suyos (managed_by = userId)
 * - Empty state por tab
 * - Link a crear nuevo y a detalle de cada torneo
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { TournamentStatus, TournamentWithMeta } from '@/types/tournaments'

// ─── Types adicionales ──────────────────────────────────────

type TabId = 'active' | 'draft' | 'history'

// ─── Helpers ────────────────────────────────────────────────

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

const fmtCRC = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'short',
  })
}

const fmtDateRange = (start: string, end: string | null) => {
  const sStr = fmtDate(start)
  if (!end) return sStr
  const [y, m, day] = end.split('-').map(Number)
  const eStr = new Date(y, m - 1, day).toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${sStr} → ${eStr}`
}

const getVenueLabel = (t: TournamentWithMeta) => {
  if (t.is_external) {
    return t.venue_city
      ? `${t.venue_name} · ${t.venue_city}`
      : t.venue_name ?? 'Venue externo'
  }
  return t.complex_name ?? 'Sin complejo'
}

// ─── Component ──────────────────────────────────────────────

export default function AdminTournaments() {
  const router = useRouter()
  const { isAdmin, loading: adminLoading, userId } = usePlatformAdmin()

  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<TournamentWithMeta[]>([])
  const [tab, setTab] = useState<TabId>('active')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
    })
  }, [router])

  // Load tournaments
  const loadTournaments = useCallback(async () => {
    if (adminLoading || !userId) return
    setLoading(true)

    let query = supabase
      .from('tournaments')
      .select(`
        id, complex_id, venue_name, venue_address, venue_city, venue_lat, venue_lng,
        is_external, managed_by, slug, name, description, rules, sport_type, format,
        start_date, end_date, max_teams, price_per_team, cover_image_url, status,
        sinpe_phone, sinpe_holder, contact_phone, created_at, updated_at,
        complexes ( name ),
        tournament_teams ( id, status )
      `)
      .order('created_at', { ascending: false })

    if (!isAdmin) {
      query = query.eq('managed_by', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando torneos:', error)
      showToast('Error cargando torneos', false)
      setTournaments([])
      setLoading(false)
      return
    }

    const mapped: TournamentWithMeta[] = (data ?? []).map((t: any) => {
      const teams = t.tournament_teams ?? []
      return {
        ...t,
        price_per_team: Number(t.price_per_team),
        venue_lat: t.venue_lat !== null ? Number(t.venue_lat) : null,
        venue_lng: t.venue_lng !== null ? Number(t.venue_lng) : null,
        complex_name: t.complexes?.name ?? null,
        confirmed_count: teams.filter((tm: any) => tm.status === 'CONFIRMED').length,
        pending_count:   teams.filter((tm: any) => tm.status === 'PENDING_PAYMENT').length,
      }
    })

    setTournaments(mapped)
    setLoading(false)
  }, [adminLoading, isAdmin, userId, showToast])

  useEffect(() => { loadTournaments() }, [loadTournaments])

  // Filter by tab
  const filtered = useMemo(() => {
    if (tab === 'active') return tournaments.filter(t => ['OPEN','FULL','IN_PROGRESS'].includes(t.status))
    if (tab === 'draft')  return tournaments.filter(t => t.status === 'DRAFT')
    return tournaments.filter(t => ['FINISHED','CANCELLED'].includes(t.status))
  }, [tournaments, tab])

  const counts = useMemo(() => ({
    active:  tournaments.filter(t => ['OPEN','FULL','IN_PROGRESS'].includes(t.status)).length,
    draft:   tournaments.filter(t => t.status === 'DRAFT').length,
    history: tournaments.filter(t => ['FINISHED','CANCELLED'].includes(t.status)).length,
  }), [tournaments])

  const totalPending = useMemo(
    () => tournaments.reduce((sum, t) => sum + t.pending_count, 0),
    [tournaments]
  )

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && (
        <div className={`tn-toast ${toast.ok ? 'tn-toast--ok' : 'tn-toast--err'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div className="tn">
        {/* Super-admin banner */}
        {isAdmin && (
          <div className="tn-admin-banner">
            <span>🛡️</span>
            <span>Operando como super-admin · viendo torneos de todos los organizadores</span>
          </div>
        )}

        {/* Header */}
        <div className="tn-header">
          <div>
            <h1 className="tn-title">🏆 Torneos</h1>
            <p className="tn-sub">
              {loading ? 'Cargando…' : `${tournaments.length} torneo${tournaments.length !== 1 ? 's' : ''} en total`}
              {totalPending > 0 && ` · ${totalPending} pago${totalPending !== 1 ? 's' : ''} pendiente${totalPending !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="tn-header__right">
            <button className="tn-btn tn-btn--ghost" onClick={loadTournaments}>🔄 Actualizar</button>
            <Link href="/admin/tournaments/new" className="tn-btn tn-btn--primary">+ Crear torneo</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="tn-tabs">
          {([
            { id: 'active'  as TabId, label: 'Activos',    icon: '⚡' },
            { id: 'draft'   as TabId, label: 'Borradores', icon: '📝' },
            { id: 'history' as TabId, label: 'Historial',  icon: '📋' },
          ]).map(t => (
            <button
              key={t.id}
              className={`tn-tab ${tab === t.id ? 'tn-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
              <span className="tn-tab__count">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        {/* Tournament list */}
        {loading ? (
          <div className="tn-empty">Cargando torneos...</div>
        ) : filtered.length === 0 ? (
          <div className="tn-empty">
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🏆</span>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#0f172a' }}>
              {tab === 'active' ? 'Sin torneos activos' :
               tab === 'draft'  ? 'Sin borradores' :
                                  'Sin historial'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 0 }}>
              {tab === 'active' || tab === 'draft'
                ? 'Creá un torneo, abrí inscripciones y compartí el link por WhatsApp.'
                : 'Acá vas a ver los torneos que ya finalizaron o se cancelaron.'}
            </p>
            {(tab === 'active' || tab === 'draft') && (
              <Link href="/admin/tournaments/new" className="tn-btn tn-btn--primary" style={{ marginTop: 20 }}>
                + Crear primer torneo
              </Link>
            )}
          </div>
        ) : (
          <div className="tn-grid">
            {filtered.map(t => {
              const st = STATUS_CFG[t.status]
              const sp = SPORT_META[t.sport_type] ?? SPORT_META.otro
              return (
                <Link key={t.id} href={`/admin/tournaments/${t.id}`} className="tn-card">
                  {/* Cover */}
                  <div className="tn-card__cover">
                    {t.cover_image_url ? (
                      <img src={t.cover_image_url} alt={t.name} className="tn-card__cover-img" />
                    ) : (
                      <div className="tn-card__cover-placeholder">
                        <span className="tn-card__cover-emoji">{sp.emoji}</span>
                      </div>
                    )}
                    <span className="tn-badge tn-badge--abs-tl" style={{ color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                    {t.is_external && (
                      <span className="tn-badge tn-badge--external">GolPlay Organiza</span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="tn-card__body">
                    <p className="tn-card__sport">{sp.label}</p>
                    <h3 className="tn-card__name">{t.name}</h3>

                    <div className="tn-card__rows">
                      <div className="tn-card__row">
                        <span className="tn-card__row-icon">📅</span>
                        <span className="tn-card__row-value">{fmtDateRange(t.start_date, t.end_date)}</span>
                      </div>
                      <div className="tn-card__row">
                        <span className="tn-card__row-icon">👥</span>
                        <span className="tn-card__row-value">{t.confirmed_count} / {t.max_teams} equipos</span>
                      </div>
                      <div className="tn-card__row">
                        <span className="tn-card__row-icon">📍</span>
                        <span className="tn-card__row-value">{getVenueLabel(t)}</span>
                      </div>
                    </div>

                    <div className="tn-card__footer">
                      <span className="tn-card__pending">
                        {t.pending_count > 0
                          ? `⏳ ${t.pending_count} pendiente${t.pending_count !== 1 ? 's' : ''}`
                          : 'Sin pendientes'}
                      </span>
                      <span className="tn-card__price">{fmtCRC(t.price_per_team)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ─── CSS ────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

.tn { max-width: 1200px; margin: 0 auto; padding: 28px 20px; font-family: 'DM Sans', sans-serif; }

.tn-admin-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 16px; }

.tn-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 24px; }
.tn-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
.tn-sub { font-size: 13px; color: #94a3b8; margin: 4px 0 0; }
.tn-header__right { display: flex; gap: 8px; flex-wrap: wrap; }

.tn-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 20px; }
.tn-tab { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; font-size: 12px; font-weight: 600; font-family: inherit; border: 1.5px solid transparent; background: white; color: #64748b; cursor: pointer; transition: all .13s; }
.tn-tab:hover { background: #f8fafc; color: #0f172a; border-color: #e2e8f0; }
.tn-tab--active { background: #0f172a; color: white; border-color: #0f172a; }
.tn-tab__count { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: rgba(0,0,0,.07); }
.tn-tab--active .tn-tab__count { background: rgba(255,255,255,.18); }

.tn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

.tn-card { background: white; border: 1px solid #eaecf0; border-radius: 16px; overflow: hidden; transition: all .15s; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
.tn-card:hover { border-color: #16a34a; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.06); }

.tn-card__cover { height: 140px; background: linear-gradient(135deg, #052e16 0%, #0B4D2C 100%); position: relative; overflow: hidden; }
.tn-card__cover-img { width: 100%; height: 100%; object-fit: cover; }
.tn-card__cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.tn-card__cover-emoji { font-size: 56px; opacity: .35; }

.tn-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; text-transform: uppercase; letter-spacing: .03em; }
.tn-badge--abs-tl { position: absolute; top: 12px; left: 12px; }
.tn-badge--external { position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,.95); color: #0B4D2C; }

.tn-card__body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.tn-card__sport { font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
.tn-card__name { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.25; }

.tn-card__rows { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.tn-card__row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #64748b; }
.tn-card__row-icon { font-size: 13px; flex-shrink: 0; }
.tn-card__row-value { font-weight: 500; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tn-card__footer { margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
.tn-card__pending { font-size: 11px; color: #94a3b8; font-weight: 600; }
.tn-card__price { font-size: 13px; font-weight: 800; color: #0f172a; }

.tn-empty { text-align: center; padding: 64px 24px; background: white; border-radius: 16px; border: 1px solid #eaecf0; color: #64748b; }

.tn-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; transition: all .15s; text-decoration: none; }
.tn-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 2px 12px rgba(22,163,74,.25); }
.tn-btn--primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(22,163,74,.35); }
.tn-btn--ghost { background: #f1f5f9; color: #374151; }
.tn-btn--ghost:hover { background: #e2e8f0; }

.tn-toast { position: fixed; bottom: 28px; right: 28px; z-index: 9999; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,.18); animation: tnToastIn .2s ease; }
@keyframes tnToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.tn-toast--ok { background: #0f172a; color: white; }
.tn-toast--err { background: #ef4444; color: white; }

@media (max-width: 640px) {
  .tn { padding: 20px 16px; }
  .tn-title { font-size: 20px; }
  .tn-grid { grid-template-columns: 1fr; }
}
`