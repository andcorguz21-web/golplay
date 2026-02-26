/**
 * GolPlay — pages/reserve/index.tsx
 * Field Explorer — Airbnb/Playtomic quality
 *
 * Architecture:
 *  - Sticky filter bar (desktop) / modal drawer (mobile)
 *  - Masonry-inspired grid of field cards
 *  - Real availability from Supabase
 *  - URL-state for shareable filtered searches
 *  - Skeleton → results → empty → error states
 */

import {
  useEffect, useState, useMemo, useRef, useCallback, Fragment
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
  complex_name: string | null
  price_day: number
  location: string
  sport: string | null
  image: string | null
  active: boolean
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

const SPORT_META: Record<string, { label:string; color:string; bg:string }> = {
  futbol5:  { label:'Fútbol 5',  color:'#16a34a', bg:'#dcfce7' },
  futbol7:  { label:'Fútbol 7',  color:'#15803d', bg:'#bbf7d0' },
  padel:    { label:'Pádel',     color:'#0e7490', bg:'#cffafe' },
  tenis:    { label:'Tenis',     color:'#92400e', bg:'#fef3c7' },
  multiuso: { label:'Multiuso',  color:'#5b21b6', bg:'#ede9fe' },
  basquet:  { label:'Básquet',   color:'#9a3412', bg:'#ffedd5' },
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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
const strToDate = (s: string) => {
  const [y,m,d] = s.split('-').map(Number)
  return new Date(y, m-1, d)
}
const formatDateDisplay = (s: string) => {
  if (!s) return ''
  const d = strToDate(s)
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0,3)}`
}
const todayStr = () => dateToStr(new Date())

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
    --charcoal:  #0C0D0B;
    --ink:       #1a1d19;
    --muted:     #6b7569;
    --border:    #e8ece6;
    --white:     #ffffff;
    --radius-xl: 22px;
    --radius-lg: 16px;
    --radius-md: 12px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.05);
    --shadow-md: 0 4px 16px rgba(0,0,0,.10), 0 12px 32px rgba(0,0,0,.07);
    --shadow-lg: 0 8px 32px rgba(0,0,0,.14), 0 24px 56px rgba(0,0,0,.10);
    --font-display: 'DM Serif Display', Georgia, serif;
    --font-heading: 'Kanit', sans-serif;
    --font-body:    'DM Sans', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: var(--font-body);
    background: var(--bone);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::selection { background: var(--green-400); color: var(--green-900); }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(20px); }
    to   { opacity:1; transform: none; }
  }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes shimmer {
    0%  { background-position:200% 0; }
    100%{ background-position:-200% 0; }
  }
  @keyframes expandIn {
    from { opacity:0; transform: scale(.96) translateY(-6px); }
    to   { opacity:1; transform: scale(1) translateY(0); }
  }
  @keyframes slideUp {
    from { opacity:0; transform: translateY(100%); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }

  /* ── Navbar ── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 90;
    height: 64px; padding: 0 32px;
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(245,242,236,.95);
    backdrop-filter: blur(20px) saturate(1.6);
    border-bottom: 1px solid var(--border);
  }
  .nav__logo { display:flex; align-items:center; height:30px; cursor:pointer; }
  .nav__links { display:flex; align-items:center; gap:6px; }
  .nav__link {
    padding: 8px 14px; border-radius: var(--radius-md);
    font-size: 13.5px; font-weight: 500; color: var(--ink);
    text-decoration: none; transition: background .15s;
  }
  .nav__link:hover { background: rgba(0,0,0,.05); }
  .nav__cta {
    padding: 9px 20px; border-radius: var(--radius-md);
    font-size: 13.5px; font-weight: 600;
    background: var(--green-500); color: #fff;
    text-decoration: none; transition: all .15s;
    box-shadow: 0 2px 10px rgba(22,163,74,.30);
  }
  .nav__cta:hover { background: var(--green-700); }

  /* ── Filter bar ── */
  .filter-bar {
    position: sticky; top: 64px; z-index: 70;
    background: rgba(245,242,236,.97);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 14px 32px;
  }
  .filter-inner {
    max-width: 1280px; margin: 0 auto;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }

  /* ── Filter pill button ── */
  .fpill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 999px;
    border: 1.5px solid var(--border);
    background: var(--white); color: var(--ink);
    font-size: 13px; font-weight: 600;
    font-family: var(--font-body); cursor: pointer;
    transition: all .15s; white-space: nowrap;
  }
  .fpill:hover { border-color: var(--green-500); background: var(--green-100); }
  .fpill.active {
    border-color: var(--green-500); background: var(--green-500);
    color: #fff; box-shadow: 0 2px 10px rgba(22,163,74,.3);
  }
  .fpill-icon { font-size: 14px; }

  /* ── Sort select ── */
  .sort-select {
    padding: 9px 14px; border-radius: 999px;
    border: 1.5px solid var(--border); background: var(--white);
    font-size: 13px; font-weight: 600; font-family: var(--font-body);
    color: var(--ink); cursor: pointer; outline: none;
    appearance: none; -webkit-appearance: none;
    padding-right: 30px;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236b7569' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
    transition: border-color .15s;
  }
  .sort-select:hover { border-color: var(--green-500); }
  .sort-select:focus { border-color: var(--green-500); }

  /* ── Popover ── */
  .popover {
    position: absolute; z-index: 200;
    background: var(--white); border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
    animation: expandIn .18s ease;
    overflow: hidden;
    min-width: 240px;
  }

  /* ── Calendar ── */
  .cal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 18px 10px;
    font-family: var(--font-heading); font-size: 14px; font-weight: 700; color: var(--ink);
  }
  .cal-nav {
    width: 28px; height: 28px; border-radius: 8px;
    border: 1.5px solid var(--border); background: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted);
    transition: all .12s;
  }
  .cal-nav:hover { border-color: var(--green-500); color: var(--green-500); background: var(--green-100); }
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; padding: 0 12px 14px; }
  .cal-dow  { text-align:center; font-size:10px; font-weight:700; color:var(--muted); padding:4px 0 6px; font-family:var(--font-heading); letter-spacing:.06em; }
  .cal-day  {
    aspect-ratio:1; display:flex; align-items:center; justify-content:center;
    border-radius:9px; font-size:12.5px; font-weight:500; cursor:pointer;
    border:none; background:none; transition:all .12s;
    font-family:var(--font-body); color:var(--ink);
  }
  .cal-day:hover:not(:disabled) { background:var(--green-100); color:var(--green-700); font-weight:600; }
  .cal-day.today  { font-weight:800; color:var(--green-500); }
  .cal-day.sel    { background:var(--green-500)!important; color:#fff!important; font-weight:700; }
  .cal-day.out    { color:#d0d8cf; }
  .cal-day:disabled { color:#dce4da; cursor:default; }

  /* ── Hour grid ── */
  .hour-grid {
    display: grid; grid-template-columns: repeat(4,1fr); gap: 6px;
    padding: 12px 14px 14px; max-height: 220px; overflow-y: auto;
  }
  .hour-chip {
    padding: 8px 4px; border-radius: 9px; border: 1.5px solid var(--border);
    background: none; cursor: pointer; font-family: var(--font-body);
    font-size: 12px; font-weight: 600; color: var(--ink);
    transition: all .12s; text-align: center;
  }
  .hour-chip:hover { border-color:var(--green-500); background:var(--green-100); color:var(--green-700); }
  .hour-chip.sel   { border-color:var(--green-500); background:var(--green-500); color:#fff; }

  /* ── Field card ── */
  .field-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden; cursor: pointer; outline: none;
    transition: transform .24s cubic-bezier(.16,1,.3,1), box-shadow .24s, border-color .24s;
    display: flex; flex-direction: column;
    animation: fadeUp .4s ease both;
  }
  .field-card:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lg);
    border-color: var(--green-400);
  }
  .field-card:focus-visible { outline: 2px solid var(--green-500); outline-offset: 3px; }

  /* ── Availability chips ── */
  .avail-chip {
    display: inline-flex; align-items: center;
    padding: 4px 9px; border-radius: 999px; border: 1px solid #d1fae5;
    background: #f0fdf4; color: var(--green-700);
    font-size: 11px; font-weight: 700;
    font-family: var(--font-heading); letter-spacing: .03em;
    white-space: nowrap; flex-shrink: 0;
    transition: all .12s; cursor: pointer;
  }
  .avail-chip:hover { background: var(--green-500); color: #fff; border-color: var(--green-500); }

  /* ── Skeleton ── */
  .skel {
    background: linear-gradient(90deg,#ebebeb 25%,#f5f5f5 50%,#ebebeb 75%);
    background-size: 400% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }

  /* ── Results grid ── */
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    align-items: start;
  }

  /* ── Mobile filter drawer ── */
  .drawer-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,.55);
    backdrop-filter: blur(4px);
    animation: overlayIn .2s ease;
  }
  .drawer {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 201;
    background: var(--white); border-radius: 24px 24px 0 0;
    padding: 0 0 32px;
    box-shadow: 0 -8px 40px rgba(0,0,0,.18);
    animation: slideUp .3s cubic-bezier(.16,1,.3,1);
    max-height: 88vh; overflow-y: auto;
  }
  .drawer-handle {
    width: 36px; height: 4px; background: #d1d5db; border-radius: 2px;
    margin: 12px auto 0;
  }

  /* ── Backdrop ── */
  .backdrop { position: fixed; inset: 0; z-index: 100; }

  /* ── Active filter tags ── */
  .filter-tag {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px 5px 10px; border-radius: 999px;
    background: var(--ink); color: #fff;
    font-size: 12px; font-weight: 600; font-family: var(--font-body);
  }
  .filter-tag-x {
    display: flex; align-items: center; justify-content: center;
    width: 16px; height: 16px; border-radius: 50%;
    background: rgba(255,255,255,.25); border: none; cursor: pointer;
    color: #fff; font-size: 10px; padding: 0; transition: background .12s;
  }
  .filter-tag-x:hover { background: rgba(255,255,255,.4); }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .filter-bar        { padding: 12px 16px; }
    .desktop-filters   { display: none !important; }
    .mobile-filter-btn { display: flex !important; }
    .results-grid      { grid-template-columns: 1fr; gap: 14px; }
    .nav               { padding: 0 16px; }
    .main-content      { padding: 24px 16px 64px !important; }
  }
  @media (min-width: 769px) {
    .mobile-filter-btn { display: none !important; }
  }
  @media (max-width: 480px) {
    .nav__links { display: none; }
  }
`

// ─── Mini Calendar ─────────────────────────────────────────────────────────
function Calendar({ value, onChange, onClose }: { value:string; onChange:(v:string)=>void; onClose:()=>void }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const init = value ? strToDate(value) : today
  const [view, setView] = useState(new Date(init.getFullYear(), init.getMonth(), 1))
  const prev = () => setView(v => new Date(v.getFullYear(), v.getMonth()-1, 1))
  const next = () => setView(v => new Date(v.getFullYear(), v.getMonth()+1, 1))
  const first = view.getDay()
  const days  = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate()
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)]
  const sel = value ? strToDate(value) : null
  return (
    <div>
      <div className="cal-header">
        <button className="cal-nav" onClick={prev} type="button">‹</button>
        <span>{MONTHS_ES[view.getMonth()]} {view.getFullYear()}</span>
        <button className="cal-nav" onClick={next} type="button">›</button>
      </div>
      <div className="cal-grid">
        {DAYS_ES.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`}/>
          const dt = new Date(view.getFullYear(), view.getMonth(), day)
          const isPast  = dt < today
          const isToday = dateToStr(dt) === dateToStr(today)
          const isSel   = sel ? dateToStr(dt) === dateToStr(sel) : false
          return (
            <button key={day} type="button" disabled={isPast}
              className={`cal-day${isToday?' today':''}${isSel?' sel':''}`}
              onClick={() => { onChange(dateToStr(dt)); onClose() }}
            >{day}</button>
          )
        })}
      </div>
      {value && (
        <div style={{ padding:'0 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:10, marginTop:4 }}>
          <span style={{ fontSize:12, color:'var(--muted)', fontWeight:500 }}>Fecha: {formatDateDisplay(value)}</span>
          <button type="button" onClick={() => { onChange(''); onClose() }}
            style={{ fontSize:11, color:'#ef4444', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            ✕ Limpiar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Hour Picker ─────────────────────────────────────────────────────────────
function HourPicker({ value, onChange, onClose }: { value:string; onChange:(v:string)=>void; onClose:()=>void }) {
  return (
    <div>
      <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid #f0f4f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ fontFamily:'var(--font-heading)', fontSize:13, fontWeight:700, color:'var(--ink)' }}>Horario de juego</p>
        {value && <button type="button" onClick={() => { onChange(''); onClose() }} style={{ fontSize:11, color:'#ef4444', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>✕ Limpiar</button>}
      </div>
      <div className="hour-grid">
        {HOUR_SLOTS.map(h => (
          <button key={h} type="button" className={`hour-chip${value===h?' sel':''}`}
            onClick={() => { onChange(h); onClose() }}>{h}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Field Card ───────────────────────────────────────────────────────────────
function FieldCard({
  field, availableHours, queryHour, queryDate, index
}: {
  field: Field
  availableHours: string[]
  queryHour: string
  queryDate: string
  index: number
}) {
  const router = useRouter()
  const sport  = field.sport ? SPORT_META[field.sport] : null
  const isAvail = queryHour ? availableHours.includes(queryHour) : availableHours.length > 0
  const displayHours = availableHours.slice(0, 4)

  const goToReserve = (hour?: string) => {
    const q: Record<string,string> = {}
    if (queryDate) q.date = queryDate
    if (hour || queryHour) q.hour = hour || queryHour
    router.push({ pathname:`/reserve/${field.id}`, query: q })
  }

  return (
    <article
      className="field-card" tabIndex={0}
      style={{ animationDelay:`${index * 40}ms` }}
      onClick={() => goToReserve()}
      onKeyDown={e => e.key==='Enter' && goToReserve()}
      aria-label={`Ver cancha ${field.name}`}
    >
      {/* Image */}
      <div style={{ position:'relative', height:196, background:'linear-gradient(135deg,#134a21,#0a2e15)', overflow:'hidden', flexShrink:0 }}>
        {field.image
          ? <Image src={field.image} alt={field.name} fill sizes="400px"
              style={{ objectFit:'cover', transition:'transform .5s ease' }} loading="lazy"/>
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:72, opacity:.25 }}>⚽</div>
        }
        {/* Gradient overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 50%)' }}/>

        {/* Sport badge */}
        {sport && (
          <span style={{ position:'absolute', top:12, left:12, background:sport.bg, color:sport.color, fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, fontFamily:'var(--font-heading)', letterSpacing:'.06em', textTransform:'uppercase' }}>
            {sport.label}
          </span>
        )}

        {/* Availability indicator */}
        <span style={{
          position:'absolute', top:12, right:12,
          background: isAvail ? 'rgba(22,163,74,.92)' : 'rgba(239,68,68,.85)',
          backdropFilter: 'blur(8px)',
          color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:999,
          fontFamily:'var(--font-heading)', letterSpacing:'.06em', textTransform:'uppercase',
          display:'flex', alignItems:'center', gap:4,
        }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,.8)', display:'inline-block' }}/>
          {isAvail ? 'Disponible' : 'Ocupada'}
        </span>

        {/* Price */}
        <div style={{ position:'absolute', bottom:12, right:12 }}>
          <span style={{ fontSize:15, fontWeight:800, color:'#fff', fontFamily:'var(--font-heading)', background:'rgba(0,0,0,.45)', backdropFilter:'blur(8px)', padding:'5px 12px', borderRadius:999, border:'1px solid rgba(255,255,255,.15)' }}>
            {fmt(field.price_day)}<span style={{ fontSize:11, fontWeight:500, opacity:.8 }}>/hr</span>
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'16px 18px', flex:1, display:'flex', flexDirection:'column', gap:0 }}>
        {/* Name */}
        <div style={{ marginBottom:8 }}>
          {field.complex_name && (
            <p style={{ fontSize:11, color:'var(--muted)', fontWeight:500, marginBottom:2 }}>{field.complex_name}</p>
          )}
          <h3 style={{ fontFamily:'var(--font-heading)', fontSize:16, fontWeight:700, color:'var(--ink)', lineHeight:1.2, letterSpacing:'.01em' }}>
            {field.name}
          </h3>
        </div>

        {/* Location */}
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:12 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <p style={{ fontSize:12, color:'var(--muted)', fontWeight:500 }}>{field.location}</p>
        </div>

        {/* Available hours */}
        {availableHours.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'var(--font-heading)', marginBottom:6 }}>
              Horarios libres
            </p>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {displayHours.map(h => (
                <span key={h} className="avail-chip"
                  onClick={e => { e.stopPropagation(); goToReserve(h) }}>
                  {h}
                </span>
              ))}
              {availableHours.length > 4 && (
                <span style={{ fontSize:11, color:'var(--muted)', fontWeight:600, padding:'4px 6px', alignSelf:'center' }}>
                  +{availableHours.length - 4} más
                </span>
              )}
            </div>
          </div>
        )}

        {availableHours.length === 0 && queryDate && (
          <div style={{ marginBottom:14, padding:'8px 12px', background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca' }}>
            <p style={{ fontSize:11, color:'#ef4444', fontWeight:600 }}>Sin disponibilidad para esta fecha</p>
          </div>
        )}

        {/* CTA */}
        <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
          <button
            onClick={e => { e.stopPropagation(); goToReserve() }}
            style={{
              flex:1, padding:'10px 16px', borderRadius:12,
              background:'var(--ink)', color:'#fff', border:'none', cursor:'pointer',
              fontFamily:'var(--font-heading)', fontSize:13, fontWeight:700, letterSpacing:'.03em',
              transition:'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-800)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)' }}
          >
            Ver cancha →
          </button>
          {isAvail && (
            <button
              onClick={e => { e.stopPropagation(); goToReserve(displayHours[0] || queryHour) }}
              style={{
                padding:'10px 14px', borderRadius:12,
                background:'var(--green-500)', color:'#fff', border:'none', cursor:'pointer',
                fontFamily:'var(--font-heading)', fontSize:13, fontWeight:700, letterSpacing:'.03em',
                transition:'all .15s', whiteSpace:'nowrap',
                boxShadow:'0 2px 10px rgba(22,163,74,.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-700)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-500)' }}
            >
              Reservar
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function CardSkeleton() {
  return (
    <div style={{ background:'var(--white)', borderRadius:22, overflow:'hidden', border:'1.5px solid var(--border)' }}>
      <div className="skel" style={{ height:196 }}/>
      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:8 }}>
        <div className="skel" style={{ height:11, width:'35%' }}/>
        <div className="skel" style={{ height:16, width:'70%' }}/>
        <div className="skel" style={{ height:12, width:'45%' }}/>
        <div style={{ display:'flex', gap:6, marginTop:4 }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:24, width:52, borderRadius:999 }}/>)}
        </div>
        <div className="skel" style={{ height:38, borderRadius:12, marginTop:8 }}/>
      </div>
    </div>
  )
}

// ─── Filter Section (used in both sidebar and drawer) ─────────────────────────
function FilterPanel({
  filterSport, setFilterSport,
  filterDate, setFilterDate,
  filterHour, setFilterHour,
  filterPrice, setFilterPrice,
  filterLoc, setFilterLoc,
  locations, onApply,
}: any) {
  const [showCal, setShowCal]   = useState(false)
  const [showHour, setShowHour] = useState(false)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Sport */}
      <div>
        <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.10em', color:'var(--muted)', textTransform:'uppercase', marginBottom:10 }}>Deporte</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {SPORTS.map(s => (
            <button key={s.value} type="button"
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'7px 13px', borderRadius:999,
                border:`1.5px solid ${filterSport === s.value ? 'var(--green-500)' : 'var(--border)'}`,
                background: filterSport === s.value ? 'var(--green-500)' : 'var(--white)',
                color: filterSport === s.value ? '#fff' : 'var(--ink)',
                fontSize:12, fontWeight:600, cursor:'pointer',
                fontFamily:'var(--font-body)', transition:'all .12s',
              }}
              onClick={() => setFilterSport(s.value === filterSport ? '' : s.value)}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      {locations.length > 1 && (
        <div>
          <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.10em', color:'var(--muted)', textTransform:'uppercase', marginBottom:10 }}>Ubicación</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <button type="button"
              style={{ padding:'7px 13px', borderRadius:999, border:`1.5px solid ${!filterLoc ? 'var(--green-500)' : 'var(--border)'}`, background:!filterLoc ? 'var(--green-500)' : 'var(--white)', color:!filterLoc?'#fff':'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .12s' }}
              onClick={() => setFilterLoc('')}>Todas</button>
            {locations.map((loc: string) => (
              <button key={loc} type="button"
                style={{ padding:'7px 13px', borderRadius:999, border:`1.5px solid ${filterLoc===loc ? 'var(--green-500)' : 'var(--border)'}`, background:filterLoc===loc ? 'var(--green-500)' : 'var(--white)', color:filterLoc===loc?'#fff':'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .12s' }}
                onClick={() => setFilterLoc(loc===filterLoc ? '' : loc)}>📍 {loc}</button>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <div style={{ position:'relative' }}>
        <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.10em', color:'var(--muted)', textTransform:'uppercase', marginBottom:10 }}>Fecha</p>
        <button type="button"
          style={{
            display:'flex', alignItems:'center', gap:8, width:'100%',
            padding:'10px 14px', borderRadius:12,
            border:`1.5px solid ${filterDate ? 'var(--green-500)' : 'var(--border)'}`,
            background: filterDate ? 'var(--green-100)' : 'var(--white)',
            fontSize:13, fontWeight:500, fontFamily:'var(--font-body)',
            color: filterDate ? 'var(--green-700)' : '#b0b8ae', cursor:'pointer', textAlign:'left',
          }}
          onClick={() => { setShowCal(v => !v); setShowHour(false) }}>
          <span>📅</span>
          <span style={{ color: filterDate ? 'var(--ink)' : '#b0b8ae' }}>
            {filterDate ? formatDateDisplay(filterDate) : 'Elegí una fecha'}
          </span>
        </button>
        {showCal && (
          <>
            <div className="backdrop" onClick={() => setShowCal(false)}/>
            <div className="popover" style={{ top:'calc(100% + 8px)', left:0, right:0 }}>
              <Calendar value={filterDate} onChange={setFilterDate} onClose={() => setShowCal(false)}/>
            </div>
          </>
        )}
      </div>

      {/* Hour */}
      <div style={{ position:'relative' }}>
        <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.10em', color:'var(--muted)', textTransform:'uppercase', marginBottom:10 }}>Hora</p>
        <button type="button"
          style={{
            display:'flex', alignItems:'center', gap:8, width:'100%',
            padding:'10px 14px', borderRadius:12,
            border:`1.5px solid ${filterHour ? 'var(--green-500)' : 'var(--border)'}`,
            background: filterHour ? 'var(--green-100)' : 'var(--white)',
            fontSize:13, fontWeight:500, fontFamily:'var(--font-body)',
            color: filterHour ? 'var(--ink)' : '#b0b8ae', cursor:'pointer', textAlign:'left',
          }}
          onClick={() => { setShowHour(v => !v); setShowCal(false) }}>
          <span>🕐</span>
          <span>{filterHour || 'Cualquier hora'}</span>
        </button>
        {showHour && (
          <>
            <div className="backdrop" onClick={() => setShowHour(false)}/>
            <div className="popover" style={{ top:'calc(100% + 8px)', left:0, right:0 }}>
              <HourPicker value={filterHour} onChange={setFilterHour} onClose={() => setShowHour(false)}/>
            </div>
          </>
        )}
      </div>

      {/* Price range */}
      <div>
        <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.10em', color:'var(--muted)', textTransform:'uppercase', marginBottom:10 }}>Precio por hora</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {PRICE_RANGES.map((pr, i) => (
            <button key={i} type="button"
              style={{
                padding:'7px 12px', borderRadius:999,
                border:`1.5px solid ${filterPrice===i ? 'var(--green-500)' : 'var(--border)'}`,
                background:filterPrice===i ? 'var(--green-500)' : 'var(--white)',
                color:filterPrice===i?'#fff':'var(--ink)',
                fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .12s',
              }}
              onClick={() => setFilterPrice(i===filterPrice ? 0 : i)}>
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {onApply && (
        <button type="button" onClick={onApply} style={{
          padding:'13px', borderRadius:14, background:'var(--green-500)', color:'#fff',
          border:'none', cursor:'pointer', fontFamily:'var(--font-heading)',
          fontSize:14, fontWeight:700, letterSpacing:'.03em',
          boxShadow:'0 3px 14px rgba(22,163,74,.38)',
        }}>
          Aplicar filtros
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReserveIndex() {
  const router = useRouter()

  // Raw data
  const [fields, setFields]         = useState<Field[]>([])
  const [availability, setAvail]    = useState<Availability[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(false)
  const [loadingAvail, setLdAvail]  = useState(false)

  // Filters (local state, synced to URL)
  const [filterSport, setFilterSport] = useState('')
  const [filterDate,  setFilterDate]  = useState('')
  const [filterHour,  setFilterHour]  = useState('')
  const [filterPrice, setFilterPrice] = useState(0)
  const [filterLoc,   setFilterLoc]   = useState('')
  const [sortBy,      setSortBy]      = useState<SortOption>('relevance')

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Popovers (desktop filter bar)
  const [showSportPop,  setShowSportPop]  = useState(false)
  const [showDatePop,   setShowDatePop]   = useState(false)
  const [showHourPop,   setShowHourPop]   = useState(false)
  const [showPricePop,  setShowPricePop]  = useState(false)

  // Init from URL
  useEffect(() => {
    if (!router.isReady) return
    setFilterSport((router.query.sport as string) ?? '')
    setFilterDate( (router.query.date  as string) ?? '')
    setFilterHour( (router.query.hour  as string) ?? '')
    setFilterLoc(  (router.query.loc   as string) ?? '')
    if (router.query.sort) setSortBy(router.query.sort as SortOption)
  }, [router.isReady])

  // Load fields
  useEffect(() => {
    ;(async () => {
      setLoading(true); setLoadError(false)
      try {
        const [{ data: flds, error }, { data: imgs }] = await Promise.all([
          supabase.from('fields').select('id,name,price_day,location,sport,active').eq('active', true).order('name'),
          supabase.from('field_images').select('field_id,url,is_main'),
        ])
        if (error || !flds) throw error
        const map = new Map<number, Field>()
        flds.forEach(f => map.set(f.id, { id:f.id, name:f.name, complex_name:null, price_day:Number(f.price_day??0), location:f.location??'Sin ubicación', sport:f.sport??null, image:null, active:true }))
        imgs?.forEach(img => {
          const f = map.get(img.field_id)
          if (!f || !img.url) return
          if (img.is_main || f.image === null) f.image = img.url
        })
        setFields([...map.values()])
      } catch { setLoadError(true) }
      finally { setLoading(false) }
    })()
  }, [])

  // Load availability when date changes
  useEffect(() => {
    if (!filterDate || fields.length === 0) { setAvail([]); return }
    ;(async () => {
      setLdAvail(true)
      const today = todayStr()
      const date  = filterDate >= today ? filterDate : today
      const { data } = await supabase
        .from('bookings')
        .select('field_id, date, hour')
        .eq('date', date)
        .in('status', ['confirmed','pending'])
      // Compute free slots = all slots MINUS booked
      const bookedMap = new Map<number, Set<string>>()
      ;(data || []).forEach(b => {
        if (!bookedMap.has(b.field_id)) bookedMap.set(b.field_id, new Set())
        bookedMap.get(b.field_id)!.add(b.hour)
      })
      const free: Availability[] = []
      fields.forEach(f => {
        const booked = bookedMap.get(f.id) || new Set()
        HOUR_SLOTS.forEach(h => {
          if (!booked.has(h)) free.push({ field_id:f.id, date, hour:h })
        })
      })
      setAvail(free)
      setLdAvail(false)
    })()
  }, [filterDate, fields])

  // Sync URL
  const syncURL = useCallback((overrides?: Partial<{sport:string;date:string;hour:string;loc:string;sort:string}>) => {
    const q: Record<string,string> = {}
    const sp = overrides?.sport ?? filterSport
    const dt = overrides?.date  ?? filterDate
    const hr = overrides?.hour  ?? filterHour
    const lc = overrides?.loc   ?? filterLoc
    const so = overrides?.sort  ?? sortBy
    if (sp) q.sport = sp
    if (dt) q.date  = dt
    if (hr) q.hour  = hr
    if (lc) q.loc   = lc
    if (so !== 'relevance') q.sort = so
    router.push({ pathname:'/reserve', query:q }, undefined, { shallow:true })
  }, [filterSport, filterDate, filterHour, filterLoc, sortBy, router])

  const applyDrawer = () => { syncURL(); setDrawerOpen(false) }

  // Derived data
  const locations = useMemo(() => [...new Set(fields.map(f => f.location))].sort(), [fields])

  const availByField = useMemo(() => {
    const m = new Map<number, string[]>()
    availability.forEach(a => {
      if (!m.has(a.field_id)) m.set(a.field_id, [])
      m.get(a.field_id)!.push(a.hour)
    })
    return m
  }, [availability])

  const filtered = useMemo(() => {
    let res = [...fields]
    if (filterSport) res = res.filter(f => f.sport?.toLowerCase() === filterSport.toLowerCase())
    if (filterLoc)   res = res.filter(f => f.location === filterLoc)
    const pr = PRICE_RANGES[filterPrice]
    if (filterPrice > 0) res = res.filter(f => f.price_day >= pr.min && f.price_day <= pr.max)
    if (filterDate && filterHour) {
      res = res.filter(f => (availByField.get(f.id) || []).includes(filterHour))
    } else if (filterDate) {
      res = res.filter(f => (availByField.get(f.id) || []).length > 0)
    }
    // Sort
    if (sortBy === 'price_asc')  res.sort((a,b) => a.price_day - b.price_day)
    if (sortBy === 'price_desc') res.sort((a,b) => b.price_day - a.price_day)
    return res
  }, [fields, filterSport, filterLoc, filterPrice, filterDate, filterHour, availByField, sortBy])

  // Active filter count
  const activeCount = [filterSport, filterDate, filterHour, filterLoc, filterPrice>0].filter(Boolean).length

  const clearAll = () => {
    setFilterSport(''); setFilterDate(''); setFilterHour('')
    setFilterPrice(0); setFilterLoc('')
    router.push('/reserve', undefined, { shallow:true })
  }

  // Filter tag removers
  const removeSport = () => { setFilterSport(''); syncURL({ sport:'' }) }
  const removeDate  = () => { setFilterDate('');  setAvail([]); syncURL({ date:'' }) }
  const removeHour  = () => { setFilterHour('');  syncURL({ hour:'' }) }
  const removeLoc   = () => { setFilterLoc('');   syncURL({ loc:'' }) }

  return (
    <>
      <Head>
        <title>Explorar canchas — GolPlay</title>
        <meta name="description" content="Buscá y reservá canchas de fútbol, pádel, tenis y más. Disponibilidad real, sin llamadas."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet"/>
      </Head>

      <style>{CSS}</style>

      {/* ── Navbar ── */}
      <nav className="nav">
        <div className="nav__logo" onClick={() => router.push('/')}>
          <img src="/logo-golplay1.svg" alt="GolPlay" style={{ height:150 }}/>
        </div>
        <div className="nav__links">
          <Link href="/" className="nav__link">Inicio</Link>
          <Link href="/login" className="nav__link">Iniciar sesión</Link>
          <Link href="/register" className="nav__cta">Registrarse</Link>
        </div>
      </nav>

      {/* ── Sticky filter bar ── */}
      <div className="filter-bar" style={{ paddingTop: 78 }}>
        <div className="filter-inner">

          {/* Desktop filters */}
          <div className="desktop-filters" style={{ display:'flex', alignItems:'center', gap:8, flex:1, flexWrap:'wrap' }}>

            {/* Sport filter */}
            <div style={{ position:'relative' }}>
              <button className={`fpill${filterSport ? ' active' : ''}`}
                onClick={() => { setShowSportPop(v=>!v); setShowDatePop(false); setShowHourPop(false); setShowPricePop(false) }}>
                <span className="fpill-icon">⚽</span>
                {filterSport ? (SPORT_META[filterSport]?.label ?? filterSport) : 'Deporte'}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {showSportPop && (
                <>
                  <div className="backdrop" onClick={() => setShowSportPop(false)}/>
                  <div className="popover" style={{ top:'calc(100% + 8px)', left:0, padding:'14px', minWidth:280 }}>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:12, fontWeight:700, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Deporte</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {SPORTS.map(s => (
                        <button key={s.value} type="button"
                          style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:999, border:`1.5px solid ${filterSport===s.value?'var(--green-500)':'var(--border)'}`, background:filterSport===s.value?'var(--green-500)':'var(--white)', color:filterSport===s.value?'#fff':'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .12s' }}
                          onClick={() => { setFilterSport(s.value===filterSport?'':s.value); syncURL({ sport:s.value===filterSport?'':s.value }); setShowSportPop(false) }}>
                          {s.emoji} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Location */}
            {locations.length > 1 && (
              <div style={{ position:'relative' }}>
                <button className={`fpill${filterLoc ? ' active' : ''}`}
                  onClick={() => { setShowPricePop(v=>!v); setShowSportPop(false); setShowDatePop(false); setShowHourPop(false) }}>
                  <span className="fpill-icon">📍</span>
                  {filterLoc || 'Ubicación'}
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {showPricePop && (
                  <>
                    <div className="backdrop" onClick={() => setShowPricePop(false)}/>
                    <div className="popover" style={{ top:'calc(100% + 8px)', left:0, padding:'14px', minWidth:220 }}>
                      <p style={{ fontFamily:'var(--font-heading)', fontSize:12, fontWeight:700, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Ubicación</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        <button type="button" style={{ padding:'7px 12px', borderRadius:999, border:`1.5px solid ${!filterLoc?'var(--green-500)':'var(--border)'}`, background:!filterLoc?'var(--green-500)':'var(--white)', color:!filterLoc?'#fff':'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .12s' }} onClick={() => { setFilterLoc(''); syncURL({ loc:'' }); setShowPricePop(false) }}>Todas</button>
                        {locations.map(loc => (
                          <button key={loc} type="button" style={{ padding:'7px 12px', borderRadius:999, border:`1.5px solid ${filterLoc===loc?'var(--green-500)':'var(--border)'}`, background:filterLoc===loc?'var(--green-500)':'var(--white)', color:filterLoc===loc?'#fff':'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .12s' }} onClick={() => { const v=loc===filterLoc?'':loc; setFilterLoc(v); syncURL({ loc:v }); setShowPricePop(false) }}>📍 {loc}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Date */}
            <div style={{ position:'relative' }}>
              <button className={`fpill${filterDate ? ' active' : ''}`}
                onClick={() => { setShowDatePop(v=>!v); setShowSportPop(false); setShowHourPop(false); setShowPricePop(false) }}>
                <span className="fpill-icon">📅</span>
                {filterDate ? formatDateDisplay(filterDate) : 'Fecha'}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {showDatePop && (
                <>
                  <div className="backdrop" onClick={() => setShowDatePop(false)}/>
                  <div className="popover" style={{ top:'calc(100% + 8px)', left:0 }}>
                    <Calendar value={filterDate} onChange={v => { setFilterDate(v); syncURL({ date:v }) }} onClose={() => setShowDatePop(false)}/>
                  </div>
                </>
              )}
            </div>

            {/* Hour */}
            <div style={{ position:'relative' }}>
              <button className={`fpill${filterHour ? ' active' : ''}`}
                onClick={() => { setShowHourPop(v=>!v); setShowSportPop(false); setShowDatePop(false); setShowPricePop(false) }}>
                <span className="fpill-icon">🕐</span>
                {filterHour || 'Hora'}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {showHourPop && (
                <>
                  <div className="backdrop" onClick={() => setShowHourPop(false)}/>
                  <div className="popover" style={{ top:'calc(100% + 8px)', left:0 }}>
                    <HourPicker value={filterHour} onChange={v => { setFilterHour(v); syncURL({ hour:v }) }} onClose={() => setShowHourPop(false)}/>
                  </div>
                </>
              )}
            </div>

            {/* Clear */}
            {activeCount > 0 && (
              <button onClick={clearAll} style={{ fontSize:12, color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'inherit', padding:'8px 10px', borderRadius:999, transition:'background .14s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='#fee2e2')}
                onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Mobile filter button */}
          <button className="mobile-filter-btn" style={{
            display:'none', alignItems:'center', gap:7, padding:'9px 16px',
            borderRadius:999, border:'1.5px solid var(--border)',
            background:'var(--white)', cursor:'pointer', fontFamily:'var(--font-body)',
            fontSize:13, fontWeight:600, color:'var(--ink)', position:'relative',
          }}
          onClick={() => setDrawerOpen(true)}>
            <svg width="15" height="12" viewBox="0 0 15 12" fill="none"><path d="M0 1h15M3 6h9M5 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Filtros
            {activeCount > 0 && (
              <span style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'var(--green-500)', color:'#fff', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {activeCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <div style={{ marginLeft:'auto' }}>
            <select className="sort-select" value={sortBy}
              onChange={e => { setSortBy(e.target.value as SortOption); syncURL({ sort:e.target.value }) }}>
              <option value="relevance">Más relevantes</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
          </div>
        </div>

        {/* Active filter tags */}
        {activeCount > 0 && (
          <div style={{ maxWidth:1280, margin:'10px auto 0', display:'flex', gap:6, flexWrap:'wrap' }}>
            {filterSport && <span className="filter-tag">⚽ {SPORT_META[filterSport]?.label}<button className="filter-tag-x" onClick={removeSport}>✕</button></span>}
            {filterLoc   && <span className="filter-tag">📍 {filterLoc}<button className="filter-tag-x" onClick={removeLoc}>✕</button></span>}
            {filterDate  && <span className="filter-tag">📅 {formatDateDisplay(filterDate)}<button className="filter-tag-x" onClick={removeDate}>✕</button></span>}
            {filterHour  && <span className="filter-tag">🕐 {filterHour}<button className="filter-tag-x" onClick={removeHour}>✕</button></span>}
            {filterPrice > 0 && <span className="filter-tag">💰 {PRICE_RANGES[filterPrice].label}<button className="filter-tag-x" onClick={() => { setFilterPrice(0); syncURL() }}>✕</button></span>}
          </div>
        )}
      </div>

      {/* ── Main ── */}
      <main className="main-content" style={{ maxWidth:1280, margin:'0 auto', padding:'32px 32px 80px' }}>

        {/* Header row */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(26px,3.2vw,36px)', fontWeight:400, color:'var(--ink)', letterSpacing:'-0.02em', fontStyle:'italic', lineHeight:1.1 }}>
              {loading ? 'Cargando canchas…' : (
                filtered.length > 0
                  ? <>Encontramos <em style={{ color:'var(--green-500)', fontStyle:'normal' }}>{filtered.length}</em> canchas</>
                  : 'Sin resultados'
              )}
            </h1>
            {!loading && (filterDate || filterSport || filterLoc) && (
              <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>
                {[filterSport && SPORT_META[filterSport]?.label, filterLoc, filterDate && formatDateDisplay(filterDate)].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {loadingAvail && filterDate && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'var(--green-100)', borderRadius:999, border:'1px solid #a7f3d0' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green-500)', animation:'pulse 1s infinite' }}/>
              <p style={{ fontSize:12, color:'var(--green-700)', fontWeight:700 }}>Actualizando disponibilidad…</p>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="results-grid">
            {[1,2,3,4,5,6].map(i => <CardSkeleton key={i}/>)}
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div style={{ textAlign:'center', padding:'80px 20px', background:'var(--white)', borderRadius:22, border:'1.5px solid var(--border)' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>⚠️</div>
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>No pudimos cargar las canchas</h2>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:24 }}>Verificá tu conexión e intentá de nuevo.</p>
            <button onClick={() => window.location.reload()} style={{ padding:'11px 28px', background:'var(--ink)', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontFamily:'var(--font-heading)', fontWeight:700, fontSize:13 }}>
              Reintentar
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !loadError && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px 20px', background:'var(--white)', borderRadius:22, border:'1.5px solid var(--border)' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>🏟️</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:10, fontStyle:'italic' }}>
              No encontramos canchas disponibles
            </h2>
            <p style={{ fontSize:14, color:'var(--muted)', maxWidth:380, margin:'0 auto 28px', lineHeight:1.7 }}>
              {activeCount > 0
                ? 'No hay canchas con estos filtros. Probá ampliar la búsqueda.'
                : 'Aún no hay canchas publicadas en la plataforma.'}
            </p>
            {activeCount > 0 && (
              <button onClick={clearAll} style={{ padding:'12px 28px', background:'var(--green-500)', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontFamily:'var(--font-heading)', fontWeight:700, fontSize:14, letterSpacing:'.03em', boxShadow:'0 3px 14px rgba(22,163,74,.35)' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && !loadError && filtered.length > 0 && (
          <div className="results-grid">
            {filtered.map((field, i) => (
              <FieldCard
                key={field.id} field={field} index={i}
                availableHours={availByField.get(field.id) || []}
                queryHour={filterHour} queryDate={filterDate}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Mobile Filter Drawer ── */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>
          <div className="drawer">
            <div className="drawer-handle"/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px' }}>
              <h2 style={{ fontFamily:'var(--font-heading)', fontSize:17, fontWeight:700, color:'var(--ink)' }}>Filtros</h2>
              <button onClick={() => setDrawerOpen(false)} style={{ width:32, height:32, borderRadius:999, border:'1.5px solid var(--border)', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'var(--muted)' }}>✕</button>
            </div>
            <div style={{ padding:'0 24px 24px' }}>
              <FilterPanel
                filterSport={filterSport} setFilterSport={setFilterSport}
                filterDate={filterDate}   setFilterDate={setFilterDate}
                filterHour={filterHour}   setFilterHour={setFilterHour}
                filterPrice={filterPrice} setFilterPrice={setFilterPrice}
                filterLoc={filterLoc}     setFilterLoc={setFilterLoc}
                locations={locations}     onApply={applyDrawer}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
