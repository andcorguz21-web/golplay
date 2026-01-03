import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import AdminHeader from '@/components/ui/admin/AdminHeader';

/* ===================== */
/* TYPES */
/* ===================== */

type Statement = {
  id: string;
  month: number;
  year: number;
  reservations_count: number;
  amount_due: number;
  status: 'paid' | 'pending' | 'overdue';
  due_date: string;
};

/* ===================== */
/* HELPERS */
/* ===================== */

const formatCRC = (value: number) =>
  `₡${value.toLocaleString('es-CR')}`;

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function PaymentsIndexPage() {
  const router = useRouter();
  const [statements, setStatements] = useState<Statement[]>([]);
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
  /* LOAD DATA */
  /* ===================== */

  const loadStatements = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('monthly_statements')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    setStatements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStatements();
  }, []);

  return (
    <>
      <AdminHeader />

      <main style={container}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={pageTitle}>Pagos y facturación</h1>

          {!loading && statements.length === 0 && (
            <p style={emptyText}>No hay registros aún.</p>
          )}

          {!loading && statements.length > 0 && (
            <section style={table}>
              {statements.map((s) => {
                const isPaid = s.status === 'paid';
                const isOverdue = s.status === 'overdue';

                return (
                  <div key={s.id} style={row}>
                    <div style={monthCol}>
                      <strong>
                        {s.month}/{s.year}
                      </strong>
                    </div>

                    <div>{s.reservations_count} reservas</div>

                    <div>{formatCRC(s.amount_due)}</div>

                    <div>
                      <StatusBadge status={s.status} />
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {!isPaid && (
                        <button
                          style={{
                            ...payBtn,
                            opacity: isOverdue ? 0.45 : 1,
                            cursor: isOverdue
                              ? 'not-allowed'
                              : 'pointer',
                          }}
                          disabled={isOverdue}
                          onClick={() =>
                            !isOverdue &&
                            router.push(`/admin/payments/${s.id}`)
                          }
                        >
                          Ir a pagar
                        </button>
                      )}

                      {isPaid && (
                        <button
                          onClick={() =>
                            router.push(`/admin/payments/${s.id}`)
                          }
                          style={linkBtn}
                        >
                          Ver detalle →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </>
  );
}

/* ===================== */
/* STATUS BADGE */
/* ===================== */

const StatusBadge = ({ status }: { status: string }) => {
  const map: any = {
    paid: { text: 'Pagado', bg: '#16a34a' },
    pending: { text: 'Pendiente', bg: '#f59e0b' },
    overdue: { text: 'Moroso', bg: '#dc2626' },
  };

  return (
    <span
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: 'white',
        background: map[status].bg,
      }}
    >
      {map[status].text}
    </span>
  );
};

/* ===================== */
/* STYLES */
/* ===================== */

const container = {
  background: '#f9fafb',
  minHeight: '100vh',
  padding: 32,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
};

const pageTitle = {
  fontSize: 26,
  fontWeight: 600,
  marginBottom: 24,
};

const emptyText = {
  fontSize: 14,
  color: '#6b7280',
};

const table = {
  display: 'grid',
  gap: 14,
};

const row = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr 1fr 1fr auto',
  alignItems: 'center',
  background: 'white',
  padding: 18,
  borderRadius: 16,
  boxShadow: '0 8px 20px rgba(0,0,0,.08)',
};

const monthCol = {
  fontSize: 15,
  fontWeight: 600,
};

const payBtn = {
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontSize: 13,
};

const linkBtn = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  fontSize: 13,
  cursor: 'pointer',
};
