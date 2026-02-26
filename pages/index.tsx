/**
 * GolPlay — pages/index.tsx  v4.1 "Luxury Sport Editorial — Mobile Fixed"
 *
 * Mobile fixes applied:
 * - Search pill columns collapse properly with min-height on each field
 * - Hero padding reduced and text sizes tuned for small screens
 * - Stats bar wraps gracefully
 * - Split CTA stacks to single column
 * - Stats + reviews grid stacks correctly
 * - Footer stacks correctly
 * - Popover anchored to bottom on mobile (already existed, reinforced)
 * - Nav hamburger logic remains (links hidden < 640, CTA visible)
 */

import {
  useEffect, useState, useMemo, useRef, useCallback
} from 'react'
import { useRouter }  from 'next/router'
import Head           from 'next/head'
import Link           from 'next/link'
import Image          from 'next/image'
import { supabase }   from '@/lib/supabase'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
type Field = {
  id: number
  name: string
  price_day: number
  location: string
  sport: string | null
  image: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORTS = [
  { value: '',          emoji: '🏟️', label: 'Todos',    color: '#64748b' },
  { value: 'futbol5',   emoji: '⚽',  label: 'Fútbol 5', color: '#16a34a' },
  { value: 'futbol7',   emoji: '⚽',  label: 'Fútbol 7', color: '#15803d' },
  { value: 'padel',     emoji: '🎾',  label: 'Pádel',    color: '#0891b2' },
  { value: 'tenis',     emoji: '🎾',  label: 'Tenis',    color: '#d97706' },
  { value: 'multiuso',  emoji: '🏟️',  label: 'Multiuso', color: '#7c3aed' },
  { value: 'basquet',   emoji: '🏀',  label: 'Básquet',  color: '#ea580c' },
]

const SPORT_META: Record<string, { label: string; color: string; bg: string }> = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt       = (n: number) => n > 0 ? `₡${n.toLocaleString('es-CR')}` : 'Consultar'
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

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

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
    --radius-xl: 24px;
    --radius-lg: 16px;
    --radius-md: 12px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.06);
    --shadow-md: 0 4px 16px rgba(0,0,0,.10), 0 12px 32px rgba(0,0,0,.08);
    --shadow-lg: 0 8px 32px rgba(0,0,0,.16), 0 24px 64px rgba(0,0,0,.12);
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

  /* ─── Animations ─────────────────────────────────────────────── */
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(28px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes shimmer {
    0%  { background-position: 200% 0; }
    100%{ background-position: -200% 0; }
  }
  @keyframes floatCard {
    0%,100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
    50%      { transform: translateY(-10px) rotate(var(--rot, 0deg)); }
  }
  @keyframes expandIn {
    from { opacity:0; transform: scale(.96) translateY(-6px); }
    to   { opacity:1; transform: scale(1) translateY(0); }
  }
  @keyframes slideInRight {
    from { opacity:0; transform: translateX(32px); }
    to   { opacity:1; transform: translateX(0); }
  }
  @keyframes pulseDot {
    0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,.5); }
    50%     { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
  }
  @keyframes toastIn {
    from { opacity:0; transform: translateX(-50%) translateY(14px); }
    to   { opacity:1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes scrollMarquee {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* ─── Navbar ──────────────────────────────────────────────────── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 90;
    padding: 0 32px;
    height: 68px;
    display: flex; align-items: center; justify-content: space-between;
    transition: background .35s ease, box-shadow .35s ease, border-color .35s ease;
    border-bottom: 1px solid transparent;
  }
  .nav--scrolled {
    background: rgba(12,13,11,.94);
    backdrop-filter: blur(20px) saturate(1.4);
    border-color: rgba(255,255,255,.06);
    box-shadow: 0 1px 0 rgba(255,255,255,.04);
  }
  .nav--light {
    background: rgba(245,242,236,.95);
    backdrop-filter: blur(20px);
    border-color: rgba(0,0,0,.06);
    box-shadow: 0 1px 0 rgba(0,0,0,.04);
  }
  .nav__logo { display: flex; align-items: center; height: 32px; cursor: pointer; }
  .nav__links { display: flex; align-items: center; gap: 6px; }
  .nav__link {
    padding: 8px 14px; border-radius: var(--radius-md);
    font-size: 13.5px; font-weight: 500; font-family: var(--font-body);
    text-decoration: none; transition: all .15s;
    border: 1px solid transparent;
  }
  .nav__link--ghost-dark {
    color: rgba(255,255,255,.72);
  }
  .nav__link--ghost-dark:hover {
    color: #fff; background: rgba(255,255,255,.08);
  }
  .nav__link--ghost-light {
    color: var(--ink);
  }
  .nav__link--ghost-light:hover {
    background: rgba(0,0,0,.05);
  }
  .nav__cta {
    padding: 9px 20px; border-radius: var(--radius-md);
    font-size: 13.5px; font-weight: 600; font-family: var(--font-body);
    text-decoration: none; transition: all .15s; border: none; cursor: pointer;
    background: var(--green-500); color: #fff;
    box-shadow: 0 2px 10px rgba(22,163,74,.35);
  }
  .nav__cta:hover { background: var(--green-700); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(22,163,74,.45); }

  /* ─── Swiper overrides ────────────────────────────────────────── */
  .gp-swiper { overflow: visible !important; }
  .gp-swiper .swiper-slide { width: auto !important; }
  .gp-swiper .swiper-button-next,
  .gp-swiper .swiper-button-prev {
    color: var(--green-500) !important;
    background: #fff;
    width: 36px !important; height: 36px !important;
    border-radius: 50%;
    box-shadow: var(--shadow-sm);
    border: 1.5px solid var(--border);
    top: 36% !important;
  }
  .gp-swiper .swiper-button-next::after,
  .gp-swiper .swiper-button-prev::after { font-size: 11px !important; font-weight: 900 !important; }
  .gp-swiper .swiper-button-disabled { opacity: .2 !important; }

  /* ─── Field card ──────────────────────────────────────────────── */
  .gp-card {
    width: 290px; background: var(--white); border-radius: var(--radius-xl);
    overflow: hidden; cursor: pointer; outline: none;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow-sm);
    transition: transform .24s cubic-bezier(.16,1,.3,1), box-shadow .24s ease, border-color .24s;
    display: block;
  }
  .gp-card:hover {
    transform: translateY(-8px) scale(1.01);
    box-shadow: var(--shadow-lg);
    border-color: var(--green-400);
  }
  .gp-card:focus-visible { outline: 2px solid var(--green-500); outline-offset: 3px; }

  /* ─── Skeleton ────────────────────────────────────────────────── */
  .gp-skel {
    background: linear-gradient(90deg,#ebebeb 25%,#f5f5f5 50%,#ebebeb 75%);
    background-size: 400% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 8px;
  }

  /* ─── Sport chips ─────────────────────────────────────────────── */
  .gp-chips-scroll {
    display: flex; gap: 8px;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 2px;
  }
  .gp-chips-scroll::-webkit-scrollbar { display: none; }

  .gp-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 999px;
    font-size: 13px; font-weight: 600; font-family: var(--font-body);
    cursor: pointer; border: 1.5px solid var(--border);
    background: var(--white); color: var(--ink);
    transition: all .15s; white-space: nowrap; flex-shrink: 0;
  }
  .gp-chip:hover  { border-color: var(--green-500); background: var(--green-100); color: var(--green-700); }
  .gp-chip.active { border-color: var(--green-500); background: var(--green-500); color: #fff; }

  /* ─── Search bar ──────────────────────────────────────────────── */
  .search-pill {
    background: rgba(255,255,255,.97);
    backdrop-filter: blur(24px) saturate(1.8);
    border-radius: 20px;
    padding: 8px 8px 8px 4px;
    display: flex; align-items: center;
    box-shadow: 0 24px 80px rgba(0,0,0,.32), 0 4px 16px rgba(0,0,0,.12);
    border: 1px solid rgba(255,255,255,.6);
    gap: 4px;
  }
  .search-field {
    display: flex; flex-direction: column; padding: 8px 16px;
    border-right: 1px solid #eff0ef; min-width: 0; flex: 1;
    cursor: pointer; border-radius: 14px; transition: background .15s;
    /* FIX: ensure fields always have a minimum clickable height */
    min-height: 56px; justify-content: center;
  }
  .search-field:last-of-type { border-right: none; }
  .search-field:hover { background: #f5f7f4; }
  .search-field.active { background: #f0fdf4; }
  .search-field__label {
    font-size: 10px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 3px;
    font-family: var(--font-heading);
  }
  .search-field__value {
    font-size: 14px; font-weight: 500; color: var(--ink);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: var(--font-body);
  }
  .search-field__value.placeholder { color: #b0b8ae; font-weight: 400; }
  .search-input {
    font-size: 14px; font-weight: 500; color: var(--ink);
    border: none; outline: none; background: transparent;
    width: 100%; font-family: var(--font-body);
    padding: 0;
  }
  .search-input::placeholder { color: #b0b8ae; font-weight: 400; }
  .search-btn {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    gap: 8px;
    height: 52px; padding: 0 28px; border-radius: 14px;
    background: var(--green-500); color: #fff; border: none; cursor: pointer;
    font-family: var(--font-heading); font-size: 15px; font-weight: 700;
    letter-spacing: .02em;
    box-shadow: 0 4px 20px rgba(22,163,74,.45);
    transition: all .18s cubic-bezier(.16,1,.3,1);
  }
  .search-btn:hover {
    background: var(--green-700);
    transform: scale(1.03);
    box-shadow: 0 6px 28px rgba(22,163,74,.55);
  }

  /* ─── Popover ─────────────────────────────────────────────────── */
  .gp-popover {
    position: absolute; z-index: 200;
    background: var(--white); border-radius: var(--radius-xl);
    box-shadow: 0 16px 56px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.06);
    border: 1px solid var(--border);
    animation: expandIn .18s ease;
    overflow: hidden;
  }

  /* ─── Calendar ────────────────────────────────────────────────── */
  .cal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px 12px;
    font-family: var(--font-heading);
    font-size: 15px; font-weight: 700; color: var(--ink);
    letter-spacing: .01em;
  }
  .cal-nav {
    width: 30px; height: 30px; border-radius: 8px;
    border: 1.5px solid var(--border); background: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: var(--muted);
    transition: all .12s;
  }
  .cal-nav:hover { border-color: var(--green-500); color: var(--green-500); background: var(--green-100); }
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; padding: 0 14px 16px; }
  .cal-dow { text-align:center; font-size:10px; font-weight:700; color:var(--muted); padding:4px 0 8px; font-family:var(--font-heading); letter-spacing:.06em; }
  .cal-day {
    aspect-ratio:1; display:flex; align-items:center; justify-content:center;
    border-radius:10px; font-size:13px; font-weight:500; cursor:pointer;
    border:none; background:none; transition:all .12s;
    font-family:var(--font-body); color:var(--ink);
  }
  .cal-day:hover:not(:disabled) { background:var(--green-100); color:var(--green-700); font-weight:600; }
  .cal-day.today  { font-weight:800; color:var(--green-500); }
  .cal-day.sel    { background:var(--green-500)!important; color:#fff!important; font-weight:700; }
  .cal-day.out    { color:#d0d8cf; }
  .cal-day:disabled { color:#dce4da; cursor:default; }

  /* ─── Hour chips ──────────────────────────────────────────────── */
  .hour-grid {
    display: grid; grid-template-columns: repeat(4,1fr); gap: 6px;
    padding: 14px 16px 16px; max-height: 260px; overflow-y: auto;
  }
  .hour-chip {
    padding: 9px 4px; border-radius: 10px; border: 1.5px solid var(--border);
    background: none; cursor: pointer; font-family: var(--font-body);
    font-size: 13px; font-weight: 600; color: var(--ink);
    transition: all .12s; text-align: center;
  }
  .hour-chip:hover { border-color:var(--green-500); background:var(--green-100); color:var(--green-700); }
  .hour-chip.sel   { border-color:var(--green-500); background:var(--green-500); color:#fff; }

  /* ─── Section label ───────────────────────────────────────────── */
  .sec-label {
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--green-500);
    font-family: var(--font-heading); margin-bottom: 8px;
  }
  .sec-title {
    font-family: var(--font-display);
    font-size: clamp(28px, 3.5vw, 42px);
    font-weight: 400; color: var(--ink);
    letter-spacing: -.02em; line-height: 1.08;
    font-style: italic;
  }
  .sec-title em {
    font-style: normal;
    background: linear-gradient(135deg, var(--green-800), var(--green-500));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  /* ─── Marquee ─────────────────────────────────────────────────── */
  .marquee-track {
    display: flex; gap: 0;
    animation: scrollMarquee 28s linear infinite;
    width: max-content;
  }
  .marquee-track:hover { animation-play-state: paused; }

  /* ─── Review card ─────────────────────────────────────────────── */
  .review-card {
    background: var(--white); border: 1.5px solid var(--border);
    border-radius: var(--radius-xl); padding: 28px;
    transition: all .22s ease;
  }
  .review-card:hover {
    border-color: var(--green-400);
    box-shadow: 0 8px 32px rgba(22,163,74,.10);
    transform: translateY(-3px);
  }

  /* ─── Sport tile ──────────────────────────────────────────────── */
  .sport-tile {
    position: relative; overflow: hidden;
    background: var(--white); border: 1.5px solid var(--border);
    border-radius: var(--radius-xl); padding: 28px 20px 24px;
    text-align: center; cursor: pointer; transition: all .22s cubic-bezier(.16,1,.3,1);
    width: 100%; font-family: inherit; display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .sport-tile:hover {
    border-color: var(--green-500); background: var(--green-100);
    transform: translateY(-5px);
    box-shadow: 0 10px 28px rgba(22,163,74,.14);
  }
  .sport-tile__emoji { font-size: 36px; line-height: 1; }
  .sport-tile__label {
    font-family: var(--font-heading); font-size: 13px; font-weight: 700;
    color: var(--ink); letter-spacing: .02em; text-transform: uppercase;
  }

  /* ─── Step card ───────────────────────────────────────────────── */
  .step-card {
    background: var(--white); border: 1.5px solid var(--border);
    border-radius: var(--radius-xl); padding: 28px 24px;
    transition: all .22s ease;
  }
  .step-card:hover {
    border-color: var(--green-400);
    box-shadow: var(--shadow-md);
    transform: translateY(-4px);
  }

  /* ─── Hero floating cards ─────────────────────────────────────── */
  .hero-floating-card {
    position: absolute;
    background: rgba(255,255,255,.12);
    backdrop-filter: blur(20px) saturate(1.6);
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 18px;
    padding: 14px 18px;
    box-shadow: 0 8px 32px rgba(0,0,0,.28);
    animation: floatCard 5s ease-in-out infinite;
  }

  /* ─── Backdrop ────────────────────────────────────────────────── */
  .gp-backdrop { position: fixed; inset: 0; z-index: 100; }

  /* ─── Mobile sticky ───────────────────────────────────────────── */
  .sticky-cta {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    z-index: 80; padding: 12px 20px 28px;
    background: linear-gradient(to top, rgba(245,242,236,1) 60%, transparent);
  }

  /* ═══════════════════════════════════════════════════════════════
     RESPONSIVE — MOBILE FIXES
  ═══════════════════════════════════════════════════════════════ */

  /* ── Tablet ──────────────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .hero-inner     { grid-template-columns: 1fr !important; }
    .hero-deco      { display: none !important; }
    .sports-grid    { grid-template-columns: repeat(3,1fr) !important; }
    .reviews-grid   { grid-template-columns: repeat(2,1fr) !important; }
    .footer-grid    { grid-template-columns: 1fr 1fr !important; }
    /* Split CTA stacks on tablet */
    .split-cta      { grid-template-columns: 1fr !important; }
    .stat-strip     { grid-template-columns: 1fr !important; }
  }

  /* ── Mobile landscape / large phones ─────────────────────────── */
  @media (max-width: 768px) {
    /* Search pill stacks vertically */
    .search-pill {
      flex-direction: column;
      padding: 10px;
      border-radius: 20px;
      gap: 0;
    }
    .search-field {
      border-right: none;
      border-bottom: 1px solid #eff0ef;
      padding: 12px 14px;
      border-radius: 12px;
      min-height: 60px;
      width: 100%;
    }
    .search-field:last-of-type { border-bottom: none; }
    .search-btn     { width: 100%; border-radius: 12px; height: 52px; margin-top: 6px; }

    .steps-grid     { grid-template-columns: 1fr 1fr !important; }
    .hero-stats     { flex-wrap: wrap; gap: 20px !important; }

    /* Hero padding */
    .hero-inner-pad { padding: 48px 20px 60px !important; }

    /* Split CTA */
    .split-cta      { grid-template-columns: 1fr !important; }
    .split-cta-side { padding: 48px 28px !important; }

    /* Sections */
    .section-pad    { padding: 56px 20px !important; }

    /* Stat strip */
    .stat-strip     { grid-template-columns: 1fr 1fr !important; }

    /* Reviews */
    .reviews-grid   { grid-template-columns: 1fr 1fr !important; }
  }

  /* ── Mobile portrait / small phones ──────────────────────────── */
  @media (max-width: 640px) {
    .sticky-cta     { display: block; }
    .sports-grid    { grid-template-columns: repeat(2,1fr) !important; }
    .reviews-grid   { grid-template-columns: 1fr !important; }
    .footer-grid    { grid-template-columns: 1fr !important; }
    .steps-grid     { grid-template-columns: 1fr !important; }

    .hero-headline  { font-size: clamp(36px, 9vw, 52px) !important; }
    .hero-headline-italic { font-size: clamp(36px, 9vw, 52px) !important; }

    .cta-btns       { flex-direction: column !important; }

    /* Popover full-width anchored to bottom */
    .gp-popover {
      position: fixed !important;
      left: 12px !important;
      right: 12px !important;
      top: auto !important;
      bottom: 12px !important;
      width: auto !important;
      min-width: unset !important;
    }

    /* Nav */
    .nav__links     { display: none; }
    .nav { padding: 0 16px; }

    /* Hero */
    .hero-inner-pad { padding: 40px 16px 72px !important; }
    .hero-badge     { margin-bottom: 20px !important; }
    .hero-desc      { margin-bottom: 28px !important; }
    .hero-stats     { margin-top: 24px !important; gap: 16px !important; }

    /* Search form spacing */
    .search-form    { margin-bottom: 12px !important; }
    .search-pill    { border-radius: 18px; }

    /* Sections */
    .section-pad    { padding: 48px 16px !important; }
    .sec-title      { font-size: clamp(24px, 7vw, 34px) !important; }

    /* Split CTA */
    .split-cta-side { padding: 40px 20px !important; min-height: unset !important; }

    /* Stat strip: all in one column */
    .stat-strip     { grid-template-columns: 1fr !important; }

    /* Filter banner */
    .filter-banner  { padding: 76px 16px 14px !important; }

    /* Marketplace section */
    .marketplace-pad { padding: 48px 16px 80px !important; }

    /* Footer */
    .footer-pad     { padding: 40px 16px 24px !important; }

    /* Marquee items smaller */
    .marquee-item   { padding: 0 18px !important; font-size: 11px !important; }
  }

  /* ── Very small phones ────────────────────────────────────────── */
  @media (max-width: 380px) {
    .sports-grid    { grid-template-columns: repeat(2,1fr) !important; }
    .gp-chip        { padding: 7px 12px; font-size: 12px; }
    .hero-headline  { font-size: 32px !important; }
    .hero-headline-italic { font-size: 32px !important; }
  }
`

// ─── Components ───────────────────────────────────────────────────────────────

function DatePicker({ value, onChange, onClose }: { value: string; onChange: (v:string)=>void; onClose: ()=>void }) {
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
          const isPast = dt < today
          const isToday = dateToStr(dt) === dateToStr(today)
          const isSel  = sel ? dateToStr(dt) === dateToStr(sel) : false
          return (
            <button key={day} type="button" disabled={isPast}
              className={`cal-day${isToday?' today':''}${isSel?' sel':''}`}
              onClick={() => { onChange(dateToStr(dt)); onClose() }}
            >{day}</button>
          )
        })}
      </div>
      {value && (
        <div style={{ padding:'0 20px 14px', textAlign:'right' }}>
          <button type="button" onClick={() => { onChange(''); onClose() }}
            style={{ fontSize:11, color:'#ef4444', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            ✕ Limpiar fecha
          </button>
        </div>
      )}
    </div>
  )
}

function HourPicker({ value, onChange, onClose }: { value:string; onChange:(v:string)=>void; onClose:()=>void }) {
  return (
    <div>
      <div style={{ padding:'16px 18px 10px', borderBottom:'1px solid #f0f4f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ fontFamily:'var(--font-heading)', fontSize:14, fontWeight:700, color:'var(--ink)', letterSpacing:'.03em' }}>Elegí el horario</p>
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

function FadeIn({ children, delay=0, style={} }: { children:React.ReactNode; delay?:number; style?:React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold:.06 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ opacity:vis?1:0, transform:vis?'none':'translateY(24px)', transition:`opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

function FieldCard({ field }: { field: Field }) {
  const router = useRouter()
  const sport  = field.sport ? SPORT_META[field.sport] : null
  return (
    <article className="gp-card" role="button" tabIndex={0}
      onClick={() => router.push(`/reserve/${field.id}`)}
      onKeyDown={e => e.key==='Enter' && router.push(`/reserve/${field.id}`)}
      aria-label={`Reservar ${field.name}`}>
      {/* Image */}
      <div style={{ position:'relative', height:180, background:'linear-gradient(135deg,#134a21,#0a2e15)', overflow:'hidden' }}>
        {field.image
          ? <Image src={field.image} alt={field.name} fill sizes="290px" style={{ objectFit:'cover', transition:'transform .4s ease' }} loading="lazy"/>
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64, opacity:.4 }}>⚽</div>
        }
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.58) 0%, transparent 55%)' }}/>
        {sport && (
          <span style={{ position:'absolute', top:12, left:12, background:sport.bg, color:sport.color, fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, fontFamily:'var(--font-heading)', letterSpacing:'.06em', textTransform:'uppercase' }}>
            {sport.label}
          </span>
        )}
        <div style={{ position:'absolute', bottom:12, left:12, right:12, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#fff', fontFamily:'var(--font-heading)', lineHeight:1.2,
            maxWidth:'70%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {field.name}
          </span>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--green-400)', background:'rgba(0,0,0,.45)', backdropFilter:'blur(8px)', padding:'4px 10px', borderRadius:999, border:'1px solid rgba(74,222,128,.3)', whiteSpace:'nowrap', flexShrink:0 }}>
            {fmt(field.price_day)}
          </span>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding:'14px 16px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <p style={{ fontSize:12, color:'var(--muted)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{field.location}</p>
        </div>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--green-500)', whiteSpace:'nowrap', flexShrink:0, fontFamily:'var(--font-heading)', letterSpacing:'.03em' }}>
          Reservar →
        </span>
      </div>
    </article>
  )
}

function FieldSkeleton() {
  return (
    <div style={{ width:290, borderRadius:24, overflow:'hidden', background:'#fff', border:'1.5px solid var(--border)' }}>
      <div className="gp-skel" style={{ height:180 }}/>
      <div style={{ padding:'14px 16px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        <div className="gp-skel" style={{ height:14, width:'60%' }}/>
        <div className="gp-skel" style={{ height:11, width:'38%' }}/>
      </div>
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onDark }: { onDark: boolean }) {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  const isDark = onDark && !scrolled
  return (
    <nav className={`nav${scrolled ? (onDark ? ' nav--scrolled' : ' nav--light') : ''}`}>
      <div className="nav__logo" onClick={() => router.push('/')}>
        <img
          src="/logo-golplay.svg"
          alt="GolPlay"
          style={{ height: 150, display: 'block', transition: 'opacity .3s' }}
        />
      </div>
      <div className="nav__links">
        <Link href="/reserve" className={`nav__link ${isDark ? 'nav__link--ghost-dark' : 'nav__link--ghost-light'}`}>
          Canchas
        </Link>
        <Link href="/login" className={`nav__link ${isDark ? 'nav__link--ghost-dark' : 'nav__link--ghost-light'}`}>
          Iniciar sesión
        </Link>
        <Link href="/register" className="nav__cta">
          Registrarse
        </Link>
      </div>
    </nav>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()

  const [fieldsByLoc, setFieldsByLoc] = useState<Record<string, Field[]>>({})
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState(false)
  const [showToast, setShowToast]     = useState(false)

  const [localText,  setLocalText]  = useState('')
  const [localDate,  setLocalDate]  = useState('')
  const [localHour,  setLocalHour]  = useState('')
  const [localSport, setLocalSport] = useState('')

  const [showCal,  setShowCal]  = useState(false)
  const [showHour, setShowHour] = useState(false)

  const qText  = (router.query.q     as string) ?? ''
  const qDate  = (router.query.date  as string) ?? ''
  const qHour  = (router.query.hour  as string) ?? ''
  const qSport = (router.query.sport as string) ?? ''
  const hasFilters = !!(qText || qDate || qHour || qSport)

  useEffect(() => {
    setLocalText(qText); setLocalDate(qDate)
    setLocalHour(qHour); setLocalSport(qSport)
  }, [qText, qDate, qHour, qSport])

  useEffect(() => {
    if (router.query.reserva !== 'ok') return
    setShowToast(true)
    const t = setTimeout(() => setShowToast(false), 4500)
    router.replace('/', undefined, { shallow: true })
    return () => clearTimeout(t)
  }, [router.query.reserva])

  useEffect(() => {
    ;(async () => {
      setLoading(true); setLoadError(false)
      try {
        const [{ data: fields, error }, { data: images }] = await Promise.all([
          supabase.from('fields').select('id,name,price_day,location,sport').eq('active', true).order('name'),
          supabase.from('field_images').select('field_id,url,is_main'),
        ])
        if (error || !fields) throw error
        const map = new Map<number, Field>()
        fields.forEach(f => map.set(f.id, { id:f.id, name:f.name, price_day:Number(f.price_day??0), location:f.location??'Sin ubicación', sport:f.sport??null, image:null }))
        images?.forEach(img => {
          const f = map.get(img.field_id)
          if (!f || !img.url) return
          if (img.is_main || f.image === null) f.image = img.url
        })
        const grouped: Record<string, Field[]> = {}
        map.forEach(f => { (grouped[f.location] ??= []).push(f) })
        setFieldsByLoc(grouped)
      } catch { setLoadError(true) }
      finally { setLoading(false) }
    })()
  }, [])

  const filteredLocs = useMemo(() => {
    const r: Record<string, Field[]> = {}
    Object.entries(fieldsByLoc).forEach(([loc, fields]) => {
      const m = fields.filter(f => {
        if (qText && !f.name.toLowerCase().includes(qText.toLowerCase()) && !f.location.toLowerCase().includes(qText.toLowerCase())) return false
        if (qSport && f.sport?.toLowerCase() !== qSport.toLowerCase()) return false
        return true
      })
      if (m.length) r[loc] = m
    })
    return r
  }, [fieldsByLoc, qText, qSport])

  const totalFields   = Object.values(fieldsByLoc).flat().length
  const totalLocs     = Object.keys(fieldsByLoc).length
  const filteredCount = Object.values(filteredLocs).flat().length
  const hasResults    = Object.keys(filteredLocs).length > 0

  const filterSummary = [
    qText  && `"${qText}"`,
    qSport && SPORT_META[qSport]?.label,
    qDate  && formatDateDisplay(qDate),
    qHour  && qHour,
  ].filter(Boolean).join(' · ')

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    const q: Record<string,string> = {}
    if (localText.trim()) q.q     = localText.trim()
    if (localDate)        q.date  = localDate
    if (localHour)        q.hour  = localHour
    if (localSport)       q.sport = localSport
    setShowCal(false); setShowHour(false)
    router.push({ pathname:'/', query:q }, undefined, { shallow:true })
    setTimeout(() => document.getElementById('canchas')?.scrollIntoView({ behavior:'smooth' }), 80)
  }, [localText, localDate, localHour, localSport, router])

  const clearFilters = useCallback(() => {
    setLocalText(''); setLocalDate(''); setLocalHour(''); setLocalSport('')
    router.push('/', undefined, { shallow:true })
  }, [router])

  const scrollToCanchas = () =>
    document.getElementById('canchas')?.scrollIntoView({ behavior:'smooth' })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>GolPlay — Reservá tu cancha en segundos</title>
        <meta name="description" content="Encontrá y reservá canchas de fútbol, pádel, tenis y más. Disponibilidad real, precio claro, sin llamadas."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet"/>
      </Head>

      <style>{CSS}</style>

      <Navbar onDark={!hasFilters} />

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(150deg, #040f06 0%, #071a0c 30%, #0B4D2C 75%, #0f5a32 100%)',
          minHeight: 'clamp(600px, 92vh, 880px)',
          display: 'flex', alignItems: 'center',
          paddingTop: 68,
        }}>
          {/* Grain texture */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, opacity: .45,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
          }}/>

          {/* Background blobs */}
          <div aria-hidden style={{ position:'absolute', top:'-15%', right:'10%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(22,163,74,.10) 0%, transparent 65%)', pointerEvents:'none' }}/>
          <div aria-hidden style={{ position:'absolute', bottom:'-20%', left:'-5%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,.06) 0%, transparent 65%)', pointerEvents:'none' }}/>

          {/* Grid lines overlay */}
          <div aria-hidden style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }}/>

          {/* ── HERO INNER — grid collapses to 1 col on ≤1024px ── */}
          <div className="hero-inner hero-inner-pad" style={{
            maxWidth: 1200, margin: '0 auto', width: '100%',
            display: 'grid', gridTemplateColumns: '1fr 480px',
            gap: 48, alignItems: 'center',
            padding: '72px 32px 80px',
            position: 'relative', zIndex: 1,
          }}>

            {/* ── LEFT: copy + search ── */}
            <div>
              {/* Live badge */}
              <div className="hero-badge" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(74,222,128,.10)', border: '1px solid rgba(74,222,128,.22)',
                borderRadius: 999, padding: '6px 14px 6px 10px', marginBottom: 28,
                animation: 'fadeUp .5s ease both',
              }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', animation:'pulseDot 2s infinite', flexShrink:0 }}/>
                <span style={{ fontSize:11, fontWeight:700, color:'#86efac', letterSpacing:'.09em', fontFamily:'var(--font-heading)' }}>
                  DISPONIBLE EN LATINOAMÉRICA
                </span>
              </div>

              {/* Headline */}
              <h1 className="hero-headline" style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 5.5vw, 76px)',
                fontWeight: 400,
                color: '#fff',
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                marginBottom: 10,
                animation: 'fadeUp .5s .08s ease both',
              }}>
                Tu cancha,
              </h1>
              <h1 className="hero-headline-italic" style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 5.5vw, 76px)',
                fontWeight: 400,
                fontStyle: 'italic',
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                marginBottom: 28,
                background: 'linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'fadeUp .5s .14s ease both',
              }}>
                cuando quieras.
              </h1>

              <p className="hero-desc" style={{
                fontSize: 'clamp(14px, 1.6vw, 17px)',
                color: 'rgba(255,255,255,.5)',
                marginBottom: 32, lineHeight: 1.75, maxWidth: 440,
                fontWeight: 400,
                animation: 'fadeUp .5s .22s ease both',
              }}>
                Fútbol, pádel, tenis y más — disponibilidad real,
                precios claros, <span style={{ color:'rgba(255,255,255,.82)', fontWeight:600 }}>sin una sola llamada</span>.
              </p>

              {/* ─── SEARCH BOX ──────────────────────── */}
              <form className="search-form" onSubmit={handleSearch} style={{ animation:'fadeUp .5s .30s ease both', marginBottom: 18 }}>
                <div className="search-pill" style={{ marginBottom: 14 }}>

                  {/* Text */}
                  <div className="search-field" style={{ flex: '1.4' }}>
                    <span className="search-field__label">Buscar</span>
                    <input
                      type="text" value={localText} onChange={e => setLocalText(e.target.value)}
                      placeholder="Cancha o zona…" className="search-input"
                    />
                  </div>

                  {/* Date */}
                  <div className="search-field" style={{ flex: 1, position:'relative' }}>
                    <span className="search-field__label">Fecha</span>
                    <button type="button" style={{ background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'inherit' }}
                      onClick={() => { setShowCal(v => !v); setShowHour(false) }}>
                      <span className={`search-field__value${!localDate?' placeholder':''}`}>
                        {localDate ? formatDateDisplay(localDate) : 'Elegí un día'}
                      </span>
                    </button>
                    {showCal && (
                      <>
                        <div className="gp-backdrop" onClick={() => setShowCal(false)}/>
                        <div className="gp-popover" style={{ top:'calc(100% + 8px)', left:0, minWidth:295 }}>
                          <DatePicker value={localDate} onChange={setLocalDate} onClose={() => setShowCal(false)}/>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hour */}
                  <div className="search-field" style={{ flex: 1, position:'relative', borderRight:'none' }}>
                    <span className="search-field__label">Hora</span>
                    <button type="button" style={{ background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'inherit' }}
                      onClick={() => { setShowHour(v => !v); setShowCal(false) }}>
                      <span className={`search-field__value${!localHour?' placeholder':''}`}>
                        {localHour || 'Cualquier hora'}
                      </span>
                    </button>
                    {showHour && (
                      <>
                        <div className="gp-backdrop" onClick={() => setShowHour(false)}/>
                        <div className="gp-popover" style={{ top:'calc(100% + 8px)', right:0, width:230 }}>
                          <HourPicker value={localHour} onChange={setLocalHour} onClose={() => setShowHour(false)}/>
                        </div>
                      </>
                    )}
                  </div>

                  <button className="search-btn" type="submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    Buscar
                  </button>
                </div>

                {/* Sport chips */}
                <div className="gp-chips-scroll">
                  {SPORTS.map(s => (
                    <button key={s.value} type="button"
                      className={`gp-chip${localSport === s.value ? ' active' : ''}`}
                      onClick={() => setLocalSport(s.value === localSport ? '' : s.value)}
                      style={{ fontSize:12 }}>
                      <span>{s.emoji}</span>{s.label}
                    </button>
                  ))}
                </div>
              </form>

              {/* Stats */}
              <div className="hero-stats" style={{ display:'flex', gap:28, marginTop:32, animation:'fadeUp .5s .40s ease both', flexWrap:'wrap' }}>
                {[
                  { n: loading ? '—' : `${totalFields}+`, l:'canchas' },
                  { n: loading ? '—' : `${totalLocs}`,    l:'zonas'   },
                  { n: '24/7',                             l:'online'  },
                  { n: '8',                                l:'países'  },
                ].map(s => (
                  <div key={s.l}>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:22, fontWeight:800, color:'#4ade80', lineHeight:1 }}>{s.n}</p>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,.38)', fontWeight:500, marginTop:3 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: floating card stack (hidden on mobile via CSS) ── */}
            <div className="hero-deco" style={{ position:'relative', height:520, display:'flex', alignItems:'center', justifyContent:'center' }}>

              <div className="hero-floating-card" style={{
                width: 260, top: 40, left: 20,
                '--rot': '-4deg',
                animationDelay: '0.3s', animationDuration: '6s',
                padding: '16px',
              } as any}>
                <div style={{ height:110, borderRadius:12, background:'linear-gradient(135deg,#134a21,#1a6b30)', marginBottom:10, overflow:'hidden', position:'relative' }}>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, opacity:.5 }}>⚽</div>
                </div>
                <p style={{ fontFamily:'var(--font-heading)', fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>Canchas Los Pinos</p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>📍 San José · Fútbol 5</p>
              </div>

              <div style={{
                width: 280, position:'relative', zIndex:10,
                background:'rgba(255,255,255,.12)', backdropFilter:'blur(24px) saturate(1.8)',
                border:'1px solid rgba(255,255,255,.22)', borderRadius:22,
                overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.4)',
                animation:'floatCard 5.5s ease-in-out infinite',
                '--rot': '2deg',
              } as any}>
                <div style={{ height:150, background:'linear-gradient(135deg,#15803d,#059669)', position:'relative' }}>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:56, opacity:.25 }}>🏟️</div>
                  <div style={{ position:'absolute', top:12, left:12, background:'rgba(0,0,0,.35)', backdropFilter:'blur(8px)', borderRadius:999, padding:'4px 12px', border:'1px solid rgba(255,255,255,.15)' }}>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:10, fontWeight:700, color:'#4ade80', letterSpacing:'.06em' }}>✓ DISPONIBLE HOY</p>
                  </div>
                </div>
                <div style={{ padding:'14px 16px 16px' }}>
                  <p style={{ fontFamily:'var(--font-heading)', fontSize:15, fontWeight:700, color:'#fff', marginBottom:4 }}>Complejo Deportivo Central</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>📍 Escazú, San José</p>
                    <span style={{ fontSize:13, fontWeight:800, color:'#4ade80', fontFamily:'var(--font-heading)' }}>₡15.000</span>
                  </div>
                  <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(74,222,128,.12)', borderRadius:10, border:'1px solid rgba(74,222,128,.2)', display:'flex', justifyContent:'center' }}>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:12, fontWeight:700, color:'#4ade80' }}>Reservar ahora →</p>
                  </div>
                </div>
              </div>

              <div className="hero-floating-card" style={{
                width: 220, bottom: 60, right: 10,
                '--rot': '5deg',
                animationDelay: '1s', animationDuration: '4.5s',
                padding: '14px 16px',
              } as any}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(74,222,128,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎉</div>
                  <div>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:12, fontWeight:700, color:'#fff' }}>¡Reserva confirmada!</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>hace 2 minutos</p>
                  </div>
                </div>
                <div style={{ height:1, background:'rgba(255,255,255,.08)', marginBottom:8 }}/>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginBottom:2 }}>Cancha</p>
                    <p style={{ fontSize:11, fontWeight:700, color:'#fff' }}>Los Pinos #2</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginBottom:2 }}>Hora</p>
                    <p style={{ fontSize:11, fontWeight:700, color:'#4ade80' }}>18:00</p>
                  </div>
                </div>
              </div>

              <div className="hero-floating-card" style={{
                top: 30, right: 0,
                '--rot': '3deg',
                animationDelay: '1.8s', animationDuration: '7s',
                padding: '12px 16px',
              } as any}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:22 }}>⭐</span>
                  <div>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:16, fontWeight:800, color:'#fff', lineHeight:1 }}>4.9</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.45)' }}>+12.000 reservas</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom wave */}
          <div style={{ position:'absolute', bottom:-2, left:0, right:0 }}>
            <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:'block', width:'100%' }}>
              <path d="M0 64L480 20L960 48L1440 8V64H0Z" fill="#F5F2EC"/>
            </svg>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          FILTER BANNER
      ════════════════════════════════════════════════════════ */}
      {hasFilters && (
        <div className="filter-banner" style={{ paddingTop:68, background:'#fff', borderBottom:'1px solid var(--border)', padding:`80px 32px 14px` }}>
          <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', paddingTop:16 }}>
            <p style={{ fontSize:13, color:'var(--green-700)', fontWeight:700, fontFamily:'var(--font-heading)' }}>
              {loading ? 'Buscando…' : (
                <>{filteredCount} cancha{filteredCount!==1?'s':''} encontrada{filteredCount!==1?'s':''}{filterSummary && <span style={{ fontWeight:500, color:'var(--muted)' }}> para {filterSummary}</span>}</>
              )}
            </p>
            <button onClick={clearFilters}
              style={{ fontSize:12, color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'inherit', padding:'6px 12px', borderRadius:8, transition:'background .14s' }}
              onMouseEnter={e => (e.currentTarget.style.background='#fee2e2')}
              onMouseLeave={e => (e.currentTarget.style.background='none')}>
              ✕ Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MARQUEE
      ════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <div style={{ background:'var(--bone)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'16px 0', overflow:'hidden' }}>
          <div style={{ display:'flex', overflow:'hidden' }}>
            <div className="marquee-track">
              {[...Array(3)].map((_, rep) =>
                ['⚽ Fútbol 5', '🎾 Pádel', '🏀 Básquet', '🎾 Tenis', '🏟️ Multiuso', '⚽ Fútbol 7', '🌎 LATAM', '⚡ Reserva instantánea', '✓ Pago seguro', '📱 Sin llamadas'].map(item => (
                  <span key={`${rep}-${item}`} className="marquee-item" style={{ display:'inline-flex', alignItems:'center', padding:'0 32px', fontSize:13, fontWeight:600, color:'var(--muted)', fontFamily:'var(--font-heading)', letterSpacing:'.04em', textTransform:'uppercase', whiteSpace:'nowrap', borderRight:'1px solid var(--border)' }}>
                    {item}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          CÓMO FUNCIONA
      ════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="section-pad" style={{ background:'var(--bone)', padding:'88px 32px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <FadeIn>
              <p className="sec-label">¿Cómo funciona?</p>
              <h2 className="sec-title" style={{ marginBottom:52, maxWidth:480 }}>
                Del celular a la cancha en <em>4 pasos</em>
              </h2>
            </FadeIn>
            <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              {[
                { n:'01', e:'🔍', t:'Buscá',         d:'Por deporte, zona, fecha u hora. Solo canchas con disponibilidad real.' },
                { n:'02', e:'📅', t:'Elegí horario', d:'Slots libres, precio visible antes de confirmar. Sin sorpresas.' },
                { n:'03', e:'⚡', t:'Confirmá',      d:'Reserva instantánea. Sin formularios largos ni esperas.' },
                { n:'04', e:'⚽', t:'¡Jugá!',         d:'Recibís email de confirmación. Llegás y jugás.' },
              ].map((s, i) => (
                <FadeIn key={s.n} delay={i * 80}>
                  <div className="step-card">
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <span style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:800, color:'var(--green-500)', background:'var(--green-100)', padding:'3px 10px', borderRadius:999, letterSpacing:'.06em' }}>{s.n}</span>
                    </div>
                    <div style={{ fontSize:32, marginBottom:12 }}>{s.e}</div>
                    <h3 style={{ fontFamily:'var(--font-heading)', fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:8, letterSpacing:'.01em' }}>{s.t}</h3>
                    <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.65 }}>{s.d}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          DEPORTES
      ════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="section-pad" style={{ background:'#fff', padding:'80px 32px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <FadeIn>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:40, flexWrap:'wrap', gap:16 }}>
                <div>
                  <p className="sec-label">Deportes</p>
                  <h2 className="sec-title">¿Qué <em>deporte</em> jugás?</h2>
                </div>
                <p style={{ fontSize:13, color:'var(--muted)', maxWidth:260, lineHeight:1.6 }}>
                  Seleccioná tu deporte favorito y encontrá las mejores canchas cerca tuyo.
                </p>
              </div>
            </FadeIn>
            {/* FIX: 3 cols default, 2 cols mobile via sports-grid class */}
            <div className="sports-grid" style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
              {SPORTS.slice(1).map((s, i) => (
                <FadeIn key={s.value} delay={i * 50}>
                  <button className="sport-tile" onClick={() => { setLocalSport(s.value); setTimeout(handleSearch, 0) }}>
                    <span className="sport-tile__emoji">{s.emoji}</span>
                    <span className="sport-tile__label">{s.label}</span>
                  </button>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          MARKETPLACE
      ════════════════════════════════════════════════════════ */}
      <main id="canchas" className="marketplace-pad" style={{ background:'var(--bone)', padding:'72px 32px 88px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>

          {!hasFilters && (
            <FadeIn>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:40, flexWrap:'wrap', gap:16 }}>
                <div>
                  <p className="sec-label">Disponibles ahora</p>
                  <h2 className="sec-title">Encontrá tu <em>lugar de juego</em></h2>
                </div>
              </div>
            </FadeIn>
          )}

          {loading && (
            <>
              {[1,2].map(i => (
                <div key={i} style={{ marginBottom:52 }}>
                  <div className="gp-skel" style={{ height:16, width:200, marginBottom:20 }}/>
                  <div style={{ display:'flex', gap:18 }}>
                    {[1,2,3].map(j => <FieldSkeleton key={j}/>)}
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && loadError && (
            <div style={{ textAlign:'center', padding:'80px 20px' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
              <p style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>No pudimos cargar las canchas</p>
              <p style={{ fontSize:14, color:'var(--muted)' }}>Intentá refrescar la página.</p>
            </div>
          )}

          {!loading && !loadError && !hasResults && (
            <div style={{ textAlign:'center', padding:'80px 20px' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
              <p style={{ fontFamily:'var(--font-heading)', fontSize:22, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>
                {hasFilters ? 'Sin canchas para esos filtros' : 'Aún no hay canchas disponibles'}
              </p>
              <p style={{ fontSize:14, color:'var(--muted)', marginBottom:24 }}>
                {hasFilters ? 'Probá ajustando tu búsqueda.' : 'Volvé pronto.'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} style={{ padding:'11px 28px', background:'var(--green-500)', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontFamily:'var(--font-heading)', fontWeight:700, fontSize:14, letterSpacing:'.03em' }}>
                  Ver todas las canchas
                </button>
              )}
            </div>
          )}

          {!loading && !loadError && hasResults && Object.entries(filteredLocs).map(([loc, fields]) => (
            <section key={loc} style={{ marginBottom:56 }} aria-labelledby={`loc-${loc}`}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <h2 id={`loc-${loc}`} style={{ fontFamily:'var(--font-heading)', fontSize:18, fontWeight:700, color:'var(--ink)', letterSpacing:'.01em' }}>
                  📍 {loc}
                </h2>
                <span style={{ fontSize:11, fontWeight:800, color:'var(--green-700)', background:'var(--green-100)', padding:'3px 10px', borderRadius:999, fontFamily:'var(--font-heading)', letterSpacing:'.04em' }}>
                  {fields.length} {fields.length===1?'cancha':'canchas'}
                </span>
              </div>
              <Swiper className="gp-swiper" modules={[Navigation]} spaceBetween={18} slidesPerView="auto" navigation>
                {fields.map(f => (
                  <SwiperSlide key={f.id}><FieldCard field={f}/></SwiperSlide>
                ))}
              </Swiper>
            </section>
          ))}
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════
          SPLIT CTA — stacks on mobile
      ════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="split-cta" style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
          {/* Dark side */}
          <div className="split-cta-side" style={{
            background:'linear-gradient(140deg, #052e16 0%, #0B4D2C 100%)',
            padding:'72px 56px', display:'flex', flexDirection:'column', justifyContent:'center',
            position:'relative', overflow:'hidden', minHeight: 300,
          }}>
            <div aria-hidden style={{ position:'absolute', top:'-30%', right:'-20%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(74,222,128,.08) 0%, transparent 65%)' }}/>
            <FadeIn>
              <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.12em', color:'rgba(74,222,128,.7)', textTransform:'uppercase', marginBottom:16 }}>Para propietarios</p>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(24px,3.5vw,42px)', fontWeight:400, color:'#fff', lineHeight:1.08, marginBottom:20, fontStyle:'italic' }}>
                Llená tu cancha,<br/>automatizá tus reservas.
              </h2>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', lineHeight:1.7, marginBottom:32, maxWidth:340 }}>
                Miles de jugadores buscando canchas en tu zona. Recibí reservas 24/7 sin levantar el teléfono.
              </p>
              <Link href="/register?type=owner" style={{
                display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px',
                background:'var(--green-400)', color:'var(--green-900)',
                borderRadius:14, fontSize:14, fontWeight:800,
                fontFamily:'var(--font-heading)', textDecoration:'none', letterSpacing:'.03em',
                boxShadow:'0 4px 20px rgba(74,222,128,.4)', transition:'all .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='#86efac'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--green-400)'; e.currentTarget.style.transform='' }}>
                Sumar mi complejo →
              </Link>
            </FadeIn>
          </div>
          {/* Light side */}
          <div className="split-cta-side" style={{ background:'#fff', padding:'72px 56px', display:'flex', flexDirection:'column', justifyContent:'center', minHeight: 300 }}>
            <FadeIn delay={120}>
              <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.12em', color:'var(--green-500)', textTransform:'uppercase', marginBottom:16 }}>Para jugadores</p>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(24px,3.5vw,42px)', fontWeight:400, color:'var(--ink)', lineHeight:1.08, marginBottom:20, fontStyle:'italic' }}>
                Jugá más,<br/>organizá menos.
              </h2>
              <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.7, marginBottom:32, maxWidth:340 }}>
                Sin llamadas, sin incertidumbre. Encontrá la cancha perfecta para vos y tu equipo en segundos.
              </p>
              <button onClick={scrollToCanchas} style={{
                display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px',
                background:'var(--ink)', color:'#fff',
                border:'none', borderRadius:14, fontSize:14, fontWeight:800,
                fontFamily:'var(--font-heading)', cursor:'pointer', letterSpacing:'.03em',
                boxShadow:'0 4px 20px rgba(0,0,0,.18)', transition:'all .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='#2d3730'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--ink)'; e.currentTarget.style.transform='' }}>
                Buscar canchas →
              </button>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          STATS + REVIEWS
      ════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="section-pad" style={{ background:'var(--bone)', padding:'88px 32px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>

            {/* Stat strip — 3 cols desktop, 2 cols tablet, 1 col mobile */}
            <FadeIn>
              <div className="stat-strip" style={{
                display:'grid', gridTemplateColumns:'repeat(3,1fr)',
                gap:2, background:'var(--border)', borderRadius:20,
                overflow:'hidden', marginBottom:64,
              }}>
                {[
                  { n:'+12.000', l:'Reservas realizadas', sub:'en toda LATAM' },
                  { n:'4.9 ★',   l:'Valoración promedio', sub:'de +3.000 reseñas' },
                  { n:'8',       l:'Países activos',       sub:'y creciendo' },
                ].map(s => (
                  <div key={s.l} style={{ background:'var(--white)', padding:'28px 20px', textAlign:'center' }}>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:32, fontWeight:800, color:'var(--green-500)', marginBottom:4, letterSpacing:'-0.02em' }}>{s.n}</p>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:3 }}>{s.l}</p>
                    <p style={{ fontSize:11, color:'var(--muted)' }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn>
              <p className="sec-label" style={{ marginBottom:8 }}>Testimonios</p>
              <h2 className="sec-title" style={{ marginBottom:40 }}>Lo que dicen <em>nuestros jugadores</em></h2>
            </FadeIn>

            {/* Reviews — 3 cols desktop, 2 cols tablet, 1 col mobile */}
            <div className="reviews-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {[
                { name:'Andrés M.', loc:'Ciudad de México', stars:5, text:'Reservé en 2 minutos. Llegué, jugué y no tuve que hablar con nadie. Exactamente lo que necesitaba.' },
                { name:'Sofía V.',  loc:'Bogotá, Colombia', stars:5, text:'Los horarios son reales. Antes reservé en otro lado y la cancha ya estaba ocupada. Acá nunca pasa eso.' },
                { name:'Martín F.', loc:'Buenos Aires', stars:5, text:'Encontré una cancha de pádel cerca que no conocía. La reservé en el celular mientras esperaba el bus.' },
              ].map((r, i) => (
                <FadeIn key={r.name} delay={i * 80}>
                  <div className="review-card">
                    <div style={{ display:'flex', gap:2, marginBottom:14 }}>
                      {Array.from({length:r.stars}).map((_,j) => (
                        <span key={j} style={{ color:'#fbbf24', fontSize:14 }}>★</span>
                      ))}
                    </div>
                    <p style={{ fontSize:14, color:'var(--ink)', lineHeight:1.75, marginBottom:20, fontStyle:'italic', fontFamily:'var(--font-display)', fontWeight:400 }}>"{r.text}"</p>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff', background:'linear-gradient(135deg,var(--green-500),#059669)' }}>
                        {r.name[0]}
                      </div>
                      <div>
                        <p style={{ fontFamily:'var(--font-heading)', fontSize:13, fontWeight:700, color:'var(--ink)' }}>{r.name}</p>
                        <p style={{ fontSize:11, color:'var(--muted)' }}>{r.loc}</p>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="section-pad" style={{
          background:'linear-gradient(150deg,#040f06 0%,#0B4D2C 60%,#134a21 100%)',
          padding:'100px 32px', textAlign:'center',
          position:'relative', overflow:'hidden',
        }}>
          <div aria-hidden style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize:'48px 48px' }}/>
          <div aria-hidden style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(74,222,128,.08) 0%,transparent 65%)' }}/>
          <div style={{ maxWidth:580, margin:'0 auto', position:'relative', zIndex:1 }}>
            <FadeIn>
              <p style={{ fontFamily:'var(--font-heading)', fontSize:11, fontWeight:700, letterSpacing:'.12em', color:'rgba(74,222,128,.6)', textTransform:'uppercase', marginBottom:20 }}>¿Listo para jugar?</p>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(32px,5.5vw,60px)', fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.05, marginBottom:18, fontStyle:'italic' }}>
                Tu próximo partido<br/>empieza acá.
              </h2>
              <p style={{ fontSize:16, color:'rgba(255,255,255,.48)', marginBottom:44, lineHeight:1.75 }}>
                Encontrá tu cancha, elegí el horario<br/>y reservá en segundos.
              </p>
              <div className="cta-btns" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={scrollToCanchas} style={{
                  display:'inline-flex', alignItems:'center', gap:10,
                  padding:'17px 36px', borderRadius:16, background:'#4ade80',
                  color:'#052e16', border:'none', fontSize:16, fontWeight:800,
                  cursor:'pointer', fontFamily:'var(--font-heading)', letterSpacing:'.03em',
                  boxShadow:'0 4px 28px rgba(74,222,128,.45)', transition:'all .2s',
                  width: '100%', maxWidth: 280, justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='#86efac'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 36px rgba(74,222,128,.55)' }}
                onMouseLeave={e => { e.currentTarget.style.background='#4ade80'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 28px rgba(74,222,128,.45)' }}>
                  🔍 Buscar canchas
                </button>
                <Link href="/register" style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'17px 32px',
                  borderRadius:16, background:'rgba(255,255,255,.07)',
                  color:'rgba(255,255,255,.72)', border:'1px solid rgba(255,255,255,.15)',
                  fontSize:15, fontWeight:600, textDecoration:'none',
                  fontFamily:'var(--font-body)', transition:'all .2s',
                  width: '100%', maxWidth: 280,
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.14)'; e.currentTarget.style.borderColor='rgba(255,255,255,.3)'; e.currentTarget.style.color='#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,.15)'; e.currentTarget.style.color='rgba(255,255,255,.72)' }}>
                  Crear cuenta gratis
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer className="footer-pad" style={{ background:'#060f07', padding:'56px 32px 28px' }}>
        <div className="footer-grid" style={{
          maxWidth:1100, margin:'0 auto',
          display:'grid', gridTemplateColumns:'1.8fr 1fr 1fr',
          gap:48, paddingBottom:40,
          borderBottom:'1px solid rgba(255,255,255,.05)', marginBottom:24,
        }}>
          {/* Brand */}
          <div>
            <img src="/logo-golplay.svg" alt="GolPlay" style={{ height:80, display:'block', marginBottom:16 }}/>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.3)', lineHeight:1.8, maxWidth:280 }}>
              Marketplace de canchas deportivas en Latinoamérica. Reservá donde quieras, cuando quieras.
            </p>
          </div>

          <nav>
            <p style={{ fontFamily:'var(--font-heading)', fontSize:10, fontWeight:700, letterSpacing:'.10em', color:'rgba(255,255,255,.2)', textTransform:'uppercase', marginBottom:16 }}>Info</p>
            {[{href:'/terms',l:'Términos de uso'},{href:'/privacy',l:'Privacidad'},{href:'/register',l:'Registrar complejo'},{href:'/login',l:'Iniciar sesión'}].map(({href,l}) => (
              <Link key={href} href={href} style={{ display:'block', fontSize:13, color:'rgba(255,255,255,.4)', textDecoration:'none', marginBottom:11, transition:'color .15s', fontFamily:'var(--font-body)' }}
                onMouseEnter={e => (e.currentTarget.style.color='#4ade80')}
                onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,.4)')}>
                {l}
              </Link>
            ))}
          </nav>

          <div>
            <p style={{ fontFamily:'var(--font-heading)', fontSize:10, fontWeight:700, letterSpacing:'.10em', color:'rgba(255,255,255,.2)', textTransform:'uppercase', marginBottom:16 }}>¿Sos dueño?</p>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.3)', lineHeight:1.7, marginBottom:20 }}>
              Recibí reservas automáticas 24/7. Sin complicaciones.
            </p>
            <Link href="/register?type=owner" style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'10px 18px', background:'var(--green-500)', color:'#fff',
              borderRadius:12, fontSize:13, fontWeight:700,
              fontFamily:'var(--font-heading)', textDecoration:'none',
              letterSpacing:'.03em', transition:'all .15s',
              boxShadow:'0 2px 12px rgba(22,163,74,.35)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--green-700)'; e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--green-500)'; e.currentTarget.style.transform='' }}>
              Sumar mi cancha →
            </Link>
          </div>
        </div>
        <p style={{ textAlign:'center', fontSize:12, color:'rgba(255, 255, 255, 0.82)', fontFamily:'var(--font-body)' }}>
          © {new Date().getFullYear()} GolPlay · Todos los derechos reservados
        </p>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="sticky-cta">
        <button onClick={scrollToCanchas} style={{
          width:'100%', padding:'16px',
          background:'linear-gradient(135deg,var(--green-500),var(--green-700))',
          color:'#fff', border:'none', borderRadius:18,
          fontFamily:'var(--font-heading)', fontSize:15, fontWeight:700,
          letterSpacing:'.03em',
          boxShadow:'0 4px 20px rgba(22,163,74,.45)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer',
        }}>
          🔍 Buscar canchas disponibles
        </button>
      </div>

      {/* Toast */}
      {showToast && (
        <div role="status" aria-live="polite" style={{
          position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
          background:'var(--ink)', color:'#fff', padding:'14px 24px', borderRadius:16,
          fontWeight:700, fontSize:15, boxShadow:'0 8px 40px rgba(0,0,0,.32)',
          zIndex:9999, display:'flex', alignItems:'center', gap:10,
          whiteSpace:'nowrap', animation:'toastIn .3s ease',
          fontFamily:'var(--font-heading)', letterSpacing:'.02em',
          border:'1px solid rgba(255,255,255,.08)',
        }}>
          🎉 ¡Reserva confirmada! Revisá tu correo.
        </div>
      )}
    </>
  )
}
