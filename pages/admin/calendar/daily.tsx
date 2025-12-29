import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BookingModal from '@/components/ui/admin/BookingModal';

type Booking = {
  id: number;
  date: string;
  hour: string;
  fieldName: string;
};

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

export default function DailyCalendar() {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);

  // ======================
  // LOAD BOOKINGS
  // ======================
  useEffect(() => {
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
      .eq('date', date)
      .then(({ data, error }) => {
        if (error || !data) {
          console.error(error);
          return;
        }

        const normalized = data.map((b: any) => ({
          id: b.id,
          date: b.date,
          hour: b.hour,
          fieldName: Array.isArray(b.fields)
            ? b.fields[0]?.name
            : b.fields?.name ?? '-',
        }));

        setBookings(normalized);
      });
  }, [date]);

  const deleteBooking = async (id: number) => {
    await supabase.from('bookings').delete().eq('id', id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setSelected(null);
  };

  return (
    <>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>
          Vista diaria
        </h2>

        {/* DATE PICKER AIRBNB STYLE */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'white',
            padding: '12px 18px',
            borderRadius: 14,
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ fontSize: 14, color: '#6b7280' }}>
            Día
          </span>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: 14,
              cursor: 'pointer',
            }}
          />
        </div>
      </div>

      {/* DAILY GRID (MISMO ESTILO WEEK) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr',
          backgroundColor: 'white',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        }}
      >
        {/* HEADER */}
        <div />
        <div
          style={{
            padding: 12,
            fontWeight: 600,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {new Date(date).toLocaleDateString('es-CR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </div>

        {/* GRID */}
        {HOURS.map((hour) => {
          const booking = bookings.find(
            (b) => b.hour === hour
          );

          return (
            <>
              {/* HOUR */}
              <div
                key={hour}
                style={{
                  padding: 10,
                  borderRight: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: 13,
                  color: '#6b7280',
                }}
              >
                {hour}
              </div>

              {/* SLOT */}
              <div
                style={{
                  padding: 10,
                  borderBottom: '1px solid #e5e7eb',
                  cursor: booking ? 'pointer' : 'default',
                }}
                onClick={() => booking && setSelected(booking)}
              >
                {booking && (
                  <div
                    style={{
                      backgroundColor: '#dcfce7',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 500,
                      width: 'fit-content',
                      minWidth: 260,
                    }}
                  >
                    {booking.fieldName}
                  </div>
                )}
              </div>
            </>
          );
        })}
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
  );
}
