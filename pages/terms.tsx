/**
 * GolPlay — pages/terms.tsx
 * Términos y Condiciones
 *
 * Design: Legal-editorial — bone background, tight typography,
 * anchor nav, consistent with GolPlay Luxury Sport aesthetic.
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'

// ─── Sections data ────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'intro',           title: '1. Introducción' },
  { id: 'usuarios',        title: '2. Tipos de Usuarios' },
  { id: 'uso',             title: '3. Uso de la Plataforma' },
  { id: 'registro',        title: '4. Registro y Cuenta' },
  { id: 'reservas',        title: '5. Reservas' },
  { id: 'pagos',           title: '6. Pagos y Comisiones' },
  { id: 'cancelaciones',   title: '7. Cancelaciones y Reembolsos' },
  { id: 'responsabilidad', title: '8. Limitación de Responsabilidad' },
  { id: 'complejos',       title: '9. Responsabilidad del Complejo' },
  { id: 'suspension',      title: '10. Suspensión de Cuentas' },
  { id: 'propiedad',       title: '11. Propiedad Intelectual' },
  { id: 'privacidad',      title: '12. Protección de Datos' },
  { id: 'cambios',         title: '13. Cambios en los Términos' },
  { id: 'legislacion',     title: '14. Legislación Aplicable' },
  { id: 'contacto',        title: '15. Contacto' },
]

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  :root {
    --green-900: #052e16;
    --green-800: #0B4D2C;
    --green-700: #15803d;
    --green-500: #16a34a;
    --green-400: #4ade80;
    --green-100: #dcfce7;
    --bone:      #F5F2EC;
    --ink:       #1a1d19;
    --muted:     #6b7569;
    --border:    #e8ece6;
    --white:     #ffffff;
    --font-display: 'DM Serif Display', Georgia, serif;
    --font-heading: 'Kanit', sans-serif;
    --font-body:    'DM Sans', sans-serif;
  }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body {
    font-family: var(--font-body);
    background: var(--bone);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: var(--green-400); color: var(--green-900); }

  /* ── Navbar ── */
  .nav {
    position: fixed; top:0; left:0; right:0; z-index:90;
    height:64px; padding:0 32px;
    display:flex; align-items:center; justify-content:space-between;
    background: rgba(245,242,236,.95);
    backdrop-filter: blur(20px) saturate(1.6);
    border-bottom: 1px solid var(--border);
  }
  .nav__logo { display:flex; align-items:center; height:30px; cursor:pointer; }
  .nav__links { display:flex; align-items:center; gap:6px; }
  .nav__link {
    padding:8px 14px; border-radius:12px;
    font-size:13.5px; font-weight:500; color:var(--ink);
    text-decoration:none; transition:background .15s;
  }
  .nav__link:hover { background:rgba(0,0,0,.05); }
  .nav__cta {
    padding:9px 20px; border-radius:12px;
    font-size:13.5px; font-weight:600;
    background:var(--green-500); color:#fff;
    text-decoration:none; transition:all .15s;
    box-shadow:0 2px 10px rgba(22,163,74,.28);
  }
  .nav__cta:hover { background:var(--green-700); }

  /* ── Sidebar nav ── */
  .toc-link {
    display:block; padding:7px 12px; border-radius:9px;
    font-size:12.5px; font-weight:500; color:var(--muted);
    text-decoration:none; border-left:2px solid transparent;
    transition:all .14s; line-height:1.3;
  }
  .toc-link:hover { color:var(--green-700); background:var(--green-100); border-left-color:var(--green-500); }
  .toc-link.active { color:var(--green-700); background:var(--green-100); border-left-color:var(--green-500); font-weight:700; }

  /* ── Section ── */
  .terms-section {
    padding: 36px 0 32px;
    border-bottom: 1px solid var(--border);
  }
  .terms-section:last-child { border-bottom:none; }

  /* ── Prose ── */
  .prose p, .prose li {
    font-size: 15px; line-height: 1.85; color: #374651;
    font-family: var(--font-body);
  }
  .prose ul { padding-left: 20px; margin: 10px 0; }
  .prose li { margin-bottom:6px; }
  .prose strong { color:var(--ink); font-weight:700; }
  .prose a { color:var(--green-700); text-decoration:underline; }
  .prose p + p { margin-top:12px; }

  /* ── Highlight box ── */
  .highlight-box {
    background: var(--green-100); border:1px solid #a7f3d0; border-radius:14px;
    padding:16px 18px; margin:16px 0;
  }
  .warning-box {
    background: #fef3c7; border:1px solid #fde68a; border-radius:14px;
    padding:16px 18px; margin:16px 0;
  }
  .info-box {
    background: #f0f4ff; border:1px solid #c7d2fe; border-radius:14px;
    padding:16px 18px; margin:16px 0;
  }

  /* ── Footer ── */
  footer { background:#060f07; padding:48px 32px 28px; }
  .footer-grid {
    max-width:1100px; margin:0 auto;
    display:grid; grid-template-columns:1.6fr 1fr 1fr;
    gap:40px; padding-bottom:36px;
    border-bottom:1px solid rgba(255,255,255,.05); margin-bottom:22px;
  }
  .footer-link {
    display:block; font-size:13px; color:rgba(255,255,255,.4);
    text-decoration:none; margin-bottom:10px; transition:color .15s;
    font-family:var(--font-body);
  }
  .footer-link:hover { color:#4ade80; }

  /* ── Back-to-top ── */
  .back-top {
    position:fixed; bottom:28px; right:28px; z-index:80;
    width:44px; height:44px; border-radius:999px;
    background:var(--ink); color:#fff; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:18px; transition:all .18s;
    box-shadow:0 4px 18px rgba(0,0,0,.24);
    opacity:0; pointer-events:none;
  }
  .back-top.visible { opacity:1; pointer-events:auto; }
  .back-top:hover { background:var(--green-800); transform:translateY(-2px); }

  /* ── Responsive ── */
  @media (max-width:1024px) {
    .sidebar { display:none !important; }
    .content-col { max-width:100% !important; }
    .footer-grid { grid-template-columns:1fr 1fr !important; }
  }
  @media (max-width:640px) {
    .nav { padding:0 16px; }
    .nav__links { display:none; }
    .hero-terms { padding:80px 20px 40px !important; }
    .main-wrap { padding:28px 20px 60px !important; }
    .footer-grid { grid-template-columns:1fr !important; }
  }
`

// ─── Hook: active section on scroll ──────────────────────────────────────────
function useActiveSection() {
  const [active, setActive] = useState('intro')
  useEffect(() => {
    const ids = SECTIONS.map(s => s.id)
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])
  return active
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Terms() {
  const router    = useRouter()
  const activeId  = useActiveSection()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const lastUpdated = '24 de febrero de 2026'

  return (
    <>
      <Head>
        <title>Términos y Condiciones — GolPlay</title>
        <meta name="description" content="Leé los términos y condiciones de uso de GolPlay, la plataforma de reserva de canchas deportivas."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet"/>
      </Head>

      <style>{CSS}</style>

      {/* Navbar */}
      <nav className="nav">
        <div className="nav__logo" onClick={() => router.push('/')}>
          <img src="/logo-golplay1.svg" alt="GolPlay" style={{ height:150 }}/>
        </div>
        <div className="nav__links">
          <Link href="/" className="nav__link">Inicio</Link>
          <Link href="/reserve" className="nav__link">Canchas</Link>
          <Link href="/register" className="nav__cta">Registrarse</Link>
        </div>
      </nav>

      {/* Hero strip */}
      <div className="hero-terms" style={{
        background: 'linear-gradient(140deg, #040f06 0%, #0B4D2C 70%, #134a21 100%)',
        padding: '100px 32px 52px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize:'48px 48px' }}/>
        <div style={{ maxWidth:760, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(74,222,128,.10)', border:'1px solid rgba(74,222,128,.22)', borderRadius:999, padding:'5px 14px', marginBottom:20 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#86efac', letterSpacing:'.09em', fontFamily:'var(--font-heading)' }}>DOCUMENTO LEGAL</span>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(32px,4.5vw,52px)', fontWeight:400, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.05, marginBottom:14, fontStyle:'italic' }}>
            Términos y Condiciones
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.75, maxWidth:540, marginBottom:20 }}>
            Al usar GolPlay aceptás estas condiciones. Te recomendamos leerlas detenidamente antes de reservar o publicar una cancha.
          </p>
          <p style={{ fontSize:12, color:'rgba(255,255,255,.3)', fontFamily:'var(--font-heading)', fontWeight:600, letterSpacing:'.04em' }}>
            Última actualización: {lastUpdated}
          </p>
        </div>

        {/* Bottom wave */}
        <div style={{ position:'absolute', bottom:-2, left:0, right:0 }}>
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:'block', width:'100%' }}>
            <path d="M0 40L480 12L960 32L1440 0V40H0Z" fill="#F5F2EC"/>
          </svg>
        </div>
      </div>

      {/* Main layout */}
      <div className="main-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'40px 32px 80px', display:'flex', gap:48, alignItems:'flex-start' }}>

        {/* ── Sidebar TOC ── */}
        <aside className="sidebar" style={{
          width:240, flexShrink:0, position:'sticky', top:80,
          background:'#ffffff', border:'1.5px solid var(--border)',
          borderRadius:20, padding:'20px 14px', overflow:'hidden',
        }}>
          <p style={{ fontFamily:'var(--font-heading)', fontSize:10, fontWeight:800, letterSpacing:'.12em', color:'var(--muted)', textTransform:'uppercase', marginBottom:12, padding:'0 4px' }}>
            Contenido
          </p>
          <nav>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className={`toc-link${activeId===s.id?' active':''}`}>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="content-col prose" style={{ flex:1, maxWidth:720 }}>

          {/* 1. Introducción */}
          <section id="intro" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              1. Introducción
            </h2>
            <p>
              <strong>GolPlay</strong> es una plataforma digital que conecta jugadores con complejos deportivos en Latinoamérica. Al acceder y utilizar GolPlay —ya sea como jugador, dueño de un complejo o simple visitante— aceptás cumplir con los presentes Términos y Condiciones de Uso.
            </p>
            <p>
              Si no estás de acuerdo con alguna de estas condiciones, deberás abstenerte de utilizar el servicio. GolPlay se reserva el derecho de modificar estos términos en cualquier momento, con aviso previo en la plataforma.
            </p>
            <div className="highlight-box">
              <p style={{ color:'var(--green-800)', fontWeight:600 }}>
                💡 GolPlay actúa exclusivamente como intermediario tecnológico. No es propietario de ninguna cancha, no gestiona pagos directos y no garantiza las condiciones de las instalaciones.
              </p>
            </div>
          </section>

          {/* 2. Tipos de Usuarios */}
          <section id="usuarios" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              2. Tipos de Usuarios
            </h2>
            <p>GolPlay reconoce tres tipos de usuarios, cada uno con accesos y responsabilidades distintas:</p>
            <ul>
              <li>
                <strong>Jugadores (usuarios finales):</strong> personas que utilizan la plataforma para explorar, comparar y reservar canchas deportivas.
              </li>
              <li>
                <strong>Dueños de complejos:</strong> personas físicas o jurídicas que publican y administran canchas deportivas en GolPlay, gestionando disponibilidad, precios y condiciones de uso.
              </li>
              <li>
                <strong>Administradores de GolPlay:</strong> equipo interno encargado del soporte técnico, moderación de contenido y mejora continua de la plataforma.
              </li>
            </ul>
            <p>
              Cada tipo de usuario tiene permisos diferenciados. GolPlay se reserva el derecho de modificar o revocar permisos ante incumplimientos de estos términos.
            </p>
          </section>

          {/* 3. Uso de la plataforma */}
          <section id="uso" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              3. Uso de la Plataforma
            </h2>
            <p><strong>Para jugadores:</strong></p>
            <ul>
              <li>Reservar únicamente cuando haya intención real de asistir.</li>
              <li>Llegar puntualmente a la reserva confirmada.</li>
              <li>Tratar las instalaciones con respeto y responsabilidad.</li>
              <li>Seguir las políticas de cancelación definidas por cada complejo.</li>
              <li>No proporcionar datos de terceros sin su consentimiento.</li>
            </ul>

            <p style={{ marginTop:16 }}><strong>Para dueños de complejos:</strong></p>
            <ul>
              <li>Publicar información veraz sobre instalaciones, precios y disponibilidad.</li>
              <li>Mantener actualizada la disponibilidad en tiempo real.</li>
              <li>Cumplir con todas las reservas confirmadas salvo causa de fuerza mayor.</li>
              <li>Garantizar condiciones mínimas de seguridad e higiene en las instalaciones.</li>
              <li>No publicar contenido engañoso, difamatorio o que infrinja derechos de terceros.</li>
            </ul>

            <div className="warning-box">
              <p style={{ color:'#92400e', fontWeight:600 }}>
                ⚠️ GolPlay se reserva el derecho de suspender o eliminar cuentas que incumplan estas normas, sin previo aviso y sin obligación de reembolso.
              </p>
            </div>
          </section>

          {/* 4. Registro */}
          <section id="registro" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              4. Registro y Cuenta
            </h2>
            <p>
              Para acceder a ciertas funcionalidades de GolPlay es necesario crear una cuenta. Al registrarte, aceptás proporcionar información veraz, precisa y actualizada.
            </p>
            <ul>
              <li>Sos responsable de mantener la confidencialidad de tu contraseña.</li>
              <li>Toda actividad realizada desde tu cuenta es de tu exclusiva responsabilidad.</li>
              <li>Debés notificar a GolPlay inmediatamente ante cualquier acceso no autorizado.</li>
              <li>No está permitido crear múltiples cuentas para un mismo usuario con el objetivo de evadir restricciones.</li>
            </ul>
            <p>
              GolPlay puede requerir verificación de identidad en cualquier momento para garantizar la seguridad de la plataforma.
            </p>
          </section>

          {/* 5. Reservas */}
          <section id="reservas" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              5. Reservas
            </h2>
            <p>
              Las reservas realizadas a través de GolPlay están sujetas a la disponibilidad en tiempo real definida por cada dueño de complejo. Una reserva se considera <strong>confirmada</strong> únicamente cuando el usuario recibe el correo de confirmación correspondiente.
            </p>
            <ul>
              <li>GolPlay no garantiza la disponibilidad en caso de errores técnicos o dobles bookings.</li>
              <li>El dueño del complejo es el responsable final de confirmar o rechazar una reserva.</li>
              <li>En caso de rechazo por parte del complejo, GolPlay facilitará la resolución del conflicto.</li>
              <li>Las reservas son personales e intransferibles salvo acuerdo expreso con el complejo.</li>
            </ul>
            <div className="highlight-box">
              <p style={{ color:'var(--green-800)', fontWeight:600 }}>
                ✓ La disponibilidad mostrada en GolPlay es en tiempo real. Sin embargo, en situaciones excepcionales pueden ocurrir conflictos que GolPlay gestionará de buena fe.
              </p>
            </div>
          </section>

          {/* 6. Pagos y comisiones */}
          <section id="pagos" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              6. Pagos y Comisiones
            </h2>
            <p>
              GolPlay opera bajo un modelo de comisión por reserva confirmada. Los precios mostrados en la plataforma son definidos únicamente por el dueño de cada complejo.
            </p>
            <ul>
              <li>
                <strong>Comisión de plataforma:</strong> GolPlay cobra <strong>$1 USD por reserva confirmada</strong> directamente al dueño del complejo, descontado del estado de cuenta mensual. Este cobro no aplica a reservas canceladas.
              </li>
              <li>
                <strong>Pagos al complejo:</strong> GolPlay no procesa pagos entre jugadores y complejos. La gestión de cobros es responsabilidad exclusiva del dueño.
              </li>
              <li>
                <strong>Facturación:</strong> Los dueños de complejos recibirán un estado de cuenta mensual detallando las comisiones generadas.
              </li>
              <li>
                GolPlay se reserva el derecho de modificar su estructura de comisiones con aviso de al menos 30 días.
              </li>
            </ul>
            <div className="info-box">
              <p style={{ color:'#3730a3', fontWeight:600 }}>
                💳 GolPlay no almacena información de tarjetas de crédito ni datos bancarios de usuarios o complejos. Los pagos entre partes son gestionados de forma directa.
              </p>
            </div>
          </section>

          {/* 7. Cancelaciones */}
          <section id="cancelaciones" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              7. Cancelaciones y Reembolsos
            </h2>
            <p>
              Las políticas de cancelación son definidas por cada dueño de complejo y deben estar claramente indicadas en el perfil de la cancha. GolPlay no establece políticas de cancelación generales.
            </p>
            <p><strong>Responsabilidades del jugador:</strong></p>
            <ul>
              <li>Revisar la política de cancelación antes de confirmar la reserva.</li>
              <li>Cancelar con la anticipación requerida para evitar penalizaciones.</li>
              <li>Los no-shows (inasistencias sin aviso) pueden implicar penalizaciones según las reglas del complejo.</li>
            </ul>
            <p style={{ marginTop:12 }}><strong>Responsabilidades del complejo:</strong></p>
            <ul>
              <li>En caso de cancelación por parte del complejo, deberá ofrecer una alternativa o reembolso completo.</li>
              <li>No se cobrará comisión por reservas canceladas por el complejo.</li>
            </ul>
            <p style={{ marginTop:12 }}>
              GolPlay actuará como mediador en disputas entre jugadores y complejos, sin obligación de reembolsos directos salvo error comprobado de la plataforma.
            </p>
          </section>

          {/* 8. Limitación de responsabilidad */}
          <section id="responsabilidad" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              8. Limitación de Responsabilidad
            </h2>
            <p>
              GolPlay es una plataforma tecnológica intermediaria y no asume responsabilidad por:
            </p>
            <ul>
              <li>Lesiones, accidentes o daños ocurridos en las instalaciones deportivas.</li>
              <li>Pérdidas económicas derivadas del uso de la plataforma o de reservas no honradas por complejos.</li>
              <li>Fallas externas como cortes de internet, errores de terceros proveedores o causas de fuerza mayor.</li>
              <li>Discrepancias entre la información publicada y las condiciones reales de las instalaciones.</li>
              <li>Conflictos entre jugadores y complejos derivados de condiciones no contempladas en esta plataforma.</li>
            </ul>
            <div className="warning-box">
              <p style={{ color:'#92400e', fontWeight:600 }}>
                ⚠️ La responsabilidad máxima de GolPlay ante cualquier reclamación estará limitada al monto de la comisión cobrada por la reserva en cuestión.
              </p>
            </div>
          </section>

          {/* 9. Responsabilidad del complejo */}
          <section id="complejos" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              9. Responsabilidad del Complejo
            </h2>
            <p>El dueño del complejo deportivo es el único responsable de:</p>
            <ul>
              <li>La veracidad y exactitud de toda la información publicada en GolPlay.</li>
              <li>El cumplimiento de las normativas legales de seguridad, higiene y habilitación municipal.</li>
              <li>La prestación del servicio reservado en las condiciones acordadas.</li>
              <li>La atención al cliente en el lugar físico de la instalación.</li>
              <li>La gestión de cobros, reembolsos y disputas económicas con los jugadores.</li>
            </ul>
            <p>
              Al publicar en GolPlay, el dueño acepta que GolPlay puede publicar, modificar y eliminar su perfil ante incumplimientos reiterados o denuncias verificadas de usuarios.
            </p>
          </section>

          {/* 10. Suspensión */}
          <section id="suspension" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              10. Suspensión de Cuentas
            </h2>
            <p>GolPlay puede suspender o eliminar cuentas de forma temporal o permanente en los siguientes casos:</p>
            <ul>
              <li>Incumplimiento reiterado de los presentes Términos y Condiciones.</li>
              <li>Publicación de información falsa, engañosa o que infrinja derechos de terceros.</li>
              <li>Conducta abusiva, discriminatoria o acosadora hacia otros usuarios.</li>
              <li>Manipulación del sistema de reservas o intento de evasión de comisiones.</li>
              <li>Suplantación de identidad o uso de datos de terceros sin consentimiento.</li>
              <li>Incumplimiento reiterado de reservas confirmadas (aplica a complejos y jugadores).</li>
            </ul>
            <p>
              Ante una suspensión, el usuario afectado podrá solicitar revisión del caso a través de los canales oficiales de soporte. GolPlay se compromete a responder en un plazo no mayor a 10 días hábiles.
            </p>
          </section>

          {/* 11. Propiedad intelectual */}
          <section id="propiedad" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              11. Propiedad Intelectual
            </h2>
            <p>
              Todos los contenidos, marcas, logotipos, diseños, funcionalidades, textos y código de GolPlay son propiedad de GolPlay o de sus respectivos titulares, y están protegidos por las leyes de propiedad intelectual aplicables.
            </p>
            <ul>
              <li>Queda prohibida la reproducción, distribución o uso no autorizado de cualquier elemento de la plataforma.</li>
              <li>Los dueños de complejos conservan los derechos sobre las fotos e información que suban, pero otorgan a GolPlay una licencia de uso no exclusiva para mostrarlas en la plataforma.</li>
              <li>El nombre "GolPlay", su logotipo y sus variantes son marcas registradas.</li>
            </ul>
          </section>

          {/* 12. Protección de datos */}
          <section id="privacidad" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              12. Protección de Datos
            </h2>
            <p>
              GolPlay respeta la privacidad de sus usuarios y gestiona los datos personales conforme a su <strong>Política de Privacidad</strong>, disponible en la plataforma.
            </p>
            <ul>
              <li>Los datos recopilados se usan exclusivamente para la operación del servicio y mejora de la experiencia.</li>
              <li>GolPlay no vende ni comparte datos personales con terceros sin consentimiento, salvo requerimiento legal.</li>
              <li>Los usuarios tienen derecho a acceder, rectificar o eliminar sus datos personales contactando a GolPlay.</li>
              <li>GolPlay implementa medidas de seguridad técnicas para proteger la información de los usuarios.</li>
            </ul>
            <div className="info-box">
              <p style={{ color:'#3730a3', fontWeight:600 }}>
                🔒 Para solicitar eliminación de tus datos o ejercer tus derechos de privacidad, contactanos en los canales oficiales de soporte.
              </p>
            </div>
          </section>

          {/* 13. Cambios */}
          <section id="cambios" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              13. Cambios en los Términos
            </h2>
            <p>
              GolPlay se reserva el derecho de actualizar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor a partir de su publicación en la plataforma.
            </p>
            <p>
              Para cambios significativos, GolPlay notificará a los usuarios con al menos <strong>7 días de anticipación</strong> mediante correo electrónico o aviso en la plataforma. El uso continuado del servicio después de la fecha de entrada en vigencia implica la aceptación de los nuevos términos.
            </p>
          </section>

          {/* 14. Legislación */}
          <section id="legislacion" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              14. Legislación Aplicable
            </h2>
            <p>
              Los presentes Términos y Condiciones se rigen por las leyes de la <strong>República de Costa Rica</strong>. Cualquier disputa derivada del uso de GolPlay será resuelta ante los tribunales competentes de Costa Rica, salvo que las partes acuerden otro mecanismo de resolución alternativa de conflictos.
            </p>
            <p>
              Para usuarios fuera de Costa Rica, GolPlay procurará cumplir con las regulaciones locales aplicables; sin embargo, la jurisdicción primaria será siempre la costarricense.
            </p>
          </section>

          {/* 15. Contacto */}
          <section id="contacto" className="terms-section">
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:14, letterSpacing:'.01em' }}>
              15. Contacto
            </h2>
            <p>
              Para consultas sobre estos Términos, solicitudes de soporte, reclamos o ejercicio de derechos de privacidad, podés comunicarte con GolPlay a través de:
            </p>
            <ul>
              <li><strong>Correo electrónico:</strong> soporte@golplay.app</li>
              <li><strong>Plataforma:</strong> Sección "Ayuda" dentro de tu cuenta</li>
              <li><strong>Tiempo de respuesta:</strong> Máximo 2 días hábiles</li>
            </ul>
            <div className="highlight-box" style={{ marginTop:20 }}>
              <p style={{ color:'var(--green-800)', fontWeight:600 }}>
                Estos Términos y Condiciones fueron redactados el {lastUpdated}. Al continuar usando GolPlay, confirmás haberlos leído y aceptado en su totalidad.
              </p>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div>
            <img src="/logo-golplay.svg" alt="GolPlay" style={{ height:75, display:'block', marginBottom:14 }}/>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.3)', lineHeight:1.75, maxWidth:260, fontFamily:'var(--font-body)' }}>
              Marketplace de canchas deportivas en Latinoamérica. Reservá donde quieras, cuando quieras.
            </p>
          </div>
          <nav>
            <p style={{ fontFamily:'var(--font-heading)', fontSize:10, fontWeight:700, letterSpacing:'.10em', color:'rgba(255,255,255,.2)', textTransform:'uppercase', marginBottom:14 }}>Legal</p>
            <a href="/terms"   className="footer-link">Términos y condiciones</a>
            <a href="/privacy" className="footer-link">Política de privacidad</a>
          </nav>
          <div>
            <p style={{ fontFamily:'var(--font-heading)', fontSize:10, fontWeight:700, letterSpacing:'.10em', color:'rgba(255,255,255,.2)', textTransform:'uppercase', marginBottom:14 }}>Plataforma</p>
            <Link href="/"          className="footer-link">Inicio</Link>
            <Link href="/reserve"   className="footer-link">Buscar canchas</Link>
            <Link href="/register"  className="footer-link">Registrar complejo</Link>
            <Link href="/login"     className="footer-link">Iniciar sesión</Link>
          </div>
        </div>
        <p style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,.12)', fontFamily:'var(--font-body)', maxWidth:1100, margin:'0 auto' }}>
          © {new Date().getFullYear()} GolPlay · Todos los derechos reservados · Costa Rica
        </p>
      </footer>

      {/* Back to top */}
      <button
        className={`back-top${scrollY > 400 ? ' visible' : ''}`}
        onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}
        aria-label="Volver arriba"
      >
        ↑
      </button>
    </>
  )
}
