import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Filler, LineElement, PointElement,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import * as XLSX from 'xlsx'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler, ChartDataLabels)

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'active' | 'confirmed' | 'pending' | 'cancelled'
interface Field   { id: number; name: string; price: number; price_day?: number; price_night?: number; active?: boolean | null; sport?: string; commission_limit?: number; commission_amount?: number; owner_id?: string }
interface Booking { id: number; date: string; hour: string; status: BookingStatus; customer_name?: string; customer_last_name?: string; customer_email?: string; price?: number; fields: Field | Field[] | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fCRC  = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`
const fISO  = (d: Date)   => d.toISOString().split('T')[0]
const todayS = ()         => new Date().toISOString().split('T')[0]

// ✅ FIX #2: treat null as active — a field is active unless explicitly set to false
const isFieldActive = (f: Field) => f.active !== false

function nField(f: any): Field | null {
  if (!f) return null
  return Array.isArray(f) ? (f[0] ?? null) : f
}

function pct(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

const SPORT_ICON: Record<string, string> = {
  futbol5: '⚽', futbol7: '⚽', futbol11: '⚽',
  padel: '🎾', tenis: '🥎', basquet: '🏀', voleibol: '🏐', otro: '🏟️',
}

const HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()

  // ✅ FIX #1: track userId so fields load AFTER auth is confirmed
  const [userId,   setUserId]   = useState<string | null>(null)
  const [ready,    setReady]    = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [fields,   setFields]   = useState<Field[]>([])
  const [kpis,     setKpis]     = useState<any>(null)
  const [charts,   setCharts]   = useState<any>(null)

  const [from, setFrom] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d })
  const [to,   setTo]   = useState<Date>(new Date())
  const [openCal, setOpenCal] = useState<'from' | 'to' | null>(null)
  const calRef = useRef<HTMLDivElement>(null)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Auth — resolve userId first, then everything else ─────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
      } else {
        setUserId(data.session.user.id)
        setReady(true)
      }
    })
  }, [router])

  // Close calendar on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setOpenCal(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Pre-load fields immediately on auth so the panel shows while bookings load
  useEffect(() => {
    if (!userId) return
    supabase
      .from('fields')
      .select('id, name, price, price_day, price_night, sport, active, owner_id, commission_limit, commission_amount')
      .eq('owner_id', userId)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setFields(data)
      })
  }, [userId])

  // ── Main data loader ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!ready || !userId) return
    setLoading(true)

    const fromStr = fISO(from)
    const toStr   = fISO(to)

    // Two separate queries — no FK/join needed, works regardless of FK config
    const [bookingsRes, fieldsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, date, hour, status, name, customer_name, customer_last_name, customer_email, price, field_id')
        .gte('date', fromStr)
        .lte('date', toStr)
        .order('date', { ascending: false }),
      supabase
        .from('fields')
        .select('id, name, price, price_day, price_night, sport, active, commission_limit, commission_amount'),
    ])

    if (bookingsRes.error) {
      console.error('[Dashboard] bookings error:', bookingsRes.error.message)
      showToast(`Error: ${bookingsRes.error.message}`, false)
      setLoading(false)
      return
    }

    // Build a map of fields by id for O(1) lookup
    const fieldsMap = new Map<number, Field>(
      (fieldsRes.data || []).map((f: any) => [f.id, f as Field])
    )

    // Update fields state with fresh data (includes sport + active if they exist)
    if (fieldsRes.data && fieldsRes.data.length > 0) setFields(fieldsRes.data)

    const all: Booking[] = (bookingsRes.data || []).map((b: any, i: number) => ({
      id: b.id ?? i,
      date: b.date,
      hour: b.hour ?? '',
      status: (b.status ?? 'confirmed') as BookingStatus,
      customer_name: b.customer_name || b.name,
      customer_last_name: b.customer_last_name,
      customer_email: b.customer_email,
      price: b.price ? Number(b.price) : undefined,
      fields: fieldsMap.get(b.field_id) ?? null,
    }))

    // Previous period — same duration shifted back
    const periodDays = Math.ceil((to.getTime() - from.getTime()) / 86400000)
    const prevTo   = new Date(from); prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - periodDays)

    const { data: prevRaw } = await supabase
      .from('bookings')
      .select('date, status, field_id, price')
      .gte('date', fISO(prevFrom))
      .lte('date', fISO(prevTo))

    const prevData = (prevRaw || []).map((b: any) => ({
      ...b,
      fields: fieldsMap.get(b.field_id) ?? null,
    }))

    setBookings(all)
    buildKPIs(all, prevData, from, to)
    buildCharts(all, from, to)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, from, to])

  useEffect(() => { load() }, [load])

  // ── KPI builder ────────────────────────────────────────────────────────────
  // ✅ FIX #3: use `from`/`to` parameters instead of hardcoded monthS()
  function buildKPIs(data: Booking[], prev: any[], rangeFrom: Date, rangeTo: Date) {
    const active    = data.filter(b => b.status !== 'cancelled')
    // bookings.status in DB: 'active' (default) | 'cancelled' | 'pending'
    const today     = active.filter(b => b.date === todayS())
    const pending   = data.filter(b => b.status === 'pending')

    // Revenue for the selected range (not hardcoded month)
    const rangeRev  = active.reduce((s, b) => s + (b.price ?? nField(b.fields)?.price ?? 0), 0)

    // Previous period revenue
    const prevAct   = prev.filter((b: any) => b.status !== 'cancelled')
    const prevRev   = prevAct.reduce((s: number, b: any) => s + (b.price ?? nField(b.fields)?.price ?? 0), 0)

    // Peak hour
    const hourMap: Record<string, number> = {}
    active.forEach(b => { if (b.hour) hourMap[b.hour] = (hourMap[b.hour] || 0) + 1 })
    const peakEntry = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0]

    // Top field
    const fieldMap: Record<string, number> = {}
    active.forEach(b => { const n = nField(b.fields)?.name ?? '—'; fieldMap[n] = (fieldMap[n] || 0) + 1 })
    const topEntry = Object.entries(fieldMap).sort((a, b) => b[1] - a[1])[0]

    // ✅ FIX #2: use isFieldActive() — counts NULL as active
    const activeFieldCount = fields.filter(isFieldActive).length

    setKpis({
      todayCount:      today.length,
      rangeCount:      active.length,
      rangeRev,
      pendingCount:    pending.length,
      activeFields:    activeFieldCount,
      peakHour:        peakEntry ? peakEntry[0] : '—',
      peakCount:       peakEntry ? peakEntry[1] : 0,
      topField:        topEntry  ? topEntry[0]  : '—',
      topFieldCount:   topEntry  ? topEntry[1]  : 0,
      // Use real commission values from fields
      commission:      (() => {
        const commAmt   = fields[0]?.commission_amount ?? 2000
        const commLimit = fields[0]?.commission_limit  ?? 85
        const billable  = Math.min(active.length, commLimit)
        return billable * commAmt
      })(),
      commissionPct:   fields[0] ? Math.min(active.length / (fields[0].commission_limit ?? 85), 1) * 100 : 0,
      commissionCount: Math.min(active.length, fields[0]?.commission_limit ?? 85),
      commissionLimit: fields[0]?.commission_limit ?? 85,
      revChange:       pct(rangeRev, prevRev),
      countChange:     pct(active.length, prevAct.length),
      avgTicket:       active.length ? rangeRev / active.length : 0,
      rangeLabel:      rangeFrom.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) +
                       ' — ' +
                       rangeTo.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }),
    })
  }

  function buildCharts(data: Booking[], rangeFrom: Date, rangeTo: Date) {
    const active = data.filter(b => b.status !== 'cancelled')

    // Build day array for the selected range (max 60 days displayed)
    const days: string[] = []
    const cur = new Date(rangeFrom), end = new Date(rangeTo)
    while (cur <= end) { days.push(fISO(cur)); cur.setDate(cur.getDate() + 1) }
    const displayDays = days.slice(-60)
    const dayCount = displayDays.map(d => active.filter(b => b.date === d).length)

    // By field
    const byField: Record<string, number> = {}
    active.forEach(b => { const n = nField(b.fields)?.name ?? 'Otra'; byField[n] = (byField[n] || 0) + 1 })
    const sortedFields = Object.entries(byField).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // By hour
    const byHour: Record<string, number> = {}
    active.forEach(b => { if (b.hour) byHour[b.hour] = (byHour[b.hour] || 0) + 1 })

    setCharts({ displayDays, dayCount, sortedFields, byHour })
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportXLSX = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(bookings.map(b => ({
      ID:       b.id,
      Cliente:  b.customer_name ? `${b.customer_name} ${b.customer_last_name ?? ''}`.trim() : '—',
      Email:    b.customer_email ?? '—',
      Cancha:   nField(b.fields)?.name ?? '—',
      Fecha:    b.date,
      Hora:     b.hour,
      Estado:   b.status,
      Precio:   nField(b.fields)?.price ?? 0,
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas')
    XLSX.writeFile(wb, `golplay_${fISO(new Date())}.xlsx`)
    showToast('Reporte exportado ✓')
  }, [bookings, showToast])

  // ── Date presets ───────────────────────────────────────────────────────────
  const setPreset = (p: 'today' | 'week' | 'month' | 'prev') => {
    const t = new Date()
    if (p === 'today') { setFrom(new Date(t)); setTo(new Date(t)) }
    if (p === 'week')  { const d = new Date(t); d.setDate(d.getDate() - 6); setFrom(d); setTo(new Date(t)) }
    if (p === 'month') { const d = new Date(t.getFullYear(), t.getMonth(), 1); setFrom(d); setTo(new Date(t)) }
    if (p === 'prev')  {
      const s = new Date(t.getFullYear(), t.getMonth() - 1, 1)
      const e = new Date(t.getFullYear(), t.getMonth(), 0)
      setFrom(s); setTo(e)
    }
  }

  if (!ready) return null

  const recentBookings = bookings.slice(0, 8)

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && (
        <div className={`d-toast ${toast.ok ? 'd-toast--ok' : 'd-toast--err'}`}>{toast.msg}</div>
      )}

      <div className="d">

        {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
        <header className="d-top">
          <div className="d-top__left">
            <div className="d-logo">
              <div className="d-logo__mark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5"/>
                  <path d="M12 7v5l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="d-logo__text">GolPlay</span>
              <span className="d-logo__pill">Admin</span>
            </div>
          </div>

          <div className="d-top__center">
            <div className="d-daterow" ref={calRef}>
              <div className="d-presets">
                {(['today','week','month','prev'] as const).map(p => (
                  <button key={p} className="d-preset" onClick={() => setPreset(p)}>
                    {p === 'today' ? 'Hoy' : p === 'week' ? '7 días' : p === 'month' ? 'Este mes' : 'Mes anterior'}
                  </button>
                ))}
              </div>
              <div className="d-range">
                <button className="d-rangebtn" onClick={() => setOpenCal(openCal === 'from' ? null : 'from')}>
                  <IcoCalendar/>
                  {from.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                </button>
                <span className="d-range__sep">—</span>
                <button className="d-rangebtn" onClick={() => setOpenCal(openCal === 'to' ? null : 'to')}>
                  <IcoCalendar/>
                  {to.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                </button>
                {openCal && (
                  <div className="d-calpop">
                    <MiniCal
                      value={openCal === 'from' ? from : to}
                      onSelect={d => { openCal === 'from' ? setFrom(d) : setTo(d); setOpenCal(null) }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="d-top__right">
            <button className="d-btn d-btn--ghost" onClick={() => router.push('/admin/bookings')}>
              <IcoGrid/>Reservas
            </button>
            <button className="d-btn d-btn--ghost" onClick={() => router.push('/admin/fields')}>
              <IcoField/>Canchas
            </button>
            <button className="d-btn d-btn--export" onClick={exportXLSX}>
              <IcoExport/>Exportar
            </button>
          </div>
        </header>

        {/* ── KPI CARDS ───────────────────────────────────────────────────── */}
        <section className="d-kpis">

          {/* Today */}
          <div className="d-kpi d-kpi--today" onClick={() => router.push('/admin/bookings')}>
            {loading ? <KpiSkeleton/> : <>
              <div className="d-kpi__eyebrow">
                <span className="d-kpi__label">Reservas hoy</span>
                <div className="d-kpi__icon d-kpi__icon--green"><IcoCalendar/></div>
              </div>
              <div className="d-kpi__number">{kpis?.todayCount ?? 0}</div>
              {kpis?.pendingCount > 0
                ? <div className="d-kpi__badge d-kpi__badge--warn">⚠ {kpis.pendingCount} pendiente{kpis.pendingCount > 1 ? 's' : ''}</div>
                : <div className="d-kpi__badge d-kpi__badge--ok">✓ Al día</div>
              }
            </>}
          </div>

          {/* Period bookings */}
          <div className="d-kpi d-kpi--bookings" onClick={() => router.push('/admin/bookings')}>
            {loading ? <KpiSkeleton/> : <>
              <div className="d-kpi__eyebrow">
                <span className="d-kpi__label">Reservas período</span>
                <div className="d-kpi__icon d-kpi__icon--blue"><IcoTrend/></div>
              </div>
              <div className="d-kpi__number">{kpis?.rangeCount ?? 0}</div>
              {kpis?.countChange !== undefined && (
                <div className={`d-kpi__change ${kpis.countChange >= 0 ? 'd-kpi__change--up' : 'd-kpi__change--dn'}`}>
                  {kpis.countChange >= 0 ? '↑' : '↓'} {Math.abs(kpis.countChange)}% vs período anterior
                </div>
              )}
            </>}
          </div>

          {/* Revenue — featured */}
          <div className="d-kpi d-kpi--revenue">
            {loading ? <KpiSkeleton dark/> : <>
              <div className="d-kpi__eyebrow">
                <span className="d-kpi__label">Ingresos período</span>
                <div className="d-kpi__icon d-kpi__icon--dark"><IcoMoney/></div>
              </div>
              <div className="d-kpi__number d-kpi__number--lg d-kpi__number--white">
                {kpis ? fCRC(kpis.rangeRev) : '₡0'}
              </div>
              <div className="d-kpi__row">
                <span className="d-kpi__sub">Ticket prom. <strong>{kpis ? fCRC(kpis.avgTicket) : '₡0'}</strong></span>
                {kpis?.revChange !== undefined && (
                  <span className={`d-kpi__change ${kpis.revChange >= 0 ? 'd-kpi__change--up' : 'd-kpi__change--dn'}`}>
                    {kpis.revChange >= 0 ? '↑' : '↓'} {Math.abs(kpis.revChange)}%
                  </span>
                )}
              </div>
            </>}
          </div>

          {/* Active fields — ✅ now uses corrected isFieldActive count */}
          <div className="d-kpi d-kpi--fields" onClick={() => router.push('/admin/fields')}>
            {loading ? <KpiSkeleton/> : <>
              <div className="d-kpi__eyebrow">
                <span className="d-kpi__label">Canchas activas</span>
                <div className="d-kpi__icon d-kpi__icon--amber"><IcoBall/></div>
              </div>
              <div className="d-kpi__number">{fields.filter(isFieldActive).length}</div>
              <div className="d-kpi__sub">
                de <strong>{fields.length}</strong> en total
              </div>
            </>}
          </div>

          {/* Peak hour */}
          <div className="d-kpi d-kpi--peak">
            {loading ? <KpiSkeleton/> : <>
              <div className="d-kpi__eyebrow">
                <span className="d-kpi__label">Hora pico</span>
                <div className="d-kpi__icon d-kpi__icon--cyan"><IcoClock/></div>
              </div>
              <div className="d-kpi__number d-kpi__number--mono">{kpis?.peakHour ?? '—'}</div>
              {kpis?.peakCount > 0 && (
                <div className="d-kpi__sub">{kpis.peakCount} reservas en el período</div>
              )}
            </>}
          </div>

          {/* Commission */}
          <div className="d-kpi d-kpi--commission">
            {loading ? <KpiSkeleton dark/> : <>
              <div className="d-kpi__eyebrow">
                <span className="d-kpi__label d-kpi__label--light">Comisión GolPlay</span>
                <span className="d-comm__pct">{kpis ? Math.round(kpis.commissionPct) : 0}%</span>
              </div>
              <div className="d-kpi__number d-kpi__number--white">{kpis ? fCRC(kpis.commission) : '₡0'}</div>
              <div className="d-comm__bar">
                <div className="d-comm__fill" style={{ width: `${kpis?.commissionPct ?? 0}%` }}/>
              </div>
              <div className="d-comm__row">
                <span className="d-kpi__sub d-kpi__sub--muted">{kpis?.commissionCount ?? 0}/{kpis?.commissionLimit ?? 85} reservas</span>
                <button className="d-commlink" onClick={() => router.push('/admin/payments')}>Ir a pagos →</button>
              </div>
            </>}
          </div>

        </section>

        {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
        <div className="d-grid">

          {/* ── LEFT ── */}
          <div className="d-col d-col--main">

            {/* Trend chart */}
            <div className="d-card">
              <div className="d-card__hd">
                <div>
                  <h3 className="d-card__ttl">Tendencia de reservas</h3>
                  <p className="d-card__sub">
                    {kpis?.rangeLabel} · {bookings.filter(b => b.status !== 'cancelled').length} reservas activas
                  </p>
                </div>
                <div className="d-card__legend">
                  <span className="d-legend__dot"/>
                  <span className="d-legend__txt">Reservas / día</span>
                </div>
              </div>
              <div className="d-chart">
                {loading
                  ? <div className="d-sk" style={{ height: 200, margin: '0 24px 24px' }}/>
                  : charts && (
                    <Line
                      data={{
                        labels: charts.displayDays.map((d: string) =>
                          new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
                        ),
                        datasets: [{
                          data: charts.dayCount,
                          borderColor: '#22c55e',
                          borderWidth: 2,
                          pointRadius: 0,
                          pointHoverRadius: 4,
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: '#22c55e',
                          pointHoverBorderWidth: 2,
                          tension: 0.45,
                          fill: true,
                          backgroundColor: (ctx: any) => {
                            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220)
                            g.addColorStop(0, 'rgba(34,197,94,0.12)')
                            g.addColorStop(1, 'rgba(34,197,94,0)')
                            return g
                          },
                        }],
                      }}
                      options={lineOpts}
                    />
                  )
                }
              </div>
            </div>

            {/* Heatmap */}
            <div className="d-card">
              <div className="d-card__hd">
                <div>
                  <h3 className="d-card__ttl">Ocupación horaria</h3>
                  <p className="d-card__sub">Intensidad de reservas por franja horaria en el período</p>
                </div>
                <div className="d-heatlegend">
                  <span className="d-heatlegend__item d-heatlegend__item--low">Baja</span>
                  <div className="d-heatlegend__scale"/>
                  <span className="d-heatlegend__item d-heatlegend__item--high">Alta</span>
                </div>
              </div>
              {loading
                ? <div className="d-sk" style={{ height: 80, margin: '0 24px 24px' }}/>
                : charts && (
                  <div className="d-heat">
                    {HOURS.map(h => {
                      const count = charts.byHour[h] ?? 0
                      const max   = Math.max(...HOURS.map((x: string) => charts.byHour[x] ?? 0), 1)
                      const ratio = count / max
                      const bg    = ratio > 0.75 ? '#ef4444' : ratio > 0.45 ? '#f59e0b' : ratio > 0.15 ? '#22c55e' : '#e2e8f0'
                      const op    = ratio > 0 ? 0.18 + ratio * 0.82 : 1
                      return (
                        <div key={h} className="d-heat__cell" title={`${h} — ${count} reservas`}>
                          <div className="d-heat__blk" style={{ background: bg, opacity: op }}/>
                          <span className="d-heat__lbl">{h.slice(0, 2)}</span>
                          {count > 0 && <span className="d-heat__n">{count}</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>

            {/* Recent bookings */}
            <div className="d-card">
              <div className="d-card__hd">
                <div>
                  <h3 className="d-card__ttl">Reservas recientes</h3>
                  <p className="d-card__sub">{bookings.length} en el período seleccionado</p>
                </div>
                <button className="d-btn d-btn--sm d-btn--ghost" onClick={() => router.push('/admin/bookings')}>
                  Ver todas →
                </button>
              </div>
              {loading ? (
                <div className="d-skrows">
                  {[...Array(5)].map((_, i) => <div key={i} className="d-sk d-sk--row"/>)}
                </div>
              ) : recentBookings.length === 0 ? (
                <EmptyState icon="📭" msg="Sin reservas en este período"/>
              ) : (
                <div className="d-bklist">
                  {recentBookings.map(b => {
                    const field    = nField(b.fields)
                    const isToday  = b.date === todayS()
                    const isFuture = b.date > todayS()
                    return (
                      <div key={b.id} className="d-bk">
                        <div className="d-bk__av">
                          {(b.customer_name ?? 'R').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="d-bk__info">
                          <p className="d-bk__name">{b.customer_name ? `${b.customer_name} ${b.customer_last_name ?? ''}`.trim() : `Reserva #${b.id}`}</p>
                          <p className="d-bk__meta">{field?.name ?? '—'} · {b.hour}</p>
                        </div>
                        <div className="d-bk__right">
                          <span className={`d-bk__date ${isToday ? 'd-bk__date--today' : isFuture ? 'd-bk__date--future' : ''}`}>
                            {isToday ? 'Hoy' : new Date(b.date + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                          </span>
                          <SBadge status={b.status}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT ── */}
          <div className="d-col d-col--side">

            {/* By field */}
            <div className="d-card">
              <div className="d-card__hd">
                <div>
                  <h3 className="d-card__ttl">Reservas por cancha</h3>
                  <p className="d-card__sub">Período seleccionado</p>
                </div>
              </div>
              {loading
                ? <div className="d-sk" style={{ height: 160, margin: '0 24px 24px' }}/>
                : charts && charts.sortedFields.length > 0
                  ? (
                    <div className="d-barlist">
                      {charts.sortedFields.map(([name, count]: [string, number], i: number) => {
                        const max   = charts.sortedFields[0]?.[1] ?? 1
                        const pctW  = Math.round((count / max) * 100)
                        const sport = fields.find(f => f.name === name)?.sport
                        return (
                          <div key={name} className="d-bar">
                            <div className="d-bar__head">
                              <span className="d-bar__ico">{SPORT_ICON[sport ?? ''] ?? '🏟️'}</span>
                              <span className="d-bar__nm">{name}</span>
                              <span className="d-bar__ct">{count}</span>
                            </div>
                            <div className="d-bar__track">
                              <div
                                className="d-bar__fill"
                                style={{ '--w': pctW + '%', animationDelay: `${i * 70}ms` } as any}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                  : <EmptyState icon="📊" msg="Sin datos en este período"/>
              }
            </div>

            {/* ✅ Fields status panel — now correctly loads all fields */}
            <div className="d-card">
              <div className="d-card__hd">
                <div>
                  <h3 className="d-card__ttl">Estado de canchas</h3>
                  <p className="d-card__sub">
                    {fields.filter(isFieldActive).length} activas · {fields.length} total
                  </p>
                </div>
                <button className="d-btn d-btn--sm d-btn--ghost" onClick={() => router.push('/admin/fields')}>
                  Gestionar →
                </button>
              </div>
              {loading ? (
                <div className="d-skrows">
                  {[...Array(4)].map((_, i) => <div key={i} className="d-sk d-sk--row"/>)}
                </div>
              ) : fields.length === 0 ? (
                <EmptyState icon="⚽" msg="Sin canchas registradas"/>
              ) : (
                <div className="d-flist">
                  {fields.map(f => {
                    const cnt      = bookings.filter(b => nField(b.fields)?.id === f.id && b.status !== 'cancelled').length
                    const todayCnt = bookings.filter(b => nField(b.fields)?.id === f.id && b.date === todayS() && b.status !== 'cancelled').length
                    const active   = isFieldActive(f)
                    return (
                      <div key={f.id} className={`d-fitem ${!active ? 'd-fitem--off' : ''}`}>
                        <span className="d-fitem__ico">{SPORT_ICON[f.sport ?? ''] ?? '🏟️'}</span>
                        <div className="d-fitem__info">
                          <p className="d-fitem__nm">{f.name}</p>
                          <p className="d-fitem__meta">{cnt} reservas · {fCRC(f.price)}/h</p>
                        </div>
                        <div className="d-fitem__r">
                          {todayCnt > 0 && (
                            <span className="d-fitem__today">{todayCnt} hoy</span>
                          )}
                          <span className={`d-dot ${active ? 'd-dot--on' : 'd-dot--off'}`}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── PENDING ALERT ───────────────────────────────────────────────── */}
        {!loading && kpis?.pendingCount > 0 && (
          <div className="d-alert">
            <span className="d-alert__ico">⚠️</span>
            <span>Tenés <strong>{kpis.pendingCount} reserva{kpis.pendingCount > 1 ? 's' : ''} pendiente{kpis.pendingCount > 1 ? 's' : ''}</strong> esperando confirmación.</span>
            <button className="d-btn d-btn--amber d-btn--sm" onClick={() => router.push('/admin/bookings?status=pending')}>
              Revisar ahora →
            </button>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiSkeleton({ dark }: { dark?: boolean }) {
  return (
    <div className="d-kpi__skeleton">
      <div className={`d-sk ${dark ? 'd-sk--dark' : ''}`} style={{ height: 12, width: 80, borderRadius: 6, marginBottom: 16 }}/>
      <div className={`d-sk ${dark ? 'd-sk--dark' : ''}`} style={{ height: 40, width: 120, borderRadius: 8, marginBottom: 10 }}/>
      <div className={`d-sk ${dark ? 'd-sk--dark' : ''}`} style={{ height: 10, width: 100, borderRadius: 6 }}/>
    </div>
  )
}

function SBadge({ status }: { status: BookingStatus }) {
  const m = {
    active:    { l: 'Confirmada', c: 'd-sb--ok' },
    confirmed: { l: 'Confirmada', c: 'd-sb--ok' },
    pending:   { l: 'Pendiente',  c: 'd-sb--warn' },
    cancelled: { l: 'Cancelada',  c: 'd-sb--err' },
  }[status] ?? { l: status, c: 'd-sb--ok' }
  return <span className={`d-sb ${m.c}`}>{m.l}</span>
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="d-empty">
      <span className="d-empty__ico">{icon}</span>
      <p className="d-empty__msg">{msg}</p>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoCalendar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
const IcoExport   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
const IcoGrid     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
const IcoField    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
const IcoTrend    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
const IcoMoney    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
const IcoBall     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>
const IcoClock    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCal({ value, onSelect }: { value: Date; onSelect: (d: Date) => void }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1))
  const y = view.getFullYear(), m = view.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMo = new Date(y, m + 1, 0).getDate()
  const cells    = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]
  const today    = new Date()
  const MON = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const DOW = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']
  return (
    <div className="d-cal">
      <div className="d-cal__nav">
        <button onClick={() => setView(new Date(y, m - 1, 1))}>‹</button>
        <span>{MON[m]} {y}</span>
        <button onClick={() => setView(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div className="d-cal__grid">
        {DOW.map(d => <div key={d} className="d-cal__dow">{d}</div>)}
        {cells.map((c, i) => {
          if (!c) return <div key={`_${i}`}/>
          const d   = new Date(y, m, c)
          const sel = d.toDateString() === value.toDateString()
          const tod = d.toDateString() === today.toDateString()
          return (
            <button
              key={c}
              className={`d-cal__day ${sel ? 'd-cal__day--sel' : ''} ${tod ? 'd-cal__day--tod' : ''}`}
              onClick={() => onSelect(d)}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Chart options ────────────────────────────────────────────────────────────

const lineOpts: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#64748b',
      bodyColor: '#f1f5f9',
      padding: 10,
      cornerRadius: 8,
      borderColor: '#1e293b',
      borderWidth: 1,
      callbacks: { label: ctx => ` ${ctx.parsed.y} reservas` },
    },
    datalabels: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 10, maxRotation: 0 },
      border: { display: false },
    },
    y: { display: false },
  },
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@600;700;800&display=swap');

.d { font-family:'DM Sans',sans-serif; background:#f0f2f5; min-height:100vh; padding-bottom:60px; color:#0f172a; }

.d-top { display:flex; align-items:center; justify-content:space-between; gap:16px; background:white; border-bottom:1px solid #e8ecf0; padding:0 28px; height:58px; position:sticky; top:0; z-index:100; }
.d-top__left   { display:flex; align-items:center; gap:16px; flex-shrink:0; }
.d-top__center { flex:1; display:flex; justify-content:center; }
.d-top__right  { display:flex; align-items:center; gap:8px; flex-shrink:0; }

.d-logo       { display:flex; align-items:center; gap:8px; }
.d-logo__mark { width:30px; height:30px; border-radius:9px; background:linear-gradient(135deg,#16a34a,#15803d); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(22,163,74,.35); }
.d-logo__text { font-family:'Syne',sans-serif; font-size:16px; font-weight:800; letter-spacing:-0.3px; }
.d-logo__pill { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:2px 7px; border-radius:999px; }

.d-daterow { display:flex; align-items:center; gap:10px; }
.d-presets { display:flex; gap:3px; }
.d-preset  { padding:5px 11px; border-radius:7px; border:1px solid #e8ecf0; background:white; font-size:12px; font-weight:500; color:#64748b; cursor:pointer; font-family:inherit; transition:all .12s; }
.d-preset:hover { background:#f8fafc; border-color:#cbd5e1; color:#0f172a; }
.d-range   { display:flex; align-items:center; gap:6px; position:relative; }
.d-range__sep { font-size:11px; color:#cbd5e1; }
.d-rangebtn { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:8px; border:1.5px solid #e8ecf0; background:white; font-size:12px; font-weight:600; color:#374151; cursor:pointer; font-family:inherit; transition:all .12s; }
.d-rangebtn:hover { border-color:#22c55e; color:#0f172a; }
.d-calpop  { position:absolute; top:calc(100% + 8px); right:0; z-index:300; animation:dIn .14s ease; }

.d-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:9px; font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; border:none; transition:all .13s; white-space:nowrap; }
.d-btn--ghost  { background:transparent; color:#374151; border:1.5px solid #e2e8f0; }
.d-btn--ghost:hover { background:#f8fafc; border-color:#cbd5e1; }
.d-btn--export { background:#0f172a; color:white; }
.d-btn--export:hover { background:#1e293b; }
.d-btn--amber  { background:#d97706; color:white; }
.d-btn--amber:hover { background:#b45309; }
.d-btn--sm     { padding:6px 12px; font-size:11px; border-radius:7px; }

.d-kpis { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; padding:20px 28px; }

.d-kpi { background:white; border-radius:16px; padding:22px 22px 20px; border:1px solid #eaecf0; box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.03); display:flex; flex-direction:column; gap:5px; transition:box-shadow .18s,transform .18s; min-width:0; position:relative; overflow:hidden; }
.d-kpi--today, .d-kpi--bookings, .d-kpi--fields, .d-kpi--peak { cursor:pointer; }
.d-kpi--today:hover, .d-kpi--bookings:hover, .d-kpi--fields:hover, .d-kpi--peak:hover { box-shadow:0 4px 16px rgba(0,0,0,.09); transform:translateY(-1px); }
.d-kpi--revenue    { grid-column:span 2; background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); border-color:#1e293b; box-shadow:0 4px 20px rgba(15,23,42,.25); }
.d-kpi--revenue .d-kpi__label  { color:#64748b; }
.d-kpi--revenue .d-kpi__number { color:white; }
.d-kpi--revenue .d-kpi__sub    { color:#64748b; }
.d-kpi--revenue .d-kpi__row    { display:flex; align-items:center; justify-content:space-between; margin-top:4px; }
.d-kpi--commission { background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); border-color:transparent; box-shadow:0 4px 20px rgba(15,23,42,.25); }
.d-kpi--today      { border-color:#dcfce7; background:linear-gradient(135deg,#f0fdf4,white); }

.d-kpi__eyebrow { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.d-kpi__label   { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8; }
.d-kpi__label--light { color:#475569; }
.d-kpi__icon    { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.d-kpi__icon--green  { background:#dcfce7; color:#16a34a; }
.d-kpi__icon--blue   { background:#dbeafe; color:#2563eb; }
.d-kpi__icon--purple { background:#f3e8ff; color:#9333ea; }
.d-kpi__icon--amber  { background:#fef9c3; color:#ca8a04; }
.d-kpi__icon--cyan   { background:#cffafe; color:#0891b2; }
.d-kpi__icon--dark   { background:#1e293b; color:#94a3b8; }

.d-kpi__number { font-family:'Syne',sans-serif; font-size:34px; font-weight:800; line-height:1; letter-spacing:-1.5px; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.d-kpi__number--lg    { font-size:28px; letter-spacing:-1px; }
.d-kpi__number--mono  { font-family:'DM Sans',monospace; letter-spacing:0; font-size:30px; }
.d-kpi__number--white { color:white; font-size:26px; }

.d-kpi__sub         { font-size:11px; color:#94a3b8; }
.d-kpi__sub--muted  { color:#475569; }
.d-kpi__sub strong  { color:#cbd5e1; }
.d-kpi__change      { font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px; flex-shrink:0; }
.d-kpi__change--up  { background:#dcfce7; color:#15803d; }
.d-kpi__change--dn  { background:#fee2e2; color:#b91c1c; }
.d-kpi__badge       { font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; width:fit-content; margin-top:2px; }
.d-kpi__badge--ok   { background:#dcfce7; color:#15803d; }
.d-kpi__badge--warn { background:#fef9c3; color:#854d0e; }
.d-kpi__skeleton    { display:flex; flex-direction:column; gap:10px; padding:2px 0; }

.d-comm__pct  { font-size:11px; font-weight:700; background:#1e293b; color:#64748b; padding:2px 8px; border-radius:999px; border:1px solid #334155; }
.d-comm__bar  { height:3px; background:#1e293b; border-radius:999px; margin:6px 0 2px; overflow:hidden; }
.d-comm__fill { height:100%; background:linear-gradient(90deg,#22c55e,#16a34a); border-radius:999px; transition:width .7s ease; }
.d-comm__row  { display:flex; align-items:center; justify-content:space-between; margin-top:4px; }
.d-commlink   { background:none; border:none; color:#22c55e; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; padding:0; }
.d-commlink:hover { color:#4ade80; }

.d-grid { display:grid; grid-template-columns:1fr 340px; gap:16px; padding:0 28px; }
.d-col  { display:flex; flex-direction:column; gap:16px; }

.d-card { background:white; border-radius:16px; border:1px solid #eaecf0; box-shadow:0 1px 3px rgba(0,0,0,.04),0 2px 8px rgba(0,0,0,.03); overflow:hidden; transition:box-shadow .18s; }
.d-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
.d-card__hd   { display:flex; align-items:flex-start; justify-content:space-between; padding:20px 24px 12px; gap:12px; }
.d-card__ttl  { font-size:14px; font-weight:700; color:#0f172a; margin:0; }
.d-card__sub  { font-size:11px; color:#94a3b8; margin:2px 0 0; }
.d-card__legend { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.d-legend__dot  { width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.15); }
.d-legend__txt  { font-size:11px; color:#94a3b8; font-weight:500; }

.d-chart { height:215px; padding:0 24px 22px; }

.d-heat       { display:flex; flex-wrap:wrap; gap:5px; padding:4px 24px 22px; }
.d-heat__cell { display:flex; flex-direction:column; align-items:center; gap:3px; width:38px; }
.d-heat__blk  { width:100%; height:28px; border-radius:7px; transition:all .3s; }
.d-heat__lbl  { font-size:9px; color:#94a3b8; font-weight:600; }
.d-heat__n    { font-size:9px; color:#374151; font-weight:700; }
.d-heatlegend { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.d-heatlegend__item { font-size:10px; color:#94a3b8; font-weight:500; }
.d-heatlegend__scale { width:60px; height:6px; border-radius:999px; background:linear-gradient(90deg,#e2e8f0,#22c55e,#f59e0b,#ef4444); }

.d-bklist    { display:flex; flex-direction:column; }
.d-bk        { display:flex; align-items:center; gap:12px; padding:12px 24px; border-bottom:1px solid #f8fafc; transition:background .1s; }
.d-bk:last-child { border-bottom:none; }
.d-bk:hover  { background:#fafcff; }
.d-bk__av    { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#16a34a,#166534); color:white; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.d-bk__info  { flex:1; min-width:0; }
.d-bk__name  { font-size:13px; font-weight:600; color:#0f172a; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.d-bk__meta  { font-size:11px; color:#94a3b8; margin:1px 0 0; }
.d-bk__right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.d-bk__date  { font-size:11px; font-weight:600; color:#94a3b8; background:#f1f5f9; padding:2px 8px; border-radius:999px; }
.d-bk__date--today  { background:#dcfce7; color:#15803d; }
.d-bk__date--future { background:#eff6ff; color:#2563eb; }

.d-sb      { font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; }
.d-sb--ok  { background:#f0fdf4; color:#15803d; }
.d-sb--warn{ background:#fefce8; color:#854d0e; }
.d-sb--err { background:#fef2f2; color:#991b1b; }

.d-barlist { padding:4px 24px 22px; display:flex; flex-direction:column; gap:12px; }
.d-bar     { display:flex; flex-direction:column; gap:5px; }
.d-bar__head { display:flex; align-items:center; gap:7px; }
.d-bar__ico  { font-size:14px; }
.d-bar__nm   { font-size:12px; font-weight:600; color:#374151; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.d-bar__ct   { font-size:12px; font-weight:700; color:#0f172a; flex-shrink:0; }
.d-bar__track{ height:6px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
.d-bar__fill { height:100%; width:0; background:linear-gradient(90deg,#22c55e,#16a34a); border-radius:999px; animation:dBar .55s ease forwards; }
@keyframes dBar { to { width:var(--w); } }

.d-flist { display:flex; flex-direction:column; }
.d-fitem { display:flex; align-items:center; gap:10px; padding:11px 24px; border-bottom:1px solid #f8fafc; transition:background .1s; }
.d-fitem:last-child { border-bottom:none; }
.d-fitem:hover { background:#fafcff; }
.d-fitem--off  { opacity:.45; }
.d-fitem__ico  { font-size:20px; flex-shrink:0; }
.d-fitem__info { flex:1; min-width:0; }
.d-fitem__nm   { font-size:13px; font-weight:600; color:#0f172a; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.d-fitem__meta { font-size:11px; color:#94a3b8; margin:1px 0 0; }
.d-fitem__r    { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.d-fitem__today{ font-size:10px; font-weight:700; background:#fef9c3; color:#854d0e; padding:2px 7px; border-radius:999px; }

.d-dot     { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.d-dot--on { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.18); }
.d-dot--off{ background:#e2e8f0; }

.d-alert { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:16px 28px 0; padding:14px 20px; background:#fffbeb; border:1px solid #fde68a; border-radius:14px; font-size:13px; color:#78350f; }
.d-alert__ico { font-size:18px; flex-shrink:0; }

.d-sk      { background:linear-gradient(90deg,#f1f5f9 25%,#e8ecf2 50%,#f1f5f9 75%); background-size:200% 100%; animation:dShimmer 1.6s infinite; border-radius:8px; }
.d-sk--dark{ background:linear-gradient(90deg,#1e293b 25%,#253347 50%,#1e293b 75%); background-size:200% 100%; animation:dShimmer 1.6s infinite; }
.d-sk--row { height:52px; border-radius:8px; }
.d-skrows  { display:flex; flex-direction:column; gap:8px; padding:16px 24px 22px; }
@keyframes dShimmer { to { background-position:-200% 0; } }

.d-empty     { text-align:center; padding:36px 20px; }
.d-empty__ico{ font-size:32px; display:block; margin-bottom:8px; }
.d-empty__msg{ font-size:13px; color:#94a3b8; margin:0; }

.d-toast { position:fixed; bottom:28px; right:28px; z-index:9999; padding:12px 20px; border-radius:12px; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; box-shadow:0 8px 32px rgba(0,0,0,.18); animation:dIn .2s ease; }
.d-toast--ok  { background:#0f172a; color:white; }
.d-toast--err { background:#ef4444; color:white; }
@keyframes dIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

.d-cal { background:white; border-radius:16px; box-shadow:0 8px 40px rgba(0,0,0,.14); border:1px solid #eaecf0; padding:14px; width:240px; font-family:'DM Sans',sans-serif; }
.d-cal__nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; font-size:13px; font-weight:700; }
.d-cal__nav button { background:none; border:none; cursor:pointer; font-size:16px; color:#64748b; padding:2px 6px; border-radius:6px; }
.d-cal__nav button:hover { background:#f1f5f9; }
.d-cal__grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
.d-cal__dow  { text-align:center; font-size:9px; font-weight:700; color:#94a3b8; padding:4px 0; letter-spacing:.04em; text-transform:uppercase; }
.d-cal__day  { aspect-ratio:1; border:none; background:none; border-radius:7px; font-size:12px; font-weight:500; color:#374151; cursor:pointer; transition:all .1s; display:flex; align-items:center; justify-content:center; }
.d-cal__day:hover { background:#f1f5f9; }
.d-cal__day--tod { color:#16a34a; font-weight:700; }
.d-cal__day--sel { background:#16a34a !important; color:white !important; font-weight:700; border-radius:8px; }

@media (max-width:1300px) { .d-kpis { grid-template-columns:repeat(3,1fr); } .d-kpi--revenue { grid-column:span 1; } }
@media (max-width:1024px) { .d-grid { grid-template-columns:1fr; } .d-col--side { display:grid; grid-template-columns:1fr 1fr; gap:16px; } }
@media (max-width:900px)  { .d-top__center { display:none; } .d-kpis { grid-template-columns:repeat(2,1fr); padding:16px; } .d-kpi--revenue { grid-column:span 2; } .d-grid, .d-alert { padding-left:16px; padding-right:16px; } }
@media (max-width:600px)  { .d-top { padding:0 16px; } .d-kpis { grid-template-columns:1fr 1fr; gap:10px; } .d-kpi__number { font-size:26px; } .d-col--side { grid-template-columns:1fr; } .d-top__right .d-btn--ghost { display:none; } }
`
