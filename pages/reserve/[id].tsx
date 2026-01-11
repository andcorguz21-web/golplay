import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/ui/Header'
import 'react-day-picker/dist/style.css'

const DayPicker = dynamic(
  () => import('react-day-picker').then((mod) => mod.DayPicker),
  { ssr: false }
)

type Field = {
  id: number
  name: string
  price: number
}

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
]

const IMAGES = [
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1509027572446-af8401acfdc3?auto=format&fit=crop&w=1200&q=60',
]

const formatCRC = (value: number) => `₡${value.toLocaleString('es-CR')}`

export default function ReserveField() {
  const router = useRouter()
  const fieldId = Number(router.query.id)

  const [field, setField] = useState<Field | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<Date | undefined>()
  const [hour, setHour] = useState('')
  const [bookedHours, setBookedHours] = useState<string[]>([])
  const [activeImage, setActiveImage] = useState(0)

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  /* LOAD FIELD */
  useEffect(() => {
    if (!fieldId) return

    supabase
      .from('fields')
      .select('id, name, price')
      .eq('id', fieldId)
      .single()
      .then(({ data }) => {
        if (data) setField(data)
        setLoading(false)
      })
  }, [fieldId])

  /* LOAD BOOKED HOURS */
  useEffect(() => {
    if (!fieldId || !date) return
    const iso = date.toISOString().split('T')[0]

    supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', fieldId)
      .eq('date', iso)
      .eq('status', 'active')
      .then(({ data }) => setBookedHours((data || []).map((b) => b.hour)))
  }, [fieldId, date])

  /* CONFIRM RESERVATION */
  const confirmReserve = async (emailToUse: string) => {
    if (!date || !hour) return
    setSending(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-booking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            email: emailToUse,
            field_id: fieldId,
            date: date.toISOString().split('T')[0],
            hour,
          }),
        }
      )

      const data = await res.json()
      setSending(false)
      setShowEmailModal(false)

      if (!res.ok || !data.ok) return alert(data?.error || 'No se pudo reservar')
      router.push('/?reserva=ok')
    } catch {
      setSending(false)
      alert('Error de conexión')
    }
  }

  const handleReserve = async () => {
    if (!date || !hour) return

    const { data } = await supabase.auth.getUser()
    if (data.user?.email) confirmReserve(data.user.email)
    else setShowEmailModal(true)
  }

  if (loading || !field) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '100vh', background: '#f7f7f7' }} />
      </>
    )
  }

  return (
    <>
      <Header />

      <main style={styles.page}>
        <div style={styles.wrapper}>
          {/* LEFT IMAGE + DATA */}
          <div style={styles.left}>
            <div
              style={{
                ...styles.mainImage,
                backgroundImage: `url(${IMAGES[activeImage]})`,
              }}
            />

            {/* MOBILE THUMBNAILS SCROLL */}
            <div style={styles.thumbs}>
              {IMAGES.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImage(i)}
                  style={{
                    ...styles.thumb,
                    backgroundImage: `url(${img})`,
                    border:
                      activeImage === i
                        ? '2px solid #16a34a'
                        : '2px solid transparent',
                  }}
                />
              ))}
            </div>

            <h1 style={styles.title}>{field.name}</h1>
            <p style={styles.price}>{formatCRC(field.price)} por hora</p>
          </div>

          {/* RIGHT SIDEBAR (moves below on mobile) */}
          <aside style={styles.card}>
            <DayPicker
              mode="single"
              selected={date}
              onSelect={(d) => {
                setDate(d)
                setHour('')
              }}
            />

            {date && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.hoursGrid}>
                  {HOURS.map((h) => {
                    const disabled = bookedHours.includes(h)
                    const active = hour === h

                    return (
                      <button
                        key={h}
                        disabled={disabled}
                        onClick={() => setHour(h)}
                        style={{
                          ...styles.hourBtn,
                          background: active ? '#16a34a' : 'white',
                          color: active ? 'white' : '#111827',
                          opacity: disabled ? 0.3 : 1,
                        }}
                      >
                        {h}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleReserve}
              disabled={!date || !hour || sending}
              style={{
                ...styles.reserveBtn,
                background: sending ? '#9ca3af' : '#16a34a',
              }}
            >
              {sending ? 'Reservando…' : 'Reservar'}
            </button>
          </aside>
        </div>
      </main>

      {/* EMAIL MODAL */}
      {showEmailModal && (
        <div style={styles.modalBg}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Confirmá tu reserva</h3>
            <p style={styles.modalText}>
              Te enviaremos los detalles al correo
            </p>

            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />

            <button
              onClick={() => confirmReserve(email)}
              disabled={!email || sending}
              style={{
                ...styles.confirmBtn,
                background: sending ? '#9ca3af' : '#16a34a',
              }}
            >
              {sending ? 'Confirmando…' : 'Confirmar reserva'}
            </button>

            <button
              onClick={() => setShowEmailModal(false)}
              style={styles.cancelBtn}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ===== MOBILE-FIRST STYLES ===== */
const styles: any = {
  page: {
    background: '#f7f7f7',
    padding: '20px 12px',
  },
  wrapper: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 30,

    /* Desktop */
    ...(typeof window === 'undefined'
      ? {}
      : window.innerWidth > 880 && {
          gridTemplateColumns: '2fr 1fr',
          padding: '0 20px',
        }),
  },
  left: { width: '100%' },
  mainImage: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    marginBottom: 12,
  },
  thumbs: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    paddingBottom: 6,
  },
  thumb: {
    minWidth: 80,
    height: 60,
    borderRadius: 10,
    backgroundSize: 'cover',
    cursor: 'pointer',
    flexShrink: 0,
  },
  title: { fontSize: 22, fontWeight: 600 },
  price: { color: '#6b7280', marginBottom: 10 },

  card: {
    background: 'white',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
  },
  hoursGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))',
    gap: 8,
  },
  hourBtn: {
    padding: '8px 0',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    fontWeight: 500,
    fontSize: 14,
  },
  reserveBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: 'none',
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    marginTop: 22,
    cursor: 'pointer',
  },

  /* ===== MODAL ===== */
  modalBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: { fontSize: 20, fontWeight: 600, marginBottom: 8 },
  modalText: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  input: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    marginBottom: 16,
    fontSize: 15,
  },
  confirmBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: 'none',
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
  },
  cancelBtn: {
    width: '100%',
    padding: 12,
    border: 'none',
    background: 'transparent',
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
    cursor: 'pointer',
  },
}
