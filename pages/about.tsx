/**
 * GolPlay — pages/about.tsx
 *
 * Migrado al DS oficial (marketing = light/bone, NO dark):
 *   - Header.tsx eliminado → Navbar global (variante clara).
 *   - Tipografía: Syne (var(--font-d)) + DM Sans (body).
 *   - Tokens CSS: var(--bone/white/ink/muted/bd), var(--g4) accent, var(--dark) footer.
 *   - styles object inline → clases CSS.
 *
 * Sin cambios: contenido, imagen hero (next/image), estructura de secciones.
 */

import Head from 'next/head'
import Image from 'next/image'
import Navbar from '@/components/ui/Navbar'

export default function AboutGolPlay() {
  return (
    <>
      <Head>
        <title>Sobre GolPlay | Marketplace de Canchas Deportivas</title>
        <meta
          name="description"
          content="GolPlay es el marketplace de canchas deportivas en Costa Rica. Reservá, gestioná y jugá de forma simple, rápida y transparente."
        />
      </Head>

      <style>{CSS}</style>

      <Navbar />

      {/* ===== HERO ===== */}
      <section className="ab-hero">
        <div className="ab-hero__content">
          <div className="ab-hero__image">
            <Image
              src="/about-golplay.jpg"
              alt="Fundador GolPlay y visión del proyecto"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <h1 className="ab-hero__title">GolPlay nació desde la cancha</h1>
          <p className="ab-hero__subtitle">
            Un proyecto construido con esfuerzo, aprendizaje y pasión por el deporte.
          </p>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <main className="ab-page">
        <section className="ab-section">
          <h2 className="ab-section__title">Sobre GolPlay</h2>
          <p className="ab-text">
            GolPlay nace de una necesidad real: facilitar la forma en que las personas
            encuentran, reservan y disfrutan espacios deportivos.
          </p>
          <p className="ab-text">
            Sabemos lo frustrante que puede ser coordinar horarios, escribir mensajes,
            esperar confirmaciones o perder tiempo buscando una cancha disponible.
          </p>
          <p className="ab-text">
            GolPlay es el resultado de horas de trabajo, aprendizaje y prueba–error,
            construido con dedicación y pensando tanto en quienes quieren jugar como
            en quienes administran complejos deportivos.
          </p>
          <p className="ab-text">
            No somos una plataforma perfecta, pero sí una que se construye todos los días
            con pasión, atención al detalle y el deseo genuino de mejorar la experiencia
            deportiva en Costa Rica.
          </p>
        </section>

        <section className="ab-grid">
          {/* MISIÓN */}
          <div className="ab-card">
            <h3 className="ab-card__title">Nuestra misión</h3>
            <p className="ab-text">
              Simplificar el proceso de reserva de canchas deportivas, conectando a
              jugadores y complejos en un solo lugar, con información clara,
              disponibilidad real y herramientas fáciles de usar.
            </p>
            <p className="ab-text">
              Trabajamos para que los jugadores encuentren dónde jugar sin
              complicaciones, y para que los dueños de canchas tengan control,
              orden y visibilidad.
            </p>
            <p className="ab-text">
              Creemos que el deporte debe disfrutarse desde antes de entrar a la cancha.
            </p>
          </div>

          {/* VISIÓN */}
          <div className="ab-card">
            <h3 className="ab-card__title">Nuestra visión</h3>
            <p className="ab-text">
              Construir el marketplace deportivo de referencia en la región,
              creciendo paso a paso de forma sólida y transparente.
            </p>
            <p className="ab-text">
              Queremos apoyar a pequeños y grandes complejos deportivos,
              impulsar la digitalización del deporte y crear una comunidad
              donde jugar sea fácil y administrar sea simple.
            </p>
            <p className="ab-text">
              GolPlay es un proyecto con grandes sueños, pero con los pies
              bien puestos en la cancha.
            </p>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="ab-footer">
        <div className="ab-footer__inner">
          <div>
            <p className="ab-footer__brand">GolPlay</p>
            <p className="ab-footer__text">El marketplace de complejos deportivos en Costa Rica.</p>
          </div>

          <div>
            <p className="ab-footer__heading">Información</p>
            <a href="/terms" className="ab-footer__link">Términos y condiciones</a>
            <a href="/about" className="ab-footer__link">Sobre GolPlay</a>
            <a href="/join" className="ab-footer__link">Guía para unirse</a>
          </div>
        </div>

        <p className="ab-footer__copy">
          © {new Date().getFullYear()} GolPlay. Todos los derechos reservados.
        </p>
      </footer>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
/* ===== HERO ===== */
.ab-hero {
  background: linear-gradient(180deg, var(--white) 0%, var(--bone) 100%);
  padding: calc(62px + 48px) 20px 60px;
  text-align: center;
}
.ab-hero__content { max-width: 900px; margin: 0 auto; }
.ab-hero__image {
  position: relative;
  width: 100%;
  height: 560px;
  border-radius: 24px;
  overflow: hidden;
  margin-bottom: 30px;
}
.ab-hero__title {
  font-family: var(--font-d);
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -.02em;
  line-height: 1.05;
  color: var(--ink);
  margin: 0 0 12px;
}
.ab-hero__subtitle {
  font-size: 18px;
  color: var(--muted);
  margin: 0;
}

/* ===== CONTENT ===== */
.ab-page { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
.ab-section { margin-bottom: 60px; }
.ab-section__title {
  font-family: var(--font-d);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -.01em;
  color: var(--ink);
  margin: 0 0 20px;
}
.ab-text {
  font-size: 16px;
  line-height: 1.7;
  color: var(--ink);
  opacity: .82;
  margin: 0 0 14px;
}

.ab-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
.ab-card {
  background: var(--white);
  border: 1px solid var(--bd);
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 20px 40px rgba(0,0,0,.06);
}
.ab-card__title {
  font-family: var(--font-d);
  font-size: 22px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 14px;
}

/* ===== FOOTER ===== */
.ab-footer {
  background: var(--dark);
  color: #fff;
  padding: 50px 20px;
  margin-top: 80px;
}
.ab-footer__inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}
.ab-footer__brand {
  font-family: var(--font-d);
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
}
.ab-footer__heading {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}
.ab-footer__text {
  font-size: 14px;
  color: rgba(255,255,255,.55);
  margin: 0;
  line-height: 1.6;
}
.ab-footer__link {
  display: block;
  font-size: 14px;
  color: rgba(255,255,255,.55);
  margin-top: 8px;
  text-decoration: none;
  transition: color .15s;
}
.ab-footer__link:hover { color: var(--g4); }
.ab-footer__copy {
  text-align: center;
  margin: 30px 0 0;
  font-size: 13px;
  color: rgba(255,255,255,.4);
}

@media (min-width: 768px) {
  .ab-grid { grid-template-columns: 1fr 1fr; gap: 30px; }
}
@media (max-width: 600px) {
  .ab-hero__title { font-size: 32px; }
  .ab-hero__image { height: 320px; }
  .ab-footer__inner { grid-template-columns: 1fr; }
}
`