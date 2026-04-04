import Head from 'next/head'
import Image from 'next/image'
import Header from '@/components/ui/Header'

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

      <Header />

      {/* ===== HERO ===== */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.heroImage}>
            <Image
              src="/join-golplay.jpg"
              alt="Complejo deportivo aliado de GolPlay"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <h1 style={styles.heroTitle}>
            Sumá tu cancha a GolPlay
          </h1>

          <p style={styles.heroSubtitle}>
            Organizá tus reservas, ganá visibilidad y ahorrá tiempo desde el primer día.
          </p>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <main style={styles.page}>
        {/* INTRO */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>¿Por qué unirte a GolPlay?</h2>
          <p style={styles.text}>
            GolPlay está pensado para dueños de canchas y complejos deportivos que
            quieren ordenar sus reservas, reducir mensajes y llamadas, y tener
            mayor control de su negocio.
          </p>
          <p style={styles.text}>
            No importa si administrás una sola cancha o un complejo completo:
            GolPlay se adapta a tu realidad.
          </p>
          <p style={styles.text}>
            Nuestro objetivo es ayudarte a enfocarte en lo importante:
            ofrecer una buena experiencia deportiva.
          </p>
        </section>

        {/* STEPS */}
        <section style={styles.grid}>
          <div style={styles.card}>
            <h3 style={styles.cardStep}>1. Creá tu cuenta</h3>
            <p style={styles.text}>
              Registrate como dueño de cancha y accedé al panel administrativo
              de GolPlay.
            </p>
            <p style={styles.text}>
              El proceso es simple y solo te pediremos la información necesaria
              para comenzar.
            </p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardStep}>2. Publicá tu cancha</h3>
            <p style={styles.text}>
              Cargá los datos de tu cancha: nombre, ubicación, precio, horarios
              disponibles y características.
            </p>
            <p style={styles.text}>
              Podés subir imágenes reales de tu complejo para atraer más reservas.
            </p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardStep}>3. Gestioná tus reservas</h3>
            <p style={styles.text}>
              Recibí reservas organizadas en un solo lugar, con calendario,
              control de horarios y reportes básicos.
            </p>
            <p style={styles.text}>
              Menos mensajes, menos confusión, más orden.
            </p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardStep}>4. Crecé con GolPlay</h3>
            <p style={styles.text}>
              A medida que GolPlay crece, tu cancha gana más visibilidad dentro
              del marketplace.
            </p>
            <p style={styles.text}>
              Nuestro compromiso es seguir mejorando la plataforma junto a
              quienes confían en ella.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section style={styles.cta}>
          <h2 style={styles.ctaTitle}>¿Listo para empezar?</h2>
          <p style={styles.ctaText}>
            Unite a GolPlay y empezá a administrar tus reservas de forma
            profesional y simple.
          </p>

          <a href="/register" style={styles.ctaBtn}>
            Crear cuenta
          </a>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <h4>GOLPLAY</h4>
            <p style={styles.footerText}>
              El marketplace de complejos deportivos en Costa Rica.
            </p>
          </div>

          <div>
            <h4>Información</h4>
            <a href="/terms" style={styles.footerLink}>Términos y condiciones</a>
            <a href="/about" style={styles.footerLink}>Sobre GolPlay</a>
            <a href="/join" style={styles.footerLink}>Guía para unirse</a>
          </div>
        </div>

        <p style={styles.footerCopy}>
          © {new Date().getFullYear()} GolPlay. Todos los derechos reservados.
        </p>
      </footer>
    </>
  )
}

/* ===== STYLES ===== */

const styles: any = {
  hero: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)',
    padding: '60px 20px',
    textAlign: 'center',
  },

  heroContent: {
    maxWidth: 900,
    margin: '0 auto',
  },

  heroImage: {
    position: 'relative',
    width: '100%',
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
  },

  heroTitle: {
    fontSize: 36,
    fontWeight: 800,
    marginBottom: 12,
  },

  heroSubtitle: {
    fontSize: 18,
    color: '#6b7280',
  },

  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '40px 20px',
  },

  section: {
    marginBottom: 60,
  },

  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 20,
  },

  text: {
    fontSize: 16,
    lineHeight: 1.7,
    color: '#374151',
    marginBottom: 14,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 30,
    marginBottom: 80,
  },

  card: {
    background: 'white',
    borderRadius: 24,
    padding: 28,
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  },

  cardStep: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 10,
  },

  cta: {
    background: '#16a34a',
    color: 'white',
    borderRadius: 30,
    padding: '50px 30px',
    textAlign: 'center',
  },

  ctaTitle: {
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 10,
  },

  ctaText: {
    fontSize: 16,
    marginBottom: 20,
  },

  ctaBtn: {
    display: 'inline-block',
    background: 'white',
    color: '#16a34a',
    padding: '14px 28px',
    borderRadius: 999,
    fontWeight: 700,
    textDecoration: 'none',
  },

  footer: {
    background: '#111827',
    color: 'white',
    padding: '50px 20px',
    marginTop: 80,
  },

  footerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 30,
  },

  footerText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  footerLink: {
    display: 'block',
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textDecoration: 'none',
  },

  footerCopy: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 13,
    color: '#9ca3af',
  },
}
