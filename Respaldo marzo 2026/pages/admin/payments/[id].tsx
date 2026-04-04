import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/ui/admin/AdminLayout';

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
  status: 'paid' | 'pending' | 'overdue';
  due_date: string;
  paid_at?: string;
};

/* ===================== */
/* HELPERS */
/* ===================== */

const formatCRC = (value: number) =>
  `₡${value.toLocaleString('es-CR')}`;

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function PaymentDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [statement, setStatement] = useState<Statement | null>(null);
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
  /* LOAD STATEMENT */
  /* ===================== */

  const loadStatement = async () => {
    if (!id) return;

    setLoading(true);

    const { data } = await supabase
      .from('monthly_statements')
      .select('*')
      .eq('id', id)
      .single();

    setStatement(data || null);
    setLoading(false);
  };

  useEffect(() => {
    loadStatement();
  }, [id]);

  /* ===================== */
  /* MARK AS PAID */
  /* ===================== */

  const markAsPaid = async () => {
    if (!statement) return;

    const ok = confirm('¿Confirmar que este mes ya fue pagado?');
    if (!ok) return;

    await supabase
      .from('monthly_statements')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', statement.id);

    await supabase
      .from('fields')
      .update({ active: true })
      .eq('id', statement.field_id);

    loadStatement();
  };

  /* ===================== */
  /* UI GUARDS */
  /* ===================== */

  if (!statement) {
    return (
      <AdminLayout>
        <main style={container} />
      </AdminLayout>
    );
  }

  const isLate =
    statement.status !== 'paid' &&
    new Date() > new Date(statement.due_date);

  /* ===================== */
  /* UI */
  /* ===================== */

  return (
    <AdminLayout>
      <main style={container}>
        <div style={card}>
          <h1 style={pageTitle}>
            Pago {statement.month}/{statement.year}
          </h1>

          <div style={grid}>
            <Info label="Reservas del mes" value={statement.reservations_count} />
            <Info label="Monto a pagar" value={formatCRC(statement.amount_due)} />
            <Info
              label="Fecha límite"
              value={new Date(statement.due_date).toLocaleDateString('es-CR')}
            />
            <Info label="Estado" value={<StatusBadge status={statement.status} />} />
          </div>

          {isLate && (
            <div style={alert}>
              ⚠️ Este pago está vencido.  
              Si supera los 5 días de atraso, la cancha se desactiva automáticamente.
            </div>
          )}

          {statement.status !== 'paid' && (
            <button style={payBtn} onClick={markAsPaid}>
              Marcar como pagado
            </button>
          )}

          {statement.status === 'paid' && statement.paid_at && (
            <p style={paidText}>
              Pagado el{' '}
              {new Date(statement.paid_at).toLocaleString('es-CR')}
            </p>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

/* ===================== */
/* UI COMPONENTS */
/* ===================== */

const Info = ({ label, value }: any) => (
  <div>
    <p style={infoLabel}>{label}</p>
    <p style={infoValue}>{value}</p>
  </div>
);

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
};

const card = {
  maxWidth: 600,
  margin: '0 auto',
  background: 'white',
  padding: 28,
  borderRadius: 20,
  boxShadow: '0 12px 30px rgba(0,0,0,.1)',
};

const pageTitle = {
  fontSize: 26,
  fontWeight: 600,
  marginBottom: 22,
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
  gap: 20,
  marginBottom: 24,
};

const infoLabel = {
  fontSize: 12,
  color: '#6b7280',
};

const infoValue = {
  fontSize: 18,
  fontWeight: 600,
};

const alert = {
  background: '#fee2e2',
  border: '1px solid #fecaca',
  color: '#7f1d1d',
  padding: 14,
  borderRadius: 12,
  marginBottom: 20,
  fontSize: 14,
};

const payBtn = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontSize: 15,
  cursor: 'pointer',
};

const paidText = {
  marginTop: 16,
  fontSize: 13,
  color: '#6b7280',
};
