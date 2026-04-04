/**
 * GolPlay — useBookingAnalytics
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook compartido para analytics del admin.
 * REEMPLAZA la logica duplicada entre business-model.tsx e index.tsx.
 *
 * Diferencias que existían:
 *   - business-model.tsx filtraba por created_at → incorrecto
 *   - index.tsx filtraba por date → correcto
 *   - Ambos calculaban ocupación, comisión, hora pico por separado
 *
 * Este hook unifica todo y filtra siempre por booking.date (fecha de la reserva),
 * que es lo correcto para analytics de ocupación e ingresos.
 *
 * Ubicación: hooks/useBookingAnalytics.ts
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  USD_RATES,
  LATAM_COUNTRIES,
  formatMoney,
  formatMoneyShort,
  getSportLabel,
  getSportEmoji,
} from '@/sports'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show'

export interface AnalyticsBooking {
  id: number
  date: string
  hour: string
  status: BookingStatus
  price: number | null
  field_id: number
  created_at: string
  customer_name?: string
  customer_last_name?: string
  customer_email?: string
  customer_phone?: string
  source?: string
}

export interface AnalyticsField {
  id: number
  name: string
  sport?: string
  price_day: number
  price_night?: number
  active?: boolean
}

export interface FieldStats {
  id: number
  name: string
  sport?: string
  revenue: number
  bookings: number
}

export interface HourStats {
  hour: string
  bookings: number
  revenue: number
}

export interface DailyData {
  date: string
  label: string
  revenue: number
  bookings: number
}

export interface CommissionInfo {
  totalCount: number
  commissionUSD: number
  commissionLocal: number
  commissionPerBooking: number
  currency: string
  currencySymbol: string
  usdRate: number
}

export interface Insights {
  peakHour: HourStats | null
  deadHours: string[]
  lowOccupancyFields: FieldStats[]
}

export interface AnalyticsResult {
  // Raw data
  bookings: AnalyticsBooking[]
  fields: AnalyticsField[]
  currency: string

  // KPIs
  totalRevenue: number
  prevRevenue: number
  totalCount: number
  prevCount: number
  occupancyPct: number
  prevOccupancyPct: number
  avgTicket: number
  todayCount: number
  pendingCount: number
  netRevenue: number
  topField: string

  // Breakdowns
  fieldStats: FieldStats[]
  hourlyStats: HourStats[]
  dailyData: DailyData[]
  sportMap: Record<string, { count: number; rev: number }>

  // Commission
  commission: CommissionInfo

  // Insights
  insights: Insights

  // Deltas (% change vs previous period)
  revenueDelta: number | null
  countDelta: number | null
  occupancyDelta: number | null
  netDelta: number | null

  // Meta
  loading: boolean
  error: string | null
  refetch: () => void

  // Helpers (pre-bound to currency)
  fMoney: (v: number) => string
  fMoneyShort: (v: number) => string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS_RANGE = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

const HOURS_PER_DAY = HOURS_RANGE.length // 17

const COMMISSION_USD = 1.00

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fISO = (d: Date) => d.toISOString().split('T')[0]

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
}

function formatDayLabel(dateStr: string, totalDays: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (totalDays <= 7) {
    return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAnalyticsOptions {
  from: Date
  to: Date
  fieldId?: string | 'all'  // optional filter by single field
}

export function useBookingAnalytics(options: UseAnalyticsOptions): AnalyticsResult {
  const { from, to, fieldId = 'all' } = options

  const [bookings, setBookings] = useState<AnalyticsBooking[]>([])
  const [prevBookings, setPrevBookings] = useState<AnalyticsBooking[]>([])
  const [fields, setFields] = useState<AnalyticsField[]>([])
  const [currency, setCurrency] = useState('CRC')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id)
    })
  }, [])

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    try {
      // Calculate previous period (same duration, immediately before)
      const spanMs = to.getTime() - from.getTime()
      const prevFrom = new Date(from.getTime() - spanMs)
      const prevTo = new Date(from.getTime() - 1) // day before current range

      // Fetch fields, profile, current bookings, and previous bookings in parallel
      const [fieldsRes, profileRes, currRes, prevRes] = await Promise.all([
        supabase
          .from('fields')
          .select('id, name, sport, price_day, price_night, active')
          .eq('owner_id', userId)
          .order('name'),
        supabase
          .from('profiles')
          .select('currency')
          .eq('id', userId)
          .single(),
        (() => {
          let q = supabase
            .from('bookings')
            .select('id, date, hour, status, price, field_id, created_at, customer_name, customer_last_name, customer_email, customer_phone, source')
            .gte('date', fISO(from))
            .lte('date', fISO(to))
          if (fieldId !== 'all') q = q.eq('field_id', fieldId)
          return q
        })(),
        (() => {
          let q = supabase
            .from('bookings')
            .select('id, date, hour, status, price, field_id')
            .gte('date', fISO(prevFrom))
            .lte('date', fISO(prevTo))
          if (fieldId !== 'all') q = q.eq('field_id', fieldId)
          return q
        })(),
      ])

      if (currRes.error) throw currRes.error
      if (prevRes.error) throw prevRes.error

      if (profileRes.data?.currency) setCurrency(profileRes.data.currency)
      setFields(fieldsRes.data ?? [])

      // Filter to only fields owned by this user (RLS should handle this,
      // but we add client-side filtering as defense in depth)
      const ownerFieldIds = new Set((fieldsRes.data ?? []).map((f: any) => f.id))
      
      const currentData = (currRes.data ?? [])
        .filter((b: any) => ownerFieldIds.has(b.field_id))
        .map((b: any) => ({ ...b, price: b.price ? Number(b.price) : null }))
      
      const previousData = (prevRes.data ?? [])
        .filter((b: any) => ownerFieldIds.has(b.field_id))
        .map((b: any) => ({ ...b, price: b.price ? Number(b.price) : null }))

      setBookings(currentData)
      setPrevBookings(previousData)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [userId, from, to, fieldId])

  useEffect(() => { if (userId) fetchData() }, [fetchData, userId])

  // ── Compute analytics ──
  const analytics = useMemo(() => {
    const active = bookings.filter(b => b.status !== 'cancelled')
    const prevActive = prevBookings.filter((b: any) => b.status !== 'cancelled')
    const today = fISO(new Date())

    // Field lookup
    const fieldMap = new Map(fields.map(f => [f.id, f]))
    const activeFields = fields.filter(f => f.active !== false)

    // ── Revenue ──
    const getPrice = (b: AnalyticsBooking) => {
      if (b.price != null) return b.price
      const f = fieldMap.get(b.field_id)
      return f?.price_day ?? 0
    }
    const totalRevenue = active.reduce((s, b) => s + getPrice(b), 0)
    const prevRevenue = prevActive.reduce((s: number, b: any) => s + (b.price ?? 0), 0)

    // ── Commission ──
    const usdRate = USD_RATES[currency] ?? 540
    const countryConfig = LATAM_COUNTRIES.find(c => c.currency === currency)
    const currencySymbol = countryConfig?.symbol ?? '₡'
    const commissionLocal = active.length * COMMISSION_USD * usdRate
    const netRevenue = Math.max(0, totalRevenue - commissionLocal)
    const prevCommission = prevActive.length * COMMISSION_USD * usdRate
    const prevNet = Math.max(0, prevRevenue - prevCommission)

    // ── Counts ──
    const totalCount = active.length
    const prevCount = prevActive.length
    const todayCount = active.filter(b => b.date === today).length
    const pendingCount = bookings.filter(b => b.status === 'pending').length

    // ── Occupancy ──
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1)
    const totalSlots = activeFields.length * HOURS_PER_DAY * days
    const occupancyPct = totalSlots > 0 ? Math.min(100, Math.round((totalCount / totalSlots) * 100)) : 0
    const prevOccupancyPct = totalSlots > 0 ? Math.min(100, Math.round((prevCount / totalSlots) * 100)) : 0

    // ── Avg ticket ──
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0

    // ── Field stats ──
    const fieldStatsMap: Record<number, FieldStats> = {}
    active.forEach(b => {
      if (!fieldStatsMap[b.field_id]) {
        const f = fieldMap.get(b.field_id)
        fieldStatsMap[b.field_id] = {
          id: b.field_id,
          name: f?.name ?? `Cancha ${b.field_id}`,
          sport: f?.sport,
          revenue: 0,
          bookings: 0,
        }
      }
      fieldStatsMap[b.field_id].revenue += getPrice(b)
      fieldStatsMap[b.field_id].bookings += 1
    })
    const fieldStats = Object.values(fieldStatsMap).sort((a, b) => b.revenue - a.revenue)
    const topField = fieldStats[0]?.name ?? '—'

    // ── Hourly stats ──
    const hourMap: Record<string, HourStats> = {}
    HOURS_RANGE.forEach(h => { hourMap[h] = { hour: h, bookings: 0, revenue: 0 } })
    active.forEach(b => {
      if (b.hour && hourMap[b.hour]) {
        hourMap[b.hour].bookings += 1
        hourMap[b.hour].revenue += getPrice(b)
      }
    })
    const hourlyStats = Object.values(hourMap)

    // ── Daily data ──
    const dailyMap: Record<string, DailyData> = {}
    const cur = new Date(from)
    const end = new Date(to)
    while (cur <= end) {
      const key = fISO(cur)
      dailyMap[key] = { date: key, label: formatDayLabel(key, days), revenue: 0, bookings: 0 }
      cur.setDate(cur.getDate() + 1)
    }
    active.forEach(b => {
      if (b.date && dailyMap[b.date]) {
        dailyMap[b.date].revenue += getPrice(b)
        dailyMap[b.date].bookings += 1
      }
    })
    const dailyData = Object.values(dailyMap)

    // ── Sport breakdown ──
    const sportMap: Record<string, { count: number; rev: number }> = {}
    active.forEach(b => {
      const sport = fieldMap.get(b.field_id)?.sport ?? 'otro'
      if (!sportMap[sport]) sportMap[sport] = { count: 0, rev: 0 }
      sportMap[sport].count++
      sportMap[sport].rev += getPrice(b)
    })

    // ── Insights ──
    const peakHour = hourlyStats.reduce((a, b) => (b.bookings > a.bookings ? b : a), hourlyStats[0]) ?? null
    const deadHours = hourlyStats.filter(h => h.bookings === 0).map(h => h.hour)
    const lowOccupancyFields = fieldStats.filter(f => f.bookings < 3)

    // ── Deltas ──
    const revenueDelta = pctDelta(totalRevenue, prevRevenue)
    const countDelta = pctDelta(totalCount, prevCount)
    const occupancyDelta = pctDelta(occupancyPct, prevOccupancyPct)
    const netDelta = pctDelta(netRevenue, prevNet)

    return {
      totalRevenue, prevRevenue, totalCount, prevCount,
      occupancyPct, prevOccupancyPct, avgTicket,
      todayCount, pendingCount, netRevenue, topField,
      fieldStats, hourlyStats, dailyData, sportMap,
      commission: {
        totalCount,
        commissionUSD: totalCount * COMMISSION_USD,
        commissionLocal,
        commissionPerBooking: COMMISSION_USD * usdRate,
        currency,
        currencySymbol,
        usdRate,
      },
      insights: { peakHour, deadHours, lowOccupancyFields },
      revenueDelta, countDelta, occupancyDelta, netDelta,
    }
  }, [bookings, prevBookings, fields, currency, from, to])

  // ── Formatters (pre-bound to currency) ──
  const fMoney = useCallback((v: number) => formatMoney(v, currency), [currency])
  const fMoneyShort = useCallback((v: number) => formatMoneyShort(v, currency), [currency])

  return {
    bookings,
    fields,
    currency,
    ...analytics,
    loading,
    error,
    refetch: fetchData,
    fMoney,
    fMoneyShort,
  }
}