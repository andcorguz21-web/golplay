import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/ui/admin/AdminHeader';

import Loader from '@/components/ui/Loader';
import { PageTitle } from '@/components/ui/Typography';
import { formatDateSpanish } from '@/lib/dates';

/* ===================== */
/* TYPES */
/* ===================== */

type Booking = {
  id: number;
  date: string;
  hour: string;
  fieldName: string;
};

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function AdminBookings() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===================== */
  /* AUTH */
  /* ===================== */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
    });
  }, [router]);

  /* ===================== */
  /* LOAD BOOKINGS */
  /* ===================== */

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);

      const { data } = await supabase
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

      setBookings(
        (data || []).map((b: any) => ({
          id: b.id,
          date: b.date,
          hour: b.hour,
          fieldName: b.fields.name,
        }))
      );

      setLoading(false);
    };

    loadBookings();
  }, []);

  /* ===================== */
  /* UI */
  /* ===================== */

  return (
    <>
      <AdminHeader />

      <main style={container}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <PageTitle>Reservas</PageTitle>

          {loading && <Loader label="Cargando reservas" />}

          {!loading && bookings.length === 0 && (
            <EmptyState />
          )}

          {!loading && bookings.length > 0 && (
            <div style={tableWrapper}>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <thead>
                  <tr style={theadRow}>
                    <th style={th}>Cancha</th>
                    <th style={th}>Fecha</th>
                    <th style={th}>Hora</th>
                    <th style={th}>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} style={tbodyRow}>
                      <td style={td}>{b.fieldName}</td>
                      <td style={td}>{formatDateSpanish(b.date)}</td>
                      <td style={td}>{b.hour}</td>
                      <td style={td}>
                        <StatusBadge />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

/* ===================== */
/* UI COMPONENTS */
/* ===================== */

function StatusBadge() {
  return (
    <span style={badge}>
      Confirmada
    </span>
  );
}

function EmptyState() {
  return (
    <div style={empty}>
      <p style={{ fontSize: 15, color: '#6b7280' }}>
        No hay reservas registradas aún
      </p>
    </div>
  );
}

/* ===================== */
/* STYLES */
/* ===================== */

const container = {
  background: '#f9fafb',
  minHeight: '100vh',
  padding: 32,
};

const tableWrapper = {
  background: 'white',
  borderRadius: 20,
  overflow: 'hidden',
  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
};

const theadRow = {
  background: '#f9fafb',
  textAlign: 'left' as const,
};

const th = {
  padding: '14px 18px',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
};

const tbodyRow = {
  borderTop: '1px solid #e5e7eb',
};

const td = {
  padding: '16px 18px',
  fontSize: 14,
  color: '#111827',
};

const badge = {
  background: '#dcfce7',
  color: '#166534',
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};

const empty = {
  background: 'white',
  borderRadius: 20,
  padding: 40,
  marginTop: 20,
  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
  textAlign: 'center' as const,
};
