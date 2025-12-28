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
  }[];
};

export default function AdminDashboard() {
  const { checking } = useAdminGuard();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chartData, setChartData] = useState<any>(null);

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

      const byDay: Record<string, number> = {};

      data.forEach((b) => {
        byDay[b.date] = (byDay[b.date] || 0) + 1;
      });

      setChartData({
        labels: Object.keys(byDay),
        datasets: [
          {
            label: 'Reservas por día',
            data: Object.values(byDay),
            backgroundColor: '#16a34a',
          },
        ],
      });
    };

    fetchData();
  }, [checking]);

  const exportCSV = () => {
    let csv = 'Fecha,Hora,Cancha,Precio\n';

    bookings.forEach((b) => {
      csv += `${b.date},${b.hour},${b.fields[0].name},${b.fields[0].price}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard.csv';
    a.click();
  };

  if (checking || !chartData) {
    return <p style={{ padding: 20 }}>Cargando dashboard…</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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

      <Bar data={chartData} />
    </main>
  );
}
