import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/ui/admin/AdminHeader';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
} from 'chart.js';

import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Pie } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import * as XLSX from 'xlsx';

/* ===================== */
/* CHART REGISTER */
/* ===================== */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  ChartDataLabels
);

/* ===================== */
/* HELPERS */
/* ===================== */
const formatCRC = (v: number) => `₡${v.toLocaleString('es-CR')}`;

function normalizeField(f: any) {
  if (!f) return null;
  if (Array.isArray(f)) return f[0];
  return f;
}

/* ===================== */
/* COMPONENT */
/* ===================== */
export default function AdminDashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [charts, setCharts] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [fieldId, setFieldId] = useState('all');

  const [openCalendar, setOpenCalendar] =
    useState<'from' | 'to' | null>(null);

  const [openFieldSelect, setOpenFieldSelect] = useState(false);

  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  /* ===================== */
  /* AUTH */
  /* ===================== */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
      else setReady(true);
    });
  }, [router]);

  /* ===================== */
  /* LOAD FIELDS */
  /* ===================== */
  useEffect(() => {
    supabase
      .from('fields')
      .select('id, name')
      .order('name')
      .then(({ data }) => setFields(data || []));
  }, []);

  /* ===================== */
  /* LOAD DATA */
  /* ===================== */
  useEffect(() => {
    if (!ready) return;

    const loadData = async () => {
      let query = supabase
        .from('bookings')
        .select(`
          date,
          hour,
          fields:field_id (
            id,
            name,
            price
          )
        `)
        .order('date', { ascending: true });

      if (fromDate) query = query.gte('date', fromDate);
      if (toDate) query = query.lte('date', toDate);

      const { data } = await query;
      if (!data) return;

      const filtered =
        fieldId === 'all'
          ? data
          : data.filter(
              (b: any) =>
                normalizeField(b.fields)?.id === Number(fieldId)
            );

      setRows(filtered);

      const byDay: any = {};
      const byField: any = {};
      const revenueByField: any = {};
      let totalRevenue = 0;

      filtered.forEach((b: any) => {
        const field = normalizeField(b.fields);
        if (!field) return;

        byDay[b.date] = (byDay[b.date] || 0) + 1;
        byField[field.name] = (byField[field.name] || 0) + 1;
        revenueByField[field.name] =
          (revenueByField[field.name] || 0) + field.price;

        totalRevenue += field.price ?? 0;
      });

      setCharts({
        totalRevenue,
        totalBookings: filtered.length,
        activeFields: Object.keys(byField).length,
        bookingsByDay: {
          labels: Object.keys(byDay),
          datasets: [{ data: Object.values(byDay), backgroundColor: '#16a34a' }],
        },
        bookingsByField: {
          labels: Object.keys(byField),
          datasets: [{ data: Object.values(byField), backgroundColor: '#2563eb' }],
        },
        revenueDistribution: {
          labels: Object.keys(revenueByField),
          datasets: [
            {
              data: Object.values(revenueByField),
              backgroundColor: ['#16a34a', '#2563eb', '#9333ea', '#f59e0b'],
            },
          ],
        },
      });
    };

    loadData();
  }, [ready, fromDate, toDate, fieldId]);

  /* ===================== */
  /* EXPORT */
  /* ===================== */
  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => {
        const field = normalizeField(r.fields);
        return {
          Cancha: field?.name,
          Fecha: r.date,
          Hora: r.hour,
          Precio: field?.price,
        };
      })
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Reservas');
    XLSX.writeFile(wb, 'reporte_reservas.xlsx');
  };

  if (!ready || !charts) {
    return <p style={{ padding: 20 }}>Cargando dashboard…</p>;
  }

  return (
    <>
      <AdminHeader />

      <main style={page}>
        <div style={container}>

          {/* ================= FILTER CARD ================= */}
          <section style={filterCard}>
            <h2 style={sectionTitle}>Filtros</h2>

            <div style={filterGrid}>
              {/* DESDE */}
              <FilterItem label="Desde">
                <CalendarButton
                  value={fromDate}
                  onClick={() =>
                    setOpenCalendar(openCalendar === 'from' ? null : 'from')
                  }
                />
                {openCalendar === 'from' && (
                  <CalendarPopover>
                    <DayPicker
                      mode="single"
                      selected={fromDate}
                      onSelect={(d) => {
                        setFromDate(d);
                        setOpenCalendar(null);
                      }}
                    />
                  </CalendarPopover>
                )}
              </FilterItem>

              {/* HASTA */}
              <FilterItem label="Hasta">
                <CalendarButton
                  value={toDate}
                  onClick={() =>
                    setOpenCalendar(openCalendar === 'to' ? null : 'to')
                  }
                />
                {openCalendar === 'to' && (
                  <CalendarPopover>
                    <DayPicker
                      mode="single"
                      selected={toDate}
                      onSelect={(d) => {
                        setToDate(d);
                        setOpenCalendar(null);
                      }}
                    />
                  </CalendarPopover>
                )}
              </FilterItem>

              {/* CANCHAS (CUSTOM SELECT) */}
              <FilterItem label="Canchas">
                <div style={{ position: 'relative' }}>
                  <button
                    style={calendarBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFieldSelect(!openFieldSelect);
                    }}
                  >
                    {fieldId === 'all'
                      ? 'Todas las canchas'
                      : fields.find(f => String(f.id) === fieldId)?.name}
                  </button>

                  {openFieldSelect && (
                    <div style={selectPopover}>
                      <div
                        style={selectOption}
                        onClick={() => {
                          setFieldId('all');
                          setOpenFieldSelect(false);
                        }}
                      >
                        Todas las canchas
                      </div>

                      {fields.map((f) => (
                        <div
                          key={f.id}
                          style={selectOption}
                          onClick={() => {
                            setFieldId(String(f.id));
                            setOpenFieldSelect(false);
                          }}
                        >
                          {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FilterItem>

              {/* BOTÓN */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={exportExcel} style={primaryBtnCompact}>
                  Descargar
                </button>
              </div>
            </div>
          </section>

          {/* ================= KPI ================= */}
          <section style={kpiGrid}>
            <Stat title="Reservas" value={charts.totalBookings} />
            <Stat title="Ingresos" value={formatCRC(charts.totalRevenue)} />
            <Stat
              title="Ingreso promedio"
              value={formatCRC(
                charts.totalBookings > 0
                  ? charts.totalRevenue / charts.totalBookings
                  : 0
              )}
            />
            <Stat title="Canchas activas" value={charts.activeFields} />
          </section>

          {/* ================= CHARTS ================= */}
          <div style={chartsGrid}>
            <ChartCard title="Reservas por día">
              <Bar data={charts.bookingsByDay} options={barOptions} />
            </ChartCard>

            <ChartCard title="Reservas por cancha">
              <Bar data={charts.bookingsByField} options={barOptions} />
            </ChartCard>

            <ChartCard title="Distribución de ingresos">
              <Pie data={charts.revenueDistribution} options={pieOptions} />
            </ChartCard>
          </div>

        </div>
      </main>
    </>
  );
}

/* ===================== */
/* UI COMPONENTS */
function FilterItem({ label, children }: any) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={filterLabel}>{label}</div>
      {children}
    </div>
  );
}

function CalendarButton({ value, onClick }: any) {
  return (
    <button onClick={onClick} style={calendarBtn}>
      {value ? value.toLocaleDateString('es-CR') : 'Seleccionar fecha'}
    </button>
  );
}

function CalendarPopover({ children }: any) {
  return <div style={calendarPopover}>{children}</div>;
}

function Stat({ title, value }: any) {
  return (
    <div style={stat}>
      <p style={{ fontSize: 12 }}>{title}</p>
      <p style={{ fontSize: 26, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <section style={card}>
      <h3 style={{ marginBottom: 12 }}>{title}</h3>
      {children}
    </section>
  );
}

/* ===================== */
/* STYLES */
const page = { background: '#f9fafb', minHeight: '100vh', padding: 32 };
const container = { maxWidth: 1200, margin: '0 auto' };

const filterCard = {
  background: '#fff',
  padding: 18,
  borderRadius: 20,
  marginBottom: 24,
  boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
};

const sectionTitle = { fontSize: 16, fontWeight: 600, marginBottom: 12 };

const filterGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 18,
  alignItems: 'end',
};

const filterLabel = {
  fontSize: 11,
  color: '#6b7280',
  marginBottom: 4,
  fontWeight: 500,
};

const calendarBtn = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  background: '#fff',
  fontSize: 13,
  textAlign: 'left' as const,
};

const calendarPopover = {
  position: 'absolute' as const,
  top: '110%',
  left: 0,
  zIndex: 50,
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 40px rgba(0,0,0,.12)',
  padding: 12,
};

const selectPopover = {
  position: 'absolute' as const,
  top: '110%',
  left: 0,
  width: '100%',
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
  zIndex: 50,
  padding: 6,
};

const selectOption = {
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
  cursor: 'pointer',
};

const primaryBtnCompact = {
  padding: '10px 16px',
  borderRadius: 12,
  background: '#2563eb',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
};

const kpiGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 20,
  marginBottom: 30,
};

const chartsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))',
  gap: 50,
};

const stat = { background: '#fff', padding: 22, borderRadius: 18 };
const card = { background: '#fff', padding: 24, borderRadius: 18 };

/* ===================== */
/* CHART OPTIONS */
const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    datalabels: {
      color: '#111827',
      anchor: 'end',
      align: 'end',
      font: { weight: 'bold', size: 11 },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { display: false },
  },
} satisfies ChartOptions<'bar'>;

const pieOptions: ChartOptions<'pie'> = {
  plugins: {
    legend: { position: 'bottom' },
    datalabels: {
      color: '#fff',
      font: { weight: 'bold', size: 12 },
      formatter: (v: number, ctx: any) => {
        const total = ctx.chart.data.datasets[0].data.reduce(
          (a: number, b: number) => a + b,
          0
        );
        return `${((v / total) * 100).toFixed(1)}%`;
      },
    },
  },
} satisfies ChartOptions<'pie'>;
