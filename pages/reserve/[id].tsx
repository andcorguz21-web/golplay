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
  description: string | null
  features: string[] | null
  hours: string[] | null
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1509027572446-af8401acfdc3?auto=format&fit=crop&w=1200&q=60',
]

const formatCRC = (value: number) => `₡${value.toLocaleString('es-CR')}`

export default function ReserveField() {
  const router = useRouter()
  const fieldId = Number(router.query.id)

  const [field, setField] = useState<Field | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)

  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<Date | undefined>()
  const [hour, setHour] = useState('')
  const [bookedHours, setBookedHours] = useState<string[]>([])

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)

  /* ===== RESPONSIVE ===== */
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /* LOAD FIELD + IMAGES */
  useEffect(() => {
    if (!fieldId) return

    const load = async () => {
      const { data } = await supabase
        .from('fields_with_images')
        .select('*')
        .eq('id', fieldId)

      if (!data || data.length === 0) {
        setLoading(false)
        return
      }

      setField({
        id: data[0].id,
        name: data[0].name,
        price: Number(data[0].price),
        description: data[0].description,
        features: data[0].features,
        hours: data[0].hours,
      })

      const imgs = data.map((r: any) => r.url).filter(Boolean)
      setImages(imgs.length ? imgs : FALLBACK_IMAGES)
      setLoading(false)
    }

    load()
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

  const confirmReserve = async () => {
    if (!date || !hour || !email || !name || !phone) return
    setSending(true)

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          email,
          name,
          phone,
          field_id: fieldId,
          date: date.toISOString().split('T')[0],
          hour,
        }),
      }
    )

    const data = await res.json()
    setSending(false)
    setShowEmailModal(false)

    if (!res.ok || !data.ok) return alert('No se pudo reservar')
    router.push('/?reserva=ok')
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
        <div
          style={{
            ...styles.wrapper,
            gridTemplateColumns: isDesktop ? '2fr 1fr' : '1fr',
          }}
        >
          {/* LEFT */}
          <div>
            <div
              style={{
                ...styles.mainImage,
                backgroundImage: `url(${images[activeImage]})`,
              }}
            />

            <div style={styles.thumbs}>
              {images.map((img, i) => (
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

            {field.description && (
              <p style={styles.description}>{field.description}</p>
            )}

            {field.features && field.features.length > 0 && (
              <>
                <h3 style={styles.featuresTitle}>Características</h3>
                <div style={styles.featuresGrid}>
                  {field.features.map((f) => (
                    <span key={f} style={styles.featurePill}>
                      {f}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT */}
          <aside style={styles.card}>
            <DayPicker
              mode="single"
              selected={date}
              disabled={{ before: new Date() }}
              onSelect={(d) => {
                setDate(d)
                setHour('')
              }}
            />

            {date && (
              <div style={styles.hoursGrid}>
                {(field.hours || [])
                  .slice()
                  .sort()
                  .map((h) => (
                    <button
                      key={h}
                      disabled={bookedHours.includes(h)}
                      onClick={() => setHour(h)}
                      style={{
                        ...styles.hourBtn,
                        background: hour === h ? '#16a34a' : 'white',
                        color: hour === h ? 'white' : '#111',
                        opacity: bookedHours.includes(h) ? 0.3 : 1,
                      }}
                    >
                      {h}
                    </button>
                  ))}
              </div>
            )}

            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!date || !hour || sending}
              style={styles.reserveBtn}
            >
              Reservar
            </button>
          </aside>
        </div>
      </main>

      {/* MODAL */}
      {showEmailModal && (
        <div style={styles.modalBg}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Confirmar reserva</h3>
            <input
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.modalInput}
            />
            <input
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.modalInput}
            />
            <input
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.modalInput}
            />

            <button
              onClick={confirmReserve}
              style={styles.modalConfirm}
              disabled={sending}
            >
              Confirmar
            </button>

            <button
              onClick={() => setShowEmailModal(false)}
              style={styles.modalCancel}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ===== STYLES ===== */
const styles: any = {
  page: { background: '#f7f7f7', padding: 20 },
  wrapper: { maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 30 },

  mainImage: {
    height: 260,
    borderRadius: 20,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    marginBottom: 12,
  },
  thumbs: { display: 'flex', gap: 10, marginBottom: 14 },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundSize: 'cover',
    cursor: 'pointer',
  },

  title: { fontSize: 22, fontWeight: 600 },
  price: { color: '#6b7280', marginBottom: 10 },
  description: { color: '#4b5563', marginBottom: 35 },

  featuresTitle: { fontWeight: 600, marginBottom: 15 },
  featuresGrid: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  featurePill: {
    padding: '6px 12px',
    borderRadius: 999,
    background: 'white',
    fontSize: 13,
    fontWeight: 500,
  },

  card: {
    background: 'white',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 20px 40px rgba(0,0,0,.12)',
  },

  hoursGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 8,
    marginTop: 16,
  },

  hourBtn: {
    padding: 10,
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
  },

  reserveBtn: {
    marginTop: 20,
    padding: 14,
    width: '100%',
    borderRadius: 14,
    background: '#16a34a',
    color: 'white',
    fontWeight: 600,
    border: 'none',
  },

  modalBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCard: {
    background: 'white',
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },

  modalTitle: { fontSize: 20, fontWeight: 600, marginBottom: 12 },
  modalInput: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    marginBottom: 12,
  },
  modalConfirm: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    background: '#16a34a',
    color: 'white',
    border: 'none',
    marginBottom: 8,
  },
  modalCancel: {
    width: '100%',
    padding: 10,
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
  },
}
