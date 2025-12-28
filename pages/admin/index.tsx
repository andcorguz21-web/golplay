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

type Booking = {
  date: string;
  hour: string;
  fields: {
    name: string;
    price: number;
  }[];
};

export default function AdminDashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [charts, setCharts] = useState<any>(null);

  // =========================
  // AUTH SIMPLE (PROD SAFE)
  // =========================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });
  }, [router]);

  // =========================
  // LOAD & BUILD METRICS
  // =========================
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
          console.error(error);
          return;
        }

        const byDay: Record<string, number> = {};
        const byField: Record<string, number> = {};
        const revenueByField: Record<string, number> = {};
        const byHour: Record<string, number> = {};
        const byWeekDay: Record<string, number> = {};
        let totalRevenue = 0;

        data.forEach((b: Booking) => {
          const field = b.fields?.[0];
          if (!field) return;

          // reservas por día
          byDay[b.date] = (byDay[b.date] || 0) + 1;

          // reservas por cancha
          byField[field.name] = (byField[field.name] || 0) + 1;

          // ingresos por cancha
          revenueByField[field.name] =
            (revenueByField[field.name] || 0) + field.price;

          // horas pico
          byHour[b.hour] = (byHour[b.hour] || 0) + 1;

          // día de la semana
          const day = new Date(b.date).toLocaleDateString('es-CR', {
            weekday: 'long',
          });
          byWeekDay[day] = (byWeekDay[day] || 0) + 1;

          totalRevenue += field.price;
        });

        setCharts({
          reservationsByDay: {
            labels: Object.keys(byDay),
            datasets: [
              {
                label: 'Reservas por día',
                data: Object.values(byDay),
                backgroundColor: '#16a34a',
              },
            ],
          },

          reservationsByField: {
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

          reservationsByHour: {
            labels: Object.keys(byHour),
            datasets: [
              {
                label: 'Reservas por hora',
                data: Object.values(byHour),
                backgroundColor: '#9333ea',
              },
            ],
          },

          reservationsByWeekDay: {
            labels: Object.keys(byWeekDay),
            datasets: [
              {
                label: 'Reservas por día de la semana',
                data: Object.values(byWeekDay),
                backgroundColor: '#0ea5e9',
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

      {/* GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 30,
          marginTop: 30,
        }}
      >
        <Bar data={charts.reservationsByDay} />
        <Bar data={charts.reservationsByField} />
        <Bar data={charts.revenueByField} />
        <Bar data={charts.reservationsByHour} />
        <Bar data={charts.reservationsByWeekDay} />
        <Pie data={charts.revenueDistribution} />
      </div>
    </main>
  );
}
