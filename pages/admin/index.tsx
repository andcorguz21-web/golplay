/**
 * GolPlay — Dashboard Admin
 * pages/admin/index.tsx
 *
 * Dirección de diseño: SaaS Premium Light
 * - Fondo blanco con canvas #f5f7fa
 * - Tarjetas KPI con colores dinámicos vibrantes por categoría
 * - Tipografía: Geist Mono (números) + Inter (texto)
 * - Logo SVG desde /public/logo-golplay1.svg
 * - Sidebar drawer en mobile
 */

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
import {
  getSportEmoji, getSportLabel,
  formatMoney, formatMoneyShort,
  USD_RATES, LATAM_COUNTRIES,
} from '@/pages/sports'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Filler, ChartDataLabels,
)

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'active' | 'confirmed' | 'pending' | 'cancelled'

interface Field {
  id: number
  name: string
  price_day: number
  price_night?: number
  active?: boolean | null
  sport?: string
  owner_id?: string
}

interface Booking {
  id: number
  date: string
  hour: string
  status: BookingStatus
  customer_name?: string
  customer_last_name?: string
  customer_email?: string
  price?: number
  fields: Field | Field[] | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fISO          = (d: Date) => d.toISOString().split('T')[0]
const todayS        = ()        => new Date().toISOString().split('T')[0]
const isFieldActive = (f: Field) => f.active !== false

function nField(f: any): Field | null {
  return !f ? null : Array.isArray(f) ? (f[0] ?? null) : f
}

function pct(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

const HOURS_RANGE = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]
const DEFAULT_HOURS_PER_DAY = 17

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()

  const [userId,        setUserId]        = useState<string | null>(null)
  const [currency,      setCurrency]      = useState('CRC')
  const [ready,         setReady]         = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [bookings,      setBookings]      = useState<Booking[]>([])
  const [fields,        setFields]        = useState<Field[]>([])
  const [kpis,          setKpis]          = useState<any>(null)
  const [charts,        setCharts]        = useState<any>(null)
  const [expanded,      setExpanded]      = useState<string | null>(null)
  const [mobileMenuOpen,setMobileMenuOpen]= useState(false)

  const [from,    setFrom]    = useState<Date>(() => { const d = new Date(); d.setDate(1); return d })
  const [to,      setTo]      = useState<Date>(new Date())
  const [openCal, setOpenCal] = useState<'from' | 'to' | null>(null)
  const calRef = useRef<HTMLDivElement>(null)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3200)
  }, [])

  const fMoney      = useCallback((v: number) => formatMoney(v, currency),      [currency])
  const fMoneyShort = useCallback((v: number) => formatMoneyShort(v, currency),  [currency])
  const usdInLocal  = USD_RATES[currency] ?? 515

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const uid = data.session.user.id
      setUserId(uid)
      const { data: p } = await supabase.from('profiles').select('currency').eq('id', uid).single()
      if (p?.currency) setCurrency(p.currency)
      setReady(true)
    })
  }, [router])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setOpenCal(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!ready || !userId) return
    setLoading(true)

    const { data: ownerFields, error: fieldsError } = await supabase
      .from('fields')
      .select('id, name, price_day, price_night, sport, active')
      .eq('owner_id', userId)
      .order('name')

    if (fieldsError) {
      showToast(`Error al cargar canchas: ${fieldsError.message}`, false)
      setLoading(false)
      return
    }

    const fieldList = ownerFields ?? []
    if (fieldList.length) setFields(fieldList)
    const fieldIds  = fieldList.map(f => f.id)
    const fieldsMap = new Map<number, Field>(fieldList.map(f => [f.id, f as Field]))

    const { data: bData, error: bErr } = await supabase
      .from('bookings')
      .select('id, date, hour, status, customer_name, customer_last_name, customer_email, price, field_id')
      .in('field_id', fieldIds.length ? fieldIds : [-1])
      .gte('date', fISO(from))
      .lte('date', fISO(to))
      .order('date', { ascending: false })

    if (bErr) { showToast(`Error: ${bErr.message}`, false); setLoading(false); return }

    const all: Booking[] = (bData || []).map((b: any, i: number) => ({
      id: b.id ?? i, date: b.date, hour: b.hour ?? '',
      status: (b.status ?? 'confirmed') as BookingStatus,
      customer_name: b.customer_name, customer_last_name: b.customer_last_name,
      customer_email: b.customer_email,
      price: b.price ? Number(b.price) : undefined,
      fields: fieldsMap.get(b.field_id) ?? null,
    }))

    const days   = Math.ceil((to.getTime() - from.getTime()) / 86400000)
    const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1)
    const prevFm = new Date(prevTo); prevFm.setDate(prevFm.getDate() - days)

    const { data: prevRaw } = await supabase
      .from('bookings')
      .select('status, field_id, price')
      .in('field_id', fieldIds.length ? fieldIds : [-1])
      .gte('date', fISO(prevFm)).lte('date', fISO(prevTo))

    const prevData = (prevRaw || []).map((b: any) => ({
      ...b, fields: fieldsMap.get(b.field_id) ?? null,
    }))

    setBookings(all)
    buildKPIs(all, prevData, from, to, fieldList)
    buildCharts(all, from, to)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, from, to])

  useEffect(() => { load() }, [load])

  // ── KPI builder ─────────────────────────────────────────────────────────────
  function buildKPIs(data: Booking[], prev: any[], rangeFrom: Date, rangeTo: Date, fieldList: Field[]) {
    const active  = data.filter(b => b.status !== 'cancelled')
    const today   = active.filter(b => b.date === todayS())
    const pending = data.filter(b => b.status === 'pending')

    const grossRev   = active.reduce((s, b) => s + (b.price ?? nField(b.fields)?.price_day ?? 0), 0)
    const commission = active.length * usdInLocal
    const netRev     = Math.max(0, grossRev - commission)

    const prevAct = prev.filter((b: any) => b.status !== 'cancelled')
    const prevRev = prevAct.reduce((s: number, b: any) => s + (b.price ?? 0), 0)
    const prevNet = Math.max(0, prevRev - prevAct.length * usdInLocal)

    const periodDays   = Math.ceil((rangeTo.getTime() - rangeFrom.getTime()) / 86400000) + 1
    const activeFields = fieldList.filter(isFieldActive)
    const totalSlots   = activeFields.length * DEFAULT_HOURS_PER_DAY * periodDays
    const occupancyPct = totalSlots > 0 ? Math.min(100, Math.round((active.length / totalSlots) * 100)) : 0

    const hourMap: Record<string, number> = {}
    active.forEach(b => { if (b.hour) hourMap[b.hour] = (hourMap[b.hour] || 0) + 1 })
    const peakEntry = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0]

    const sportMap: Record<string, { count: number; rev: number }> = {}
    active.forEach(b => {
      const s = nField(b.fields)?.sport ?? 'otro'
      if (!sportMap[s]) sportMap[s] = { count: 0, rev: 0 }
      sportMap[s].count++
      sportMap[s].rev += b.price ?? nField(b.fields)?.price_day ?? 0
    })

    setKpis({
      todayCount: today.length, rangeCount: active.length, pendingCount: pending.length,
      grossRev, commission, netRev, occupancyPct, totalSlots,
      peakHour: peakEntry?.[0] ?? '—', peakCount: peakEntry?.[1] ?? 0,
      sportMap,
      revChange:   pct(grossRev, prevRev),
      netChange:   pct(netRev, prevNet),
      countChange: pct(active.length, prevAct.length),
      avgTicket:   active.length ? grossRev / active.length : 0,
      activeFields: activeFields.length, totalFields: fieldList.length,
      rangeLabel:
        rangeFrom.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) +
        ' — ' + rangeTo.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }),
    })
  }

  function buildCharts(data: Booking[], rangeFrom: Date, rangeTo: Date) {
    const active = data.filter(b => b.status !== 'cancelled')
    const days: string[] = []
    const cur = new Date(rangeFrom), end = new Date(rangeTo)
    while (cur <= end) { days.push(fISO(cur)); cur.setDate(cur.getDate() + 1) }
    const displayDays = days.slice(-60)
    const dayCount    = displayDays.map(d => active.filter(b => b.date === d).length)
    const dayRev      = displayDays.map(d =>
      active.filter(b => b.date === d).reduce((s, b) => s + (b.price ?? nField(b.fields)?.price_day ?? 0), 0)
    )
    const byField: Record<string, number> = {}
    active.forEach(b => { const n = nField(b.fields)?.name ?? 'Otra'; byField[n] = (byField[n] || 0) + 1 })
    const sortedFields = Object.entries(byField).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const byHour: Record<string, number> = {}
    active.forEach(b => { if (b.hour) byHour[b.hour] = (byHour[b.hour] || 0) + 1 })
    setCharts({ displayDays, dayCount, dayRev, sortedFields, byHour })
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportXLSX = useCallback(() => {
    const rows = bookings.map(b => ({
      ID:      b.id,
      Cliente: b.customer_name ? `${b.customer_name} ${b.customer_last_name ?? ''}`.trim() : '—',
      Email:   b.customer_email ?? '—',
      Cancha:  nField(b.fields)?.name ?? '—',
      Deporte: getSportLabel(nField(b.fields)?.sport),
      Fecha:   b.date, Hora: b.hour, Estado: b.status,
      Precio:  b.price ?? nField(b.fields)?.price_day ?? 0,
      Comisión: usdInLocal,
      Neto:    (b.price ?? nField(b.fields)?.price_day ?? 0) - usdInLocal,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas')
    XLSX.writeFile(wb, `golplay_${fISO(new Date())}.xlsx`)
    showToast('Exportado correctamente')
  }, [bookings, usdInLocal, showToast])

  // ── Presets ─────────────────────────────────────────────────────────────────
  const setPreset = (p: 'today' | 'week' | 'month' | 'prev') => {
    const t = new Date()
    if (p === 'today') { setFrom(new Date(t)); setTo(new Date(t)) }
    if (p === 'week')  { const d = new Date(t); d.setDate(d.getDate() - 6); setFrom(d); setTo(new Date(t)) }
    if (p === 'month') { setFrom(new Date(t.getFullYear(), t.getMonth(), 1)); setTo(new Date(t)) }
    if (p === 'prev')  {
      setFrom(new Date(t.getFullYear(), t.getMonth() - 1, 1))
      setTo(new Date(t.getFullYear(), t.getMonth(), 0))
    }
  }

  if (!ready) return null

  const currSymbol   = LATAM_COUNTRIES.find(c => c.currency === currency)?.symbol ?? '₡'
  const recentBk     = bookings.slice(0, 8)
  const sportEntries = kpis?.sportMap
    ? Object.entries(kpis.sportMap as Record<string, { count: number; rev: number }>)
        .sort((a: any, b: any) => b[1].count - a[1].count).slice(0, 5)
    : []

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className={`gp-toast ${toast.ok ? 'gp-toast--ok' : 'gp-toast--err'}`}>
          <span className="gp-toast__icon">{toast.ok ? '✓' : '✗'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <div className="gp-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="gp-drawer" onClick={e => e.stopPropagation()}>
            <div className="gp-drawer__head">
              <img src="/logo-golplay1.svg" alt="GolPlay" className="gp-drawer__logo"
                onError={e => { (e.target as HTMLImageElement).style.display='none' }}
              />
              <button className="gp-drawer__close" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú">
                <IcoX/>
              </button>
            </div>
            <nav className="gp-drawer__nav">
              {[
                { icon: <IcoChart/>, label: 'Dashboard', href: '/admin',          active: true },
                { icon: <IcoGrid/>,  label: 'Reservas',  href: '/admin/bookings', active: false },
                { icon: <IcoBall/>,  label: 'Canchas',   href: '/admin/fields',   active: false },
              ].map(item => (
                <button
                  key={item.label}
                  className={`gp-drawer__item${item.active ? ' gp-drawer__item--active' : ''}`}
                  onClick={() => { router.push(item.href); setMobileMenuOpen(false) }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <button className="gp-drawer__export" onClick={() => { exportXLSX(); setMobileMenuOpen(false) }}>
              <IcoExport/>
              Exportar XLSX
            </button>
          </div>
        </div>
      )}

      <div className="gp">

        {/* ══════════════════════ TOPBAR ══════════════════════ */}
        <header className="gp-top">
          <div className="gp-top__left">
            <button className="gp-burger" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú">
              <IcoMenu/>
            </button>
            <a href="/admin" className="gp-top__logo" aria-label="GolPlay Dashboard">
              <img src="/logo-golplay1.svg" alt="GolPlay" className="gp-logo-img"
                onError={e => { (e.target as HTMLImageElement).style.display='none' }}
              />
            </a>
            <div className="gp-top__divider"/>
            <span className="gp-top__breadcrumb">
              <span className="gp-top__breadcrumb-sep">Admin</span>
              <span className="gp-top__breadcrumb-ico">›</span>
              <span className="gp-top__breadcrumb-cur">Dashboard</span>
            </span>
          </div>

          {/* ── Date range controls ── */}
          <div className="gp-top__center" ref={calRef}>
            <div className="gp-presets" role="group" aria-label="Período rápido">
              {(['today','week','month','prev'] as const).map(p => (
                <button
                  key={p}
                  className="gp-preset"
                  onClick={() => setPreset(p)}
                >
                  {p === 'today' ? 'Hoy' : p === 'week' ? '7 días' : p === 'month' ? 'Este mes' : 'Mes ant.'}
                </button>
              ))}
            </div>

            <div className="gp-rangepicker">
              <button
                className="gp-rangepicker__btn"
                onClick={() => setOpenCal(openCal === 'from' ? null : 'from')}
                aria-label="Fecha inicio"
              >
                <IcoCal/>
                <span>{from.toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'2-digit' })}</span>
              </button>
              <span className="gp-rangepicker__sep">–</span>
              <button
                className="gp-rangepicker__btn"
                onClick={() => setOpenCal(openCal === 'to' ? null : 'to')}
                aria-label="Fecha fin"
              >
                <IcoCal/>
                <span>{to.toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'2-digit' })}</span>
              </button>
              {openCal && (
                <div className="gp-calpop">
                  <MiniCal
                    value={openCal === 'from' ? from : to}
                    onSelect={d => { openCal === 'from' ? setFrom(d) : setTo(d); setOpenCal(null) }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="gp-top__right">
            <button className="gp-topbtn" onClick={() => router.push('/admin/bookings')}>
              <IcoGrid/><span>Reservas</span>
            </button>
            <button className="gp-topbtn" onClick={() => router.push('/admin/fields')}>
              <IcoBall/><span>Canchas</span>
            </button>
            <button className="gp-topbtn gp-topbtn--accent" onClick={exportXLSX}>
              <IcoExport/><span>Exportar</span>
            </button>
          </div>
        </header>

        {/* ══════════════════════ PAGE HEADER ══════════════════════ */}
        <div className="gp-phead">
          <div>
            <h1 className="gp-phead__title">Resumen general</h1>
            <p className="gp-phead__sub">
              {loading
                ? 'Cargando datos…'
                : `${kpis?.rangeLabel ?? ''} · ${bookings.filter(b => b.status !== 'cancelled').length} reservas activas`
              }
            </p>
          </div>
          {!loading && kpis?.pendingCount > 0 && (
            <button
              className="gp-phead__alert"
              onClick={() => router.push('/admin/bookings?status=pending')}
            >
              <span className="gp-phead__alert-dot"/>
              {kpis.pendingCount} pendiente{kpis.pendingCount > 1 ? 's' : ''} · Revisar →
            </button>
          )}
        </div>

        {/* ══════════════════════ KPI STRIP ══════════════════════ */}
        <section className="gp-kpis">

          <KpiCard id="today" loading={loading} expanded={expanded} onExpand={setExpanded}
            accent="#3b82f6"
            label="Reservas hoy"
            value={kpis?.todayCount ?? 0}
            trend={kpis?.countChange} trendLabel="vs período ant."
            status={kpis?.pendingCount > 0 ? 'warn' : 'ok'}
            statusText={kpis?.pendingCount > 0 ? `${kpis.pendingCount} pendientes` : 'Al día'}
            icon={<IcoCal/>}
            detail={
              <>
                <KpiRow label="Total período"  value={`${kpis?.rangeCount ?? 0} reservas`}/>
                <KpiRow label="Pendientes"      value={kpis?.pendingCount ?? 0} highlight={kpis?.pendingCount > 0 ? 'warn' : 'ok'}/>
                <KpiRow label="Hora pico"       value={`${kpis?.peakHour ?? '—'} (${kpis?.peakCount ?? 0} res.)`}/>
                <button className="gp-kpi__link" onClick={() => router.push('/admin/bookings?status=pending')}>
                  Ver reservas pendientes →
                </button>
              </>
            }
          />

          <KpiCard id="gross" loading={loading} expanded={expanded} onExpand={setExpanded}
            accent="#10b981"
            label="Ingresos brutos"
            value={kpis ? fMoneyShort(kpis.grossRev) : `${currSymbol}0`}
            trend={kpis?.revChange} trendLabel="vs período ant."
            statusText={kpis ? `Ticket prom. ${fMoney(kpis.avgTicket)}` : '—'}
            icon={<IcoMoney/>}
            detail={
              <>
                <KpiRow label="Total bruto"      value={kpis ? fMoney(kpis.grossRev) : '—'}/>
                <KpiRow label="Ticket promedio"  value={kpis ? fMoney(kpis.avgTicket) : '—'}/>
                {charts && (
                  <div className="gp-minichart">
                    <Line data={miniLineData(charts.displayDays, charts.dayRev, '#10b981')} options={miniLineOpts}/>
                  </div>
                )}
              </>
            }
          />

          <KpiCard id="net" loading={loading} expanded={expanded} onExpand={setExpanded}
            accent="#8b5cf6"
            label="Ingreso neto"
            value={kpis ? fMoneyShort(kpis.netRev) : `${currSymbol}0`}
            trend={kpis?.netChange} trendLabel="vs período ant."
            statusText={kpis ? `Comisión: ${fMoneyShort(kpis.commission)}` : '—'}
            icon={<IcoNet/>}
            detail={
              <>
                <KpiRow label="Ingresos brutos"  value={kpis ? fMoney(kpis.grossRev) : '—'}/>
                <KpiRow label="Comisión GolPlay" value={kpis ? `− ${fMoney(kpis.commission)}` : '—'} highlight="warn"/>
                <KpiRow label="Neto para vos"    value={kpis ? fMoney(kpis.netRev) : '—'}           highlight="ok"/>
                <p className="gp-kpi__note">$1 USD = {fMoney(usdInLocal)} · {kpis?.rangeCount ?? 0} reservas</p>
              </>
            }
          />

          <KpiCard id="occ" loading={loading} expanded={expanded} onExpand={setExpanded}
            accent="#f59e0b"
            label="Ocupación"
            value={`${kpis?.occupancyPct ?? 0}`}
            unit="%"
            statusText={`${kpis?.rangeCount ?? 0} / ${kpis?.totalSlots ?? 0} slots`}
            icon={<IcoOcc/>}
            detail={
              <>
                <div className="gp-occbar">
                  <div className="gp-occbar__fill" style={{ width: `${kpis?.occupancyPct ?? 0}%` }}/>
                </div>
                <KpiRow label="Canchas activas"  value={`${kpis?.activeFields ?? 0} de ${kpis?.totalFields ?? 0}`}/>
                <KpiRow label="Slots disponibles" value={kpis?.totalSlots ?? 0}/>
                <KpiRow label="Reservas activas"  value={kpis?.rangeCount ?? 0}/>
              </>
            }
          />

          <KpiCard id="sport" loading={loading} expanded={expanded} onExpand={setExpanded}
            accent="#f43f5e"
            label="Top deporte"
            value={sportEntries.length > 0 ? getSportLabel(sportEntries[0]?.[0] as string) : '—'}
            statusText={sportEntries.length > 0 ? `${(sportEntries[0]?.[1] as any)?.count} reservas` : 'Sin datos'}
            icon={<IcoBall/>}
            detail={
              <>
                {sportEntries.map(([sport, data]: any) => {
                  const max = (sportEntries[0]?.[1] as any)?.count ?? 1
                  return (
                    <div key={sport} className="gp-sportrow">
                      <span className="gp-sportrow__ico">{getSportEmoji(sport)}</span>
                      <div className="gp-sportrow__body">
                        <div className="gp-sportrow__top">
                          <span>{getSportLabel(sport)}</span>
                          <span className="gp-sportrow__ct">{data.count}</span>
                        </div>
                        <div className="gp-sportrow__track">
                          <div className="gp-sportrow__fill" style={{ width: `${Math.round(data.count / max * 100)}%` }}/>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {sportEntries.length === 0 && <p className="gp-kpi__note">Sin datos en este período</p>}
              </>
            }
          />

          <KpiCard id="fields" loading={loading} expanded={expanded} onExpand={setExpanded}
            accent="#06b6d4"
            label="Canchas"
            value={`${fields.filter(isFieldActive).length}/${fields.length}`}
            statusText="activas / total"
            icon={<IcoField/>}
            detail={
              <>
                {fields.slice(0, 5).map(f => {
                  const cnt = bookings.filter(b => nField(b.fields)?.id === f.id && b.status !== 'cancelled').length
                  return (
                    <KpiRow
                      key={f.id}
                      label={`${getSportEmoji(f.sport)} ${f.name}`}
                      value={`${cnt} res.`}
                      highlight={isFieldActive(f) ? 'ok' : 'muted'}
                    />
                  )
                })}
                <button className="gp-kpi__link" onClick={() => router.push('/admin/fields')}>
                  Gestionar canchas →
                </button>
              </>
            }
          />

        </section>

        {/* ══════════════════════ MAIN GRID ══════════════════════ */}
        <div className="gp-grid">

          {/* ── LEFT COLUMN ── */}
          <div className="gp-col gp-col--main">

            {/* Tendencia de reservas */}
            <div className="gp-card">
              <div className="gp-card__head">
                <div>
                  <h3 className="gp-card__title">Tendencia de reservas</h3>
                  <p className="gp-card__sub">{kpis?.rangeLabel ?? 'Cargando…'}</p>
                </div>
                <div className="gp-card__legend">
                  <span className="gp-legend-dot"/>
                  <span className="gp-legend-lbl">Reservas / día</span>
                </div>
              </div>
              <div className="gp-chart">
                {loading
                  ? <div className="gp-sk" style={{ height: 200, borderRadius: 8 }}/>
                  : charts && (
                    <Line
                      data={{
                        labels: charts.displayDays.map((d: string) =>
                          new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
                        ),
                        datasets: [{
                          data:               charts.dayCount,
                          borderColor:        '#a3e635',
                          borderWidth:        2,
                          pointRadius:        0,
                          pointHoverRadius:   4,
                          pointHoverBackgroundColor: '#a3e635',
                          pointHoverBorderColor:     '#000',
                          pointHoverBorderWidth:     2,
                          tension:            0.4,
                          fill:               true,
                          backgroundColor:    (ctx: any) => {
                            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200)
                            g.addColorStop(0, 'rgba(163,230,53,0.14)')
                            g.addColorStop(1, 'rgba(163,230,53,0)')
                            return g
                          },
                        }],
                      }}
                      options={mainLineOpts}
                    />
                  )
                }
              </div>
            </div>

            {/* Actividad por hora (heatmap) */}
            <div className="gp-card">
              <div className="gp-card__head">
                <div>
                  <h3 className="gp-card__title">Actividad por hora</h3>
                  <p className="gp-card__sub">Intensidad de reservas en cada franja horaria</p>
                </div>
                <div className="gp-heat-legend">
                  <span>Baja</span>
                  <div className="gp-heat-legend__bar"/>
                  <span>Alta</span>
                </div>
              </div>
              {loading
                ? <div className="gp-sk" style={{ height: 80, margin: '0 20px 20px', borderRadius: 8 }}/>
                : charts && (
                  <div className="gp-heat">
                    {HOURS_RANGE.map(h => {
                      const count = charts.byHour[h] ?? 0
                      const max   = Math.max(...HOURS_RANGE.map(x => charts.byHour[x] ?? 0), 1)
                      const ratio = count / max
                      const alpha = ratio > 0 ? 0.15 + ratio * 0.85 : 0.04
                      const bg    = ratio > 0.75 ? `rgba(239,68,68,${alpha})` :
                                    ratio > 0.45 ? `rgba(251,191,36,${alpha})` :
                                    ratio > 0.1  ? `rgba(163,230,53,${alpha})` :
                                    'rgba(255,255,255,0.04)'
                      const border = ratio > 0.75 ? 'rgba(239,68,68,.4)' :
                                     ratio > 0.45 ? 'rgba(251,191,36,.3)' :
                                     ratio > 0.1  ? 'rgba(163,230,53,.3)' :
                                     'rgba(255,255,255,.06)'
                      return (
                        <div key={h} className="gp-heat__cell" title={`${h} — ${count} reservas`}>
                          <div className="gp-heat__blk" style={{ background: bg, border: `1px solid ${border}` }}/>
                          <span className="gp-heat__lbl">{h.slice(0, 2)}</span>
                          {count > 0 && <span className="gp-heat__n">{count}</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>

            {/* Reservas recientes */}
            <div className="gp-card">
              <div className="gp-card__head">
                <div>
                  <h3 className="gp-card__title">Reservas recientes</h3>
                  <p className="gp-card__sub">
                    {loading ? '…' : `${bookings.length} en el período seleccionado`}
                  </p>
                </div>
                <button className="gp-chip" onClick={() => router.push('/admin/bookings')}>
                  Ver todas →
                </button>
              </div>
              {loading ? (
                <div className="gp-skrows">
                  {[...Array(5)].map((_, i) => <div key={i} className="gp-sk gp-sk--row"/>)}
                </div>
              ) : recentBk.length === 0 ? (
                <EmptyState icon="📭" msg="Sin reservas en este período"/>
              ) : (
                <div className="gp-bklist">
                  {recentBk.map(b => {
                    const field   = nField(b.fields)
                    const isToday = b.date === todayS()
                    const isFut   = b.date > todayS()
                    const name    = b.customer_name
                      ? `${b.customer_name} ${b.customer_last_name ?? ''}`.trim()
                      : `Reserva #${b.id}`
                    return (
                      <div key={b.id} className="gp-bk">
                        <div className="gp-bk__av">{name[0].toUpperCase()}</div>
                        <div className="gp-bk__info">
                          <p className="gp-bk__name">{name}</p>
                          <p className="gp-bk__meta">{field?.name ?? '—'} · {b.hour}</p>
                        </div>
                        <div className="gp-bk__right">
                          <span className={`gp-bk__date${isToday ? ' gp-bk__date--today' : isFut ? ' gp-bk__date--future' : ''}`}>
                            {isToday ? 'Hoy' : new Date(b.date + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                          </span>
                          <StatusBadge status={b.status}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="gp-col gp-col--side">

            {/* Ranking de canchas */}
            <div className="gp-card">
              <div className="gp-card__head">
                <div>
                  <h3 className="gp-card__title">Ranking de canchas</h3>
                  <p className="gp-card__sub">Por número de reservas</p>
                </div>
              </div>
              {loading
                ? <div className="gp-sk" style={{ height: 160, margin: '0 20px 20px', borderRadius: 8 }}/>
                : charts?.sortedFields?.length > 0 ? (
                  <div className="gp-ranking">
                    {charts.sortedFields.map(([name, count]: [string, number], i: number) => {
                      const max   = charts.sortedFields[0]?.[1] ?? 1
                      const pctW  = Math.round((count / max) * 100)
                      const sport = fields.find(f => f.name === name)?.sport
                      return (
                        <div key={name} className="gp-rank">
                          <div className="gp-rank__num">{i + 1}</div>
                          <div className="gp-rank__body">
                            <div className="gp-rank__head">
                              <span className="gp-rank__ico">{getSportEmoji(sport)}</span>
                              <span className="gp-rank__name">{name}</span>
                              <span className="gp-rank__count">{count}</span>
                            </div>
                            <div className="gp-rank__track">
                              <div
                                className="gp-rank__fill"
                                style={{ '--w': pctW + '%', animationDelay: `${i * 60}ms` } as any}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyState icon="📊" msg="Sin datos en este período"/>
              }
            </div>

            {/* Estado de canchas */}
            <div className="gp-card">
              <div className="gp-card__head">
                <div>
                  <h3 className="gp-card__title">Estado de canchas</h3>
                  <p className="gp-card__sub">
                    {fields.filter(isFieldActive).length} activas · {fields.length} total
                  </p>
                </div>
                <button className="gp-chip" onClick={() => router.push('/admin/fields')}>
                  Gestionar →
                </button>
              </div>
              {loading ? (
                <div className="gp-skrows">
                  {[...Array(3)].map((_, i) => <div key={i} className="gp-sk gp-sk--row"/>)}
                </div>
              ) : fields.length === 0 ? (
                <EmptyState icon="⚽" msg="Sin canchas registradas"/>
              ) : (
                <div className="gp-flist">
                  {fields.map(f => {
                    const cnt     = bookings.filter(b => nField(b.fields)?.id === f.id && b.status !== 'cancelled').length
                    const todayCt = bookings.filter(b => nField(b.fields)?.id === f.id && b.date === todayS() && b.status !== 'cancelled').length
                    const active  = isFieldActive(f)
                    return (
                      <div key={f.id} className={`gp-field${!active ? ' gp-field--off' : ''}`}>
                        <div className="gp-field__left">
                          <span className="gp-field__ico">{getSportEmoji(f.sport)}</span>
                          <div>
                            <p className="gp-field__name">{f.name}</p>
                            <p className="gp-field__meta">{cnt} reservas · {fMoney(f.price_day)}/h</p>
                          </div>
                        </div>
                        <div className="gp-field__right">
                          {todayCt > 0 && <span className="gp-field__today">{todayCt} hoy</span>}
                          <span className={`gp-dot${active ? ' gp-dot--on' : ' gp-dot--off'}`}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  id, loading, expanded, onExpand,
  label, value, unit, trend, trendLabel,
  status, statusText, icon, detail, accent = '#6366f1',
}: {
  id: string; loading: boolean; expanded: string | null; onExpand: (id: string | null) => void
  label: string; value: string | number; unit?: string
  trend?: number; trendLabel?: string
  status?: 'ok' | 'warn'; statusText?: string
  icon: React.ReactNode; detail?: React.ReactNode
  accent?: string
}) {
  const isOpen = expanded === id
  // Derive a soft background from the accent hex
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1,3),16)
    const g = parseInt(hex.slice(3,5),16)
    const b = parseInt(hex.slice(5,7),16)
    return `${r},${g},${b}`
  }
  const rgb = hexToRgb(accent)

  return (
    <div
      className={`gp-kpi${isOpen ? ' gp-kpi--open' : ''}`}
      onClick={() => !loading && onExpand(isOpen ? null : id)}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !loading && onExpand(isOpen ? null : id) } }}
      style={isOpen ? { background: `rgba(${rgb},.05)`, borderColor: `rgba(${rgb},.25)` } : {}}
    >
      <div className="gp-kpi__accent" style={{ background: accent }} aria-hidden="true"/>

      {loading ? (
        <div className="gp-kpi__skel">
          <div className="gp-sk gp-sk--sm" style={{ width: 70,  marginBottom: 12 }}/>
          <div className="gp-sk gp-sk--sm" style={{ width: 120, height: 32, marginBottom: 8 }}/>
          <div className="gp-sk gp-sk--sm" style={{ width: 90 }}/>
        </div>
      ) : (
        <>
          <div className="gp-kpi__body">
            <div className="gp-kpi__top">
              <span className="gp-kpi__label">{label}</span>
              <div className="gp-kpi__icon" style={{ background: `rgba(${rgb},.12)`, border: `1px solid rgba(${rgb},.2)`, color: accent }} aria-hidden="true">
                {icon}
              </div>
            </div>

            <div className="gp-kpi__value" style={{ color: accent }}>
              {value}
              {unit && <span className="gp-kpi__unit">{unit}</span>}
            </div>

            <div className="gp-kpi__foot">
              {statusText && (
                <span className={`gp-kpi__status${status === 'warn' ? ' gp-kpi__status--warn' : status === 'ok' ? ' gp-kpi__status--ok' : ''}`}>
                  {statusText}
                </span>
              )}
              {trend !== undefined && (
                <span className={`gp-kpi__trend${trend >= 0 ? ' gp-kpi__trend--up' : ' gp-kpi__trend--dn'}`}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
              )}
            </div>
          </div>

          <div className="gp-kpi__toggle" aria-hidden="true">{isOpen ? '▲' : '▼'}</div>

          {isOpen && detail && (
            <div className="gp-kpi__detail" onClick={e => e.stopPropagation()}>
              {detail}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── KpiRow ───────────────────────────────────────────────────────────────────

function KpiRow({ label, value, highlight }: { label: string; value: any; highlight?: 'ok' | 'warn' | 'muted' }) {
  return (
    <div className="gp-krow">
      <span className="gp-krow__label">{label}</span>
      <span className={`gp-krow__value${highlight ? ` gp-krow__value--${highlight}` : ''}`}>{value}</span>
    </div>
  )
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

function miniLineData(labels: string[], data: number[], color: string) {
  return {
    labels: labels.map((d: string) =>
      new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
    ),
    datasets: [{
      data, borderColor: color, borderWidth: 1.5,
      pointRadius: 0, tension: 0.4, fill: true,
      backgroundColor: 'rgba(163,230,53,0.08)',
    }],
  }
}

const miniLineOpts: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
  scales: { x: { display: false }, y: { display: false } },
}

const mainLineOpts: ChartOptions<'line'> = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,.9)',
      titleColor:      '#555',
      bodyColor:       '#e5e5e5',
      padding:         12, cornerRadius: 8,
      borderColor:     'rgba(255,255,255,.08)', borderWidth: 1,
      callbacks: { label: ctx => ` ${ctx.parsed.y} reservas` },
    },
    datalabels: { display: false },
  },
  scales: {
    x: {
      grid:   { display: false },
      ticks:  { color: '#444', font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 },
      border: { display: false },
    },
    y: { display: false },
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Confirmada', cls: 'ok'   },
    confirmed: { label: 'Confirmada', cls: 'ok'   },
    pending:   { label: 'Pendiente',  cls: 'warn' },
    cancelled: { label: 'Cancelada',  cls: 'err'  },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'ok' }
  return <span className={`gp-badge gp-badge--${cls}`}>{label}</span>
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="gp-empty">
      <span>{icon}</span>
      <p>{msg}</p>
    </div>
  )
}

function MiniCal({ value, onSelect }: { value: Date; onSelect: (d: Date) => void }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1))
  const y = view.getFullYear(), m = view.getMonth()
  const first = new Date(y, m, 1).getDay()
  const days  = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const now   = new Date()
  const MON   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const DOW   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']

  return (
    <div className="gp-cal">
      <div className="gp-cal__nav">
        <button onClick={() => setView(new Date(y, m - 1, 1))} aria-label="Mes anterior">‹</button>
        <span>{MON[m]} {y}</span>
        <button onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Mes siguiente">›</button>
      </div>
      <div className="gp-cal__grid">
        {DOW.map(d => <div key={d} className="gp-cal__dow">{d}</div>)}
        {cells.map((c, i) => {
          if (!c) return <div key={`e${i}`}/>
          const d   = new Date(y, m, c)
          const sel = d.toDateString() === value.toDateString()
          const tod = d.toDateString() === now.toDateString()
          return (
            <button
              key={c}
              className={`gp-cal__day${sel ? ' gp-cal__day--sel' : ''}${tod ? ' gp-cal__day--tod' : ''}`}
              onClick={() => onSelect(d)}
              aria-label={d.toLocaleDateString('es-CR')}
              aria-pressed={sel}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoCal    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
const IcoExport = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
const IcoGrid   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
const IcoField  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
const IcoMoney  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
const IcoBall   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>
const IcoNet    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
const IcoOcc    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
const IcoChart  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const IcoMenu   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
const IcoX      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap');

/* ── Reset & base ─────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }

.gp {
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
  color: #111827;
  position: relative;
  z-index: 1;
  background: #f5f7fa;
  padding-bottom: 60px;
}

/* ── Topbar ───────────────────────────────────────────────────────────────── */
.gp-top {
  position: sticky; top: 0; z-index: 100;
  height: 58px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; gap: 16px;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid #e8edf3;
  box-shadow: 0 1px 0 rgba(0,0,0,.04);
}

/* Left */
.gp-top__left {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.gp-top__logo {
  display: flex; align-items: center;
  text-decoration: none;
}
.gp-logo-img { height: 36px; width: auto; display: block; }
.gp-top__divider {
  width: 1px; height: 20px;
  background: #e2e8f0; flex-shrink: 0;
}

/* Breadcrumb */
.gp-top__breadcrumb { display: flex; align-items: center; gap: 5px; }
.gp-top__breadcrumb-sep { font-size: 11px; color: #9ca3af; font-weight: 500; }
.gp-top__breadcrumb-ico { font-size: 11px; color: #d1d5db; }
.gp-top__breadcrumb-cur { font-size: 11px; color: #374151; font-weight: 600; }

/* Center */
.gp-top__center {
  display: flex; align-items: center; gap: 8px;
  flex: 1; justify-content: center;
}
.gp-presets { display: flex; gap: 2px; }
.gp-preset {
  padding: 5px 11px; border-radius: 7px;
  font-family: inherit; font-size: 11px; font-weight: 500;
  color: #6b7280; cursor: pointer;
  background: transparent; border: 1px solid transparent;
  transition: all .15s;
}
.gp-preset:hover {
  color: #111827; background: #f3f4f6; border-color: #e5e7eb;
}

/* Range picker */
.gp-rangepicker {
  display: flex; align-items: center; gap: 2px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px; padding: 0 2px;
  position: relative;
}
.gp-rangepicker__btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 9px; border-radius: 6px;
  background: none; border: none; cursor: pointer;
  font-family: inherit; font-size: 11px; font-weight: 500;
  color: #4b5563; transition: all .15s;
}
.gp-rangepicker__btn:hover { color: #111827; background: #f3f4f6; }
.gp-rangepicker__sep { font-size: 10px; color: #d1d5db; }
.gp-calpop {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 500;
  animation: gpPop .15s ease;
}

/* Right */
.gp-top__right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.gp-topbtn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: 8px;
  font-family: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all .15s;
  border: 1px solid #e5e7eb;
  background: #fff; color: #374151;
  box-shadow: 0 1px 2px rgba(0,0,0,.05);
}
.gp-topbtn:hover { background: #f9fafb; border-color: #d1d5db; color: #111827; }
.gp-topbtn--accent {
  background: #111827; color: #fff; border-color: #111827;
}
.gp-topbtn--accent:hover { background: #1f2937; border-color: #1f2937; }

/* Burger — mobile only */
.gp-burger {
  display: none; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  background: #f9fafb; border: 1px solid #e5e7eb;
  color: #374151; cursor: pointer; transition: all .15s;
}
.gp-burger:hover { background: #f3f4f6; color: #111827; }

/* ── Mobile Drawer ────────────────────────────────────────────────────────── */
.gp-drawer-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,.4);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  animation: gpFadeIn .2s ease;
}
.gp-drawer {
  position: absolute; top: 0; left: 0; bottom: 0; width: 272px;
  background: #fff; border-right: 1px solid #e5e7eb;
  display: flex; flex-direction: column;
  animation: gpSlideIn .2s ease;
  padding-bottom: 20px;
  box-shadow: 4px 0 24px rgba(0,0,0,.08);
}
.gp-drawer__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #f3f4f6;
}
.gp-drawer__logo { height: 32px; width: auto; }
.gp-drawer__close {
  width: 32px; height: 32px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: #f9fafb; border: none;
  cursor: pointer; color: #6b7280; transition: all .15s;
}
.gp-drawer__close:hover { background: #f3f4f6; color: #111827; }
.gp-drawer__nav { display: flex; flex-direction: column; gap: 3px; padding: 14px 10px; flex: 1; }
.gp-drawer__item {
  display: flex; align-items: center; gap: 11px;
  padding: 11px 12px; border-radius: 8px;
  font-family: inherit; font-size: 14px; font-weight: 500;
  color: #6b7280; background: none; border: none;
  cursor: pointer; text-align: left; transition: all .15s;
}
.gp-drawer__item:hover { background: #f9fafb; color: #111827; }
.gp-drawer__item--active { background: #eff6ff; color: #3b82f6; font-weight: 600; }
.gp-drawer__export {
  display: flex; align-items: center; gap: 9px;
  margin: 0 10px; padding: 11px 14px; border-radius: 8px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  background: #111827; color: #fff;
  border: none; cursor: pointer; transition: all .15s;
}
.gp-drawer__export:hover { background: #1f2937; }

/* ── Page header ──────────────────────────────────────────────────────────── */
.gp-phead {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
  padding: 24px 20px 0;
}
.gp-phead__title {
  font-size: 20px; font-weight: 700; color: #111827;
  letter-spacing: -.4px; margin: 0;
}
.gp-phead__sub { font-size: 12px; color: #9ca3af; margin: 3px 0 0; }
.gp-phead__alert {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 14px; border-radius: 8px;
  background: #fffbeb; border: 1px solid #fde68a;
  color: #92400e; font-family: inherit; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.gp-phead__alert:hover { background: #fef3c7; }
.gp-phead__alert-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #f59e0b; flex-shrink: 0;
  animation: gpPulse 2s ease-in-out infinite;
}

/* ── KPI Grid ─────────────────────────────────────────────────────────────── */
.gp-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin: 20px 20px 0;
}
.gp-kpi {
  position: relative;
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 16px;
  padding: 20px 18px 16px;
  cursor: pointer;
  transition: all .2s;
  overflow: hidden;
  outline: none;
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.03);
}
.gp-kpi:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
  transform: translateY(-2px);
  border-color: #d1d9e6;
}
.gp-kpi--open {
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
  transform: translateY(-2px);
}
.gp-kpi:focus-visible { box-shadow: 0 0 0 3px rgba(59,130,246,.35); }

/* Accent bar — top left corner strip */
.gp-kpi__accent {
  position: absolute; top: 0; left: 0; width: 4px; bottom: 0;
  border-radius: 16px 0 0 16px;
}

.gp-kpi__body  { display: flex; flex-direction: column; gap: 2px; }
.gp-kpi__top   { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.gp-kpi__label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: #9ca3af;
}
.gp-kpi__icon {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: transform .2s;
}
.gp-kpi:hover .gp-kpi__icon { transform: scale(1.1); }

.gp-kpi__value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 26px; font-weight: 700;
  line-height: 1; letter-spacing: -.5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gp-kpi__unit { font-size: 16px; font-weight: 600; opacity: .6; margin-left: 1px; }
.gp-kpi__foot { display: flex; align-items: center; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
.gp-kpi__status { font-size: 10px; color: #6b7280; }
.gp-kpi__status--ok   { color: #059669; }
.gp-kpi__status--warn { color: #d97706; }
.gp-kpi__trend {
  font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 999px;
  font-family: 'Geist Mono', monospace; letter-spacing: .02em;
}
.gp-kpi__trend--up { background: #d1fae5; color: #065f46; }
.gp-kpi__trend--dn { background: #fee2e2; color: #991b1b; }
.gp-kpi__toggle {
  font-size: 7px; color: #d1d5db;
  position: absolute; bottom: 10px; right: 12px;
}

/* KPI expanded detail */
.gp-kpi__detail {
  margin-top: 14px; padding-top: 14px;
  border-top: 1px solid #f3f4f6;
  display: flex; flex-direction: column; gap: 8px;
  animation: gpExpand .18s ease;
}
.gp-kpi__note {
  font-size: 10px; color: #9ca3af; line-height: 1.5; margin: 0;
}
.gp-kpi__link {
  font-size: 11px; font-weight: 600; color: #3b82f6;
  background: none; border: none; cursor: pointer; font-family: inherit;
  padding: 0; text-align: left; margin-top: 2px; transition: opacity .15s;
}
.gp-kpi__link:hover { opacity: .7; }
.gp-kpi__skel { display: flex; flex-direction: column; gap: 8px; }

/* KPI rows inside detail */
.gp-krow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.gp-krow__label { font-size: 11px; color: #9ca3af; flex-shrink: 0; }
.gp-krow__value { font-size: 11px; font-weight: 600; color: #374151; text-align: right; }
.gp-krow__value--ok    { color: #059669; }
.gp-krow__value--warn  { color: #d97706; }
.gp-krow__value--muted { color: #d1d5db; }

/* Occupancy bar */
.gp-occbar { height: 5px; background: #f3f4f6; border-radius: 99px; overflow: hidden; margin-bottom: 4px; }
.gp-occbar__fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 99px; transition: width .7s ease; }

/* Mini chart */
.gp-minichart { height: 48px; margin-top: 6px; }

/* Sport rows */
.gp-sportrow { display: flex; align-items: center; gap: 8px; }
.gp-sportrow__ico { font-size: 13px; flex-shrink: 0; }
.gp-sportrow__body { flex: 1; }
.gp-sportrow__top { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #6b7280; }
.gp-sportrow__ct { font-weight: 700; color: #111827; }
.gp-sportrow__track { height: 3px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
.gp-sportrow__fill { height: 100%; background: linear-gradient(90deg, #f43f5e, #e11d48); border-radius: 99px; transition: width .5s ease; }

/* ── Main grid ────────────────────────────────────────────────────────────── */
.gp-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
  padding: 16px 20px 0;
}
.gp-col { display: flex; flex-direction: column; gap: 16px; }

/* ── Cards ────────────────────────────────────────────────────────────────── */
.gp-card {
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
  transition: box-shadow .2s, border-color .2s;
}
.gp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.07); border-color: #d1d9e6; }
.gp-card__head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 20px 12px; gap: 10px;
}
.gp-card__title { font-size: 13px; font-weight: 600; color: #111827; margin: 0; }
.gp-card__sub   { font-size: 11px; color: #9ca3af; margin: 2px 0 0; }

/* Legend */
.gp-card__legend { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.gp-legend-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}
.gp-legend-lbl { font-size: 10px; color: #9ca3af; }

/* Chip button */
.gp-chip {
  font-size: 11px; font-weight: 500; font-family: inherit; cursor: pointer;
  padding: 5px 11px; border-radius: 7px; color: #6b7280;
  border: 1px solid #e5e7eb; background: #f9fafb;
  transition: all .15s; white-space: nowrap;
}
.gp-chip:hover { background: #f3f4f6; color: #111827; border-color: #d1d5db; }

/* Chart */
.gp-chart { height: 200px; padding: 0 20px 20px; }

/* Heat legend */
.gp-heat-legend { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.gp-heat-legend span { font-size: 9px; color: #9ca3af; }
.gp-heat-legend__bar {
  width: 44px; height: 4px; border-radius: 99px;
  background: linear-gradient(90deg, #dbeafe, #3b82f6, #f59e0b, #ef4444);
}

/* Heatmap */
.gp-heat { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 20px 20px; }
.gp-heat__cell { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 32px; }
.gp-heat__blk  { width: 100%; height: 26px; border-radius: 6px; transition: transform .15s; }
.gp-heat__blk:hover { transform: scaleY(1.15); }
.gp-heat__lbl  { font-size: 8px; color: #9ca3af; font-weight: 500; font-family: 'Geist Mono', monospace; }
.gp-heat__n    { font-size: 8px; color: #374151; font-weight: 700; }

/* Bookings list */
.gp-bklist { display: flex; flex-direction: column; }
.gp-bk {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 20px;
  border-bottom: 1px solid #f9fafb;
  transition: background .1s;
}
.gp-bk:last-child { border-bottom: none; }
.gp-bk:hover { background: #fafbfc; }
.gp-bk__av {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Geist Mono', monospace;
}
.gp-bk__info { flex: 1; min-width: 0; }
.gp-bk__name { font-size: 12px; font-weight: 600; color: #111827; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-bk__meta { font-size: 10px; color: #9ca3af; margin: 1px 0 0; }
.gp-bk__right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.gp-bk__date {
  font-size: 10px; font-weight: 600; color: #9ca3af;
  background: #f3f4f6; padding: 2px 7px; border-radius: 5px;
  font-family: 'Geist Mono', monospace;
}
.gp-bk__date--today  { background: #dcfce7; color: #15803d; }
.gp-bk__date--future { background: #dbeafe; color: #1d4ed8; }

/* Status badge */
.gp-badge {
  font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: .04em; white-space: nowrap;
}
.gp-badge--ok   { background: #dcfce7; color: #15803d; }
.gp-badge--warn { background: #fef9c3; color: #854d0e; }
.gp-badge--err  { background: #fee2e2; color: #991b1b; }

/* Ranking */
.gp-ranking { display: flex; flex-direction: column; gap: 14px; padding: 4px 20px 20px; }
.gp-rank    { display: flex; align-items: center; gap: 10px; }
.gp-rank__num {
  width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
  background: #f9fafb; border: 1px solid #e5e7eb;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #9ca3af;
  font-family: 'Geist Mono', monospace;
}
.gp-rank:first-child .gp-rank__num {
  background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8;
}
.gp-rank__body { flex: 1; min-width: 0; }
.gp-rank__head { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.gp-rank__ico  { font-size: 13px; flex-shrink: 0; }
.gp-rank__name { flex: 1; font-size: 12px; font-weight: 500; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-rank__count { font-size: 12px; font-weight: 700; color: #111827; font-family: 'Geist Mono', monospace; flex-shrink: 0; }
.gp-rank__track { height: 4px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
.gp-rank__fill {
  height: 100%; width: 0; border-radius: 99px;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  animation: gpBar .55s ease forwards;
}

/* Fields list */
.gp-flist { display: flex; flex-direction: column; }
.gp-field {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 20px;
  border-bottom: 1px solid #f9fafb;
  transition: background .1s;
}
.gp-field:last-child { border-bottom: none; }
.gp-field:hover { background: #fafbfc; }
.gp-field--off { opacity: .4; }
.gp-field__left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.gp-field__ico  { font-size: 16px; flex-shrink: 0; }
.gp-field__name { font-size: 12px; font-weight: 600; color: #111827; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-field__meta { font-size: 10px; color: #9ca3af; margin: 1px 0 0; }
.gp-field__right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.gp-field__today { font-size: 10px; font-weight: 600; background: #fef9c3; color: #92400e; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.gp-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.gp-dot--on  { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2); }
.gp-dot--off { background: #e5e7eb; }

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
.gp-sk {
  border-radius: 6px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e9ecef 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: gpShim 1.6s infinite;
}
.gp-sk--sm  { border-radius: 4px; }
.gp-sk--row { height: 44px; border-radius: 10px; }
.gp-skrows  { display: flex; flex-direction: column; gap: 6px; padding: 12px 20px 20px; }

/* ── Empty ────────────────────────────────────────────────────────────────── */
.gp-empty { text-align: center; padding: 32px 16px; }
.gp-empty span { font-size: 32px; display: block; margin-bottom: 8px; }
.gp-empty p    { font-size: 12px; color: #9ca3af; margin: 0; }

/* ── Toast ────────────────────────────────────────────────────────────────── */
.gp-toast {
  position: fixed; bottom: 22px; right: 22px; z-index: 9999;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px; border-radius: 12px;
  font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
  animation: gpPop .2s ease;
}
.gp-toast__icon { font-size: 13px; font-weight: 700; }
.gp-toast--ok  {
  background: #111827; color: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,.25);
}
.gp-toast--err {
  background: #ef4444; color: #fff;
  box-shadow: 0 8px 32px rgba(239,68,68,.3);
}

/* ── Mini Calendar ────────────────────────────────────────────────────────── */
.gp-cal {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 14px; padding: 14px; width: 236px;
  box-shadow: 0 10px 40px rgba(0,0,0,.12);
}
.gp-cal__nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; font-size: 12px; font-weight: 600; color: #111827;
}
.gp-cal__nav button {
  background: none; border: none; cursor: pointer; font-size: 16px;
  color: #9ca3af; padding: 2px 7px; border-radius: 6px; transition: all .12s;
}
.gp-cal__nav button:hover { background: #f3f4f6; color: #111827; }
.gp-cal__grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.gp-cal__dow  {
  text-align: center; font-size: 9px; font-weight: 600;
  color: #d1d5db; padding: 4px 0; text-transform: uppercase;
}
.gp-cal__day {
  aspect-ratio: 1; border: none; background: none; border-radius: 7px;
  font-size: 11px; font-weight: 500; color: #6b7280;
  cursor: pointer; transition: all .1s;
  display: flex; align-items: center; justify-content: center;
}
.gp-cal__day:hover      { background: #f3f4f6; color: #111827; }
.gp-cal__day--tod       { color: #3b82f6; font-weight: 700; }
.gp-cal__day--sel       { background: #111827 !important; color: #fff !important; font-weight: 700; }

/* ── Animations ───────────────────────────────────────────────────────────── */
@keyframes gpPop      { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
@keyframes gpFadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes gpSlideIn  { from { transform:translateX(-100%) } to { transform:none } }
@keyframes gpExpand   { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
@keyframes gpShim     { to { background-position: -200% 0 } }
@keyframes gpBar      { to { width: var(--w) } }
@keyframes gpPulse    { 0%,100% { opacity:1 } 50% { opacity:.35 } }

/* ════════════════════════════════════════════════════════
   RESPONSIVE
════════════════════════════════════════════════════════ */

/* Large tablet */
@media (max-width: 1400px) {
  .gp-kpis { grid-template-columns: repeat(3, 1fr); }
  .gp-kpi__value { font-size: 22px; }
}

/* Tablet */
@media (max-width: 1100px) {
  .gp-grid { grid-template-columns: 1fr; }
}

/* Tablet pequeña */
@media (max-width: 900px) {
  .gp-top__center { display: none; }
  .gp-top__right  { display: none; }
  .gp-burger      { display: flex !important; }

  .gp-kpis { grid-template-columns: repeat(2, 1fr); margin: 14px 14px 0; gap: 10px; }
  .gp-grid  { padding: 12px 14px 0; gap: 10px; }
  .gp-phead { padding: 18px 14px 0; }
  .gp-chart { height: 160px; }
}

/* Mobile */
@media (max-width: 640px) {
  .gp-top { padding: 0 12px; height: 52px; }
  .gp-top__breadcrumb { display: none; }
  .gp-top__divider { display: none; }

  .gp-kpis { grid-template-columns: repeat(2, 1fr); margin: 12px 12px 0; gap: 8px; }
  .gp-kpi  { padding: 14px 14px 12px; }
  .gp-kpi__value { font-size: 20px; }
  .gp-kpi__label { font-size: 9px; }
  .gp-kpi__accent { width: 3px; }

  .gp-grid  { padding: 10px 12px 0; gap: 8px; }
  .gp-phead { padding: 16px 12px 0; }
  .gp-phead__title { font-size: 17px; }

  .gp-card { border-radius: 12px; }
  .gp-card__head { padding: 14px 14px 10px; }
  .gp-chart { height: 140px; padding: 0 14px 14px; }

  .gp-heat { padding: 4px 14px 14px; gap: 3px; }
  .gp-heat__cell { width: 27px; }
  .gp-heat__blk  { height: 22px; }

  .gp-bk        { padding: 10px 14px; }
  .gp-ranking   { padding: 4px 14px 14px; }
  .gp-flist .gp-field { padding: 10px 14px; }
  .gp-skrows    { padding: 10px 14px 14px; }

  .gp-toast { left: 10px; right: 10px; bottom: 12px; }
  .gp-calpop { position: fixed; left: 10px; right: 10px; top: auto; bottom: 14px; }
  .gp-cal { width: 100%; }
}

/* Muy pequeño */
@media (max-width: 380px) {
  .gp-kpi__value { font-size: 17px; }
  .gp-kpis { margin: 10px 10px 0; }
  .gp-grid { padding: 8px 10px 0; }
}
`

