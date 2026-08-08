/**
 * GolPlay — pages/juegos/index.tsx
 * Hub de Juegos. Mismo DS oficial (theme-light + Navbar + hero + grid de cards).
 */

import Head from 'next/head'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

interface Game {
  slug: string
  title: string
  tag: string
  desc: string
  emoji: string
  accent: 'blue' | 'lime'
  ready: boolean
}

const GAMES: Game[] = [
  {
    slug: 'carrera',
    title: 'Modo Carrera',
    tag: 'Fútbol · Manager',
    desc: 'Viví el fútbol como jugador —del debut al retiro— o dirigí como técnico: fichajes, formaciones, finales y títulos. Escudos y planteles reales.',
    emoji: '⚽',
    accent: 'blue',
    ready: true,
  },
]

export default function JuegosPage() {
  return (
    <>
      <Head>
        <title>Juegos · GolPlay</title>
        <meta name="description" content="Jugá el modo carrera de GolPlay: convertite en leyenda o dirigí a tu club." />
      </Head>
      <style>{CSS}</style>

      <div className="theme-light">
        <Navbar />

        <div className="jg-wrap">
          <section className="jg-hero">
            <p className="jg-hero__eyebrow">JUEGOS</p>
            <h1 className="jg-hero__title">Jugá GolPlay</h1>
            <p className="jg-hero__sub">Simuladores de fútbol para vivir el juego más allá de la cancha. Se juega directo en tu navegador, sin descargas.</p>
          </section>

          <section className="jg-grid">
            {GAMES.map(g => (
              g.ready ? (
                <Link key={g.slug} href={`/juegos/${g.slug}`} className={`jg-card jg-card--${g.accent}`}>
                  <div className="jg-card__emoji">{g.emoji}</div>
                  <div className="jg-card__body">
                    <span className="jg-card__tag">{g.tag}</span>
                    <h3 className="jg-card__title">{g.title}</h3>
                    <p className="jg-card__desc">{g.desc}</p>
                    <span className="jg-card__cta">Jugar ahora →</span>
                  </div>
                </Link>
              ) : (
                <div key={g.slug} className="jg-card jg-card--soon">
                  <div className="jg-card__emoji">{g.emoji}</div>
                  <div className="jg-card__body">
                    <span className="jg-card__tag">{g.tag}</span>
                    <h3 className="jg-card__title">{g.title}</h3>
                    <p className="jg-card__desc">{g.desc}</p>
                    <span className="jg-card__cta jg-card__cta--soon">Próximamente</span>
                  </div>
                </div>
              )
            ))}
          </section>
        </div>
      </div>
    </>
  )
}

const CSS = `
.jg-wrap { padding-bottom: 60px; min-height: 100vh; }

.jg-hero {
  text-align: center;
  padding: calc(62px + 40px) 24px 26px;
  max-width: 640px;
  margin: 0 auto;
}
.jg-hero__eyebrow {
  font-size: 11px; font-weight: 700; color: var(--blue);
  letter-spacing: .14em; margin: 0 0 12px;
}
.jg-hero__title {
  font-family: var(--font-d);
  font-size: clamp(36px, 6vw, 52px);
  font-weight: 800; letter-spacing: -.02em;
  color: var(--ink); margin: 0 0 14px; line-height: 1.05;
}
.jg-hero__sub {
  font-size: 15px; color: var(--ink2); margin: 0 auto;
  line-height: 1.6; max-width: 480px;
}

.jg-grid {
  max-width: 900px; margin: 0 auto; padding: 12px 20px 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;
}

.jg-card {
  display: flex; gap: 16px; align-items: center;
  padding: 22px; border-radius: 22px;
  background: var(--card, #fff); border: 1px solid var(--line, rgba(20,26,51,.10));
  box-shadow: 0 12px 40px rgba(20,26,51,.06);
  text-decoration: none; color: inherit;
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}
.jg-card:hover { transform: translateY(-3px); box-shadow: 0 18px 52px rgba(20,26,51,.12); border-color: rgba(20,26,51,.18); }
.jg-card--soon { opacity: .7; cursor: default; }
.jg-card--soon:hover { transform: none; box-shadow: 0 12px 40px rgba(20,26,51,.06); }

.jg-card__emoji {
  width: 68px; height: 68px; flex-shrink: 0;
  border-radius: 18px; display: grid; place-items: center;
  font-size: 34px; background: var(--blue); color: #fff;
  box-shadow: 0 8px 20px rgba(58,91,240,.28);
}
.jg-card--lime .jg-card__emoji { background: var(--lime); color: var(--limeink); box-shadow: 0 8px 20px rgba(212,242,77,.35); }

.jg-card__body { min-width: 0; }
.jg-card__tag {
  font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
  color: var(--blue);
}
.jg-card__title {
  font-family: var(--font-d); font-weight: 800; font-size: 22px;
  color: var(--ink); margin: 4px 0 6px; letter-spacing: -.01em;
}
.jg-card__desc { font-size: 13.5px; color: var(--ink2); line-height: 1.5; margin: 0 0 12px; }
.jg-card__cta { font-size: 13px; font-weight: 800; color: var(--blue); }
.jg-card__cta--soon { color: var(--muted, #7a8194); }

@media (max-width: 560px) {
  .jg-card { flex-direction: column; text-align: center; align-items: center; }
  .jg-hero { padding-top: calc(62px + 26px); }
}
`
