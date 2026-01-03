import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import BookingModal from '@/components/ui/admin/BookingModal'

type Booking = {
  id: number
  date: string
  hour: string
  fieldName: string
}

type WeeklyCalendarProps = {
  selectedDate: string
}

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
]

// util: obtener lunes de la semana desde una fecha base
function getWeekDates(base: Date) {
  const monday = new Date(base)
  const day = monday.getDay() || 7
  if (day !== 1) monday.setDate(monday.getDate() - (day - 1))

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export default function WeeklyCalendar({ selectedDate }: WeeklyCalendarProps) {
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selected, setSelected] = useState<Booking | null>(null)

  // cargar semana basada en selectedDate
  useEffect(() => {
    const base = new Date(selectedDate)
    setWeekDates(getWeekDates(base))
  }, [selectedDate])

  // cargar reservas de la semana
  useEffect(() => {
    if (weekDates.length === 0) return

    supabase
      .from('bookings')
      .select(`
        id,
        date,
        hour,
        fields:field_id (
          name
        )
      `)
      .in('date', weekDates)
      .then(({ data, error }) => {
        if (error || !data) {
          console.error(error)
          return
        }

        const normalized = data.map((b: any) => ({
          id: b.id,
          date: b.date,
          hour: b.hour,
          fieldName: Array.isArray(b.fields)
            ? b.fields[0]?.name
            : b.fields?.name ?? '-',
        }))

        setBookings(normalized)
      })
  }, [weekDates])

  const deleteBooking = async (id: number) => {
    await supabase.from('bookings').delete().eq('id', id)
    setBookings((prev) => prev.filter((b) => b.id !== id))
    setSelected(null)
  }

  return (
    <>
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>
        Vista semanal
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '80px repeat(7, 1fr)',
          backgroundColor: 'white',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        }}
      >
        {/* HEADER */}
        <div />
        {weekDates.map((d) => (
          <div
            key={d}
            style={{
              padding: 12,
              textAlign: 'center',
              fontWeight: 600,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {new Date(d).toLocaleDateString('es-CR', {
              weekday: 'short',
              day: 'numeric',
            })}
          </div>
        ))}

        {/* GRID */}
        {HOURS.map((hour) => (
          <>
            <div
              key={hour}
              style={{
                padding: 10,
                borderRight: '1px solid #e5e7eb',
                fontSize: 13,
                color: '#6b7280',
              }}
            >
              {hour}
            </div>

            {weekDates.map((date) => {
              const booking = bookings.find(
                (b) => b.date === date && b.hour === hour
              )

              return (
                <div
                  key={date + hour}
                  onClick={() => booking && setSelected(booking)}
                  style={{
                    padding: 8,
                    borderRight: '1px solid #e5e7eb',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: booking ? 'pointer' : 'default',
                  }}
                >
                  {booking && (
                    <div
                      style={{
                        backgroundColor: '#dcfce7',
                        borderRadius: 10,
                        padding: 8,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {booking.fieldName}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        ))}
      </div>

      {/* MODAL */}
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
