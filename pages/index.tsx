/**
 * GolPlay — pages/index.tsx  v7.0 "Social-first"
 *
 * La plataforma del fútbol amateur: carta de jugador, equipos, retos — y la cancha.
 * Home 100% dark. Navbar compartido. Tokens globales + GOLPLAY_BASE_CSS.
 * La búsqueda redirige a /reserve (filtrado fino vive allá).
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import Navbar from '@/components/ui/Navbar'
import { GOLPLAY_BASE_CSS } from '@/lib/styles/golplay'
import 'swiper/css'
import 'swiper/css/navigation'

// ─── Types ──────────────────────────────────────────────────────
type Complex = {
  id: number
  name: string
  slug: string
  city: string | null
  country: string | null
  image: string | null
  field_count: number
  sports: string[]
}

// ─── Constants ──────────────────────────────────────────────────
const SPORTS = [
  { value: '',         emoji: '🏟️', label: 'Todos'    },
  { value: 'futbol5',  emoji: '⚽',  label: 'Fútbol 5' },
  { value: 'futbol7',  emoji: '⚽',  label: 'Fútbol 7' },
  { value: 'padel',    emoji: '🎾',  label: 'Pádel'    },
  { value: 'tenis',    emoji: '🎾',  label: 'Tenis'    },
  { value: 'multiuso', emoji: '🏟️',  label: 'Multiuso' },
  { value: 'basquet',  emoji: '🏀',  label: 'Básquet'  },
]

const PILLARS = [
  {
    href: '/jugadores/crear',
    emoji: '🃏',
    title: 'Tu carta de jugador',
    desc: 'Creá tu perfil estilo FIFA, con rating y stats. Compartila y que todos vean tu nivel.',
    cta: 'Crear mi carta',
  },
  {
    href: '/retos',
    emoji: '⚔️',
    title: 'Retos',
    desc: 'Desafiá a otros equipos. Coordinás cancha, fecha y hora. El que gana, sube.',
    cta: 'Ver retos',
  },
  {
    href: '/equipos',
    emoji: '🛡️',
    title: 'Equipos',
    desc: 'Armá tu plantilla, invitá por cédula o link, y jugá en serio con tu banda.',
    cta: 'Armar equipo',
  },
]

const STEPS = [
  { n: '01', e: '🃏', t: 'Creá tu carta',       d: 'Tu perfil de jugador con foto, rating y stats. Gratis, sin contraseñas.' },
  { n: '02', e: '🛡️', t: 'Armá tu equipo',      d: 'Invitá a tu banda por link o cédula. Vos sos el capitán.' },
  { n: '03', e: '⚔️', t: 'Retá o reservá',      d: 'Desafiá a otro equipo o reservá la cancha directo, sin llamadas.' },
  { n: '04', e: '⚽', t: '¡A jugar!',            d: 'Confirmación al instante por correo. Llegás y jugás.' },
]

// ─── Global CSS ─────────────────────────────────────────────────
const CSS = `${GOLPLAY_BASE_CSS}

.home { background: var(--dark); color: #fff; overflow-x: hidden; }
.home .h2 { color: #fff; }
.home .h2 em { font-style: italic; color: var(--g4); }
.home .eyebrow { color: var(--g4); }

.sp-sec { padding: clamp(52px,7vw,88px) clamp(16px,4vw,40px); }
.sec-inner { max-width: 1100px; margin: 0 auto; }

/* ── Buttons ─────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 14px 26px; border-radius: var(--r-md);
  background: linear-gradient(135deg, var(--g5), var(--g6));
  color: #fff; border: none; cursor: pointer; text-decoration: none;
  font-family: var(--font-d); font-size: 15px; font-weight: 800; letter-spacing: -.01em;
  box-shadow: 0 4px 22px rgba(34,197,94,.32); transition: all .16s;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(34,197,94,.45); }
.btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 14px 24px; border-radius: var(--r-md);
  background: rgba(255,255,255,.06); color: rgba(255,255,255,.78);
  border: 1px solid rgba(255,255,255,.14); cursor: pointer; text-decoration: none;
  font-family: var(--font-d); font-size: 14px; font-weight: 700;
  transition: all .16s;
}
.btn-ghost:hover { background: rgba(255,255,255,.1); color: #fff; }

/* ── Hero ────────────────────────────────────────────────────── */
.hero {
  min-height: 100svh; background: var(--dark);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: center;
  padding: 62px 20px 32px;
}
.hero__grid-lines {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.04) 59px,rgba(255,255,255,.04) 60px),
    repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,.04) 59px,rgba(255,255,255,.04) 60px);
}
.hero__glow {
  position: absolute; top: 24%; left: 50%; transform: translate(-50%,-50%);
  width: 760px; height: 480px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(22,163,74,.12) 0%, transparent 70%);
  pointer-events: none;
}
.hero__content {
  position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto;
  display: flex; flex-direction: column; align-items: flex-start; gap: 28px;
}
.hero__left { width: 100%; max-width: 600px; }
.hero__right { width: 100%; display: flex; justify-content: center; }

.live-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.22);
  border-radius: 999px; padding: 5px 12px; margin-bottom: 22px;
  animation: fadeIn .5s ease both;
}
.live-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--g4); animation: pulseDot 2s infinite; flex-shrink: 0; }
.live-badge__text { font-size: 10px; font-weight: 700; color: rgba(74,222,128,.88); letter-spacing: .08em; text-transform: uppercase; }

.hero__h1 {
  font-family: var(--font-d); font-size: clamp(40px,10vw,72px);
  font-weight: 800; line-height: .92; letter-spacing: -.03em; color: #fff; margin-bottom: 16px;
}
.hero__h1-accent {
  display: block;
  background: linear-gradient(110deg, var(--g4) 0%, #34d399 60%, #22d3ee 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.hero__sub { font-size: clamp(14px,3.6vw,17px); color: rgba(255,255,255,.5); line-height: 1.6; margin-bottom: 28px; max-width: 440px; }
.hero__sub strong { color: rgba(255,255,255,.78); font-weight: 600; }
.hero__ctas { display: flex; gap: 12px; flex-wrap: wrap; }

/* Hero card mock */
.hero-mock {
  width: 210px; aspect-ratio: 5/7; border-radius: 20px; padding: 16px;
  background: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.4) 0%, transparent 50%),
              linear-gradient(160deg,#FFE07A 0%,#C68F1F 24%,#FFEC9C 48%,#8C6517 78%,#E6BD51 100%);
  color: #3a1f00; position: relative; overflow: hidden;
  box-shadow: 0 24px 50px rgba(196,140,30,.4), 0 8px 18px rgba(0,0,0,.5);
  animation: floatY 5s ease-in-out infinite; transform: rotate(-4deg);
}
.hero-mock__rating { font-family: var(--font-d); font-size: 44px; font-weight: 800; line-height: .9; }
.hero-mock__pos { font-size: 12px; font-weight: 800; letter-spacing: .04em; opacity: .85; margin-bottom: 14px; }
.hero-mock__ph {
  width: 78px; height: 78px; border-radius: 12px; margin: 0 auto 12px;
  background: rgba(0,0,0,.16); display: flex; align-items: center; justify-content: center; font-size: 34px;
}
.hero-mock__name { text-align: center; font-family: var(--font-d); font-weight: 800; font-size: 17px; letter-spacing: -.01em; margin-bottom: 10px; }
.hero-mock__divider { height: 1.5px; background: linear-gradient(90deg,transparent,currentColor 30%,currentColor 70%,transparent); opacity: .4; margin-bottom: 10px; }
.hero-mock__stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; text-align: center; }
.hero-mock__stat b { font-family: var(--font-d); font-size: 15px; display: block; }
.hero-mock__stat span { font-size: 8px; font-weight: 700; letter-spacing: .06em; opacity: .8; }

/* ── Pillars ─────────────────────────────────────────────────── */
.pillars { display: grid; grid-template-columns: 1fr; gap: 12px; }
.pillar {
  display: block; text-decoration: none; color: inherit;
  background: rgba(255,255,255,.04); border: 1.5px solid rgba(255,255,255,.08);
  border-radius: var(--r-xl); padding: 26px 24px;
  transition: all .22s cubic-bezier(.16,1,.3,1); position: relative; overflow: hidden;
}
.pillar:hover { transform: translateY(-4px); border-color: var(--g4); background: rgba(255,255,255,.06); box-shadow: 0 16px 40px rgba(0,0,0,.4); }
.pillar__emoji {
  width: 48px; height: 48px; border-radius: 13px; margin-bottom: 16px;
  background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.18);
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.pillar__title { font-family: var(--font-d); font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -.01em; }
.pillar__desc { font-size: 13.5px; color: rgba(255,255,255,.5); line-height: 1.6; margin-bottom: 16px; }
.pillar__cta { font-family: var(--font-d); font-size: 13px; font-weight: 800; color: var(--g4); display: inline-flex; align-items: center; gap: 5px; }

/* ── Search card ─────────────────────────────────────────────── */
.search-card {
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  border-radius: var(--r-xl); padding: 16px; backdrop-filter: blur(20px); max-width: 620px;
}
.search-card__sports { display: flex; gap: 5px; margin-bottom: 12px; overflow-x: auto; scrollbar-width: none; }
.search-card__sports::-webkit-scrollbar { display: none; }
.sc-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 999px;
  white-space: nowrap; flex-shrink: 0; border: 1.5px solid rgba(255,255,255,.1); background: transparent;
  font-family: var(--font-u); font-size: 12px; font-weight: 600; color: rgba(255,255,255,.5); cursor: pointer; transition: all .14s;
}
.sc-chip:hover, .sc-chip.on { border-color: var(--g5); background: rgba(34,197,94,.12); color: var(--g4); }
.search-row { display: flex; gap: 8px; }
.sf {
  flex: 1; display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,.07); border: 1.5px solid rgba(255,255,255,.1);
  border-radius: var(--r-md); padding: 12px 14px; transition: all .14s;
}
.sf:focus-within { border-color: rgba(74,222,128,.4); background: rgba(74,222,128,.06); }
.sf svg { width: 16px; height: 16px; flex-shrink: 0; opacity: .5; }
.sf input { background: transparent; border: none; outline: none; font-family: var(--font-u); font-size: 14px; font-weight: 500; color: #fff; width: 100%; }
.sf input::placeholder { color: rgba(255,255,255,.32); }
.search-cta {
  padding: 0 22px; border: none; border-radius: var(--r-md);
  background: linear-gradient(135deg,var(--g5),var(--g6)); color: #fff; cursor: pointer;
  font-family: var(--font-d); font-size: 14px; font-weight: 800; white-space: nowrap;
  display: flex; align-items: center; gap: 7px; transition: all .16s; box-shadow: 0 4px 20px rgba(34,197,94,.3);
}
.search-cta:hover { transform: translateY(-1px); }

/* ── Complex card ────────────────────────────────────────────── */
.gp-card {
  width: 260px; background: rgba(255,255,255,.04); border-radius: var(--r-xl);
  overflow: hidden; cursor: pointer; border: 1.5px solid rgba(255,255,255,.08);
  transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s, border-color .22s;
  display: block; outline: none; text-decoration: none; scroll-snap-align: start; flex-shrink: 0;
}
.gp-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,.45); border-color: var(--g4); }
.gp-card:focus-visible { outline: 2px solid var(--g4); outline-offset: 3px; }

.cards-row {
  display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none;
  scroll-snap-type: x mandatory; padding-bottom: 4px;
  margin: 0 calc(-1*clamp(16px,4vw,40px)); padding-left: clamp(16px,4vw,40px); padding-right: clamp(16px,4vw,40px);
}
.cards-row::-webkit-scrollbar { display: none; }

.gp-swiper { overflow: visible!important; }
.gp-swiper .swiper-slide { width: auto!important; }
.gp-swiper .swiper-button-next, .gp-swiper .swiper-button-prev {
  color: #fff!important; background: rgba(255,255,255,.1); backdrop-filter: blur(12px);
  width: 36px!important; height: 36px!important; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.12)!important; top: 42%!important; transition: all .2s ease;
}
.gp-swiper .swiper-button-next:hover, .gp-swiper .swiper-button-prev:hover { background: rgba(255,255,255,.18)!important; transform: scale(1.06); }
.gp-swiper .swiper-button-next::after, .gp-swiper .swiper-button-prev::after { font-size: 12px!important; font-weight: 900!important; }
.gp-swiper .swiper-button-next { right: -4px!important; }
.gp-swiper .swiper-button-prev { left: -4px!important; }
.gp-swiper .swiper-button-disabled { opacity: 0!important; pointer-events: none; }

/* ── Step ────────────────────────────────────────────────────── */
.steps-grid { display: grid; grid-template-columns: 1fr; gap: 11px; }
.step {
  background: rgba(255,255,255,.04); border: 1.5px solid rgba(255,255,255,.08);
  border-radius: var(--r-xl); padding: 24px 20px; transition: all .2s ease;
  display: flex; gap: 16px; align-items: flex-start;
}
.step:hover { border-color: var(--g4); background: rgba(255,255,255,.06); transform: translateX(4px); }
.step__num {
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: rgba(34,197,94,.14); border: 1.5px solid rgba(74,222,128,.22);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-d); font-size: 15px; font-weight: 800; color: var(--g4);
}
.step__title { font-family: var(--font-d); font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 5px; }
.step__desc { font-size: 13px; color: rgba(255,255,255,.5); line-height: 1.65; }

/* ── Owner card ──────────────────────────────────────────────── */
.owner-card {
  background: linear-gradient(150deg,#0d1f10 0%,#0a3018 60%,#062a12 100%);
  border: 1px solid rgba(74,222,128,.14); border-radius: var(--r-xl);
  padding: 36px 28px; position: relative; overflow: hidden;
}
.owner-card::before {
  content: ''; position: absolute; top: -40%; right: -20%; width: 280px; height: 280px;
  border-radius: 50%; background: radial-gradient(circle,rgba(22,163,74,.16) 0%,transparent 70%); pointer-events: none;
}
.owner-feat { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,.62); font-weight: 500; }
.owner-feat__icon {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.15);
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.owner-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: 100%; padding: 13px;
  background: var(--g5); color: var(--dark); border: none; border-radius: var(--r-md);
  font-family: var(--font-d); font-size: 14px; font-weight: 800; cursor: pointer; text-decoration: none;
  box-shadow: 0 4px 20px rgba(34,197,94,.25); letter-spacing: -.01em; transition: all .15s;
}
.owner-cta:hover { background: var(--g4); transform: translateY(-1px); }

/* ── WhatsApp FAB + toast ────────────────────────────────────── */
.wa-fab {
  position: fixed; bottom: clamp(18px,5vw,28px); right: clamp(14px,4vw,24px);
  width: 54px; height: 54px; border-radius: 50%; z-index: 8900;
  background: linear-gradient(135deg,#25d366,#128c7e);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 22px rgba(37,211,102,.45); animation: waPulse 3s ease infinite;
  cursor: pointer; border: none; text-decoration: none; transition: transform .18s ease;
}
.wa-fab:hover { transform: scale(1.1) translateY(-2px); }
.toast {
  position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%);
  background: var(--dark2); color: #fff; padding: 12px 20px; border-radius: 13px;
  font-weight: 700; font-size: 13px; box-shadow: 0 8px 28px rgba(0,0,0,.4);
  z-index: 9999; display: flex; align-items: center; gap: 9px; white-space: nowrap;
  animation: toastIn .3s ease; border: 1px solid rgba(255,255,255,.1);
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (min-width: 769px) {
  .hero__content { flex-direction: row; align-items: center; gap: 56px; }
  .hero__left { flex: 1; }
  .hero__right { width: auto; flex-shrink: 0; }
  .hero-mock { width: 240px; }
  .pillars { grid-template-columns: repeat(3,1fr); }
  .steps-grid { grid-template-columns: repeat(4,1fr); }
}
@media (max-width: 400px) {
  .hero__h1 { font-size: 38px; }
  .hero-mock { width: 180px; }
}
`

// ─── FadeIn ─────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, style = {} }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold: .05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(16px)',
      transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── ComplexCard ────────────────────────────────────────────────
function ComplexCard({ complex }: { complex: Complex }) {
  const router = useRouter()
  return (
    <article className="gp-card" role="button" tabIndex={0}
      onClick={() => router.push(`/complexes/${complex.slug}`)}
      onKeyDown={e => e.key === 'Enter' && router.push(`/complexes/${complex.slug}`)}
      aria-label={`Ver ${complex.name}`}
    >
      <div style={{position:'relative', height:160, background:'linear-gradient(135deg,#0e3d1a,#0a2e15)', overflow:'hidden'}}>
        {complex.image
          ? <Image src={complex.image} alt={complex.name} fill sizes="260px" style={{objectFit:'cover'}} loading="lazy"/>
          : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, opacity:.22}}>🏟️</div>
        }
        <div style={{position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.55) 0%,transparent 50%)'}}/>
        <span style={{position:'absolute', top:8, right:8, background:'rgba(0,0,0,.45)', backdropFilter:'blur(8px)', color:'#fff', fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:999, letterSpacing:'.05em', border:'1px solid rgba(255,255,255,.1)'}}>
          {complex.field_count} cancha{complex.field_count !== 1 ? 's' : ''}
        </span>
        <div style={{position:'absolute', bottom:8, left:10, right:10}}>
          <span style={{fontSize:14, fontWeight:700, color:'#fff', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {complex.name}
          </span>
        </div>
      </div>
      <div style={{padding:'10px 12px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
        <div style={{display:'flex', alignItems:'center', gap:4, minWidth:0}}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <p style={{fontSize:11, color:'rgba(255,255,255,.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {complex.city || 'Sin ubicación'}
          </p>
        </div>
        <span style={{fontSize:12, fontWeight:700, color:'var(--g4)', whiteSpace:'nowrap', flexShrink:0}}>Ver canchas →</span>
      </div>
    </article>
  )
}

function FieldSkeleton() {
  return (
    <div style={{width:260, borderRadius:20, overflow:'hidden', background:'rgba(255,255,255,.04)', border:'1.5px solid rgba(255,255,255,.08)', flexShrink:0}}>
      <div className="sk" style={{height:160}}/>
      <div style={{padding:'10px 12px 12px', display:'flex', flexDirection:'column', gap:6}}>
        <div className="sk" style={{height:12, width:'55%'}}/>
        <div className="sk" style={{height:10, width:'34%'}}/>
      </div>
    </div>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()

  const [complexes, setComplexes] = useState<Complex[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [liveBookingCount, setLiveBookingCount] = useState<number | null>(null)

  const [localText, setLocalText] = useState('')
  const [localSport, setLocalSport] = useState('')

  // Live booking count
  useEffect(() => {
    ;(async () => {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['confirmed', 'pending'])
      setLiveBookingCount(count ?? 0)
    })()
  }, [])

  // Toast (?reserva=ok)
  useEffect(() => {
    if (router.query.reserva !== 'ok') return
    setShowToast(true)
    const t = setTimeout(() => setShowToast(false), 4500)
    router.replace('/', undefined, { shallow: true })
    return () => clearTimeout(t)
  }, [router.query.reserva])

  // Data fetch — complejos reales (teaser)
  useEffect(() => {
    ;(async () => {
      setLoading(true); setLoadError(false)
      try {
        const { data: cxs, error } = await supabase
          .from('complexes')
          .select('id, name, slug, city, country')
          .eq('active', true)
          .order('name')

        if (error || !cxs) throw error

        const ids = cxs.map(c => c.id)
        if (ids.length === 0) { setComplexes([]); setLoading(false); return }

        const [{ data: activeFields }, { data: allFields }, { data: images }] = await Promise.all([
          supabase.from('fields').select('id, complex_id, sport').in('complex_id', ids).eq('active', true),
          supabase.from('fields').select('id, complex_id').in('complex_id', ids),
          supabase.from('field_images').select('field_id, url, is_main'),
        ])

        const activeList = activeFields ?? []
        const allList = allFields ?? []
        const fieldCountMap: Record<number, number> = {}
        const sportsMap: Record<number, Set<string>> = {}

        activeList.forEach(f => {
          fieldCountMap[f.complex_id] = (fieldCountMap[f.complex_id] || 0) + 1
          if (f.sport) {
            if (!sportsMap[f.complex_id]) sportsMap[f.complex_id] = new Set()
            sportsMap[f.complex_id].add(f.sport)
          }
        })

        const fieldToComplex: Record<number, number> = {}
        allList.forEach(f => { fieldToComplex[f.id] = f.complex_id })

        const imageMap: Record<number, string> = {}
        const seenComplex = new Set<number>()
        const sortedImgs = [...(images ?? [])].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0))
        sortedImgs.forEach(img => {
          const cxId = fieldToComplex[img.field_id]
          if (cxId && !seenComplex.has(cxId) && img.url) {
            imageMap[cxId] = img.url
            seenComplex.add(cxId)
          }
        })

        setComplexes(cxs.map(c => ({
          id: c.id, name: c.name, slug: c.slug, city: c.city, country: c.country,
          image: imageMap[c.id] || null,
          field_count: fieldCountMap[c.id] || 0,
          sports: [...(sportsMap[c.id] || [])],
        })))
      } catch { setLoadError(true) }
      finally { setLoading(false) }
    })()
  }, [])

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    const q: Record<string, string> = {}
    if (localText.trim()) q.q = localText.trim()
    if (localSport) q.sport = localSport
    router.push({ pathname: '/reserve', query: q })
  }, [localText, localSport, router])

  return (
    <>
      <Head>
        <title>GolPlay — La plataforma del fútbol amateur</title>
        <meta name="description" content="Creá tu carta de jugador, armá tu equipo, retá a otros y reservá canchas en Costa Rica. El fútbol amateur, en serio."/>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
      </Head>

      <style>{CSS}</style>
      <Navbar dark={true} />

      <div className="home">
        {/* ══ HERO ══ */}
        <section className="hero">
          <div className="hero__grid-lines" aria-hidden/>
          <div className="hero__glow" aria-hidden/>

          <div className="hero__content" style={{animation:'fadeUp .5s ease both'}}>
            <div className="hero__left">
              <div className="live-badge">
                <span className="live-badge__dot"/>
                <span className="live-badge__text">
                  {liveBookingCount !== null ? `+${liveBookingCount.toLocaleString()} reservas` : 'Fútbol amateur'} · Costa Rica
                </span>
              </div>

              <h1 className="hero__h1">
                Creá tu carta.<br/>Armá tu equipo.
                <span className="hero__h1-accent">Retá. Jugá.</span>
              </h1>
              <p className="hero__sub">
                La plataforma del fútbol amateur. Tu perfil estilo FIFA, tus retos, tu equipo —{' '}
                <strong>y la cancha lista en segundos.</strong>
              </p>

              <div className="hero__ctas">
                <Link href="/jugadores/crear" className="btn-primary">Creá tu carta gratis →</Link>
                <Link href="/reserve" className="btn-ghost">Reservar una cancha</Link>
              </div>
            </div>

            <div className="hero__right">
              <div className="hero-mock" aria-hidden>
                <div className="hero-mock__rating">87</div>
                <div className="hero-mock__pos">MC · CAM</div>
                <div className="hero-mock__ph">⚽</div>
                <div className="hero-mock__name">TU NOMBRE</div>
                <div className="hero-mock__divider"/>
                <div className="hero-mock__stats">
                  <div className="hero-mock__stat"><b>85</b><span>RIT</span></div>
                  <div className="hero-mock__stat"><b>88</b><span>TIR</span></div>
                  <div className="hero-mock__stat"><b>90</b><span>PAS</span></div>
                  <div className="hero-mock__stat"><b>84</b><span>REG</span></div>
                  <div className="hero-mock__stat"><b>79</b><span>DEF</span></div>
                  <div className="hero-mock__stat"><b>86</b><span>FÍS</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ PILARES ══ */}
        <section className="sp-sec">
          <div className="sec-inner">
            <FadeIn>
              <div style={{marginBottom:32}}>
                <p className="eyebrow">Más que reservar</p>
                <h2 className="h2">Tu fútbol, <em>en serio.</em></h2>
              </div>
            </FadeIn>
            <div className="pillars">
              {PILLARS.map((p, i) => (
                <FadeIn key={p.href} delay={i * 70}>
                  <Link href={p.href} className="pillar">
                    <div className="pillar__emoji">{p.emoji}</div>
                    <div className="pillar__title">{p.title}</div>
                    <div className="pillar__desc">{p.desc}</div>
                    <span className="pillar__cta">{p.cta} →</span>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ══ RESERVÁ ══ */}
        <section className="sp-sec" style={{borderTop:'1px solid rgba(255,255,255,.06)'}}>
          <div className="sec-inner">
            <FadeIn>
              <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14}}>
                <div>
                  <p className="eyebrow">Reservá</p>
                  <h2 className="h2">Y la cancha, <em>en segundos.</em></h2>
                </div>
                <Link href="/reserve" style={{fontSize:12, fontWeight:700, color:'var(--g4)', textDecoration:'none', display:'flex', alignItems:'center', gap:4}}>
                  Ver todos →
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={60}>
              <form onSubmit={handleSearch} style={{marginBottom:32}}>
                <div className="search-card">
                  <div className="search-card__sports">
                    {SPORTS.map(s => (
                      <button key={s.value} type="button"
                        className={`sc-chip${localSport === s.value ? ' on' : ''}`}
                        onClick={() => setLocalSport(s.value === localSport ? '' : s.value)}
                      >{s.emoji} {s.label}</button>
                    ))}
                  </div>
                  <div className="search-row">
                    <div className="sf">
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      <input type="text" value={localText} onChange={e => setLocalText(e.target.value)} placeholder="Escazú, Heredia, nombre del complejo..."/>
                    </div>
                    <button className="search-cta" type="submit">Buscar</button>
                  </div>
                </div>
              </form>
            </FadeIn>

            {loading && (
              <div className="cards-row">
                {[1,2,3].map(j => <FieldSkeleton key={j}/>)}
              </div>
            )}

            {!loading && loadError && (
              <div style={{textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,.5)'}}>
                <div style={{fontSize:32, marginBottom:10}}>⚠️</div>
                <p style={{fontSize:15, fontWeight:700, color:'#fff', marginBottom:4}}>No pudimos cargar los complejos</p>
                <p style={{fontSize:13}}>Intentá refrescar la página.</p>
              </div>
            )}

            {!loading && !loadError && complexes.length === 0 && (
              <div style={{textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,.5)'}}>
                <div style={{fontSize:40, marginBottom:10}}>🏟️</div>
                <p style={{fontSize:15, fontWeight:700, color:'#fff'}}>Aún no hay complejos disponibles</p>
              </div>
            )}

            {!loading && !loadError && complexes.length > 0 && (
              <Swiper className="gp-swiper" modules={[Navigation]} spaceBetween={14} slidesPerView="auto" navigation>
                {complexes.map(c => (
                  <SwiperSlide key={c.id}><ComplexCard complex={c}/></SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        </section>

        {/* ══ CÓMO FUNCIONA ══ */}
        <section className="sp-sec" style={{borderTop:'1px solid rgba(255,255,255,.06)'}}>
          <div className="sec-inner">
            <FadeIn>
              <div style={{marginBottom:32}}>
                <p className="eyebrow">Simple y rápido</p>
                <h2 className="h2">Del celular a la cancha<br/><em>en 4 pasos.</em></h2>
              </div>
            </FadeIn>
            <div className="steps-grid">
              {STEPS.map((s, i) => (
                <FadeIn key={s.n} delay={i * 70}>
                  <div className="step">
                    <div className="step__num">{s.n}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:24, marginBottom:6}}>{s.e}</div>
                      <div className="step__title">{s.t}</div>
                      <div className="step__desc">{s.d}</div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ══ DUEÑOS ══ */}
        <section className="sp-sec" style={{borderTop:'1px solid rgba(255,255,255,.06)'}}>
          <div className="sec-inner">
            <FadeIn>
              <div className="owner-card">
                <p style={{fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(74,222,128,.55)', marginBottom:12}}>
                  Para dueños de complejos
                </p>
                <h2 style={{fontFamily:'var(--font-d)', fontSize:'clamp(22px,5vw,34px)', fontWeight:800, color:'#fff', lineHeight:1.0, letterSpacing:'-.02em', marginBottom:12}}>
                  Llená tus turnos.<br/><span style={{color:'var(--g4)'}}>Automatizá todo.</span>
                </h2>
                <p style={{fontSize:13, color:'rgba(255,255,255,.42)', lineHeight:1.75, marginBottom:20, maxWidth:340}}>
                  Miles de jugadores buscan canchas. Recibí reservas automáticas 24/7 sin el caos del WhatsApp. <strong style={{color:'rgba(255,255,255,.65)'}}>Plan fijo mensual</strong> — 30 días gratis para empezar.
                </p>
                <div style={{display:'flex', flexDirection:'column', gap:9, marginBottom:24}}>
                  {[
                    { icon:'📅', text:'Agenda digital y reservas automáticas' },
                    { icon:'💳', text:'Cobros en línea sin fricción ni llamadas' },
                    { icon:'📊', text:'Dashboard con métricas de tu complejo' },
                    { icon:'🌎', text:'Visibilidad ante toda la comunidad GolPlay' },
                  ].map(f => (
                    <div key={f.text} className="owner-feat">
                      <div className="owner-feat__icon">{f.icon}</div>
                      {f.text}
                    </div>
                  ))}
                </div>
                <Link href="/register?type=owner" className="owner-cta">
                  Sumar mi complejo — es gratis →
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer style={{background:'#050a06', padding:'clamp(40px,5vw,60px) clamp(16px,4vw,40px) 26px', borderTop:'1px solid rgba(255,255,255,.06)'}}>
          <div style={{maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1.8fr 1fr 1fr', gap:40, paddingBottom:28, borderBottom:'1px solid rgba(255,255,255,.06)', marginBottom:18}}>
            <div>
              <img src="/logo-golplay.svg" alt="GolPlay" style={{height:36, display:'block', marginBottom:12, opacity:.75, filter:'brightness(0) invert(1)'}}/>
              <p style={{fontSize:13, color:'rgba(255,255,255,.25)', lineHeight:1.8, maxWidth:260}}>
                La plataforma del fútbol amateur. Tu carta, tu equipo, tus retos — y la cancha.
              </p>
            </div>
            <nav aria-label="Info">
              <p style={{fontSize:10, fontWeight:800, letterSpacing:'.1em', color:'rgba(255,255,255,.18)', textTransform:'uppercase', marginBottom:13}}>Producto</p>
              {[
                {href:'/jugadores/crear', l:'Crear carta'},
                {href:'/equipos',         l:'Equipos'},
                {href:'/retos',           l:'Retos'},
                {href:'/reserve',         l:'Reservar cancha'},
              ].map(({href,l}) => (
                <Link key={href} href={href} style={{display:'block', fontSize:13, color:'rgba(255,255,255,.32)', textDecoration:'none', marginBottom:9}}>{l}</Link>
              ))}
            </nav>
            <div>
              <p style={{fontSize:10, fontWeight:800, letterSpacing:'.1em', color:'rgba(255,255,255,.18)', textTransform:'uppercase', marginBottom:13}}>Info</p>
              {[
                {href:'/terms',   l:'Términos de uso'},
                {href:'/privacy', l:'Privacidad'},
                {href:'/login',   l:'Iniciar sesión'},
                {href:'/register?type=owner', l:'Soy dueño'},
              ].map(({href,l}) => (
                <Link key={href} href={href} style={{display:'block', fontSize:13, color:'rgba(255,255,255,.32)', textDecoration:'none', marginBottom:9}}>{l}</Link>
              ))}
            </div>
          </div>
          <p style={{textAlign:'center', fontSize:12, color:'rgba(255,255,255,.15)'}}>
            © {new Date().getFullYear()} GolPlay · Hecho en Costa Rica 🇨🇷
          </p>
        </footer>
      </div>

      {/* WhatsApp FAB */}
      <a className="wa-fab" href="https://wa.me/message/KVBP5AVNH45JL1" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp" title="Contactar por WhatsApp">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* Toast */}
      {showToast && (
        <div role="status" aria-live="polite" className="toast">
          🎉 ¡Reserva confirmada! Revisá tu correo.
        </div>
      )}
    </>
  )
}