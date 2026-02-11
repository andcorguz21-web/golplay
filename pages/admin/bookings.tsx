import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'

import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import * as XLSX from 'xlsx'

/* ===================== */
/* TYPES */
/* ===================== */

type Booking = {
  id: number
  date: string
  hour: string
  fieldName: string
  user: {
    first_name: string | null
    last_name: string | null
    phone: string | null
    email: string | null
  }
}

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function AdminBookings() {
  const router = useRouter()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()
  const [openCalendar, setOpenCalendar] =
    useState<'from' | 'to' | null>(null)

  const [selectedUser, setSelectedUser] = useState<any>(null)

  /* ===================== */
  /* AUTH */
  /* ===================== */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
    })
  }, [router])

  /* ===================== */
  /* LOAD BOOKINGS */
  /* ===================== */

  const loadBookings = async () => {
    setLoading(true)

    let query = supabase
      .from('bookings')
      .select(`
        id,
        date,
        hour,
        customer_name,
        customer_last_name,
        customer_phone,
        customer_email,
        fields:field_id!inner (
          name
        )
      `)
      .order('date', { ascending: false })

    if (fromDate)
      query = query.gte(
        'date',
        fromDate.toISOString().split('T')[0]
      )

    if (toDate)
      query = query.lte(
        'date',
        toDate.toISOString().split('T')[0]
      )

    const { data } = await query

    setBookings(
      (data || []).map((b: any) => ({
        id: b.id,
        date: b.date,
        hour: b.hour,
        fieldName: b.fields.name,
        user: {
          first_name: b.customer_name,
          last_name: b.customer_last_name,
          phone: b.customer_phone,
          email: b.customer_email,
        },
      }))
    )

    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [fromDate, toDate])

  /* ===================== */
  /* EXPORT EXCEL */
  /* ===================== */

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      bookings.map((b) => ({
        Cancha: b.fieldName,
        Fecha: b.date,
        Hora: b.hour,
        Nombre: `${b.user.first_name || ''} ${b.user.last_name || ''}`,
        Teléfono: b.user.phone || '',
        Email: b.user.email || '',
      }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Reservas')
    XLSX.writeFile(wb, 'reservas.xlsx')
  }

  /* ===================== */
  /* UI */
  /* ===================== */

  return (
    <AdminLayout>
      <main style={container}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={pageTitle}>Reservas</h1>

          {/* ================= FILTROS ================= */}
          <section style={filterCard}>
            <div style={filterGrid}>
              {/* DESDE */}
              <FilterItem label="Desde">
                <CalendarButton
                  value={fromDate}
                  onClick={() =>
                    setOpenCalendar(
                      openCalendar === 'from' ? null : 'from'
                    )
                  }
                />
                {openCalendar === 'from' && (
                  <CalendarPopover>
                    <DayPicker
                      mode="single"
                      selected={fromDate}
                      onSelect={(d) => {
                        setFromDate(d)
                        setOpenCalendar(null)
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
                    setOpenCalendar(
                      openCalendar === 'to' ? null : 'to'
                    )
                  }
                />
                {openCalendar === 'to' && (
                  <CalendarPopover>
                    <DayPicker
                      mode="single"
                      selected={toDate}
                      onSelect={(d) => {
                        setToDate(d)
                        setOpenCalendar(null)
                      }}
                    />
                  </CalendarPopover>
                )}
              </FilterItem>

              {/* EXCEL */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={exportExcel} style={primaryBtn}>
                  Descargar Excel
                </button>
              </div>
            </div>
          </section>

          {loading && <p>Cargando reservas…</p>}

          {!loading && bookings.length === 0 && (
            <EmptyState />
          )}

          {!loading && bookings.length > 0 && (
            <div style={tableWrapper}>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <thead>
                  <tr style={theadRow}>
                    <th style={th}>Cancha</th>
                    <th style={th}>Fecha</th>
                    <th style={th}>Hora</th>
                    <th style={th}>Cliente</th>
                    <th style={th}></th>
                  </tr>
                </thead>

                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} style={tbodyRow}>
                      <td style={td}>{b.fieldName}</td>
                      <td style={td}>{b.date}</td>
                      <td style={td}>{b.hour}</td>
                      <td style={td}>
                        {b.user.first_name || '—'}
                      </td>
                      <td style={td}>
                        <button
                          style={linkBtn}
                          onClick={() => setSelectedUser(b.user)}
                        >
                          Ver usuario
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ================= USER MODAL ================= */}
      {selectedUser && (
        <div style={overlay} onClick={() => setSelectedUser(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3>Información del cliente</h3>

            <p>
              <strong>Nombre:</strong>{' '}
              {selectedUser.first_name}{' '}
              {selectedUser.last_name}
            </p>

            <p>
              <strong>Teléfono:</strong>{' '}
              {selectedUser.phone || '—'}
            </p>

            <p>
              <strong>Email:</strong>{' '}
              {selectedUser.email || '—'}
            </p>

            <button
              style={closeBtn}
              onClick={() => setSelectedUser(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

/* ===================== */
/* UI COMPONENTS */
/* ===================== */

function FilterItem({ label, children }: any) {
  return (
    <div>
      <div style={filterLabel}>{label}</div>
      {children}
    </div>
  )
}

function CalendarButton({ value, onClick }: any) {
  return (
    <button onClick={onClick} style={calendarBtn}>
      {value ? value.toLocaleDateString('es-CR') : 'Seleccionar fecha'}
    </button>
  )
}

function CalendarPopover({ children }: any) {
  return <div style={calendarPopover}>{children}</div>
}

function EmptyState() {
  return (
    <div style={empty}>
      <p>No hay reservas registradas aún</p>
    </div>
  )
}

/* ===================== */
/* STYLES */
/* ===================== */

const container = {
  background: '#f9fafb',
  minHeight: '100vh',
  padding: 32,
}

const pageTitle = {
  fontSize: 26,
  fontWeight: 600,
  marginBottom: 20,
}

const filterCard = {
  background: '#fff',
  padding: 18,
  borderRadius: 20,
  marginBottom: 24,
}

const filterGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
  gap: 16,
}

const filterLabel = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 4,
}

const calendarBtn = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  background: '#fff',
}

const calendarPopover = {
  position: 'absolute' as const,
  zIndex: 100,
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 40px rgba(0,0,0,.15)',
  padding: 12,
}

const primaryBtn = {
  padding: '10px 16px',
  borderRadius: 12,
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
}

const tableWrapper = {
  background: 'white',
  borderRadius: 20,
  overflow: 'hidden',
}

const theadRow = { background: '#f9fafb', textAlign: 'left' as const }
const th = { padding: '14px 18px', fontSize: 12, color: '#6b7280' }
const tbodyRow = { borderTop: '1px solid #e5e7eb' }
const td = { padding: '16px 18px', fontSize: 14 }

const linkBtn = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  cursor: 'pointer',
}

const empty = {
  background: 'white',
  borderRadius: 20,
  padding: 40,
  textAlign: 'center' as const,
}

const overlay = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
}

const modal = {
  background: 'white',
  padding: 24,
  borderRadius: 18,
  width: 360,
}

const closeBtn = {
  marginTop: 16,
  width: '100%',
  padding: '10px',
  borderRadius: 12,
  background: '#111827',
  color: 'white',
  border: 'none',
}
