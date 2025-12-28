import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { logout } from '@/lib/logout';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

type Booking = {
  date: string;
  fields: {
    name: string;
    price: number;
  } | null;
};

export default function AdminDashboard() {
  const { checking } = useAdminGuard();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [byDay, setByDay] = useState<any>(null);
  const [byField, setByField] = useState<any>(null);
  const [revenueDay, setRevenueDay] = useState<any>(null);

  useEffect(() => {
    if (checking) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          date,
          fields:field_id (
            name,
            price
          )
        `);

      if (!data) return;

      const d: Record<string, number> = {};
      const f: Record<string, number> = {};
      const r: Record<string, number> = {};

      data.forEach((b: Booking) => {
        if (!b.fields) return;

        d[b.date] = (d[b.date] || 0) + 1;
        f[b.fields.name] = (f[b.fields.name] || 0) + 1;
        r[b.date] = (r[b.date] || 0) + b.fields.price;
      });

      setByDay(build(d, 'Reservas por día', '#16a34a'));
      setByField(build(f, 'Reservas por cancha', '#2563eb'));
      setRevenueDay(build(r, 'Ingresos por día (₡)', '#f59e0b'));

      setLoading(false);
    };

    fetchData();
  }, [checking]);

  if (checking || loading) {
    return <p style={{ padding: 20 }}>Cargando dashboard...</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Dashboard</h1>
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

      <Section title="Reservas por día" data={byDay} />
      <Section title="Reservas por cancha" data={byField} />
      <Section title="Ingresos por día" data={revenueDay} />
    </main>
  );
}

function Section({ title, data }: any) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2>{title}</h2>
      <Bar data={data} />
    </section>
  );
}

function build(obj: Record<string, number>, label: string, color: string) {
  const keys = Object.keys(obj).sort();
  return {
    labels: keys,
    datasets: [
      {
        label,
        data: keys.map((k) => obj[k]),
        backgroundColor: color,
      },
    ],
  };
}
