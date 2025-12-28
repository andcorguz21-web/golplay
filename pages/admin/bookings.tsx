import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { logout } from '@/lib/logout';

type Booking = {
  id: number;
  date: string;
  hour: string;
  fields: {
    name: string;
  }[];
};

export default function AdminBookings() {
  const { checking } = useAdminGuard();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        hour,
        fields:field_id!inner (
          name
        )
      `)
      .order('date', { ascending: false });

    if (error || !data) {
      console.error('ERROR CARGANDO RESERVAS', error);
      return;
    }

    setBookings(data);
  };

  useEffect(() => {
    if (checking) return;
    loadBookings();
  }, [checking]);

  const deleteBooking = async (id: number) => {
    if (!confirm('¿Eliminar esta reserva?')) return;

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error eliminando la reserva');
      console.error(error);
      return;
    }

    loadBookings();
  };

  if (checking) {
    return <p style={{ padding: 20 }}>Cargando reservas…</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Reservas</h1>

        <button
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
        >
          Salir
        </button>
      </div>

      {/* TABLA */}
      <table border={1} cellPadding={8} cellSpacing={0}>
        <thead>
          <tr>
            <th>Cancha</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.fields[0].name}</td>
              <td>{b.date}</td>
              <td>{b.hour}</td>
              <td>
                <button onClick={() => deleteBooking(b.id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}

          {bookings.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center' }}>
                No hay reservas registradas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
