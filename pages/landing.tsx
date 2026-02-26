/**
 * GolPlay — Landing Page LATAM
 * pages/index.tsx
 *
 * Modelo de negocio:
 *   $1 USD por reserva · Sin límite · Cobro mensual automático
 *   Conversión automática a moneda local
 *
 * Sin Tailwind. Estilos inline + Google Fonts via next/head.
 * Dependencias: npm install lucide-react
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import {
  BarChart2, Shield, Zap, Clock,
  CheckCircle, ArrowRight, Star, Menu, X,
  TrendingUp, Bell, CreditCard,
} from 'lucide-react'

// ─── Animation hook ───────────────────────────────────────────────────────────
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

// ─── Data ─────────────────────────────────────────────────────────────────────
const BENEFITS = [
  { icon: TrendingUp,  title: 'Más reservas, menos esfuerzo',   desc: 'Tu cancha visible las 24 horas. Los jugadores reservan solos mientras vos dormís.' },
  { icon: Bell,        title: 'Adiós al caos del WhatsApp',      desc: 'Eliminá mensajes interminables. Todo queda en el sistema, organizado y confirmado.' },
  { icon: Shield,      title: 'Cero dobles reservas',            desc: 'Validación automática en tiempo real. Si está ocupado, simplemente no se puede reservar.' },
  { icon: Clock,       title: 'Control total de horarios',       desc: 'Configurá disponibilidad, bloqueá horas, ajustá precios día y noche desde el panel.' },
  { icon: BarChart2,   title: 'Métricas que te hacen crecer',    desc: 'Sabé qué canchas rinden más, en qué horarios y cuánto ingresás cada mes.' },
  { icon: CreditCard,  title: 'Cobro simple y predecible',       desc: '$1 USD por reserva, convertido a tu moneda local. Sabés exactamente cuánto pagás cada mes.' },
]

const STEPS = [
  { num: '01', title: 'Registrás tu complejo',            desc: 'Creás tu cuenta en minutos. Sin papelería, sin contratos largos.' },
  { num: '02', title: 'Configurás canchas y horarios',    desc: 'Agregás tus canchas, precios, disponibilidad y reglas. Vos mandás.' },
  { num: '03', title: 'Recibís reservas automáticamente', desc: 'Los jugadores te encuentran y reservan solos. 24/7, sin intermediarios.' },
  { num: '04', title: 'Gestionás todo desde el panel',    desc: 'Calendario, reservas, ingresos y métricas. Todo en un solo lugar.' },
]

const SPORTS = [
  { emoji: '⚽', label: 'Fútbol 5' },
  { emoji: '🏃', label: 'Fútbol 7' },
  { emoji: '🏓', label: 'Pádel' },
  { emoji: '🎾', label: 'Tenis' },
  { emoji: '🏟️', label: 'Canchas multiuso' },
  { emoji: '🏀', label: 'Básquet' },
]

const TESTIMONIALS = [
  {
    name: 'Carlos Rodríguez',
    role: 'Dueño de complejo — Ciudad de México, MX',
    text: 'Antes perdía 2 horas al día en WhatsApp. Ahora el sistema lo maneja todo. Mis reservas subieron un 40% en el primer mes.',
    stars: 5,
  },
  {
    name: 'Andrea Mora',
    role: 'Administradora — Bogotá, Colombia',
    text: 'Un dólar por reserva suena a nada comparado con lo que ganás en tiempo. El cobro llega solo a mi cuenta cada mes. No tengo que hacer nada.',
    stars: 5,
  },
  {
    name: 'Diego Fallas',
    role: 'Propietario — Buenos Aires, Argentina',
    text: 'El calendario es clarísimo. Ya no hay dobles reservas y tengo métricas reales de mi negocio por primera vez.',
    stars: 5,
  },
]

const STATS = [
  { value: '+12.000', label: 'Reservas gestionadas' },
  { value: '8',       label: 'Países en LATAM' },
  { value: '0',       label: 'Conflictos de horario' },
  { value: '24/7',    label: 'Disponibilidad del sistema' },
]

// Países activos con equivalencia de $1 USD
const COUNTRIES = [
  { flag: '🇲🇽', name: 'México',    currency: 'MXN', rate: '~$18 MXN' },
  { flag: '🇨🇴', name: 'Colombia',  currency: 'COP', rate: '~$4.200 COP' },
  { flag: '🇦🇷', name: 'Argentina', currency: 'ARS', rate: '~$950 ARS' },
  { flag: '🇨🇱', name: 'Chile',     currency: 'CLP', rate: '~$960 CLP' },
  { flag: '🇵🇪', name: 'Perú',      currency: 'PEN', rate: '~S/ 3,7' },
  { flag: '🇺🇾', name: 'Uruguay',   currency: 'UYU', rate: '~$39 UYU' },
  { flag: '🇨🇷', name: 'Costa Rica',currency: 'CRC', rate: '~₡530 CRC' },
  { flag: '🇵🇦', name: 'Panamá',    currency: 'USD', rate: '$1 USD' },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────
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
    { label: 'Testimonios',   href: '#testimonios' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(5,10,5,.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,.08)' : 'none',
      transition: 'all 0.3s ease', padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 135, width: 'auto' }} />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="nav-desktop">
          {NAV.map(({ label, href }) => (
            <a key={label} href={href}
              style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
            >{label}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontWeight: 500, padding: '8px 14px' }}>Ingresar</Link>
          <Link href="/register" style={{
            fontSize: 13, fontWeight: 700, color: '#0a0a0a', background: '#22c55e',
            padding: '9px 18px', borderRadius: 10, textDecoration: 'none',
            transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 0 20px rgba(34,197,94,.4)',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(34,197,94,.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(34,197,94,.4)' }}
          >Empezar gratis →</Link>
          <button onClick={() => setMobileOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, display: 'none' }} className="nav-mobile-btn" aria-label="Menú">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ background: 'rgba(5,10,5,.97)', borderTop: '1px solid rgba(255,255,255,.08)', padding: '20px 24px 28px' }}>
          {NAV.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setMobileOpen(false)}
              style={{ display: 'block', fontSize: 16, color: 'rgba(255,255,255,.8)', textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>{label}</a>
          ))}
          <Link href="/register" style={{ display: 'block', marginTop: 20, textAlign: 'center', background: '#22c55e', color: '#0a0a0a', fontWeight: 700, padding: '14px', borderRadius: 12, textDecoration: 'none', fontSize: 15 }}>
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
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>{children}</div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <Head>
        <title>GolPlay — La plataforma deportiva de Latinoamérica</title>
        <meta name="description" content="Gestión de reservas para complejos deportivos en toda LATAM. $1 USD por reserva, cobrado mensualmente en tu moneda local. Sin mensualidades fijas." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050a05; color: #fff; font-family: 'DM Sans', sans-serif; }
        h1,h2,h3,h4 { font-family: 'Outfit', sans-serif; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.4)} 50%{box-shadow:0 0 0 16px rgba(34,197,94,0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hero-card { animation: float 5s ease-in-out infinite; }
        .hero-card:nth-child(2) { animation-delay: -2s; }
        .marquee-track { animation: marquee 30s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .benefits-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .sports-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .cta-btns { flex-direction: column !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      <Navbar />

      {/* ──────────────── 1. HERO ──────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,197,94,.18) 0%, transparent 70%), #050a05',
        padding: '100px 24px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

            <div style={{ animation: 'fadeUp 0.8s ease both' }}>
              {/* ✏️ Badge LATAM */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 999, padding: '6px 14px', marginBottom: 28 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse-green 2s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', letterSpacing: '0.05em' }}>🌎 DISPONIBLE EN TODA LATINOAMÉRICA</span>
              </div>

              <h1 style={{ fontSize: 'clamp(40px, 5vw, 68px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff', marginBottom: 24 }}>
                Tu complejo<br /><span style={{ color: '#22c55e' }}>lleno.</span> Sin<br />complicaciones.
              </h1>

              {/* ✏️ Descripción con precio $1 USD */}
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 460, marginBottom: 40, fontWeight: 400 }}>
                GolPlay automatiza tus reservas, elimina el caos del WhatsApp y te da control total de tu negocio — por solo <strong style={{ color: '#fff' }}>$1 USD por reserva</strong>, cobrado mensualmente en tu moneda local.
              </p>

              <div className="cta-btns" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 48 }}>
                <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#22c55e', color: '#0a0a0a', padding: '15px 28px', borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 800, boxShadow: '0 0 32px rgba(34,197,94,.45)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(34,197,94,.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 32px rgba(34,197,94,.45)' }}
                >Empezar gratis <ArrowRight size={16} /></Link>
                <a href="#como-funciona" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)', color: '#fff', padding: '15px 28px', borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,.12)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                >Ver cómo funciona</a>
              </div>

              {/* ✏️ Social proof → 8 países */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex' }}>
                  {[120, 200, 280, 340, 40].map((hue, i) => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${hue}, 55%, 52%)`, border: '2px solid #050a05', marginLeft: i > 0 ? -10 : 0, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>
                      {['M', 'C', 'A', 'P', 'D'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#fbbf24" color="#fbbf24" />)}
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>+200 complejos en 8 países de LATAM</span>
                </div>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="hide-mobile" style={{ position: 'relative', animation: 'fadeUp 0.8s ease 0.2s both' }}>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: 24, backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Panel GolPlay</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Dashboard</div>
                  </div>
                  <div style={{ background: '#22c55e', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#0a0a0a' }}>EN VIVO</div>
                </div>

                {/* ✏️ KPI en USD */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Reservas hoy', value: '12',  color: '#22c55e' },
                    { label: 'Este mes',      value: '$84', color: '#60a5fa' },
                    { label: 'Ocupación',     value: '87%', color: '#a78bfa' },
                  ].map(k => (
                    <div key={k.label} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'Outfit, sans-serif' }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calendario — Hoy</div>
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
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse-green 2s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>Nueva reserva · Cancha B</span>
              </div>

              {/* ✏️ Floating card → cobro mensual en USD */}
              <div className="hero-card" style={{ position: 'absolute', bottom: 60, left: -28, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '12px 16px', backdropFilter: 'blur(12px)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 3 }}>Factura mensual GolPlay</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>$84 USD</div>
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>84 reservas · $1 c/u · cobro automático</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── 2. MARQUEE PAÍSES (nuevo) ──────────────── */}
      <section style={{ background: 'rgba(255,255,255,.025)', borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '14px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div className="marquee-track" style={{ display: 'flex', flexShrink: 0 }}>
            {[...COUNTRIES, ...COUNTRIES].map((c, i) => (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 28px', borderRight: '1px solid rgba(255,255,255,.06)', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>{c.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,.1)', padding: '2px 8px', borderRadius: 999 }}>{c.rate}/reserva</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── 3. STATS ──────────────── */}
      <section style={{ background: 'rgba(34,197,94,.06)', borderTop: '1px solid rgba(34,197,94,.12)', borderBottom: '1px solid rgba(34,197,94,.12)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {STATS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 80}>
                <div>
                  <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#22c55e', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── 4. QUÉ ES GOLPLAY ──────────────── */}
      <section style={{ padding: '100px 24px', background: '#070c07' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 64px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>QUÉ ES GOLPLAY</div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
                El sistema operativo del deporte en Latinoamérica
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', lineHeight: 1.8 }}>
                GolPlay conecta complejos deportivos con jugadores en toda la región. Automatizamos las reservas, eliminamos el desorden y te damos visibilidad total — con un precio tan simple como el deporte mismo.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { icon: '🤖', title: 'Automatización real',   desc: 'Las reservas llegan solas. El sistema confirma, notifica y registra sin que muevas un dedo.' },
              { icon: '🌎', title: 'Diseñado para LATAM',   desc: 'Operamos en 8 países. El cobro se convierte automáticamente a tu moneda local cada mes.' },
              { icon: '📊', title: 'Control de tu negocio', desc: 'Ingresos, ocupación, horarios pico. Datos reales para tomar mejores decisiones.' },
              { icon: '💵', title: '$1 USD por reserva',     desc: 'Sin mensualidades fijas. Solo pagás por lo que generás. A más reservas, más crecés.' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 80}>
                <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, padding: 28, transition: 'border-color 0.2s, background 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,.3)'; e.currentTarget.style.background = 'rgba(34,197,94,.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}
                >
                  <div style={{ fontSize: 32, marginBottom: 16 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.02em' }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── 5. CÓMO FUNCIONA ──────────────── */}
      <section id="como-funciona" style={{ padding: '100px 24px', background: '#050a05' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 72px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>CÓMO FUNCIONA</div>
              <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em' }}>Empezás en minutos,<br />ganás tiempo para siempre</h2>
            </div>
          </FadeIn>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 100}>
                <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 22, padding: '32px 36px', display: 'flex', gap: 24, alignItems: 'flex-start', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,.25)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: i === 0 ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.06)', border: `1px solid ${i === 0 ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? '#22c55e' : 'rgba(255,255,255,.5)', fontFamily: 'Outfit, sans-serif' }}>{step.num}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.02em' }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{step.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── 6. BENEFICIOS ──────────────── */}
      <section id="beneficios" style={{ padding: '100px 24px', background: '#070c07' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 72px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>BENEFICIOS</div>
              <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em' }}>Todo lo que necesitás<br />para crecer sin caos</h2>
            </div>
          </FadeIn>
          <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {BENEFITS.map((b, i) => {
              const Icon = b.icon
              return (
                <FadeIn key={b.title} delay={i * 70}>
                  <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, padding: 28, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,.3)'; e.currentTarget.style.background = 'rgba(34,197,94,.06)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                      <Icon size={20} color="#22c55e" />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.02em' }}>{b.title}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{b.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ──────────────── 7. DEPORTES ──────────────── */}
      <section id="deportes" style={{ padding: '80px 24px', background: '#050a05' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>COMPATIBLE CON</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em' }}>Funciona para cualquier cancha</h2>
            </div>
          </FadeIn>
          <div className="sports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
            {SPORTS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 60}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: '24px 16px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,.3)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{s.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>{s.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── 8. PRECIO (reemplaza "Modelo negocio" CR) ──────────────── */}
      <section id="precio" style={{ padding: '100px 24px', background: '#070c07' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto 64px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>PRECIO</div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
                Un precio tan simple<br />como el deporte
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', lineHeight: 1.8 }}>
                Sin planes. Sin niveles. Sin letra chica. Un solo número que crece con tu negocio — y que siempre podés predecir.
              </p>
            </div>
          </FadeIn>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 960, margin: '0 auto' }}>

            {/* Pricing card */}
            <FadeIn delay={0}>
              <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 24, padding: 40, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, background: '#22c55e', color: '#0a0a0a', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, letterSpacing: '0.05em' }}>ÚNICO PLAN</div>

                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 64, fontWeight: 900, color: '#22c55e', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>$1</span>
                  <span style={{ fontSize: 20, color: 'rgba(255,255,255,.5)', marginLeft: 8 }}>USD</span>
                </div>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', marginBottom: 32 }}>por reserva · cobro mensual automático</p>

                {[
                  'Sin mensualidad fija',
                  'Sin límite de reservas',
                  'Sin contratos ni permanencia',
                  'Cobro en tu moneda local',
                  'Factura automática cada mes',
                  'Cancelá cuando quieras',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <CheckCircle size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.8)' }}>{item}</span>
                  </div>
                ))}

                <Link href="/register" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, background: '#22c55e', color: '#0a0a0a', padding: '14px', borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 800, boxShadow: '0 0 28px rgba(34,197,94,.35)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(34,197,94,.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 28px rgba(34,197,94,.35)' }}
                >Empezar gratis <ArrowRight size={16} /></Link>
              </div>
            </FadeIn>

            {/* Tabla monedas */}
            <FadeIn delay={120}>
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: 36 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
                  Equivalencia en tu moneda
                </p>
                {COUNTRIES.map(c => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 17 }}>{c.flag}</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'Outfit, sans-serif' }}>{c.rate}/reserva</span>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', marginTop: 16, lineHeight: 1.6 }}>
                  * Valores aproximados. La conversión es al tipo de cambio del día de cobro.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* Ejemplo cálculo */}
          <FadeIn delay={200}>
            <div style={{ maxWidth: 960, margin: '20px auto 0', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '22px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Si este mes procesás</p>
                <p style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>120 reservas</p>
              </div>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Cobrás a tus clientes</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>Tu precio</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Le pagás a GolPlay</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#22c55e', fontFamily: 'Outfit, sans-serif' }}>$120 USD</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Costo unitario</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#4ade80', fontFamily: 'Outfit, sans-serif' }}>$1 USD</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────── 9. TESTIMONIOS ──────────────── */}
      <section id="testimonios" style={{ padding: '100px 24px', background: '#050a05' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>TESTIMONIOS</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em' }}>
                De México a Argentina, ya nos eligen
              </h2>
            </div>
          </FadeIn>
          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 100}>
                <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 22, padding: 28, transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,.2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)')}
                >
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                    {Array.from({ length: t.stars }).map((_, j) => <Star key={j} size={14} fill="#fbbf24" color="#fbbf24" />)}
                  </div>
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,.75)', lineHeight: 1.75, marginBottom: 24, fontStyle: 'italic' }}>"{t.text}"</p>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── 10. CTA FINAL ──────────────── */}
      <section style={{ padding: '120px 24px', background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(34,197,94,.15) 0%, transparent 70%), #070c07', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <FadeIn>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 999, padding: '6px 16px', marginBottom: 28 }}>
              <Zap size={13} color="#22c55e" fill="#22c55e" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em' }}>🌎 8 PAÍSES · $1 USD POR RESERVA · COBRO MENSUAL</span>
            </div>

            <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 24 }}>
              El deporte de LATAM<br /><span style={{ color: '#22c55e' }}>merece tecnología real.</span>
            </h2>

            <p style={{ fontSize: 18, color: 'rgba(255,255,255,.55)', marginBottom: 48, lineHeight: 1.7 }}>
              Registrá tu complejo hoy. En menos de 10 minutos estás recibiendo reservas automáticas — desde cualquier país de la región.
            </p>

            <div className="cta-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#22c55e', color: '#0a0a0a', padding: '17px 36px', borderRadius: 16, textDecoration: 'none', fontSize: 17, fontWeight: 800, boxShadow: '0 0 48px rgba(34,197,94,.5)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 48px rgba(34,197,94,.65)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 48px rgba(34,197,94,.5)' }}
              >Empezar gratis ahora <ArrowRight size={18} /></Link>
              <a href="mailto:hola@golplay.io" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.85)', padding: '17px 32px', borderRadius: 16, textDecoration: 'none', fontSize: 17, fontWeight: 600, border: '1px solid rgba(255,255,255,.15)', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
              >Hablar con el equipo</a>
            </div>

            <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
              Sin tarjeta para empezar · $1 USD por reserva · Cancelá cuando quieras
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#030703', borderTop: '1px solid rgba(255,255,255,.06)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 50, width: 'auto', opacity: 0.85 }} />
          </Link>
          <Link href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.35)')}
          >Términos</Link>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)' }}>© {new Date().getFullYear()} GolPlay</p>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, padding: '12px 16px 20px', background: 'linear-gradient(to top, rgba(5,10,5,1) 60%, transparent)', display: 'none' }} className="mobile-cta">
        <Link href="/register" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#22c55e', color: '#0a0a0a', padding: '15px', borderRadius: 14, textDecoration: 'none', fontSize: 16, fontWeight: 800, width: '100%', boxShadow: '0 0 32px rgba(34,197,94,.4)' }}>
          Empezar gratis · $1 por reserva <ArrowRight size={16} />
        </Link>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-cta { display: block !important; }
          .sports-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .benefits-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
