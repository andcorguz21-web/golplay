import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Header from '@/components/ui/Header'

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

type Field = {
  id: number
  name: string
  price_day: number
  location: string
  image?: string
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=60'

const formatCRC = (amount: number) =>
  `₡${Number(amount).toLocaleString('es-CR')}`

export default function Home() {
  const router = useRouter()

  const [fieldsByLocation, setFieldsByLocation] = useState<
    Record<string, Field[]>
  >({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      /* ===================== */
      /* LOAD FIELDS (PRICE DAY) */
      /* ===================== */
      const { data: fields, error } = await supabase
        .from('fields')
        .select('id, name, price_day, location')
        .eq('active', true)
        .order('name')

      if (error || !fields) {
        console.error('FIELDS ERROR:', error)
        setLoading(false)
        return
      }

      /* ===================== */
      /* LOAD ALL IMAGES */
      /* ===================== */
      const { data: images } = await supabase
        .from('field_images')
        .select('field_id, url, is_main')

      /* ===================== */
      /* MAP FIELDS */
      /* ===================== */
      const map = new Map<number, Field>()

      fields.forEach((f) => {
        map.set(f.id, {
          id: f.id,
          name: f.name,
          price_day: Number(f.price_day ?? 0),
          location: f.location ?? 'Sin ubicación',
          image: FALLBACK_IMAGE,
        })
      })

      /* ===================== */
      /* ASSIGN MAIN IMAGE OR FIRST */
      /* ===================== */
      images?.forEach((img) => {
        const field = map.get(img.field_id)
        if (!field || !img.url) return

        // Prioridad a imagen principal
        if (img.is_main) {
          field.image = img.url
        } else if (field.image === FALLBACK_IMAGE) {
          // Si no hay main, usa la primera disponible
          field.image = img.url
        }
      })

      /* ===================== */
      /* GROUP BY LOCATION */
      /* ===================== */
      const grouped: Record<string, Field[]> = {}

      Array.from(map.values()).forEach((f) => {
        if (!grouped[f.location]) grouped[f.location] = []
        grouped[f.location].push(f)
      })

      setFieldsByLocation(grouped)
      setLoading(false)
    }

    load()
  }, [])

  return (
    <>
      <Header />

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Reservá tu cancha{' '}
            <span style={{ color: '#16a34a' }}>en segundos</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Complejos disponibles, precios claros y reservas rápidas.
          </p>
        </div>
      </section>

      {/* MARKETPLACE */}
      <main style={styles.page}>
        {!loading &&
          Object.entries(fieldsByLocation).map(([location, fields]) => (
            <section key={location} style={styles.section}>
              <h2 style={styles.sectionTitle}>{location}</h2>

              <Swiper spaceBetween={20} slidesPerView="auto">
                {fields.map((f) => (
                  <SwiperSlide key={f.id} style={{ width: 300 }}>
                    <div
                      style={styles.card}
                      onClick={() => router.push(`/reserve/${f.id}`)}
                    >
                      <div
                        style={{
                          ...styles.image,
                          backgroundImage: `url(${f.image})`,
                        }}
                      />
                      <div style={styles.cardBody}>
                        <h3 style={styles.cardTitle}>{f.name}</h3>
                        <p style={styles.cardPrice}>
                          Desde {formatCRC(f.price_day)}
                        </p>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </section>
          ))}
      </main>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <h4>GOLPLAY</h4>
            <p style={styles.footerText}>
              Marketplace de complejos deportivos en Costa Rica.
            </p>
          </div>

          <div>
            <h4>Información</h4>
            <a href="/terms" style={styles.footerLink}>Términos y condiciones</a>
            <a href="/about" style={styles.footerLink}>Sobre GolPlay</a>
            <a href="/join" style={styles.footerLink}>Guía para unirse</a>
          </div>

          <div>
            <h4>Contacto</h4>
            <a href="mailto:gestion@golplay.app" style={styles.footerLink}>
              gestion@golplay.app
            </a>
            <a href="tel:+50671335020" style={styles.footerLink}>
              +506 7133 5020
            </a>
          </div>
        </div>

        <p style={styles.footerCopy}>
          © {new Date().getFullYear()} GolPlay. Todos los derechos reservados.
        </p>
      </footer>
    </>
  )
}

/* STYLES: SIN CAMBIOS */

/* ===================== */
/* STYLES (SIN CAMBIOS) */
/* ===================== */

const styles: any = {
  page: { background: '#f7f7f7', padding: '40px 16px' },
  hero: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)',
    padding: '60px 20px',
    textAlign: 'center',
  },
  heroContent: { maxWidth: 900, margin: '0 auto' },
  heroTitle: { fontSize: 36, fontWeight: 800, marginBottom: 12 },
  heroSubtitle: { fontSize: 18, color: '#6b7280' },
  section: { maxWidth: 1200, margin: '0 auto 40px' },
  sectionTitle: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  card: {
    background: 'white',
    borderRadius: 45,
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(220, 218, 218, 0.12)',
    cursor: 'pointer',
  },
  image: {
    height: 180,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  cardPrice: { color: '#6b7280', fontSize: 14 },
  footer: {
    background: '#111827',
    color: 'white',
    padding: '40px 20px',
    marginTop: 60,
  },
  footerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 30,
  },
  footerText: { fontSize: 14, color: '#9ca3af' },
  footerLink: {
    display: 'block',
    fontSize: 14,
    color: '#e5e7eb',
    marginTop: 4,
    textDecoration: 'none',
  },
  footerCopy: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 13,
    color: '#9ca3af',
  },
}
