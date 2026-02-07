import Head from 'next/head'
import Image from 'next/image'
import Header from '@/components/ui/Header'

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

      <Header />

      {/* ===== HERO ===== */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.heroImage}>
            <Image
              src="/about-golplay.jpg"
              alt="Fundador GolPlay y visión del proyecto"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <h1 style={styles.heroTitle}>
            GolPlay nació desde la cancha
          </h1>

          <p style={styles.heroSubtitle}>
            Un proyecto construido con esfuerzo, aprendizaje y pasión por el deporte.
          </p>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <main style={styles.page}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Sobre GolPlay</h2>
          <p style={styles.text}>
            GolPlay nace de una necesidad real: facilitar la forma en que las personas
            encuentran, reservan y disfrutan espacios deportivos.
          </p>
          <p style={styles.text}>
            Sabemos lo frustrante que puede ser coordinar horarios, escribir mensajes,
            esperar confirmaciones o perder tiempo buscando una cancha disponible.
          </p>
          <p style={styles.text}>
            GolPlay es el resultado de horas de trabajo, aprendizaje y prueba–error,
            construido con dedicación y pensando tanto en quienes quieren jugar como
            en quienes administran complejos deportivos.
          </p>
          <p style={styles.text}>
            No somos una plataforma perfecta, pero sí una que se construye todos los días
            con pasión, atención al detalle y el deseo genuino de mejorar la experiencia
            deportiva en Costa Rica.
          </p>
        </section>

        <section style={styles.grid}>
          {/* MISIÓN */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Nuestra misión</h3>
            <p style={styles.text}>
              Simplificar el proceso de reserva de canchas deportivas, conectando a
              jugadores y complejos en un solo lugar, con información clara,
              disponibilidad real y herramientas fáciles de usar.
            </p>
            <p style={styles.text}>
              Trabajamos para que los jugadores encuentren dónde jugar sin
              complicaciones, y para que los dueños de canchas tengan control,
              orden y visibilidad.
            </p>
            <p style={styles.text}>
              Creemos que el deporte debe disfrutarse desde antes de entrar a la cancha.
            </p>
          </div>

          {/* VISIÓN */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Nuestra visión</h3>
            <p style={styles.text}>
              Construir el marketplace deportivo de referencia en la región,
              creciendo paso a paso de forma sólida y transparente.
            </p>
            <p style={styles.text}>
              Queremos apoyar a pequeños y grandes complejos deportivos,
              impulsar la digitalización del deporte y crear una comunidad
              donde jugar sea fácil y administrar sea simple.
            </p>
            <p style={styles.text}>
              GolPlay es un proyecto con grandes sueños, pero con los pies
              bien puestos en la cancha.
            </p>
          </div>
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
    height: 560,
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
  },

  card: {
    background: 'white',
    borderRadius: 24,
    padding: 28,
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 14,
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
