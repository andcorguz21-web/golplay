/**
 * GolPlay — components/ui/TermsModal.tsx
 *
 * Modal de Términos y Condiciones para dueños de canchas.
 * Se muestra:
 *   1. Al registrarse como owner (register.tsx) — contexto dark
 *   2. Al crear una nueva cancha (admin/fields.tsx) — contexto admin (light), modal dark sobre claro
 *
 * Migrado al DS oficial:
 *   - Theme: dark (var(--dark2) surface), consistente con el resto de modales.
 *   - Tipografía: Syne (var(--font-d)) en título + DM Sans (body).
 *   - Tokens CSS: var(--g4/g6/g7), var(--dark/dark2).
 *   - Fix bugs: `gap: 10` (sin unidad) → `gap: 10px` en .tm-check y .tm-footer__actions.
 *
 * Sin cambios: props, lógica de checkbox/scroll-lock, contenido legal.
 *
 * Props:
 *   open       — controla visibilidad
 *   onAccept   — callback cuando acepta y confirma
 *   onClose    — callback cuando cierra sin aceptar
 *   context    — 'register' | 'field' — cambia el título del modal
 */

import { useState, useEffect } from 'react'

interface TermsModalProps {
  open:     boolean
  onAccept: () => void
  onClose:  () => void
  context?: 'register' | 'field'
}

export default function TermsModal({
  open,
  onAccept,
  onClose,
  context = 'register',
}: TermsModalProps) {
  const [checked, setChecked] = useState(false)

  // Resetear checkbox cada vez que se abre
  useEffect(() => {
    if (open) setChecked(false)
  }, [open])

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const title = context === 'field'
    ? 'Términos para registrar tu cancha'
    : 'Términos y condiciones para dueños de canchas'

  return (
    <>
      <style>{CSS}</style>

      <div className="tm-overlay" onClick={onClose}>
        <div className="tm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">

          {/* Header */}
          <div className="tm-header">
            <div className="tm-header__icon">📋</div>
            <div>
              <h2 className="tm-header__title">{title}</h2>
              <p className="tm-header__sub">GolPlay · Costa Rica · Última actualización: marzo 2026</p>
            </div>
            <button className="tm-close" onClick={onClose} aria-label="Cerrar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="tm-body">

            <section className="tm-section">
              <h3 className="tm-section__title">1. Modelo de comisión</h3>
              <p>GolPlay cobra una comisión de <strong>$1.00 USD por reserva confirmada</strong> a través de la plataforma. Esta comisión se calcula automáticamente al cierre de cada período de facturación (del día 25 de un mes al día 25 del siguiente).</p>
              <ul>
                <li>El estado de cuenta se genera el día 26 de cada mes.</li>
                <li>El dueño tiene <strong>5 días calendario</strong> para realizar el pago desde la generación del cobro.</li>
                <li>El monto se expresa en dólares americanos (USD) y puede pagarse desde el panel de facturación.</li>
                <li>GolPlay se reserva el derecho de ajustar la comisión con previo aviso de 30 días.</li>
              </ul>
            </section>

            <section className="tm-section">
              <h3 className="tm-section__title">2. Consecuencias por no pago</h3>
              <p>Si el pago no se realiza dentro del plazo establecido:</p>
              <ul>
                <li>La cancha será <strong>desactivada automáticamente</strong> y dejará de aparecer en la plataforma.</li>
                <li>Las reservas futuras serán canceladas y los clientes serán notificados.</li>
                <li>Para reactivar la cancha, deberá regularizarse el pago pendiente desde el panel de administración.</li>
                <li>GolPlay no se hace responsable por la pérdida de reservas durante el período de desactivación.</li>
              </ul>
            </section>

            <section className="tm-section">
              <h3 className="tm-section__title">3. GolPlay como plataforma oficial de reservas</h3>
              <p>Al registrar su cancha en GolPlay, el dueño se compromete a:</p>
              <ul>
                <li>Usar GolPlay como su <strong>plataforma principal y oficial de reservas</strong> para las canchas registradas.</li>
                <li>No promover canales alternativos de reserva (WhatsApp, formularios externos, otras apps) que compitan directamente con el sistema de GolPlay para las canchas activas en la plataforma.</li>
                <li>Mantener el calendario de GolPlay actualizado para evitar dobles reservas.</li>
                <li>Notificar a GolPlay si decide desactivar una cancha con al menos <strong>48 horas de anticipación</strong> cuando haya reservas activas.</li>
              </ul>
            </section>

            <section className="tm-section">
              <h3 className="tm-section__title">4. Responsabilidad por cancelaciones</h3>
              <ul>
                <li>El dueño de la cancha es responsable de gestionar cancelaciones directamente con el cliente.</li>
                <li>GolPlay actúa como intermediario tecnológico y <strong>no procesa reembolsos</strong> ni interviene en disputas económicas entre dueño y cliente.</li>
                <li>Cancelaciones injustificadas reiteradas pueden resultar en la suspensión de la cuenta.</li>
                <li>El dueño debe responder consultas de los clientes dentro de un plazo razonable.</li>
              </ul>
            </section>

            <section className="tm-section">
              <h3 className="tm-section__title">5. Uso correcto de la plataforma</h3>
              <ul>
                <li>La información de la cancha (precios, horarios, fotos) debe ser <strong>veraz y actualizada</strong>.</li>
                <li>Está prohibido registrar canchas que no sean de su propiedad o que no tenga autorización para administrar.</li>
                <li>El dueño no puede usar la plataforma para actividades ilícitas o que violen las leyes de Costa Rica.</li>
                <li>GolPlay se reserva el derecho de eliminar canchas que incumplan estas condiciones sin previo aviso.</li>
                <li>El acceso a las cuentas es personal e intransferible. El dueño es responsable de la seguridad de sus credenciales.</li>
              </ul>
            </section>

            <section className="tm-section">
              <h3 className="tm-section__title">6. Privacidad y datos</h3>
              <ul>
                <li>GolPlay almacena los datos de los clientes (nombre, email, teléfono) para facilitar la gestión de reservas.</li>
                <li>El dueño no debe usar los datos de los clientes para fines distintos a la gestión de sus reservas.</li>
                <li>GolPlay cumple con las normativas de protección de datos aplicables en Costa Rica.</li>
              </ul>
            </section>

            <section className="tm-section">
              <h3 className="tm-section__title">7. Modificaciones y vigencia</h3>
              <p>GolPlay puede actualizar estos términos notificando a los dueños por correo electrónico con al menos 15 días de anticipación. El uso continuado de la plataforma implica la aceptación de los nuevos términos.</p>
            </section>

          </div>

          {/* Footer con checkbox y botón */}
          <div className="tm-footer">
            <label className="tm-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="tm-check__input"
              />
              <span className="tm-check__box">
                {checked && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                )}
              </span>
              <span className="tm-check__label">
                He leído y acepto los términos y condiciones de GolPlay
              </span>
            </label>

            <div className="tm-footer__actions">
              <button className="tm-btn tm-btn--ghost" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="tm-btn tm-btn--primary"
                disabled={!checked}
                onClick={() => { if (checked) onAccept() }}
              >
                Aceptar y continuar →
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
.tm-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: tmFade .18s ease;
}
@keyframes tmFade { from{opacity:0} to{opacity:1} }

.tm-modal {
  background: var(--dark2);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 20px;
  width: 100%; max-width: 640px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,.5);
  animation: tmSlide .2s ease;
  overflow: hidden;
}
@keyframes tmSlide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }

.tm-header {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 24px 28px 20px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  flex-shrink: 0;
}
.tm-header__icon {
  font-size: 28px; line-height: 1; flex-shrink: 0; margin-top: 2px;
}
.tm-header__title {
  font-family: var(--font-d);
  font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 3px;
}
.tm-header__sub {
  font-size: 12px; color: rgba(255,255,255,.45); margin: 0;
}
.tm-close {
  margin-left: auto; flex-shrink: 0;
  background: rgba(255,255,255,.08); border: none; cursor: pointer;
  width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,.6); transition: all .15s;
}
.tm-close:hover { background: rgba(255,255,255,.16); color: #fff; }

.tm-body {
  flex: 1; overflow-y: auto; padding: 24px 28px;
  font-size: 14px; color: rgba(255,255,255,.72); line-height: 1.7;
}
.tm-body::-webkit-scrollbar { width: 4px; }
.tm-body::-webkit-scrollbar-track { background: transparent; }
.tm-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 4px; }

.tm-section { margin-bottom: 24px; }
.tm-section:last-child { margin-bottom: 0; }
.tm-section__title {
  font-size: 13px; font-weight: 700; color: #fff;
  text-transform: uppercase; letter-spacing: .04em;
  margin: 0 0 10px; padding-bottom: 6px;
  border-bottom: 1.5px solid rgba(255,255,255,.08);
}
.tm-section p { margin: 0 0 8px; }
.tm-section strong { color: #fff; }
.tm-section ul {
  margin: 0; padding-left: 18px;
}
.tm-section ul li { margin-bottom: 5px; }

.tm-footer {
  padding: 20px 28px 24px;
  border-top: 1px solid rgba(255,255,255,.08);
  flex-shrink: 0;
  background: rgba(255,255,255,.02);
}
.tm-check {
  display: flex; align-items: flex-start; gap: 10px;
  cursor: pointer; margin-bottom: 16px;
  font-size: 13px; color: rgba(255,255,255,.8); font-weight: 500;
}
.tm-check__input { display: none; }
.tm-check__box {
  flex-shrink: 0;
  width: 18px; height: 18px; border-radius: 5px;
  border: 2px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.04);
  display: flex; align-items: center; justify-content: center;
  transition: all .15s; margin-top: 1px;
}
.tm-check__input:checked + .tm-check__box {
  background: var(--g6); border-color: var(--g6);
}
.tm-check__label { line-height: 1.5; }

.tm-footer__actions {
  display: flex; gap: 10px; justify-content: flex-end;
}
.tm-btn {
  padding: 10px 20px; border-radius: 10px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  border: none; transition: all .15s;
  font-family: var(--font-d);
}
.tm-btn--ghost {
  background: transparent; color: rgba(255,255,255,.7);
  border: 1.5px solid rgba(255,255,255,.15);
}
.tm-btn--ghost:hover { background: rgba(255,255,255,.08); color: #fff; }
.tm-btn--primary {
  background: linear-gradient(135deg, var(--g6), var(--g7));
  color: #fff;
}
.tm-btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(22,163,74,.3);
}
.tm-btn--primary:disabled {
  opacity: .45; cursor: not-allowed;
}
`