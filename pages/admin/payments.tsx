/**
 * GolPlay — Pagos & Facturación
 * ─────────────────────────────────────────────────────────────────────────────
 * Sin Tailwind. Estilos inline puros. Compatible con cualquier Next.js stack.
 *
 * Arquitectura preparada para dLocal:
 *   - useDLocalPayment hook (mock) listo para conectar con SDK real
 *   - PaymentModal con flujo de 3 pasos: confirm → processing → result
 *   - Tipos de transacción: commission | subscription | adjustment
 *   - Manejo de estados: paid | pending | failed | processing
 *
 * Dependencias: npm install lucide-react date-fns
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import {
  CheckCircle, Clock, AlertCircle, XCircle, CreditCard,
  Download, FileText, RefreshCw, Shield, ChevronRight,
  TrendingUp, Calendar, DollarSign, AlertTriangle, X,
  Loader2, ArrowUpRight, Lock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'paid' | 'pending' | 'failed' | 'processing'
type StatementType = 'commission' | 'subscription' | 'adjustment'

interface Statement {
  id: string
  field_id: number
  month: number
  year: number
  reservations_count: number
  amount_due: number
  due_date: string
  paid_at: string | null
  status: PaymentStatus
  type?: StatementType
  transaction_id?: string | null
  payment_method?: string | null
}

type PayStep = 'confirm' | 'processing' | 'success' | 'error'

// ─── dLocal Integration Layer (Mock — ready for real SDK) ─────────────────────
async function mockDLocalCharge(params: {
  amount: number
  currency: string
  statementId: string
  fieldId: number
}): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  await new Promise(r => setTimeout(r, 2200))
  const simulateSuccess = Math.random() > 0.15
  if (simulateSuccess) {
    return {
      success: true,
      transactionId: `DL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    }
  }
  return { success: false, error: 'La transacción fue rechazada. Intenta nuevamente.' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => `$${Number(v).toFixed(2)}`

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const monthName = (m: number) => MONTHS[(m - 1)] ?? ''

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

const typeLabel: Record<StatementType, string> = {
  commission: 'Comisión reservas',
  subscription: 'Suscripción mensual',
  adjustment: 'Ajuste',
}

const typeColor: Record<StatementType, string> = {
  commission: '#2563eb',
  subscription: '#7c3aed',
  adjustment: '#0891b2',
}

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<PaymentStatus, {
  label: string; color: string; bg: string; border: string; Icon: any
}> = {
  paid:       { label: 'Pagado',     color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle },
  pending:    { label: 'Pendiente',  color: '#b45309', bg: '#fffbeb', border: '#fde68a', Icon: Clock },
  failed:     { label: 'Fallido',    color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', Icon: XCircle },
  processing: { label: 'Procesando', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', Icon: Loader2 },
}

// ─── Skeleton helper (fuera del objeto S para evitar error de tipos) ───────────
const skel = (h = 16, w: string | number = '60%'): React.CSSProperties => ({
  height: h,
  width: w,
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '200% 100%',
  borderRadius: 6,
  animation: 'pulse 1.5s infinite',
  display: 'block',
})

// ─── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    background: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  inner: { maxWidth: 1200, margin: '0 auto', padding: '32px 20px' },

  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28,
  },
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 0 },
  headerActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },

  btnPrimary: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 18px', fontSize: 14, fontWeight: 600,
    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    color: '#fff', border: 'none', borderRadius: 12,
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,.35)',
  },
  btnOutline: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 16px', fontSize: 13, fontWeight: 500,
    background: '#fff', color: '#475569',
    border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer',
  },
  btnDanger: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', fontSize: 12, fontWeight: 600,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  btnSuccess: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', fontSize: 12, fontWeight: 600,
    background: 'linear-gradient(135deg, #15803d, #16a34a)',
    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
  },

  // Alert banner
  alertBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 14, padding: '14px 18px', marginBottom: 24,
  },

  // KPI grid
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 16, marginBottom: 28,
  },
  kpiCard: {
    background: '#fff', border: '1px solid #f1f5f9',
    borderRadius: 16, padding: '18px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,.05)',
  },
  kpiTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  kpiValue: { fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1, margin: 0 },
  kpiLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 0 },

  // Card
  card: {
    background: '#fff', border: '1px solid #f1f5f9',
    borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden',
  },
  cardHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 20px 16px', borderBottom: '1px solid #f8fafc',
  },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 },
  cardSub: { fontSize: 12, color: '#94a3b8', marginTop: 2, marginBottom: 0 },

  // Table
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', fontSize: 11, fontWeight: 600,
    color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: '0.07em', textAlign: 'left',
    background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '14px 16px', fontSize: 13, color: '#374151',
    borderBottom: '1px solid #f8fafc', verticalAlign: 'middle',
  },

  // Mobile card
  mobileCard: {
    border: '1px solid #f1f5f9', borderRadius: 14,
    padding: 16, marginBottom: 12, background: '#fff',
  },

  // Empty state
  empty: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '56px 24px', color: '#94a3b8', gap: 12,
  },

  // Security badge
  securityBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#94a3b8', marginTop: 16,
    justifyContent: 'center',
  },

  // Modal overlay
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999, padding: 20,
  },
  modal: {
    background: '#fff', borderRadius: 20, padding: 32,
    width: '100%', maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,.2)',
    position: 'relative',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  modalSub: { fontSize: 13, color: '#64748b', marginBottom: 20 },

  divider: { height: 1, background: '#f1f5f9', margin: '20px 0' },
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending
  const { Icon } = cfg
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <Icon size={11} style={status === 'processing' ? { animation: 'spin 1s linear infinite' } : {}} />
      {cfg.label}
    </span>
  )
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type?: StatementType }) {
  const t = type ?? 'commission'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 10, fontWeight: 600,
      color: typeColor[t],
      background: typeColor[t] + '15',
      letterSpacing: '0.03em',
    }}>
      {typeLabel[t].toUpperCase()}
    </span>
  )
}

// ─── KPICard ──────────────────────────────────────────────────────────────────
function KPICard({
  icon: Icon, iconBg, iconColor, value, label, sub, loading, highlight,
}: {
  icon: any; iconBg: string; iconColor: string
  value: string; label: string; sub?: string; loading: boolean; highlight?: boolean
}) {
  return (
    <div style={{
      ...S.kpiCard,
      ...(highlight ? { border: '1px solid #bfdbfe', boxShadow: '0 0 0 3px rgba(37,99,235,.07)' } : {}),
    }}>
      <div style={S.kpiTop}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={iconColor} />
        </div>
        {highlight && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 999 }}>
            ACCIÓN REQUERIDA
          </span>
        )}
      </div>
      {loading ? (
        <>
          <span style={skel(26, '50%')} />
          <span style={{ ...skel(12, '70%'), marginTop: 8 }} />
        </>
      ) : (
        <>
          <p style={S.kpiValue}>{value}</p>
          <p style={S.kpiLabel}>{label}</p>
          {sub && <p style={{ ...S.kpiLabel, color: '#cbd5e1', marginTop: 2 }}>{sub}</p>}
        </>
      )}
    </div>
  )
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({
  statement,
  onClose,
  onSuccess,
}: {
  statement: Statement
  onClose: () => void
  onSuccess: (txId: string) => void
}) {
  const [step, setStep] = useState<PayStep>('confirm')
  const [error, setError] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)

  const handlePay = async () => {
    setStep('processing')
    setError(null)
    try {
      const result = await mockDLocalCharge({
        amount: statement.amount_due,
        currency: 'USD',
        statementId: statement.id,
        fieldId: statement.field_id,
      })

      if (result.success && result.transactionId) {
        await supabase
          .from('monthly_statements')
          .update({ status: 'paid', paid_at: new Date().toISOString(), transaction_id: result.transactionId })
          .eq('id', statement.id)

        setTxId(result.transactionId)
        setStep('success')
      } else {
        setError(result.error ?? 'Error desconocido')
        setStep('error')
      }
    } catch (e: any) {
      setError(e.message ?? 'Error de conexión')
      setStep('error')
    }
  }

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget && step !== 'processing') onClose() }}>
      <div style={S.modal} role="dialog" aria-modal="true">

        {/* Close */}
        {step !== 'processing' && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        )}

        {/* ── Step: Confirm ── */}
        {step === 'confirm' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} color="#2563eb" />
              </div>
              <div>
                <p style={S.modalTitle}>Confirmar pago</p>
              </div>
            </div>
            <p style={S.modalSub}>Estás por pagar la factura de {monthName(statement.month)} {statement.year}</p>

            {/* Summary */}
            <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 20 }}>
              {[
                ['Período', `${monthName(statement.month)} ${statement.year}`],
                ['Concepto', typeLabel[statement.type ?? 'commission']],
                ['Reservas', statement.reservations_count.toString()],
                ['Vencimiento', formatDate(statement.due_date)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                  <span>{k}</span><span style={{ fontWeight: 500, color: '#374151' }}>{v}</span>
                </div>
              ))}
              <div style={S.divider} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
                <span style={{ color: '#374151' }}>Total</span>
                <span style={{ color: '#0f172a' }}>{fmt(statement.amount_due)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...S.btnOutline, flex: 1, justifyContent: 'center' }} onClick={onClose}>
                Cancelar
              </button>
              <button style={{ ...S.btnPrimary, flex: 2, justifyContent: 'center' }} onClick={handlePay}>
                <Lock size={14} />
                Pagar {fmt(statement.amount_due)}
              </button>
            </div>

            <div style={S.securityBadge}>
              <Shield size={11} />
              Transacción cifrada con TLS · Procesado por dLocal
            </div>
          </>
        )}

        {/* ── Step: Processing ── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Procesando pago…</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No cierres esta ventana. Estamos confirmando tu transacción con dLocal.</p>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} color="#16a34a" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>¡Pago exitoso!</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
              Tu pago de <strong>{fmt(statement.amount_due)}</strong> fue procesado correctamente.
            </p>
            {txId && (
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                ID de transacción: <strong style={{ color: '#374151' }}>{txId}</strong>
              </div>
            )}
            <button
              style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center' }}
              onClick={() => { onSuccess(txId ?? ''); onClose() }}
            >
              Listo
            </button>
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <XCircle size={32} color="#dc2626" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Pago fallido</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>{error}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...S.btnOutline, flex: 1, justifyContent: 'center' }} onClick={onClose}>Cerrar</button>
              <button style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center' }} onClick={() => setStep('confirm')}>
                Reintentar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Export CSV ────────────────────────────────────────────────────────────────
function exportStatements(statements: Statement[]) {
  const rows = [
    ['Período', 'Concepto', 'Reservas', 'Monto (USD)', 'Vencimiento', 'Estado', 'ID Transacción', 'Pagado el'],
    ...statements.map(s => [
      `${monthName(s.month)} ${s.year}`,
      typeLabel[s.type ?? 'commission'],
      s.reservations_count,
      s.amount_due,
      s.due_date,
      s.status,
      s.transaction_id ?? '',
      s.paid_at ? formatDate(s.paid_at) : '',
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `golplay-pagos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

// ─── Download Receipt (client-side HTML → print/PDF) ──────────────────────────
function downloadReceipt(s: Statement) {
  const period   = `${monthName(s.month)} ${s.year}`
  const paidDate = s.paid_at ? formatDate(s.paid_at) : '—'
  const txId     = s.transaction_id ?? '—'
  const concept  = typeLabel[s.type ?? 'commission']
  const amount   = fmt(s.amount_due)
  const receiptNo = `GP-${s.year}${String(s.month).padStart(2,'0')}-${s.id.slice(0,6).toUpperCase()}`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Comprobante ${receiptNo} — GolPlay</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#0f172a;padding:48px;max-width:680px;margin:0 auto}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:40px}
    .logo-icon{width:40px;height:40px;background:#16a34a;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;font-weight:900;line-height:1}
    .logo-text{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-.03em}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:2px solid #f1f5f9}
    .title{font-size:28px;font-weight:700;color:#0f172a;margin-bottom:4px}
    .subtitle{font-size:13px;color:#64748b}
    .badge-paid{display:inline-flex;align-items:center;gap:5px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;margin-top:8px}
    .section-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden;margin-bottom:28px}
    .info-item{padding:14px 18px;border-bottom:1px solid #f8fafc}
    .info-item:nth-child(odd){border-right:1px solid #f8fafc}
    .info-item:nth-last-child(-n+2){border-bottom:none}
    .info-label{font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:3px}
    .info-value{font-size:14px;font-weight:600;color:#0f172a}
    .total-box{background:#f8fafc;border-radius:12px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}
    .total-label{font-size:15px;color:#374151}
    .total-amount{font-size:28px;font-weight:800;color:#0f172a}
    .tx-box{background:#f1f5f9;border-radius:10px;padding:12px 16px;font-family:monospace;font-size:11px;color:#64748b;margin-bottom:32px;word-break:break-all}
    .tx-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
    .footer{text-align:center;font-size:11px;color:#cbd5e1;border-top:1px solid #f1f5f9;padding-top:20px;line-height:1.7}
    @media print{body{padding:24px}@page{margin:15mm}}
  </style>
</head>
<body>
  <div class="logo">
    <div class="logo-icon">⚽</div>
    <span class="logo-text">GolPlay</span>
  </div>

  <div class="header">
    <div>
      <div class="title">Comprobante de pago</div>
      <div class="subtitle">N° ${receiptNo}</div>
      <div class="badge-paid">✓ Pago confirmado</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">Fecha de emisión</div>
      <div style="font-size:14px;font-weight:600">${new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
    </div>
  </div>

  <div class="section-title">Detalle del cobro</div>
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Período</div><div class="info-value">${period}</div></div>
    <div class="info-item"><div class="info-label">Concepto</div><div class="info-value">${concept}</div></div>
    <div class="info-item"><div class="info-label">Reservas cobradas</div><div class="info-value">${s.reservations_count}</div></div>
    <div class="info-item"><div class="info-label">Fecha de pago</div><div class="info-value">${paidDate}</div></div>
    <div class="info-item"><div class="info-label">Fecha de vencimiento</div><div class="info-value">${formatDate(s.due_date)}</div></div>
    <div class="info-item"><div class="info-label">Método</div><div class="info-value">${s.payment_method ?? 'Tarjeta (dLocal)'}</div></div>
  </div>

  <div class="total-box">
    <span class="total-label">Total pagado</span>
    <span class="total-amount">${amount}</span>
  </div>

  <div class="section-title">ID de transacción</div>
  <div class="tx-box">
    <div class="tx-label">Referencia dLocal</div>
    ${txId}
  </div>

  <div class="footer">
    GolPlay — Marketplace de canchas deportivas en LATAM<br/>
    Este comprobante es válido como constancia de pago. Para consultas: soporte@golplay.com<br/>
    golplay.com · Todos los derechos reservados ${new Date().getFullYear()}
  </div>
</body>
</html>`

  // Abre en nueva pestaña → el usuario puede guardar como PDF con Ctrl+P / Cmd+P
  const win = window.open('', '_blank', 'width=780,height=900')
  if (!win) {
    // Fallback: si el navegador bloquea popups, descarga como archivo .html
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = `comprobante-${receiptNo}.html`
    a.click()
    return
  }
  win.document.write(html)
  win.document.close()
  // Pequeño delay para que el navegador renderice antes de abrir el diálogo de impresión
  setTimeout(() => { win.focus(); win.print() }, 350)
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function BillingPage() {
  const router = useRouter()
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payingStatement, setPayingStatement] = useState<Statement | null>(null)
  const [isWide, setIsWide] = useState(true)

  // Responsive
  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setAuthReady(true)
    })
  }, [router])

  // Load data
  const loadStatements = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('monthly_statements')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }
    setStatements(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (authReady) loadStatements() }, [authReady, loadStatements])

  // Derived KPIs
  const kpis = useMemo(() => {
    const pending = statements.filter(s => s.status === 'pending' || s.status === 'failed')
    const paid = statements.filter(s => s.status === 'paid')
    const totalPending = pending.reduce((s, r) => s + r.amount_due, 0)
    const nextDue = pending.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
    const now = new Date()
    const paidThisMonth = paid.filter(s => {
      if (!s.paid_at) return false
      const d = new Date(s.paid_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const paidThisMonthTotal = paidThisMonth.reduce((s, r) => s + r.amount_due, 0)
    return { totalPending, nextDue, pendingCount: pending.length, paidThisMonthTotal }
  }, [statements])

  const handlePaySuccess = useCallback(() => { loadStatements() }, [loadStatements])

  if (!authReady) return null

  // ── Render ──
  return (
    <AdminLayout>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes spin  { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        button:hover { opacity: .9; }
      `}</style>

      <div style={S.page}>
        <div style={S.inner}>

          {/* ── Header ── */}
          <div style={S.header}>
            <div>
              <h1 style={S.h1}>Pagos & Facturación</h1>
              <p style={S.headerSub}>Historial de comisiones y estados de cuenta · GolPlay</p>
            </div>
            <div style={S.headerActions}>
              <button style={S.btnOutline} onClick={loadStatements} disabled={loading}>
                <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
                Actualizar
              </button>
              <button style={S.btnOutline} onClick={() => exportStatements(statements)} disabled={statements.length === 0}>
                <Download size={13} />
                Exportar
              </button>
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div style={S.alertBanner}>
              <AlertCircle size={18} color="#dc2626" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#b91c1c' }}>Error al cargar datos</p>
                <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{error}</p>
              </div>
              <button onClick={loadStatements} style={{ ...S.btnOutline, padding: '6px 12px', fontSize: 12 }}>Reintentar</button>
            </div>
          )}

          {/* ── Overdue alert ── */}
          {!loading && statements.some(s => s.status === 'failed' || (s.status === 'pending' && new Date(s.due_date) < new Date())) && (
            <div style={{ ...S.alertBanner, marginBottom: 24 }}>
              <AlertTriangle size={18} color="#dc2626" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#b91c1c' }}>Tienes pagos vencidos</p>
                <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>Regulariza tu cuenta para evitar interrupciones del servicio.</p>
              </div>
              <ArrowUpRight size={16} color="#dc2626" />
            </div>
          )}

          {/* ── KPIs ── */}
          <div style={S.kpiGrid}>
            <KPICard icon={DollarSign} iconBg="#fef2f2" iconColor="#dc2626"
              value={fmt(kpis.totalPending)} label="Balance pendiente"
              sub={`${kpis.pendingCount} factura${kpis.pendingCount !== 1 ? 's' : ''}`}
              loading={loading} highlight={kpis.totalPending > 0} />

            <KPICard icon={Calendar} iconBg="#fffbeb" iconColor="#d97706"
              value={kpis.nextDue ? formatDate(kpis.nextDue.due_date) : 'Al día'}
              label="Próximo vencimiento"
              sub={kpis.nextDue ? fmt(kpis.nextDue.amount_due) : undefined}
              loading={loading} />

            <KPICard icon={FileText} iconBg="#eff6ff" iconColor="#2563eb"
              value={String(kpis.pendingCount)}
              label="Facturas pendientes"
              loading={loading} />

            <KPICard icon={TrendingUp} iconBg="#f0fdf4" iconColor="#16a34a"
              value={fmt(kpis.paidThisMonthTotal)}
              label="Pagado este mes"
              loading={loading} />
          </div>

          {/* ── Statements table / cards ── */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <div>
                <p style={S.cardTitle}>Estados de cuenta</p>
                <p style={S.cardSub}>Historial completo de comisiones y pagos</p>
              </div>
              {kpis.pendingCount > 0 && !loading && (
                <button
                  style={S.btnPrimary}
                  onClick={() => {
                    const next = statements.find(s => s.status === 'pending' || s.status === 'failed')
                    if (next) setPayingStatement(next)
                  }}
                >
                  <CreditCard size={14} />
                  Pagar ahora
                </button>
              )}
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div style={{ padding: '16px 20px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                    <span style={skel(14, '12%')} />
                    <span style={skel(14, '18%')} />
                    <span style={skel(14, '10%')} />
                    <span style={skel(14, '12%')} />
                    <span style={skel(22, '80px')} />
                    <span style={{ ...skel(28, '70px'), marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && statements.length === 0 && (
              <div style={S.empty}>
                <FileText size={36} color="#cbd5e1" />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: 0 }}>Sin estados de cuenta</p>
                <p style={{ fontSize: 13, margin: 0 }}>GolPlay generará tu primer estado de cuenta al finalizar el primer período.</p>
              </div>
            )}

            {/* Desktop table */}
            {!loading && statements.length > 0 && isWide && (
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Período', 'Concepto', 'Reservas', 'Monto', 'Vence', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statements.map(s => {
                    const isOverdue = s.status === 'pending' && new Date(s.due_date) < new Date()
                    return (
                      <tr key={s.id} style={{ background: isOverdue ? '#fffbeb' : 'transparent' }}>
                        <td style={S.td}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {monthName(s.month)} {s.year}
                          </span>
                        </td>
                        <td style={S.td}>
                          <TypeBadge type={s.type} />
                        </td>
                        <td style={S.td}>{s.reservations_count}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: '#0f172a' }}>
                          {fmt(s.amount_due)}
                        </td>
                        <td style={{ ...S.td, color: isOverdue ? '#b91c1c' : '#374151' }}>
                          {isOverdue && <AlertTriangle size={12} color="#b91c1c" style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                          {formatDate(s.due_date)}
                        </td>
                        <td style={S.td}>
                          <StatusBadge status={isOverdue && s.status === 'pending' ? 'failed' : s.status} />
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {s.status !== 'paid' && s.status !== 'processing' && (
                              <button
                                style={S.btnPrimary}
                                onClick={() => setPayingStatement(s)}
                              >
                                <CreditCard size={12} />
                                Pagar
                              </button>
                            )}
                            {s.status === 'paid' && (
                              <button
                                style={S.btnOutline}
                                onClick={() => downloadReceipt(s)}
                                title="Descargar comprobante"
                              >
                                <Download size={12} />
                                Comprobante
                              </button>
                            )}
                            {s.transaction_id && (
                              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                                {s.transaction_id.slice(0, 14)}…
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {/* Mobile cards */}
            {!loading && statements.length > 0 && !isWide && (
              <div style={{ padding: 16 }}>
                {statements.map(s => {
                  const isOverdue = s.status === 'pending' && new Date(s.due_date) < new Date()
                  return (
                    <div key={s.id} style={{
                      ...S.mobileCard,
                      ...(isOverdue ? { borderColor: '#fde68a', background: '#fffbeb' } : {}),
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                          {monthName(s.month)} {s.year}
                        </span>
                        <StatusBadge status={isOverdue && s.status === 'pending' ? 'failed' : s.status} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <TypeBadge type={s.type} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{fmt(s.amount_due)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                        {s.reservations_count} reservas · Vence {formatDate(s.due_date)}
                      </div>
                      {s.status !== 'paid' && s.status !== 'processing' && (
                        <button
                          style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center' }}
                          onClick={() => setPayingStatement(s)}
                        >
                          <CreditCard size={13} />
                          Pagar {fmt(s.amount_due)}
                        </button>
                      )}
                      {s.status === 'paid' && (
                        <button
                          style={{ ...S.btnOutline, width: '100%', justifyContent: 'center' }}
                          onClick={() => downloadReceipt(s)}
                        >
                          <Download size={12} />
                          Descargar comprobante
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            {!loading && statements.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {statements.length} estado{statements.length !== 1 ? 's' : ''} de cuenta
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
                  <Shield size={11} />
                  Pagos procesados de forma segura por dLocal
                </div>
              </div>
            )}
          </div>

          {/* ── Info card: dLocal ── */}
          <div style={{ ...S.card, marginTop: 20, border: '1px solid #e0e7ff' }}>
            <div style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={18} color="#2563eb" />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#1e40af' }}>Pagos seguros con dLocal</p>
                <p style={{ margin: 0, fontSize: 13, color: '#3b82f6' }}>
                  Todos los pagos son procesados de forma segura a través de dLocal, la pasarela de pagos líder en Latinoamérica. Tus datos financieros están encriptados y nunca se almacenan en nuestros servidores.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Payment Modal ── */}
      {payingStatement && (
        <PaymentModal
          statement={payingStatement}
          onClose={() => setPayingStatement(null)}
          onSuccess={handlePaySuccess}
        />
      )}
    </AdminLayout>
  )
}
