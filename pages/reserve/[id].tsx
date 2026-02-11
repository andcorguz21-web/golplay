import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/ui/Header'
import 'react-day-picker/dist/style.css'

const DayPicker = dynamic(
  () => import('react-day-picker').then((m) => m.DayPicker),
  { ssr: false }
)

type Field = {
  id: number
  name: string
  price: number
  price_day: number
  price_night: number
  description: string | null
  features: string[] | null
  hours: string[] | null
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1509027572446-af8401acfdc3?auto=format&fit=crop&w=1200&q=60',
]

const formatCRC = (value: number) =>
  `₡${Number(value).toLocaleString('es-CR')}`

export default function ReserveField() {
  const router = useRouter()
  const fieldId = Number(router.query.id)

  const [field, setField] = useState<Field | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)

  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<Date>()
  const [hour, setHour] = useState('')
  const [bookedHours, setBookedHours] = useState<string[]>([])

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)

  /* RESPONSIVE */
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /* LOAD FIELD */
  useEffect(() => {
    if (!fieldId) return

    const load = async () => {
      const { data } = await supabase
        .from('fields_with_images')
        .select('*')
        .eq('id', fieldId)
        .limit(1)

      if (!data?.length) return setLoading(false)

      const f = data[0]

      setField({
        id: f.id,
        name: f.name,
        price: Number(f.price ?? 0),
        price_day: Number(f.price_day ?? f.price ?? 0),
        price_night: Number(f.price_night ?? f.price ?? 0),
        description: f.description,
        features: f.features,
        hours: f.hours,
      })

      const imgs = data.map((r: any) => r.url).filter(Boolean)
      setImages(imgs.length ? imgs : FALLBACK_IMAGES)
      setLoading(false)
    }

    load()
  }, [fieldId])

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  

/* LOAD BOOKINGS */
useEffect(() => {
  if (!fieldId || !date) return

  const iso = formatLocalDate(date)

  supabase
    .from('bookings')
    .select('hour')
    .eq('field_id', fieldId)
    .eq('date', iso)
    .eq('status', 'active')
    .then(({ data }) =>
      setBookedHours((data || []).map((b) => b.hour))
    )
}, [fieldId, date])


  /* 💰 PRECIO SEGÚN HORA */
  const { isNight, selectedPrice } = useMemo(() => {
    if (!field || !hour) return { isNight: false, selectedPrice: 0 }
    const h = Number(hour.split(':')[0])
    const night = h >= 18
    return {
      isNight: night,
      selectedPrice: night ? field.price_night : field.price_day,
    }
  }, [hour, field])

  /* CONFIRM */
  const confirmReserve = async () => {
    if (!date || !hour || !email || !name || !phone || !field) return

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
          field_id: fieldId,
          date: date.toISOString().split('T')[0],
          hour,
          name,
          phone,
          email,
          price: selectedPrice,
          tariff: isNight ? 'night' : 'day',
        }),
      }
    )

    setSending(false)
    setShowEmailModal(false)

    if (!res.ok) return alert('No se pudo completar la reserva')
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

            <div style={styles.pricePills}>
              <span style={styles.dayPill}>🌞 Día {formatCRC(field.price_day)}</span>
              <span style={styles.nightPill}>🌙 Noche {formatCRC(field.price_night)}</span>
            </div>

            {field.features?.length ? (
              <div style={styles.features}>
                {field.features.map((f) => (
                  <span key={f} style={styles.featurePill}>{f}</span>
                ))}
              </div>
            ) : null}

            {field.description && (
              <p style={styles.description}>{field.description}</p>
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
                {(field.hours || []).slice().sort().map((h) => {
  const blocked = bookedHours.includes(h)
  const selected = hour === h

  if (blocked) {
    return (
      <div
        key={h}
        style={{
          ...styles.hourBtn,
          background: '#f3f4f6',
          color: '#9ca3af',
          opacity: 0.4,
          cursor: 'not-allowed',
          pointerEvents: 'none', // 🔥 CLAVE MOBILE
        }}
      >
        {h}
      </div>
    )
  }

  return (
    <button
      key={h}
      onClick={() => setHour(h)}
      style={{
        ...styles.hourBtn,
        background: selected ? '#16a34a' : '#fff',
        color: selected ? '#fff' : '#111',
      }}
    >
      {h}
    </button>
  )
})}

                  
              
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

            <p style={{ marginBottom: 10 }}>
              <strong>Hora:</strong> {hour} <br />
              <strong>Tarifa:</strong> {isNight ? 'Nocturna' : 'Diurna'} <br />
              <strong>Precio:</strong> {formatCRC(selectedPrice)}
            </p>

            <input placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} style={styles.modalInput} />
            <input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.modalInput} />
            <input placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.modalInput} />

            <button onClick={confirmReserve} style={styles.modalConfirm} disabled={sending}>
              Confirmar reserva
            </button>

            <button onClick={() => setShowEmailModal(false)} style={styles.modalCancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* STYLES: exactamente los mismos que ya tenías */


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

  pricePills: { display: 'flex', gap: 10, marginBottom: 14 },
  dayPill: {
    padding: '6px 14px',
    borderRadius: 999,
    background: '#ecfeff',
    fontWeight: 600,
  },
  nightPill: {
    padding: '6px 14px',
    borderRadius: 999,
    background: '#f3e8ff',
    fontWeight: 600,
  },

  features: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  featurePill: {
    padding: '6px 12px',
    borderRadius: 999,
    background: '#f1f5f9',
    fontSize: 13,
  },

  description: { color: '#4b5563', marginBottom: 35 },

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
