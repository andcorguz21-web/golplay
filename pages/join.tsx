/**
 * GolPlay — pages/join.tsx
 *
 * Migrado al DS oficial (marketing = light/bone, NO dark):
 *   - Header.tsx eliminado → Navbar global (variante clara).
 *   - Tipografía: Syne (var(--font-d)) + DM Sans (body).
 *   - Tokens CSS: var(--bone/white/ink/muted/bd), var(--g4/g6/g7), var(--dark) footer.
 *   - styles object inline → clases CSS.
 *
 * Sin cambios: contenido, imagen hero, estructura de pasos + CTA.
 */

import Head from 'next/head'
import Image from 'next/image'
import Navbar from '@/components/ui/Navbar'

export default function JoinGolPlay() {
  return (
    <>
      <Head>
        <title>Guía para unirse a GolPlay | Publicá tu cancha</title>
        <meta
          name="description"
          content="Conocé cómo unirte a GolPlay y empezar a recibir reservas para tu cancha deportiva de forma simple y ordenada."
        />
      </Head>

      <style>{CSS}</style>

      <Navbar />

      {/* ===== HERO ===== */}
      <section className="jn-hero">
        <div className="jn-hero__content">
          <div className="jn-hero__image">
            <Image
              src="/join-golplay.jpg"
              alt="Complejo deportivo aliado de GolPlay"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <h1 className="jn-hero__title">Sumá tu cancha a GolPlay</h1>
          <p className="jn-hero__subtitle">
            Organizá tus reservas, ganá visibilidad y ahorrá tiempo desde el primer día.
          </p>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <main className="jn-page">
        {/* INTRO */}
        <section className="jn-section">
          <h2 className="jn-section__title">¿Por qué unirte a GolPlay?</h2>
          <p className="jn-text">
            GolPlay está pensado para dueños de canchas y complejos deportivos que
            quieren ordenar sus reservas, reducir mensajes y llamadas, y tener
            mayor control de su negocio.
          </p>
          <p className="jn-text">
            No importa si administrás una sola cancha o un complejo completo:
            GolPlay se adapta a tu realidad.
          </p>
          <p className="jn-text">
            Nuestro objetivo es ayudarte a enfocarte en lo importante:
            ofrecer una buena experiencia deportiva.
          </p>
        </section>

        {/* STEPS */}
        <section className="jn-grid">
          <div className="jn-card">
            <h3 className="jn-card__step">1. Creá tu cuenta</h3>
            <p className="jn-text">
              Registrate como dueño de cancha y accedé al panel administrativo
              de GolPlay.
            </p>
            <p className="jn-text">
              El proceso es simple y solo te pediremos la información necesaria
              para comenzar.
            </p>
          </div>

          <div className="jn-card">
            <h3 className="jn-card__step">2. Publicá tu cancha</h3>
            <p className="jn-text">
              Cargá los datos de tu cancha: nombre, ubicación, precio, horarios
              disponibles y características.
            </p>
            <p className="jn-text">
              Podés subir imágenes reales de tu complejo para atraer más reservas.
            </p>
          </div>

          <div className="jn-card">
            <h3 className="jn-card__step">3. Gestioná tus reservas</h3>
            <p className="jn-text">
              Recibí reservas organizadas en un solo lugar, con calendario,
              control de horarios y reportes básicos.
            </p>
            <p className="jn-text">
              Menos mensajes, menos confusión, más orden.
            </p>
          </div>

          <div className="jn-card">
            <h3 className="jn-card__step">4. Crecé con GolPlay</h3>
            <p className="jn-text">
              A medida que GolPlay crece, tu cancha gana más visibilidad dentro
              del marketplace.
            </p>
            <p className="jn-text">
              Nuestro compromiso es seguir mejorando la plataforma junto a
              quienes confían en ella.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="jn-cta">
          <h2 className="jn-cta__title">¿Listo para empezar?</h2>
          <p className="jn-cta__text">
            Unite a GolPlay y empezá a administrar tus reservas de forma
            profesional y simple.
          </p>
          <a href="/register" className="jn-cta__btn">Crear cuenta</a>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="jn-footer">
        <div className="jn-footer__inner">
          <div>
            <p className="jn-footer__brand">GolPlay</p>
            <p className="jn-footer__text">El marketplace de complejos deportivos en Costa Rica.</p>
          </div>

          <div>
            <p className="jn-footer__heading">Información</p>
            <a href="/terms" className="jn-footer__link">Términos y condiciones</a>
            <a href="/about" className="jn-footer__link">Sobre GolPlay</a>
            <a href="/join" className="jn-footer__link">Guía para unirse</a>
          </div>
        </div>

        <p className="jn-footer__copy">
          © {new Date().getFullYear()} GolPlay. Todos los derechos reservados.
        </p>
      </footer>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
/* ===== HERO ===== */
.jn-hero {
  background: linear-gradient(180deg, var(--white) 0%, var(--bone) 100%);
  padding: calc(62px + 48px) 20px 60px;
  text-align: center;
}
.jn-hero__content { max-width: 900px; margin: 0 auto; }
.jn-hero__image {
  position: relative;
  width: 100%;
  height: 260px;
  border-radius: 24px;
  overflow: hidden;
  margin-bottom: 30px;
}
.jn-hero__title {
  font-family: var(--font-d);
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -.02em;
  line-height: 1.05;
  color: var(--ink);
  margin: 0 0 12px;
}
.jn-hero__subtitle {
  font-size: 18px;
  color: var(--muted);
  margin: 0;
}

/* ===== CONTENT ===== */
.jn-page { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
.jn-section { margin-bottom: 60px; }
.jn-section__title {
  font-family: var(--font-d);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -.01em;
  color: var(--ink);
  margin: 0 0 20px;
}
.jn-text {
  font-size: 16px;
  line-height: 1.7;
  color: var(--ink);
  opacity: .82;
  margin: 0 0 14px;
}

.jn-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 80px;
}
.jn-card {
  background: var(--white);
  border: 1px solid var(--bd);
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 20px 40px rgba(0,0,0,.06);
}
.jn-card__step {
  font-family: var(--font-d);
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 10px;
}

/* ===== CTA ===== */
.jn-cta {
  background: var(--blue);
  color:#fff;
  border-radius: 30px;
  padding: 50px 30px;
  text-align: center;
}
.jn-cta__title {
  font-family: var(--font-d);
  font-size: 30px;
  font-weight: 800;
  color:var(--ink);
  margin: 0 0 10px;
}
.jn-cta__text {
  font-size: 16px;
  color: rgba(255,255,255,.9);
  margin: 0 0 24px;
  line-height: 1.6;
}
.jn-cta__btn {
  display: inline-block;
  background: #fff;
  color: var(--g7);
  padding: 14px 28px;
  border-radius: 999px;
  font-weight: 700;
  font-family: var(--font-d);
  text-decoration: none;
  transition: transform .15s, box-shadow .15s;
}
.jn-cta__btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0,0,0,.2);
}

/* ===== FOOTER ===== */
.jn-footer {
  background: var(--dark);
  color:var(--ink);
  padding: 50px 20px;
  margin-top: 80px;
}
.jn-footer__inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}
.jn-footer__brand {
  font-family: var(--font-d);
  font-size: 20px;
  font-weight: 800;
  color:var(--ink);
  margin: 0 0 8px;
}
.jn-footer__heading {
  font-size: 14px;
  font-weight: 700;
  color:var(--ink);
  margin: 0 0 4px;
}
.jn-footer__text {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}
.jn-footer__link {
  display: block;
  font-size: 14px;
  color: var(--muted);
  margin-top: 8px;
  text-decoration: none;
  transition: color .15s;
}
.jn-footer__link:hover { color: var(--blue); }
.jn-footer__copy {
  text-align: center;
  margin: 30px 0 0;
  font-size: 13px;
  color: var(--muted);
}

@media (min-width: 768px) {
  .jn-grid { grid-template-columns: 1fr 1fr; gap: 30px; }
}
@media (max-width: 600px) {
  .jn-hero__title { font-size: 32px; }
  .jn-cta__title { font-size: 24px; }
  .jn-footer__inner { grid-template-columns: 1fr; }
}
`