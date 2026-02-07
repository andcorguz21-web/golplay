import Header from '@/components/ui/Header'

export default function Terms() {
  return (
    <>
      <Header />

      <main style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>
            Términos y Condiciones de Uso – GOLPLAY
          </h1>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>1. Aceptación de los Términos</h2>
            <p style={styles.text}>
              Al acceder y utilizar la plataforma GolPlay, el usuario acepta
              cumplir con los presentes Términos y Condiciones. Si no está de
              acuerdo con alguno de ellos, deberá abstenerse de utilizar el
              servicio.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>2. Descripción del Servicio</h2>
            <p style={styles.text}>
              GolPlay es una plataforma digital que permite la gestión,
              visualización y reserva de canchas deportivas, así como
              herramientas administrativas, calendarios, reportes y control de
              reservas para los dueños de complejos deportivos.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>3. Tipos de Usuarios</h2>
            <ul style={styles.list}>
              <li>Usuarios finales: personas que realizan reservas.</li>
              <li>
                Dueños de canchas: responsables de administrar complejos
                deportivos.
              </li>
              <li>
                Administradores de GolPlay: encargados del soporte, control y
                mejora de la plataforma.
              </li>
            </ul>
            <p style={styles.text}>
              Cada tipo de usuario tiene permisos y accesos distintos.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>4. Registro y Cuenta</h2>
            <p style={styles.text}>
              Para utilizar ciertas funciones, el usuario debe registrarse y
              proporcionar información veraz y actualizada. El usuario es
              responsable de mantener la confidencialidad de sus credenciales de
              acceso.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>5. Uso Adecuado de la Plataforma</h2>
            <ul style={styles.list}>
              <li>No utilizar GolPlay para fines ilícitos.</li>
              <li>No interferir con el funcionamiento del sistema.</li>
              <li>No proporcionar información falsa o engañosa.</li>
              <li>
                Respetar a otros usuarios y a los dueños de canchas.
              </li>
            </ul>
            <p style={styles.text}>
              GolPlay se reserva el derecho de suspender cuentas que incumplan
              estas normas.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>6. Reservas y Pagos</h2>
            <p style={styles.text}>
              Las reservas realizadas a través de GolPlay están sujetas a la
              disponibilidad definida por el dueño de la cancha. GolPlay actúa
              como intermediario tecnológico y no se hace responsable por
              cancelaciones, incumplimientos o disputas entre usuarios y dueños,
              salvo lo expresamente indicado.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>7. Cancelaciones y No Show</h2>
            <p style={styles.text}>
              Las políticas de cancelación y penalización por inasistencia (no
              show) son definidas por cada dueño de cancha. El usuario es
              responsable de revisar dichas políticas antes de confirmar una
              reserva.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>8. Responsabilidad del Usuario</h2>
            <p style={styles.text}>
              GolPlay no se hace responsable por lesiones, accidentes o daños
              ocurridos en las instalaciones deportivas, pérdidas económicas
              derivadas del uso de la plataforma o fallas externas como cortes de
              internet o servicios de terceros.
            </p>
            <p style={styles.text}>
              El uso de las instalaciones es responsabilidad exclusiva del
              usuario y del dueño del complejo.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>
              9. Responsabilidad del Dueño de la Cancha
            </h2>
            <p style={styles.text}>
              El dueño de la cancha es responsable de la veracidad de la
              información publicada, el cumplimiento de normativas legales y de
              seguridad, y la correcta prestación del servicio reservado.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>10. Propiedad Intelectual</h2>
            <p style={styles.text}>
              Todos los contenidos, marcas, diseños, logos y funcionalidades de
              GolPlay son propiedad de GolPlay o de sus respectivos titulares y
              están protegidos por las leyes de propiedad intelectual.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>
              11. Suspensión o Terminación del Servicio
            </h2>
            <p style={styles.text}>
              GolPlay podrá suspender o cancelar cuentas que incumplan estos
              términos, sin previo aviso, cuando sea necesario para proteger la
              plataforma y a sus usuarios.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>12. Modificaciones</h2>
            <p style={styles.text}>
              GolPlay se reserva el derecho de modificar estos Términos y
              Condiciones en cualquier momento. Las modificaciones entrarán en
              vigor una vez publicadas en la plataforma.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>13. Protección de Datos</h2>
            <p style={styles.text}>
              GolPlay respeta la privacidad de los usuarios y gestiona los datos
              personales conforme a su Política de Privacidad.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>14. Legislación Aplicable</h2>
            <p style={styles.text}>
              Estos Términos y Condiciones se rigen por las leyes de la República
              de Costa Rica. Cualquier disputa será resuelta ante los tribunales
              competentes de dicho país.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.subtitle}>15. Contacto</h2>
            <p style={styles.text}>
              Para consultas, reclamos o soporte, el usuario puede comunicarse
              con GolPlay a través de los canales oficiales disponibles en la
              plataforma.
            </p>
          </section>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer style={styles.footer}>
        <div style={styles.footerGrid}>
          <div>
            <h4>GOLPLAY</h4>
            <p style={styles.footerText}>
              El marketplace de complejos deportivos en Costa Rica.
            </p>
          </div>

          <div>
            <h4>Información</h4>
            <a href="/terms" style={styles.footerLink}>
              Términos y condiciones
            </a>
            <a href="/about" style={styles.footerLink}>
              Sobre GOLPLAY
            </a>
            <a href="/join" style={styles.footerLink}>
              Guía para unirse
            </a>
          </div>
        </div>

        <p style={styles.footerCopy}>
          © {new Date().getFullYear()} GOLPLAY. Todos los derechos reservados.
        </p>
      </footer>
    </>
  )
}

/* ===== STYLES ===== */
const styles: any = {
  page: {
    background: '#f7f7f7',
    padding: '40px 16px',
  },
  container: {
    maxWidth: 900,
    margin: '0 auto',
    background: 'white',
    borderRadius: 20,
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  text: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 1.7,
  },
  list: {
    paddingLeft: 20,
    marginBottom: 12,
    fontSize: 15,
    color: '#374151',
  },

  footer: {
    background: '#111827',
    color: 'white',
    padding: '40px 20px',
    marginTop: 60,
  },
  footerGrid: {
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
    marginTop: 6,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  footerCopy: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 13,
    color: '#9ca3af',
  },
}
