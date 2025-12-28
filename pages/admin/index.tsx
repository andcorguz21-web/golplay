import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { logout } from '@/lib/logout';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

// ======================
// NORMALIZADOR CLAVE
// ======================
function normalizeField(f: any) {
  if (!f) return null;
  if (Array.isArray(f)) return f[0] ?? null;
  return f;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [charts, setCharts] = useState<any>(null);

  // ======================
  // AUTH SIMPLE (PROD SAFE)
  // ======================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });
  }, [router]);

  // ======================
  // LOAD DATA + METRICS
  // ======================
  useEffect(() => {
    if (!ready) return;

    supabase
      .from('bookings')
      .select(`
        date,
        hour,
        fields:field_id (
          name,
          price
        )
      `)
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('DASHBOARD ERROR', error);
          return;
        }

        const byDay: Record<string, number> = {};
        const byField: Record<string, number> = {};
        const revenueByField: Record<string, number> = {};
        const byHour: Record<string, number> = {};
        let totalRevenue = 0;

        data.forEach((b: any) => {
          const field = normalizeField(b.fields);
          if (!field) return;

          byDay[b.date] = (byDay[b.date] || 0) + 1;
          byField[field.name] = (byField[field.name] || 0) + 1;
          revenueByField[field.name] =
            (revenueByField[field.name] || 0) + field.price;
          byHour[b.hour] = (byHour[b.hour] || 0) + 1;

          totalRevenue += field.price;
        });

        setCharts({
          byDay: {
            labels: Object.keys(byDay),
            datasets: [
              {
                label: 'Reservas por día',
                data: Object.values(byDay),
                backgroundColor: '#16a34a',
              },
            ],
          },

          byField: {
            labels: Object.keys(byField),
            datasets: [
              {
                label: 'Reservas por cancha',
                data: Object.values(byField),
                backgroundColor: '#2563eb',
              },
            ],
          },

          revenueByField: {
            labels: Object.keys(revenueByField),
            datasets: [
              {
                label: 'Ingresos por cancha (₡)',
                data: Object.values(revenueByField),
                backgroundColor: '#f59e0b',
              },
            ],
          },

          byHour: {
            labels: Object.keys(byHour),
            datasets: [
              {
                label: 'Reservas por hora',
                data: Object.values(byHour),
                backgroundColor: '#9333ea',
              },
            ],
          },

          revenueDistribution: {
            labels: Object.keys(revenueByField),
            datasets: [
              {
                label: 'Distribución de ingresos',
                data: Object.values(revenueByField),
                backgroundColor: [
                  '#16a34a',
                  '#2563eb',
                  '#f59e0b',
                  '#9333ea',
                  '#0ea5e9',
                ],
              },
            ],
          },

          totalRevenue,
        });
      });
  }, [ready]);

  if (!ready || !charts) {
    return <p style={{ padding: 20 }}>Cargando dashboard…</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Dashboard</h1>

        <div>
          <strong style={{ marginRight: 20 }}>
            Ingresos totales: ₡{charts.totalRevenue}
          </strong>

          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* GRAFICOS SEPARADOS */}
      <section style={{ marginTop: 30 }}>
        <h3>Reservas por día</h3>
        <Bar data={charts.byDay} />
      </section>

      <section>
        <h3>Reservas por cancha</h3>
        <Bar data={charts.byField} />
      </section>

      <section>
        <h3>Ingresos por cancha</h3>
        <Bar data={charts.revenueByField} />
      </section>

      <section>
        <h3>Reservas por hora</h3>
        <Bar data={charts.byHour} />
      </section>

      <section>
        <h3>Distribución de ingresos</h3>
        <Pie data={charts.revenueDistribution} />
      </section>
    </main>
  );
}
