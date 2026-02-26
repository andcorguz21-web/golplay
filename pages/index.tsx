/**
 * GolPlay — pages/index.tsx  v6.0 "Rediseño LATAM"
 *
 * Rediseño completo mobile-first.
 * - Datos reales de Supabase (fields + field_images)
 * - Sin QR ni WhatsApp en el flujo, solo confirmación por correo
 * - Modelo de negocio: comisión al complejo ($1/reserva), gratis para jugadores
 * - Logo desde /logo-golplay.svg
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
import { Navigation } from 'swiper/modules'
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
  { value: '',         emoji: '🏟️', label: 'Todos'    },
  { value: 'futbol5',  emoji: '⚽',  label: 'Fútbol 5' },
  { value: 'futbol7',  emoji: '⚽',  label: 'Fútbol 7' },
  { value: 'padel',    emoji: '🎾',  label: 'Pádel'    },
  { value: 'tenis',    emoji: '🎾',  label: 'Tenis'    },
  { value: 'multiuso', emoji: '🏟️',  label: 'Multiuso' },
  { value: 'basquet',  emoji: '🏀',  label: 'Básquet'  },
]

const SPORT_META: Record<string, { label: string; color: string; bg: string }> = {
  futbol5:  { label: 'Fútbol 5',  color: '#166534', bg: '#dcfce7' },
  futbol7:  { label: 'Fútbol 7',  color: '#14532d', bg: '#bbf7d0' },
  padel:    { label: 'Pádel',     color: '#155e75', bg: '#cffafe' },
  tenis:    { label: 'Tenis',     color: '#854d0e', bg: '#fef9c3' },
  multiuso: { label: 'Multiuso',  color: '#4c1d95', bg: '#ede9fe' },
  basquet:  { label: 'Básquet',   color: '#9a3412', bg: '#ffedd5' },
}

const LATAM_COUNTRIES = [
  { code: 'CR', flag: '🇨🇷', name: 'Costa Rica', fields: 7  },
  { code: 'MX', flag: '🇲🇽', name: 'México',     fields: 'Explorando' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia',   fields: 'Explorando'  },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina',  fields: 'Explorando'  },
  { code: 'CL', flag: '🇨🇱', name: 'Chile',      fields: 'Explorando'  },
  { code: 'PE', flag: '🇵🇪', name: 'Perú',       fields: 'Explorando'  },
  { code: 'UY', flag: '🇺🇾', name: 'Uruguay',    fields: 'Explorando'  },
  { code: 'PA', flag: '🇵🇦', name: 'Panamá',     fields: 'Explorando'  },
]

const HOUR_SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
]

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n > 0 ? `₡${n.toLocaleString('es-CR')}` : 'Consultar'
const dateToStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const strToDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const formatDateShort = (s: string) => {
  if (!s) return ''
  const d = strToDate(s)
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)}`
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

:root {
  --ink:   #0a0f0d;
  --ink2:  #1a2420;
  --muted: #6e7a72;
  --faint: #b8c2bc;
  --bone:  #f2f0eb;
  --white: #ffffff;
  --bd:    #e2e6e0;
  --bd2:   #d1d9cd;

  --g9: #021008;
  --g8: #062918;
  --g7: #0d4f28;
  --g6: #16a34a;
  --g5: #22c55e;
  --g4: #4ade80;
  --g3: #86efac;
  --g1: #dcfce7;
  --g0: #f0fdf4;

  --dark:  #080e0a;
  --dark2: #101810;
  --dark3: #172214;

  --r-sm: 10px;
  --r-md: 14px;
  --r-lg: 20px;
  --r-xl: 26px;

  --sh-xs: 0 1px 3px rgba(0,0,0,.05),0 3px 10px rgba(0,0,0,.06);
  --sh-sm: 0 2px 8px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.07);
  --sh-md: 0 4px 16px rgba(0,0,0,.10),0 16px 40px rgba(0,0,0,.09);
  --sh-lg: 0 8px 32px rgba(0,0,0,.14),0 24px 64px rgba(0,0,0,.11);

  --font-d: 'Syne', system-ui, sans-serif;
  --font-u: 'DM Sans', system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font-u);
  background: var(--bone);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
::selection { background: var(--g4); color: var(--g9); }

/* ── Animations ──────────────────────────────────────────────── */
@keyframes fadeUp    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes pulseDot  { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.5)} 50%{box-shadow:0 0 0 7px rgba(74,222,128,0)} }
@keyframes waPulse  { 0%,100%{box-shadow:0 4px 22px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.3)} 50%{box-shadow:0 4px 22px rgba(37,211,102,.55),0 0 0 10px rgba(37,211,102,0)} }
@keyframes marqueeGo { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

/* ── WhatsApp FAB ────────────────────────────────────────────── */
.wa-fab {
  position:fixed; bottom:clamp(76px,12vw,90px); right:clamp(14px,4vw,24px);
  width:54px; height:54px; border-radius:50%; z-index:8900;
  background:linear-gradient(135deg,#25d366,#128c7e);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 22px rgba(37,211,102,.45);
  animation:waPulse 3s ease infinite;
  cursor:pointer; border:none; text-decoration:none;
  transition:transform .18s ease;
}
.wa-fab:hover { transform:scale(1.1) translateY(-2px); }
.wa-fab:active { transform:scale(.95); }
@keyframes sheetUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes toastIn   { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
@keyframes floatY    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes popIn     { from{opacity:0;transform:scale(.97) translateY(-4px)} to{opacity:1;transform:none} }

/* ── Scrollbar ───────────────────────────────────────────────── */
::-webkit-scrollbar       { width:5px; height:5px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:var(--bd2); border-radius:99px; }

/* ── Navbar ──────────────────────────────────────────────────── */
.nav {
  position:fixed; top:0; left:0; right:0; z-index:90;
  height:62px; padding:0 clamp(16px,4vw,40px);
  display:flex; align-items:center; justify-content:space-between;
  transition:all .3s ease;
}
.nav--transparent { background:transparent; }
.nav--scrolled {
  background:rgba(8,14,10,.93);
  backdrop-filter:blur(24px) saturate(1.5);
  border-bottom:1px solid rgba(255,255,255,.06);
}
.nav--light {
  background:rgba(242,240,235,.97);
  backdrop-filter:blur(20px);
  border-bottom:1px solid var(--bd);
}
.nav__logo { display:flex; align-items:center; height:38px; cursor:pointer; }
.nav__logo img { height:36px; width:auto; display:block; }
.nav__links { display:flex; align-items:center; gap:4px; }
.nav__link {
  padding:7px 13px; border-radius:var(--r-sm);
  font-size:13.5px; font-weight:500; text-decoration:none; transition:all .14s;
}
.nav__link--dk  { color:rgba(255,255,255,.65); }
.nav__link--dk:hover { color:#fff; background:rgba(255,255,255,.09); }
.nav__link--lt  { color:var(--ink2); }
.nav__link--lt:hover { background:rgba(0,0,0,.05); }
.nav__cta {
  padding:8px 18px; border-radius:var(--r-sm);
  font-size:13.5px; font-weight:700;
  background:var(--g6); color:#fff; text-decoration:none;
  box-shadow:0 2px 10px rgba(22,163,74,.3); transition:all .14s;
}
.nav__cta:hover { background:var(--g7); transform:translateY(-1px); }
.nav__mcta {
  display:none; padding:8px 15px; border-radius:var(--r-sm);
  font-size:13px; font-weight:700;
  background:var(--g6); color:#fff; text-decoration:none;
}

/* ── Hero ────────────────────────────────────────────────────── */
.hero {
  min-height:100svh;
  background:var(--dark);
  position:relative; overflow:hidden;
  display:flex; flex-direction:column;
  padding-top:62px;
}
.hero__grid-lines {
  position:absolute; inset:0;
  background-image:
    repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.04) 59px,rgba(255,255,255,.04) 60px),
    repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,.04) 59px,rgba(255,255,255,.04) 60px);
}
.hero__circle {
  position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%);
  width:min(440px,90vw); height:min(440px,90vw);
  border-radius:50%;
  border:1px solid rgba(74,222,128,.06);
  pointer-events:none;
}
.hero__circle::before {
  content:''; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%);
  width:28px; height:28px; border-radius:50%;
  background:rgba(74,222,128,.06); border:1px solid rgba(74,222,128,.14);
}
.hero__glow {
  position:absolute; top:20%; left:50%;
  transform:translate(-50%,-50%);
  width:700px; height:450px; border-radius:50%;
  background:radial-gradient(ellipse, rgba(22,163,74,.11) 0%, transparent 70%);
  pointer-events:none;
}

.hero__content {
  position:relative; z-index:2;
  padding:36px 20px 20px;
  flex:1; display:flex; flex-direction:column; justify-content:center;
  width:100%; max-width:540px; margin:0 auto;
}

/* Live badge */
.live-badge {
  display:inline-flex; align-items:center; gap:6px;
  background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.22);
  border-radius:999px; padding:5px 12px; margin-bottom:20px;
  width:fit-content; animation:fadeIn .5s ease both;
}
.live-badge__dot {
  width:6px; height:6px; border-radius:50%; background:var(--g4);
  animation:pulseDot 2s infinite; flex-shrink:0;
}
.live-badge__text {
  font-size:10px; font-weight:700; color:rgba(74,222,128,.88);
  letter-spacing:.08em; text-transform:uppercase;
}

/* Headline */
.hero__h1 {
  font-family:var(--font-d);
  font-size:clamp(40px,11vw,68px);
  font-weight:800; line-height:.92; letter-spacing:-.03em;
  color:#fff; margin-bottom:6px;
}
.hero__h1-accent {
  display:block;
  background:linear-gradient(110deg,var(--g4) 0%,#34d399 60%,#22d3ee 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text;
}
.hero__sub {
  font-size:clamp(13px,3.5vw,15px); color:rgba(255,255,255,.42);
  line-height:1.7; margin-bottom:28px; max-width:340px;
}
.hero__sub strong { color:rgba(255,255,255,.72); font-weight:600; }

/* ── Search card ─────────────────────────────────────────────── */
.search-card {
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1);
  border-radius:var(--r-xl);
  padding:14px;
  backdrop-filter:blur(20px);
  margin-bottom:18px;
}
.search-card__sports {
  display:flex; gap:5px; margin-bottom:12px;
  overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
}
.search-card__sports::-webkit-scrollbar { display:none; }
.sc-chip {
  display:inline-flex; align-items:center; gap:4px;
  padding:5px 11px; border-radius:999px; white-space:nowrap; flex-shrink:0;
  border:1.5px solid rgba(255,255,255,.1); background:transparent;
  font-family:var(--font-u); font-size:12px; font-weight:600;
  color:rgba(255,255,255,.5); cursor:pointer; transition:all .14s;
}
.sc-chip:hover, .sc-chip.on {
  border-color:var(--g5); background:rgba(34,197,94,.12); color:var(--g4);
}
.search-fields { display:flex; flex-direction:column; gap:7px; }
.sf {
  display:flex; align-items:center; gap:10px;
  background:rgba(255,255,255,.07); border:1.5px solid rgba(255,255,255,.1);
  border-radius:var(--r-md); padding:11px 13px;
  cursor:pointer; transition:all .14s;
}
.sf:hover, .sf:focus-within { border-color:rgba(74,222,128,.4); background:rgba(74,222,128,.06); }
.sf__icon { width:15px; height:15px; flex-shrink:0; opacity:.45; }
.sf__lbl { font-size:9px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:rgba(255,255,255,.32); margin-bottom:2px; }
.sf__val { font-size:13px; font-weight:500; color:rgba(255,255,255,.45); }
.sf__val.filled { color:#fff; font-weight:600; }
.sf input {
  background:transparent; border:none; outline:none;
  font-family:var(--font-u); font-size:13px; font-weight:500;
  color:#fff; width:100%;
}
.sf input::placeholder { color:rgba(255,255,255,.32); }
.search-cta {
  width:100%; padding:13px; margin-top:9px;
  background:linear-gradient(135deg,var(--g5),#16a34a);
  border:none; border-radius:var(--r-md);
  font-family:var(--font-d); font-size:15px; font-weight:800;
  color:var(--dark); cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:7px;
  transition:all .16s; letter-spacing:-.01em;
  box-shadow:0 4px 22px rgba(34,197,94,.3);
}
.search-cta:hover { transform:translateY(-1px); box-shadow:0 6px 28px rgba(34,197,94,.42); }
.search-cta:active { transform:none; }

/* ── Trust strip ─────────────────────────────────────────────── */
.trust-strip {
  position:relative; z-index:2;
  display:flex; justify-content:center; align-items:center;
  gap:0; padding:0 20px 32px;
  flex-wrap:nowrap;
}
.trust-item { text-align:center; flex:1; }
.trust-item__n {
  font-family:var(--font-d); font-size:clamp(22px,5vw,30px);
  font-weight:800; color:var(--g4); line-height:1; letter-spacing:-.02em;
}
.trust-item__l { font-size:10px; color:rgba(255,255,255,.3); font-weight:500; margin-top:3px; }
.trust-sep { width:1px; height:36px; background:rgba(255,255,255,.08); flex-shrink:0; }

/* ── Section helpers ─────────────────────────────────────────── */
.sp-sec { padding:clamp(52px,7vw,88px) clamp(16px,4vw,40px); }
.sec-inner { max-width:1100px; margin:0 auto; }
.eyebrow {
  display:inline-flex; align-items:center; gap:7px;
  font-size:10px; font-weight:700; letter-spacing:.12em;
  text-transform:uppercase; color:var(--g6); margin-bottom:10px;
}
.eyebrow::before {
  content:''; display:block; width:16px; height:2px;
  background:var(--g5); border-radius:99px; flex-shrink:0;
}
.eyebrow--lt { color:var(--g4); }
.eyebrow--lt::before { background:var(--g4); }
.h2 {
  font-family:var(--font-d);
  font-size:clamp(26px,6vw,42px);
  font-weight:800; color:var(--ink);
  line-height:1.0; letter-spacing:-.03em;
}
.h2 em { font-style:italic; color:var(--g6); }
.h2--lt { color:#fff; }
.h2--lt em { color:var(--g4); }

/* ── Marquee banner ──────────────────────────────────────────── */
.mqw  { display:flex; animation:marqueeGo 26s linear infinite; width:max-content; }
.mqw:hover { animation-play-state:paused; }
.mqi  {
  display:inline-flex; align-items:center; gap:8px;
  padding:0 26px; font-size:11px; font-weight:700;
  color:var(--muted); letter-spacing:.06em; text-transform:uppercase;
  white-space:nowrap; border-right:1px solid var(--bd);
}

/* ── Field card ──────────────────────────────────────────────── */
.gp-card {
  width:260px; background:var(--white); border-radius:var(--r-xl);
  overflow:hidden; cursor:pointer; border:1.5px solid var(--bd);
  box-shadow:var(--sh-xs);
  transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s, border-color .22s;
  display:block; outline:none; text-decoration:none;
  scroll-snap-align:start; flex-shrink:0;
}
.gp-card:hover { transform:translateY(-6px) scale(1.01); box-shadow:var(--sh-lg); border-color:var(--g4); }
.gp-card:focus-visible { outline:2px solid var(--g6); outline-offset:3px; }

/* ── Skeleton ────────────────────────────────────────────────── */
.sk {
  background:linear-gradient(90deg,#eaede8 25%,#f4f6f2 50%,#eaede8 75%);
  background-size:400% 100%; animation:shimmer 1.6s infinite; border-radius:8px;
}

/* ── Swiper ──────────────────────────────────────────────────── */
.gp-swiper { overflow:visible!important; }
.gp-swiper .swiper-slide { width:auto!important; }
.gp-swiper .swiper-button-next,
.gp-swiper .swiper-button-prev {
  color:var(--g6)!important; background:var(--white);
  width:32px!important; height:32px!important;
  border-radius:50%; box-shadow:var(--sh-sm);
  border:1.5px solid var(--bd); top:34%!important;
}
.gp-swiper .swiper-button-next::after,
.gp-swiper .swiper-button-prev::after { font-size:10px!important; font-weight:900!important; }
.gp-swiper .swiper-button-disabled { opacity:.15!important; }

/* ── Step card ───────────────────────────────────────────────── */
.step {
  background:var(--white); border:1.5px solid var(--bd);
  border-radius:var(--r-xl); padding:24px 20px; transition:all .2s ease;
  display:flex; gap:16px; align-items:flex-start;
}
.step:hover { border-color:var(--g4); box-shadow:var(--sh-md); transform:translateX(4px); }
.step__num {
  width:38px; height:38px; border-radius:11px; flex-shrink:0;
  background:var(--g1); border:1.5px solid rgba(22,163,74,.2);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-d); font-size:15px; font-weight:800; color:var(--g7);
}
.step__title { font-family:var(--font-d); font-size:15px; font-weight:800; color:var(--ink); margin-bottom:5px; }
.step__desc  { font-size:13px; color:var(--muted); line-height:1.65; }
.step__badge {
  margin-top:7px; display:inline-flex; align-items:center; gap:4px;
  background:#fef9c3; border-radius:6px; padding:3px 8px;
  font-size:10px; font-weight:700; color:#854d0e;
}

/* ── Review card ─────────────────────────────────────────────── */
.review {
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08);
  border-radius:var(--r-xl); padding:18px; width:250px; flex-shrink:0;
}
.review__stars { font-size:11px; margin-bottom:8px; letter-spacing:1px; color:#fbbf24; }
.review__text  { font-size:13px; color:rgba(255,255,255,.55); line-height:1.65; margin-bottom:12px; font-style:italic; }
.review__av {
  width:28px; height:28px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:#fff;
  background:linear-gradient(135deg,var(--g6),#059669);
}

/* ── Country card ────────────────────────────────────────────── */
.cc {
  background:var(--white); border:1.5px solid var(--bd);
  border-radius:var(--r-lg); padding:16px 10px;
  cursor:pointer; transition:all .18s ease;
  display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center;
}
.cc:hover { border-color:var(--g4); box-shadow:var(--sh-md); transform:translateY(-4px); }

/* ── Owner card ──────────────────────────────────────────────── */
.owner-card {
  background:linear-gradient(150deg,#0d1f10 0%,#0a3018 60%,#062a12 100%);
  border:1px solid rgba(74,222,128,.12);
  border-radius:var(--r-xl); padding:32px 24px;
  position:relative; overflow:hidden;
}
.owner-card::before {
  content:''; position:absolute; top:-40%; right:-20%;
  width:280px; height:280px; border-radius:50%;
  background:radial-gradient(circle,rgba(22,163,74,.1) 0%,transparent 70%);
  pointer-events:none;
}
.owner-feat {
  display:flex; align-items:center; gap:10px;
  font-size:13px; color:rgba(255,255,255,.62); font-weight:500;
}
.owner-feat__icon {
  width:26px; height:26px; border-radius:8px;
  background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.15);
  display:flex; align-items:center; justify-content:center;
  font-size:13px; flex-shrink:0;
}
.owner-cta {
  display:inline-flex; align-items:center; justify-content:center; gap:7px;
  width:100%; padding:13px;
  background:var(--g5); color:var(--dark); border:none; border-radius:var(--r-md);
  font-family:var(--font-d); font-size:14px; font-weight:800;
  cursor:pointer; text-decoration:none; transition:all .15s;
  box-shadow:0 4px 20px rgba(34,197,94,.25); letter-spacing:-.01em;
}
.owner-cta:hover { background:var(--g4); transform:translateY(-1px); }

/* ── Bottom sheet ────────────────────────────────────────────── */
.bs-overlay {
  position:fixed; inset:0; z-index:9000;
  background:rgba(0,0,0,.56); animation:fadeIn .22s ease;
  backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
}
.bs {
  position:fixed; bottom:0; left:0; right:0; z-index:9001;
  background:var(--white);
  border-radius:24px 24px 0 0;
  box-shadow:0 -12px 60px rgba(0,0,0,.18);
  animation:sheetUp .3s cubic-bezier(.2,1,.3,1);
  overflow:hidden;
  padding-bottom:env(safe-area-inset-bottom,0px);
  max-height:75vh; overflow-y:auto; overscroll-behavior:contain;
}
.bs__handle { display:flex; justify-content:center; padding:10px 0 2px; }
.bs__bar    { width:40px; height:4px; border-radius:99px; background:#d1d5db; }
.bs__head   {
  display:flex; align-items:center; justify-content:space-between;
  padding:8px 18px 14px; border-bottom:1px solid var(--bd);
}
.bs__title { font-family:var(--font-d); font-size:16px; font-weight:800; color:var(--ink); }
.bs__close {
  width:30px; height:30px; border-radius:50%;
  background:var(--bone); border:none; cursor:pointer;
  font-size:13px; color:var(--muted); display:flex;
  align-items:center; justify-content:center; transition:all .12s;
  font-weight:700;
}
.bs__close:hover { background:#e5e7eb; color:var(--ink); }

/* ── Calendar ────────────────────────────────────────────────── */
.cal-hd { display:flex; align-items:center; justify-content:space-between; padding:14px 18px 8px; }
.cal-month { font-size:15px; font-weight:800; color:var(--ink); letter-spacing:-.01em; }
.cal-nav {
  width:32px; height:32px; border-radius:50%;
  border:1.5px solid var(--bd); background:none;
  cursor:pointer; font-size:14px; color:var(--muted);
  display:flex; align-items:center; justify-content:center; transition:all .12s;
}
.cal-nav:hover { border-color:var(--g6); color:var(--g6); background:var(--g0); }
.cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; padding:4px 12px 14px; }
.cal-dow  { text-align:center; font-size:10px; font-weight:700; color:var(--faint); padding:4px 0 8px; letter-spacing:.04em; }
.cal-day  {
  aspect-ratio:1; display:flex; align-items:center; justify-content:center;
  border-radius:50%; font-size:13px; font-weight:500;
  cursor:pointer; border:none; background:none; color:var(--ink); transition:all .1s;
}
.cal-day:hover:not(:disabled) { background:var(--g1); color:var(--g7); font-weight:600; }
.cal-day.today { color:var(--g6); font-weight:800; background:var(--g0); }
.cal-day.sel   { background:var(--g6)!important; color:#fff!important; font-weight:700; box-shadow:0 2px 8px rgba(22,163,74,.32); }
.cal-day:disabled { color:#d1d5db; cursor:default; }

/* ── Hour picker ─────────────────────────────────────────────── */
.h-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; padding:14px 14px 18px; }
.h-chip {
  padding:12px 6px; border-radius:12px;
  border:1.5px solid var(--bd); background:none;
  cursor:pointer; font-family:var(--font-u); font-size:13px; font-weight:600;
  color:var(--ink); transition:all .1s; text-align:center;
}
.h-chip:hover { border-color:var(--g6); background:var(--g0); color:var(--g7); }
.h-chip.sel   { border-color:var(--g6); background:var(--g6); color:#fff; box-shadow:0 2px 8px rgba(22,163,74,.28); }

/* ── Sticky CTA ──────────────────────────────────────────────── */
.sticky-cta {
  display:none;
  position:fixed; bottom:0; left:0; right:0; z-index:8999;
  padding:6px 14px calc(6px + env(safe-area-inset-bottom,0px));
  background:rgba(8,14,10,.95);
  backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
  border-top:1px solid rgba(255,255,255,.06);
  box-shadow:0 -3px 20px rgba(0,0,0,.2);
}
.sticky-cta__btn {
  width:100%; padding:11px 14px; border-radius:var(--r-md);
  background:linear-gradient(135deg,var(--g5),var(--g7));
  color:#fff; border:none; cursor:pointer;
  font-family:var(--font-d); font-size:14px; font-weight:800;
  box-shadow:0 2px 12px rgba(22,163,74,.3);
  display:flex; align-items:center; justify-content:center; gap:7px;
  min-height:42px; letter-spacing:-.01em;
}

/* ── Toast ───────────────────────────────────────────────────── */
.toast {
  position:fixed; bottom:26px; left:50%; transform:translateX(-50%);
  background:var(--ink); color:#fff;
  padding:12px 20px; border-radius:13px;
  font-weight:700; font-size:13px;
  box-shadow:0 8px 28px rgba(0,0,0,.26);
  z-index:9999; display:flex; align-items:center; gap:9px;
  white-space:nowrap; animation:toastIn .3s ease;
  border:1px solid rgba(255,255,255,.06);
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width:768px) {
  .nav__links  { display:none!important; }
  .nav__mcta   { display:flex!important; }
  .sticky-cta  { display:block!important; }

  .search-fields    { flex-direction:column!important; }
  .sf               { min-height:46px; }

  .hero__content { padding:32px 16px 16px; max-width:100%; }
  .hero__h1      { font-size:clamp(38px,10vw,54px)!important; }

  .steps-grid { grid-template-columns:1fr!important; }
  .reviews-grid { grid-template-columns:1fr!important; }
  .countries-grid { grid-template-columns:repeat(2,1fr)!important; }
  .footer-grid { grid-template-columns:1fr!important; }
  .split-grid  { grid-template-columns:1fr!important; }
  .split-side  { padding:44px 22px!important; }
  .stat-row    { grid-template-columns:1fr 1fr!important; }
}
@media (max-width:640px) {
  .sports-grid { grid-template-columns:repeat(2,1fr)!important; }
  .cta-row>*   { width:100%!important; max-width:100%!important; }
}
@media (min-width:769px) {
  .hero__content { max-width:1160px; padding:60px 40px 28px; flex-direction:row; align-items:center; gap:48px; }
  .hero__left { flex:1; max-width:520px; }
  .hero__right { width:360px; flex-shrink:0; }
  .search-fields { flex-direction:row!important; }
  .sf { flex:1; }
  .steps-grid  { grid-template-columns:repeat(4,1fr)!important; }
  .countries-grid { grid-template-columns:repeat(4,1fr)!important; }
}
@media (min-width:1024px) {
  .countries-grid { grid-template-columns:repeat(8,1fr)!important; }
}
@media (max-width:400px) {
  .hero__h1 { font-size:34px!important; }
  .sticky-cta__btn { font-size:13px; padding:10px 12px; min-height:40px; }
}

/* desktop-only popovers */
@media (max-width:767px) { .desktop-only { display:none!important; } }
.gp-pop {
  position:absolute; z-index:500;
  background:var(--white); border-radius:var(--r-xl);
  box-shadow:var(--sh-lg); border:1px solid var(--bd);
  animation:popIn .15s ease; overflow:hidden; min-width:272px;
}

/* Swiper scroll row */
.cards-row {
  display:flex; gap:14px; overflow-x:auto; scrollbar-width:none;
  -webkit-overflow-scrolling:touch; scroll-snap-type:x mandatory;
  padding-bottom:4px; margin:0 calc(-1*clamp(16px,4vw,40px));
  padding-left:clamp(16px,4vw,40px); padding-right:clamp(16px,4vw,40px);
}
.cards-row::-webkit-scrollbar { display:none; }
`

// ─── DatePicker ───────────────────────────────────────────────────────────────
function DatePicker({ value, onChange, onClose }: {
  value: string; onChange: (v: string) => void; onClose: () => void
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const init  = value ? strToDate(value) : today
  const [view, setView] = useState(new Date(init.getFullYear(), init.getMonth(), 1))
  const y = view.getFullYear(), mo = view.getMonth()
  const first = new Date(y, mo, 1).getDay()
  const days  = new Date(y, mo + 1, 0).getDate()
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const sel = value ? strToDate(value) : null
  return (
    <>
      <div className="cal-hd">
        <button className="cal-nav" type="button" onClick={() => setView(new Date(y, mo-1, 1))}>‹</button>
        <span className="cal-month">{MONTHS_ES[mo]} {y}</span>
        <button className="cal-nav" type="button" onClick={() => setView(new Date(y, mo+1, 1))}>›</button>
      </div>
      <div className="cal-grid">
        {DAYS_ES.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`}/>
          const dt = new Date(y, mo, day)
          const isPast  = dt < today
          const isToday = dateToStr(dt) === dateToStr(today)
          const isSel   = sel ? dateToStr(dt) === dateToStr(sel) : false
          return (
            <button key={day} type="button" disabled={isPast}
              className={`cal-day${isToday ? ' today' : ''}${isSel ? ' sel' : ''}`}
              onClick={() => { onChange(dateToStr(dt)); onClose() }}
            >{day}</button>
          )
        })}
      </div>
      {value && (
        <div style={{padding:'0 12px 10px', textAlign:'right'}}>
          <button type="button" onClick={() => { onChange(''); onClose() }}
            style={{fontSize:11, color:'#ef4444', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
            ✕ Limpiar fecha
          </button>
        </div>
      )}
    </>
  )
}

// ─── HourPicker ───────────────────────────────────────────────────────────────
function HourPicker({ value, onChange, onClose }: {
  value: string; onChange: (v: string) => void; onClose: () => void
}) {
  return (
    <>
      <div style={{padding:'10px 14px 8px', borderBottom:'1px solid var(--bd)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{fontFamily:'var(--font-d)', fontSize:13, fontWeight:800, color:'var(--ink)'}}>¿A qué hora?</span>
        {value && (
          <button type="button" onClick={() => { onChange(''); onClose() }}
            style={{fontSize:11, color:'#ef4444', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
            ✕ Limpiar
          </button>
        )}
      </div>
      <div className="h-grid">
        {HOUR_SLOTS.map(h => (
          <button key={h} type="button"
            className={`h-chip${value === h ? ' sel' : ''}`}
            onClick={() => { onChange(h); onClose() }}
          >{h}</button>
        ))}
      </div>
    </>
  )
}

// ─── BottomSheet ──────────────────────────────────────────────────────────────
function BottomSheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <>
      <div className="bs-overlay" onClick={onClose}/>
      <div className="bs" role="dialog" aria-modal="true" aria-label={title}>
        <div className="bs__handle"><div className="bs__bar"/></div>
        <div className="bs__head">
          <span className="bs__title">{title}</span>
          <button className="bs__close" type="button" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </>
  )
}

// ─── FadeIn ───────────────────────────────────────────────────────────────────
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

// ─── FieldCard ────────────────────────────────────────────────────────────────
function FieldCard({ field }: { field: Field }) {
  const router = useRouter()
  const sport  = field.sport ? SPORT_META[field.sport] : null
  return (
    <article className="gp-card" role="button" tabIndex={0}
      onClick={() => router.push(`/reserve/${field.id}`)}
      onKeyDown={e => e.key === 'Enter' && router.push(`/reserve/${field.id}`)}
      aria-label={`Reservar ${field.name}`}
    >
      <div style={{position:'relative', height:160, background:'linear-gradient(135deg,#0e3d1a,#0a2e15)', overflow:'hidden'}}>
        {field.image
          ? <Image src={field.image} alt={field.name} fill sizes="260px" style={{objectFit:'cover'}} loading="lazy"/>
          : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, opacity:.22}}>
              {field.sport === 'basquet' ? '🏀' : field.sport === 'padel' || field.sport === 'tenis' ? '🎾' : '⚽'}
            </div>
        }
        <div style={{position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.55) 0%,transparent 50%)'}}/>
        <div style={{position:'absolute', top:8, left:8, display:'flex', alignItems:'center', gap:4, background:'rgba(0,0,0,.38)', backdropFilter:'blur(8px)', borderRadius:999, padding:'3px 8px', border:'1px solid rgba(255,255,255,.1)'}}>
          <span style={{width:5, height:5, borderRadius:'50%', background:'var(--g4)', flexShrink:0}}/>
          <span style={{fontSize:8, fontWeight:700, color:'rgba(255,255,255,.9)', letterSpacing:'.04em'}}>DISPONIBLE</span>
        </div>
        {sport && (
          <span style={{position:'absolute', top:8, right:8, background:sport.bg, color:sport.color, fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:999, letterSpacing:'.05em', textTransform:'uppercase'}}>
            {sport.label}
          </span>
        )}
        <div style={{position:'absolute', bottom:8, left:10, right:10, display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
          <span style={{fontSize:13, fontWeight:700, color:'#fff', maxWidth:'64%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {field.name}
          </span>
          <span style={{fontSize:12, fontWeight:800, color:'var(--g4)', background:'rgba(0,0,0,.4)', backdropFilter:'blur(8px)', padding:'3px 9px', borderRadius:999, border:'1px solid rgba(74,222,128,.22)', flexShrink:0}}>
            {fmt(field.price_day)}
          </span>
        </div>
      </div>
      <div style={{padding:'10px 12px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
        <div style={{display:'flex', alignItems:'center', gap:4, minWidth:0}}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <p style={{fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {field.location}
          </p>
        </div>
        <span style={{fontSize:12, fontWeight:700, color:'var(--g6)', whiteSpace:'nowrap', flexShrink:0}}>Reservar →</span>
      </div>
    </article>
  )
}

function FieldSkeleton() {
  return (
    <div style={{width:260, borderRadius:20, overflow:'hidden', background:'#fff', border:'1.5px solid var(--bd)', flexShrink:0}}>
      <div className="sk" style={{height:160}}/>
      <div style={{padding:'10px 12px 12px', display:'flex', flexDirection:'column', gap:6}}>
        <div className="sk" style={{height:12, width:'55%'}}/>
        <div className="sk" style={{height:10, width:'34%'}}/>
      </div>
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ dark }: { dark: boolean }) {
  const router  = useRouter()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, {passive:true})
    return () => window.removeEventListener('scroll', fn)
  }, [])
  const isDark = dark && !scrolled
  const cls = dark
    ? (scrolled ? 'nav nav--scrolled' : 'nav nav--transparent')
    : 'nav nav--light'
  return (
    <nav className={cls}>
      <div className="nav__logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
        <img
          src="/logo-golplay.svg"
          alt="GolPlay"
          style={{height:100, width:'auto', filter: isDark ? 'brightness(0) invert(1)' : 'none', transition:'filter .3s'}}
        />
      </div>
      <div className="nav__links">
        <Link href="/reserve" className={`nav__link ${isDark ? 'nav__link--dk' : 'nav__link--lt'}`}>Canchas</Link>
        <Link href="/login"   className={`nav__link ${isDark ? 'nav__link--dk' : 'nav__link--lt'}`}>Iniciar sesión</Link>
        <Link href="/register" className="nav__cta">Registrarse</Link>
      </div>
      <Link href="/reserve" className="nav__mcta">Buscar</Link>
    </nav>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()

  const [fieldsByLoc, setFieldsByLoc] = useState<Record<string, Field[]>>({})
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState(false)
  const [showToast,   setShowToast]   = useState(false)

  const [localText,  setLocalText]  = useState('')
  const [localDate,  setLocalDate]  = useState('')
  const [localHour,  setLocalHour]  = useState('')
  const [localSport, setLocalSport] = useState('')

  const [modal, setModal] = useState<null | 'date' | 'hour'>(null)
  const [showSticky, setShowSticky] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  const qText  = (router.query.q     as string) ?? ''
  const qDate  = (router.query.date  as string) ?? ''
  const qHour  = (router.query.hour  as string) ?? ''
  const qSport = (router.query.sport as string) ?? ''
  const hasFilters = !!(qText || qDate || qHour || qSport)

  useEffect(() => {
    setLocalText(qText); setLocalDate(qDate)
    setLocalHour(qHour); setLocalSport(qSport)
  }, [qText, qDate, qHour, qSport])

  // Sticky visibility
  useEffect(() => {
    const fn = () => setShowSticky((heroRef.current?.getBoundingClientRect().bottom ?? 0) < 62)
    window.addEventListener('scroll', fn, {passive:true})
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Toast
  useEffect(() => {
    if (router.query.reserva !== 'ok') return
    setShowToast(true)
    const t = setTimeout(() => setShowToast(false), 4500)
    router.replace('/', undefined, {shallow:true})
    return () => clearTimeout(t)
  }, [router.query.reserva])

  // Data fetch
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
        fields.forEach(f => map.set(f.id, {
          id: f.id, name: f.name,
          price_day: Number(f.price_day ?? 0),
          location: f.location ?? 'Sin ubicación',
          sport: f.sport ?? null, image: null,
        }))
        images?.forEach(img => {
          const f = map.get(img.field_id)
          if (!f || !img.url) return
          if (img.is_main || f.image === null) f.image = img.url
        })
        const grouped: Record<string, Field[]> = {}
        map.forEach(f => { (grouped[f.location] ??= []).push(f) })
        setFieldsByLoc(grouped)
      } catch { setLoadError(true) }
      finally  { setLoading(false) }
    })()
  }, [])

  const filteredLocs = useMemo(() => {
    const r: Record<string, Field[]> = {}
    Object.entries(fieldsByLoc).forEach(([loc, flds]) => {
      const m = flds.filter(f => {
        if (qText && !f.name.toLowerCase().includes(qText.toLowerCase()) &&
            !f.location.toLowerCase().includes(qText.toLowerCase())) return false
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
    qDate  && formatDateShort(qDate),
    qHour  && qHour,
  ].filter(Boolean).join(' · ')

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    const q: Record<string, string> = {}
    if (localText.trim()) q.q     = localText.trim()
    if (localDate)        q.date  = localDate
    if (localHour)        q.hour  = localHour
    if (localSport)       q.sport = localSport
    setModal(null)
    router.push({ pathname: '/', query: q }, undefined, { shallow: true })
    setTimeout(() => document.getElementById('canchas')?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [localText, localDate, localHour, localSport, router])

  const clearFilters = useCallback(() => {
    setLocalText(''); setLocalDate(''); setLocalHour(''); setLocalSport('')
    router.push('/', undefined, { shallow: true })
  }, [router])

  const scrollToCanchas = () =>
    document.getElementById('canchas')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      <Head>
        <title>GolPlay — Reservá tu cancha en segundos</title>
        <meta name="description" content="Reservá canchas de fútbol, pádel, tenis y más en LATAM. Disponibilidad real, precio claro, sin llamadas."/>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
      </Head>

      <style>{CSS}</style>
      <Navbar dark={!hasFilters}/>

      {/* Bottom sheets */}
      {modal === 'date' && (
        <BottomSheet title="¿Cuándo querés jugar?" onClose={() => setModal(null)}>
          <DatePicker value={localDate} onChange={v => { setLocalDate(v); setModal(null) }} onClose={() => setModal(null)}/>
        </BottomSheet>
      )}
      {modal === 'hour' && (
        <BottomSheet title="¿A qué hora?" onClose={() => setModal(null)}>
          <HourPicker value={localHour} onChange={v => { setLocalHour(v); setModal(null) }} onClose={() => setModal(null)}/>
        </BottomSheet>
      )}
      {modal && (
        <div className="desktop-only"
          style={{position:'fixed', inset:0, zIndex:490}}
          onClick={() => setModal(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section ref={heroRef} className="hero">
          <div className="hero__grid-lines" aria-hidden/>
          <div className="hero__circle" aria-hidden/>
          <div className="hero__glow" aria-hidden/>

          <div className="hero__content" style={{animation:'fadeUp .5s ease both'}}>
            {/* Left column */}
            <div className="hero__left">
              <div className="live-badge">
                <span className="live-badge__dot"/>
                <span className="live-badge__text">+500 reservas · Disponible en 8 países LATAM</span>
              </div>

              <h1 className="hero__h1">
                Reservá<br/>tu cancha
                <span className="hero__h1-accent">en segundos.</span>
              </h1>
              <p className="hero__sub">
                Fútbol, pádel, tenis y más.{' '}
                <strong>Disponibilidad real, precio claro — sin llamadas.</strong>
              </p>
            </div>

            {/* Right column — search card */}
            <div className="hero__right">
              <form onSubmit={handleSearch}>
                <div className="search-card">
                  {/* Sport chips */}
                  <div className="search-card__sports">
                    {SPORTS.map(s => (
                      <button key={s.value} type="button"
                        className={`sc-chip${localSport === s.value ? ' on' : ''}`}
                        onClick={() => setLocalSport(s.value === localSport ? '' : s.value)}
                      >
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="search-fields">
                    {/* Texto */}
                    <div className="sf" style={{flex:'1.5'}}>
                      <svg className="sf__icon" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      <div style={{flex:1, minWidth:0}}>
                        <div className="sf__lbl">Zona o cancha</div>
                        <input
                          type="text" value={localText}
                          onChange={e => setLocalText(e.target.value)}
                          placeholder="Escazú, Heredia..."
                        />
                      </div>
                    </div>

                    {/* Fecha */}
                    <div className={`sf${modal === 'date' ? ' sf--open' : ''}`}
                      style={{flex:1, position:'relative'}}
                      onClick={() => setModal(modal === 'date' ? null : 'date')}
                    >
                      <svg className="sf__icon" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <div style={{flex:1, minWidth:0, cursor:'pointer'}}>
                        <div className="sf__lbl">Fecha</div>
                        <div className={`sf__val${localDate ? ' filled' : ''}`}>
                          {localDate ? formatDateShort(localDate) : 'Elegí el día'}
                        </div>
                      </div>
                      {/* Desktop popover */}
                      {modal === 'date' && (
                        <div className="gp-pop desktop-only" style={{top:'calc(100% + 8px)', left:0, minWidth:288}}>
                          <DatePicker value={localDate} onChange={v => { setLocalDate(v); setModal(null) }} onClose={() => setModal(null)}/>
                        </div>
                      )}
                    </div>

                    {/* Hora */}
                    <div className={`sf${modal === 'hour' ? ' sf--open' : ''}`}
                      style={{flex:1, position:'relative'}}
                      onClick={() => setModal(modal === 'hour' ? null : 'hour')}
                    >
                      <svg className="sf__icon" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <div style={{flex:1, minWidth:0, cursor:'pointer'}}>
                        <div className="sf__lbl">Horario</div>
                        <div className={`sf__val${localHour ? ' filled' : ''}`}>
                          {localHour || 'Cualquier hora'}
                        </div>
                      </div>
                      {modal === 'hour' && (
                        <div className="gp-pop desktop-only" style={{top:'calc(100% + 8px)', right:0, width:226}}>
                          <HourPicker value={localHour} onChange={v => { setLocalHour(v); setModal(null) }} onClose={() => setModal(null)}/>
                        </div>
                      )}
                    </div>
                  </div>

                  <button className="search-cta" type="submit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    Buscar canchas disponibles
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Trust strip */}
          <div className="trust-strip">
            <div className="trust-item">
              <div className="trust-item__n">{loading ? '—' : `${totalFields}+`}</div>
              <div className="trust-item__l">canchas</div>
            </div>
            <div className="trust-sep"/>
            <div className="trust-item">
              <div className="trust-item__n">{loading ? '—' : `${totalLocs}`}</div>
              <div className="trust-item__l">zonas</div>
            </div>
            <div className="trust-sep"/>
            <div className="trust-item">
              <div className="trust-item__n">24/7</div>
              <div className="trust-item__l">online</div>
            </div>
            <div className="trust-sep"/>
            <div className="trust-item">
              <div className="trust-item__n">8</div>
              <div className="trust-item__l">países</div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          FILTER BANNER
      ══════════════════════════════════════════════════════════ */}
      {hasFilters && (
        <div style={{background:'#fff', borderBottom:'1px solid var(--bd)', padding:'74px clamp(16px,4vw,40px) 14px'}}>
          <div style={{maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', paddingTop:14}}>
            <p style={{fontSize:13, color:'var(--g7)', fontWeight:700}}>
              {loading ? 'Buscando…'
                : <>{filteredCount} cancha{filteredCount!==1?'s':''} encontrada{filteredCount!==1?'s':''}
                    {filterSummary && <span style={{fontWeight:400, color:'var(--muted)'}}> para {filterSummary}</span>}</>
              }
            </p>
            <button onClick={clearFilters} style={{fontSize:12, color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'inherit', padding:'6px 10px', borderRadius:8}}>
              ✕ Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MARQUEE
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <div style={{background:'var(--bone)', borderTop:'1px solid var(--bd)', borderBottom:'1px solid var(--bd)', padding:'12px 0', overflow:'hidden'}}>
          <div style={{display:'flex', overflow:'hidden'}}>
            <div className="mqw">
              {[...Array(3)].map((_,rep) =>
                ['⚽ Fútbol 5','🎾 Pádel','🏀 Básquet','🎾 Tenis','🏟️ Multiuso','⚽ Fútbol 7','🌎 8 países LATAM','⚡ Reserva instantánea','✓ Sin llamadas','📧 Confirmación por correo'].map(item => (
                  <span key={`${rep}-${item}`} className="mqi">{item}</span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CANCHAS (datos reales de Supabase)
      ══════════════════════════════════════════════════════════ */}
      <main id="canchas" style={{
        background:'var(--bone)',
        padding:'clamp(48px,6vw,72px) clamp(16px,4vw,40px) clamp(52px,8vw,96px)',
      }}>
        <div style={{maxWidth:1200, margin:'0 auto'}}>
          {!hasFilters && (
            <FadeIn>
              <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:14}}>
                <div>
                  <p className="eyebrow">Disponibles ahora</p>
                  <h2 className="h2">Canchas <em>cerca de vos.</em></h2>
                </div>
                <Link href="/reserve" style={{fontSize:12, fontWeight:700, color:'var(--g6)', textDecoration:'none', display:'flex', alignItems:'center', gap:4}}>
                  Ver todas →
                </Link>
              </div>
            </FadeIn>
          )}

          {loading && (
            <>{[1,2].map(i => (
              <div key={i} style={{marginBottom:44}}>
                <div className="sk" style={{height:14, width:160, marginBottom:16}}/>
                <div className="cards-row">
                  {[1,2,3].map(j => <FieldSkeleton key={j}/>)}
                </div>
              </div>
            ))}</>
          )}

          {!loading && loadError && (
            <div style={{textAlign:'center', padding:'60px 20px'}}>
              <div style={{fontSize:36, marginBottom:12}}>⚠️</div>
              <p style={{fontSize:17, fontWeight:700, color:'var(--ink)', marginBottom:5}}>No pudimos cargar las canchas</p>
              <p style={{fontSize:13, color:'var(--muted)'}}>Intentá refrescar la página.</p>
            </div>
          )}

          {!loading && !loadError && !hasResults && (
            <div style={{textAlign:'center', padding:'60px 20px'}}>
              <div style={{fontSize:44, marginBottom:12}}>🔍</div>
              <p style={{fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:7}}>
                {hasFilters ? 'Sin canchas para esos filtros' : 'Aún no hay canchas disponibles'}
              </p>
              <p style={{fontSize:13, color:'var(--muted)', marginBottom:20}}>
                {hasFilters ? 'Probá ajustando la búsqueda.' : 'Volvé pronto.'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} style={{padding:'10px 24px', background:'var(--g6)', color:'#fff', border:'none', borderRadius:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13}}>
                  Ver todas las canchas
                </button>
              )}
            </div>
          )}

          {!loading && !loadError && hasResults && Object.entries(filteredLocs).map(([loc, flds]) => (
            <section key={loc} style={{marginBottom:48}} aria-labelledby={`loc-${loc}`}>
              <div style={{display:'flex', alignItems:'center', gap:7, marginBottom:16}}>
                <h2 id={`loc-${loc}`} style={{fontSize:14, fontWeight:800, color:'var(--ink)'}}>📍 {loc}</h2>
                <span style={{fontSize:10, fontWeight:800, color:'var(--g7)', background:'var(--g1)', padding:'3px 9px', borderRadius:999, letterSpacing:'.04em'}}>
                  {flds.length} {flds.length === 1 ? 'cancha' : 'canchas'}
                </span>
              </div>
              <Swiper className="gp-swiper" modules={[Navigation]} spaceBetween={14} slidesPerView="auto" navigation>
                {flds.map(f => (
                  <SwiperSlide key={f.id}><FieldCard field={f}/></SwiperSlide>
                ))}
              </Swiper>
            </section>
          ))}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════
          CÓMO FUNCIONA
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="sp-sec" style={{background:'#fff'}}>
          <div className="sec-inner">
            <FadeIn>
              <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:36, flexWrap:'wrap', gap:16}}>
                <div>
                  <p className="eyebrow">Simple y rápido</p>
                  <h2 className="h2">Del celular a la cancha<br/><em>en 3 pasos.</em></h2>
                </div>
                <button onClick={scrollToCanchas} style={{
                  padding:'11px 22px', background:'var(--g6)', color:'#fff', border:'none',
                  borderRadius:12, cursor:'pointer', fontFamily:'inherit',
                  fontWeight:700, fontSize:13, flexShrink:0,
                  boxShadow:'0 2px 10px rgba(22,163,74,.28)',
                }}>
                  Ver canchas →
                </button>
              </div>
            </FadeIn>
            <div className="steps-grid" style={{display:'grid', gap:11}}>
              {[
                { n:'01', e:'🔍', t:'Buscás tu cancha',      d:'Por deporte, zona, fecha y hora. Solo canchas con disponibilidad real y precio visible.', badge:null },
                { n:'02', e:'📅', t:'Elegís el horario',     d:'Seleccionás el horario libre. Reserva confirmada al instante, sin esperas ni llamadas.', badge:'⚡ Confirmación inmediata' },
                { n:'03', e:'✅', t:'Confirmás sin pagar',    d:'Tu reserva queda confirmada al instante. GolPlay es 100% gratis para jugadores — recibís tu correo de confirmación.', badge:'🎉 Sin cobros al jugador' },
                { n:'04', e:'⚽', t:'¡Jugás!',               d:'Llegás al complejo con tu correo de confirmación y comenzás a jugar. Así de fácil.', badge:'📧 Confirmación por correo' },
              ].map((s, i) => (
                <FadeIn key={s.n} delay={i * 70}>
                  <div className="step">
                    <div className="step__num">{s.n}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:24, marginBottom:6}}>{s.e}</div>
                      <div className="step__title">{s.t}</div>
                      <div className="step__desc">{s.d}</div>
                      {s.badge && <div className="step__badge">{s.badge}</div>}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          DEPORTES
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="sp-sec" style={{background:'var(--bone)'}}>
          <div className="sec-inner">
            <FadeIn>
              <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:14}}>
                <div>
                  <p className="eyebrow">Deportes</p>
                  <h2 className="h2">¿Qué deporte <em>jugás?</em></h2>
                </div>
                <p style={{fontSize:13, color:'var(--muted)', maxWidth:220, lineHeight:1.65}}>
                  Encontrá canchas disponibles para tu deporte favorito.
                </p>
              </div>
            </FadeIn>
            <div className="sports-grid" style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:9}}>
              {SPORTS.slice(1).map((s, i) => (
                <FadeIn key={s.value} delay={i * 45}>
                  <button style={{
                    background:'var(--white)', border:'1.5px solid var(--bd)',
                    borderRadius:20, padding:'22px 12px 18px',
                    textAlign:'center', cursor:'pointer', width:'100%',
                    transition:'all .2s ease', fontFamily:'inherit',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                  }}
                    onClick={() => { setLocalSport(s.value); setTimeout(handleSearch, 0) }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--g6)'; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(22,163,74,.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--bd)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}
                  >
                    <span style={{fontSize:30}}>{s.emoji}</span>
                    <span style={{fontSize:11, fontWeight:800, color:'var(--ink)', letterSpacing:'.04em', textTransform:'uppercase'}}>{s.label}</span>
                  </button>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          TESTIMONIOS
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="sp-sec" style={{background:'var(--dark)', paddingLeft:0, paddingRight:0}}>
          <FadeIn style={{padding:'0 clamp(16px,4vw,40px) 28px'}}>
            <p className="eyebrow eyebrow--lt">Lo que dicen</p>
            <h2 className="h2 h2--lt">+250 jugadores<br/><em>ya reservaron</em></h2>
          </FadeIn>
          <div style={{overflow:'hidden'}}>
            <div style={{display:'flex', animation:'marqueeGo 28s linear infinite', width:'max-content', gap:12, padding:'0 6px'}}>
              {[...Array(2)].flatMap(() => [
                { name:'Andrés M.', loc:'Ciudad de México', text:'Reservé en 2 minutos desde el celular. Llegué, jugué, no tuve que hablar con nadie.' },
                { name:'Sofía V.',  loc:'Bogotá, Colombia',  text:'Los horarios son reales. Nunca más llegué y encontré la cancha ocupada.' },
                { name:'Martín F.', loc:'Buenos Aires, AR',  text:'Encontré una cancha de pádel cerca que ni conocía. La reservé mientras esperaba el bus.' },
                { name:'Carlos R.', loc:'San José, CR',      text:'El correo de confirmación llegó al instante. Súper profesional y sin complicaciones.' },
                { name:'Valeria T.', loc:'Santiago, Chile',   text:'Comparé 4 canchas en 2 minutos y encontré la mejor del barrio. Excelente.' },
              ].map((r, i) => (
                <div key={`${r.name}-${i}`} className="review">
                  <div className="review__stars">★★★★★</div>
                  <p className="review__text">"{r.text}"</p>
                  <div style={{display:'flex', alignItems:'center', gap:8, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.06)'}}>
                    <div className="review__av">{r.name[0]}</div>
                    <div>
                      <p style={{fontSize:12, fontWeight:700, color:'rgba(255,255,255,.75)'}}>{r.name}</p>
                      <p style={{fontSize:10, color:'rgba(255,255,255,.3)'}}>{r.loc}</p>
                    </div>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="sp-sec" style={{background:'#fff'}}>
          <div className="sec-inner">
            <FadeIn>
              <div className="stat-row" style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, background:'var(--bd)', borderRadius:20, overflow:'hidden'}}>
                {[
                  {n:'+500', l:'Reservas completadas', s:'Disponible en toda LATAM'},
                  {n:'4.9 ★',   l:'Valoración promedio',  s:'de +300 reseñas'},
                  {n:'8',       l:'Países activos',        s:'y en crecimiento'},
                ].map(s => (
                  <div key={s.l} style={{background:'var(--white)', padding:'24px 16px', textAlign:'center'}}>
                    <p style={{fontFamily:'var(--font-d)', fontSize:28, fontWeight:800, color:'var(--g6)', marginBottom:3, letterSpacing:'-.02em'}}>{s.n}</p>
                    <p style={{fontSize:11, fontWeight:800, color:'var(--ink)', marginBottom:2, textTransform:'uppercase', letterSpacing:'.04em'}}>{s.l}</p>
                    <p style={{fontSize:11, color:'var(--muted)'}}>{s.s}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAÍSES LATAM
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="sp-sec" style={{background:'var(--bone)'}}>
          <div className="sec-inner">
            <FadeIn>
              <div style={{textAlign:'center', marginBottom:36}}>
                <p className="eyebrow" style={{justifyContent:'center'}}>Cobertura regional</p>
                <h2 className="h2" style={{marginBottom:10}}>GolPlay en toda <em>LATAM.</em></h2>
                <p style={{fontSize:14, color:'var(--muted)', maxWidth:380, margin:'0 auto', lineHeight:1.7}}>
                  Presente en 8 países y creciendo. Elegí tu país y empezá a reservar.
                </p>
              </div>
            </FadeIn>
            <div className="countries-grid" style={{display:'grid', gap:9}}>
              {LATAM_COUNTRIES.map((c, i) => (
                <FadeIn key={c.code} delay={i * 38}>
                  <div className="cc">
                    <span style={{fontSize:30, lineHeight:1}}>{c.flag}</span>
                    <span style={{fontSize:12, fontWeight:700, color:'var(--ink)'}}>{c.name}</span>
                    <span style={{fontSize:11, color:'var(--muted)'}}>{c.fields} canchas</span>
                    <span style={{fontSize:11, color:'var(--g6)', fontWeight:700, marginTop:2}}>Explorar →</span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          DUEÑOS DE CANCHAS
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="sp-sec" style={{background:'#fff'}}>
          <div className="sec-inner">
            <FadeIn>
              <div className="owner-card">
                <p style={{fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(74,222,128,.55)', marginBottom:12}}>
                  Para dueños de complejos
                </p>
                <h2 style={{fontFamily:'var(--font-d)', fontSize:'clamp(22px,5vw,34px)', fontWeight:800, color:'#fff', lineHeight:1.0, letterSpacing:'-.02em', marginBottom:12}}>
                  Llená tus turnos.<br/>
                  <span style={{color:'var(--g4)'}}>Automatizá todo.</span>
                </h2>
                <p style={{fontSize:13, color:'rgba(255,255,255,.42)', lineHeight:1.75, marginBottom:20, maxWidth:340}}>
                  Miles de jugadores buscan canchas en tu zona. Recibí reservas automáticas 24/7 sin el caos del WhatsApp. Vos solo jugás, nosotros gestionamos. GolPlay cobra <strong style={{color:'rgba(255,255,255,.65)'}}>por reserva confirmada</strong> — sin costos fijos.
                </p>
                <div style={{display:'flex', flexDirection:'column', gap:9, marginBottom:24}}>
                  {[
                    { icon:'📅', text:'Agenda digital y reservas automáticas' },
                    { icon:'💳', text:'Cobros en línea sin fricción ni llamadas' },
                    { icon:'📊', text:'Dashboard con métricas de tu complejo' },
                    { icon:'🌎', text:'Visibilidad en toda LATAM desde el día 1' },
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
      )}

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════ */}
      {!hasFilters && (
        <section className="sp-sec" style={{
          background:'linear-gradient(155deg,#030c06 0%,#0a3018 55%,#0e4820 100%)',
          textAlign:'center', position:'relative', overflow:'hidden',
        }}>
          <div aria-hidden style={{position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.011) 1px,transparent 1px)', backgroundSize:'50px 50px'}}/>
          <div aria-hidden style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(22,163,74,.1) 0%,transparent 65%)', pointerEvents:'none'}}/>
          <div style={{maxWidth:480, margin:'0 auto', position:'relative', zIndex:1}}>
            <FadeIn>
              <div style={{display:'inline-flex', alignItems:'center', gap:6, background:'rgba(74,222,128,.1)', border:'1px solid rgba(74,222,128,.2)', borderRadius:999, padding:'5px 13px', marginBottom:20}}>
                <span style={{width:5, height:5, borderRadius:'50%', background:'var(--g4)', animation:'pulseDot 2s infinite'}}/>
                <span style={{fontSize:10, fontWeight:700, color:'rgba(74,222,128,.88)', letterSpacing:'.07em'}}>DISPONIBLE EN 8 PAÍSES · SIN LLAMADAS</span>
              </div>
              <h2 style={{
                fontFamily:'var(--font-d)', fontSize:'clamp(30px,7vw,52px)',
                fontWeight:800, color:'#fff', letterSpacing:'-.03em', lineHeight:.98,
                marginBottom:14,
              }}>
                Tu próximo partido<br/>
                <span style={{
                  background:'linear-gradient(110deg,var(--g4) 0%,#34d399 60%,#22d3ee 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                }}>empieza acá.</span>
              </h2>
              <p style={{fontSize:14, color:'rgba(255,255,255,.38)', marginBottom:28, lineHeight:1.75}}>
                Encontrá tu cancha, elegí el horario<br/>y reservá en segundos desde el celular.
              </p>
              <div style={{display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap'}}>
                <button onClick={scrollToCanchas} style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
                  padding:'13px 28px', borderRadius:13,
                  background:'var(--g4)', color:'var(--dark)', border:'none',
                  fontFamily:'var(--font-d)', fontSize:14, fontWeight:800, cursor:'pointer',
                  boxShadow:'0 4px 22px rgba(74,222,128,.38)', width:'100%', maxWidth:220,
                }}>
                  🔍 Buscar canchas
                </button>
                <Link href="/register" style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  padding:'13px 24px', borderRadius:13,
                  background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.65)',
                  border:'1px solid rgba(255,255,255,.13)',
                  fontFamily:'var(--font-d)', fontSize:13, fontWeight:700, textDecoration:'none',
                  width:'100%', maxWidth:200,
                }}>
                  Crear cuenta gratis
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{background:'#050a06', padding:'clamp(40px,5vw,60px) clamp(16px,4vw,40px) 26px'}}>
        <div className="footer-grid" style={{maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1.8fr 1fr 1fr', gap:40, paddingBottom:28, borderBottom:'1px solid rgba(255,255,255,.06)', marginBottom:18}}>
          <div>
            <img src="/logo-golplay.svg" alt="GolPlay" style={{height:36, display:'block', marginBottom:12, opacity:.75}}/>
            <p style={{fontSize:13, color:'rgba(255,255,255,.25)', lineHeight:1.8, maxWidth:260}}>
              Marketplace de canchas deportivas en Latinoamérica. Reservá donde quieras, cuando quieras.
            </p>
          </div>
          <nav aria-label="Info">
            <p style={{fontSize:10, fontWeight:800, letterSpacing:'.1em', color:'rgba(255,255,255,.18)', textTransform:'uppercase', marginBottom:13}}>Info</p>
            {[
              {href:'/terms',    l:'Términos de uso'},
              {href:'/privacy',  l:'Privacidad'},
              {href:'/register', l:'Registrar complejo'},
              {href:'/login',    l:'Iniciar sesión'},
            ].map(({href,l}) => (
              <Link key={href} href={href}
                style={{display:'block', fontSize:13, color:'rgba(255,255,255,.32)', textDecoration:'none', marginBottom:9}}>
                {l}
              </Link>
            ))}
          </nav>
          <div>
            <p style={{fontSize:10, fontWeight:800, letterSpacing:'.1em', color:'rgba(255,255,255,.18)', textTransform:'uppercase', marginBottom:13}}>¿Sos dueño?</p>
            <p style={{fontSize:13, color:'rgba(255,255,255,.25)', lineHeight:1.7, marginBottom:16}}>
              Recibí reservas automáticas 24/7.
            </p>
            <Link href="/register?type=owner" style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'8px 14px', background:'var(--g6)', color:'#fff',
              borderRadius:9, fontSize:12, fontWeight:700, textDecoration:'none',
            }}>
              Sumar mi cancha →
            </Link>
          </div>
        </div>
        <p style={{textAlign:'center', fontSize:12, color:'rgba(255,255,255,.15)'}}>
          © {new Date().getFullYear()} GolPlay · Todos los derechos reservados · Hecho en LATAM 🌎
        </p>
      </footer>

      {/* WhatsApp FAB */}
      <a
        className="wa-fab"
        href="https://wa.me/message/KVBP5AVNH45JL1"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        title="Contactar por WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* ══════════════════════════════════════════════════════════
          STICKY CTA — mobile
      ══════════════════════════════════════════════════════════ */}
      <div className="sticky-cta" style={{display: showSticky ? undefined : 'none'}}>
        <button className="sticky-cta__btn" onClick={scrollToCanchas}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{flexShrink:0}}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Buscar canchas disponibles
        </button>
      </div>

      {/* Toast */}
      {showToast && (
        <div role="status" aria-live="polite" className="toast">
          🎉 ¡Reserva confirmada! Revisá tu correo.
        </div>
      )}

      <style>{`
        @media (max-width:767px) { .desktop-only { display:none!important; } }
        @media (max-width:768px) {
          .search-card__sports { gap:4px!important; }
          .sc-chip { font-size:11px!important; padding:4px 9px!important; }
        }
      `}</style>
    </>
  )
}
