/**
 * GolPlay — Business Model Dashboard
 * Sin Tailwind. Estilos inline puros. Compatible con cualquier Next.js stack.
 * Schema real: bookings(id, field_id, date, hour, price, status='confirmed', created_at)
 *              fields(id, name, sport, price)
 *              profiles(id, currency, country) ← moneda del owner leída de acá
 *
 * Modelo de comisiones v2.0: $1 USD por reserva confirmada, sin límite mensual.
 * El monto se convierte a la moneda del owner según exchange_rates.
 *
 * Dependencias: npm install recharts date-fns lucide-react
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, CalendarCheck,
  Activity, Trophy, Clock, AlertTriangle, Download, RefreshCw, ChevronDown,
} from 'lucide-react'
import {
  format, subDays, eachDayOfInterval,
} from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Constants ────────────────────────────────────────────────────────────────
const FIELD_COLORS = ['#16a34a', '#15803d', '#4ade80', '#86efac', '#bbf7d0']

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: string
  created_at: string
  date: string
  hour: string
  status: string
  field_id: string
  price: number
}

interface Field {
  id: string
  name: string
  sport: string
  // owner_currency se lee de profiles.currency, no de fields
}

// Tasa de cambio: cuántas unidades de moneda local = $1 USD
const USD_RATES: Record<string, number> = {
  CRC: 540, USD: 1, MXN: 17, COP: 3900, PEN: 3.75, CLP: 900, ARS: 1000,
}

const CURRENCY_SYMBOL: Record<string, string> = {
  CRC: '₡', USD: '$', MXN: '$', COP: '$', PEN: 'S/', CLP: '$', ARS: '$',
}

// Comisión fija en USD por reserva confirmada (fuente: platform_settings)
const COMMISSION_USD = 1.00

interface FieldStats {
  id: string
  name: string
  revenue: number
  bookings: number
}

interface DailyRevenue {
  date: string
  label: string
  revenue: number
  bookings: number
}

interface HourStats {
  hour: string
  bookings: number
  revenue: number
}

type DateRange = '7d' | '30d' | '90d'

interface Filters {
  dateRange: DateRange
  fieldId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCRC = (v: number) =>
  `₡${Number(v).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

const formatCRCShort = (v: number) => {
  if (v >= 1_000_000) return `₡${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `₡${(v / 1_000).toFixed(0)}K`
  return formatCRC(v)
}

const getDelta = (current: number, previous: number): number | null => {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

// ─── Hook: fetch data ─────────────────────────────────────────────────────────
function useBookings(filters: Filters) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [prevBookings, setPrevBookings] = useState<Booking[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [ownerCurrencyFromDB, setOwnerCurrencyFromDB] = useState<string>('CRC')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id)
    })
  }, [])

  const getRange = useCallback(() => {
    const now = new Date()
    switch (filters.dateRange) {
      case '7d':  return { from: subDays(now, 7), to: now }
      case '90d': return { from: subDays(now, 90), to: now }
      default:    return { from: subDays(now, 30), to: now }
    }
  }, [filters.dateRange])

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const { from, to } = getRange()
      const spanMs = to.getTime() - from.getTime()
      const prevFrom = new Date(from.getTime() - spanMs)

      let currQ = supabase
        .from('bookings')
        .select('id, created_at, date, hour, price, status, field_id')
        .eq('status', 'confirmed')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())

      let prevQ = supabase
        .from('bookings')
        .select('id, created_at, date, hour, price, status, field_id')
        .eq('status', 'confirmed')
        .gte('created_at', prevFrom.toISOString())
        .lte('created_at', from.toISOString())

      if (filters.fieldId !== 'all') {
        currQ = currQ.eq('field_id', filters.fieldId)
        prevQ = prevQ.eq('field_id', filters.fieldId)
      }

      // ✅ FIX: owner_currency no existe en fields. Se lee de profiles.currency
      // Los fields se scopean al owner con owner_id = userId
      const [curr, prev, fieldsRes, profileRes] = await Promise.all([
        currQ,
        prevQ,
        supabase
          .from('fields')
          .select('id, name, sport')
          .eq('owner_id', userId)   // ✅ scoped al owner logueado
          .eq('active', true),
        supabase
          .from('profiles')
          .select('currency')
          .eq('id', userId)
          .single(),
      ])

      if (curr.error) throw curr.error
      if (prev.error) throw prev.error

      // ✅ FIX: currency viene de profiles, no de fields
      if (profileRes.data?.currency) {
        setOwnerCurrencyFromDB(profileRes.data.currency)
      }

      setBookings(curr.data ?? [])
      setPrevBookings(prev.data ?? [])
      setFields(fieldsRes.data ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [filters, getRange, userId])

  useEffect(() => { if (userId) fetchData() }, [fetchData, userId])

  return { bookings, prevBookings, fields, ownerCurrencyFromDB, loading, error, refetch: fetchData }
}

// ─── Hook: analytics ──────────────────────────────────────────────────────────
function useAnalytics(
  bookings: Booking[],
  prevBookings: Booking[],
  fields: Field[],
  filters: Filters,
  ownerCurrency: string,   // ✅ viene de profiles.currency via el hook useBookings
) {
  return useMemo(() => {
    const totalRevenue = bookings.reduce((s, b) => s + Number(b.price ?? 0), 0)
    const prevRevenue = prevBookings.reduce((s, b) => s + Number(b.price ?? 0), 0)
    const totalCount = bookings.length
    const prevCount = prevBookings.length

    // Field map (join with fields table for name)
    const fieldLookup: Record<string, string> = {}
    fields.forEach(f => { fieldLookup[String(f.id)] = f.name })

    const fieldMap: Record<string, FieldStats> = {}
    bookings.forEach(b => {
      const key = String(b.field_id)
      if (!fieldMap[key]) {
        fieldMap[key] = {
          id: key,
          name: fieldLookup[key] ?? `Cancha ${key}`,
          revenue: 0,
          bookings: 0,
        }
      }
      fieldMap[key].revenue += Number(b.price ?? 0)
      fieldMap[key].bookings += 1
    })
    const fieldStats = Object.values(fieldMap).sort((a, b) => b.revenue - a.revenue)
    const topField = fieldStats[0]?.name ?? '—'

    // ✅ Comisión v2.0 — $1 USD por reserva confirmada, sin límite
    // ownerCurrency viene de profiles.currency (leído en el hook useBookings)
    const usdRate = USD_RATES[ownerCurrency] ?? 540
    const currencySymbol = CURRENCY_SYMBOL[ownerCurrency] ?? '₡'
    const commissionPerBooking = COMMISSION_USD * usdRate  // en moneda local
    const commissionTotal = totalCount * commissionPerBooking
    const commissionTotalUSD = totalCount * COMMISSION_USD

    // Occupancy — basado en horas teóricas disponibles (17 horas * canchas)
    const totalFields = fields.length || 1
    const hoursPerDay = 17 // 06:00 - 22:00
    const daysInRange = filters.dateRange === '7d' ? 7 : filters.dateRange === '90d' ? 90 : 30
    const theoreticalMax = totalFields * hoursPerDay * daysInRange
    const occupancyRate = Math.min((totalCount / Math.max(theoreticalMax, 1)) * 100, 100)
    const prevOccupancy = Math.min((prevCount / Math.max(theoreticalMax, 1)) * 100, 100)

    // Daily revenue
    const days = filters.dateRange === '7d' ? 7 : filters.dateRange === '90d' ? 90 : 30
    const now = new Date()
    const interval = eachDayOfInterval({ start: subDays(now, days - 1), end: now })
    const dailyMap: Record<string, DailyRevenue> = {}
    interval.forEach(d => {
      const key = format(d, 'yyyy-MM-dd')
      dailyMap[key] = {
        date: key,
        label: format(d, days <= 7 ? 'EEE d' : 'd MMM', { locale: es }),
        revenue: 0,
        bookings: 0,
      }
    })
    bookings.forEach(b => {
      const key = (b.date ?? b.created_at)?.slice(0, 10)
      if (key && dailyMap[key]) {
        dailyMap[key].revenue += Number(b.price ?? 0)
        dailyMap[key].bookings += 1
      }
    })
    const dailyRevenue = Object.values(dailyMap)

    // Hourly stats — hour is "HH:00" string
    const hourMap: Record<string, HourStats> = {}
    for (let h = 6; h <= 22; h++) {
      const key = `${String(h).padStart(2, '0')}:00`
      hourMap[key] = { hour: key, bookings: 0, revenue: 0 }
    }
    bookings.forEach(b => {
      if (b.hour && hourMap[b.hour]) {
        hourMap[b.hour].bookings += 1
        hourMap[b.hour].revenue += Number(b.price ?? 0)
      }
    })
    const hourlyStats = Object.values(hourMap)

    // Insights
    const peakHour = hourlyStats.reduce(
      (a, b) => (b.bookings > a.bookings ? b : a),
      hourlyStats[0]
    )
    const deadHours = hourlyStats.filter(h => h.bookings === 0).map(h => h.hour)
    const lowOccupancyFields = fieldStats.filter(f => f.bookings < 3)

    return {
      kpi: { totalRevenue, prevRevenue, totalCount, prevCount, occupancyRate, prevOccupancy, topField },
      fieldStats,
      dailyRevenue,
      hourlyStats,
      commission: { totalCount, commissionTotal, commissionTotalUSD, commissionPerBooking, ownerCurrency, currencySymbol },
      insights: { peakHour, deadHours, lowOccupancyFields },
    }
  }, [bookings, prevBookings, fields, filters, ownerCurrency])
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    background: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  inner: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '32px 20px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  h1: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 0,
  },
  headerActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  btnOutline: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#475569',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    cursor: 'pointer',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 20,
    fontSize: 13,
    color: '#b91c1c',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  pillGroup: {
    display: 'flex',
    background: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  pillActive: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#fff',
    color: '#0f172a',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,.08)',
  },
  pillInactive: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    color: '#64748b',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  selectWrap: { position: 'relative' },
  select: {
    appearance: 'none',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '7px 32px 7px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
  },
  insightBanner: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 14,
    padding: '14px 18px',
    marginBottom: 24,
  },
  insightTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 8,
  },
  insightItem: {
    fontSize: 13,
    color: '#b45309',
    margin: '3px 0',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    background: '#fff',
    border: '1px solid #f1f5f9',
    borderRadius: 16,
    padding: '18px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,.05)',
  },
  kpiTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1,
    margin: 0,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 0,
  },
  card: {
    background: '#fff',
    border: '1px solid #f1f5f9',
    borderRadius: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    overflow: 'hidden',
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '18px 20px 14px',
    borderBottom: '1px solid #f8fafc',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 0,
  },
  cardBody: {
    padding: '16px 20px 20px',
  },
  fieldRow: { marginBottom: 14 },
  fieldRowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  fieldName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldRevenue: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
  },
  progressTrack: {
    height: 6,
    background: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fieldCount: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
    marginBottom: 0,
  },
  commissionNumbers: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  commissionBig: {
    fontSize: 36,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1,
  },
  commissionSuffix: {
    fontSize: 16,
    fontWeight: 400,
    color: '#94a3b8',
  },
  commissionRevenue: {
    fontSize: 18,
    fontWeight: 600,
    color: '#16a34a',
  },
  commissionBar: {
    height: 8,
    background: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  commissionMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
  },
  divider: {
    height: 1,
    background: '#f1f5f9',
    margin: '12px 0',
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#64748b',
    marginBottom: 5,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 16,
  },
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f172a', color: '#fff', borderRadius: 10,
      padding: '8px 14px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,.3)',
    }}>
      <p style={{ color: '#94a3b8', margin: '0 0 4px' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontWeight: 600, margin: 0 }}>
          {p.name === 'revenue' ? formatCRC(p.value) : `${p.value} reservas`}
        </p>
      ))}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  value, sub, delta, icon: Icon, iconBg, iconColor, loading,
}: {
  value: string; sub: string; delta: number | null
  icon: any; iconBg: string; iconColor: string; loading: boolean
}) {
  const isPos = delta !== null && delta >= 0
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiTop}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={iconColor} />
        </div>
        {delta !== null && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600,
            padding: '3px 8px', borderRadius: 999,
            background: isPos ? '#f0fdf4' : '#fef2f2',
            color: isPos ? '#15803d' : '#b91c1c',
          }}>
            {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {loading ? (
        <>
          <div style={{ height: 28, width: '55%', background: '#f1f5f9', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 12, width: '70%', background: '#f1f5f9', borderRadius: 8, marginTop: 8, animation: 'pulse 1.5s infinite' }} />
        </>
      ) : (
        <>
          <p style={S.kpiValue}>{value}</p>
          <p style={S.kpiLabel}>{sub}</p>
        </>
      )}
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SCard({ title, subtitle, badge, children }: {
  title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <div>
          <p style={S.cardTitle}>{title}</p>
          {subtitle && <p style={S.cardSubtitle}>{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div style={S.cardBody}>{children}</div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BusinessModel() {
  const [filters, setFilters] = useState<Filters>({ dateRange: '30d', fieldId: 'all' })
  const [isWide, setIsWide] = useState(true)

  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { bookings, prevBookings, fields, ownerCurrencyFromDB, loading, error, refetch } = useBookings(filters)
  const { kpi, fieldStats, dailyRevenue, hourlyStats, commission, insights } = useAnalytics(
    bookings, prevBookings, fields, filters, ownerCurrencyFromDB,
  )

  const revDelta = getDelta(kpi.totalRevenue, kpi.prevRevenue)
  const bkDelta = getDelta(kpi.totalCount, kpi.prevCount)
  const occDelta = getDelta(kpi.occupancyRate, kpi.prevOccupancy)
  const daysLabel = filters.dateRange === '7d' ? '7 días' : filters.dateRange === '90d' ? '90 días' : '30 días'

  const exportCSV = () => {
    const csv = [
      ['Fecha', 'Ingresos (CRC)', 'Reservas'],
      ...dailyRevenue.map(d => [d.date, d.revenue, d.bookings]),
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `golplay-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const chartRowStyle: React.CSSProperties = isWide
    ? { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }
    : { display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 20 }

  return (
    <AdminLayout>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={S.page}>
        <div style={S.inner}>

          {/* Header */}
          <div style={S.header}>
            <div>
              <h1 style={S.h1}>Modelo de Negocio</h1>
              <p style={S.subtitle}>Análisis de rendimiento · GolPlay</p>
            </div>
            <div style={S.headerActions}>
              <button style={S.btnOutline} onClick={refetch} disabled={loading}>
                <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
                Actualizar
              </button>
              <button style={S.btnOutline} onClick={exportCSV}>
                <Download size={13} />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={S.errorBanner}>
              <AlertTriangle size={15} />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={refetch} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                Reintentar
              </button>
            </div>
          )}

          {/* Filters */}
          <div style={S.filterBar}>
            <div style={S.pillGroup}>
              {(['7d', '30d', '90d'] as DateRange[]).map(r => (
                <button
                  key={r}
                  style={filters.dateRange === r ? S.pillActive : S.pillInactive}
                  onClick={() => setFilters(f => ({ ...f, dateRange: r }))}
                >
                  {r === '7d' ? '7 días' : r === '30d' ? '30 días' : '90 días'}
                </button>
              ))}
            </div>
            {fields.length > 0 && (
              <div style={S.selectWrap}>
                <select
                  style={S.select}
                  value={filters.fieldId}
                  onChange={e => setFilters(f => ({ ...f, fieldId: e.target.value }))}
                >
                  <option value="all">Todas las canchas</option>
                  {fields.map(f => (
                    <option key={f.id} value={String(f.id)}>{f.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            )}
          </div>

          {/* Insights */}
          {!loading && (insights.peakHour?.bookings > 0 || insights.deadHours.length > 0 || insights.lowOccupancyFields.length > 0) && (
            <div style={S.insightBanner}>
              <div style={S.insightTitle}>
                <AlertTriangle size={14} />
                Insights automáticos
              </div>
              {insights.peakHour?.bookings > 0 && (
                <p style={S.insightItem}>📈 Hora pico: {insights.peakHour.hour} con {insights.peakHour.bookings} reservas</p>
              )}
              {insights.deadHours.length > 0 && (
                <p style={S.insightItem}>🌙 Horarios sin reservas: {insights.deadHours.slice(0, 4).join(', ')} — considera descuentos</p>
              )}
              {insights.lowOccupancyFields.length > 0 && (
                <p style={S.insightItem}>⚽ Canchas con baja ocupación: {insights.lowOccupancyFields.map(f => f.name).join(', ')}</p>
              )}
            </div>
          )}

          {/* KPIs */}
          <div style={S.kpiGrid}>
            <KPICard value={formatCRCShort(kpi.totalRevenue)} sub={`vs ${formatCRCShort(kpi.prevRevenue)} período ant.`} delta={revDelta} icon={DollarSign} iconBg="#f0fdf4" iconColor="#16a34a" loading={loading} />
            <KPICard value={String(kpi.totalCount)} sub={`vs ${kpi.prevCount} período ant.`} delta={bkDelta} icon={CalendarCheck} iconBg="#eff6ff" iconColor="#2563eb" loading={loading} />
            <KPICard value={`${kpi.occupancyRate.toFixed(0)}%`} sub={`vs ${kpi.prevOccupancy.toFixed(0)}% período ant.`} delta={occDelta} icon={Activity} iconBg="#fffbeb" iconColor="#d97706" loading={loading} />
            <KPICard value={kpi.topField} sub="Por ingresos generados" delta={null} icon={Trophy} iconBg="#faf5ff" iconColor="#7c3aed" loading={loading} />
          </div>

          {/* Row 1: Ingresos + Field ranking */}
          <div style={chartRowStyle}>
            <SCard title="Ingresos diarios" subtitle={`Últimos ${daysLabel}`}>
              {loading ? (
                <div style={{ height: 220, background: '#f1f5f9', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyRevenue} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={filters.dateRange === '90d' ? 6 : filters.dateRange === '30d' ? 3 : 0} />
                    <YAxis tickFormatter={formatCRCShort} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: '#16a34a' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </SCard>

            <SCard title="Canchas por ingresos" subtitle="Ranking del período">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(i => <div key={i} style={{ height: 44, background: '#f1f5f9', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />)}
                </div>
              ) : fieldStats.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '24px 0', margin: 0 }}>Sin datos en este período</p>
              ) : (
                fieldStats.slice(0, 6).map((f, i) => {
                  const max = fieldStats[0]?.revenue || 1
                  return (
                    <div key={f.id} style={S.fieldRow}>
                      <div style={S.fieldRowTop}>
                        <span style={S.fieldName}>{i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{f.name}</span>
                        <span style={S.fieldRevenue}>{formatCRCShort(f.revenue)}</span>
                      </div>
                      <div style={S.progressTrack}>
                        <div style={{ height: '100%', width: `${(f.revenue / max) * 100}%`, background: FIELD_COLORS[i % FIELD_COLORS.length], borderRadius: 999, transition: 'width 0.5s ease' }} />
                      </div>
                      <p style={S.fieldCount}>{f.bookings} reservas</p>
                    </div>
                  )
                })
              )}
            </SCard>
          </div>

          {/* Row 2: Horarios + Comisión */}
          <div style={chartRowStyle}>
            <SCard
              title="Horarios más rentables"
              subtitle="Reservas por hora del día"
              badge={<span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}><Clock size={11} /> Ajusta precios según demanda</span>}
            >
              {loading ? (
                <div style={{ height: 190, background: '#f1f5f9', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={hourlyStats} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={22} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                      {hourlyStats.map((entry, i) => {
                        const max = Math.max(...hourlyStats.map(h => h.bookings), 1)
                        const opacity = entry.bookings === 0 ? 0.1 : 0.25 + (entry.bookings / max) * 0.75
                        return <Cell key={i} fill={`rgba(22,163,74,${opacity})`} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SCard>

            <SCard title="Comisión GolPlay" subtitle={`Período · $${COMMISSION_USD} USD por reserva confirmada`}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 48, width: '60%', background: '#f1f5f9', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, animation: 'pulse 1.5s infinite' }} />
                </div>
              ) : (
                <>
                  {/* Reservas confirmadas y monto en moneda local */}
                  <div style={S.commissionNumbers}>
                    <div>
                      <span style={S.commissionBig}>{commission.totalCount}</span>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>reservas confirmadas</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ ...S.commissionRevenue, margin: 0 }}>
                        {commission.currencySymbol}{Math.round(commission.commissionTotal).toLocaleString('es')}
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        ${commission.commissionTotalUSD.toFixed(2)} USD · {commission.ownerCurrency}
                      </p>
                    </div>
                  </div>

                  {/* Info del modelo — sin límite */}
                  <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#15803d', marginBottom: 14, textAlign: 'center', border: '1px solid #bbf7d0' }}>
                    ✓ Sin límite mensual · ${COMMISSION_USD} USD ({commission.currencySymbol}{Math.round(commission.commissionPerBooking).toLocaleString('es')} {commission.ownerCurrency}) por reserva
                  </div>

                  <div style={S.divider} />
                  <p style={S.breakdownTitle}>Equivalencia en monedas soportadas</p>
                  {Object.entries(USD_RATES).map(([cur, rate]) => (
                    <div key={cur} style={S.breakdownRow}>
                      <span>{CURRENCY_SYMBOL[cur]}{cur}</span>
                      <span style={{ fontWeight: 500, color: '#374151' }}>{CURRENCY_SYMBOL[cur]}{Math.round(rate * COMMISSION_USD).toLocaleString()}</span>
                    </div>
                  ))}
                </>
              )}
            </SCard>
          </div>

          <p style={S.footer}>
            Modelo v2.0 — Febrero 2026.
          </p>

        </div>
      </div>
    </AdminLayout>
  )
}
