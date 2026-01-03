import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

import AdminHeader from '@/components/ui/admin/AdminHeader';

/* ===================== */
/* TYPES */
/* ===================== */

type Statement = {
  id: string;
  field_id: number;
  month: number;
  year: number;
  reservations_count: number;
  amount_due: number;
  due_date: string;
  paid_at: string | null;
  status: 'paid' | 'pending' | 'overdue';
};

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function BillingPage() {
  const router = useRouter();

  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===================== */
  /* AUTH */
  /* ===================== */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      }
    });
  }, [router]);

  /* ===================== */
  /* LOAD STATEMENTS */
  /* ===================== */

  const loadStatements = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('monthly_statements')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      console.error(error);
    }

    setStatements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStatements();
  }, []);

  /* ===================== */
  /* MARK AS PAID (SIMULADO) */
  /* ===================== */

  const markAsPaid = async (id: string) => {
    const ok = confirm('¿Marcar este mes como pagado?');
    if (!ok) return;

    await supabase
      .from('monthly_statements')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', id);

    loadStatements();
  };

  return (
    <>
      <AdminHeader />

      <main
        style={{
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* HEADER */}
          <div style={{ marginBottom: 30 }}>
            <h1 style={{ fontSize: 26 }}>Pagos & Facturación</h1>
            <p style={{ color: '#6b7280' }}>
              Resumen mensual de reservas y pagos de GolPlay
            </p>
          </div>

          {/* TABLE */}
          {loading && <p>Cargando estados de cuenta…</p>}

          {!loading && statements.length === 0 && (
            <p>No hay estados de cuenta generados</p>
          )}

          {!loading && statements.length > 0 && (
            <div
              style={{
                background: 'white',
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              }}
            >
              <table width="100%" cellPadding={16}>
                <thead
                  style={{
                    background: '#f3f4f6',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#374151',
                  }}
                >
                  <tr>
                    <th>Periodo</th>
                    <th>Reservas</th>
                    <th>Monto</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {statements.map((s) => (
                    <tr
                      key={s.id}
                      style={{ borderTop: '1px solid #e5e7eb' }}
                    >
                      <td>
                        {monthName(s.month)} {s.year}
                      </td>
                      <td>{s.reservations_count}</td>
                      <td>₡{s.amount_due}</td>
                      <td>{s.due_date}</td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td>
                        {s.status !== 'paid' && (
                          <button
                            onClick={() => markAsPaid(s.id)}
                            style={payBtn}
                          >
                            Pagar
                          </button>
                        )}
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: '#16a34a',
    pending: '#f59e0b',
    overdue: '#dc2626',
  };

  return (
    <span
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: 'white',
        backgroundColor: colors[status] || '#6b7280',
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

/* ===================== */
/* HELPERS */
/* ===================== */

function monthName(month: number) {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return names[month - 1] || '';
}

const payBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  backgroundColor: '#2563eb',
  color: 'white',
  cursor: 'pointer',
  fontSize: 13,
};
