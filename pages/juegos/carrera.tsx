/**
 * GolPlay — pages/juegos/carrera.tsx
 * Aloja el simulador de carrera (self-contained en /public/juegos/carrera.html)
 * dentro del layout oficial. El juego trae su propio tema (blanco GolPlay).
 */

import Head from 'next/head'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

export default function CarreraGamePage() {
  return (
    <>
      <Head>
        <title>Modo Carrera · Juegos · GolPlay</title>
        <meta name="description" content="Convertite en leyenda o dirigí a tu club en el modo carrera de GolPlay." />
      </Head>
      <style>{CSS}</style>

      <div className="theme-light gm-page">
        <Navbar />

        <div className="gm-bar">
          <Link href="/juegos" className="gm-back">← Juegos</Link>
          <span className="gm-bar__title">⚽ Modo Carrera</span>
          <span className="gm-bar__spacer" />
        </div>

        <div className="gm-frameWrap">
          <iframe
            className="gm-frame"
            src="/juegos/carrera.html"
            title="GolPlay — Modo Carrera"
            loading="lazy"
          />
        </div>
      </div>
    </>
  )
}

const CSS = `
.gm-page { min-height: 100vh; display: flex; flex-direction: column; }

.gm-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 18px; margin-top: 62px;
  border-bottom: 1px solid var(--line, rgba(20,26,51,.10));
  background: #fff;
}
.gm-back {
  font-size: 13px; font-weight: 800; color: var(--blue);
  text-decoration: none; padding: 6px 10px; border-radius: 9px;
  transition: background .14s;
}
.gm-back:hover { background: rgba(58,91,240,.08); }
.gm-bar__title { font-family: var(--font-d); font-weight: 800; font-size: 15px; color: var(--ink); }
.gm-bar__spacer { flex: 1; }

.gm-frameWrap { flex: 1; min-height: 0; }
.gm-frame {
  width: 100%; height: calc(100vh - 62px - 45px);
  min-height: 620px; border: 0; display: block; background: var(--card, #f6f7fb);
}

@media (max-width: 560px) {
  .gm-frame { height: calc(100vh - 62px - 45px); min-height: 560px; }
}
`
