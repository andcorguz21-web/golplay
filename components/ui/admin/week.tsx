/**
 * GolPlay — WeeklyCalendar
 * Componente de vista semanal del calendario administrativo.
 *
 * Props:
 *   selectedDate: string  → "YYYY-MM-DD"
 *   fieldFilter: string   → field_id o 'all'
 */

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import BookingModal from '@/components/ui/admin/BookingModal'
import { type Booking, type BookingStatus, STATUS_CFG } from './daily'

type Props = {
  selectedDate: string
  fieldFilter?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00',
  '20:00','21:00','22:00',
]

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Obtiene lunes de la semana. Usa aritmética local, sin UTC. */
function getWeekDates(base: Date): string[] {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const day = d.getDay() === 0 ? 7 : d.getDay() // domingo=7
  d.setDate(d.getDate() - (day - 1))             // retroceder al lunes
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i)
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
  })
}

function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const todayStr = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

const formatCRC = (v: number) =>
  `₡${Number(v).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function WeeklySkeleton() {
  return (
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)', borderBottom: '2px solid #f1f5f9' }}>
        <div style={{ background: '#f8fafc', padding: 12 }} />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ background: '#f8fafc', padding: 12, borderLeft: '1px solid #f1f5f9' }}>
            <div style={{ height: 10, width: 28, background: '#e2e8f0', borderRadius: 4, margin: '0 auto 4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 18, width: 20, background: '#e2e8f0', borderRadius: 4, margin: '0 auto', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
      {HOURS.slice(0, 6).map(h => (
        <div key={h} style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ padding: '14px 10px', borderRight: '1px solid #f1f5f9' }}>
            <div style={{ height: 11, width: 36, background: '#f1f5f9', borderRadius: 4, marginLeft: 'auto', animation: 'pulse 1.5s infinite' }} />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ padding: 6, borderLeft: '1px solid #f8fafc', minHeight: 48 }}>
              {i % 3 === 0 && <div style={{ height: 34, background: '#f1f5f9', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Mini booking cell ─────────────────────────────────────────────────────────
function BookingCell({
  booking, conflict, onClick,
}: {
  booking: Booking; conflict: boolean; onClick: () => void
}) {
  const cfg = STATUS_CFG[booking.status] ?? STATUS_CFG.active
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${booking.fieldName}\n${booking.customerName}\n${formatCRC(booking.price)}`}
      style={{
        background: hovered ? cfg.border : cfg.bg,
        borderLeft: `3px solid ${conflict ? '#ef4444' : cfg.dot}`,
        borderRadius: 7,
        padding: '5px 7px',
        cursor: 'pointer',
        fontSize: 11,
        transition: 'all 0.12s ease',
        marginBottom: 3,
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,.1)' : 'none',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontWeight: 700, color: conflict ? '#b91c1c' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {conflict ? '⚠️ ' : ''}{booking.fieldName}
      </div>
      {booking.customerName && (
        <div style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>
          {booking.customerName}
        </div>
      )}
    </div>
  )
}

// ─── Occupation bar ───────────────────────────────────────────────────────────
function OccupationBar({ count, date }: { count: number; date: string }) {
  const max = 5
  const pct = Math.min((count / max) * 100, 100)
  const color = pct >= 80 ? '#dc2626' : pct >= 50 ? '#d97706' : '#16a34a'
  return (
    <div title={`${count} reserva${count !== 1 ? 's' : ''}`} style={{ marginTop: 4, height: 3, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WeeklyCalendar({ selectedDate, fieldFilter = 'all' }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Booking | null>(null)
  const today = todayStr()

  // Compute week dates from selectedDate (timezone-safe)
  const weekDates = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    return getWeekDates(new Date(y, m - 1, d))
  }, [selectedDate])

  // Fetch bookings for the week
  useEffect(() => {
    if (!weekDates.length) return
    setLoading(true)

    supabase
      .from('bookings')
      .select(`id, date, hour, status, price,
        customer_name, customer_phone,
        fields:field_id (id, name)
      `)
      .in('date', weekDates)
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return }

        const normalized: Booking[] = data
          .filter((b: any) => fieldFilter === 'all' || String(b.fields?.id) === fieldFilter)
          .map((b: any) => ({
            id: b.id,
            date: b.date,
            hour: b.hour,
            status: (b.status as BookingStatus) ?? 'active',
            price: Number(b.price ?? 0),
            fieldId: b.fields?.id ?? 0,
            fieldName: Array.isArray(b.fields) ? b.fields[0]?.name : b.fields?.name ?? '—',
            customerName: b.customer_name ?? '',
            customerPhone: b.customer_phone ?? '',
          }))

        setBookings(normalized)
        setLoading(false)
      })
  }, [weekDates, fieldFilter])

  // Conflict detection
  const conflictSet = useMemo(() => {
    const seen = new Set<string>()
    const conflicts = new Set<number>()
    bookings.forEach(b => {
      const key = `${b.date}-${b.hour}-${b.fieldId}`
      if (seen.has(key)) conflicts.add(b.id)
      else seen.add(key)
    })
    return conflicts
  }, [bookings])

  // Per-day booking counts (for occupation bar)
  const dailyCounts = useMemo(() => {
    const map: Record<string, number> = {}
    weekDates.forEach(d => { map[d] = 0 })
    bookings.forEach(b => { map[b.date] = (map[b.date] ?? 0) + 1 })
    return map
  }, [bookings, weekDates])

  const totalConflicts = conflictSet.size

  const deleteBooking = async (id: number) => {
    await supabase.from('bookings').delete().eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
    setSelected(null)
  }

  // Week range label
  const weekLabel = useMemo(() => {
    if (!weekDates.length) return ''
    const from = parseLocalDate(weekDates[0]).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
    const to = parseLocalDate(weekDates[6]).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${from} — ${to}`
  }, [weekDates])

  return (
    <>
      {/* ── Week summary ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{weekLabel}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 999 }}>
            {bookings.length} reservas esta semana
          </span>
          {totalConflicts > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: 999 }}>
              ⚠️ {totalConflicts} conflicto{totalConflicts > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Conflict alert ── */}
      {totalConflicts > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#b91c1c', display: 'flex', gap: 8, alignItems: 'center' }}>
          ⚠️ <strong>{totalConflicts} conflicto{totalConflicts > 1 ? 's' : ''} detectado{totalConflicts > 1 ? 's' : ''}</strong> esta semana. Los bloques marcados requieren atención.
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? <WeeklySkeleton /> : (
        <div style={{
          background: '#fff', borderRadius: 18,
          overflow: 'auto', // horizontal scroll en móvil
          boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: '1px solid #f1f5f9',
        }}>
          <div style={{ minWidth: 700 }}>

            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)', borderBottom: '2px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <div style={{ background: '#f8fafc', padding: 12 }} />
              {weekDates.map((date, i) => {
                const d = parseLocalDate(date)
                const isToday = date === today
                const dayNum = d.getDate()
                return (
                  <div key={date} style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    borderLeft: '1px solid #f1f5f9',
                    background: isToday ? '#f0f9ff' : '#f8fafc',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? '#0284c7' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {DAY_LABELS[i]}
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 700,
                      color: isToday ? '#fff' : '#0f172a',
                      background: isToday ? '#0284c7' : 'transparent',
                      width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '4px auto 2px',
                    }}>
                      {dayNum}
                    </div>
                    <OccupationBar count={dailyCounts[date] ?? 0} date={date} />
                  </div>
                )
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map(hour => (
              <div
                key={hour}
                style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)', borderBottom: '1px solid #f8fafc' }}
              >
                {/* Hour label */}
                <div style={{
                  padding: '12px 10px',
                  borderRight: '1px solid #f1f5f9',
                  fontSize: 11, fontWeight: 500, color: '#94a3b8',
                  textAlign: 'right', paddingTop: 14,
                }}>
                  {hour}
                </div>

                {/* Day cells */}
                {weekDates.map(date => {
                  const slotBookings = bookings.filter(b => b.date === date && b.hour === hour)
                  const isToday = date === today

                  return (
                    <div
                      key={date + hour}
                      style={{
                        padding: '4px 5px',
                        borderLeft: '1px solid #f8fafc',
                        minHeight: 48,
                        background: isToday ? 'rgba(2,132,199,.02)' : 'transparent',
                      }}
                    >
                      {slotBookings.map(b => (
                        <BookingCell
                          key={b.id}
                          booking={b}
                          conflict={conflictSet.has(b.id)}
                          onClick={() => setSelected(b)}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📆</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: '0 0 6px' }}>Sin reservas esta semana</p>
          <p style={{ fontSize: 13, margin: 0 }}>No hay reservas registradas para este período.</p>
        </div>
      )}

      {/* ── Modal ── */}
      {selected && (
        <BookingModal
          booking={selected}
          onClose={() => setSelected(null)}
          onDelete={deleteBooking}
        />
      )}
    </>
  )
}
