import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

type Field = {
  id: number;
  name: string;
};

type Booking = {
  date: string;
  hour: string;
};

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

export default function AdminCalendar() {
  const router = useRouter();

  const [sessionReady, setSessionReady] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // ======================
  // GUARD SIMPLE (PRODUCCIÓN SAFE)
  // ======================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setSessionReady(true);
      }
    });
  }, [router]);

  // ======================
  // CARGAR CANCHAS
  // ======================
  useEffect(() => {
    if (!sessionReady) return;

    supabase
      .from('fields')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }

        if (data && data.length > 0) {
          setFields(data);
          setSelectedField(data[0].id);
        }
      });
  }, [sessionReady]);

  // ======================
  // CARGAR RESERVAS
  // ======================
  useEffect(() => {
    if (!sessionReady || !selectedField) return;

    supabase
      .from('bookings')
      .select('date, hour')
      .eq('field_id', selectedField)
      .eq('date', date)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }

        setBookings(data || []);
      });
  }, [sessionReady, selectedField, date]);

  const isReserved = (hour: string) =>
    bookings.some((b) => b.hour === hour);

  if (!sessionReady) {
    return <p style={{ padding: 20 }}>Cargando calendario…</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Calendario por cancha</h1>

      {/* CONTROLES */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select
          value={selectedField ?? ''}
          onChange={(e) => setSelectedField(Number(e.target.value))}
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

      {/* CALENDARIO */}
      <table border={1} cellPadding={10} cellSpacing={0}>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => {
            const reserved = isReserved(hour);

            return (
              <tr
                key={hour}
                style={{
                  backgroundColor: reserved ? '#fee2e2' : '#dcfce7',
                }}
              >
                <td>{hour}</td>
                <td>{reserved ? 'Reservado' : 'Disponible'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
