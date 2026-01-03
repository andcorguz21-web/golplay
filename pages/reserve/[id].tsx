import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/ui/Header'
import 'react-day-picker/dist/style.css'

const DayPicker = dynamic(
  () => import('react-day-picker').then(mod => mod.DayPicker),
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

const formatCRC = (value: number) =>
  `₡${value.toLocaleString('es-CR')}`

export default function ReserveField() {
  const router = useRouter()
  const fieldId = Number(router.query.id)

  /* ===================== */
  /* STATE */
  /* ===================== */
  const [field, setField] = useState<Field | null>(null)
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState<Date | undefined>()
  const [hour, setHour] = useState('')
  const [bookedHours, setBookedHours] = useState<string[]>([])
  const [activeImage, setActiveImage] = useState(0)

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  /* ===================== */
  /* LOAD FIELD */
  /* ===================== */
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

  /* ===================== */
  /* LOAD BOOKED HOURS */
  /* ===================== */
  useEffect(() => {
    if (!fieldId || !date) return

    const iso = date.toISOString().split('T')[0]

    supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', fieldId)
      .eq('date', iso)
      .eq('status', 'active')
      .then(({ data }) => {
        setBookedHours((data || []).map(b => b.hour))
      })
  }, [fieldId, date])

  /* ===================== */
  /* CONFIRM RESERVE */
  /* ===================== */
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

      if (!res.ok || !data.ok) {
        alert(data?.error || 'No se pudo completar la reserva')
        return
      }

      router.push('/?reserva=ok')
    } catch (err) {
      console.error(err)
      setSending(false)
      alert('Error de conexión')
    }
  }

  const handleReserve = async () => {
    if (!date || !hour) return

    const { data } = await supabase.auth.getUser()

    if (data.user?.email) {
      confirmReserve(data.user.email)
    } else {
      setShowEmailModal(true)
    }
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

      <main style={{ background: '#f7f7f7', padding: 40 }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 40,
          }}
        >
          {/* LEFT */}
          <div>
            <div
              style={{
                height: 360,
                borderRadius: 24,
                backgroundImage: `url(${IMAGES[activeImage]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {IMAGES.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImage(i)}
                  style={{
                    width: 80,
                    height: 60,
                    borderRadius: 10,
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    cursor: 'pointer',
                    border: activeImage === i
                      ? '2px solid #16a34a'
                      : '2px solid transparent',
                  }}
                />
              ))}
            </div>

            <h1 style={{ fontSize: 26 }}>{field.name}</h1>
            <p style={{ color: '#6b7280' }}>
              {formatCRC(field.price)} por hora
            </p>
          </div>

          {/* RIGHT */}
          <aside
            style={{
              background: 'white',
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            }}
          >
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
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                  }}
                >
                  {HOURS.map(h => {
                    const disabled = bookedHours.includes(h)
                    const active = hour === h

                    return (
                      <button
                        key={h}
                        disabled={disabled}
                        onClick={() => setHour(h)}
                        style={{
                          padding: '10px 0',
                          borderRadius: 999,
                          border: '1px solid #e5e7eb',
                          background: active ? '#16a34a' : 'white',
                          color: active ? 'white' : '#111827',
                          opacity: disabled ? 0.4 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
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
                marginTop: 24,
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                background: '#16a34a',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: !date || !hour ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Reservando…' : 'Reservar'}
            </button>
          </aside>
        </div>
      </main>

      {/* EMAIL MODAL PREMIUM */}
      {showEmailModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 28,
              width: 400,
              boxShadow: '0 30px 60px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
              Confirmá tu reserva
            </h3>

            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 18 }}>
              Te enviaremos los detalles de la reserva a este correo
            </p>

            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={{
                width: '85%',
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                fontSize: 15,
                outline: 'none',
                marginBottom: 16,
              }}
            />

            <button
              onClick={() => confirmReserve(email)}
              disabled={!email || sending}
              style={{
                width: '95%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                background: sending ? '#9ca3af' : '#16a34a',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Confirmando…' : 'Confirmar reserva'}
            </button>

            <button
              onClick={() => setShowEmailModal(false)}
              style={{
                marginTop: 12,
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
