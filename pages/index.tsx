import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Header from '@/components/ui/Header'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

type Field = {
  id: number
  name: string
  price_day: number
  location: string
  sport: string | null
  image: string | null
}

const formatCRC = (amount: number) =>
  `₡${Number(amount).toLocaleString('es-CR')}`

function FieldCard({ field }: { field: Field }) {
  const router = useRouter()
  return (
    <article
      onClick={() => router.push(`/reserve/${field.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/reserve/${field.id}`)}
      aria-label={`Reservar ${field.name}, desde ${formatCRC(field.price_day)}`}
      className="field-card"
    >
      <div className="field-card__image-wrap">
        {field.image ? (
          <Image
            src={field.image}
            alt={field.name}
            fill
            sizes="(max-width: 640px) 90vw, 300px"
            style={{ objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <div className="field-card__no-image" aria-hidden="true">
            <span>⚽</span>
          </div>
        )}
        <div className="field-card__overlay" />
        <span className="field-card__price">Desde {formatCRC(field.price_day)}</span>
      </div>
      <div className="field-card__body">
        <h3 className="field-card__name">{field.name}</h3>
        <span className="field-card__cta">Reservar →</span>
      </div>
    </article>
  )
}

function FieldCardSkeleton() {
  return (
    <div className="field-card field-card--skeleton">
      <div className="field-card__image-wrap skeleton-box" />
      <div className="field-card__body">
        <div className="skeleton-line" style={{ width: '70%', height: 16, marginBottom: 8 }} />
        <div className="skeleton-line" style={{ width: '40%', height: 13 }} />
      </div>
    </div>
  )
}

const PAGE_CSS = `
  :root {
    --green: #16a34a;
    --green-dark: #15803d;
    --green-light: #dcfce7;
    --ink: #0c1a0e;
    --muted: #6b7280;
    --surface: #f7f8fa;
    --radius: 20px;
    --shadow-card: 0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: var(--surface); color: var(--ink); -webkit-font-smoothing: antialiased; }

  .hero {
    position: relative; min-height: 400px; display: flex; align-items: center;
    overflow: hidden; padding: 60px 20px 50px;
    background:
      radial-gradient(ellipse at 70% 50%, rgba(22,163,74,0.35) 0%, transparent 60%),
      radial-gradient(ellipse at 20% 80%, rgba(21,128,61,0.25) 0%, transparent 50%),
      linear-gradient(135deg, #0c1a0e 0%, #0f2d14 50%, #0c1a0e 100%);
  }
  .hero::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background-image: repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px);
  }
  .hero__content { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; text-align: center; }
  .hero__eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(22,163,74,0.18); border: 1px solid rgba(22,163,74,0.4);
    color: #86efac; font-size: 12px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; padding: 6px 16px; border-radius: 999px;
    margin-bottom: 18px; animation: fadeUp 0.5s ease both;
  }
  .hero__title {
    font-family: 'Syne', sans-serif; font-size: clamp(28px, 5vw, 52px);
    font-weight: 800; color: white; line-height: 1.08; margin-bottom: 12px;
    animation: fadeUp 0.5s 0.1s ease both;
  }
  .hero__title em { font-style: normal; color: #4ade80; }
  .hero__subtitle {
    font-size: clamp(14px, 2vw, 17px); color: rgba(255,255,255,0.7);
    margin-bottom: 28px; line-height: 1.6; animation: fadeUp 0.5s 0.2s ease both;
  }
  .hero__cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 28px; border-radius: 14px; background: var(--green);
    color: white; font-weight: 700; font-size: 15px; border: none;
    cursor: pointer; font-family: inherit; transition: background 0.15s, transform 0.15s;
    box-shadow: 0 4px 20px rgba(22,163,74,0.4); animation: fadeUp 0.5s 0.3s ease both;
  }
  .hero__cta:hover { background: var(--green-dark); transform: translateY(-2px); }
  .hero__stats {
    display: flex; justify-content: center; gap: 28px;
    margin-top: 32px; animation: fadeUp 0.5s 0.4s ease both; flex-wrap: wrap;
  }
  .stat { text-align: center; }
  .stat__number { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #4ade80; display: block; }
  .stat__label { font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 500; }

  .filter-banner { background: white; border-bottom: 1px solid #f0f0f0; padding: 14px 20px; }
  .filter-banner__inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  }
  .filter-banner__text { font-size: 14px; color: var(--muted); }
  .filter-banner__text strong { color: var(--ink); }
  .filter-banner__clear { font-size: 13px; color: #ef4444; background: none; border: none; cursor: pointer; font-family: inherit; font-weight: 600; padding: 0; }

  .how { background: white; padding: 56px 20px; }
  .section-label {
    display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--green); margin-bottom: 8px; text-align: center;
  }
  .section-title {
    font-family: 'Syne', sans-serif; font-size: clamp(20px, 4vw, 30px);
    font-weight: 800; color: var(--ink); text-align: center; margin-bottom: 40px;
  }
  .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; max-width: 860px; margin: 0 auto; }
  .step { text-align: center; padding: 24px 20px; border-radius: var(--radius); background: var(--surface); transition: box-shadow 0.2s, transform 0.2s; }
  .step:hover { box-shadow: var(--shadow-card); transform: translateY(-4px); }
  .step__icon { width: 52px; height: 52px; border-radius: 14px; background: var(--green-light); display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 14px; }
  .step__title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 6px; color: var(--ink); }
  .step__desc { font-size: 13px; color: var(--muted); line-height: 1.6; }

  .marketplace { padding: 40px 20px 56px; background: var(--surface); }
  .location-section { max-width: 1200px; margin: 0 auto 44px; }
  .location-header { display: flex; align-items: center; margin-bottom: 18px; gap: 10px; }
  .location-title { font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; }
  .location-count { font-size: 12px; font-weight: 600; color: var(--green); background: var(--green-light); padding: 3px 10px; border-radius: 999px; }

  .field-card {
    width: 280px; background: white; border-radius: var(--radius); overflow: hidden;
    box-shadow: var(--shadow-card); cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    outline: none; border: 2px solid transparent; display: block;
  }
  .field-card:hover { transform: translateY(-6px); box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.10); }
  .field-card:focus-visible { border-color: var(--green); }
  .field-card__image-wrap { position: relative; height: 175px; overflow: hidden; background: #e5e7eb; }
  .field-card__no-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
  .field-card__overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%); }
  .field-card__price { position: absolute; bottom: 12px; left: 12px; font-size: 13px; font-weight: 700; color: white; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); }
  .field-card__body { padding: 14px 16px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .field-card__name { font-size: 15px; font-weight: 600; color: var(--ink); line-height: 1.3; flex: 1; }
  .field-card__cta { font-size: 13px; font-weight: 700; color: var(--green); white-space: nowrap; flex-shrink: 0; transition: letter-spacing 0.15s; }
  .field-card:hover .field-card__cta { letter-spacing: 0.03em; }
  .field-card--skeleton { pointer-events: none; }

  .skeleton-box { background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
  .skeleton-line { border-radius: 6px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }

  .no-results { text-align: center; padding: 60px 20px; color: var(--muted); }
  .no-results__icon { font-size: 48px; display: block; margin-bottom: 12px; }
  .no-results__title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }

  .trust { background: var(--ink); padding: 56px 20px; }
  .trust__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 28px; max-width: 900px; margin: 0 auto; }
  .trust__item { text-align: center; }
  .trust__icon { font-size: 30px; display: block; margin-bottom: 10px; }
  .trust__title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: white; margin-bottom: 6px; }
  .trust__desc { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.6; }

  .cta-band { background: linear-gradient(135deg, var(--green) 0%, #166534 100%); padding: 56px 20px; text-align: center; }
  .cta-band__title { font-family: 'Syne', sans-serif; font-size: clamp(22px, 4vw, 34px); font-weight: 800; color: white; margin-bottom: 10px; }
  .cta-band__sub { font-size: 16px; color: rgba(255,255,255,0.75); margin-bottom: 24px; }
  .cta-band__btn { display: inline-block; padding: 15px 34px; background: white; color: var(--green-dark); border-radius: 14px; font-weight: 700; font-size: 16px; text-decoration: none; font-family: 'DM Sans', sans-serif; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
  .cta-band__btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.2); }

  .footer { background: #0a1209; color: white; padding: 48px 20px 24px; }
  .footer__inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1.5fr repeat(2, 1fr); gap: 40px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .footer__brand { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #4ade80; margin-bottom: 10px; display: block; }
  .footer__tagline { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.6; }
  .footer__col-title { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 14px; }
  .footer__link { display: block; font-size: 14px; color: rgba(255,255,255,0.7); text-decoration: none; margin-bottom: 10px; transition: color 0.15s; }
  .footer__link:hover { color: #4ade80; }
  .footer__copy { text-align: center; margin-top: 24px; font-size: 13px; color: rgba(255,255,255,0.25); }

  .swiper { padding-bottom: 4px !important; overflow: visible !important; }
  .swiper-slide { width: auto !important; }
  .swiper-button-next, .swiper-button-prev { color: var(--green) !important; background: white; width: 36px !important; height: 36px !important; border-radius: 50%; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
  .swiper-button-next::after, .swiper-button-prev::after { font-size: 13px !important; font-weight: 800 !important; }

  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--ink); color: white; padding: 14px 24px; border-radius: 14px; font-weight: 600; font-size: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); z-index: 9999; display: flex; align-items: center; gap: 10px; white-space: nowrap; animation: toastIn 0.3s ease; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  @media (max-width: 640px) { .footer__inner { grid-template-columns: 1fr; } }
`

export default function Home() {
  const router = useRouter()
  const [fieldsByLocation, setFieldsByLocation] = useState<Record<string, Field[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const qText  = (router.query.q     as string) ?? ''
  const qDate  = (router.query.date  as string) ?? ''
  const qHour  = (router.query.hour  as string) ?? ''
  const qSport = (router.query.sport as string) ?? ''
  const hasFilters = !!(qText || qDate || qHour || qSport)

  useEffect(() => {
    if (router.query.reserva === 'ok') {
      setShowToast(true)
      const t = setTimeout(() => setShowToast(false), 4000)
      router.replace('/', undefined, { shallow: true })
      return () => clearTimeout(t)
    }
  }, [router.query.reserva])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const [{ data: fields, error }, { data: images }] = await Promise.all([
          supabase
            .from('fields')
            .select('id, name, price_day, location')
            .eq('active', true)
            .order('name'),
          supabase
            .from('field_images')
            .select('field_id, url, is_main'),
        ])

        if (error || !fields) throw error

        const map = new Map<number, Field>()
        fields.forEach((f) =>
          map.set(f.id, {
            id: f.id,
            name: f.name,
            price_day: Number(f.price_day ?? 0),
            location: f.location ?? 'Sin ubicación',
            sport: null, // add sport column to your fields table to enable sport filtering
            image: null,
          })
        )

        images?.forEach((img) => {
          const field = map.get(img.field_id)
          if (!field || !img.url) return
          if (img.is_main || field.image === null) field.image = img.url
        })

        const grouped: Record<string, Field[]> = {}
        map.forEach((f) => {
          if (!grouped[f.location]) grouped[f.location] = []
          grouped[f.location].push(f)
        })

        setFieldsByLocation(grouped)
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredLocations = useMemo(() => {
    const result: Record<string, Field[]> = {}
    Object.entries(fieldsByLocation).forEach(([loc, fields]) => {
      const matched = fields.filter((f) => {
        if (qText && !f.name.toLowerCase().includes(qText.toLowerCase()) &&
            !f.location.toLowerCase().includes(qText.toLowerCase())) return false
        if (qSport && f.sport && f.sport.toLowerCase() !== qSport.toLowerCase()) return false
        return true
      })
      if (matched.length) result[loc] = matched
    })
    return result
  }, [fieldsByLocation, qText, qSport])

  const hasResults = Object.keys(filteredLocations).length > 0
  const totalFields = Object.values(fieldsByLocation).flat().length

  const scrollToCanchas = () =>
    document.getElementById('canchas')?.scrollIntoView({ behavior: 'smooth' })

  const filterSummary = [
    qText  && `"${qText}"`,
    qSport && qSport,
    qDate  && new Date(qDate + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }),
    qHour  && qHour,
  ].filter(Boolean).join(' · ')

  const clearFilters = () => router.push('/', undefined, { shallow: true })

  return (
    <>
      <Head>
        <title>GolPlay — Reservá tu cancha en Costa Rica</title>
        <meta name="description" content="Encontrá y reservá canchas de fútbol, pádel y más en los mejores complejos de Costa Rica. Precios claros, reservas rápidas." />
        <meta property="og:title" content="GolPlay — Reservá tu cancha en segundos" />
        <meta property="og:description" content="Marketplace de complejos deportivos en Costa Rica. Reservas simples, sin llamadas." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{PAGE_CSS}</style>

      <Header />

      {/* HERO */}
      {!hasFilters && (
        <section className="hero" aria-label="Bienvenida a GolPlay">
          <div className="hero__content">
            <span className="hero__eyebrow">💚 Costa Rica · Reservas en línea</span>
            <h1 className="hero__title">
              Reservá tu cancha<br />
              <em>en segundos</em>
            </h1>
            <p className="hero__subtitle">
              Los mejores complejos deportivos de Costa Rica.<br />
              Precios claros, sin llamadas, sin filas.
            </p>
            <button className="hero__cta" onClick={scrollToCanchas}>
              Ver canchas disponibles ↓
            </button>
            <div className="hero__stats">
              <div className="stat">
                <span className="stat__number">{loading ? '...' : `${totalFields}+`}</span>
                <span className="stat__label">Canchas</span>
              </div>
              <div className="stat">
                <span className="stat__number">{loading ? '...' : Object.keys(fieldsByLocation).length}</span>
                <span className="stat__label">Ubicaciones</span>
              </div>
              <div className="stat">
                <span className="stat__number">24/7</span>
                <span className="stat__label">Disponible</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FILTER BANNER */}
      {hasFilters && !loading && (
        <div className="filter-banner">
          <div className="filter-banner__inner">
            <p className="filter-banner__text">
              Mostrando{' '}
              <strong>{Object.values(filteredLocations).flat().length} canchas</strong>
              {filterSummary && <> para <strong>{filterSummary}</strong></>}
            </p>
            <button className="filter-banner__clear" onClick={clearFilters}>
              ✕ Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* HOW IT WORKS */}
      {!hasFilters && (
        <section className="how" aria-labelledby="how-title">
          <span className="section-label">¿Cómo funciona?</span>
          <h2 className="section-title" id="how-title">Reservar nunca fue tan fácil</h2>
          <div className="steps">
            {[
              { icon: '🔍', title: 'Explorá', desc: 'Buscá entre los mejores complejos deportivos por zona o nombre.' },
              { icon: '📅', title: 'Elegí fecha y hora', desc: 'Seleccioná el día y horario que mejor te venga, con disponibilidad en tiempo real.' },
              { icon: '✅', title: 'Confirmá y jugá', desc: 'Ingresá tus datos, confirmá y recibí la reserva directamente en tu correo.' },
            ].map((step) => (
              <div className="step" key={step.title}>
                <div className="step__icon" aria-hidden="true">{step.icon}</div>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MARKETPLACE */}
      <main id="canchas" className="marketplace">
        {!hasFilters && (
          <>
            <span className="section-label">Canchas disponibles</span>
            <h2 className="section-title">Encontrá tu lugar de juego</h2>
          </>
        )}

        {loading && (
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {[1, 2].map((i) => (
              <div key={i} className="location-section">
                <div className="skeleton-line" style={{ width: 160, height: 22, marginBottom: 20 }} />
                <div style={{ display: 'flex', gap: 20 }}>
                  {[1, 2, 3].map((j) => <FieldCardSkeleton key={j} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="no-results">
            <span className="no-results__icon">⚠️</span>
            <p className="no-results__title">No pudimos cargar las canchas</p>
            <p>Intentá refrescar la página.</p>
          </div>
        )}

        {!loading && !loadError && !hasResults && (
          <div className="no-results">
            <span className="no-results__icon">🔍</span>
            <p className="no-results__title">
              {hasFilters ? 'Sin canchas para esos filtros' : 'No hay canchas disponibles'}
            </p>
            <p>
              {hasFilters
                ? 'Probá ajustando la búsqueda.'
                : 'Volvé pronto, estamos agregando más complejos.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{ marginTop: 16, padding: '10px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14 }}
              >
                Ver todas las canchas
              </button>
            )}
          </div>
        )}

        {!loading && !loadError && hasResults &&
          Object.entries(filteredLocations).map(([location, fields]) => (
            <section key={location} className="location-section" aria-labelledby={`loc-${location}`}>
              <div className="location-header">
                <h2 className="location-title" id={`loc-${location}`}>
                  📍 {location}
                  <span className="location-count">
                    {fields.length} {fields.length === 1 ? 'cancha' : 'canchas'}
                  </span>
                </h2>
              </div>
              <Swiper
                modules={[Navigation]}
                spaceBetween={16}
                slidesPerView="auto"
                navigation
                a11y={{ enabled: true }}
              >
                {fields.map((f) => (
                  <SwiperSlide key={f.id}>
                    <FieldCard field={f} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </section>
          ))
        }
      </main>

      {/* TRUST */}
      {!hasFilters && (
        <section className="trust" aria-labelledby="trust-title">
          <span className="section-label" style={{ color: '#4ade80' }}>Por qué GolPlay</span>
          <h2 className="section-title" id="trust-title" style={{ color: 'white' }}>
            Diseñado para jugadores
          </h2>
          <div className="trust__grid">
            {[
              { icon: '⚡', title: 'Reserva instantánea', desc: 'Sin llamadas, sin esperas. Tu reserva queda confirmada en segundos.' },
              { icon: '💸', title: 'Precios transparentes', desc: 'Lo que ves es lo que pagás. Sin cargos ocultos ni sorpresas.' },
              { icon: '📱', title: '100% en línea', desc: 'Reservá desde el celular en cualquier momento, donde estés.' },
              { icon: '🔒', title: 'Confirmación por correo', desc: 'Recibís un comprobante de tu reserva directamente a tu email.' },
            ].map((item) => (
              <div className="trust__item" key={item.title}>
                <span className="trust__icon" aria-hidden="true">{item.icon}</span>
                <h3 className="trust__title">{item.title}</h3>
                <p className="trust__desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA BAND */}
      {!hasFilters && (
        <section className="cta-band" aria-label="Llamada a la acción">
          <h2 className="cta-band__title">¿Listo para jugar?</h2>
          <p className="cta-band__sub">Encontrá tu cancha ideal y reservá ahora mismo.</p>
          <a
            href="#canchas"
            className="cta-band__btn"
            onClick={(e) => { e.preventDefault(); scrollToCanchas() }}
          >
            Ver canchas disponibles
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="footer" role="contentinfo">
        <div className="footer__inner">
          <div>
            <span className="footer__brand">GOLPLAY</span>
            <p className="footer__tagline">
              Marketplace de complejos deportivos en Costa Rica. Reservas simples, rápidas y sin complicaciones.
            </p>
          </div>
          <nav aria-label="Información">
            <p className="footer__col-title">Información</p>
            <Link href="/terms" className="footer__link">Términos y condiciones</Link>
            <Link href="/about" className="footer__link">Sobre GolPlay</Link>
            <Link href="/join" className="footer__link">Guía para unirse</Link>
          </nav>
          <div>
            <p className="footer__col-title">Contacto</p>
            <a href="mailto:gestion@golplay.app" className="footer__link">gestion@golplay.app</a>
            <a href="tel:+50671335020" className="footer__link">+506 7133 5020</a>
          </div>
        </div>
        <p className="footer__copy">
          © {new Date().getFullYear()} GolPlay. Todos los derechos reservados.
        </p>
      </footer>

      {/* TOAST */}
      {showToast && (
        <div className="toast" role="status" aria-live="polite">
          🎉 ¡Reserva confirmada! Revisá tu correo.
        </div>
      )}
    </>
  )
}
