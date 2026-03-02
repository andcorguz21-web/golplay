/**
 * GolPlay — pages/reserve/[id].tsx  v2 "Luxury Sport Editorial"
 *
 * Diseño alineado al home (index.tsx):
 * - Kanit + DM Serif Display — mismo pairing tipográfico
 * - Forest greens + bone white + deep charcoal — misma paleta
 * - Glassmorphism, grain textures, floating cards — misma estética
 * - Hero de cancha full-bleed con galería integrada
 * - Booking card sticky con calendario custom y slots de hora
 * - Mapa embebido via Leaflet (OpenStreetMap, sin API key)
 * - Modal de confirmación con diseño premium
 *
 * MAPA — Instrucciones de instalación:
 *   npm install leaflet react-leaflet
 *   npm install --save-dev @types/leaflet
 *
 *   En _app.tsx o en este mismo archivo, importar CSS de leaflet:
 *   import 'leaflet/dist/leaflet.css'
 *
 *   La tabla `fields` necesita columnas: latitude (float8), longitude (float8)
 *   Si no existen: ALTER TABLE fields ADD COLUMN latitude float8, ADD COLUMN longitude float8;
 *   Geocodificación sugerida: https://nominatim.openstreetmap.org/search?q={address}&format=json
 */

import { useRouter }        from 'next/router'
import dynamic              from 'next/dynamic'
import Head                 from 'next/head'
import Link                 from 'next/link'
import Image                from 'next/image'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { supabase }         from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Field = {
  id:              number
  name:            string
  sport:           string | null
  location:        string
  description:     string | null
  features:        string[] | null
  hours:           string[] | null
  price_day:       number
  price_night:     number
  night_from_hour: number   // hora desde la que aplica tarifa nocturna (ej: 18)
  latitude:        number | null
  longitude:       number | null
}

type BookingStatus = 'idle' | 'sending' | 'success' | 'error'

// ─── Dynamic imports (SSR-safe) ────────────────────────────────────────────────

// Leaflet requiere que sea dinámico (usa `window`)
const MapEmbed = dynamic(() => import('./MapEmbed'), { ssr: false })

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORTS_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  futbol5:  { label: 'Fútbol 5',  color: '#16a34a', bg: '#dcfce7',  emoji: '⚽' },
  futbol7:  { label: 'Fútbol 7',  color: '#15803d', bg: '#bbf7d0',  emoji: '⚽' },
  padel:    { label: 'Pádel',     color: '#0e7490', bg: '#cffafe',  emoji: '🎾' },
  tenis:    { label: 'Tenis',     color: '#92400e', bg: '#fef3c7',  emoji: '🎾' },
  multiuso: { label: 'Multiuso',  color: '#5b21b6', bg: '#ede9fe',  emoji: '🏟️' },
  basquet:  { label: 'Básquet',   color: '#9a3412', bg: '#ffedd5',  emoji: '🏀' },
}

const HOUR_SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
]

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1400&q=80',
]

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR')}`
const isNightHour = (h: string, nightFrom: number = 18) => Number(h.split(':')[0]) >= nightFrom

const dateToStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatDisplay = (s: string) => {
  if (!s) return ''
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAYS_ES[dt.getDay()]} ${dt.getDate()} ${MONTHS_ES[dt.getMonth()].slice(0, 3)}`
}

function validateForm(n: string, p: string, e: string) {
  const errs: Record<string, string> = {}
  if (!n.trim() || n.trim().length < 2)              errs.name  = 'Mínimo 2 caracteres'
  if (!p.trim() || !/^\+?[\d\s\-()]{7,}$/.test(p))  errs.phone = 'Teléfono inválido'
  if (!e.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errs.email = 'Correo inválido'
  return errs
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  :root {
    --g900: #052e16;
    --g800: #0B4D2C;
    --g700: #15803d;
    --g500: #16a34a;
    --g400: #4ade80;
    --g100: #dcfce7;
    --bone: #F5F2EC;
    --charcoal: #0C0D0B;
    --ink: #1a1d19;
    --muted: #6b7569;
    --border: #e8ece6;
    --white: #ffffff;
    --r-xl: 24px;
    --r-lg: 16px;
    --r-md: 12px;
    --sh-sm: 0 1px 3px rgba(0,0,0,.06),0 4px 12px rgba(0,0,0,.06);
    --sh-md: 0 4px 16px rgba(0,0,0,.10),0 12px 32px rgba(0,0,0,.08);
    --sh-lg: 0 8px 32px rgba(0,0,0,.16),0 24px 64px rgba(0,0,0,.12);
    --font-d: 'DM Serif Display', Georgia, serif;
    --font-h: 'Kanit', sans-serif;
    --font-b: 'DM Sans', sans-serif;
  }

  *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: var(--font-b);
    background: var(--bone);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::selection { background: var(--g400); color: var(--g900); }

  /* ── Animations ──────────────────────────────────────────── */
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes shimmer {
    0%  { background-position:200% 0; }
    100%{ background-position:-200% 0; }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(32px) scale(.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes expandIn {
    from { opacity:0; transform:scale(.96) translateY(-6px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes pulseDot {
    0%,100% { box-shadow:0 0 0 0 rgba(74,222,128,.5); }
    50%     { box-shadow:0 0 0 6px rgba(74,222,128,0); }
  }
  @keyframes spinRing {
    to { transform:rotate(360deg); }
  }

  /* ── Navbar ──────────────────────────────────────────────── */
  .nav {
    position:fixed; top:0; left:0; right:0; z-index:90;
    padding:0 32px; height:68px;
    display:flex; align-items:center; justify-content:space-between;
    background:rgba(12,13,11,.92);
    backdrop-filter:blur(20px) saturate(1.4);
    border-bottom:1px solid rgba(255,255,255,.06);
    box-shadow:0 1px 0 rgba(255,255,255,.04);
  }
  .nav__logo { display:flex; align-items:center; height:32px; cursor:pointer; }
  .nav__links { display:flex; align-items:center; gap:6px; }
  .nav__link {
    padding:8px 14px; border-radius:var(--r-md);
    font-size:13.5px; font-weight:500; font-family:var(--font-b);
    text-decoration:none; transition:all .15s;
    color:rgba(255,255,255,.6);
  }
  .nav__link:hover { color:#fff; background:rgba(255,255,255,.08); }
  .nav__back {
    display:inline-flex; align-items:center; gap:8px;
    padding:8px 14px; border-radius:var(--r-md);
    font-size:13px; font-weight:600; font-family:var(--font-b);
    color:rgba(255,255,255,.6); background:none; border:none; cursor:pointer;
    transition:all .15s; text-decoration:none;
  }
  .nav__back:hover { color:#fff; background:rgba(255,255,255,.08); }

  /* ── Hero ────────────────────────────────────────────────── */
  .hero {
    position:relative; overflow:hidden;
    background:#0C0D0B;
    height:clamp(380px, 52vh, 560px);
    margin-top:68px;
  }
  .hero__img {
    position:absolute; inset:0;
    transition:opacity .55s ease, transform .55s ease;
  }
  .hero__overlay {
    position:absolute; inset:0;
    background:linear-gradient(
      to bottom,
      rgba(12,13,11,.18) 0%,
      rgba(12,13,11,.04) 40%,
      rgba(12,13,11,.72) 78%,
      rgba(12,13,11,.96) 100%
    );
    z-index:2;
  }
  .hero__grain {
    position:absolute; inset:0; z-index:3; opacity:.32;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E");
    pointer-events:none;
  }
  .hero__content {
    position:absolute; bottom:0; left:0; right:0; z-index:4;
    padding:0 48px 40px;
    animation:fadeUp .55s ease both;
  }

  /* ── Gallery thumbs ──────────────────────────────────────── */
  .gallery-bar {
    display:flex; gap:10px; overflow-x:auto;
    scrollbar-width:none; -webkit-overflow-scrolling:touch;
    padding:20px 48px;
    background:linear-gradient(to bottom, var(--charcoal), #111);
  }
  .gallery-bar::-webkit-scrollbar { display:none; }
  .gallery-thumb {
    width:80px; height:56px; border-radius:10px;
    border:2px solid transparent; cursor:pointer; flex-shrink:0;
    overflow:hidden; position:relative;
    transition:border-color .15s, transform .15s;
  }
  .gallery-thumb:hover { transform:translateY(-2px); }
  .gallery-thumb.active { border-color:var(--g400); }

  /* ── Layout ──────────────────────────────────────────────── */
  .page-body {
    background:var(--bone);
    padding:0 48px 100px;
    min-height:100vh;
  }
  .page-grid {
    max-width:1260px; margin:0 auto;
    display:grid; grid-template-columns:1fr 400px;
    gap:36px; padding-top:40px;
    align-items:start;
  }

  /* ── Section label (match home) ──────────────────────────── */
  .sec-label {
    font-size:10px; font-weight:700; letter-spacing:.12em;
    text-transform:uppercase; color:var(--g500);
    font-family:var(--font-h); margin-bottom:8px;
  }
  .sec-title {
    font-family:var(--font-d);
    font-size:clamp(22px,2.8vw,34px);
    font-weight:400; color:var(--ink);
    letter-spacing:-.02em; line-height:1.08;
    font-style:italic; margin-bottom:28px;
  }
  .sec-title em {
    font-style:normal;
    background:linear-gradient(135deg, var(--g800), var(--g500));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  }

  /* ── Info card (left content sections) ───────────────────── */
  .info-card {
    background:var(--white); border:1.5px solid var(--border);
    border-radius:var(--r-xl); overflow:hidden;
    box-shadow:var(--sh-sm); margin-bottom:20px;
    animation:fadeUp .5s ease both;
  }
  .info-card__head {
    padding:24px 28px 0;
    border-bottom:0;
  }
  .info-card__body { padding:20px 28px 28px; }

  /* ── Feature pills ───────────────────────────────────────── */
  .feature-pill {
    display:inline-flex; align-items:center; gap:6px;
    padding:7px 14px; border-radius:999px;
    background:#f0fdf4; color:var(--g700);
    font-size:12.5px; font-weight:600; font-family:var(--font-b);
    border:1px solid #bbf7d0;
  }

  /* ── Calendar ────────────────────────────────────────────── */
  .cal-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 24px 12px;
    font-family:var(--font-h); font-size:14px; font-weight:700; color:var(--ink);
  }
  .cal-nav {
    width:30px; height:30px; border-radius:8px;
    border:1.5px solid var(--border); background:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:13px; color:var(--muted); transition:all .12s;
  }
  .cal-nav:hover { border-color:var(--g500); color:var(--g500); background:var(--g100); }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; padding:0 16px 16px; }
  .cal-dow { text-align:center; font-size:10px; font-weight:700; color:var(--muted); padding:4px 0 8px; font-family:var(--font-h); letter-spacing:.06em; }
  .cal-day {
    aspect-ratio:1; display:flex; align-items:center; justify-content:center;
    border-radius:9px; font-size:12.5px; font-weight:500;
    cursor:pointer; border:none; background:none;
    transition:all .12s; font-family:var(--font-b); color:var(--ink);
  }
  .cal-day:hover:not(:disabled) { background:var(--g100); color:var(--g700); font-weight:700; }
  .cal-day.today  { font-weight:800; color:var(--g500); }
  .cal-day.sel    { background:var(--g500)!important; color:#fff!important; font-weight:700; border-radius:10px; }
  .cal-day.out    { color:#d0d8cf; }
  .cal-day:disabled { color:#dce4da; cursor:default; }

  /* ── Hour buttons ────────────────────────────────────────── */
  .hour-btn {
    padding:10px 6px; border-radius:11px;
    border:1.5px solid var(--border); cursor:pointer;
    font-size:12px; font-weight:700; font-family:var(--font-h);
    transition:all .14s ease; background:var(--white); color:var(--ink);
    text-align:center; display:flex; flex-direction:column;
    align-items:center; gap:2px; letter-spacing:.01em;
  }
  .hour-btn:hover:not(:disabled) {
    border-color:var(--g500); background:var(--g100); color:var(--g700);
    transform:translateY(-2px); box-shadow:0 4px 14px rgba(22,163,74,.18);
  }
  .hour-btn.sel {
    background:var(--g500); border-color:var(--g500); color:#fff;
    box-shadow:0 4px 20px rgba(22,163,74,.40); transform:translateY(-2px);
  }
  .hour-btn.night-sel {
    background:linear-gradient(135deg,#4c1d95,#7c3aed);
    border-color:#7c3aed; color:#fff;
    box-shadow:0 4px 20px rgba(124,58,237,.35); transform:translateY(-2px);
  }
  .hour-btn:disabled {
    background:#f8faf8; color:#c9d3c8;
    cursor:not-allowed; border-color:#f0f3f0;
    transform:none; box-shadow:none;
  }
  .hour-tag {
    font-size:9px; font-weight:700; letter-spacing:.04em;
    text-transform:uppercase; opacity:.75;
  }

  /* ── Booking card ────────────────────────────────────────── */
  .booking-card {
    background:var(--white); border-radius:var(--r-xl);
    border:1.5px solid var(--border);
    box-shadow:0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.10);
    position:sticky; top:88px;
    overflow:hidden;
  }
  .booking-card__header {
    padding:22px 24px 16px;
    background:linear-gradient(140deg,#052e16 0%,#0B4D2C 100%);
    position:relative; overflow:hidden;
  }
  .booking-card__header::before {
    content:''; position:absolute; inset:0;
    background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
    background-size:28px 28px;
  }
  .booking-card__body { padding:20px 24px 24px; }

  /* ── Reserve CTA button ──────────────────────────────────── */
  .reserve-btn {
    width:100%; padding:15px 20px; border-radius:14px;
    background:linear-gradient(135deg,var(--g500),var(--g700));
    color:#fff; font-weight:800; font-size:14px;
    font-family:var(--font-h); letter-spacing:.04em; text-transform:uppercase;
    border:none; cursor:pointer;
    box-shadow:0 4px 20px rgba(22,163,74,.32);
    transition:all .2s cubic-bezier(.16,1,.3,1);
    display:flex; align-items:center; justify-content:center; gap:8px;
    margin-top:16px;
  }
  .reserve-btn:hover:not(:disabled) {
    transform:translateY(-2px);
    box-shadow:0 8px 32px rgba(22,163,74,.45);
  }
  .reserve-btn:disabled {
    background:var(--border); color:#a8b5a6;
    box-shadow:none; cursor:not-allowed; transform:none;
  }

  /* ── Skeleton ────────────────────────────────────────────── */
  .skel {
    background:linear-gradient(90deg,#ebebeb 25%,#f5f5f5 50%,#ebebeb 75%);
    background-size:400% 100%;
    animation:shimmer 1.6s infinite;
    border-radius:10px;
  }

  /* ── Map container ───────────────────────────────────────── */
  .map-wrap {
    border-radius:var(--r-xl); overflow:hidden;
    border:1.5px solid var(--border);
    box-shadow:var(--sh-sm);
    height:280px; position:relative;
  }
  .map-wrap .leaflet-container {
    height:100%; width:100%;
    font-family:var(--font-b) !important;
    border-radius:var(--r-xl);
  }
  /* Custom leaflet marker popup */
  .leaflet-popup-content-wrapper {
    border-radius:16px !important;
    box-shadow:0 8px 32px rgba(0,0,0,.18) !important;
    border:1.5px solid var(--border) !important;
    padding:0 !important;
    overflow:hidden;
    font-family:var(--font-b) !important;
  }
  .leaflet-popup-content { margin:0 !important; }
  .leaflet-popup-tip-container { display:none; }

  /* ── Modal ───────────────────────────────────────────────── */
  .modal-overlay {
    position:fixed; inset:0; z-index:200;
    background:rgba(12,13,11,.65);
    backdrop-filter:blur(8px) saturate(1.4);
    display:flex; align-items:flex-end; justify-content:center;
    padding:20px;
  }
  @media (min-width:640px) {
    .modal-overlay { align-items:center; }
  }
  .modal {
    background:var(--white); border-radius:28px 28px 0 0;
    width:100%; max-width:460px;
    box-shadow:0 -8px 60px rgba(0,0,0,.28), 0 24px 80px rgba(0,0,0,.25);
    animation:slideUp .3s cubic-bezier(.16,1,.3,1);
    overflow:hidden; max-height:90vh; overflow-y:auto;
  }
  @media (min-width:640px) {
    .modal { border-radius:28px; }
  }
  .modal-input {
    width:100%; padding:13px 16px; border-radius:12px;
    border:1.5px solid var(--border); font-size:14px;
    font-family:var(--font-b); outline:none; background:#fafaf8;
    color:var(--ink); transition:border-color .15s,box-shadow .15s;
  }
  .modal-input:focus {
    border-color:var(--g500); background:#fff;
    box-shadow:0 0 0 3px rgba(22,163,74,.12);
  }
  .modal-input.err { border-color:#ef4444; background:#fff8f8; }
  .modal-input.err:focus { box-shadow:0 0 0 3px rgba(239,68,68,.1); }

  /* ── Price tag ───────────────────────────────────────────── */
  .price-tag {
    display:inline-flex; align-items:center; gap:7px;
    padding:8px 18px; border-radius:999px;
    font-size:14px; font-weight:700; font-family:var(--font-h);
    border:1.5px solid; letter-spacing:.02em;
  }

  /* ── Responsive ──────────────────────────────────────────── */
  @media (max-width:1024px) {
    .page-grid { grid-template-columns:1fr; gap:24px; }
    .booking-card { position:static; }
  }
  @media (max-width:768px) {
    .hero__content { padding:0 24px 32px; }
    .gallery-bar { padding:16px 24px; }
    .page-body { padding:0 20px 80px; }
    .page-grid { padding-top:28px; }
    .info-card__head { padding:20px 20px 0; }
    .info-card__body { padding:16px 20px 20px; }
    .booking-card__body { padding:16px 18px 20px; }
    .booking-card__header { padding:18px 18px 14px; }
  }
  @media (max-width:480px) {
    .nav { padding:0 16px; }
    .nav__links { display:none; }
  }
`

// ─── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 18, height: 18,
      border: '2.5px solid rgba(255,255,255,.3)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spinRing .7s linear infinite',
      flexShrink: 0,
    }}/>
  )
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const init  = value ? (() => { const [y,m,d]=value.split('-').map(Number); return new Date(y,m-1,d) })() : today
  const [view, setView] = useState(new Date(init.getFullYear(), init.getMonth(), 1))
  const first = view.getDay()
  const days  = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const sel = value ? (() => { const [y,m,d]=value.split('-').map(Number); return new Date(y,m-1,d) })() : null

  return (
    <div>
      <div className="cal-header">
        <button className="cal-nav" type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth()-1, 1))}>‹</button>
        <span>{MONTHS_ES[view.getMonth()].slice(0,3)} {view.getFullYear()}</span>
        <button className="cal-nav" type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth()+1, 1))}>›</button>
      </div>
      <div className="cal-grid">
        {DAYS_ES.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`}/>
          const dt    = new Date(view.getFullYear(), view.getMonth(), day)
          const isPast = dt < today
          const str   = dateToStr(dt)
          const isSel = sel ? str === dateToStr(sel) : false
          const isTod = str === dateToStr(today)
          return (
            <button key={day} type="button" disabled={isPast}
              className={`cal-day${isTod?' today':''}${isSel?' sel':''}`}
              onClick={() => onChange(str)}
            >{day}</button>
          )
        })}
      </div>
    </div>
  )
}

function SkeletonPage() {
  return (
    <>
      <nav className="nav">
        <div style={{ height: 32, width: 120, borderRadius: 8, background: 'rgba(255,255,255,.08)' }}/>
      </nav>
      <div style={{ height: 'clamp(380px,52vh,560px)', marginTop: 68, background: '#111' }}/>
      <div style={{ background: '#111', height: 88 }}/>
      <div className="page-body">
        <div className="page-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="skel" style={{ height: 220, borderRadius: 24 }}/>
            <div className="skel" style={{ height: 140, borderRadius: 24 }}/>
            <div className="skel" style={{ height: 280, borderRadius: 24 }}/>
          </div>
          <div className="skel" style={{ height: 520, borderRadius: 24 }}/>
        </div>
      </div>
    </>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ReserveField() {
  const router  = useRouter()
  const fieldId = router.isReady ? Number(router.query.id) : null

  // ── State ──────────────────────────────────────────────────────────────────
  const [field,        setField]        = useState<Field | null>(null)
  const [images,       setImages]       = useState<string[]>([])
  const [activeImg,    setActiveImg]    = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(false)

  const [selDate,      setSelDate]      = useState('')
  const [selHour,      setSelHour]      = useState('')
  const [bookedHours,  setBookedHours]  = useState<string[]>([])
  const [loadingHours, setLoadingHours] = useState(false)

  const [showModal,    setShowModal]    = useState(false)
  const [name,         setName]         = useState('')
  const [phone,        setPhone]        = useState('')
  const [email,        setEmail]        = useState('')
  const [formErrors,   setFormErrors]   = useState<Record<string, string>>({})
  const [status,       setStatus]       = useState<BookingStatus>('idle')

  // ── Booking hold ───────────────────────────────────────────────────────────
  const sessionToken = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  )
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const heroRef  = useRef<HTMLDivElement>(null)

  // ── Load field ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fieldId || isNaN(fieldId)) return
    ;(async () => {
      setLoading(true); setLoadError(false)
      try {
        const [{ data: fieldData, error: fe }, { data: imgs }] = await Promise.all([
          supabase
            .from('fields')
            .select('id,name,sport,location,description,features,hours,price_day,price_night,night_from_hour,latitude,longitude')
            .eq('id', fieldId)
            .eq('active', true)
            .single(),
          supabase
            .from('field_images')
            .select('url,is_main')
            .eq('field_id', fieldId)
            .order('is_main', { ascending: false }),
        ])
        if (fe || !fieldData) throw fe
        setField({
          id:          fieldData.id,
          name:        fieldData.name,
          sport:       fieldData.sport ?? null,
          location:    fieldData.location ?? 'Sin ubicación',
          description: fieldData.description ?? null,
          features:    Array.isArray(fieldData.features) ? fieldData.features : null,
          hours:       Array.isArray(fieldData.hours) ? fieldData.hours : null,
          price_day:   Number(fieldData.price_day  ?? 0),
          price_night:     Number(fieldData.price_night ?? 0),
          night_from_hour: Number(fieldData.night_from_hour ?? 18),
          latitude:    fieldData.latitude  ?? null,
          longitude:   fieldData.longitude ?? null,
        })
        const urlList = imgs?.map((i: any) => i.url).filter(Boolean) ?? []
        setImages(urlList.length ? urlList : FALLBACK_IMAGES)
      } catch { setLoadError(true) }
      finally  { setLoading(false) }
    })()
  }, [fieldId])

  // ── Load booked hours ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!fieldId || !selDate || isNaN(fieldId)) return
    setLoadingHours(true)
    supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', fieldId)
      .eq('date', selDate)
      .in('status', ['confirmed', 'pending'])
      .then(({ data, error }) => {
        setBookedHours(error ? [] : (data || []).map((b: any) => b.hour))
        setLoadingHours(false)
      })
  }, [fieldId, selDate])

  // ── Derived values ─────────────────────────────────────────────────────────
  const { isNight, price } = useMemo(() => {
    if (!field || !selHour) return { isNight: false, price: 0 }
    const night = isNightHour(selHour, field.night_from_hour)
    return { isNight: night, price: night ? field.price_night : field.price_day }
  }, [selHour, field])

  const sportMeta = field?.sport ? SPORTS_META[field.sport] : null
  const sortedHours = useMemo(() => [...(field?.hours || [])].sort(), [field])
  const dateDisplay = selDate ? formatDisplay(selDate) : ''

  // ── Booking hold helpers ──────────────────────────────────────────────────

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setHoldSecondsLeft(null)
  }, [])

  const startHoldTimer = useCallback((expiresAt: string) => {
    clearHoldTimer()
    const tick = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      if (diff <= 0) {
        clearHoldTimer()
        // Hold expiró — liberar selección para que el usuario sepa que debe re-seleccionar
        setSelHour('')
        setHoldSecondsLeft(null)
      } else {
        setHoldSecondsLeft(diff)
      }
    }
    tick()
    holdTimerRef.current = setInterval(tick, 1000)
  }, [clearHoldTimer])

  const createHold = useCallback(async (fId: number, date: string, hour: string) => {
    if (!fId || !date || !hour) return
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      const { error } = await supabase
        .from('booking_holds')
        .upsert({
          field_id:      fId,
          date,
          hour,
          session_token: sessionToken.current,
          expires_at:    expiresAt,
        }, { onConflict: 'field_id,date,hour' })
      if (!error) startHoldTimer(expiresAt)
    } catch {
      // Hold falla silenciosamente — el único guard real es el UNIQUE index en bookings
    }
  }, [startHoldTimer])

  const releaseHold = useCallback(async (fId: number, date: string, hour: string) => {
    if (!fId || !date || !hour) return
    clearHoldTimer()
    try {
      await supabase
        .from('booking_holds')
        .delete()
        .eq('field_id',      fId)
        .eq('date',          date)
        .eq('hour',          hour)
        .eq('session_token', sessionToken.current)
    } catch { /* silencioso */ }
  }, [clearHoldTimer])

  // Limpiar hold/timer al desmontar
  useEffect(() => {
    return () => { clearHoldTimer() }
  }, [clearHoldTimer])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDateChange = useCallback((d: string) => {
    // Liberar hold del slot anterior si había uno
    if (selDate && selHour && fieldId) releaseHold(fieldId, selDate, selHour)
    setSelDate(d); setSelHour('')
    clearHoldTimer()
  }, [selDate, selHour, fieldId, releaseHold, clearHoldTimer])

  const handleHourSelect = useCallback((h: string) => {
    if (!fieldId || !selDate) return
    // Liberar hold anterior si cambia de hora
    if (selHour && selHour !== h) releaseHold(fieldId, selDate, selHour)
    setSelHour(h)
    createHold(fieldId, selDate, h)
  }, [fieldId, selDate, selHour, releaseHold, createHold])

  const openModal = () => {
    setFormErrors({}); setStatus('idle'); setShowModal(true)
  }

  const handleConfirm = async () => {
    if (!selDate || !selHour || !field || !fieldId) return
    // Validar que la fecha no sea pasada
    const today = new Date(); today.setHours(0,0,0,0)
    const [sy,sm,sd] = selDate.split("-").map(Number)
    if (new Date(sy, sm-1, sd) < today) { setStatus("error"); return }
    const errs = validateForm(name, phone, email)
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setStatus('sending')
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
            date:     selDate,
            hour:     selHour,
            name:     name.trim(),
            phone:    phone.trim(),
            email:    email.trim().toLowerCase(),
            price,
            tariff:   isNight ? 'night' : 'day',
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message || 'Error al crear la reserva')
      }
      setStatus('success')
      clearHoldTimer()  // el slot ya está confirmado, liberar timer
      setTimeout(() => router.push('/?reserva=ok'), 1800)
    } catch { setStatus('error') }
  }

  // ── Early returns ──────────────────────────────────────────────────────────
  if (loading) return <><style>{CSS}</style><SkeletonPage/></>

  if (loadError || !field) {
    return (
      <>
        <style>{CSS}</style>
        <nav className="nav">
          <div className="nav__logo" onClick={() => router.push('/')}>
            <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 80 }}/>
          </div>
        </nav>
        <main style={{ minHeight: '100vh', background: 'var(--bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, marginTop: 68 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>Cancha no encontrada</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Esta cancha no existe o fue removida.</p>
          <button onClick={() => router.push('/')} style={{ marginTop: 8, padding: '11px 28px', background: 'var(--g500)', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, letterSpacing: '.03em' }}>
            ← Volver al inicio
          </button>
        </main>
      </>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>{field.name} — Reservar cancha · GolPlay</title>
        <meta name="description" content={field.description ?? `Reservá ${field.name} en GolPlay. Disponibilidad real, precio claro.`}/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      </Head>

      <style>{CSS}</style>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav__logo" onClick={() => router.push('/')}>
          <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 80 }}/>
        </div>
        <div className="nav__links">
          <button className="nav__back" onClick={() => router.push('/')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Volver a canchas
          </button>
          <Link href="/login" className="nav__link">Iniciar sesión</Link>
          <Link href="/register" style={{
            padding: '9px 20px', borderRadius: 'var(--r-md)',
            fontSize: '13.5px', fontWeight: 600, fontFamily: 'var(--font-b)',
            background: 'var(--g500)', color: '#fff',
            textDecoration: 'none', transition: 'all .15s',
            boxShadow: '0 2px 10px rgba(22,163,74,.35)',
          }}>Registrarse</Link>
        </div>
      </nav>

      {/* ── HERO — full-bleed image with sport overlay ──────────────────────── */}
      <div className="hero" ref={heroRef}>
        {images.map((src, i) => (
          <div key={src} className="hero__img" style={{
            opacity: i === activeImg ? 1 : 0,
            transform: i === activeImg ? 'scale(1)' : 'scale(1.04)',
          }}>
            <Image src={src} alt={`${field.name} imagen ${i+1}`} fill sizes="100vw" style={{ objectFit: 'cover' }} priority={i === 0} loading={i === 0 ? 'eager' : 'lazy'}/>
          </div>
        ))}
        <div className="hero__overlay"/>
        <div className="hero__grain" aria-hidden/>

        {/* Grid lines overlay matching home */}
        <div aria-hidden style={{ position:'absolute', inset:0, zIndex:3, backgroundImage:'linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }}/>

        <div className="hero__content">
          {/* Sport badge */}
          {sportMeta && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,.18)', borderRadius: 999,
              padding: '5px 14px 5px 10px', marginBottom: 16,
            }}>
              <span style={{ fontSize: 14 }}>{sportMeta.emoji}</span>
              <span style={{ fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {sportMeta.label}
              </span>
            </div>
          )}

          {/* Field name — DM Serif Display matching home hero */}
          <h1 style={{
            fontFamily: 'var(--font-d)',
            fontSize: 'clamp(32px, 5vw, 58px)',
            fontWeight: 400, color: '#fff',
            lineHeight: 1.0, letterSpacing: '-.03em',
            marginBottom: 12, maxWidth: 760,
          }}>{field.name}</h1>

          {/* Location + price row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,.72)', fontWeight: 500 }}>{field.location}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 999, background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.18)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.9)', fontFamily: 'var(--font-h)' }}>
                🌞 {fmt(field.price_day)}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 999, background: 'rgba(124,58,237,.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(167,139,250,.25)', fontSize: 13, fontWeight: 700, color: '#c4b5fd', fontFamily: 'var(--font-h)' }}>
                🌙 {fmt(field.price_night)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── GALLERY BAR ─────────────────────────────────────────────────────── */}
      {images.length > 1 && (
        <div className="gallery-bar">
          {images.map((src, i) => (
            <button key={src} className={`gallery-thumb${i === activeImg ? ' active' : ''}`}
              onClick={() => setActiveImg(i)} aria-label={`Ver imagen ${i+1}`}>
              <Image src={src} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} loading="lazy"/>
            </button>
          ))}
          <div style={{ flexShrink: 0, marginLeft: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {activeImg + 1} / {images.length}
            </span>
          </div>
        </div>
      )}

      {/* ── MAIN BODY ───────────────────────────────────────────────────────── */}
      <div className="page-body">
        <div className="page-grid">

          {/* ════════════════════════════════════════════
              LEFT COLUMN — Info
          ════════════════════════════════════════════ */}
          <div>

            {/* ── Description ─────────────────────────────────────────────── */}
            {(field.description || (field.features && field.features.length > 0)) && (
              <div className="info-card" style={{ animationDelay: '0ms' }}>
                <div className="info-card__head">
                  <p className="sec-label">Sobre la cancha</p>
                  <h2 className="sec-title">
                    Todo lo que <em>necesitás saber</em>
                  </h2>
                </div>
                <div className="info-card__body">
                  {field.description && (
                    <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.8, marginBottom: field.features?.length ? 20 : 0 }}>
                      {field.description}
                    </p>
                  )}
                  {field.features && field.features.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {field.features.map(f => (
                        <span key={f} className="feature-pill">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Pricing cards ────────────────────────────────────────────── */}
            <div className="info-card" style={{ animationDelay: '60ms' }}>
              <div className="info-card__head">
                <p className="sec-label">Tarifas</p>
                <h2 className="sec-title">Precios <em>transparentes</em></h2>
              </div>
              <div className="info-card__body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Day rate */}
                  <div style={{
                    padding: '20px 22px', borderRadius: 16,
                    background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
                    border: '1.5px solid #a7f3d0',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,.12)' }}/>
                    <p style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 700, letterSpacing: '.10em', color: '#065f46', textTransform: 'uppercase', marginBottom: 10 }}>
                      🌞 Tarifa diurna
                    </p>
                    <p style={{ fontFamily: 'var(--font-h)', fontSize: 28, fontWeight: 800, color: '#065f46', lineHeight: 1, marginBottom: 6 }}>
                      {fmt(field.price_day)}
                    </p>
                    <p style={{ fontSize: 12, color: '#047857', fontWeight: 500 }}>06:00 – {String(field.night_from_hour - 1).padStart(2,'0')}:59 h</p>
                  </div>
                  {/* Night rate */}
                  <div style={{
                    padding: '20px 22px', borderRadius: 16,
                    background: 'linear-gradient(135deg,#faf5ff,#ede9fe)',
                    border: '1.5px solid #c4b5fd',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,.12)' }}/>
                    <p style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 700, letterSpacing: '.10em', color: '#4c1d95', textTransform: 'uppercase', marginBottom: 10 }}>
                      🌙 Tarifa nocturna
                    </p>
                    <p style={{ fontFamily: 'var(--font-h)', fontSize: 28, fontWeight: 800, color: '#4c1d95', lineHeight: 1, marginBottom: 6 }}>
                      {fmt(field.price_night)}
                    </p>
                    <p style={{ fontSize: 12, color: '#5b21b6', fontWeight: 500 }}>{String(field.night_from_hour).padStart(2,'0')}:00 – 22:00 h</p>
                  </div>
                </div>
                {/* No-advance note */}
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>
                  <p style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    GolPlay no cobra adelantos. Pagás directamente en el complejo.
                  </p>
                </div>
              </div>
            </div>

            {/* ── MAP ──────────────────────────────────────────────────────── */}
            <div className="info-card" style={{ animationDelay: '120ms' }}>
              <div className="info-card__head">
                <p className="sec-label">Ubicación</p>
                <h2 className="sec-title">¿Dónde <em>encontrarnos</em>?</h2>
              </div>
              <div className="info-card__body" style={{ paddingTop: 0 }}>

                {/* Address row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'var(--bone)', border: '1.5px solid var(--border)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--g100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g700)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{field.location}</p>
                  {field.latitude && field.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${field.latitude},${field.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--g700)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '6px 12px', borderRadius: 8, background: 'var(--g100)', border: '1px solid #bbf7d0', fontFamily: 'var(--font-h)', letterSpacing: '.03em' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                      Abrir en Maps
                    </a>
                  )}
                </div>

                {/* Map or placeholder */}
                <div className="map-wrap">
                  {field.latitude && field.longitude ? (
                    <MapEmbed
                      lat={field.latitude}
                      lng={field.longitude}
                      name={field.name}
                      location={field.location}
                      sport={sportMeta?.label}
                      price={fmt(field.price_day)}
                    />
                  ) : (
                    /* No coordinates — geocoding not set yet */
                    <div style={{ height: '100%', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <div style={{ fontSize: 40 }}>📍</div>
                      <p style={{ fontFamily: 'var(--font-h)', fontSize: 14, fontWeight: 700, color: 'var(--g700)' }}>Mapa no disponible</p>
                      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 240 }}>
                        El propietario aún no ha configurado las coordenadas.<br/>
                        Contactalo por teléfono para más info.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* ════════════════════════════════════════════
              RIGHT COLUMN — Booking card
          ════════════════════════════════════════════ */}
          <aside>
            <div className="booking-card">

              {/* Header — dark green matching home hero */}
              <div className="booking-card__header">
                <div aria-hidden style={{ position:'absolute',top:'-30%',right:'-20%',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(74,222,128,.10) 0%,transparent 65%)' }}/>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--g400)', animation: 'pulseDot 2s infinite', flexShrink: 0 }}/>
                    <span style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 700, letterSpacing: '.10em', color: '#86efac', textTransform: 'uppercase' }}>
                      Disponible para reservar
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, color: '#fff', fontStyle: 'italic', lineHeight: 1.1, marginBottom: 16 }}>
                    ¿Cuándo<br/>querés jugar?
                  </h2>
                  {/* Price summary */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', fontFamily: 'var(--font-h)', background: 'rgba(255,255,255,.08)', padding: '4px 10px', borderRadius: 999 }}>
                      🌞 {fmt(field.price_day)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', fontFamily: 'var(--font-h)', background: 'rgba(255,255,255,.08)', padding: '4px 10px', borderRadius: 999 }}>
                      🌙 {fmt(field.price_night)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="booking-card__body">

                {/* ── Calendar ─────────────────────────────────────────────── */}
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
                  <DatePicker value={selDate} onChange={handleDateChange}/>
                  {selDate && (
                    <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--g700)', fontFamily: 'var(--font-h)' }}>
                        📅 {dateDisplay}
                      </span>
                      <button type="button" onClick={() => { if (selHour && fieldId) releaseHold(fieldId, selDate, selHour); setSelDate(''); setSelHour('') }}
                        style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✕ Cambiar
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Hour slots ───────────────────────────────────────────── */}
                {selDate && (
                  <div style={{ animation: 'fadeUp .3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontFamily: 'var(--font-h)', fontSize: 12, fontWeight: 700, color: 'var(--ink)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Horarios
                      </p>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g500)', display: 'inline-block' }}/>
                          Libre
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e2e8e0', display: 'inline-block' }}/>
                          Ocupado
                        </span>
                      </div>
                    </div>

                    {loadingHours ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="skel" style={{ height: 52 }}/>
                        ))}
                      </div>
                    ) : sortedHours.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
                        No hay horarios configurados
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                        {sortedHours.map(h => {
                          const blocked  = bookedHours.includes(h)
                          const selected = selHour === h
                          const night    = isNightHour(h, field?.night_from_hour)
                          return (
                            <button key={h} type="button"
                              disabled={blocked}
                              onClick={() => handleHourSelect(h)}
                              className={`hour-btn${selected ? (night ? ' night-sel' : ' sel') : ''}`}
                              aria-label={`${h}${blocked ? ', ocupado' : ''}`}
                              aria-pressed={selected}
                            >
                              <span style={{ fontSize: 13 }}>{h}</span>
                              <span className="hour-tag" style={{
                                color: selected ? 'rgba(255,255,255,.75)' : blocked ? '#c9d3c8' : night ? '#7c3aed' : 'var(--g700)'
                              }}>
                                {blocked ? 'Ocupado' : night ? 'Noche' : 'Día'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Hold countdown ─────────────────────────────────────── */}
                {holdSecondsLeft !== null && selHour && (
                  <div style={{
                    marginTop: 12,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 12,
                    background: holdSecondsLeft <= 60
                      ? 'linear-gradient(135deg,#fef2f2,#fee2e2)'
                      : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                    border: `1px solid ${holdSecondsLeft <= 60 ? '#fecaca' : '#fde68a'}`,
                    animation: 'fadeUp .25s ease',
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {holdSecondsLeft <= 60 ? '⚠️' : '⏳'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 700,
                        letterSpacing: '.06em', textTransform: 'uppercase',
                        color: holdSecondsLeft <= 60 ? '#b91c1c' : '#92400e',
                        marginBottom: 1,
                      }}>
                        {holdSecondsLeft <= 60 ? 'Slot reservado por' : 'Reservado por'}
                      </p>
                      <p style={{
                        fontSize: 13, fontWeight: 700,
                        color: holdSecondsLeft <= 60 ? '#dc2626' : '#d97706',
                      }}>
                        {Math.floor(holdSecondsLeft / 60)}:{String(holdSecondsLeft % 60).padStart(2,'0')} min
                      </p>
                    </div>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: holdSecondsLeft <= 60 ? '#fecaca' : '#fde68a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke={holdSecondsLeft <= 60 ? '#b91c1c' : '#92400e'} strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                  </div>
                )}

                {/* ── Summary pill ─────────────────────────────────────────── */}
                {selDate && selHour && (
                  <div style={{
                    marginTop: 16, padding: '14px 16px', borderRadius: 14,
                    background: isNight
                      ? 'linear-gradient(135deg,#faf5ff,#ede9fe)'
                      : 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                    border: `1.5px solid ${isNight ? '#c4b5fd' : '#a7f3d0'}`,
                    animation: 'expandIn .2s ease',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: isNight ? '#5b21b6' : 'var(--g700)', marginBottom: 4 }}>
                          Tu reserva
                        </p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: isNight ? '#4c1d95' : 'var(--g800)' }}>
                          {dateDisplay} · {selHour}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: isNight ? '#7c3aed' : 'var(--g700)', marginTop: 2 }}>
                          {isNight ? '🌙 Tarifa nocturna' : '🌞 Tarifa diurna'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'var(--font-h)', fontSize: 22, fontWeight: 800, color: isNight ? '#4c1d95' : 'var(--g800)', lineHeight: 1 }}>
                          {fmt(price)}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>por hora</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CTA Button ───────────────────────────────────────────── */}
                <button className="reserve-btn" onClick={openModal} disabled={!selDate || !selHour}>
                  {!selDate
                    ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> Elegí una fecha</>
                    : !selHour
                    ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Elegí un horario</>
                    : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg> Reservar {fmt(price)}</>
                  }
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 10, fontWeight: 500 }}>
                  ✅ Sin cobro anticipado · Confirmación inmediata
                </p>

              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* ── BOOKING MODAL ───────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title"
          onClick={e => { if (e.target === e.currentTarget && status !== 'sending') setShowModal(false) }}>
          <div className="modal">

            {/* Success */}
            {status === 'success' ? (
              <div style={{ padding: '52px 32px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--g100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>🎉</div>
                <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 400, color: 'var(--ink)', fontStyle: 'italic', marginBottom: 10 }}>¡Reserva confirmada!</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>Te enviamos todos los detalles a <strong>{email}</strong>. ¡A jugar!</p>
              </div>
            ) : (
              <>
                {/* Modal header */}
                <div style={{ padding: '24px 24px 0', borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p id="modal-title" style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, color: 'var(--ink)', fontStyle: 'italic', marginBottom: 2 }}>
                        Confirmar reserva
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--muted)' }}>{field.name}</p>
                    </div>
                    <button onClick={() => setShowModal(false)} aria-label="Cerrar" disabled={status === 'sending'}
                      style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f1', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>

                {/* Booking summary */}
                <div style={{ margin: '16px 24px', padding: '16px 18px', borderRadius: 16, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #a7f3d0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { l: 'Fecha',  v: dateDisplay },
                      { l: 'Hora',   v: selHour },
                      { l: 'Tarifa', v: isNight ? '🌙 Nocturna' : '🌞 Diurna' },
                      { l: 'Total',  v: fmt(price) },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 700, color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>{l}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--g900)' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form */}
                <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Tus datos</p>

                  {/* Error */}
                  {status === 'error' && (
                    <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                      ⚠️ No se pudo completar la reserva. Intentá de nuevo.
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <input className={`modal-input${formErrors.name ? ' err' : ''}`}
                      placeholder="Nombre completo" value={name} autoComplete="name"
                      onChange={e => { setName(e.target.value); setFormErrors(p => ({...p, name:''})) }}/>
                    {formErrors.name && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3, fontWeight: 600 }}>⚠ {formErrors.name}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <input className={`modal-input${formErrors.phone ? ' err' : ''}`}
                      placeholder="Teléfono (ej: 8888-8888)" value={phone} type="tel" autoComplete="tel"
                      onChange={e => { setPhone(e.target.value); setFormErrors(p => ({...p, phone:''})) }}/>
                    {formErrors.phone && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3, fontWeight: 600 }}>⚠ {formErrors.phone}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <input className={`modal-input${formErrors.email ? ' err' : ''}`}
                      placeholder="Correo electrónico" value={email} type="email" autoComplete="email"
                      onChange={e => { setEmail(e.target.value); setFormErrors(p => ({...p, email:''})) }}/>
                    {formErrors.email && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3, fontWeight: 600 }}>⚠ {formErrors.email}</p>}
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleConfirm}
                    disabled={status === 'sending'}
                    style={{
                      width: '100%', padding: '15px', borderRadius: 14, marginTop: 4,
                      background: status === 'sending'
                        ? 'var(--g100)'
                        : 'linear-gradient(135deg,var(--g500),var(--g700))',
                      color: status === 'sending' ? 'var(--g700)' : '#fff',
                      fontWeight: 800, fontSize: 14, border: 'none',
                      fontFamily: 'var(--font-h)', letterSpacing: '.04em', textTransform: 'uppercase',
                      cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                      boxShadow: status === 'sending' ? 'none' : '0 4px 20px rgba(22,163,74,.32)',
                      transition: 'all .2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {status === 'sending'
                      ? <><Spinner/> Procesando…</>
                      : `Confirmar — ${fmt(price)}`
                    }
                  </button>

                  <button onClick={() => setShowModal(false)} disabled={status === 'sending'}
                    style={{ width: '100%', padding: 10, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13 }}>
                    Cancelar
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Reserva segura · Sin cobro anticipado</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
