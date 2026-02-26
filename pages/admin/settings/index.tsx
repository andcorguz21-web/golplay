/**
 * GolPlay — Configuración
 * pages/admin/settings/index.tsx
 *
 * Solo visible para rol 'admin' (el sidebar ya filtra, pero hacemos guard aquí también).
 * Secciones:
 *   1. General — nombre plataforma, moneda, zona horaria
 *   2. Comisiones — modelo de monetización, límite, monto por reserva
 *   3. Notificaciones — toggles email/webhook
 *   4. Base de datos — resumen de tablas, accesos RLS
 *   5. Peligro — reset de datos de prueba
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneralSettings {
  platform_name: string
  currency: string
  timezone: string
  support_email: string
  marketplace_url: string
}

interface CommissionSettings {
  commission_per_booking: number
  commission_limit: number
  billing_day: number
  currency_model: 'fixed_crc' | 'usd_auto'
}

interface NotifSettings {
  notify_owner_new_booking: boolean
  notify_owner_cancellation: boolean
  notify_admin_overdue: boolean
  webhook_url: string
}

interface DbStat {
  table: string
  label: string
  icon: string
  count: number | null
  loading: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'general'|'commissions'|'notifications'|'database'|'danger'>('general')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{msg: string; ok: boolean} | null>(null)

  // General
  const [general, setGeneral] = useState<GeneralSettings>({
    platform_name: 'GolPlay',
    currency: 'CRC',
    timezone: 'America/Costa_Rica',
    support_email: 'soporte@golplay.cr',
    marketplace_url: 'https://golplay.cr',
  })

  // Commissions
  const [commission, setCommission] = useState<CommissionSettings>({
    commission_per_booking: 1500,
    commission_limit: 100,
    billing_day: 1,
    currency_model: 'fixed_crc',
  })

  // Notifications
  const [notif, setNotif] = useState<NotifSettings>({
    notify_owner_new_booking: true,
    notify_owner_cancellation: true,
    notify_admin_overdue: true,
    webhook_url: '',
  })

  // DB stats
  const [dbStats, setDbStats] = useState<DbStat[]>([
    { table: 'profiles',            label: 'Usuarios / Owners',   icon: '👤', count: null, loading: true },
    { table: 'fields',              label: 'Canchas registradas',  icon: '⚽', count: null, loading: true },
    { table: 'bookings',            label: 'Reservas totales',     icon: '📅', count: null, loading: true },
    { table: 'monthly_statements',  label: 'Estados de cuenta',   icon: '💳', count: null, loading: true },
    { table: 'field_images',        label: 'Imágenes subidas',    icon: '📷', count: null, loading: true },
    { table: 'favorites',           label: 'Favoritos',           icon: '⭐', count: null, loading: true },
  ])

  // Auth guard — only admin
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (!p || p.role !== 'admin') { router.replace('/admin'); return }
      setRole(p.role)
    })
  }, [router])

  // Load DB stats
  useEffect(() => {
    if (!role) return
    dbStats.forEach(async (stat, i) => {
      const { count, error } = await supabase.from(stat.table).select('*', { count: 'exact', head: true })
      setDbStats(prev => prev.map((s, idx) =>
        idx === i ? { ...s, count: error ? null : (count ?? 0), loading: false } : s
      ))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3200)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    // Simulate save — in production, upsert a settings table
    await new Promise(r => setTimeout(r, 700))
    setSaving(false)
    showToast('Configuración guardada ✓')
  }

  if (!role) return null

  const TABS = [
    { id: 'general',       label: 'General',          icon: '⚙️' },
    { id: 'commissions',   label: 'Comisiones',        icon: '💰' },
    { id: 'notifications', label: 'Notificaciones',    icon: '🔔' },
    { id: 'database',      label: 'Base de datos',     icon: '🗄️' },
    { id: 'danger',        label: 'Zona de peligro',   icon: '⚠️' },
  ] as const

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && <div className={`cfg-toast ${toast.ok ? 'cfg-toast--ok' : 'cfg-toast--err'}`}>{toast.msg}</div>}

      <div className="cfg">

        {/* Header */}
        <div className="cfg-header">
          <div>
            <h1 className="cfg-title">Configuración</h1>
            <p className="cfg-subtitle">Administración global de la plataforma GolPlay</p>
          </div>
          {activeTab !== 'database' && activeTab !== 'danger' && (
            <button className="cfg-btn cfg-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="cfg-spinner"/>Guardando…</> : '💾 Guardar cambios'}
            </button>
          )}
        </div>

        <div className="cfg-layout">
          {/* Sidebar tabs */}
          <nav className="cfg-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`cfg-navitem ${activeTab === t.id ? 'cfg-navitem--active' : ''} ${t.id === 'danger' ? 'cfg-navitem--danger' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="cfg-navitem__icon">{t.icon}</span>
                <span className="cfg-navitem__label">{t.label}</span>
                {activeTab === t.id && <span className="cfg-navitem__bar"/>}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="cfg-content">

            {/* ── GENERAL ─────────────────────────────────────────────── */}
            {activeTab === 'general' && (
              <Section title="Configuración general" sub="Información básica de la plataforma">
                <div className="cfg-grid2">
                  <Field label="Nombre de la plataforma" hint="Se muestra en emails y el marketplace">
                    <input className="cfg-input" value={general.platform_name}
                      onChange={e => setGeneral(p => ({...p, platform_name: e.target.value}))}/>
                  </Field>
                  <Field label="Email de soporte" hint="Recibe notificaciones del sistema">
                    <input className="cfg-input" type="email" value={general.support_email}
                      onChange={e => setGeneral(p => ({...p, support_email: e.target.value}))}/>
                  </Field>
                  <Field label="URL del marketplace" hint="Dominio público donde se reserva">
                    <input className="cfg-input" value={general.marketplace_url}
                      onChange={e => setGeneral(p => ({...p, marketplace_url: e.target.value}))}/>
                  </Field>
                  <Field label="Moneda principal" hint="Moneda usada en reservas y comisiones">
                    <select className="cfg-input" value={general.currency}
                      onChange={e => setGeneral(p => ({...p, currency: e.target.value}))}>
                      <option value="CRC">₡ Colón costarricense (CRC)</option>
                      <option value="USD">$ Dólar estadounidense (USD)</option>
                      <option value="MXN">$ Peso mexicano (MXN)</option>
                      <option value="COP">$ Peso colombiano (COP)</option>
                    </select>
                  </Field>
                  <Field label="Zona horaria" hint="Afecta el calendario y reportes">
                    <select className="cfg-input" value={general.timezone}
                      onChange={e => setGeneral(p => ({...p, timezone: e.target.value}))}>
                      <option value="America/Costa_Rica">América/Costa Rica (UTC-6)</option>
                      <option value="America/Mexico_City">América/Ciudad de México (UTC-6)</option>
                      <option value="America/Bogota">América/Bogotá (UTC-5)</option>
                      <option value="America/Lima">América/Lima (UTC-5)</option>
                      <option value="America/Santiago">América/Santiago (UTC-3)</option>
                    </select>
                  </Field>
                </div>

                {/* Info callout */}
                <div className="cfg-callout cfg-callout--info">
                  <span className="cfg-callout__icon">ℹ️</span>
                  <div>
                    <p className="cfg-callout__title">Expansión LATAM</p>
                    <p className="cfg-callout__text">
                      La plataforma está diseñada para multi-moneda. Al activar el modelo USD automático en la sección Comisiones,
                      los cobros se convierten a la moneda local del owner en tiempo real.
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* ── COMMISSIONS ─────────────────────────────────────────── */}
            {activeTab === 'commissions' && (
              <Section title="Modelo de comisiones" sub="Cómo GolPlay cobra a los owners por el uso de la plataforma">

                <div className="cfg-model-cards">
                  <button
                    className={`cfg-model-card ${commission.currency_model === 'fixed_crc' ? 'cfg-model-card--active' : ''}`}
                    onClick={() => setCommission(p => ({...p, currency_model: 'fixed_crc'}))}
                  >
                    <span className="cfg-model-card__emoji">🇨🇷</span>
                    <p className="cfg-model-card__title">Fijo CRC</p>
                    <p className="cfg-model-card__sub">Cobro fijo en colones por reserva. Ideal para Costa Rica.</p>
                    {commission.currency_model === 'fixed_crc' && <span className="cfg-model-card__check">✓ Activo</span>}
                  </button>
                  <button
                    className={`cfg-model-card ${commission.currency_model === 'usd_auto' ? 'cfg-model-card--active' : ''}`}
                    onClick={() => setCommission(p => ({...p, currency_model: 'usd_auto'}))}
                  >
                    <span className="cfg-model-card__emoji">🌎</span>
                    <p className="cfg-model-card__title">USD Automático</p>
                    <p className="cfg-model-card__sub">$1 USD por reserva con conversión automática. Modelo LATAM.</p>
                    {commission.currency_model === 'usd_auto' && <span className="cfg-model-card__check">✓ Activo</span>}
                  </button>
                </div>

                <div className="cfg-grid2">
                  <Field
                    label={commission.currency_model === 'usd_auto' ? 'Comisión (USD)' : 'Comisión por reserva (₡)'}
                    hint={`Monto que se le cobra al owner por cada reserva completada`}
                  >
                    <div className="cfg-input-prefix">
                      <span>{commission.currency_model === 'usd_auto' ? '$' : '₡'}</span>
                      <input className="cfg-input cfg-input--inner" type="number" min="0"
                        value={commission.commission_per_booking}
                        onChange={e => setCommission(p => ({...p, commission_per_booking: Number(e.target.value)}))}/>
                    </div>
                  </Field>
                  <Field label="Límite mensual por cancha" hint="Número de reservas máximas a cobrar por mes">
                    <input className="cfg-input" type="number" min="1"
                      value={commission.commission_limit}
                      onChange={e => setCommission(p => ({...p, commission_limit: Number(e.target.value)}))}/>
                  </Field>
                  <Field label="Día de facturación" hint="Día del mes en que se genera el estado de cuenta">
                    <select className="cfg-input" value={commission.billing_day}
                      onChange={e => setCommission(p => ({...p, billing_day: Number(e.target.value)}))}>
                      {[1,5,10,15,20,25].map(d => <option key={d} value={d}>Día {d} de cada mes</option>)}
                    </select>
                  </Field>
                </div>

                {/* Calculation preview */}
                <div className="cfg-preview">
                  <p className="cfg-preview__title">Vista previa del modelo actual</p>
                  <div className="cfg-preview__grid">
                    <div className="cfg-preview__item">
                      <span className="cfg-preview__label">Comisión máxima / cancha / mes</span>
                      <span className="cfg-preview__val cfg-preview__val--green">
                        {commission.currency_model === 'usd_auto'
                          ? `$${(commission.commission_per_booking * commission.commission_limit).toLocaleString()}`
                          : `₡${(commission.commission_per_booking * commission.commission_limit).toLocaleString('es-CR')}`
                        }
                      </span>
                    </div>
                    <div className="cfg-preview__item">
                      <span className="cfg-preview__label">Reservas para cobro máximo</span>
                      <span className="cfg-preview__val">{commission.commission_limit} reservas</span>
                    </div>
                    <div className="cfg-preview__item">
                      <span className="cfg-preview__label">Modelo activo</span>
                      <span className="cfg-preview__val">
                        {commission.currency_model === 'fixed_crc' ? '🇨🇷 Fijo CRC' : '🌎 USD Automático'}
                      </span>
                    </div>
                    <div className="cfg-preview__item">
                      <span className="cfg-preview__label">Facturación</span>
                      <span className="cfg-preview__val">Día {commission.billing_day} de cada mes</span>
                    </div>
                  </div>
                </div>

                <div className="cfg-callout cfg-callout--warn">
                  <span className="cfg-callout__icon">⚠️</span>
                  <div>
                    <p className="cfg-callout__title">Impacto en producción</p>
                    <p className="cfg-callout__text">
                      Cambiar la comisión afecta los nuevos estados de cuenta generados.
                      Los estados existentes <strong>no se modifican retroactivamente</strong>.
                      Los campos <code>commission_limit</code> y <code>commission_amount</code> de la tabla <code>fields</code> deben
                      sincronizarse si se usa override por cancha.
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* ── NOTIFICATIONS ────────────────────────────────────────── */}
            {activeTab === 'notifications' && (
              <Section title="Notificaciones" sub="Configura qué eventos disparan alertas y hacia dónde">

                <div className="cfg-toggles">
                  <ToggleRow
                    label="Nueva reserva → Owner"
                    sub="El owner recibe un email cuando alguien reserva una de sus canchas"
                    checked={notif.notify_owner_new_booking}
                    onChange={v => setNotif(p => ({...p, notify_owner_new_booking: v}))}
                  />
                  <ToggleRow
                    label="Cancelación → Owner"
                    sub="El owner es notificado cuando una reserva es cancelada"
                    checked={notif.notify_owner_cancellation}
                    onChange={v => setNotif(p => ({...p, notify_owner_cancellation: v}))}
                  />
                  <ToggleRow
                    label="Pago vencido → Admin"
                    sub="El admin recibe alerta cuando un estado de cuenta queda overdue"
                    checked={notif.notify_admin_overdue}
                    onChange={v => setNotif(p => ({...p, notify_admin_overdue: v}))}
                  />
                </div>

                <Field label="Webhook URL" hint="POST request enviado a esta URL en cada evento. Dejar vacío para deshabilitar.">
                  <input
                    className="cfg-input"
                    type="url"
                    placeholder="https://tu-sistema.com/webhook/golplay"
                    value={notif.webhook_url}
                    onChange={e => setNotif(p => ({...p, webhook_url: e.target.value}))}
                  />
                </Field>

                {notif.webhook_url && (
                  <div className="cfg-callout cfg-callout--info">
                    <span className="cfg-callout__icon">📡</span>
                    <div>
                      <p className="cfg-callout__title">Webhook activo</p>
                      <p className="cfg-callout__text">
                        Los eventos serán enviados como POST con payload JSON a <code>{notif.webhook_url}</code>.
                        Asegurate de que el endpoint responda con <code>200 OK</code> en menos de 5 segundos.
                      </p>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* ── DATABASE ─────────────────────────────────────────────── */}
            {activeTab === 'database' && (
              <Section title="Estado de la base de datos" sub="Resumen de las tablas principales en Supabase">

                <div className="cfg-db-grid">
                  {dbStats.map(stat => (
                    <div key={stat.table} className="cfg-db-card">
                      <div className="cfg-db-card__icon">{stat.icon}</div>
                      <div className="cfg-db-card__info">
                        <p className="cfg-db-card__label">{stat.label}</p>
                        <p className="cfg-db-card__table"><code>{stat.table}</code></p>
                      </div>
                      <div className="cfg-db-card__count">
                        {stat.loading
                          ? <span className="cfg-sk cfg-sk--sm"/>
                          : stat.count === null
                            ? <span className="cfg-db-card__err">—</span>
                            : <span className="cfg-db-card__num">{stat.count.toLocaleString()}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* DB incongruences */}
                <div className="cfg-issues">
                  <p className="cfg-issues__title">🔍 Incongruencias detectadas con la DB actual</p>
                  <div className="cfg-issues__list">
                    {DB_ISSUES.map((issue, i) => (
                      <div key={i} className={`cfg-issue cfg-issue--${issue.severity}`}>
                        <span className="cfg-issue__sev">{issue.severity === 'high' ? '🔴' : issue.severity === 'med' ? '🟡' : 'ℹ️'}</span>
                        <div>
                          <p className="cfg-issue__title">{issue.title}</p>
                          <p className="cfg-issue__desc">{issue.desc}</p>
                          {issue.fix && <p className="cfg-issue__fix">💡 {issue.fix}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cfg-callout cfg-callout--info">
                  <span className="cfg-callout__icon">🔐</span>
                  <div>
                    <p className="cfg-callout__title">Row Level Security (RLS)</p>
                    <p className="cfg-callout__text">
                      Verificá que RLS esté activo en <strong>profiles</strong>, <strong>fields</strong>, <strong>bookings</strong> y <strong>monthly_statements</strong>.
                      Los owners solo deben leer registros donde <code>owner_id = auth.uid()</code>.
                      El público solo debe leer canchas donde <code>active = true</code>.
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* ── DANGER ZONE ──────────────────────────────────────────── */}
            {activeTab === 'danger' && (
              <Section title="Zona de peligro" sub="Acciones irreversibles — solo para administradores en entorno de pruebas">

                <div className="cfg-danger-list">
                  <DangerAction
                    icon="🗑️"
                    title="Eliminar reservas de prueba"
                    desc="Elimina todas las reservas donde source = 'test' o creadas antes del lanzamiento oficial."
                    btnLabel="Eliminar reservas test"
                    onConfirm={() => showToast('Función disponible en producción con confirmación extra')}
                  />
                  <DangerAction
                    icon="🔄"
                    title="Resetear contador de comisiones"
                    desc="Reinicia el campo total_reservations en todas las canchas a 0. Útil al inicio del ciclo de facturación."
                    btnLabel="Resetear contadores"
                    onConfirm={() => showToast('Función disponible en producción con confirmación extra')}
                  />
                  <DangerAction
                    icon="⚡"
                    title="Forzar generación de estados de cuenta"
                    desc="Genera manualmente los monthly_statements para el mes actual sin esperar el trigger automático."
                    btnLabel="Generar estados ahora"
                    onConfirm={() => showToast('Función disponible en producción con confirmación extra')}
                  />
                </div>

              </Section>
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ─── DB Incongruences data ────────────────────────────────────────────────────

const DB_ISSUES = [
  {
    severity: 'high',
    title: 'Tabla profiles no visible en el schema',
    desc: 'El modelo de negocio requiere una tabla profiles con columnas role, full_name, phone, complex_name. No aparece en el schema exportado, lo que significa que AdminLayout.tsx falla si la tabla no existe o las políticas RLS bloquean la lectura.',
    fix: 'Crear tabla profiles con: id (uuid, FK auth.users), role (text: admin|owner), full_name (text), phone (text), complex_name (text), created_at (timestamptz).',
  },
  {
    severity: 'high',
    title: 'bookings — campos duplicados: name/customer_name, email/customer_email, phone/customer_phone',
    desc: 'La tabla tiene tanto name, email, phone (campos legacy) como customer_name, customer_email, customer_phone (campos nuevos). El código lee ambos con fallback, pero guardar puede escribir solo uno y crear inconsistencias en reportes.',
    fix: 'Migrar todos los registros legacy a customer_* y deprecar los campos name/email/phone con una migración SQL.',
  },
  {
    severity: 'high',
    title: 'bookings.status — valores inconsistentes',
    desc: 'El calendario (daily.tsx) usa los valores: active, pending, cancelled. La página de reservas (bookings.tsx) maneja además: confirmed. Si Supabase tiene constraints o código inserta "active" vs "confirmed" sin consistencia, los filtros fallan.',
    fix: 'Definir enum o CHECK constraint en Supabase: status IN (\'confirmed\', \'pending\', \'cancelled\'). Migrar todos los \'active\' a \'confirmed\'.',
  },
  {
    severity: 'med',
    title: 'fields — price_day y price_night son NOT NULL pero sin default',
    desc: 'Las columnas price_day, price_night y night_from_hour están marcadas como NOT NULL en el schema. El formulario de canchas (fields.tsx) las trata como opcionales. Al crear una cancha sin precio nocturno, el INSERT fallará con violación de constraint.',
    fix: 'ALTER TABLE fields ALTER COLUMN price_day SET DEFAULT 0; (mismo para price_night y night_from_hour).',
  },
  {
    severity: 'med',
    title: 'monthly_statements — schema incompleto en export',
    desc: 'Solo se ven 2 columnas (id, field_id). El modelo de negocio requiere status, amount, period_start, period_end, paid_at. El código en billing.tsx hace queries a estas columnas que podrían no existir.',
    fix: 'Exportar el schema completo de monthly_statements. Si faltan columnas, agregarlas con una migración.',
  },
  {
    severity: 'med',
    title: 'fields.owner_email — campo redundante con profiles',
    desc: 'El campo owner_email en fields duplica información de profiles.email (o auth.users.email). Si el owner cambia su email, fields.owner_email queda desactualizado.',
    fix: 'Usar siempre un JOIN con profiles o auth.users en lugar de owner_email. El campo puede deprecarse.',
  },
  {
    severity: 'low',
    title: 'bookings — campo created_by vs user_id',
    desc: 'Existen dos campos de UUID referenciando usuarios: created_by y user_id. No está claro si representan lo mismo (quien reservó) o son distintos (admin que creó vs usuario que reserva).',
    fix: 'Documentar y unificar: user_id = el jugador final (puede ser null si reservó sin cuenta), created_by = el owner/admin que registró la reserva manualmente.',
  },
  {
    severity: 'low',
    title: 'field_rates — tabla no usada en el frontend',
    desc: 'La tabla field_rates tiene una estructura de tarifas por día/hora muy flexible, pero ningún componente del admin la lee ni escribe. El sistema usa price_day/price_night en fields en cambio.',
    fix: 'Decidir si field_rates reemplazará a price_day/price_night en el futuro y eliminar la duplicidad.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="cfg-section">
      <div className="cfg-section__head">
        <h2 className="cfg-section__title">{title}</h2>
        <p className="cfg-section__sub">{sub}</p>
      </div>
      <div className="cfg-section__body">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="cfg-field">
      <label className="cfg-label">{label}</label>
      {children}
      {hint && <p className="cfg-hint">{hint}</p>}
    </div>
  )
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="cfg-toggle-row">
      <div className="cfg-toggle-row__info">
        <p className="cfg-toggle-row__label">{label}</p>
        <p className="cfg-toggle-row__sub">{sub}</p>
      </div>
      <label className="cfg-toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
        <span className="cfg-toggle__track"/>
      </label>
    </div>
  )
}

function DangerAction({ icon, title, desc, btnLabel, onConfirm }: {
  icon: string; title: string; desc: string; btnLabel: string; onConfirm: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="cfg-danger-action">
      <div className="cfg-danger-action__icon">{icon}</div>
      <div className="cfg-danger-action__body">
        <p className="cfg-danger-action__title">{title}</p>
        <p className="cfg-danger-action__desc">{desc}</p>
      </div>
      <div className="cfg-danger-action__btn">
        {!confirm ? (
          <button className="cfg-btn cfg-btn--danger-outline" onClick={() => setConfirm(true)}>
            {btnLabel}
          </button>
        ) : (
          <div className="cfg-danger-confirm">
            <span className="cfg-danger-confirm__text">¿Seguro?</span>
            <button className="cfg-btn cfg-btn--danger" onClick={() => { onConfirm(); setConfirm(false) }}>Confirmar</button>
            <button className="cfg-btn cfg-btn--ghost cfg-btn--sm" onClick={() => setConfirm(false)}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@700;800&display=swap');

.cfg {
  font-family: 'DM Sans', sans-serif;
  background: #f0f2f5;
  min-height: 100vh;
  padding: 28px 28px 64px;
  color: #0f172a;
}

/* Header */
.cfg-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:28px; }
.cfg-title  { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; letter-spacing:-.5px; margin:0; }
.cfg-subtitle { font-size:13px; color:#94a3b8; margin:3px 0 0; }

/* Layout */
.cfg-layout  { display:grid; grid-template-columns:200px 1fr; gap:20px; align-items:start; }

/* Nav */
.cfg-nav     { background:white; border-radius:16px; border:1.5px solid #eaecf0; overflow:hidden; position:sticky; top:80px; }
.cfg-navitem {
  display:flex; align-items:center; gap:10px;
  width:100%; padding:12px 16px; border:none; background:transparent;
  font-family:inherit; font-size:13px; font-weight:500; color:#64748b;
  cursor:pointer; position:relative; text-align:left; transition:all .13s;
  border-bottom:1px solid #f8fafc;
}
.cfg-navitem:last-child { border-bottom:none; }
.cfg-navitem:hover { background:#f8fafc; color:#0f172a; }
.cfg-navitem--active { background:#f0fdf4; color:#15803d; font-weight:700; }
.cfg-navitem--danger { color:#ef4444; }
.cfg-navitem--danger:hover { background:#fef2f2; }
.cfg-navitem--danger.cfg-navitem--active { background:#fef2f2; color:#dc2626; }
.cfg-navitem__icon  { font-size:16px; flex-shrink:0; }
.cfg-navitem__label { flex:1; }
.cfg-navitem__bar   { position:absolute; left:0; top:20%; height:60%; width:3px; background:#22c55e; border-radius:0 3px 3px 0; }
.cfg-navitem--danger.cfg-navitem--active .cfg-navitem__bar { background:#ef4444; }

/* Content */
.cfg-content { display:flex; flex-direction:column; gap:0; }
.cfg-section { background:white; border-radius:16px; border:1.5px solid #eaecf0; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.cfg-section__head { padding:24px 28px 0; border-bottom:1px solid #f1f5f9; padding-bottom:16px; }
.cfg-section__title{ font-family:'Syne',sans-serif; font-size:17px; font-weight:700; margin:0; }
.cfg-section__sub  { font-size:12px; color:#94a3b8; margin:3px 0 0; }
.cfg-section__body { padding:24px 28px; display:flex; flex-direction:column; gap:20px; }

/* Grid */
.cfg-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

/* Field */
.cfg-field { display:flex; flex-direction:column; gap:5px; }
.cfg-label { font-size:12px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.04em; }
.cfg-hint  { font-size:11px; color:#94a3b8; margin:0; }

/* Input */
.cfg-input {
  width:100%; padding:10px 12px; border-radius:10px;
  border:1.5px solid #e8ecf0; font-family:inherit; font-size:13px;
  color:#0f172a; background:white; outline:none; box-sizing:border-box;
  transition:border-color .15s, box-shadow .15s;
}
.cfg-input:focus { border-color:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.1); }
.cfg-input-prefix { position:relative; }
.cfg-input-prefix > span { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:600; color:#94a3b8; pointer-events:none; }
.cfg-input--inner { padding-left:26px; }

/* Toggles */
.cfg-toggles { display:flex; flex-direction:column; gap:0; border:1.5px solid #eaecf0; border-radius:12px; overflow:hidden; }
.cfg-toggle-row { display:flex; align-items:center; gap:16px; padding:16px 18px; border-bottom:1px solid #f8fafc; }
.cfg-toggle-row:last-child { border-bottom:none; }
.cfg-toggle-row__info  { flex:1; }
.cfg-toggle-row__label { font-size:13px; font-weight:600; color:#0f172a; margin:0; }
.cfg-toggle-row__sub   { font-size:11px; color:#94a3b8; margin:2px 0 0; }
.cfg-toggle       { cursor:pointer; flex-shrink:0; }
.cfg-toggle input { display:none; }
.cfg-toggle__track {
  display:block; width:40px; height:22px; border-radius:999px; background:#e2e8f0;
  position:relative; transition:background .2s;
}
.cfg-toggle__track::after {
  content:''; position:absolute; top:3px; left:3px;
  width:16px; height:16px; border-radius:50%; background:white;
  box-shadow:0 1px 3px rgba(0,0,0,.2); transition:transform .2s;
}
.cfg-toggle input:checked + .cfg-toggle__track { background:#22c55e; }
.cfg-toggle input:checked + .cfg-toggle__track::after { transform:translateX(18px); }

/* Commission model cards */
.cfg-model-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cfg-model-card  {
  padding:20px; border-radius:14px; border:2px solid #e8ecf0;
  background:white; cursor:pointer; text-align:left; font-family:inherit;
  transition:all .15s; display:flex; flex-direction:column; gap:6px;
}
.cfg-model-card:hover { border-color:#22c55e; background:#f0fdf4; }
.cfg-model-card--active { border-color:#16a34a; background:#f0fdf4; box-shadow:0 0 0 3px rgba(34,197,94,.12); }
.cfg-model-card__emoji { font-size:28px; }
.cfg-model-card__title { font-size:14px; font-weight:700; color:#0f172a; margin:0; }
.cfg-model-card__sub   { font-size:12px; color:#64748b; margin:0; }
.cfg-model-card__check { font-size:11px; font-weight:700; color:#15803d; background:#dcfce7; padding:3px 9px; border-radius:999px; width:fit-content; }

/* Preview */
.cfg-preview { background:#f8fafc; border-radius:12px; padding:18px; border:1px solid #f1f5f9; }
.cfg-preview__title { font-size:12px; font-weight:700; color:#374151; margin:0 0 12px; text-transform:uppercase; letter-spacing:.04em; }
.cfg-preview__grid  { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cfg-preview__item  { display:flex; flex-direction:column; gap:3px; }
.cfg-preview__label { font-size:11px; color:#94a3b8; font-weight:500; }
.cfg-preview__val   { font-size:15px; font-weight:700; color:#0f172a; }
.cfg-preview__val--green { color:#16a34a; }

/* Callout */
.cfg-callout {
  display:flex; gap:12px; padding:14px 16px; border-radius:12px; font-size:13px;
}
.cfg-callout--info { background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; }
.cfg-callout--warn { background:#fffbeb; border:1px solid #fde68a; color:#78350f; }
.cfg-callout__icon { font-size:18px; flex-shrink:0; margin-top:1px; }
.cfg-callout__title{ font-weight:700; margin:0 0 3px; font-size:13px; }
.cfg-callout__text { font-size:12px; margin:0; line-height:1.5; }
.cfg-callout__text code { background:rgba(0,0,0,.07); padding:1px 5px; border-radius:4px; font-size:11px; }

/* DB grid */
.cfg-db-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.cfg-db-card { background:#f8fafc; border-radius:12px; padding:16px; border:1px solid #f1f5f9; display:flex; align-items:center; gap:12px; }
.cfg-db-card__icon  { font-size:24px; flex-shrink:0; }
.cfg-db-card__info  { flex:1; min-width:0; }
.cfg-db-card__label { font-size:12px; font-weight:600; color:#374151; margin:0; }
.cfg-db-card__table { font-size:10px; color:#94a3b8; margin:2px 0 0; }
.cfg-db-card__table code { background:#e2e8f0; padding:1px 5px; border-radius:4px; }
.cfg-db-card__count { flex-shrink:0; }
.cfg-db-card__num   { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:#0f172a; }
.cfg-db-card__err   { font-size:18px; color:#cbd5e1; }

/* DB issues */
.cfg-issues { border:1.5px solid #fde68a; border-radius:14px; overflow:hidden; }
.cfg-issues__title { font-size:13px; font-weight:700; color:#78350f; background:#fffbeb; padding:12px 16px; margin:0; border-bottom:1px solid #fde68a; }
.cfg-issues__list  { display:flex; flex-direction:column; }
.cfg-issue { display:flex; gap:10px; padding:14px 16px; border-bottom:1px solid #fefce8; }
.cfg-issue:last-child { border-bottom:none; }
.cfg-issue__sev  { font-size:16px; flex-shrink:0; margin-top:1px; }
.cfg-issue__title{ font-size:12px; font-weight:700; color:#0f172a; margin:0 0 3px; }
.cfg-issue__desc { font-size:11px; color:#64748b; margin:0 0 4px; line-height:1.5; }
.cfg-issue__fix  { font-size:11px; color:#15803d; margin:0; line-height:1.4; }
.cfg-issue--high { background:#fff; }
.cfg-issue--med  { background:#fffef5; }
.cfg-issue--low  { background:#fafafa; }

/* Danger zone */
.cfg-danger-list   { display:flex; flex-direction:column; gap:0; border:2px solid #fecaca; border-radius:14px; overflow:hidden; }
.cfg-danger-action { display:flex; align-items:center; gap:14px; padding:18px 20px; border-bottom:1px solid #fef2f2; }
.cfg-danger-action:last-child { border-bottom:none; }
.cfg-danger-action__icon { font-size:24px; flex-shrink:0; }
.cfg-danger-action__body { flex:1; }
.cfg-danger-action__title{ font-size:13px; font-weight:700; color:#0f172a; margin:0 0 2px; }
.cfg-danger-action__desc { font-size:11px; color:#94a3b8; margin:0; }
.cfg-danger-action__btn  { flex-shrink:0; }
.cfg-danger-confirm { display:flex; align-items:center; gap:7px; }
.cfg-danger-confirm__text { font-size:12px; font-weight:600; color:#dc2626; }

/* Buttons */
.cfg-btn {
  display:inline-flex; align-items:center; gap:7px;
  padding:9px 18px; border-radius:10px;
  font-size:13px; font-weight:600; font-family:inherit;
  cursor:pointer; border:none; transition:all .14s; white-space:nowrap;
}
.cfg-btn--primary { background:#0f172a; color:white; }
.cfg-btn--primary:hover:not(:disabled) { background:#1e293b; }
.cfg-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
.cfg-btn--ghost   { background:transparent; color:#374151; border:1.5px solid #e2e8f0; }
.cfg-btn--ghost:hover { background:#f8fafc; }
.cfg-btn--danger  { background:#ef4444; color:white; }
.cfg-btn--danger:hover { background:#dc2626; }
.cfg-btn--danger-outline { background:transparent; color:#ef4444; border:1.5px solid #fecaca; }
.cfg-btn--danger-outline:hover { background:#fef2f2; border-color:#ef4444; }
.cfg-btn--sm { padding:6px 12px; font-size:11px; border-radius:7px; }

/* Spinner */
.cfg-spinner { width:13px; height:13px; border-radius:50%; border:2px solid rgba(255,255,255,.3); border-top-color:white; animation:cfgSpin .7s linear infinite; }
@keyframes cfgSpin { to{transform:rotate(360deg)} }

/* Skeleton */
.cfg-sk { background:linear-gradient(90deg,#f1f5f9 25%,#e8ecf2 50%,#f1f5f9 75%); background-size:200% 100%; animation:cfgShimmer 1.6s infinite; border-radius:6px; display:inline-block; }
.cfg-sk--sm { height:22px; width:40px; }
@keyframes cfgShimmer { to{background-position:-200% 0} }

/* Toast */
.cfg-toast { position:fixed; bottom:28px; right:28px; z-index:9999; padding:12px 20px; border-radius:12px; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; box-shadow:0 8px 32px rgba(0,0,0,.18); animation:cfgToastIn .2s ease; }
.cfg-toast--ok  { background:#0f172a; color:white; }
.cfg-toast--err { background:#ef4444; color:white; }
@keyframes cfgToastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* Responsive */
@media (max-width:900px) {
  .cfg-layout { grid-template-columns:1fr; }
  .cfg-nav    { display:flex; flex-direction:row; overflow-x:auto; position:static; }
  .cfg-navitem { flex-shrink:0; padding:10px 14px; border-bottom:none; border-right:1px solid #f8fafc; }
  .cfg-navitem__bar { top:auto; bottom:0; left:20%; width:60%; height:3px; border-radius:3px 3px 0 0; }
  .cfg-grid2  { grid-template-columns:1fr; }
  .cfg-db-grid { grid-template-columns:1fr 1fr; }
  .cfg-preview__grid { grid-template-columns:1fr; }
  .cfg-model-cards { grid-template-columns:1fr; }
  .cfg-danger-action { flex-direction:column; align-items:flex-start; }
}
@media (max-width:600px) {
  .cfg { padding:16px 16px 60px; }
  .cfg-db-grid { grid-template-columns:1fr; }
}
`
