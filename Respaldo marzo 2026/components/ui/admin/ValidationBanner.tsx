/**
 * GolPlay — ValidationBanner
 * components/ui/admin/ValidationBanner.tsx
 *
 * Componente autónomo de validación de congruencia de datos.
 * Se importa en cualquier página de admin con una sola línea:
 *   <ValidationBanner />
 *
 * Hace su propio fetch a Supabase y detecta:
 * - Reservas sin precio
 * - Reservas sin cliente (nombre vacío)
 * - Reservas sin cédula
 * - Reservas sin datos de contacto
 * - Conflictos de horario (misma cancha + fecha + hora)
 * - Clientes sin reservas (registrados pero inactivos)
 * - Canchas sin reservas recientes
 * - Precios especiales sin reservas asociadas
 *
 * Features:
 * - Fetch propio con cache en sessionStorage (5 min TTL)
 * - Colapsable/expandible
 * - Cuenta errores (rojos) y warnings (amarillos)
 * - Cierre temporal por sesión
 * - No renderiza nada si no hay issues
 *
 * Sin Tailwind. Estilos inline.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationIssue {
  id: string
  type: 'error' | 'warn'
  category: 'bookings' | 'customers' | 'fields' | 'pricing'
  msg: string
  count: number
  icon: string
}

interface CachedData {
  ts: number
  issues: ValidationIssue[]
}

const CACHE_KEY = 'golplay_validation_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const DISMISSED_KEY = 'golplay_validation_dismissed'

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  bookings:  { label: 'Reservas',  icon: '📋' },
  customers: { label: 'Clientes',  icon: '👥' },
  fields:    { label: 'Canchas',   icon: '⚽' },
  pricing:   { label: 'Precios',   icon: '💰' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ValidationBanner() {
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Check if dismissed this session
  useEffect(() => {
    try {
      const d = sessionStorage.getItem(DISMISSED_KEY)
      if (d === 'true') setDismissed(true)
    } catch {}
  }, [])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id)
      else setLoading(false)
    })
  }, [])

  // Fetch & validate
  const runValidation = useCallback(async () => {
    if (!userId) return

    // Check cache
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed: CachedData = JSON.parse(cached)
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setIssues(parsed.issues)
          setLoading(false)
          return
        }
      }
    } catch {}

    setLoading(true)

    try {
      // Fetch all data in parallel
      const [fieldsRes, bookingsRes, customersRes, pricingRes] = await Promise.all([
        supabase.from('fields').select('id, name, active').eq('owner_id', userId),
        supabase.from('bookings').select('id, date, hour, status, price, field_id, customer_name, customer_phone, customer_email, customer_id_number, customer_ref')
          .in('field_id', (await supabase.from('fields').select('id').eq('owner_id', userId)).data?.map((f: any) => f.id) || [-1]),
        supabase.from('complexes').select('id').eq('owner_id', userId).limit(1).single()
          .then(async ({ data: cx }) => {
            if (!cx) return { data: [] }
            return supabase.from('complex_customers').select('id, first_name, last_name, id_number, phone, email').eq('complex_id', cx.id)
          }),
        supabase.from('complexes').select('id').eq('owner_id', userId).limit(1).single()
          .then(async ({ data: cx }) => {
            if (!cx) return { data: [] }
            const custs = await supabase.from('complex_customers').select('id').eq('complex_id', cx.id)
            const custIds = custs.data?.map((c: any) => c.id) || [-1]
            return supabase.from('customer_pricing').select('id, customer_id, field_id, price').in('customer_id', custIds)
          }),
      ])

      const fields = fieldsRes.data || []
      const bookings = bookingsRes.data || []
      const customers = (customersRes as any).data || []
      const pricingData = (pricingRes as any).data || []

      const fieldIds = new Set(fields.map((f: any) => f.id))
      const activeBookings = bookings.filter((b: any) => b.status !== 'cancelled')
      const now = new Date().toISOString().split('T')[0]

      const found: ValidationIssue[] = []

      // ═══ BOOKINGS VALIDATIONS ═══

      // Reservas sin precio
      const noPrice = activeBookings.filter((b: any) => !b.price || Number(b.price) === 0)
      if (noPrice.length > 0) {
        found.push({ id: 'bk_no_price', type: 'error', category: 'bookings', count: noPrice.length, icon: '💸',
          msg: `${noPrice.length} reserva${noPrice.length > 1 ? 's' : ''} activa${noPrice.length > 1 ? 's' : ''} sin precio asignado` })
      }

      // Conflictos de horario
      const slotMap: Record<string, number> = {}
      activeBookings.forEach((b: any) => {
        const key = `${b.field_id}|${b.date}|${b.hour}`
        slotMap[key] = (slotMap[key] || 0) + 1
      })
      const conflictSlots = Object.values(slotMap).filter(v => v > 1).length
      if (conflictSlots > 0) {
        found.push({ id: 'bk_conflicts', type: 'error', category: 'bookings', count: conflictSlots, icon: '⚠️',
          msg: `${conflictSlots} franja${conflictSlots > 1 ? 's' : ''} horaria${conflictSlots > 1 ? 's' : ''} con reservas duplicadas (conflicto)` })
      }

      // Reservas sin nombre de cliente
      const noName = activeBookings.filter((b: any) => !b.customer_name?.trim())
      if (noName.length > 0) {
        found.push({ id: 'bk_no_name', type: 'warn', category: 'bookings', count: noName.length, icon: '👤',
          msg: `${noName.length} reserva${noName.length > 1 ? 's' : ''} sin nombre de cliente` })
      }

      // Reservas sin cédula
      const noCedula = activeBookings.filter((b: any) => !b.customer_id_number?.trim())
      if (noCedula.length > 0) {
        found.push({ id: 'bk_no_cedula', type: 'warn', category: 'bookings', count: noCedula.length, icon: '🪪',
          msg: `${noCedula.length} reserva${noCedula.length > 1 ? 's' : ''} sin cédula del cliente` })
      }

      // Reservas sin contacto (ni teléfono ni email)
      const noContact = activeBookings.filter((b: any) => !b.customer_phone?.trim() && !b.customer_email?.trim())
      if (noContact.length > 0) {
        found.push({ id: 'bk_no_contact', type: 'warn', category: 'bookings', count: noContact.length, icon: '📵',
          msg: `${noContact.length} reserva${noContact.length > 1 ? 's' : ''} sin datos de contacto (ni teléfono ni email)` })
      }

      // Reservas sin vincular a cliente (customer_ref null)
      const noRef = activeBookings.filter((b: any) => !b.customer_ref)
      if (noRef.length > 0) {
        found.push({ id: 'bk_no_ref', type: 'warn', category: 'bookings', count: noRef.length, icon: '🔗',
          msg: `${noRef.length} reserva${noRef.length > 1 ? 's' : ''} sin vincular al CRM de clientes (customer_ref vacío)` })
      }

      // Reservas con field_id que no existe en fields del owner
      const orphanField = activeBookings.filter((b: any) => !fieldIds.has(b.field_id))
      if (orphanField.length > 0) {
        found.push({ id: 'bk_orphan_field', type: 'error', category: 'bookings', count: orphanField.length, icon: '🏚️',
          msg: `${orphanField.length} reserva${orphanField.length > 1 ? 's' : ''} asignada${orphanField.length > 1 ? 's' : ''} a canchas que no existen o no te pertenecen` })
      }

      // ═══ CUSTOMERS VALIDATIONS ═══

      // Clientes sin cédula
      const custNoCedula = customers.filter((c: any) => !c.id_number?.trim())
      if (custNoCedula.length > 0) {
        found.push({ id: 'cx_no_cedula', type: 'warn', category: 'customers', count: custNoCedula.length, icon: '🪪',
          msg: `${custNoCedula.length} cliente${custNoCedula.length > 1 ? 's' : ''} sin cédula registrada` })
      }

      // Clientes sin teléfono
      const custNoPhone = customers.filter((c: any) => !c.phone?.trim())
      if (custNoPhone.length > 0) {
        found.push({ id: 'cx_no_phone', type: 'warn', category: 'customers', count: custNoPhone.length, icon: '📱',
          msg: `${custNoPhone.length} cliente${custNoPhone.length > 1 ? 's' : ''} sin teléfono` })
      }

      // Clientes sin reservas (registrados pero nunca reservaron)
      const customerIdsWithBookings = new Set(bookings.map((b: any) => b.customer_ref).filter(Boolean))
      const deadCustomers = customers.filter((c: any) => !customerIdsWithBookings.has(c.id))
      if (deadCustomers.length > 0) {
        found.push({ id: 'cx_no_bookings', type: 'warn', category: 'customers', count: deadCustomers.length, icon: '💤',
          msg: `${deadCustomers.length} cliente${deadCustomers.length > 1 ? 's' : ''} registrado${deadCustomers.length > 1 ? 's' : ''} sin ninguna reserva` })
      }

      // ═══ FIELDS VALIDATIONS ═══

      // Canchas inactivas
      const inactiveFields = fields.filter((f: any) => f.active === false)
      if (inactiveFields.length > 0) {
        found.push({ id: 'fd_inactive', type: 'warn', category: 'fields', count: inactiveFields.length, icon: '🔴',
          msg: `${inactiveFields.length} cancha${inactiveFields.length > 1 ? 's' : ''} desactivada${inactiveFields.length > 1 ? 's' : ''}` })
      }

      // Canchas sin reservas en últimos 30 días
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const recentFieldIds = new Set(activeBookings.filter((b: any) => b.date >= thirtyDaysAgo).map((b: any) => b.field_id))
      const activeFields = fields.filter((f: any) => f.active !== false)
      const coldFields = activeFields.filter((f: any) => !recentFieldIds.has(f.id))
      if (coldFields.length > 0) {
        found.push({ id: 'fd_cold', type: 'warn', category: 'fields', count: coldFields.length, icon: '❄️',
          msg: `${coldFields.length} cancha${coldFields.length > 1 ? 's' : ''} activa${coldFields.length > 1 ? 's' : ''} sin reservas en los últimos 30 días` })
      }

      // ═══ PRICING VALIDATIONS ═══

      // Precios especiales asignados a canchas que no existen
      const orphanPricing = pricingData.filter((p: any) => !fieldIds.has(p.field_id))
      if (orphanPricing.length > 0) {
        found.push({ id: 'pr_orphan', type: 'error', category: 'pricing', count: orphanPricing.length, icon: '🔗',
          msg: `${orphanPricing.length} precio${orphanPricing.length > 1 ? 's' : ''} especial${orphanPricing.length > 1 ? 'es' : ''} asignado${orphanPricing.length > 1 ? 's' : ''} a canchas que no existen` })
      }

      // Precios especiales con monto 0
      const zeroPricing = pricingData.filter((p: any) => !p.price || Number(p.price) === 0)
      if (zeroPricing.length > 0) {
        found.push({ id: 'pr_zero', type: 'error', category: 'pricing', count: zeroPricing.length, icon: '💸',
          msg: `${zeroPricing.length} precio${zeroPricing.length > 1 ? 's' : ''} especial${zeroPricing.length > 1 ? 'es' : ''} con monto en ₡0` })
      }

      // Sort: errors first, then warnings
      found.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'error' ? -1 : 1
        return b.count - a.count
      })

      setIssues(found)

      // Cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), issues: found }))
      } catch {}

    } catch (err) {
      console.error('ValidationBanner: fetch error', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { runValidation() }, [runValidation])

  // ── Derived ──
  const errorCount = useMemo(() => issues.filter(i => i.type === 'error').length, [issues])
  const warnCount = useMemo(() => issues.filter(i => i.type === 'warn').length, [issues])
  const grouped = useMemo(() => {
    const map: Record<string, ValidationIssue[]> = {}
    issues.forEach(i => {
      if (!map[i.category]) map[i.category] = []
      map[i.category].push(i)
    })
    return map
  }, [issues])

  const dismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISSED_KEY, 'true') } catch {}
  }

  const refresh = () => {
    try { sessionStorage.removeItem(CACHE_KEY) } catch {}
    runValidation()
  }

  // ── Don't render if dismissed, loading, or no issues ──
  if (dismissed || loading || issues.length === 0) return null

  return (
    <div style={S.container}>
      {/* Collapsed bar */}
      <div style={S.bar} onClick={() => setExpanded(v => !v)}>
        <div style={S.barLeft}>
          <span style={S.barIcon}>🔍</span>
          <span style={S.barTitle}>Control de datos</span>
          {errorCount > 0 && (
            <span style={S.countBadge('#dc2626', '#fef2f2')}>
              {errorCount} error{errorCount > 1 ? 'es' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span style={S.countBadge('#d97706', '#fffbeb')}>
              {warnCount} alerta{warnCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={S.barRight}>
          <button onClick={e => { e.stopPropagation(); refresh() }} style={S.refreshBtn} title="Refrescar validación">
            ↻
          </button>
          <button onClick={e => { e.stopPropagation(); dismiss() }} style={S.dismissBtn} title="Ocultar por esta sesión">
            ✕
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={S.detail}>
          {Object.entries(grouped).map(([cat, catIssues]) => {
            const meta = CATEGORY_META[cat] || { label: cat, icon: '📋' }
            return (
              <div key={cat} style={S.group}>
                <div style={S.groupHead}>
                  <span>{meta.icon}</span>
                  <span style={S.groupLabel}>{meta.label}</span>
                  <span style={S.groupCount}>{catIssues.length}</span>
                </div>
                {catIssues.map(issue => (
                  <div key={issue.id} style={S.issueRow}>
                    <span style={S.issueDot(issue.type)} />
                    <span style={S.issueIcon}>{issue.icon}</span>
                    <span style={{ ...S.issueMsg, color: issue.type === 'error' ? '#b91c1c' : '#92400e' }}>
                      {issue.msg}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
          <p style={S.footerNote}>
            Se actualiza cada 5 minutos · <button onClick={refresh} style={S.footerLink}>Refrescar ahora</button>
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, any> = {
  container: {
    background: '#fff',
    border: '1px solid #fde68a',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,.04)',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    cursor: 'pointer',
    background: '#fffbeb',
    transition: 'background 0.15s',
    userSelect: 'none',
  },
  barLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  barIcon: { fontSize: 14 },
  barTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#92400e',
  },
  countBadge: (color: string, bg: string): React.CSSProperties => ({
    fontSize: 10,
    fontWeight: 700,
    color,
    background: bg,
    padding: '2px 8px',
    borderRadius: 999,
    border: `1px solid ${color}22`,
  }),
  barRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    color: '#94a3b8',
    padding: '2px 4px',
    borderRadius: 4,
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: '#94a3b8',
    padding: '2px 4px',
    borderRadius: 4,
  },
  detail: {
    padding: '4px 16px 14px',
    borderTop: '1px solid #fef3c7',
  },
  group: {
    marginBottom: 12,
  },
  groupHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '1px solid #fef9c3',
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#92400e',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  groupCount: {
    fontSize: 9,
    fontWeight: 700,
    color: '#92400e',
    background: '#fef3c7',
    padding: '1px 6px',
    borderRadius: 999,
  },
  issueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0 4px 8px',
    fontSize: 12,
  },
  issueDot: (type: string): React.CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: type === 'error' ? '#dc2626' : '#f59e0b',
    flexShrink: 0,
  }),
  issueIcon: { fontSize: 12, flexShrink: 0 },
  issueMsg: {
    fontSize: 12,
    fontWeight: 500,
  },
  footerNote: {
    fontSize: 10,
    color: '#94a3b8',
    margin: '8px 0 0',
    textAlign: 'center' as const,
  },
  footerLink: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 600,
    textDecoration: 'underline',
    padding: 0,
  },
}
