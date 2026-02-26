/**
 * GolPlay — DailyCalendar
 * Componente de vista diaria del calendario administrativo.
 *
 * Props:
 *   selectedDate: string  → "YYYY-MM-DD"
 *   fieldFilter: string   → field_id o 'all'
 *   onBookingClick: (b) → void  (opcional, para abrir modal externo)
 */

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import BookingModal from '@/components/ui/admin/BookingModal'

// ─── Types ────────────────────────────────────────────────────────────────────
export type BookingStatus = 'active' | 'pending' | 'cancelled'

export type Booking = {
  id: number
  date: string
  hour: string
  fieldName: string
  fieldId: number
  customerName: string
  customerPhone: string
  status: BookingStatus
  price: number
}

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

// ─── Status config ─────────────────────────────────────────────────────────────
export const STATUS_CFG: Record<BookingStatus, {
  label: string; dot: string; bg: string; border: string; text: string
}> = {
  active:    { label: 'Confirmada', dot: '#16a34a', bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  pending:   { label: 'Pendiente',  dot: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  cancelled: { label: 'Cancelada',  dot: '#dc2626', bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const formatCRC = (v: number) =>
  `₡${Number(v).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{
      background: '#fff', borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)', border: '1px solid #f1f5f9',
    }}>
      {HOURS.slice(0, 8).map(h => (
        <div key={h} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ padding: '14px 10px', borderRight: '1px solid #f1f5f9' }}>
            <div style={{ height: 12, width: 40, background: '#f1f5f9', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
          </div>
          <div style={{ padding: '10px 14px' }}>
            {Math.random() > 0.6 && (
              <div style={{ height: 44, width: '55%', background: '#f1f5f9', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── BookingBlock ─────────────────────────────────────────────────────────────
function BookingBlock({
  booking, conflict, onClick,
}: {
  booking: Booking; conflict: boolean; onClick: () => void
}) {
  const cfg = STATUS_CFG[booking.status] ?? STATUS_CFG.active
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${booking.fieldName} · ${booking.customerName}`}
      style={{
        background: hovered ? cfg.border : cfg.bg,
        border: `1px solid ${conflict ? '#ef4444' : cfg.border}`,
        borderLeft: `3px solid ${conflict ? '#ef4444' : cfg.dot}`,
        borderRadius: 10,
        padding: '8px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        maxWidth: 340,
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,.08)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: conflict ? '#ef4444' : cfg.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {booking.fieldName}
          </span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: conflict ? '#b91c1c' : cfg.text, background: conflict ? '#fee2e2' : cfg.bg, padding: '2px 7px', borderRadius: 999, border: `1px solid ${conflict ? '#fca5a5' : cfg.border}`, flexShrink: 0 }}>
          {conflict ? '⚠️ CONFLICTO' : cfg.label.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, paddingLeft: 13 }}>
        {booking.customerName || 'Sin nombre'} · {formatCRC(booking.price)}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DailyCalendar({ selectedDate, fieldFilter = 'all' }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Booking | null>(null)

  const dateLabel = useMemo(() =>
    parseLocalDate(selectedDate).toLocaleDateString('es-CR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
    [selectedDate]
  )

  const isToday = useMemo(() =>
    selectedDate === new Date().toLocaleDateString('sv-SE'),
    [selectedDate]
  )

  // Fetch
  useEffect(() => {
    if (!selectedDate) return
    setLoading(true)

    supabase
      .from('bookings')
      .select(`id, date, hour, status, price,
        customer_name, customer_phone,
        fields:field_id (id, name)
      `)
      .eq('date', selectedDate)
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
  }, [selectedDate, fieldFilter])

  // Conflict detection: same hour, same field
  const conflictSet = useMemo(() => {
    const seen = new Set<string>()
    const conflicts = new Set<number>()
    bookings.forEach(b => {
      const key = `${b.hour}-${b.fieldId}`
      if (seen.has(key)) conflicts.add(b.id)
      else seen.add(key)
    })
    return conflicts
  }, [bookings])

  const totalConflicts = conflictSet.size
  const activeCount = bookings.filter(b => b.status === 'active').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length

  const deleteBooking = async (id: number) => {
    await supabase.from('bookings').delete().eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
    setSelected(null)
  }

  const now = new Date()
  const currentHour = `${String(now.getHours()).padStart(2, '0')}:00`

  return (
    <>
      {/* ── Day summary strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
            {dateLabel}
            {isToday && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: '#0f172a', color: '#fff', padding: '2px 8px', borderRadius: 999 }}>HOY</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: `${activeCount} confirmadas`, color: '#16a34a', bg: '#f0fdf4' },
            { label: `${pendingCount} pendientes`, color: '#d97706', bg: '#fffbeb' },
            ...(totalConflicts > 0 ? [{ label: `${totalConflicts} conflictos`, color: '#dc2626', bg: '#fef2f2' }] : []),
          ].map(({ label, color, bg }) => (
            <span key={label} style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '4px 10px', borderRadius: 999 }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Conflict alert ── */}
      {totalConflicts > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#b91c1c', display: 'flex', gap: 8, alignItems: 'center' }}>
          ⚠️ <strong>{totalConflicts} reserva{totalConflicts > 1 ? 's' : ''}</strong> con conflicto de horario detectada{totalConflicts > 1 ? 's' : ''}. Revisá los bloques marcados en rojo.
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? <Skeleton /> : (
        <div style={{
          background: '#fff', borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: '1px solid #f1f5f9',
        }}>
          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', borderBottom: '2px solid #f1f5f9' }}>
            <div style={{ padding: '10px 12px', background: '#f8fafc' }} />
            <div style={{ padding: '10px 16px', background: '#f8fafc', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Reservas del día
            </div>
          </div>

          {HOURS.map(hour => {
            const slotBookings = bookings.filter(b => b.hour === hour)
            const isPast = isToday && hour < currentHour
            const isCurrent = isToday && hour === currentHour

            return (
              <div
                key={hour}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr',
                  borderBottom: '1px solid #f8fafc',
                  background: isCurrent ? '#fffbeb' : isPast ? '#fafafa' : '#fff',
                  transition: 'background 0.2s',
                }}
              >
                {/* Hour label */}
                <div style={{
                  padding: '14px 10px',
                  borderRight: '1px solid #f1f5f9',
                  fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#d97706' : isPast ? '#cbd5e1' : '#94a3b8',
                  textAlign: 'right',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                }}>
                  {hour}
                  {isCurrent && <span style={{ marginLeft: 4, width: 6, height: 6, borderRadius: '50%', background: '#d97706', display: 'inline-block', marginTop: 3 }} />}
                </div>

                {/* Slot */}
                <div style={{ padding: '8px 12px', minHeight: 52, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {slotBookings.length === 0 ? (
                    <div style={{ height: 36, display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: isPast ? '#e2e8f0' : '#e2e8f0' }}>
                        {!isPast ? '· disponible' : ''}
                      </span>
                    </div>
                  ) : (
                    slotBookings.map(b => (
                      <BookingBlock
                        key={b.id}
                        booking={b}
                        conflict={conflictSet.has(b.id)}
                        onClick={() => setSelected(b)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: '0 0 6px' }}>Sin reservas este día</p>
          <p style={{ fontSize: 13, margin: 0 }}>No hay reservas registradas para esta fecha.</p>
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
