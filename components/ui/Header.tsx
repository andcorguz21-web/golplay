import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import 'react-day-picker/dist/style.css'

const DayPicker = dynamic(
  () => import('react-day-picker').then((m) => m.DayPicker),
  { ssr: false }
)

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
]

export default function Header() {
  const router = useRouter()

  const [logged, setLogged] = useState(false)
  const [fields, setFields] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [selectedField, setSelectedField] = useState<any>(null)

  const [date, setDate] = useState<Date | undefined>()
  const [hour, setHour] = useState<string | null>(null)

  const [openField, setOpenField] = useState(false)
  const [openDate, setOpenDate] = useState(false)
  const [openHour, setOpenHour] = useState(false)

  /* 🔥 HEADER SCROLL BEHAVIOR */
  const lastScrollY = useRef(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      if (currentY > lastScrollY.current && currentY > 80) {
        setHidden(true) // scroll down
      } else {
        setHidden(false) // scroll up
      }
      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* AUTH */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLogged(!!data.session)
    })
  }, [])

  /* LOAD FIELDS */
  useEffect(() => {
    supabase
      .from('fields')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setFields(data || []))
  }, [])

  const search = () => {
    if (selectedField) {
      router.push(`/reserve/${selectedField.id}`)
    } else {
      router.push('/')
    }
  }

  return (
    <>
      {/* ===== TOP BAR ===== */}
      <header
        style={{
          ...styles.topBar,
          transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        }}
      >
        <div style={styles.topInner}>
          <div style={styles.logo} onClick={() => router.push('/')}>
            <Image src="/logo-golplay.svg" alt="GolPlay" width={120} height={80} />
          </div>

          {logged ? (
            <button style={styles.secondaryBtn} onClick={() => router.push('/admin')}>
              Mi negocio
            </button>
          ) : (
            <button style={styles.primaryBtn} onClick={() => router.push('/login')}>
              Ingresar
            </button>
          )}
        </div>
      </header>

      {/* ===== SEARCH BAR ===== */}
      <div
        style={{
          ...styles.searchWrapper,
          transform: hidden ? 'translateY(-120%)' : 'translateY(0)',
        }}
      >
        <div style={styles.searchBar}>
          <div style={styles.searchItem} onClick={() => setOpenField(true)}>
            <span style={styles.searchLabel}>👀</span>
            <span style={styles.searchValue}>
              {selectedField?.name || '   ¿Dónde?'}
            </span>
          </div>

          <div style={styles.divider} />

          <div style={styles.searchItem} onClick={() => setOpenDate(true)}>
            <span style={styles.searchLabel}>📆</span>
            <span style={styles.searchValue}>
              {date ? date.toLocaleDateString('es-CR') : '   ¿Cuándo?'}
            </span>
          </div>

          <div style={styles.divider} />

          <div style={styles.searchItem} onClick={() => setOpenHour(true)}>
            <span style={styles.searchLabel}>🕣</span>
            <span style={styles.searchValue}>
              {hour || '   ¿Hora?'}
            </span>
          </div>

          {/* 🔥 PRO SEARCH BUTTON */}
          <button style={styles.searchBtn} onClick={search}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21L16.65 16.65M10 18C5.58 18 2 14.42 2 10C2 5.58 5.58 2 10 2C14.42 2 18 5.58 18 10C18 14.42 14.42 18 10 18Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== MODALS (SIN CAMBIOS FUNCIONALES) ===== */}
      {/* CANCHA */}
      {openField && (
        <Modal onClose={() => setOpenField(false)}>
          <h3 style={styles.modalTitle}>Seleccioná la cancha</h3>
          <input
            placeholder="Buscar cancha..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.modalInput}
          />
          {fields
            .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
            .map(f => (
              <div
                key={f.id}
                style={styles.listItem}
                onClick={() => {
                  setSelectedField(f)
                  setOpenField(false)
                }}
              >
                {f.name}
              </div>
            ))}
        </Modal>
      )}

      {/* FECHA */}
      {openDate && (
        <Modal onClose={() => setOpenDate(false)}>
          <h3 style={styles.modalTitle}>Elegí la fecha</h3>
          <DayPicker
            mode="single"
            selected={date}
            disabled={{ before: new Date() }}
            onSelect={(d) => {
              setDate(d)
              setHour(null)
              setOpenDate(false)
            }}
          />
        </Modal>
      )}

      {/* HORA */}
      {openHour && (
        <Modal onClose={() => setOpenHour(false)}>
          <h3 style={styles.modalTitle}>Elegí la hora</h3>
          <div style={styles.hourGrid}>
            {HOURS.map(h => (
              <div
                key={h}
                style={{
                  ...styles.hourItem,
                  background: hour === h ? '#16a34a' : '#f3f4f6',
                  color: hour === h ? 'white' : '#111',
                }}
                onClick={() => {
                  setHour(h)
                  setOpenHour(false)
                }}
              >
                {h}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}

/* ===== MODAL ===== */
function Modal({ children, onClose }: any) {
  return (
    <div style={styles.modalBg} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/* ===== STYLES ===== */
const styles: any = {
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'white',
    borderBottom: '1px solid #eee',
    transition: 'transform 0.3s ease',
  },
  searchWrapper: {
    position: 'sticky',
    top: 64,
    background: 'white',
    padding: '12px 16px',
    zIndex: 90,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    transition: 'transform 0.3s ease',
  },

  topInner: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: { cursor: 'pointer' },

  primaryBtn: {
    padding: '8px 18px',
    borderRadius: 999,
    background: '#16a34a',
    color: 'white',
    border: 'none',
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: '8px 18px',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    background: 'white',
  },

  searchBar: {
    maxWidth: 900,
    margin: '0 auto',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  searchItem: { flex: 1, cursor: 'pointer' },
  searchLabel: { fontSize: 11, color: '#6b7280' },
  searchValue: { fontSize: 14, fontWeight: 500 },
  divider: { width: 1, height: 32, background: '#e5e7eb' },

  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  modalBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    background: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 420,
  },

  modalTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12 },
  modalInput: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    marginBottom: 14,
  },
  listItem: {
    padding: 14,
    borderRadius: 14,
    border: '1px solid #f0f0f0',
    marginBottom: 8,
    cursor: 'pointer',
  },

  hourGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 },
  hourItem: {
    padding: 14,
    borderRadius: 14,
    textAlign: 'center',
    cursor: 'pointer',
    fontWeight: 500,
  },
}
