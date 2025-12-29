import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

import AdminHeader from '@/components/ui/admin/AdminHeader';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

/* ===================== */
/* HELPERS */
/* ===================== */

function normalizeField(f: any) {
  if (!f) return null;
  if (Array.isArray(f)) return f[0] ?? null;
  return f;
}

/* ===================== */
/* CHART OPTIONS */
/* ===================== */

const barOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    datalabels: {
      color: '#111827',
      anchor: 'end',
      align: 'top',
      font: { weight: '600', size: 12 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#374151', font: { size: 12 } },
    },
    y: {
      display: false,
      grid: { display: false },
    },
  },
};

const pieOptions = {
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { boxWidth: 12, font: { size: 12 } },
    },
    datalabels: {
      color: '#fff',
      font: { weight: '600', size: 12 },
      formatter: (value: number, ctx: any) => {
        const total = ctx.chart.data.datasets[0].data.reduce(
          (a: number, b: number) => a + b,
          0
        );
        return `${((value / total) * 100).toFixed(1)}%`;
      },
    },
  },
};

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function AdminDashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [charts, setCharts] = useState<any>(null);
  const [latestBookings, setLatestBookings] = useState<any[]>([]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* AUTH */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
      else setReady(true);
    });
  }, [router]);

  /* LOAD DATA */
  const loadData = async () => {
    let query = supabase
      .from('bookings')
      .select(
        `
        date,
        hour,
        fields:field_id (
          name,
          price
        )
      `
      )
      .order('date', { ascending: true });

    if (fromDate) query = query.gte('date', fromDate);
    if (toDate) query = query.lte('date', toDate);

    const { data } = await query;
    if (!data) return;

    const byDay: Record<string, number> = {};
    const byField: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    const revenueByField: Record<string, number> = {};
    let totalRevenue = 0;

    data.forEach((b: any) => {
      const field = normalizeField(b.fields);
      if (!field) return;

      byDay[b.date] = (byDay[b.date] || 0) + 1;
      byField[field.name] = (byField[field.name] || 0) + 1;
      byHour[b.hour] = (byHour[b.hour] || 0) + 1;
      revenueByField[field.name] =
        (revenueByField[field.name] || 0) + field.price;

      totalRevenue += field.price;
    });

    setLatestBookings(
      data.slice(-5).reverse().map((b: any) => {
        const field = normalizeField(b.fields);
        return {
          date: b.date,
          hour: b.hour,
          fieldName: field?.name ?? '-',
          price: field?.price ?? 0,
        };
      })
    );

    setCharts({
      totalRevenue,
      totalBookings: data.length,
      activeFields: Object.keys(byField).length,

      byDay: {
        labels: Object.keys(byDay),
        datasets: [{ data: Object.values(byDay), backgroundColor: '#16a34a' }],
      },

      byField: {
        labels: Object.keys(byField),
        datasets: [{ data: Object.values(byField), backgroundColor: '#2563eb' }],
      },

      byHour: {
        labels: Object.keys(byHour),
        datasets: [{ data: Object.values(byHour), backgroundColor: '#9333ea' }],
      },

      revenueDistribution: {
        labels: Object.keys(revenueByField),
        datasets: [
          {
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
    });
  };

  useEffect(() => {
    if (ready) loadData();
  }, [ready, fromDate, toDate]);

  /* CSV EXPORT */
  const exportCSV = () => {
    let csv = 'Cancha,Fecha,Hora,Precio\n';

    latestBookings.forEach((b) => {
      csv += `${b.fieldName},${b.date},${b.hour},${b.price}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_reservas.csv';
    a.click();
  };

  if (!ready || !charts) {
    return <p style={{ padding: 20 }}>Cargando dashboard…</p>;
  }

  return (
    <>
      <AdminHeader />

      <main style={{ background: '#f9fafb', minHeight: '100vh', padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* ===================== */}
          {/* FILTROS BONITOS */}
          {/* ===================== */}
          <section
            style={{
              background: 'white',
              borderRadius: 18,
              padding: 20,
              marginBottom: 30,
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              display: 'flex',
              gap: 20,
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <FilterInput
              label="Desde"
              value={fromDate}
              onChange={setFromDate}
            />

            <FilterInput
              label="Hasta"
              value={toDate}
              onChange={setToDate}
            />

            <button
              onClick={exportCSV}
              style={{
                marginLeft: 'auto',
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: '#2563eb',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Descargar reporte
            </button>
          </section>

          {/* KPIs */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
              gap: 20,
            }}
          >
            <Stat title="Reservas" value={charts.totalBookings} />
            <Stat title="Ingresos" value={`₡${charts.totalRevenue}`} />
            <Stat title="Canchas activas" value={charts.activeFields} />
          </section>

          {/* CHARTS */}
          <ChartCard title="Reservas por día">
            <Bar data={charts.byDay} options={barOptions} />
          </ChartCard>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))',
              gap: 30,
            }}
          >
            <ChartCard title="Reservas por cancha">
              <Bar data={charts.byField} options={barOptions} />
            </ChartCard>

            <ChartCard title="Reservas por hora">
              <Bar data={charts.byHour} options={barOptions} />
            </ChartCard>

            <ChartCard title="Distribución de ingresos">
              <Pie data={charts.revenueDistribution} options={pieOptions} />
            </ChartCard>
          </div>

          {/* ÚLTIMAS */}
          <ChartCard title="Últimas reservas">
            <table width="100%">
              <thead>
                <tr>
                  <th>Cancha</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {latestBookings.map((b, i) => (
                  <tr key={i}>
                    <td>{b.fieldName}</td>
                    <td>{b.date}</td>
                    <td>{b.hour}</td>
                    <td>₡{b.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        </div>
      </main>
    </>
  );
}

/* ===================== */
/* UI */
/* ===================== */

function FilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, color: '#6b7280' }}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          fontSize: 14,
        }}
      />
    </div>
  );
}

function Stat({ title, value }: any) {
  return (
    <div style={{ background: '#fff', padding: 20, borderRadius: 16 }}>
      <p style={{ fontSize: 13, color: '#6b7280' }}>{title}</p>
      <p style={{ fontSize: 26, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <section
      style={{
        background: '#fff',
        padding: 24,
        borderRadius: 18,
        marginTop: 30,
      }}
    >
      <h3 style={{ marginBottom: 16 }}>{title}</h3>
      {children}
    </section>
  );
}
