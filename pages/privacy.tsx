/**
 * GolPlay — pages/privacy.tsx
 * Página de Privacidad profesional — LATAM compliance
 *
 * Migrado al DS oficial:
 *   - :root local + @import fonts + reset eliminados (vienen de golplay-tokens.css).
 *   - Nav propia (.priv-nav) → Navbar global (variante dark, transparent sobre el hero dark).
 *   - var(--ink2) → var(--ink); --faint (sin uso) eliminado.
 *   - var(--g0) del underline → rgba(74,222,128,.2) (predecible sobre bone).
 *
 * Sin cambios: contenido legal (sections), TOC, trust pills, footer.
 */

import Head from 'next/head'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

const LAST_UPDATED = '15 de enero de 2025'

const sections = [
  {
    id: 'quienes-somos',
    title: '1. ¿Quiénes somos?',
    content: `GolPlay es un marketplace digital de reservas de canchas deportivas presente en Latinoamérica. Operamos como intermediario tecnológico que conecta a jugadores con complejos deportivos registrados en nuestra plataforma.

Responsable del tratamiento de datos:
GolPlay S.A. · gestion@golplay.com · LATAM`
  },
  {
    id: 'datos-recopilados',
    title: '2. Datos que recopilamos',
    content: `Recopilamos únicamente la información necesaria para brindarte el servicio:

Datos que vos nos proporcionás:
— Nombre y apellido
— Correo electrónico
— Número de teléfono (opcional)
— País y zona de preferencia

Datos generados por el uso:
— Historial de reservas realizadas
— Canchas consultadas y favoritas
— Preferencias deportivas
— Fecha y hora de acceso a la plataforma

Datos técnicos automáticos:
— Dirección IP (anonimizada)
— Tipo de dispositivo y navegador
— Sistema operativo
— Cookies de funcionamiento (ver sección 6)`
  },
  {
    id: 'uso-datos',
    title: '3. ¿Para qué usamos tus datos?',
    content: `Tus datos se usan exclusivamente para:

✅ Gestionar y confirmar tus reservas
✅ Enviarte confirmaciones y recordatorios por correo
✅ Mejorar la experiencia de búsqueda y recomendaciones
✅ Brindarte soporte cuando lo necesitás
✅ Cumplir obligaciones legales aplicables
✅ Detectar y prevenir fraudes

Nunca usamos tus datos para:
✗ Vender tu información a terceros
✗ Enviarte publicidad de terceros sin tu consentimiento
✗ Crear perfiles de usuario para terceras empresas`
  },
  {
    id: 'compartir',
    title: '4. ¿Con quién compartimos tus datos?',
    content: `Compartimos información mínima y necesaria con:

Complejos deportivos: cuando realizás una reserva, el complejo recibe tu nombre y hora de reserva para que puedan recibirte. Nunca les compartimos tu correo completo ni teléfono sin tu autorización expresa.

Proveedores de servicio técnico: utilizamos servicios como Supabase (base de datos) y servicios de email transaccional. Todos operan bajo contratos de confidencialidad y no pueden usar tus datos para sus propios fines.

Autoridades: solo si es requerido por ley o por orden judicial válida.

No vendemos, arrendamos ni comercializamos tu información personal con ningún tercero.`
  },
  {
    id: 'seguridad',
    title: '5. Seguridad de tu información',
    content: `Implementamos medidas técnicas y organizativas para proteger tus datos:

— Conexión cifrada HTTPS/TLS en toda la plataforma
— Base de datos con acceso restringido y encriptado
— Contraseñas almacenadas con hashing seguro (nunca en texto plano)
— Acceso interno limitado al personal autorizado
— Revisiones periódicas de seguridad

Aunque tomamos todas las medidas razonables, ningún sistema es 100% infalible. En caso de incidente de seguridad que afecte tus datos, te notificaremos a tiempo.`
  },
  {
    id: 'cookies',
    title: '6. Cookies y tecnologías similares',
    content: `Usamos cookies para que la plataforma funcione correctamente:

Cookies esenciales (no desactivables):
— Sesión de usuario y autenticación
— Preferencias básicas de la interfaz

Cookies analíticas (podés desactivarlas):
— Medición de visitas y uso general de la plataforma (sin identificar personas)

Cookies de preferencia:
— Recordar tu zona, deporte favorito y filtros recientes

No usamos cookies de publicidad ni rastreo de terceros.

Podés gestionar las cookies desde la configuración de tu navegador.`
  },
  {
    id: 'retencion',
    title: '7. ¿Cuánto tiempo guardamos tus datos?',
    content: `Conservamos tus datos mientras tu cuenta esté activa. Una vez que solicitás eliminar tu cuenta:

— Datos de reservas: 3 años (por obligaciones contables y legales)
— Datos de perfil: eliminados en 30 días hábiles
— Logs técnicos anonimizados: hasta 12 meses

Podés solicitar la eliminación de tu cuenta en cualquier momento escribiéndonos a gestion@golplay.com.`
  },
  {
    id: 'derechos',
    title: '8. Tus derechos',
    content: `Como usuario de GolPlay tenés derecho a:

📋 Acceso: Saber qué datos tenemos sobre vos.
✏️ Rectificación: Corregir datos incorrectos o desactualizados.
🗑️ Eliminación: Solicitar que borremos tu información.
🚫 Oposición: Oponerte a ciertos usos de tus datos.
📦 Portabilidad: Recibir tus datos en formato descargable.
⏸️ Limitación: Restringir temporalmente el uso de tus datos.

Para ejercer cualquier derecho, escribinos a:
gestion@golplay.com

Respondemos en un plazo máximo de 30 días hábiles.`
  },
  {
    id: 'menores',
    title: '9. Usuarios menores de edad',
    content: `GolPlay está dirigido a personas mayores de 16 años. Si sos menor de esa edad, necesitás autorización de tu padre, madre o tutor legal para registrarte y usar la plataforma.

Si tenemos conocimiento de que hemos recopilado datos de un menor sin consentimiento parental, los eliminaremos de inmediato.`
  },
  {
    id: 'cambios',
    title: '10. Cambios en esta política',
    content: `Podemos actualizar esta Política de Privacidad para reflejar cambios en nuestras prácticas o en la normativa aplicable. Cuando hagamos cambios significativos, te notificaremos por correo electrónico o mediante un aviso destacado en la plataforma, con al menos 15 días de anticipación.

La fecha de última actualización siempre aparecerá en la parte superior de esta página.`
  },
  {
    id: 'contacto',
    title: '11. Contacto y consultas',
    content: `Si tenés preguntas, dudas o solicitudes sobre esta Política de Privacidad o el tratamiento de tus datos personales, contactanos:

📧 gestion@golplay.com
🌐 golplay.com
📍 Latinoamérica

Nos comprometemos a responderte en un plazo máximo de 10 días hábiles.`
  },
]

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Política de Privacidad — GolPlay</title>
        <meta name="description" content="Conocé cómo GolPlay protege y usa tu información personal. Transparencia y seguridad para usuarios de toda LATAM."/>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
      </Head>

      <style>{CSS}</style>

      <div className="theme-dark">
        <Navbar dark={true} />

        {/* Hero */}
        <section className="priv-hero">
          <div className="priv-hero__inner">
            <div className="priv-badge">
              <span className="priv-badge__dot"/>
              <span className="priv-badge__text">Legal · Transparencia</span>
            </div>
            <h1>Política de<br/><span>Privacidad</span></h1>
            <p>En GolPlay creemos que tu información te pertenece. Esta política explica qué datos recopilamos, cómo los usamos y cómo los protegemos.</p>
            <p>Lenguaje claro, sin letra chica.</p>
            <p className="priv-updated">Última actualización: {LAST_UPDATED}</p>
          </div>
        </section>
      </div>

      <div className="priv-body">

        {/* Trust pills */}
        <div className="priv-trust">
          {[
            {icon:'🔒', text:'Datos protegidos'},
            {icon:'🚫', text:'No vendemos tu info'},
            {icon:'📧', text:'Sin spam'},
            {icon:'🌎', text:'Cumplimiento LATAM'},
          ].map(p => (
            <div key={p.text} className="priv-trust-pill">
              <span>{p.icon}</span>
              <span>{p.text}</span>
            </div>
          ))}
        </div>

        {/* Table of contents */}
        <div className="priv-toc">
          <h3>Contenido</h3>
          <ul>
            {sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        {sections.map(s => (
          <section key={s.id} id={s.id} className="priv-section">
            <h2>{s.title}</h2>
            <div className="priv-section__body">{s.content}</div>
          </section>
        ))}

      </div>

      {/* Footer */}
      <footer className="priv-footer">
        <p>© {new Date().getFullYear()} GolPlay · Todos los derechos reservados · Hecho en LATAM 🌎</p>
        <p style={{marginTop:8}}>
          <Link href="/" className="priv-footer__link">Inicio</Link>
          {' · '}
          <Link href="/terms" className="priv-footer__link">Términos de uso</Link>
          {' · '}
          <a href="mailto:gestion@golplay.com" className="priv-footer__link">gestion@golplay.com</a>
        </p>
      </footer>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
.priv-hero{
  background:linear-gradient(155deg,var(--dark) 0%,#0a3018 60%,#0e4820 100%);
  padding:clamp(74px,10vw,110px) clamp(16px,4vw,40px) clamp(44px,6vw,72px);
  position:relative; overflow:hidden;
}
.priv-hero::before{
  content:''; position:absolute; inset:0;
  background-image:linear-gradient(rgba(255,255,255,.013) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.013) 1px,transparent 1px);
  background-size:50px 50px;
}
.priv-hero__inner{max-width:680px;margin:0 auto;position:relative;z-index:1;}
.priv-badge{
  display:inline-flex;align-items:center;gap:6px;
  background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);
  border-radius:999px;padding:5px 12px;margin-bottom:20px;
}
.priv-badge__dot{width:5px;height:5px;border-radius:50%;background:var(--g4);}
.priv-badge__text{font-size:10px;font-weight:700;color:rgba(74,222,128,.88);letter-spacing:.08em;text-transform:uppercase;}
.priv-hero h1{
  font-family:var(--font-d);font-size:clamp(30px,7vw,48px);font-weight:800;
  color:#fff;line-height:1.05;letter-spacing:-.02em;margin-bottom:14px;
}
.priv-hero h1 span{
  background:linear-gradient(110deg,var(--g4) 0%,#34d399 60%,#22d3ee 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.priv-hero p{font-size:14px;color:rgba(255,255,255,.45);line-height:1.7;margin-bottom:8px;}
.priv-updated{font-size:12px;color:rgba(255,255,255,.25);margin-top:16px;}

.priv-body{max-width:760px;margin:0 auto;padding:clamp(40px,6vw,72px) clamp(16px,4vw,40px);}

.priv-trust{
  display:flex;gap:10px;flex-wrap:wrap;margin-bottom:44px;
}
.priv-trust-pill{
  display:flex;align-items:center;gap:6px;
  background:var(--white);border:1.5px solid var(--bd);
  border-radius:999px;padding:7px 14px;font-size:12px;font-weight:600;color:var(--ink);
  box-shadow:0 1px 4px rgba(0,0,0,.04);
}
.priv-trust-pill span:first-child{font-size:14px;}

.priv-toc{
  background:var(--white);border:1.5px solid var(--bd);border-radius:18px;
  padding:22px;margin-bottom:44px;
  box-shadow:0 2px 12px rgba(0,0,0,.05);
}
.priv-toc h3{font-family:var(--font-d);font-size:13px;font-weight:800;color:var(--ink);letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px;}
.priv-toc ul{list-style:none;display:flex;flex-direction:column;gap:5px;margin:0;padding:0;}
.priv-toc a{font-size:13px;color:var(--muted);display:block;padding:3px 0;text-decoration:none;transition:color .12s;}
.priv-toc a:hover{color:var(--g6);}

.priv-section{margin-bottom:40px;}
.priv-section h2{
  font-family:var(--font-d);font-size:clamp(16px,3vw,20px);font-weight:800;
  color:var(--ink);letter-spacing:-.01em;margin-bottom:14px;
  padding-bottom:10px;border-bottom:2px solid rgba(74,222,128,.2);
}
.priv-section__body{
  font-size:14px;color:var(--ink);opacity:.85;line-height:1.8;white-space:pre-line;
}
.priv-section__body strong{font-weight:700;opacity:1;}

.priv-footer{
  background:var(--dark);color:rgba(255,255,255,.28);
  text-align:center;padding:32px clamp(16px,4vw,40px);
  font-size:12px;line-height:1.7;
}
.priv-footer__link{color:rgba(255,255,255,.45);text-decoration:none;}
.priv-footer__link:hover{text-decoration:underline;}

@media(max-width:640px){
  .priv-trust{flex-direction:column;}
}
`