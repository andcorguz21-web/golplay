/**
 * GolPlay — pages/reserve/index.tsx  (Dark edition v2 — fix fetch)
 *
 * Fix principal: query idéntica al home
 *  - fields: id, name, price_day, location, sport  (sin complex_name, sin image)
 *  - field_images: field_id, url, is_main           (tabla separada, igual que home)
 *  - router.isReady guard para leer URL params
 */

import {
  useEffect, useState, useMemo, useCallback
} from 'react'
import { useRouter } from 'next/router'
import Head          from 'next/head'
import Link          from 'next/link'
import Image         from 'next/image'
import { supabase }  from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type Field = {
  id: number
  name: string
  price_day: number
  location: string
  sport: string | null
  image: string | null
}

type Availability = {
  field_id: number
  date: string
  hour: string
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc'

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORTS = [
  { value: '',          emoji: '🏟️', label: 'Todos'    },
  { value: 'futbol5',   emoji: '⚽',  label: 'Fútbol 5' },
  { value: 'futbol7',   emoji: '⚽',  label: 'Fútbol 7' },
  { value: 'padel',     emoji: '🎾',  label: 'Pádel'    },
  { value: 'tenis',     emoji: '🎾',  label: 'Tenis'    },
  { value: 'multiuso',  emoji: '🏟️',  label: 'Multiuso' },
  { value: 'basquet',   emoji: '🏀',  label: 'Básquet'  },
]

const SPORT_META: Record<string, { label: string; color: string; bg: string }> = {
  futbol5:  { label: 'Fútbol 5',  color: '#4ade80', bg: 'rgba(22,163,74,.18)'  },
  futbol7:  { label: 'Fútbol 7',  color: '#86efac', bg: 'rgba(21,128,61,.18)'  },
  padel:    { label: 'Pádel',     color: '#67e8f9', bg: 'rgba(14,116,144,.18)' },
  tenis:    { label: 'Tenis',     color: '#fcd34d', bg: 'rgba(146,64,14,.20)'  },
  multiuso: { label: 'Multiuso',  color: '#c4b5fd', bg: 'rgba(91,33,182,.18)'  },
  basquet:  { label: 'Básquet',   color: '#fdba74', bg: 'rgba(154,52,18,.18)'  },
}

const HOUR_SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
]

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const PRICE_RANGES = [
  { label: 'Todos',          min: 0,      max: 999999 },
  { label: 'Hasta ₡10.000',  min: 0,      max: 10000  },
  { label: '₡10k – ₡20k',   min: 10000,  max: 20000  },
  { label: '₡20k – ₡30k',   min: 20000,  max: 30000  },
  { label: 'Más de ₡30k',   min: 30000,  max: 999999 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n > 0 ? `₡${n.toLocaleString('es-CR')}` : 'Consultar'
const dateToStr = (d: Date) => {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const strToDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const formatDateDisplay = (s: string) => {
  if (!s) return ''
  const d = strToDate(s)
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)}`
}
const todayStr = () => dateToStr(new Date())

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  :root {
    --bg:         #0C0D0B;
    --surface:    #141614;
    --surface2:   #1a1d19;
    --surface3:   #1f2320;
    --bd:         rgba(255,255,255,.07);
    --bd2:        rgba(255,255,255,.12);
    --bd3:        rgba(255,255,255,.16);
    --g5:         #22c55e;
    --g4:         #4ade80;
    --g7:         #15803d;
    --g8:         #0B4D2C;
    --glow:       rgba(34,197,94,.18);
    --text:       #f0f4f0;
    --muted:      #8a9488;
    --muted2:     #5e6660;
    --r-xl:       22px;
    --r-lg:       16px;
    --r-md:       12px;
    --sh-card:    0 2px 12px rgba(0,0,0,.4), 0 8px 28px rgba(0,0,0,.35);
    --sh-lg:      0 8px 40px rgba(0,0,0,.55), 0 24px 56px rgba(0,0,0,.4);
    --font-h:     'Kanit', sans-serif;
    --font-b:     'DM Sans', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: var(--font-b);
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::selection { background: var(--g5); color: #0a1a10; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes expandIn { from{opacity:0;transform:scale(.96) translateY(-6px)} to{opacity:1;transform:none} }
  @keyframes slideUp  { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* Nav */
  .nav {
    position:fixed; top:0; left:0; right:0; z-index:90;
    height:64px; padding:0 32px;
    display:flex; align-items:center; justify-content:space-between;
    background:rgba(12,13,11,.92);
    backdrop-filter:blur(20px) saturate(1.6);
    border-bottom:1px solid var(--bd);
  }
  .nav__logo  { display:flex; align-items:center; height:30px; }
  .nav__links { display:flex; align-items:center; gap:6px; }
  .nav__link  {
    padding:8px 14px; border-radius:var(--r-md);
    font-size:13.5px; font-weight:500; color:var(--muted);
    text-decoration:none; transition:all .15s;
  }
  .nav__link:hover { background:rgba(255,255,255,.05); color:var(--text); }
  .nav__cta {
    padding:9px 20px; border-radius:var(--r-md);
    font-size:13.5px; font-weight:700; font-family:var(--font-h); letter-spacing:.03em;
    background:var(--g5); color:#0a1a10; text-decoration:none;
    box-shadow:0 2px 14px rgba(34,197,94,.3); transition:all .15s;
  }
  .nav__cta:hover { background:var(--g4); }

  /* Filter bar */
  .filter-bar {
    position:sticky; top:64px; z-index:70;
    background:rgba(12,13,11,.96); backdrop-filter:blur(20px);
    border-bottom:1px solid var(--bd); padding:14px 32px;
  }
  .filter-inner {
    max-width:1280px; margin:0 auto;
    display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  }

  /* Pill */
  .fpill {
    display:inline-flex; align-items:center; gap:6px;
    padding:9px 16px; border-radius:999px;
    border:1.5px solid var(--bd2); background:var(--surface2);
    color:var(--text); font-size:13px; font-weight:600;
    font-family:var(--font-b); cursor:pointer; transition:all .15s; white-space:nowrap;
  }
  .fpill:hover  { border-color:var(--g5); background:var(--glow); color:var(--g4); }
  .fpill.active { border-color:var(--g5); background:var(--g5); color:#0a1a10; box-shadow:0 2px 12px rgba(34,197,94,.3); }

  /* Sort */
  .sort-select {
    padding:9px 30px 9px 14px; border-radius:999px;
    border:1.5px solid var(--bd2); background:var(--surface2);
    font-size:13px; font-weight:600; font-family:var(--font-b);
    color:var(--text); cursor:pointer; outline:none;
    appearance:none; -webkit-appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238a9488' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center; transition:border-color .15s;
  }
  .sort-select:hover, .sort-select:focus { border-color:var(--g5); }
  .sort-select option { background:#1a1d19; }

  /* Popover */
  .popover {
    position:absolute; z-index:200;
    background:var(--surface2); border-radius:var(--r-xl);
    box-shadow:var(--sh-lg); border:1px solid var(--bd2);
    animation:expandIn .18s ease; overflow:hidden; min-width:240px;
  }

  /* Calendar */
  .cal-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 18px 10px;
    font-family:var(--font-h); font-size:14px; font-weight:700; color:var(--text);
  }
  .cal-nav {
    width:28px; height:28px; border-radius:8px;
    border:1.5px solid var(--bd2); background:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; color:var(--muted); transition:all .12s;
  }
  .cal-nav:hover { border-color:var(--g5); color:var(--g5); background:var(--glow); }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; padding:0 12px 14px; }
  .cal-dow  { text-align:center; font-size:10px; font-weight:700; color:var(--muted); padding:4px 0 6px; font-family:var(--font-h); letter-spacing:.06em; }
  .cal-day  {
    aspect-ratio:1; display:flex; align-items:center; justify-content:center;
    border-radius:9px; font-size:12.5px; font-weight:500; cursor:pointer;
    border:none; background:none; transition:all .12s; font-family:var(--font-b); color:var(--text);
  }
  .cal-day:hover:not(:disabled) { background:var(--glow); color:var(--g4); font-weight:600; }
  .cal-day.today  { font-weight:800; color:var(--g5); }
  .cal-day.sel    { background:var(--g5)!important; color:#0a1a10!important; font-weight:700; }
  .cal-day.out    { color:var(--muted2); }
  .cal-day:disabled { color:var(--muted2); cursor:default; opacity:.4; }

  /* Hour grid */
  .hour-grid {
    display:grid; grid-template-columns:repeat(4,1fr); gap:6px;
    padding:12px 14px 14px; max-height:220px; overflow-y:auto;
  }
  .hour-chip {
    padding:8px 4px; border-radius:9px; border:1.5px solid var(--bd2);
    background:none; cursor:pointer; font-family:var(--font-b);
    font-size:12px; font-weight:600; color:var(--muted); transition:all .12s; text-align:center;
  }
  .hour-chip:hover { border-color:var(--g5); background:var(--glow); color:var(--g4); }
  .hour-chip.sel   { border-color:var(--g5); background:var(--g5); color:#0a1a10; }

  /* Field card */
  .field-card {
    background:var(--surface); border:1px solid var(--bd2); border-radius:var(--r-xl);
    overflow:hidden; cursor:pointer; outline:none;
    transition:transform .24s cubic-bezier(.16,1,.3,1), box-shadow .24s, border-color .24s;
    display:flex; flex-direction:column;
    animation:fadeUp .4s ease both; box-shadow:var(--sh-card);
  }
  .field-card:hover { transform:translateY(-5px); box-shadow:var(--sh-lg); border-color:rgba(74,222,128,.25); }
  .field-card:focus-visible { outline:2px solid var(--g5); outline-offset:3px; }

  /* Avail chip */
  .avail-chip {
    display:inline-flex; align-items:center;
    padding:4px 9px; border-radius:999px;
    border:1px solid rgba(74,222,128,.2); background:rgba(34,197,94,.08); color:var(--g4);
    font-size:11px; font-weight:700; font-family:var(--font-h); letter-spacing:.03em;
    white-space:nowrap; flex-shrink:0; transition:all .12s; cursor:pointer;
  }
  .avail-chip:hover { background:var(--g5); color:#0a1a10; border-color:var(--g5); }

  /* Skeleton */
  .skel {
    background:linear-gradient(90deg,#1a1d19 25%,#232622 50%,#1a1d19 75%);
    background-size:400% 100%; animation:shimmer 1.5s infinite; border-radius:8px;
  }

  /* Grid */
  .results-grid {
    display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr));
    gap:20px; align-items:start;
  }

  /* Drawer */
  .drawer-overlay {
    position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.72);
    backdrop-filter:blur(6px); animation:overlayIn .2s ease;
  }
  .drawer {
    position:fixed; bottom:0; left:0; right:0; z-index:201;
    background:var(--surface2); border-radius:24px 24px 0 0; padding:0 0 32px;
    box-shadow:0 -12px 50px rgba(0,0,0,.6);
    animation:slideUp .3s cubic-bezier(.16,1,.3,1);
    max-height:88vh; overflow-y:auto; border-top:1px solid var(--bd2);
  }
  .drawer-handle { width:36px; height:4px; background:rgba(255,255,255,.15); border-radius:2px; margin:12px auto 0; }
  .backdrop { position:fixed; inset:0; z-index:100; }

  /* Filter tags */
  .filter-tag {
    display:inline-flex; align-items:center; gap:6px;
    padding:5px 12px 5px 10px; border-radius:999px;
    background:var(--surface3); color:var(--text);
    font-size:12px; font-weight:600; font-family:var(--font-b); border:1px solid var(--bd2);
  }
  .filter-tag-x {
    background:none; border:none; cursor:pointer; color:var(--muted);
    font-size:11px; padding:0; margin-left:2px; line-height:1; transition:color .12s;
  }
  .filter-tag-x:hover { color:#ef4444; }

  /* State boxes */
  .state-box { text-align:center; padding:80px 20px; background:var(--surface); border-radius:var(--r-xl); border:1px solid var(--bd2); }

  /* Filter panel label */
  .fp-label {
    font-family:var(--font-h); font-size:11px; font-weight:700;
    letter-spacing:.10em; color:var(--muted); text-transform:uppercase; margin-bottom:10px;
  }

  @media (max-width:768px) {
    .nav { padding:0 16px; }
    .nav__links { display:none; }
    .filter-bar { padding:12px 16px; }
    .desktop-pills { display:none!important; }
    .mobile-filter-btn { display:inline-flex!important; }
    .main-pad { padding:24px 16px 60px!important; }
  }
  @media (min-width:769px) { .mobile-filter-btn { display:none!important; } }
`

// ─── Calendar ─────────────────────────────────────────────────────────────────
function Calendar({ value, onChange, onClose }: {
  value: string; onChange: (v: string) => void; onClose: () => void
}) {
  const today = new Date()
  const init  = value ? strToDate(value) : today
  const [viewYear,  setViewYear]  = useState(init.getFullYear())
  const [viewMonth, setViewMonth] = useState(init.getMonth())

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayS      = todayStr()

  const prevMonth = () => viewMonth === 0
    ? (setViewYear(y => y - 1), setViewMonth(11))
    : setViewMonth(m => m - 1)
  const nextMonth = () => viewMonth === 11
    ? (setViewYear(y => y + 1), setViewMonth(0))
    : setViewMonth(m => m + 1)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={prevMonth}>‹</button>
        <span>{MONTHS_ES[viewMonth]} {viewYear}</span>
        <button type="button" className="cal-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="cal-grid">
        {DAYS_ES.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds   = dateToStr(new Date(viewYear, viewMonth, day))
          const past = ds < todayS
          const cls  = ['cal-day', ds === value ? 'sel' : '', ds === todayS ? 'today' : ''].filter(Boolean).join(' ')
          return (
            <button key={i} type="button" className={cls} disabled={past}
              onClick={() => { onChange(ds); onClose() }}>
              {day}
            </button>
          )
        })}
      </div>
      {value && (
        <div style={{ padding: '0 14px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{formatDateDisplay(value)}</span>
          <button type="button" onClick={() => { onChange(''); onClose() }}
            style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Limpiar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Hour Picker ──────────────────────────────────────────────────────────────
function HourPicker({ value, onChange, onClose }: {
  value: string; onChange: (v: string) => void; onClose: () => void
}) {
  return (
    <div>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Horario</p>
        {value && (
          <button type="button" onClick={() => { onChange(''); onClose() }}
            style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Limpiar
          </button>
        )}
      </div>
      <div className="hour-grid">
        {HOUR_SLOTS.map(h => (
          <button key={h} type="button" className={`hour-chip${value === h ? ' sel' : ''}`}
            onClick={() => { onChange(h); onClose() }}>{h}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Field Card ───────────────────────────────────────────────────────────────
function FieldCard({ field, availableHours, queryHour, queryDate, index }: {
  field: Field; availableHours: string[]; queryHour: string; queryDate: string; index: number
}) {
  const router = useRouter()
  const sport   = field.sport ? SPORT_META[field.sport] : null
  const isAvail = queryHour ? availableHours.includes(queryHour) : availableHours.length > 0
  const displayHours = availableHours.slice(0, 4)

  const goToReserve = (hour?: string) => {
    const q: Record<string, string> = {}
    if (queryDate)         q.date = queryDate
    if (hour || queryHour) q.hour = hour || queryHour
    router.push({ pathname: `/reserve/${field.id}`, query: q })
  }

  return (
    <article
      className="field-card" tabIndex={0}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => goToReserve()}
      onKeyDown={e => e.key === 'Enter' && goToReserve()}
      aria-label={`Ver cancha ${field.name}`}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 196, background: 'linear-gradient(135deg,#0a1a10,#071210)', overflow: 'hidden', flexShrink: 0 }}>
        {field.image
          ? <Image src={field.image} alt={field.name} fill sizes="400px"
              style={{ objectFit: 'cover', transition: 'transform .5s ease', opacity: .9 }} loading="lazy" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, opacity: .12 }}>⚽</div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.1) 55%, transparent 100%)' }} />

        {sport && (
          <span style={{
            position: 'absolute', top: 12, left: 12,
            background: sport.bg, color: sport.color,
            fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
            fontFamily: 'var(--font-h)', letterSpacing: '.06em', textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}>
            {sport.label}
          </span>
        )}

        <span style={{
          position: 'absolute', top: 12, right: 12,
          background: isAvail ? 'rgba(34,197,94,.22)' : 'rgba(239,68,68,.18)',
          backdropFilter: 'blur(10px)',
          color: isAvail ? '#4ade80' : '#fca5a5',
          border: `1px solid ${isAvail ? 'rgba(74,222,128,.3)' : 'rgba(239,68,68,.3)'}`,
          fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999,
          fontFamily: 'var(--font-h)', letterSpacing: '.06em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isAvail ? '#4ade80' : '#f87171', display: 'inline-block', animation: isAvail ? 'pulse 1.4s infinite' : 'none' }} />
          {isAvail ? 'Disponible' : 'Ocupada'}
        </span>

        <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-h)', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(10px)', padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,.12)' }}>
            {fmt(field.price_day)}<span style={{ fontSize: 11, fontWeight: 500, opacity: .7 }}>/hr</span>
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontFamily: 'var(--font-h)', fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '.01em', marginBottom: 6 }}>
          {field.name}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{field.location}</p>
        </div>

        {availableHours.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'var(--font-h)', marginBottom: 6 }}>
              Horarios libres
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {displayHours.map(h => (
                <span key={h} className="avail-chip"
                  onClick={e => { e.stopPropagation(); goToReserve(h) }}>
                  {h}
                </span>
              ))}
              {availableHours.length > 4 && (
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, padding: '4px 6px', alignSelf: 'center' }}>
                  +{availableHours.length - 4} más
                </span>
              )}
            </div>
          </div>
        )}

        {availableHours.length === 0 && queryDate && (
          <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,.18)' }}>
            <p style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>Sin disponibilidad para esta fecha</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button
            onClick={e => { e.stopPropagation(); goToReserve() }}
            style={{ flex: 1, padding: '10px 16px', borderRadius: 12, background: 'var(--surface3)', color: 'var(--text)', border: '1px solid var(--bd3)', cursor: 'pointer', fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 700, letterSpacing: '.03em', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.borderColor = 'var(--bd3)' }}
          >
            Ver cancha →
          </button>
          {isAvail && (
            <button
              onClick={e => { e.stopPropagation(); goToReserve(displayHours[0] || queryHour) }}
              style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--g5)', color: '#0a1a10', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 800, letterSpacing: '.03em', transition: 'all .15s', whiteSpace: 'nowrap', boxShadow: '0 2px 14px rgba(34,197,94,.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--g4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--g5)' }}
            >
              Reservar
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--bd2)' }}>
      <div className="skel" style={{ height: 196 }} />
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skel" style={{ height: 16, width: '70%' }} />
        <div className="skel" style={{ height: 12, width: '45%' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 24, width: 52, borderRadius: 999 }} />)}
        </div>
        <div className="skel" style={{ height: 38, borderRadius: 12, marginTop: 8 }} />
      </div>
    </div>
  )
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ filterSport, setFilterSport, filterDate, setFilterDate, filterHour, setFilterHour,
  filterPrice, setFilterPrice, filterLoc, setFilterLoc, locations, onApply }: any) {
  const [showCal,  setShowCal]  = useState(false)
  const [showHour, setShowHour] = useState(false)

  const pill = (active: boolean) => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 5,
    padding: '7px 13px', borderRadius: 999,
    border: `1.5px solid ${active ? 'var(--g5)' : 'var(--bd2)'}`,
    background: active ? 'var(--g5)' : 'var(--surface3)',
    color: active ? '#0a1a10' : 'var(--muted)',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-b)' as const, transition: 'all .12s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p className="fp-label">Deporte</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SPORTS.map(s => (
            <button key={s.value} type="button" style={pill(filterSport === s.value)}
              onClick={() => setFilterSport(s.value === filterSport ? '' : s.value)}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {locations.length > 1 && (
        <div>
          <p className="fp-label">Ubicación</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" style={pill(!filterLoc)} onClick={() => setFilterLoc('')}>Todas</button>
            {locations.map((loc: string) => (
              <button key={loc} type="button" style={pill(filterLoc === loc)}
                onClick={() => setFilterLoc(loc === filterLoc ? '' : loc)}>
                📍 {loc}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <p className="fp-label">Fecha</p>
        <button type="button"
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${filterDate ? 'var(--g5)' : 'var(--bd2)'}`, background: filterDate ? 'var(--glow)' : 'var(--surface3)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-b)', color: filterDate ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', textAlign: 'left' }}
          onClick={() => { setShowCal(v => !v); setShowHour(false) }}>
          <span>📅</span>
          <span>{filterDate ? formatDateDisplay(filterDate) : 'Elegí una fecha'}</span>
        </button>
        {showCal && (
          <>
            <div className="backdrop" onClick={() => setShowCal(false)} />
            <div className="popover" style={{ top: 'calc(100% + 8px)', left: 0, right: 0 }}>
              <Calendar value={filterDate} onChange={setFilterDate} onClose={() => setShowCal(false)} />
            </div>
          </>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <p className="fp-label">Hora</p>
        <button type="button"
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${filterHour ? 'var(--g5)' : 'var(--bd2)'}`, background: filterHour ? 'var(--glow)' : 'var(--surface3)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-b)', color: filterHour ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', textAlign: 'left' }}
          onClick={() => { setShowHour(v => !v); setShowCal(false) }}>
          <span>🕐</span>
          <span>{filterHour || 'Cualquier hora'}</span>
        </button>
        {showHour && (
          <>
            <div className="backdrop" onClick={() => setShowHour(false)} />
            <div className="popover" style={{ top: 'calc(100% + 8px)', left: 0, right: 0 }}>
              <HourPicker value={filterHour} onChange={setFilterHour} onClose={() => setShowHour(false)} />
            </div>
          </>
        )}
      </div>

      <div>
        <p className="fp-label">Precio por hora</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRICE_RANGES.map((pr, i) => (
            <button key={i} type="button" style={pill(filterPrice === i)}
              onClick={() => setFilterPrice(i === filterPrice ? 0 : i)}>
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {onApply && (
        <button type="button" onClick={onApply} style={{ padding: '13px', borderRadius: 14, background: 'var(--g5)', color: '#0a1a10', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-h)', fontSize: 14, fontWeight: 800, letterSpacing: '.04em', boxShadow: '0 3px 20px rgba(34,197,94,.35)' }}>
          Aplicar filtros
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReserveIndex() {
  const router = useRouter()

  const [fields,       setFields]    = useState<Field[]>([])
  const [availability, setAvail]     = useState<Availability[]>([])
  const [loading,      setLoading]   = useState(true)
  const [loadError,    setLoadError] = useState(false)
  const [loadingAvail, setLdAvail]   = useState(false)

  const [filterSport, setFilterSport] = useState('')
  const [filterDate,  setFilterDate]  = useState('')
  const [filterHour,  setFilterHour]  = useState('')
  const [filterPrice, setFilterPrice] = useState(0)
  const [filterLoc,   setFilterLoc]   = useState('')
  const [sortBy,      setSortBy]      = useState<SortOption>('relevance')
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  const [showSportPop, setShowSportPop] = useState(false)
  const [showDatePop,  setShowDatePop]  = useState(false)
  const [showHourPop,  setShowHourPop]  = useState(false)
  const [showPricePop, setShowPricePop] = useState(false)
  const [showLocPop,   setShowLocPop]   = useState(false)
  const closeAll = () => { setShowSportPop(false); setShowDatePop(false); setShowHourPop(false); setShowPricePop(false); setShowLocPop(false) }

  // ── Init desde URL — esperar router.isReady ──
  useEffect(() => {
    if (!router.isReady) return
    const { sport, date, hour, loc, price, sort } = router.query as Record<string, string>
    if (sport) setFilterSport(sport)
    if (date)  setFilterDate(date)
    if (hour)  setFilterHour(hour)
    if (loc)   setFilterLoc(loc)
    if (price) setFilterPrice(Number(price))
    if (sort)  setSortBy((sort as SortOption) || 'relevance')
  }, [router.isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL sync ──
  const syncURL = useCallback((extra: Record<string, string> = {}) => {
    const q: Record<string, string> = {}
    if (filterSport)          q.sport = filterSport
    if (filterDate)           q.date  = filterDate
    if (filterHour)           q.hour  = filterHour
    if (filterLoc)            q.loc   = filterLoc
    if (filterPrice)          q.price = String(filterPrice)
    if (sortBy !== 'relevance') q.sort = sortBy
    Object.assign(q, extra)
    router.replace({ pathname: '/reserve', query: q }, undefined, { shallow: true })
  }, [filterSport, filterDate, filterHour, filterLoc, filterPrice, sortBy, router])

  // ── Fetch fields — IDÉNTICO AL HOME ──
  useEffect(() => {
    ;(async () => {
      setLoading(true); setLoadError(false)
      try {
        const [{ data: fieldsData, error }, { data: images }] = await Promise.all([
          supabase
            .from('fields')
            .select('id, name, price_day, location, sport')
            .eq('active', true)
            .order('name'),
          supabase
            .from('field_images')
            .select('field_id, url, is_main'),
        ])
        if (error || !fieldsData) throw error

        const map = new Map<number, Field>()
        fieldsData.forEach(f => map.set(f.id, {
          id:        f.id,
          name:      f.name,
          price_day: Number(f.price_day ?? 0),
          location:  f.location ?? 'Sin ubicación',
          sport:     f.sport ?? null,
          image:     null,
        }))
        images?.forEach(img => {
          const f = map.get(img.field_id)
          if (!f || !img.url) return
          if (img.is_main || f.image === null) f.image = img.url
        })

        setFields([...map.values()])
      } catch { setLoadError(true) }
      finally  { setLoading(false) }
    })()
  }, [])

  // ── Fetch availability cuando cambia la fecha ──
  useEffect(() => {
    if (!filterDate) { setAvail([]); return }
    ;(async () => {
      setLdAvail(true)
      try {
        const { data } = await supabase
          .from('availability')
          .select('field_id, date, hour')
          .eq('date', filterDate)
          .eq('available', true)
        setAvail(data || [])
      } catch {}
      finally { setLdAvail(false) }
    })()
  }, [filterDate])

  // ── Derived ──
  const locations = useMemo(() =>
    [...new Set(fields.map(f => f.location).filter(Boolean))], [fields])

  const availByField = useMemo(() => {
    const map = new Map<number, string[]>()
    availability.forEach(a => {
      if (!map.has(a.field_id)) map.set(a.field_id, [])
      map.get(a.field_id)!.push(a.hour)
    })
    return map
  }, [availability])

  const filtered = useMemo(() => {
    let list = fields.filter(f => {
      if (filterSport && f.sport !== filterSport) return false
      if (filterLoc   && f.location !== filterLoc) return false
      const pr = PRICE_RANGES[filterPrice]
      if (pr && filterPrice > 0 && (f.price_day < pr.min || f.price_day > pr.max)) return false
      if (filterDate && filterHour && !(availByField.get(f.id) || []).includes(filterHour)) return false
      return true
    })
    if (sortBy === 'price_asc')  list = [...list].sort((a, b) => a.price_day - b.price_day)
    if (sortBy === 'price_desc') list = [...list].sort((a, b) => b.price_day - a.price_day)
    return list
  }, [fields, filterSport, filterLoc, filterPrice, filterDate, filterHour, sortBy, availByField])

  const activeCount = [filterSport, filterDate, filterHour, filterLoc, filterPrice > 0 ? '1' : ''].filter(Boolean).length
  const clearAll = () => {
    setFilterSport(''); setFilterDate(''); setFilterHour('')
    setFilterLoc(''); setFilterPrice(0); setSortBy('relevance')
    router.replace('/reserve', undefined, { shallow: true })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <Head>
        <title>Canchas disponibles — GolPlay</title>
        <meta name="description" content="Encontrá y reservá canchas deportivas cerca de vos." />
      </Head>

      {/* Nav */}
      <nav className="nav">
        <Link href="/" className="nav__logo">
          <Image src="/logo-golplay.svg" alt="GolPlay" width={120} height={85} style={{ objectFit: 'contain' }} />
        </Link>
        <div className="nav__links">
          <Link href="/reserve" className="nav__link" style={{ color: 'var(--g4)', fontWeight: 700 }}>Canchas</Link>
          <Link href="/join"    className="nav__link">Publicá tu cancha</Link>
          <Link href="/about"   className="nav__link">Nosotros</Link>
        </div>
        <Link href="/join" className="nav__cta">Publicá tu cancha</Link>
      </nav>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-inner">

          {/* Desktop pills */}
          <div className="desktop-pills" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

            {/* Sport */}
            <div style={{ position: 'relative' }}>
              <button type="button" className={`fpill ${filterSport ? 'active' : ''}`}
                onClick={() => { closeAll(); setShowSportPop(v => !v) }}>
                ⚽ {filterSport ? SPORT_META[filterSport]?.label : 'Deporte'} <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {showSportPop && (
                <>
                  <div className="backdrop" onClick={closeAll} />
                  <div className="popover" style={{ top: 'calc(100% + 8px)', left: 0, minWidth: 260 }}>
                    <div style={{ padding: '14px 16px' }}>
                      <p className="fp-label" style={{ marginBottom: 10 }}>Deporte</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                        {SPORTS.map(s => (
                          <button key={s.value} type="button"
                            style={{ padding: '8px 12px', borderRadius: 10, textAlign: 'left', border: `1.5px solid ${filterSport === s.value ? 'var(--g5)' : 'var(--bd2)'}`, background: filterSport === s.value ? 'var(--glow)' : 'var(--surface3)', color: filterSport === s.value ? 'var(--g4)' : 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-b)', transition: 'all .12s' }}
                            onClick={() => { const v = s.value === filterSport ? '' : s.value; setFilterSport(v); closeAll(); syncURL({ sport: v }) }}>
                            {s.emoji} {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Date */}
            <div style={{ position: 'relative' }}>
              <button type="button" className={`fpill ${filterDate ? 'active' : ''}`}
                onClick={() => { closeAll(); setShowDatePop(v => !v) }}>
                📅 {filterDate ? formatDateDisplay(filterDate) : 'Fecha'} <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {showDatePop && (
                <>
                  <div className="backdrop" onClick={closeAll} />
                  <div className="popover" style={{ top: 'calc(100% + 8px)', left: 0 }}>
                    <Calendar value={filterDate} onChange={v => { setFilterDate(v); syncURL({ date: v }); closeAll() }} onClose={closeAll} />
                  </div>
                </>
              )}
            </div>

            {/* Hour */}
            <div style={{ position: 'relative' }}>
              <button type="button" className={`fpill ${filterHour ? 'active' : ''}`}
                onClick={() => { closeAll(); setShowHourPop(v => !v) }}>
                🕐 {filterHour || 'Hora'} <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {showHourPop && (
                <>
                  <div className="backdrop" onClick={closeAll} />
                  <div className="popover" style={{ top: 'calc(100% + 8px)', left: 0 }}>
                    <HourPicker value={filterHour} onChange={v => { setFilterHour(v); syncURL({ hour: v }); closeAll() }} onClose={closeAll} />
                  </div>
                </>
              )}
            </div>

            {/* Price */}
            <div style={{ position: 'relative' }}>
              <button type="button" className={`fpill ${filterPrice > 0 ? 'active' : ''}`}
                onClick={() => { closeAll(); setShowPricePop(v => !v) }}>
                💰 {filterPrice > 0 ? PRICE_RANGES[filterPrice].label : 'Precio'} <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {showPricePop && (
                <>
                  <div className="backdrop" onClick={closeAll} />
                  <div className="popover" style={{ top: 'calc(100% + 8px)', left: 0, minWidth: 210 }}>
                    <div style={{ padding: '14px 16px' }}>
                      <p className="fp-label" style={{ marginBottom: 8 }}>Precio por hora</p>
                      {PRICE_RANGES.map((pr, i) => (
                        <button key={i} type="button"
                          style={{ display: 'block', width: '100%', padding: '9px 12px', borderRadius: 10, textAlign: 'left', border: `1.5px solid ${filterPrice === i ? 'var(--g5)' : 'transparent'}`, background: filterPrice === i ? 'var(--glow)' : 'transparent', color: filterPrice === i ? 'var(--g4)' : 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-b)', transition: 'all .12s', marginBottom: 2 }}
                          onClick={() => { setFilterPrice(i === filterPrice ? 0 : i); closeAll(); syncURL() }}>
                          {pr.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Location */}
            {locations.length > 1 && (
              <div style={{ position: 'relative' }}>
                <button type="button" className={`fpill ${filterLoc ? 'active' : ''}`}
                  onClick={() => { closeAll(); setShowLocPop(v => !v) }}>
                  📍 {filterLoc || 'Zona'} <span style={{ fontSize: 9 }}>▾</span>
                </button>
                {showLocPop && (
                  <>
                    <div className="backdrop" onClick={closeAll} />
                    <div className="popover" style={{ top: 'calc(100% + 8px)', left: 0, minWidth: 200 }}>
                      <div style={{ padding: '14px 16px' }}>
                        <p className="fp-label" style={{ marginBottom: 8 }}>Zona</p>
                        {['', ...locations].map((loc, i) => {
                          const active = loc === '' ? !filterLoc : filterLoc === loc
                          return (
                            <button key={i} type="button"
                              style={{ display: 'block', width: '100%', padding: '9px 12px', borderRadius: 10, textAlign: 'left', border: `1.5px solid ${active ? 'var(--g5)' : 'transparent'}`, background: active ? 'var(--glow)' : 'transparent', color: active ? 'var(--g4)' : 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-b)', transition: 'all .12s', marginBottom: 2 }}
                              onClick={() => { setFilterLoc(loc); closeAll(); syncURL({ loc }) }}>
                              {loc || 'Todas las zonas'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile: botón filtros */}
          <button type="button" className="mobile-filter-btn"
            style={{ position: 'relative', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, border: '1.5px solid var(--bd2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-b)', cursor: 'pointer' }}
            onClick={() => setDrawerOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filtros
            {activeCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--g5)', color: '#0a1a10', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <div style={{ marginLeft: 'auto' }}>
            <select className="sort-select" value={sortBy}
              onChange={e => { setSortBy(e.target.value as SortOption); syncURL({ sort: e.target.value }) }}>
              <option value="relevance">Más relevantes</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
          </div>
        </div>

        {/* Active filter tags */}
        {activeCount > 0 && (
          <div style={{ maxWidth: 1280, margin: '10px auto 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filterSport && <span className="filter-tag">⚽ {SPORT_META[filterSport]?.label}<button className="filter-tag-x" onClick={() => { setFilterSport(''); syncURL({ sport: '' }) }}>✕</button></span>}
            {filterLoc   && <span className="filter-tag">📍 {filterLoc}<button className="filter-tag-x" onClick={() => { setFilterLoc(''); syncURL({ loc: '' }) }}>✕</button></span>}
            {filterDate  && <span className="filter-tag">📅 {formatDateDisplay(filterDate)}<button className="filter-tag-x" onClick={() => { setFilterDate(''); setAvail([]); syncURL({ date: '' }) }}>✕</button></span>}
            {filterHour  && <span className="filter-tag">🕐 {filterHour}<button className="filter-tag-x" onClick={() => { setFilterHour(''); syncURL({ hour: '' }) }}>✕</button></span>}
            {filterPrice > 0 && <span className="filter-tag">💰 {PRICE_RANGES[filterPrice].label}<button className="filter-tag-x" onClick={() => { setFilterPrice(0); syncURL() }}>✕</button></span>}
          </div>
        )}
      </div>

      {/* Main */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 80px' }} className="main-pad">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1.1 }}>
              {loading ? 'Cargando canchas…' : (
                filtered.length > 0
                  ? <><span style={{ color: 'var(--g4)' }}>{filtered.length}</span> canchas disponibles</>
                  : 'Sin resultados'
              )}
            </h1>
            {!loading && (filterDate || filterSport || filterLoc) && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {[filterSport && SPORT_META[filterSport]?.label, filterLoc, filterDate && formatDateDisplay(filterDate)].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {loadingAvail && filterDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--glow)', borderRadius: 999, border: '1px solid rgba(74,222,128,.2)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g5)', animation: 'pulse 1s infinite' }} />
              <p style={{ fontSize: 12, color: 'var(--g4)', fontWeight: 700 }}>Actualizando disponibilidad…</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="results-grid">{[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}</div>
        )}

        {!loading && loadError && (
          <div className="state-box">
            <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No pudimos cargar las canchas</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Verificá tu conexión e intentá de nuevo.</p>
            <button onClick={() => window.location.reload()}
              style={{ padding: '11px 28px', background: 'var(--g5)', color: '#0a1a10', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 13 }}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <div className="state-box">
            <div style={{ fontSize: 60, marginBottom: 16 }}>🏟️</div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 10, letterSpacing: '-.02em' }}>
              No encontramos canchas disponibles
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.7 }}>
              {activeCount > 0 ? 'No hay canchas con estos filtros. Probá ampliar la búsqueda.' : 'Aún no hay canchas publicadas en la plataforma.'}
            </p>
            {activeCount > 0 && (
              <button onClick={clearAll}
                style={{ padding: '12px 28px', background: 'var(--g5)', color: '#0a1a10', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 14, letterSpacing: '.03em', boxShadow: '0 3px 20px rgba(34,197,94,.3)' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {!loading && !loadError && filtered.length > 0 && (
          <div className="results-grid">
            {filtered.map((field, i) => (
              <FieldCard key={field.id} field={field} index={i}
                availableHours={availByField.get(field.id) || []}
                queryHour={filterHour} queryDate={filterDate} />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
              <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Filtros</h2>
              <button onClick={() => setDrawerOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 999, border: '1.5px solid var(--bd2)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--muted)' }}>✕</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <FilterPanel
                filterSport={filterSport} setFilterSport={setFilterSport}
                filterDate={filterDate}   setFilterDate={setFilterDate}
                filterHour={filterHour}   setFilterHour={setFilterHour}
                filterPrice={filterPrice} setFilterPrice={setFilterPrice}
                filterLoc={filterLoc}     setFilterLoc={setFilterLoc}
                locations={locations}
                onApply={() => { setDrawerOpen(false); syncURL() }}
              />
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer style={{ background: '#0a0b09', borderTop: '1px solid var(--bd)', padding: '48px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 32 }}>
          <div>
            <Image src="/logo-golplay.svg" alt="GolPlay" width={120} height={50} style={{ objectFit: 'contain', marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>La plataforma de reservas para complejos deportivos en LATAM.</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Información</p>
            {[{ href: '/about', label: 'Sobre GolPlay' }, { href: '/join', label: 'Publicá tu cancha' }, { href: '/terms', label: 'Términos' }, { href: '/privacy', label: 'Privacidad' }].map(({ href, label }) => (
              <Link key={href} href={href} style={{ display: 'block', fontSize: 13, color: 'var(--muted)', textDecoration: 'none', marginBottom: 8 }}>{label}</Link>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Contacto</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>soporte@golplay.com</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Costa Rica</p>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: '24px auto 0', paddingTop: 20, borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--muted2)' }}>© {new Date().getFullYear()} GolPlay. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  )
}
