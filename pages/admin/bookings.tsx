import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/ui/admin/AdminHeader';

type Booking = {
  id: number;
  date: string;
  hour: string;
  fieldName: string;
};

export default function AdminBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
    });
  }, [router]);

  useEffect(() => {
    supabase
      .from('bookings')
      .select(`
        id,
        date,
        hour,
        fields:field_id!inner (
          name
        )
      `)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setBookings(
          (data || []).map((b: any) => ({
            id: b.id,
            date: formatDate(b.date),
            hour: b.hour,
            fieldName: b.fields.name,
          }))
        );
      });
  }, []);

  return (
    <>
      <AdminHeader />

      <main style={{ background: '#f9fafb', minHeight: '100vh', padding: 32 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, marginBottom: 24 }}>Reservas</h1>

          <div
            style={{
              background: 'white',
              borderRadius: 20,
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <table width="100%" cellPadding={16}>
              <thead style={{ background: '#f9fafb' }}>
                <tr style={{ textAlign: 'left', fontSize: 13, color: '#6b7280' }}>
                  <th>Cancha</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td>{b.fieldName}</td>
                    <td>{b.date}</td>
                    <td>{b.hour}</td>
                    <td>
                      <span
                        style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        Confirmada
                      </span>
                    </td>
                  </tr>
                ))}

                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 30 }}>
                      No hay reservas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
