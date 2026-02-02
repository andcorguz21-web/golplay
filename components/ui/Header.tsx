import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'

const DayPicker = dynamic(
  () => import('react-day-picker').then((mod) => mod.DayPicker),
  { ssr: false }
)

export default function Header() {
  const router = useRouter()

  const [logged, setLogged] = useState(false)
  const [fields, setFields] = useState<any[]>([])
  const [field, setField] = useState<any>(null)
  const [date, setDate] = useState<Date | undefined>()
  const [hour, setHour] = useState<string | null>(null)
  const [open, setOpen] = useState<'field' | 'date' | 'hour' | null>(null)

  const HOURS = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00',
    '18:00','19:00','20:00','21:00','22:00',
  ]

  /* AUTH */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLogged(!!data.session)
    })
  }, [])

  /* FIELDS */
  useEffect(() => {
    supabase
      .from('fields')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setFields(data || []))
  }, [])

  const search = () => {
    router.push({
      pathname: '/',
      query: {
        field: field?.id,
        date: date?.toISOString().split('T')[0],
        hour,
      },
    })
    setOpen(null)
  }

  return (
    <>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.wrap}>
          {/* LOGO */}
          <div style={styles.logo} onClick={() => router.push('/')}>
            <Image src="/logo-golplay.svg" alt="GolPlay" width={36} height={36} />
            <span style={styles.brand}></span>
          </div>

          {/* FILTER BAR */}
          <div style={styles.filters}>
            <button style={styles.filter} onClick={() => setOpen('field')}>
              <span className="label">Cancha</span>
              <span className="value">{field?.name || 'Elegí una cancha'}</span>
            </button>

            <button style={styles.filter} onClick={() => setOpen('date')}>
              <span className="label">Fecha</span>
              <span className="value">
                {date ? date.toLocaleDateString() : 'Seleccionar'}
              </span>
            </button>

            <button style={styles.filter} onClick={() => setOpen('hour')}>
              <span className="label">Hora</span>
              <span className="value">{hour || 'Seleccionar'}</span>
            </button>

            <button
              style={styles.searchBtn}
              disabled={!field || !date || !hour}
              onClick={search}
            >
              Buscar
            </button>
          </div>

          {/* ACTIONS */}
          <div style={styles.actions}>
            <button style={styles.publish} onClick={() => router.push('/admin')}>
              Publicar cancha
            </button>

            {logged ? (
              <button style={styles.secondary} onClick={() => router.push('/admin')}>
                Mi negocio
              </button>
            ) : (
              <button style={styles.primary} onClick={() => router.push('/login')}>
                Ingresar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DROPDOWNS */}
      {open && (
        <div style={styles.overlay} onClick={() => setOpen(null)}>
          <div style={styles.dropdown} onClick={(e) => e.stopPropagation()}>
            {open === 'field' &&
              fields.map((f) => (
                <div
                  key={f.id}
                  style={styles.option}
                  onClick={() => {
                    setField(f)
                    setOpen(null)
                  }}
                >
                  {f.name}
                </div>
              ))}

            {open === 'date' && (
              <DayPicker
                mode="single"
                selected={date}
                disabled={{ before: new Date() }}
                onSelect={(d) => {
                  setDate(d)
                  setOpen(null)
                }}
              />
            )}

            {open === 'hour' && (
              <div style={styles.hours}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      ...styles.hour,
                      background: hour === h ? '#16a34a' : '#f3f4f6',
                      color: hour === h ? 'white' : '#111',
                    }}
                    onClick={() => {
                      setHour(h)
                      setOpen(null)
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ================= STYLES ================= */

const styles: any = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
  },
  wrap: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  brand: { fontWeight: 700, fontSize: 18 },

  filters: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
    background: '#fff',
  },
  filter: {
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: 140,
  },
  searchBtn: {
    padding: '0 20px',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    height: 42,
    cursor: 'pointer',
    fontWeight: 600,
  },

  actions: { display: 'flex', gap: 10 },
  publish: {
    border: '1px solid #16a34a',
    color: '#16a34a',
    background: 'white',
    borderRadius: 999,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  primary: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: 999,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  secondary: {
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: 999,
    padding: '8px 14px',
    cursor: 'pointer',
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 90,
    zIndex: 1000,
  },
  dropdown: {
    background: 'white',
    borderRadius: 16,
    padding: 16,
    width: 360,
  },
  option: {
    padding: 12,
    borderRadius: 10,
    cursor: 'pointer',
  },
  hours: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 10,
  },
  hour: {
    padding: 12,
    borderRadius: 12,
    textAlign: 'center',
    cursor: 'pointer',
  },
}
