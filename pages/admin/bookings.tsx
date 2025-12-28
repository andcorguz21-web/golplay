import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';

type Booking = {
  id: number;
  date: string;
  hour: string;
  fields: {
    name: string;
  }[] | null;
};

export default function AdminBookings() {
  useAdminGuard();

  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        hour,
        fields:field_id (
          name
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setBookings(data || []);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const deleteBooking = async (id: number) => {
    if (!confirm('¿Eliminar esta reserva?')) return;
    await supabase.from('bookings').delete().eq('id', id);
    loadBookings();
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Reservas</h1>

      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Cancha</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.fields?.[0]?.name}</td>
              <td>{b.date}</td>
              <td>{b.hour}</td>
              <td>
                <button onClick={() => deleteBooking(b.id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
