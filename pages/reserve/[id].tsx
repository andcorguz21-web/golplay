import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/ui/Header'
import 'react-day-picker/dist/style.css'

const DayPicker = dynamic(
  () => import('react-day-picker').then((m) => m.DayPicker),
  { ssr: false }
)

// ─── Types ────────────────────────────────────────────────────────────────────

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

type BookingStatus = 'idle' | 'sending' | 'success' | 'error'

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1509027572446-af8401acfdc3?auto=format&fit=crop&w=1200&q=60',
]

const formatCRC = (value: number) =>
  `₡${Number(value).toLocaleString('es-CR')}`

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isNightHour = (h: string) => Number(h.split(':')[0]) >= 18

const to12h = (h: string): { display: string; period: 'am' | 'pm' } => {
  const [hourStr, min] = h.split(':')
  const hour24 = Number(hourStr)
  const period = hour24 >= 12 ? 'pm' : 'am'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { display: `${hour12}:${min ?? '00'}`, period }
}

// ─── Skeleton Component ────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-xl ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  )
}

function PageSkeleton() {
  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <Header />
      <main style={{ minHeight: '100vh', background: '#f7f8fa', padding: '24px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 30, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div>
            <Skeleton className="h-64 mb-3" />
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[1,2,3].map(i => <Skeleton key={i} className="w-20 h-20" />)}
            </div>
            <Skeleton className="h-8 w-2/3 mb-3" />
            <Skeleton className="h-6 w-1/2 mb-3" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </main>
    </>
  )
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateForm(name: string, phone: string, email: string): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!name.trim() || name.trim().length < 2) errors.name = 'Nombre debe tener al menos 2 caracteres'
  if (!phone.trim() || !/^\+?[\d\s\-()]{7,}$/.test(phone)) errors.phone = 'Teléfono inválido'
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Correo electrónico inválido'
  return errors
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReserveField() {
  const router = useRouter()
  // Guard: only parse fieldId when router is ready to prevent NaN issues
  const fieldId = router.isReady ? Number(router.query.id) : null

  const [field, setField] = useState<Field | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [date, setDate] = useState<Date | undefined>()
  const [hour, setHour] = useState('')
  const [bookedHours, setBookedHours] = useState<string[]>([])
  const [loadingHours, setLoadingHours] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('idle')

  // ── Responsive ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Load Field ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fieldId || isNaN(fieldId)) return

    const load = async () => {
      setLoading(true)
      setLoadError(false)

      try {
        const { data, error } = await supabase
          .from('fields_with_images')
          .select('*')
          .eq('id', fieldId)
          .limit(10) // Fetch multiple rows to get all images

        if (error) throw error
        if (!data?.length) { setLoadError(true); return }

        const f = data[0]
        setField({
          id: f.id,
          name: f.name,
          price: Number(f.price ?? 0),
          price_day: Number(f.price_day ?? f.price ?? 0),
          price_night: Number(f.price_night ?? f.price ?? 0),
          description: f.description,
          features: Array.isArray(f.features) ? f.features : null,
          hours: Array.isArray(f.hours) ? f.hours : null,
        })

        const imgs = data.map((r: any) => r.url).filter(Boolean)
        setImages(imgs.length ? imgs : FALLBACK_IMAGES)
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [fieldId])

  // ── Load Booked Hours ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fieldId || !date || isNaN(fieldId)) return

    const iso = formatLocalDate(date)
    setLoadingHours(true)

    supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', fieldId)
      .eq('date', iso)
      .eq('status', 'active')
      .then(({ data, error }) => {
        setBookedHours(error ? [] : (data || []).map((b) => b.hour))
        setLoadingHours(false)
      })
  }, [fieldId, date])

  // ── Price Calculation ────────────────────────────────────────────────────────
  const { isNight, selectedPrice } = useMemo(() => {
    if (!field || !hour) return { isNight: false, selectedPrice: 0 }
    const night = isNightHour(hour)
    return {
      isNight: night,
      selectedPrice: night ? field.price_night : field.price_day,
    }
  }, [hour, field])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDateSelect = useCallback((d: Date | undefined) => {
    setDate(d)
    setHour('')
  }, [])

  const handleOpenModal = () => {
    setFormErrors({})
    setBookingStatus('idle')
    setShowModal(true)
  }

  const handleConfirm = async () => {
    if (!date || !hour || !field || !fieldId) return

    const errors = validateForm(name, phone, email)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setBookingStatus('sending')

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
            field_id: fieldId,
            date: formatLocalDate(date), // Use local date, not UTC ISO
            hour,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            price: selectedPrice,
            tariff: isNight ? 'night' : 'day',
          }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message || 'Error al crear la reserva')
      }

      setBookingStatus('success')
      // Redirect after brief success state
      setTimeout(() => router.push('/?reserva=ok'), 1500)
    } catch (err: any) {
      setBookingStatus('error')
    }
  }

  // ── Early Returns ─────────────────────────────────────────────────────────────
  if (loading) return <PageSkeleton />

  if (loadError || !field) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '100vh', background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>Cancha no encontrada</h2>
          <p style={{ color: '#6b7280' }}>Esta cancha no existe o fue removida.</p>
          <button onClick={() => router.push('/')} style={{ padding: '10px 24px', background: '#16a34a', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Volver al inicio
          </button>
        </main>
      </>
    )
  }

  const sortedHours = [...(field.hours || [])].sort()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        .rdp { --rdp-accent-color: #16a34a !important; --rdp-background-color: #dcfce7 !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }

        .hour-btn {
          padding: 10px 6px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.15s ease;
          background: #fff;
          color: #111;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .hour-btn:hover:not(:disabled) {
          border-color: #16a34a;
          background: #f0fdf4;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(22,163,74,0.15);
        }

        .hour-btn.selected {
          background: #16a34a;
          border-color: #16a34a;
          color: #fff;
          box-shadow: 0 4px 16px rgba(22,163,74,0.35);
          transform: translateY(-1px);
        }

        .hour-btn.blocked {
          background: #f9fafb;
          color: #d1d5db;
          cursor: not-allowed;
          border-color: #f3f4f6;
          pointer-events: none;
        }

        .hour-tag {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          opacity: 0.7;
        }

        .reserve-btn {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white;
          font-weight: 700;
          font-size: 16px;
          border: none;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(22,163,74,0.3);
          margin-top: 20px;
          letter-spacing: 0.01em;
        }

        .reserve-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(22,163,74,0.4);
        }

        .reserve-btn:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .modal-input {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          margin-bottom: 4px;
          font-size: 15px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s;
          background: #fafafa;
        }

        .modal-input:focus {
          border-color: #16a34a;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }

        .modal-input.error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .modal-animate { animation: slideUp 0.25s ease; }
        .page-animate { animation: fadeIn 0.3s ease; }

        .img-thumb { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .img-thumb:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }

        .feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          border-radius: 999px;
          background: #f1f5f9;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          border: 1px solid #e2e8f0;
        }
      `}</style>

      <Header />

      <main style={{ background: '#f7f8fa', padding: '24px 20px', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="page-animate">
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 32, gridTemplateColumns: isDesktop ? '2fr 1fr' : '1fr' }}>

          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div>
            {/* Main image */}
            <div
              style={{
                height: isDesktop ? 340 : 240,
                borderRadius: 24,
                backgroundImage: `url(${images[activeImage]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                transition: 'background-image 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Gradient overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)' }} />
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    className="img-thumb"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      backgroundImage: `url(${img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: activeImage === i ? '2.5px solid #16a34a' : '2.5px solid transparent',
                      cursor: 'pointer',
                      boxShadow: activeImage === i ? '0 0 0 2px rgba(22,163,74,0.25)' : 'none',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Title */}
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 10, lineHeight: 1.2 }}>
              {field.name}
            </h1>

            {/* Price pills */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, background: '#ecfeff', border: '1px solid #a5f3fc', fontWeight: 700, fontSize: 14, color: '#0e7490' }}>
                🌞 Día — {formatCRC(field.price_day)}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, background: '#f3e8ff', border: '1px solid #d8b4fe', fontWeight: 700, fontSize: 14, color: '#7c3aed' }}>
                🌙 Noche — {formatCRC(field.price_night)}
              </span>
            </div>

            {/* Features */}
            {field.features?.length ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                {field.features.map((f) => (
                  <span key={f} className="feature-pill">✓ {f}</span>
                ))}
              </div>
            ) : null}

            {/* Description */}
            {field.description && (
              <p style={{ color: '#64748b', lineHeight: 1.7, fontSize: 15, marginBottom: 0, maxWidth: 560 }}>
                {field.description}
              </p>
            )}
          </div>

          {/* ── RIGHT COLUMN (Booking Card) ──────────────────────────────── */}
          <aside style={{
            background: 'white',
            borderRadius: 24,
            padding: 24,
            boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 48px rgba(0,0,0,0.10)',
            height: 'fit-content',
            position: isDesktop ? 'sticky' : 'static',
            top: 24,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: '#16a34a', textTransform: 'uppercase', marginBottom: 4 }}>
              Selecciona fecha y hora
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              ¿Cuándo quieres jugar?
            </h2>

            {/* Calendar */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <DayPicker
                mode="single"
                selected={date}
                disabled={{ before: new Date() }}
                onSelect={handleDateSelect}
              />
            </div>

            {/* Hour slots */}
            {date && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    Horarios disponibles
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: '#16a34a', display: 'inline-block' }} /> Libre
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: '#e5e7eb', display: 'inline-block' }} /> Ocupado
                    </span>
                  </div>
                </div>

                {loadingHours ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : sortedHours.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '20px 0' }}>
                    No hay horarios configurados
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {sortedHours.map((h) => {
                      const blocked = bookedHours.includes(h)
                      const selected = hour === h
                      const night = isNightHour(h)

                      const { display, period } = to12h(h)
                      return (
                        <button
                          key={h}
                          disabled={blocked}
                          onClick={() => setHour(h)}
                          className={`hour-btn ${selected ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
                          aria-label={`${display} ${period}${blocked ? ', ocupado' : ''}`}
                          aria-pressed={selected}
                        >
                          <span style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                            {display}
                            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75 }}>{period}</span>
                          </span>
                          <span className="hour-tag" style={{ color: selected ? 'rgba(255,255,255,0.8)' : night ? '#7c3aed' : '#0e7490' }}>
                            {blocked ? '✗ Ocupado' : night ? '🌙 Noche' : '🌞 Día'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected summary */}
            {date && hour && (
              <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    📅 {date.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })} · {(() => { const { display, period } = to12h(hour); return `${display} ${period}` })()}
                  </span>
                  <span style={{ fontWeight: 800, color: '#15803d', fontSize: 15 }}>
                    {formatCRC(selectedPrice)}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                  Tarifa {isNight ? 'nocturna 🌙' : 'diurna 🌞'}
                </span>
              </div>
            )}

            <button
              className="reserve-btn"
              onClick={handleOpenModal}
              disabled={!date || !hour}
              aria-disabled={!date || !hour}
            >
              {!date ? 'Elige una fecha' : !hour ? 'Elige un horario' : 'Reservar ahora →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 10, fontWeight: 500 }}>
              ✅ Golplay no cobra adelantos.
            </p>
          </aside>
        </div>
      </main>

      {/* ── BOOKING MODAL ─────────────────────────────────────────────────────── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="modal-animate"
            style={{
              background: 'white',
              borderRadius: 24,
              width: '100%',
              maxWidth: 420,
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {bookingStatus === 'success' ? (
              // ── Success State
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>¡Reserva confirmada!</h3>
                <p style={{ color: '#64748b', fontSize: 15 }}>Te enviamos los detalles a tu correo. ¡A jugar!</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ padding: '24px 24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <p id="modal-title" style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                        Confirmar reserva
                      </p>
                      <p style={{ fontSize: 13, color: '#64748b' }}>{field.name}</p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      aria-label="Cerrar"
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Booking summary card */}
                  <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Fecha', value: date?.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' }) },
                        { label: 'Hora', value: (() => { const { display, period } = to12h(hour); return `${display} ${period}` })() },
                        { label: 'Tarifa', value: isNight ? '🌙 Nocturna' : '🌞 Diurna' },
                        { label: 'Precio', value: formatCRC(selectedPrice) },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div style={{ padding: '0 24px 24px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Tus datos</p>

                  {/* Error banner */}
                  {bookingStatus === 'error' && (
                    <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 12, fontSize: 14, color: '#dc2626', fontWeight: 500 }}>
                      ⚠️ No se pudo completar la reserva. Intenta de nuevo.
                    </div>
                  )}

                  {/* Name */}
                  <input
                    className={`modal-input ${formErrors.name ? 'error' : ''}`}
                    placeholder="Nombre completo"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: '' })) }}
                    autoComplete="name"
                  />
                  {formErrors.name && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, fontWeight: 500 }}>⚠ {formErrors.name}</p>}

                  {/* Phone */}
                  <input
                    className={`modal-input ${formErrors.phone ? 'error' : ''}`}
                    placeholder="Teléfono (ej: 8888-8888)"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setFormErrors(p => ({ ...p, phone: '' })) }}
                    type="tel"
                    autoComplete="tel"
                    style={{ marginTop: 8 }}
                  />
                  {formErrors.phone && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, fontWeight: 500 }}>⚠ {formErrors.phone}</p>}

                  {/* Email */}
                  <input
                    className={`modal-input ${formErrors.email ? 'error' : ''}`}
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })) }}
                    type="email"
                    autoComplete="email"
                    style={{ marginTop: 8 }}
                  />
                  {formErrors.email && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, fontWeight: 500 }}>⚠ {formErrors.email}</p>}

                  {/* Confirm button */}
                  <button
                    onClick={handleConfirm}
                    disabled={bookingStatus === 'sending'}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: 14,
                      background: bookingStatus === 'sending' ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 15,
                      border: 'none',
                      cursor: bookingStatus === 'sending' ? 'not-allowed' : 'pointer',
                      marginTop: 16,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      letterSpacing: '0.01em',
                      boxShadow: bookingStatus === 'sending' ? 'none' : '0 4px 20px rgba(22,163,74,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {bookingStatus === 'sending' ? '⏳ Procesando...' : `Confirmar reserva — ${formatCRC(selectedPrice)}`}
                  </button>

                  <button
                    onClick={() => setShowModal(false)}
                    style={{ width: '100%', padding: 12, background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 6, fontSize: 14 }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
