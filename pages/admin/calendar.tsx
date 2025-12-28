import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

type Field = {
  id: number;
  name: string;
};

type Booking = {
  hour: string;
};

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

function CalendarPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<Booking[]>([]);

  // ======================
  // AUTH (CLIENT ONLY)
  // ======================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });
  }, [router]);

  // ======================
  // LOAD FIELDS
  // ======================
  useEffect(() => {
    if (!ready) return;

    supabase.from('fields').select('id,name').then(({ data }) => {
      if (data && data.length > 0) {
        setFields(data);
        setFieldId(data[0].id);
      }
    });
  }, [ready]);

  // ======================
  // LOAD BOOKINGS
  // ======================
  useEffect(() => {
    if (!fieldId) return;

    supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', fieldId)
      .eq('date', date)
      .then(({ data }) => {
        setBookings(data || []);
      });
  }, [fieldId, date]);

  const isReserved = (hour: string) =>
    bookings.some((b) => b.hour === hour);

  if (!ready) {
    return <p style={{ padding: 20 }}>Cargando calendario…</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Calendario por cancha</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select
          value={fieldId ?? ''}
          onChange={(e) => setFieldId(Number(e.target.value))}
        >
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) => (
            <tr
              key={h}
              style={{
                backgroundColor: isReserved(h) ? '#fee2e2' : '#dcfce7',
              }}
            >
              <td>{h}</td>
              <td>{isReserved(h) ? 'Reservado' : 'Disponible'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

// 🚨 CLAVE PARA VERCEL: DESACTIVAR SSR
export default dynamic(() => Promise.resolve(CalendarPage), {
  ssr: false,
});
