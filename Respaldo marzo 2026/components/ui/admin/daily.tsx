/**
 * GolPlay — DailyCalendar
 * Componente de vista diaria del calendario administrativo.
 *
 * Props:
 *   selectedDate: string  → "YYYY-MM-DD"
 *   fieldFilter: string   → field_id o 'all'
 *   fieldColors: Record<string, string>  → { fieldId: hexColor }
 *
 * CAMBIOS v2: Color de cancha en bloques de reserva.
 * - BookingBlock usa fieldColor para fondo (15% opacidad) y borde izquierdo
 * - Status se muestra como dot + badge (no como color de fondo)
 * - Props type actualizado para recibir fieldColors
 */

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import BookingModal from '@/components/ui/admin/BookingModal'

// ─── Types ────────────────────────────────────────────────────────────────────
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'active'

export type Booking = {
  id: number
  date: string
  hour: string
  fieldName: string
  fieldId: number
  customerName: string
  customerLastName: string
  customerPhone: string
  customerEmail: string
  customerIdNumber: string
  notes: string
  status: BookingStatus
  price: number
  priceSource: string
  source: string
}

type Props = {
  selectedDate: string
  fieldFilter?: string
  fieldColors?: Record<string, string>
  fieldSlotDurations?: Record<string, number>
}

// ─── Constants ────────────────────────────────────────────────────────────────
const HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00',
  '20:00','21:00','22:00',
]

const DEFAULT_FIELD_COLOR = '#3B82F6'

// ─── Status config ─────────────────────────────────────────────────────────────
export const STATUS_CFG: Record<BookingStatus, {
  label: string; dot: string; bg: string; border: string; text: string
}> = {
  confirmed: { label: 'Confirmada', dot: '#16a34a', bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  pending:   { label: 'Pendiente',  dot: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  cancelled: { label: 'Cancelada',  dot: '#dc2626', bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c' },

  active: { 
    label: 'Activa', 
    dot: '#3b82f6', 
    bg: '#dbeafe', 
    border: '#93c5fd', 
    text: '#1e3a8a' 
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const formatCRC = (v: number) =>
  `₡${Number(v).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

/** Convierte hex a rgba con opacidad */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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

// ─── BookingBlock — CHANGED: uses field color ─────────────────────────────────
function BookingBlock({
  booking, conflict, onClick, fieldColor,
}: {
  booking: Booking; conflict: boolean; onClick: () => void; fieldColor: string
}) {
  const cfg = STATUS_CFG[booking.status] ?? STATUS_CFG.confirmed
  const [hovered, setHovered] = useState(false)

  // Field color for background (15% opacity) and border-left (100%)
  const bgColor = conflict ? '#fef2f2' : hexToRgba(fieldColor, hovered ? 0.2 : 0.1)
  const borderColor = conflict ? '#ef4444' : fieldColor
  const borderLightColor = conflict ? '#fca5a5' : hexToRgba(fieldColor, 0.3)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${booking.fieldName} · ${booking.customerName}`}
      style={{
        background: bgColor,
        border: `1px solid ${borderLightColor}`,
        borderLeft: `3px solid ${borderColor}`,
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
          {/* Status dot */}
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
export default function DailyCalendar({ selectedDate, fieldFilter = 'all', fieldColors = {}, fieldSlotDurations = {} }: Props) {
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
      .select(`id, date, hour, status, price, price_source, source, notes,
        customer_name, customer_last_name, customer_phone, customer_email, customer_id_number,
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
            status: (b.status as BookingStatus) ?? 'confirmed',
            price: Number(b.price ?? 0),
            priceSource: b.price_source ?? '',
            source: b.source ?? '',
            notes: b.notes ?? '',
            fieldId: b.fields?.id ?? 0,
            fieldName: Array.isArray(b.fields) ? b.fields[0]?.name : b.fields?.name ?? '—',
            customerName: b.customer_name ?? '',
            customerLastName: b.customer_last_name ?? '',
            customerPhone: b.customer_phone ?? '',
            customerEmail: b.customer_email ?? '',
            customerIdNumber: b.customer_id_number ?? '',
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
  const activeCount = bookings.filter(b => b.status === 'confirmed').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length

  const deleteBooking = async (id: number) => {
    const { error, count } = await supabase
      .from('bookings')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      alert(`No se pudo eliminar: ${error.message}`)
      return
    }

    if (count === 0) {
      console.warn('Delete returned 0 rows — possible RLS issue')
      alert('La reserva no se eliminó. Verificá los permisos en Supabase (RLS).')
      return
    }

    setBookings(prev => prev.filter(b => b.id !== id))
    setSelected(null)
  }

  const updateBooking = (updated: Booking) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
    setSelected(updated)
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
            const thisH = Number(hour.split(':')[0])
            const slotBookings = bookings.filter(b => {
              const bookingStartH = Number(b.hour.split(':')[0])
              // Exact match: booking starts at this hour
              if (b.hour === hour) return true
              // Span match: booking started earlier but its slot_duration covers this hour
              const dur = fieldSlotDurations[String(b.fieldId)] || 1
              if (dur <= 1) return false
              return thisH > bookingStartH && thisH < bookingStartH + dur
            })
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
                    slotBookings.map(b => {
                      const isContinuation = b.hour !== hour
                      if (isContinuation) {
                        // Render a subtle continuation bar instead of full block
                        const fc = fieldColors[String(b.fieldId)] || DEFAULT_FIELD_COLOR
                        return (
                          <div
                            key={`${b.id}-cont`}
                            onClick={() => setSelected(b)}
                            title={`${b.fieldName} · continuación (turno de ${fieldSlotDurations[String(b.fieldId)] || 1}h)`}
                            style={{
                              background: hexToRgba(fc, 0.07),
                              borderLeft: `3px solid ${fc}`,
                              borderRadius: 10,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              maxWidth: 340,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hexToRgba(fc, 0.14) }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = hexToRgba(fc, 0.07) }}
                          >
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>↕</span>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                              {b.fieldName}
                            </span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>
                              (cont. desde {b.hour})
                            </span>
                          </div>
                        )
                      }
                      return (
                        <BookingBlock
                          key={b.id}
                          booking={b}
                          conflict={conflictSet.has(b.id)}
                          onClick={() => setSelected(b)}
                          fieldColor={fieldColors[String(b.fieldId)] || DEFAULT_FIELD_COLOR}
                        />
                      )
                    })
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
          onUpdate={updateBooking}
        />
      )}
    </>
  )
}
