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
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          setFieldId(data[0].id);
        }
      });
  }, [ready]);

  // ======================
  // LOAD BOOKINGS
  // ======================
  const loadBookings = async () => {
    if (!fieldId) return;

    const { data, error } = await supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', fieldId)
      .eq('date', date);

    if (error) {
      console.error(error);
      return;
    }

    setBookings(data || []);
  };

  useEffect(() => {
    loadBookings();
    // limpiar selección al cambiar filtros
    setSelectedHour(null);
  }, [fieldId, date]);

  const isReserved = (hour: string) =>
    bookings.some((b) => b.hour === hour);

  // ======================
  // CREATE BOOKING
  // ======================
  const createBooking = async () => {
    if (!fieldId || !selectedHour) return;

    setLoading(true);

    const { error } = await supabase
      .from('bookings')
      .insert({
        field_id: fieldId,
        date,
        hour: selectedHour,
      });

    if (error) {
      // 🔒 MANEJO DE CONCURRENCIA (UNIQUE CONSTRAINT)
      if (error.code === '23505') {
        alert('⚠️ Esa hora acaba de ser reservada por otro usuario.');
      } else {
        alert('❌ Error creando la reserva');
      }
      console.error(error);
      setLoading(false);
      // refrescar por si otro usuario ganó la carrera
      await loadBookings();
      setSelectedHour(null);
      return;
    }

    await loadBookings();
    setSelectedHour(null);
    setLoading(false);
  };

  if (!ready) {
    return <p style={{ padding: 20 }}>Cargando calendario…</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Calendario por cancha</h1>

      {/* CONTROLES */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select
          value={fieldId ?? ''}
          onChange={(e) => setFieldId(Number(e.target.value))}
          disabled={loading}
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
          disabled={loading}
        />
      </div>

      {/* CALENDAR */}
      <table border={1} cellPadding={10} cellSpacing={0}>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) => {
            const reserved = isReserved(h);
            const selected = selectedHour === h;

            return (
              <tr
                key={h}
                onClick={() => {
                  if (reserved || loading) return;
                  setSelectedHour(h);
                }}
                style={{
                  cursor: reserved ? 'not-allowed' : 'pointer',
                  backgroundColor: reserved
                    ? '#fee2e2'
                    : selected
                    ? '#bbf7d0'
                    : '#dcfce7',
                }}
              >
                <td>{h}</td>
                <td>
                  {reserved
                    ? 'Reservado'
                    : selected
                    ? 'Seleccionado'
                    : 'Disponible'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* CONFIRMACIÓN */}
      {selectedHour && (
        <div style={{ marginTop: 20 }}>
          <p>
            Reservar <strong>{selectedHour}</strong> el día{' '}
            <strong>{date}</strong>
          </p>

          <button onClick={createBooking} disabled={loading}>
            {loading ? 'Reservando…' : 'Confirmar reserva'}
          </button>

          <button
            onClick={() => setSelectedHour(null)}
            style={{ marginLeft: 10 }}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      )}
    </main>
  );
}

// 🚨 CLAVE PARA VERCEL: DESACTIVAR SSR
export default dynamic(() => Promise.resolve(CalendarPage), {
  ssr: false,
});
