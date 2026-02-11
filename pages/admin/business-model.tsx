import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'

const COMMISSION_PER_BOOKING = 1500
const COMMISSION_LIMIT = 100

const formatCRC = (v: number) =>
  `₡${Number(v).toLocaleString('es-CR')}`

export default function BusinessModel() {
  const [totalBookings, setTotalBookings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id')
        .eq('status', 'active')

      setTotalBookings(data?.length ?? 0)
      setLoading(false)
    }

    load()
  }, [])

  const bookingsCounted = Math.min(totalBookings, COMMISSION_LIMIT)
  const remaining = Math.max(COMMISSION_LIMIT - totalBookings, 0)
  const commissionTotal = bookingsCounted * COMMISSION_PER_BOOKING
  const progress = Math.min((bookingsCounted / COMMISSION_LIMIT) * 100, 100)

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: 40 }} />
      </AdminLayout>
    )
  }
  

  return (
    <AdminLayout>
      <main style={styles.page}>
        <section style={styles.container}>
          <h1 style={styles.title}>Modelo de negocio GolPlay</h1>

          <p style={styles.lead}>
            GolPlay es un marketplace digital que conecta jugadores con complejos
            deportivos. No cobramos mensualidades ni comisiones a la cancha.
            Nuestro modelo es simple, transparente y limitado.
          </p>

          {/* ===================== */}
          {/* KPI */}
          {/* ===================== */}
          <section style={styles.kpiGrid}>
            <KPI title="Reservas totales" value={totalBookings} />
            <KPI title="Reservas con comisión" value={bookingsCounted} />
            <KPI title="Reservas restantes" value={remaining} />
            <KPI
              title="Comisión acumulada GolPlay"
              value={formatCRC(commissionTotal)}
            />
          </section>

          {/* ===================== */}
          {/* PROGRESS */}
          {/* ===================== */}
          <section style={styles.card}>
            <h3 style={styles.subtitle}>Progreso de comisión</h3>

            <p style={styles.text}>
              GolPlay cobra comisión únicamente durante las primeras{' '}
              <strong>{COMMISSION_LIMIT} reservas de cada periodo</strong>. El conteo de reservas se realiza del 28 de un mes al 28 del mes siguiente.

Si durante ese período no se alcanzan las 100 reservas, solo se cobra la comisión de las reservas realizadas.

Una vez alcanzado el límite, no se cobra comisión adicional durante el resto del período.
            </p>

            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress}%`,
                }}
              />
            </div>

            <p style={styles.progressText}>
              {bookingsCounted} / {COMMISSION_LIMIT} reservas con comisión
            </p>
          </section>

          {/* ===================== */}
          {/* MODEL EXPLANATION */}
          {/* ===================== */}
          <section style={styles.card}>
            <h3 style={styles.subtitle}>¿Quién paga la comisión?</h3>

            <p style={styles.text}>
              <strong>La comisión NO la paga la cancha.</strong>  
              GolPlay suma su comisión al precio definido por el complejo y
              quien la paga es el <strong>cliente final</strong>.
            </p>

            <div style={styles.diagram}>
              <p><strong>Ejemplo real:</strong></p>

              <pre style={styles.diagramBox}>
{`Precio definido por la cancha     ₡20.000
Comisión GolPlay (temporal)        ₡ 1.500
-----------------------------------------
Precio que paga el cliente         ₡21.500

→ La cancha recibe siempre:        ₡20.000
→ GolPlay recibe (solo 100 veces): ₡ 1.500
→ Después de 100 reservas:         ₡ 0`}
              </pre>
            </div>
          </section>

          {/* ===================== */}
          {/* COMMISSION BREAKDOWN */}
          {/* ===================== */}
          <section style={styles.card}>
            <h3 style={styles.subtitle}>
              ¿En qué se utiliza la comisión de GolPlay?
            </h3>

            <p style={styles.text}>
              La comisión permite que GolPlay opere, mejore la plataforma y
              traiga más jugadores a tu cancha.
            </p>

            <table style={styles.table}>
              <tbody>
                <tr>
                  <td>Infraestructura y servidores</td>
                  <td>{formatCRC(350)}</td>
                </tr>
                <tr>
                  <td>Soporte y atención al cliente</td>
                  <td>{formatCRC(275)}</td>
                </tr>
                <tr>
                  <td>Desarrollo y mejoras</td>
                  <td>{formatCRC(325)}</td>
                </tr>
                <tr>
                  <td>Marketing y adquisición</td>
                  <td>{formatCRC(300)}</td>
                </tr>
                <tr>
                  <td>Costos administrativos</td>
                  <td>{formatCRC(250)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* ===================== */}
          {/* CLOSING */}
          {/* ===================== */}
          <section style={styles.closing}>
            <p>
              <strong>GolPlay no es un gasto para tu negocio.</strong>
            </p>
            <p>
              Es una herramienta para llenarte la cancha y luego dejarte crecer
              sin comisión.
            </p>
          </section>
        </section>
      </main>
    </AdminLayout>
  )
}

/* ===================== */
/* COMPONENTS */
function KPI({ title, value }: { title: string; value: any }) {
  return (
    <div style={styles.kpi}>
      <p style={styles.kpiTitle}>{title}</p>
      <p style={styles.kpiValue}>{value}</p>
    </div>
  )
}

/* ===================== */
/* STYLES */
const styles: any = {
  page: { background: '#f7f7f7', padding: '40px 16px' },
  container: { maxWidth: 1100, margin: '0 auto' },

  title: { fontSize: 32, fontWeight: 800, marginBottom: 12 },
  lead: { fontSize: 16, color: '#4b5563', marginBottom: 32 },

  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  kpi: {
    background: 'white',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,.08)',
  },
  kpiTitle: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  kpiValue: { fontSize: 24, fontWeight: 700 },

  card: {
    background: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    boxShadow: '0 10px 30px rgba(0,0,0,.08)',
  },
  subtitle: { fontSize: 20, fontWeight: 600, marginBottom: 12 },
  text: { fontSize: 15, color: '#374151', marginBottom: 12 },

  diagram: { marginTop: 10 },
  diagramBox: {
    background: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.6,
  },

  progressBar: {
    height: 12,
    borderRadius: 999,
    background: '#e5e7eb',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: { height: '100%', background: '#16a34a' },
  progressText: { marginTop: 8, fontSize: 13, color: '#6b7280' },

  table: { width: '100%', borderCollapse: 'collapse' },

  closing: { textAlign: 'center', marginTop: 40, fontSize: 16 },
}
