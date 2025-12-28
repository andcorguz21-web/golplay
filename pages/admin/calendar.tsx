import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';

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
  useAdminGuard();

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // ======================
  // CARGAR CANCHAS
  // ======================
  useEffect(() => {
    supabase
      .from('fields')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setFields(data);
          setSelectedField(data[0]?.id ?? null);
        }
      });
  }, []);

  // ======================
  // CARGAR RESERVAS
  // ======================
  useEffect(() => {
    if (!selectedField) return;

    supabase
      .from('bookings')
      .select('date, hour')
      .eq('field_id', selectedField)
      .eq('date', date)
      .then(({ data }) => {
        setBookings(data || []);
      });
  }, [selectedField, date]);

  const isReserved = (hour: string) =>
    bookings.some((b) => b.hour === hour);

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
      <table border={1} cellPadding={10}>
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
                  background: reserved ? '#fee2e2' : '#dcfce7',
                }}
              >
                <td>{hour}</td>
                <td>
                  {reserved ? 'Reservado' : 'Disponible'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
