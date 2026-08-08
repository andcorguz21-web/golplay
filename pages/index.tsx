/**
 * GolPlay — pages/index.tsx  v8.0 "Playtomic-style"
 *
 * Home claro y consumer: hero azul + acento lima, buscador, canchas reales,
 * pilares (carta/retos/equipos), carta de jugador, torneos y CTA.
 * Datos en vivo desde Supabase (fields + field_images + tournaments).
 * Reusa <Navbar dark /> y <Logo /> para mantener sesión y marca consistentes.
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'
import Logo from '@/components/ui/Logo'

// ─── Types ──────────────────────────────────────────────────────
type Cancha = {
  id: number
  name: string
  slug: string | null
  city: string | null
  location: string | null
  price: number | null
  sport: string | null
  image: string | null
}

type Torneo = {
  id: number
  slug: string | null
  name: string
  venue_city: string | null
  status: string | null
  max_teams: number | null
  start_date: string | null
  cover_image_url: string | null
  sport_type: string | null
}

// ─── Helpers ────────────────────────────────────────────────────
const SPORT_LABEL: Record<string, string> = {
  futbol5: 'Fútbol 5', futbol7: 'Fútbol 7', futbol11: 'Fútbol 11',
  padel: 'Pádel', tenis: 'Tenis', basquet: 'Básquet', multiuso: 'Multiuso',
}
const sportLabel = (s: string | null) => (s && SPORT_LABEL[s]) || 'Cancha'
const money = (n: number | null) =>
  n == null ? '' : '₡' + Number(n).toLocaleString('es-CR')
const fmtDate = (d: string | null) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
  } catch { return '' }
}

const CHIPS = [
  { value: 'futbol5', label: 'Fútbol 5' },
  { value: 'futbol7', label: 'Fútbol 7' },
  { value: 'padel', label: 'Pádel' },
]

// ─── Styles (scoped under .pt-home) ─────────────────────────────
const CSS = `
.pt-home{
  --blue:#3a5bf0;--blue2:#2c46cf;--ink:#141a33;--ink2:#4b5468;
  --lime:#d4f24d;--lime2:#c7ea38;--limeink:#1c2a0a;
  --paper:#f4f6fb;--card:#fff;--line:#e7ebf3;
  --d:'Poppins',system-ui,sans-serif;--u:'Inter',system-ui,sans-serif;
  font-family:var(--u);color:var(--ink);background:var(--card);line-height:1.55;
}
.pt-home *{box-sizing:border-box}
.pt-home .wrap{max-width:1240px;margin:0 auto;padding:0 40px}
.pt-home .ic{width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;flex:none}
.pt-home h2{font-family:var(--d);font-weight:700;font-size:clamp(28px,3.6vw,42px);letter-spacing:-.02em;line-height:1.08}
.pt-home h2 em{font-style:italic;color:var(--blue)}
.pt-home .eyebrow{font-family:var(--u);font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--blue)}
.pt-home .btn{display:inline-flex;align-items:center;gap:9px;font-family:var(--u);font-weight:600;font-size:15px;padding:13px 24px;border-radius:99px;cursor:pointer;border:2px solid transparent;transition:.15s;text-decoration:none}
.pt-home .btn .ic{width:16px;height:16px}
.pt-home .btn-lime{background:var(--lime);color:var(--limeink)}
.pt-home .btn-lime:hover{background:var(--lime2)}
.pt-home .btn-out{background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}
.pt-home .btn-out:hover{border-color:#fff;background:rgba(255,255,255,.1)}
.pt-home .link{display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:15px;color:var(--blue);text-decoration:none}
.pt-home .link:hover{gap:9px}
/* hero */
.pt-home .hero{background:var(--blue);position:relative;overflow:hidden;padding:120px 0 92px}
.pt-home .hero::before{content:"";position:absolute;top:-10%;left:-8%;width:60%;height:130%;background:rgba(255,255,255,.05);transform:skewX(-14deg);pointer-events:none}
.pt-home .hero::after{content:"";position:absolute;top:0;left:22%;width:28%;height:130%;background:rgba(255,255,255,.045);transform:skewX(-14deg);pointer-events:none}
.pt-home .hero-in{position:relative;z-index:2;display:grid;grid-template-columns:1fr .92fr;gap:44px;align-items:center}
.pt-home .hero h1{font-family:var(--d);font-weight:800;color:#fff;font-size:clamp(42px,5.4vw,66px);line-height:1.03;letter-spacing:-.03em}
.pt-home .hero h1 em{font-style:italic;color:var(--lime)}
.pt-home .hero .sub{margin:22px 0 28px;color:rgba(255,255,255,.9);font-size:19px;font-weight:500;max-width:440px;line-height:1.4}
.pt-home .search{display:flex;align-items:center;gap:10px;background:#fff;border-radius:99px;padding:8px 8px 8px 22px;max-width:540px;box-shadow:0 20px 50px rgba(20,26,51,.22)}
.pt-home .search .ic{width:22px;height:22px;stroke:var(--blue)}
.pt-home .search input{flex:1;border:0;outline:0;font-family:var(--u);font-size:16px;color:var(--ink);background:transparent;min-width:0}
.pt-home .search input::placeholder{color:#9aa2b4}
.pt-home .search .go{background:var(--ink);color:#fff;border-radius:99px;padding:13px 24px;font-weight:600;font-size:15px;border:0;cursor:pointer;font-family:var(--u)}
.pt-home .chips{display:flex;gap:9px;margin-top:16px;flex-wrap:wrap}
.pt-home .chips button{background:rgba(255,255,255,.14);color:#fff;font-size:13px;font-weight:600;padding:7px 15px;border-radius:99px;border:1px solid rgba(255,255,255,.24);cursor:pointer;font-family:var(--u);transition:.14s}
.pt-home .chips button:hover,.pt-home .chips button.on{background:var(--lime);color:var(--limeink);border-color:var(--lime)}
.pt-home .hero-photo{position:relative;height:470px;border-radius:220px 220px 32px 32px;overflow:hidden;background:#26379e}
.pt-home .hero-photo img{width:100%;height:100%;object-fit:cover}
.pt-home .hero-badge{position:absolute;left:-16px;bottom:40px;z-index:3;background:#fff;border-radius:18px;padding:13px 17px;box-shadow:0 14px 34px rgba(20,26,51,.2);display:flex;align-items:center;gap:11px}
.pt-home .hero-badge b{font-family:var(--d);font-weight:700;font-size:17px;display:block;line-height:1.1;color:var(--ink)}
.pt-home .hero-badge small{color:var(--ink2);font-size:12.5px}
.pt-home .hero-badge .fi{width:40px;height:40px;border-radius:12px;background:var(--blue);display:grid;place-items:center;color:#fff}
/* about */
.pt-home .about{padding:88px 0}
.pt-home .about-in{display:grid;grid-template-columns:.85fr 1fr;gap:60px;align-items:center}
.pt-home .about-photo{border-radius:28px;overflow:hidden;height:410px;background:var(--paper)}
.pt-home .about-photo img{width:100%;height:100%;object-fit:cover}
.pt-home .about h2{margin:14px 0 18px}
.pt-home .about p{color:var(--ink2);font-size:17px;margin-bottom:14px}
.pt-home .mark{background:var(--lime);color:var(--limeink);padding:1px 6px;border-radius:5px;font-weight:600;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.pt-home .about .pills{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
.pt-home .about .pill{display:flex;align-items:center;gap:9px;background:var(--paper);border-radius:14px;padding:12px 16px;font-weight:600;font-size:14.5px}
.pt-home .about .pill .ic{stroke:var(--blue)}
/* sections */
.pt-home .sec{padding:78px 0}
.pt-home .sec.paper{background:var(--paper)}
.pt-home .sec-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:32px}
.pt-home .rail{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
/* cancha card */
.pt-home .fc{background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden;transition:.16s;cursor:pointer;text-decoration:none;color:inherit;display:block}
.pt-home .fc:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(20,26,51,.1)}
.pt-home .fc .img{height:128px;background-size:cover;background-position:center;position:relative;background-color:var(--paper)}
.pt-home .fc .img-ph{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:46px;height:46px;color:#c2cbe0;stroke-width:1.6}
.pt-home .fc .price{position:absolute;top:9px;right:9px;background:#fff;border-radius:99px;padding:4px 10px;font-family:var(--d);font-weight:700;font-size:12.5px;box-shadow:0 4px 12px rgba(20,26,51,.15)}
.pt-home .fc-b{padding:11px 13px 13px}
.pt-home .fc-b h3{font-family:var(--d);font-weight:700;font-size:15px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-home .fc-b .loc{display:flex;align-items:center;gap:5px;color:var(--ink2);font-size:12px;margin-top:3px}
.pt-home .fc-b .loc .ic{width:15px;height:15px;stroke:var(--blue)}
.pt-home .fc-b .foot{display:flex;align-items:center;justify-content:space-between;margin-top:15px}
.pt-home .fc-b .type{background:var(--paper);color:var(--ink2);font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:99px}
.pt-home .fc-b .cta{display:inline-flex;align-items:center;gap:5px;color:var(--blue);font-weight:600;font-size:13.5px;background:none;padding:0;border-radius:0}
/* feature cards */
.pt-home .feat{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pt-home .feat-c{border-radius:24px;padding:30px;min-height:220px;display:flex;flex-direction:column;justify-content:space-between;text-decoration:none}
.pt-home .feat-c.blue{background:var(--blue);color:#fff}
.pt-home .feat-c.dark{background:var(--ink);color:#fff}
.pt-home .feat-c.lime{background:var(--lime);color:var(--limeink)}
.pt-home .feat-c .fi{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.16)}
.pt-home .feat-c.lime .fi{background:rgba(28,42,10,.12)}
.pt-home .feat-c .fi .ic{width:24px;height:24px}
.pt-home .feat-c h3{font-family:var(--d);font-weight:700;font-size:23px;margin:18px 0 8px}
.pt-home .feat-c p{font-size:14.5px;opacity:.86;line-height:1.5}
.pt-home .feat-c .go{margin-top:16px;display:inline-flex;align-items:center;gap:7px;font-weight:600;font-size:14.5px}
/* carta band */
.pt-home .carta-band{background:var(--ink);color:#fff;border-radius:32px;overflow:hidden;display:grid;grid-template-columns:1fr .7fr;gap:40px;align-items:center;padding:52px 56px}
.pt-home .carta-band .eyebrow{color:var(--lime)}
.pt-home .carta-band h2{color:#fff;margin:12px 0 16px}
.pt-home .carta-band h2 em{color:var(--lime)}
.pt-home .carta-band p{color:rgba(255,255,255,.72);font-size:16px;max-width:420px;margin-bottom:24px}
.pt-home .pcard{background:linear-gradient(180deg,#20294a,#161d38);border:1px solid rgba(255,255,255,.12);border-radius:22px;overflow:hidden;max-width:320px;margin:0 auto;width:100%}
.pt-home .pcard .pt-top{display:flex;justify-content:space-between;align-items:center;padding:16px 18px}
.pt-home .pcard .ov{width:52px;height:52px;border-radius:50%;background:var(--lime);color:var(--limeink);display:grid;place-items:center;font-family:var(--d);font-weight:800;font-size:22px}
.pt-home .pcard .pos{font-weight:600;font-size:13px;color:rgba(255,255,255,.6);text-align:right;line-height:1.3}
.pt-home .pcard .ph{height:150px;background:linear-gradient(160deg,#2b3a6e,#161d38);display:grid;place-items:center;color:rgba(255,255,255,.18)}
.pt-home .pcard .ph .ic{width:64px;height:64px}
.pt-home .pcard .nm{padding:14px 18px 2px;font-family:var(--d);font-weight:700;font-size:20px;text-align:center;color:#fff}
.pt-home .pcard .team{text-align:center;color:rgba(255,255,255,.55);font-size:13px;margin-bottom:12px}
.pt-home .pcard .st{padding:0 18px 18px;display:grid;grid-template-columns:1fr 1fr;gap:9px 22px}
.pt-home .pcard .st .top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px}
.pt-home .pcard .st .top span{color:rgba(255,255,255,.55)}
.pt-home .pcard .st .top b{color:var(--lime)}
.pt-home .pcard .st .bar{height:4px;border-radius:99px;background:rgba(255,255,255,.12)}
.pt-home .pcard .st .bar i{display:block;height:100%;border-radius:99px;background:var(--lime)}
/* cta */
.pt-home .cta{background:var(--blue);border-radius:32px;text-align:center;padding:62px 40px;color:#fff;position:relative;overflow:hidden;margin:0 0 90px}
.pt-home .cta::before{content:"";position:absolute;top:-40%;left:10%;width:40%;height:180%;background:rgba(255,255,255,.06);transform:skewX(-14deg)}
.pt-home .cta h2{color:#fff;position:relative}
.pt-home .cta p{color:rgba(255,255,255,.88);font-size:18px;margin:14px auto 26px;max-width:460px;position:relative}
.pt-home .cta .btns{display:flex;gap:12px;justify-content:center;position:relative;flex-wrap:wrap}
/* footer */
.pt-home .foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px;border-top:1px solid var(--line);padding:30px 0 46px}
.pt-home .foot .c{color:var(--ink2);font-size:14px}
/* fab */
.pt-home .fab{position:fixed;left:26px;bottom:26px;width:56px;height:56px;border-radius:50%;background:#25D366;color:#fff;display:grid;place-items:center;box-shadow:0 12px 30px rgba(37,211,102,.45);z-index:40}
.pt-home .fab .ic{width:26px;height:26px}
.pt-home .skel{background:linear-gradient(90deg,var(--paper),#eef1f8,var(--paper));background-size:200% 100%;animation:ptsh 1.3s infinite;border-radius:22px;height:280px}
@keyframes ptsh{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media(max-width:900px){
  .pt-home .hero-in,.pt-home .about-in,.pt-home .carta-band{grid-template-columns:1fr}
  .pt-home .feat{grid-template-columns:1fr}
  .pt-home .hero-photo{height:320px;border-radius:150px 150px 28px 28px;order:-1}
  .pt-home .about-photo{height:300px}
  .pt-home .wrap{padding:0 22px}
}
`

// ─── PAGE ───────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()
  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [torneos, setTorneos] = useState<Torneo[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingCount, setBookingCount] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [sport, setSport] = useState('')

  // Contador de reservas (badge)
  useEffect(() => {
    ;(async () => {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['confirmed', 'pending'])
      setBookingCount(count ?? 0)
    })()
  }, [])

  // Canchas reales + imagen principal
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const { data: fields } = await supabase
          .from('fields')
          .select('id, name, slug, price, sport, city, location, complex_id')
          .eq('active', true)
          .order('total_reservations', { ascending: false })
          .limit(8)

        const list = fields ?? []
        const ids = list.map(f => f.id)
        const imgMap: Record<number, string> = {}
        if (ids.length) {
          const { data: imgs } = await supabase
            .from('field_images')
            .select('field_id, url, is_main')
            .in('field_id', ids)
          const sorted = [...(imgs ?? [])].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0))
          sorted.forEach(im => {
            if (im.url && imgMap[im.field_id] == null) imgMap[im.field_id] = im.url
          })
        }
        setCanchas(list.map(f => ({
          id: f.id, name: f.name, slug: f.slug, city: f.city, location: f.location,
          price: f.price, sport: f.sport, image: imgMap[f.id] ?? null,
        })))
      } catch { setCanchas([]) }
      finally { setLoading(false) }
    })()
  }, [])

  // Torneos (si RLS permite y existen)
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from('tournaments')
          .select('id, slug, name, venue_city, status, max_teams, start_date, cover_image_url, sport_type')
          .order('start_date', { ascending: true })
          .limit(3)
        setTorneos(data ?? [])
      } catch { setTorneos([]) }
    })()
  }, [])

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    const q: Record<string, string> = {}
    if (text.trim()) q.q = text.trim()
    if (sport) q.sport = sport
    router.push({ pathname: '/reserve', query: q })
  }, [text, sport, router])

  return (
    <>
      <Head>
        <title>GolPlay — Encontrá cancha y rivales cerca tuyo</title>
        <meta name="description" content="Reservá cancha, armá tu equipo, retá rivales y llevá tu carta de jugador. El fútbol amateur de Costa Rica en un solo lugar." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{CSS}</style>
      <Navbar dark={true} />

      {/* Sprite de íconos */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
        <symbol id="pi-ball" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7l4.7 3.4-1.8 5.5H9.1L7.3 10.4 12 7z" /></symbol>
        <symbol id="pi-pin" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" /><circle cx="12" cy="10" r="3" /></symbol>
        <symbol id="pi-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></symbol>
        <symbol id="pi-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0114 0" /></symbol>
        <symbol id="pi-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0112 0M16 5a3.5 3.5 0 010 7M21 20a6 6 0 00-4-5.6" /></symbol>
        <symbol id="pi-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
        <symbol id="pi-trophy" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" /><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" /></symbol>
        <symbol id="pi-swords" viewBox="0 0 24 24"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M5 14l6 6M8 17l-5 5" /></symbol>
        <symbol id="pi-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></symbol>
        <symbol id="pi-wa" viewBox="0 0 24 24"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z" /></symbol>
      </defs></svg>

      <div className="pt-home">
        {/* ══ HERO ══ */}
        <header className="hero"><div className="wrap hero-in">
          <div>
            <h1>Encontrá <em>cancha</em><br />y <em>rivales</em> cerca<br />tuyo</h1>
            <p className="sub">Reservá, armá tu equipo y jugá. En cualquier momento, en cualquier cancha.</p>
            <form className="search" onSubmit={handleSearch}>
              <svg className="ic"><use href="#pi-search" /></svg>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Barrio, cantón o complejo..."
                aria-label="Buscar cancha"
              />
              <button className="go" type="submit">Buscar</button>
            </form>
            <div className="chips">
              {CHIPS.map(c => (
                <button
                  key={c.value}
                  className={sport === c.value ? 'on' : ''}
                  onClick={() => setSport(sport === c.value ? '' : c.value)}
                  type="button"
                >{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="hero-photo">
              <img src="/join-golplay.jpg" alt="Jugadores de fútbol en GolPlay" />
              <div className="hero-badge">
                <div className="fi"><svg className="ic"><use href="#pi-ball" /></svg></div>
                <div>
                  <b>{bookingCount != null ? '+' + bookingCount.toLocaleString('es-CR') : '+4.000'}</b>
                  <small>mejengas jugadas</small>
                </div>
              </div>
            </div>
          </div>
        </div></header>

        {/* ══ ¿QUÉ ES? ══ */}
        <section className="about wrap"><div className="about-in">
          <div className="about-photo"><img src="/about-golplay.jpg" alt="Fútbol amateur en Costa Rica" /></div>
          <div>
            <span className="eyebrow">¿Qué es GolPlay?</span>
            <h2>La app del <em>fútbol amateur</em> en Costa Rica</h2>
            <p>GolPlay es la <span className="mark">plataforma para jugadores y complejos deportivos</span>. Te ayuda a encontrar cancha, conectar con otros equipos y concentrarte en lo que importa: jugar.</p>
            <p>Reservá en segundos, llevá tu carta de jugador con rating y stats, desafiá rivales y competí en torneos. Todo sin llamadas ni grupos de WhatsApp caóticos.</p>
            <div className="pills">
              <div className="pill"><svg className="ic"><use href="#pi-ball" /></svg>Reservá al instante</div>
              <div className="pill"><svg className="ic"><use href="#pi-users" /></svg>Armá tu equipo</div>
              <div className="pill"><svg className="ic"><use href="#pi-trophy" /></svg>Competí en torneos</div>
            </div>
          </div>
        </div></section>

        {/* ══ CANCHAS ══ */}
        <section className="sec paper"><div className="wrap">
          <div className="sec-head">
            <div><span className="eyebrow">Canchas cerca tuyo</span><h2 style={{ marginTop: 10 }}>Elegí dónde jugar</h2></div>
            <Link href="/reserve" className="link">Ver todas<svg className="ic"><use href="#pi-arrow" /></svg></Link>
          </div>
          <div className="rail">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel" />)
              : canchas.map(c => (
                <Link key={c.id} href={`/reserve/${c.id}`} className="fc">
                  <div className="img" style={c.image ? { backgroundImage: `url('${c.image}')` } : undefined}>
                    {!c.image && <svg className="img-ph" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" /><path d="M12 7l4.7 3.4-1.8 5.5H9.1L7.3 10.4 12 7z" /></svg>}
                    {c.price != null && <span className="price">{money(c.price)}</span>}
                  </div>
                  <div className="fc-b">
                    <h3>{c.name}</h3>
                    <div className="loc"><svg className="ic"><use href="#pi-pin" /></svg>{c.city || c.location || 'Costa Rica'}</div>
                  </div>
                </Link>
              ))}
            {!loading && canchas.length === 0 && (
              <p style={{ color: 'var(--ink2)' }}>Pronto vas a ver canchas disponibles acá.</p>
            )}
          </div>
        </div></section>

        {/* ══ PILARES ══ */}
        <section className="sec"><div className="wrap">
          <div className="sec-head"><div><span className="eyebrow">Mucho más que reservar</span><h2 style={{ marginTop: 10 }}>Viví el fútbol completo</h2></div></div>
          <div className="feat">
            <Link href="/jugadores/crear" className="feat-c blue">
              <div><div className="fi"><svg className="ic"><use href="#pi-user" /></svg></div><h3>Tu carta de jugador</h3><p>Perfil con rating y estadísticas. Compartila y que todos vean tu nivel.</p></div>
              <span className="go">Crear mi carta<svg className="ic"><use href="#pi-arrow" /></svg></span>
            </Link>
            <Link href="/retos" className="feat-c lime">
              <div><div className="fi"><svg className="ic"><use href="#pi-swords" /></svg></div><h3>Retos</h3><p>Desafiá a otros equipos. Coordinás cancha, fecha y hora. El que gana, sube.</p></div>
              <span className="go">Ver retos<svg className="ic"><use href="#pi-arrow" /></svg></span>
            </Link>
            <Link href="/equipos" className="feat-c dark">
              <div><div className="fi"><svg className="ic"><use href="#pi-shield" /></svg></div><h3>Equipos</h3><p>Armá tu plantilla, invitá por cédula o link y jugá en serio con tu banda.</p></div>
              <span className="go">Armar equipo<svg className="ic"><use href="#pi-arrow" /></svg></span>
            </Link>
          </div>
        </div></section>

        {/* ══ CARTA ══ */}
        <section className="sec paper"><div className="wrap">
          <div className="carta-band">
            <div>
              <span className="eyebrow">Tu carta de jugador</span>
              <h2>Cada mejenga <em>suma</em></h2>
              <p>Tu carta refleja tu rating, posición y estadísticas. Sin contraseñas: te identificás por cédula y construís tu reputación partido a partido.</p>
              <Link href="/jugadores/crear" className="btn btn-lime">Crear mi carta gratis</Link>
            </div>
            <div className="pcard">
              <div className="pt-top"><div className="ov">87</div><div className="pos">DEL<br />CRC</div></div>
              <div className="ph"><svg className="ic"><use href="#pi-user" /></svg></div>
              <div className="nm">Tu nombre</div>
              <div className="team">Tu equipo</div>
              <div className="st">
                <div><div className="top"><span>RIT</span><b>89</b></div><div className="bar"><i style={{ width: '89%' }} /></div></div>
                <div><div className="top"><span>TIR</span><b>85</b></div><div className="bar"><i style={{ width: '85%' }} /></div></div>
                <div><div className="top"><span>PAS</span><b>82</b></div><div className="bar"><i style={{ width: '82%' }} /></div></div>
                <div><div className="top"><span>REG</span><b>88</b></div><div className="bar"><i style={{ width: '88%' }} /></div></div>
              </div>
            </div>
          </div>
        </div></section>

        {/* ══ TORNEOS ══ */}
        {torneos.length > 0 && (
          <section className="sec"><div className="wrap">
            <div className="sec-head"><div><span className="eyebrow">Torneos</span><h2 style={{ marginTop: 10 }}>Competí por la <em>gloria</em></h2></div>
              <Link href="/torneos" className="link">Ver todos<svg className="ic"><use href="#pi-arrow" /></svg></Link></div>
            <div className="rail" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
              {torneos.map(t => (
                <Link key={t.id} href={t.slug ? `/torneos/${t.slug}` : '/torneos'} className="fc">
                  <div className="img" style={t.cover_image_url ? { backgroundImage: `url('${t.cover_image_url}')` } : undefined}>
                    {!t.cover_image_url && <svg className="img-ph" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" /><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" /></svg>}
                    {t.max_teams != null && <span className="price">{t.max_teams} equipos</span>}
                  </div>
                  <div className="fc-b">
                    <h3>{t.name}</h3>
                    <div className="loc"><svg className="ic"><use href="#pi-pin" /></svg>{t.venue_city || 'Costa Rica'}{t.start_date ? ` · ${fmtDate(t.start_date)}` : ''}</div>
                    <div className="foot">
                      <span className="type">{t.status || 'Torneo'}</span>
                      <span className="cta">Ver más<svg className="ic"><use href="#pi-arrow" /></svg></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div></section>
        )}

        {/* ══ CTA ══ */}
        <section className="wrap" style={{ paddingTop: 20 }}>
          <div className="cta">
            <h2>¿Listo para jugar?</h2>
            <p>Sumate a la comunidad del fútbol amateur más grande de Costa Rica.</p>
            <div className="btns">
              <Link href="/reserve" className="btn btn-lime">Reservar cancha</Link>
              <Link href="/jugadores/crear" className="btn btn-out">Crear mi carta</Link>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="wrap"><div className="foot">
          <Logo height={64} />
          <div className="c">La app de mejengas · Costa Rica</div>
        </div></footer>

        <a className="fab" href="https://wa.me/message/KVBP5AVNH45JL1" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp">
          <svg className="ic"><use href="#pi-wa" /></svg>
        </a>
      </div>
    </>
  )
}
