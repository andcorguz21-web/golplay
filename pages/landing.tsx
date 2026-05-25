/**
 * GolPlay — Landing de dueños (B2B)
 * pages/landing.tsx  ·  Plan fijo ₡35.000/mes · 1 mes gratis · sin comisión por reserva
 * DS: Syne + DM Sans + tokens globales. Calculadora de costo por reserva como pieza central.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BarChart2, Shield, Zap, Clock,
  CheckCircle, ArrowRight, Star, Menu, X,
  TrendingUp, Bell, CreditCard,
} from 'lucide-react'

// ─── Animation hook ─────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ─── Data ───────────────────────────────────────────────────────
const PLAN_CRC = 35000

const BENEFITS = [
  { icon: TrendingUp,  title: 'Más reservas, menos esfuerzo',  desc: 'Tu cancha visible las 24 horas. Los jugadores reservan solos mientras vos dormís.' },
  { icon: Bell,        title: 'Adiós al caos del WhatsApp',     desc: 'Eliminá mensajes interminables. Todo queda en el sistema, organizado y confirmado.' },
  { icon: Shield,      title: 'Cero dobles reservas',           desc: 'Validación automática en tiempo real. Si está ocupado, no se puede reservar.' },
  { icon: Clock,       title: 'Control total de horarios',      desc: 'Configurá disponibilidad, bloqueá horas, ajustá precios día y noche desde el panel.' },
  { icon: BarChart2,   title: 'Métricas que te hacen crecer',   desc: 'Sabé qué canchas rinden más, en qué horarios y cuánto ingresás cada mes.' },
  { icon: CreditCard,  title: 'Plan fijo, sin sorpresas',       desc: 'Un solo monto mensual. Sin comisión por reserva — sin importar cuántas tengas.' },
]

const STEPS = [
  { num: '01', title: 'Registrás tu complejo',            desc: 'Creás tu cuenta en minutos. Sin papelería, sin contratos largos.' },
  { num: '02', title: 'Configurás canchas y horarios',    desc: 'Agregás tus canchas, precios, disponibilidad y reglas. Vos mandás.' },
  { num: '03', title: 'Recibís reservas automáticamente', desc: 'Los jugadores te encuentran y reservan solos. 24/7, sin intermediarios.' },
  { num: '04', title: 'Gestionás todo desde el panel',    desc: 'Calendario, reservas, ingresos y métricas. Todo en un solo lugar.' },
]

const COUNTRIES = [
  { flag: '🇲🇽', name: 'México',     rate: '~$1,350 MXN/mes' },
  { flag: '🇨🇴', name: 'Colombia',   rate: '~$315K COP/mes' },
  { flag: '🇦🇷', name: 'Argentina',  rate: '~$71K ARS/mes' },
  { flag: '🇨🇱', name: 'Chile',      rate: '~$72K CLP/mes' },
  { flag: '🇵🇪', name: 'Perú',       rate: '~S/ 280/mes' },
  { flag: '🇺🇾', name: 'Uruguay',    rate: '~$2,950 UYU/mes' },
  { flag: '🇨🇷', name: 'Costa Rica', rate: '₡35,000/mes' },
  { flag: '🇵🇦', name: 'Panamá',     rate: '$75 USD/mes' },
]

// ─── Navbar (slim, owner-focused) ───────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const NAV = [
    { label: 'Beneficios',    href: '#beneficios' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Precio',        href: '#precio' },
    { label: 'Canchas',       href: '#canchas' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(8,14,10,.93)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px) saturate(1.5)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,.08)' : 'none',
      transition: 'all .3s ease', padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 100, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="nav-desktop">
          {NAV.map(({ label, href }) => (
            <a key={label} href={href}
              style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontWeight: 500, transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
            >{label}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontWeight: 500, padding: '8px 14px' }} className="hide-mobile">Ingresar</Link>
          <Link href="/register?type=owner" style={{
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-d)', color: '#fff', background: 'var(--g6)',
            padding: '9px 18px', borderRadius: 10, textDecoration: 'none',
            transition: 'all .15s', boxShadow: '0 2px 14px rgba(22,163,74,.4)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--g7)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--g6)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >Probá 1 mes gratis →</Link>
          <button onClick={() => setMobileOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, display: 'none' }} className="nav-mobile-btn" aria-label="Menú">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ background: 'rgba(8,14,10,.97)', borderTop: '1px solid rgba(255,255,255,.08)', padding: '20px 24px 28px' }}>
          {NAV.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setMobileOpen(false)}
              style={{ display: 'block', fontSize: 16, color: 'rgba(255,255,255,.8)', textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>{label}</a>
          ))}
          <Link href="/register?type=owner" style={{ display: 'block', marginTop: 20, textAlign: 'center', background: 'var(--g6)', color: '#fff', fontWeight: 700, fontFamily: 'var(--font-d)', padding: '14px', borderRadius: 12, textDecoration: 'none', fontSize: 15 }}>
            Empezar gratis →
          </Link>
        </div>
      )}
    </nav>
  )
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useInView()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`,
    }}>{children}</div>
  )
}

// ─── Pricing Calculator (₡35.000 fijo ÷ reservas) ───────────────
function PricingCalculator() {
  const [reservas, setReservas] = useState(120)
  const costPerReserva = reservas > 0 ? Math.round(PLAN_CRC / reservas) : 0
  const fmtCRC = (n: number) => `₡${n.toLocaleString('es-CR')}`

  return (
    <div style={{ maxWidth: 960, margin: '32px auto 0', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 22, padding: '28px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 18 }}>🧮</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>Calculá tu costo real por reserva</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>Reservas mensuales aproximadas</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={10} max={500} step={5} value={reservas}
              onChange={e => setReservas(Number(e.target.value))}
              style={{ width: 180, accentColor: 'var(--g5)', cursor: 'pointer' }} />
            <input type="number" min={1} max={9999} value={reservas}
              onChange={e => setReservas(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: 78, padding: '8px 10px', borderRadius: 10,
                border: '1.5px solid rgba(74,222,128,.3)', background: 'rgba(255,255,255,.06)',
                color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-d)',
                textAlign: 'center', outline: 'none',
              }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Le pagás a GolPlay</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--g4)', fontFamily: 'var(--font-d)' }}>{fmtCRC(PLAN_CRC)}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>fijo, sin importar cuántas</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Tu costo por reserva</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--g5)', fontFamily: 'var(--font-d)', transition: 'all .15s' }}>{fmtCRC(costPerReserva)}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>mientras más reservás, menos pagás</p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.35)', marginTop: 20, lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 16 }}>
        Sin comisión por reserva. Pagás lo mismo con 50 que con 500 reservas — la diferencia se la queda tu negocio, no nosotros.
      </p>
    </div>
  )
}

// ─── Photo Carousel (real field images) ─────────────────────────
function PhotoCarousel() {
  const [images, setImages] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('field_images')
        .select('url')
        .order('is_main', { ascending: false })
        .limit(30)
      if (data) setImages(data.map(d => d.url))
    })()
  }, [])

  if (images.length === 0) return null

  return (
    <section id="canchas" style={{ padding: '80px 0', background: 'var(--dark)', overflow: 'hidden' }}>
      <FadeIn>
        <div style={{ textAlign: 'center', marginBottom: 40, padding: '0 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>Canchas reales</div>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, letterSpacing: '-.03em', color: '#fff' }}>
            Así se ve GolPlay en acción
          </h2>
        </div>
      </FadeIn>

      <div ref={scrollRef} style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 24px 16px', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
        {images.map((url, i) => (
          <div key={i} style={{ flexShrink: 0, width: 320, height: 200, borderRadius: 16, overflow: 'hidden', scrollSnapAlign: 'start', border: '1px solid rgba(255,255,255,.08)' }}>
            <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>

      {images.length > 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => scrollRef.current?.scrollBy({ left: -340, behavior: 'smooth' })}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16 }}>←</button>
          <button onClick={() => scrollRef.current?.scrollBy({ left: 340, behavior: 'smooth' })}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16 }}>→</button>
        </div>
      )}
    </section>
  )
}

// ─── Page ───────────────────────────────────────────────────────
export default function LandingPage() {
  const [bookingCount, setBookingCount] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['confirmed', 'pending'])
      setBookingCount(count ?? 0)
    })()
  }, [])

  return (
    <>
      <Head>
        <title>GolPlay para complejos — Llená tus turnos, sin el caos del WhatsApp</title>
        <meta name="description" content="Sistema de reservas para complejos deportivos. Plan fijo ₡35.000/mes, sin comisión por reserva. 1 mes gratis para empezar." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        body { background: var(--dark); color: #fff; font-family: var(--font-u); }
        h1,h2,h3,h4 { font-family: var(--font-d); }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.4)} 50%{box-shadow:0 0 0 16px rgba(34,197,94,0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hero-card { animation: float 5s ease-in-out infinite; }
        .marquee-track { animation: marquee 30s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .benefits-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .cta-btns { flex-direction: column !important; }
          .hide-mobile { display: none !important; }
          .mobile-cta { display: block !important; }
        }
      `}</style>

      <Navbar />

      {/* ── 1. HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,197,94,.18) 0%, transparent 70%), var(--dark)',
        padding: '100px 24px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

            <div style={{ animation: 'fadeUp .8s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 999, padding: '6px 14px', marginBottom: 28 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--g5)', animation: 'pulse-green 2s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4)', letterSpacing: '.05em' }}>🌎 Pensado para toda LATAM</span>
              </div>

              <h1 style={{ fontSize: 'clamp(40px,5vw,66px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.03em', color: '#fff', marginBottom: 24 }}>
                Tu complejo<br /><span style={{ color: 'var(--g5)' }}>lleno.</span> Sin el<br />caos del WhatsApp.
              </h1>

              <p style={{ fontSize: 18, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 460, marginBottom: 40 }}>
                GolPlay automatiza tus reservas y te da control total de tu negocio — con un <strong style={{ color: '#fff' }}>plan fijo mensual, sin comisión por reserva</strong> y 1 mes gratis para probarlo sin riesgo.
              </p>

              <div className="cta-btns" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 44 }}>
                <Link href="/register?type=owner" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-d)', background: 'var(--g6)', color: '#fff', padding: '15px 28px', borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 800, boxShadow: '0 4px 32px rgba(22,163,74,.45)', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--g7)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--g6)'; e.currentTarget.style.transform = 'none' }}
                >Probá 1 mes gratis <ArrowRight size={16} /></Link>
                <a href="#como-funciona" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)', color: '#fff', padding: '15px 28px', borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,.12)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                >Ver cómo funciona</a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={13} fill="#fbbf24" color="#fbbf24" />)}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
                  {bookingCount !== null ? `+${bookingCount.toLocaleString('es-CR')} reservas gestionadas` : 'Reservas en tiempo real'}
                </span>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="hide-mobile" style={{ position: 'relative', animation: 'fadeUp .8s ease .2s both' }}>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: 24, backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Panel GolPlay</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Dashboard</div>
                  </div>
                  <div style={{ background: 'var(--g5)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--dark)' }}>EN VIVO</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Reservas hoy', value: '12',      color: 'var(--g4)' },
                    { label: 'Este mes',     value: '₡640K',   color: '#60a5fa' },
                    { label: 'Ocupación',    value: '87%',     color: '#a78bfa' },
                  ].map(k => (
                    <div key={k.label} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'var(--font-d)' }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Calendario — Hoy</div>
                  {[
                    { hour: '08:00', name: 'Carlos M.', cancha: 'Cancha A', status: 'active' },
                    { hour: '10:00', name: 'Andrea V.', cancha: 'Cancha B', status: 'active' },
                    { hour: '14:00', name: 'Libre',     cancha: '',         status: 'free' },
                    { hour: '16:00', name: 'Diego F.',  cancha: 'Cancha A', status: 'pending' },
                    { hour: '18:00', name: 'Mario S.',  cancha: 'Cancha B', status: 'active' },
                  ].map(row => (
                    <div key={row.hour} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', width: 36, flexShrink: 0 }}>{row.hour}</span>
                      <div style={{ flex: 1, borderRadius: 7, padding: '5px 10px', background: row.status === 'free' ? 'transparent' : row.status === 'active' ? 'rgba(34,197,94,.12)' : 'rgba(251,191,36,.1)', border: row.status === 'free' ? '1px dashed rgba(255,255,255,.08)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: row.status === 'free' ? 'rgba(255,255,255,.2)' : '#fff', fontWeight: row.status === 'free' ? 400 : 600 }}>{row.name}</span>
                        {row.cancha && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{row.cancha}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-card" style={{ position: 'absolute', top: -20, right: -20, background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 14, padding: '10px 14px', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g5)', animation: 'pulse-green 2s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4)' }}>Nueva reserva · Cancha B</span>
              </div>

              <div className="hero-card" style={{ position: 'absolute', bottom: 60, left: -28, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '12px 16px', backdropFilter: 'blur(12px)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 3 }}>Plan mensual GolPlay</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-d)' }}>₡35.000</div>
                <div style={{ fontSize: 11, color: 'var(--g4)', fontWeight: 600 }}>Fijo · Sin comisión · 1 mes gratis</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. MARQUEE PAÍSES (LATAM) ── */}
      <section style={{ background: 'rgba(255,255,255,.025)', borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '14px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div className="marquee-track" style={{ display: 'flex', flexShrink: 0 }}>
            {[...COUNTRIES, ...COUNTRIES].map((c, i) => (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 28px', borderRight: '1px solid rgba(255,255,255,.06)', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>{c.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', background: 'rgba(34,197,94,.1)', padding: '2px 8px', borderRadius: 999 }}>{c.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. PRECIO + CALCULADORA ── */}
      <section id="precio" style={{ padding: '100px 24px', background: 'var(--dark)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto 56px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Precio</div>
              <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.03em', marginBottom: 20, color: '#fff' }}>
                Un precio tan simple<br />como el deporte
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', lineHeight: 1.8 }}>
                Sin niveles, sin letra chica, <strong style={{ color: '#fff' }}>sin comisión por reserva.</strong> Un solo monto mensual que siempre podés predecir.
              </p>
            </div>
          </FadeIn>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 960, margin: '0 auto' }}>
            <FadeIn>
              <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(74,222,128,.3)', borderRadius: 24, padding: 40, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, background: 'var(--g5)', color: 'var(--dark)', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, letterSpacing: '.05em' }}>ÚNICO PLAN</div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 50, fontWeight: 800, color: 'var(--g4)', fontFamily: 'var(--font-d)', lineHeight: 1 }}>₡35.000</span>
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,.5)', marginLeft: 8 }}>/mes</span>
                </div>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', marginBottom: 32 }}>Plan fijo · ≈ $75 USD · 1 mes gratis</p>

                {[
                  '1 mes gratis para empezar',
                  'Reservas ilimitadas',
                  'Sin comisión por reserva',
                  'Sin contratos ni permanencia',
                  'Factura automática cada mes',
                  'Cancelá cuando quieras',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <CheckCircle size={16} color="var(--g5)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.8)' }}>{item}</span>
                  </div>
                ))}

                <Link href="/register?type=owner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, fontFamily: 'var(--font-d)', background: 'var(--g6)', color: '#fff', padding: '14px', borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 800, boxShadow: '0 4px 28px rgba(22,163,74,.35)', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--g7)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--g6)'; e.currentTarget.style.transform = 'none' }}
                >Probá 1 mes gratis <ArrowRight size={16} /></Link>
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: 36 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 20 }}>
                  El mismo precio, en tu moneda
                </p>
                {COUNTRIES.map(c => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 17 }}>{c.flag}</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', fontFamily: 'var(--font-d)' }}>{c.rate}</span>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', marginTop: 16, lineHeight: 1.6 }}>
                  * Valores aproximados. La conversión es al tipo de cambio del día de cobro.
                </p>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={200}>
            <PricingCalculator />
          </FadeIn>
        </div>
      </section>

      {/* ── 4. BENEFICIOS ── */}
      <section id="beneficios" style={{ padding: '100px 24px', background: '#070c07' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 72px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Beneficios</div>
              <h2 style={{ fontSize: 'clamp(30px,4vw,48px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.03em', color: '#fff' }}>Todo lo que necesitás<br />para crecer sin caos</h2>
            </div>
          </FadeIn>
          <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {BENEFITS.map((b, i) => {
              const Icon = b.icon
              return (
                <FadeIn key={b.title} delay={i * 70}>
                  <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, padding: 28, transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,.3)'; e.currentTarget.style.background = 'rgba(34,197,94,.06)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                      <Icon size={20} color="var(--g5)" />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, letterSpacing: '-.02em', color: '#fff' }}>{b.title}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{b.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 5. CÓMO FUNCIONA ── */}
      <section id="como-funciona" style={{ padding: '100px 24px', background: 'var(--dark)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 72px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Cómo funciona</div>
              <h2 style={{ fontSize: 'clamp(30px,4vw,48px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.03em', color: '#fff' }}>Empezás en minutos,<br />ganás tiempo para siempre</h2>
            </div>
          </FadeIn>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 100}>
                <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 22, padding: '32px 36px', display: 'flex', gap: 24, alignItems: 'flex-start', transition: 'border-color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(74,222,128,.25)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: i === 0 ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.06)', border: `1px solid ${i === 0 ? 'rgba(74,222,128,.3)' : 'rgba(255,255,255,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? 'var(--g4)' : 'rgba(255,255,255,.5)', fontFamily: 'var(--font-d)' }}>{step.num}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, letterSpacing: '-.02em', color: '#fff' }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{step.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CANCHAS REALES ── */}
      <PhotoCarousel />

      {/* ── 7. VIDEO DEMO ── */}
      <section style={{ padding: '100px 24px', background: '#070c07' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>Demo en vivo</div>
              <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, letterSpacing: '-.03em', color: '#fff' }}>Mirá el panel en acción</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', marginTop: 12, lineHeight: 1.7 }}>
                90 segundos para ver cómo GolPlay gestiona reservas, horarios y métricas.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}>
              <iframe src="https://www.youtube.com/embed/-PvBDwDhaWM"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 8. CTA FINAL ── */}
      <section style={{ padding: '120px 24px', background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(34,197,94,.15) 0%, transparent 70%), #070c07', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <FadeIn>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 999, padding: '6px 16px', marginBottom: 28 }}>
              <Zap size={13} color="var(--g5)" fill="var(--g5)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', letterSpacing: '.05em' }}>PLAN FIJO · SIN COMISIÓN · 1 MES GRATIS</span>
            </div>

            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.04em', marginBottom: 24, color: '#fff' }}>
              Llená tu complejo<br /><span style={{ color: 'var(--g5)' }}>con tecnología real.</span>
            </h2>

            <p style={{ fontSize: 18, color: 'rgba(255,255,255,.55)', marginBottom: 48, lineHeight: 1.7 }}>
              Registrá tu complejo hoy. En menos de 10 minutos estás recibiendo reservas automáticas.
            </p>

            <div className="cta-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register?type=owner" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-d)', background: 'var(--g6)', color: '#fff', padding: '17px 36px', borderRadius: 16, textDecoration: 'none', fontSize: 17, fontWeight: 800, boxShadow: '0 4px 48px rgba(22,163,74,.5)', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--g7)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--g6)'; e.currentTarget.style.transform = 'none' }}
              >Probá gratis, sin tarjeta <ArrowRight size={18} /></Link>
              <a href="mailto:hola@golplay.app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.85)', padding: '17px 32px', borderRadius: 16, textDecoration: 'none', fontSize: 17, fontWeight: 600, border: '1px solid rgba(255,255,255,.15)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
              >Hablar con el equipo</a>
            </div>

            <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
              Sin tarjeta para empezar · 1 mes gratis · Cancelá cuando quieras
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#030703', borderTop: '1px solid rgba(255,255,255,.06)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 44, width: 'auto', opacity: 0.85, filter: 'brightness(0) invert(1)' }} />
          </Link>
          <Link href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.35)')}
          >Términos</Link>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)' }}>© {new Date().getFullYear()} GolPlay</p>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, padding: '12px 16px 20px', background: 'linear-gradient(to top, rgba(8,14,10,1) 60%, transparent)', display: 'none' }} className="mobile-cta">
        <Link href="/register?type=owner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontFamily: 'var(--font-d)', background: 'var(--g6)', color: '#fff', padding: '15px', borderRadius: 14, textDecoration: 'none', fontSize: 16, fontWeight: 800, width: '100%', boxShadow: '0 4px 32px rgba(22,163,74,.4)' }}>
          Empezar gratis · 1 mes sin costo <ArrowRight size={16} />
        </Link>
      </div>
    </>
  )
}