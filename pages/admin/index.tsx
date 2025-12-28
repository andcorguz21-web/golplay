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
  id: number;
  date: string;
  hour: string;
  fields: {
    name: string;
    price: number;
  };
};

export default function AdminDashboard() {
  const { checking } = useAdminGuard();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [byDayData, setByDayData] = useState<any>(null);
  const [byFieldData, setByFieldData] = useState<any>(null);
  const [revenueByDay, setRevenueByDay] = useState<any>(null);
  const [revenueByField, setRevenueByField] = useState<any>(null);
  const [byHourData, setByHourData] = useState<any>(null);

  useEffect(() => {
    if (checking) return;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          hour,
          fields:field_id!inner (
            name,
            price
          )
        `);

      if (error || !data) {
        console.error('ERROR FETCH DASHBOARD', error);
        return;
      }

      setBookings(data);

      // ======================
      // AGREGACIONES
      // ======================
      const byDay: Record<string, number> = {};
      const byField: Record<string, number> = {};
      const revenueDay: Record<string, number> = {};
      const revenueField: Record<string, number> = {};
      const byHour: Record<string, number> = {};

      data.forEach((b) => {
        const fieldName = b.fields.name;
        const price = b.fields.price;

        byDay[b.date] = (byDay[b.date] || 0) + 1;
        byField[fieldName] = (byField[fieldName] || 0) + 1;

        revenueDay[b.date] = (revenueDay[b.date] || 0) + price;
        revenueField[fieldName] =
          (revenueField[fieldName] || 0) + price;

        byHour[b.hour] = (byHour[b.hour] || 0) + 1;
      });

      // ======================
      // DATASETS
      // ======================
      setByDayData({
        labels: Object.keys(byDay),
        datasets: [
          {
            label: 'Reservas por día',
            data: Object.values(byDay),
            backgroundColor: '#16a34a',
          },
        ],
      });

      setByFieldData({
        labels: Object.keys(byField),
        datasets: [
          {
            label: 'Reservas por cancha',
            data: Object.values(byField),
            backgroundColor: '#2563eb',
          },
        ],
      });

      setRevenueByDay({
        labels: Object.keys(revenueDay),
        datasets: [
          {
            label: 'Ingresos por día (₡)',
            data: Object.values(revenueDay),
            backgroundColor: '#22c55e',
          },
        ],
      });

      setRevenueByField({
        labels: Object.keys(revenueField),
        datasets: [
          {
            label: 'Ingresos por cancha (₡)',
            data: Object.values(revenueField),
            backgroundColor: '#f97316',
          },
        ],
      });

      setByHourData({
        labels: Object.keys(byHour),
        datasets: [
          {
            label: 'Reservas por hora',
            data: Object.values(byHour),
            backgroundColor: '#7c3aed',
          },
        ],
      });
    };

    fetchData();
  }, [checking]);

  // ======================
  // KPIs
  // ======================
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce(
    (sum, b) => sum + b.fields.price,
    0
  );

  const topField = Object.entries(
    bookings.reduce((acc: any, b) => {
      acc[b.fields.name] = (acc[b.fields.name] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]?.[0];

  const exportCSV = () => {
    let csv = 'Fecha,Hora,Cancha,Precio\n';

    bookings.forEach((b) => {
      csv += `${b.date},${b.hour},${b.fields.name},${b.fields.price}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard.csv';
    a.click();
  };

  if (
    checking ||
    !byDayData ||
    !byFieldData ||
    !revenueByDay ||
    !revenueByField ||
    !byHourData
  ) {
    return <p style={{ padding: 20 }}>Cargando dashboard…</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h1>Dashboard</h1>

        <div>
          <button onClick={exportCSV}>Exportar CSV</button>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            style={{ marginLeft: 10 }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
        <div>📅 Reservas: {totalBookings}</div>
        <div>💰 Ingresos: ₡{totalRevenue}</div>
        <div>🏆 Top cancha: {topField}</div>
      </div>

      {/* GRÁFICOS */}
      <Bar data={byDayData} />
      <Bar data={byFieldData} />
      <Bar data={revenueByDay} />
      <Bar data={revenueByField} />
      <Bar data={byHourData} />
    </main>
  );
}
