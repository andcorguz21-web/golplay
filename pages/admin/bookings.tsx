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
  }[] | null;
};

export default function AdminBookings() {
  const { checking } = useAdminGuard();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (checking) return;

    const fetchBookings = async () => {
      const { data } = await supabase
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

      setBookings((data as Booking[]) || []);
    };

    fetchBookings();
  }, [checking]);

  if (checking) return <p style={{ padding: 20 }}>Cargando...</p>;

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Reservas</h1>
        <button
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          style={{ background: 'red', color: 'white' }}
        >
          Salir
        </button>
      </div>

      <table border={1} cellPadding={6} style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Cancha</th>
            <th>Fecha</th>
            <th>Hora</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.fields?.[0]?.name}</td>
              <td>{b.date}</td>
              <td>{b.hour}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
