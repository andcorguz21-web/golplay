/**
 * GolPlay — Pagos & Facturación v3.0
 * pages/admin/payments.tsx
 *
 * Mismo lenguaje visual que el resto del admin:
 * - DM Sans + Syne headers
 * - Colores: verde GolPlay, slate, white cards
 * - Plan fijo mensual: ₡35,000 CRC / $75 USD
 * - SINPE Móvil como método principal
 * - Upload de comprobante
 * - Timeline de historial
 *
 * Sin Tailwind. CSS classes.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import ValidationBanner from '@/components/ui/admin/ValidationBanner'
import {
  formatMoney, formatMoneyShort,
  PLAN_PRICE_CRC, PLAN_PRICE_USD, PLAN_TRIAL_DAYS,
  getPlanPriceLocal, LATAM_COUNTRIES, USD_RATES,
} from '@/sports'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'paid' | 'pending' | 'failed' | 'processing'

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
  type?: string
  transaction_id?: string | null
  payment_method?: string | null
  notes?: string | null
  currency?: string
  period_start?: string | null
  period_end?: string | null
  discount_amount?: number
  coupon_code?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const monthName = (m: number) => MONTHS[(m - 1)] ?? ''

const fmtDate = (iso: string) => {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

const relativeDate = (iso: string) => {
  const now = new Date(); now.setHours(0,0,0,0)
  const target = new Date(iso + 'T12:00:00'); target.setHours(0,0,0,0)
  const diff = Math.round((target.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return `Venció hace ${Math.abs(diff)}d`
  if (diff === 0) return 'Vence hoy'
  if (diff === 1) return 'Vence mañana'
  if (diff <= 7) return `Vence en ${diff}d`
  return fmtDate(iso)
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  paid:       { label: 'Pagado',     color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
  pending:    { label: 'Pendiente',  color: '#92400e', bg: '#fffbeb', dot: '#f59e0b' },
  failed:     { label: 'Vencido',    color: '#991b1b', bg: '#fef2f2', dot: '#ef4444' },
  processing: { label: 'En revisión',color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6' },
}

const SINPE_NUMBER = '7260-4278'
const SINPE_NAME = 'Andres Emilio Cordero Guzman'

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const router = useRouter()
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('CRC')
  const [authReady, setAuthReady] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Modals
  const [payingStatement, setPayingStatement] = useState<Statement | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState<Statement | null>(null)
  const [viewingDetail, setViewingDetail] = useState<Statement | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3200)
  }, [])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('currency').eq('id', data.session.user.id).single()
      if (p?.currency) setCurrency(p.currency)
      setAuthReady(true)
    })
  }, [router])

  const fMoney = useCallback((v: number) => formatMoney(v, currency), [currency])
  const fMoneyShort = useCallback((v: number) => formatMoneyShort(v, currency), [currency])
  const planPrice = getPlanPriceLocal(currency)
  const currSymbol = LATAM_COUNTRIES.find(c => c.currency === currency)?.symbol ?? '₡'

  // Load
  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('monthly_statements')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    setStatements(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (authReady) load() }, [authReady, load])

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date()
    const pending = statements.filter(s => s.status === 'pending' || s.status === 'failed')
    const paid = statements.filter(s => s.status === 'paid')
    const overdue = pending.filter(s => new Date(s.due_date + 'T23:59:59') < now)
    const totalPaid = paid.reduce((s, r) => s + r.amount_due, 0)
    const totalPending = pending.reduce((s, r) => s + r.amount_due, 0)
    const nextDue = pending.sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null
    return { totalPaid, totalPending, pendingCount: pending.length, overdueCount: overdue.length, nextDue, paidCount: paid.length }
  }, [statements])

  // Export CSV
  const exportCSV = () => {
    const csvContent = [['Período','Monto','Estado','Vencimiento','Pagado','Método','Transacción'],
      ...statements.map(s => [
        `${monthName(s.month)} ${s.year}`, String(s.amount_due), s.status,
        s.due_date, s.paid_at ?? '', s.payment_method ?? '', s.transaction_id ?? '',
      ])
    ].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }))
    a.download = `golplay-pagos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    showToast('Exportado ✓')
  }

  // Download receipt
  const downloadReceipt = (s: Statement) => {
    const period = `${monthName(s.month)} ${s.year}`
    const receiptNo = `GP-${s.year}${String(s.month).padStart(2,'0')}-${s.id.slice(0,6).toUpperCase()}`
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Comprobante ${receiptNo}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#0f172a;padding:48px;max-width:680px;margin:0 auto}
.logo{font-size:22px;font-weight:800;margin-bottom:32px;color:#16a34a}.hdr{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #f1f5f9}
.title{font-size:24px;font-weight:700}.sub{font-size:12px;color:#64748b;margin-top:4px}.badge{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;margin-top:6px}
.grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #f1f5f9;border-radius:10px;overflow:hidden;margin-bottom:24px}
.gi{padding:12px 16px;border-bottom:1px solid #f8fafc}.gi:nth-child(odd){border-right:1px solid #f8fafc}.gl{font-size:10px;color:#94a3b8;font-weight:600;margin-bottom:2px}.gv{font-size:13px;font-weight:600}
.total{background:#f8fafc;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.total-l{font-size:14px;color:#374151}.total-v{font-size:24px;font-weight:800}
.ft{text-align:center;font-size:11px;color:#cbd5e1;border-top:1px solid #f1f5f9;padding-top:16px;margin-top:24px}@media print{body{padding:24px}}</style></head>
<body><div class="logo">⚽ GolPlay</div><div class="hdr"><div><div class="title">Comprobante de pago</div><div class="sub">N° ${receiptNo}</div><div class="badge">✓ Pagado</div></div>
<div style="text-align:right"><div style="font-size:11px;color:#94a3b8">Emisión</div><div style="font-size:13px;font-weight:600">${new Date().toLocaleDateString('es-CR',{day:'numeric',month:'long',year:'numeric'})}</div></div></div>
<div class="grid"><div class="gi"><div class="gl">Período</div><div class="gv">${period}</div></div><div class="gi"><div class="gl">Concepto</div><div class="gv">Plan mensual</div></div>
<div class="gi"><div class="gl">Fecha de pago</div><div class="gv">${s.paid_at ? fmtDate(s.paid_at.split('T')[0]) : '—'}</div></div><div class="gi"><div class="gl">Método</div><div class="gv">${s.payment_method ?? 'SINPE Móvil'}</div></div></div>
<div class="total"><span class="total-l">Total pagado</span><span class="total-v">${fMoney(s.amount_due)}</span></div>
${s.transaction_id ? `<div style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-family:monospace;font-size:11px;color:#64748b;margin-bottom:20px"><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px">Referencia</div>${s.transaction_id}</div>` : ''}
<div class="ft">GolPlay · golplay.app · © ${new Date().getFullYear()}</div></body></html>`
    const win = window.open('', '_blank', 'width=780,height=900')
    if (!win) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `comprobante-${receiptNo}.html`; a.click(); return }
    win.document.write(html); win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 350)
  }

  if (!authReady) return null

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && <div className={`py-toast ${toast.ok ? 'py-toast--ok' : 'py-toast--err'}`}>{toast.ok ? '✓' : '✗'} {toast.msg}</div>}

      <div className="py">

        {/* ── Header ── */}
        <div className="py-hd">
          <div>
            <h1 className="py-title">Pagos</h1>
            <p className="py-sub">Plan mensual GolPlay · {fMoney(planPrice)}/mes</p>
          </div>
          <div className="py-hd__actions">
            <button className="py-btn py-btn--ghost" onClick={load}>↻ Actualizar</button>
            <button className="py-btn py-btn--ghost" onClick={exportCSV} disabled={statements.length === 0}>↓ Exportar</button>
          </div>
        </div>

        <ValidationBanner />

        {/* ── Plan card ── */}
        <div className="py-plan">
          <div className="py-plan__left">
            <div className="py-plan__icon">⚽</div>
            <div>
              <p className="py-plan__name">Plan Pro</p>
              <p className="py-plan__meta">
                {currency === 'CRC' ? `₡${PLAN_PRICE_CRC.toLocaleString('es-CR')}` : `$${PLAN_PRICE_USD} USD`}/mes
                {currency !== 'CRC' && currency !== 'USD' && ` · ${fMoney(planPrice)} ${currency}`}
              </p>
            </div>
          </div>
          <div className="py-plan__right">
            <span className="py-plan__badge">✓ Activo</span>
          </div>
        </div>

        {/* ── Overdue alert ── */}
        {!loading && kpis.overdueCount > 0 && (
          <div className="py-alert">
            <span className="py-alert__icon">⚠️</span>
            <div className="py-alert__body">
              <p className="py-alert__title">Tenés {kpis.overdueCount} pago{kpis.overdueCount > 1 ? 's' : ''} vencido{kpis.overdueCount > 1 ? 's' : ''}</p>
              <p className="py-alert__sub">Regularizá tu cuenta para evitar interrupciones del servicio.</p>
            </div>
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="py-kpis">
          {[
            { value: kpis.pendingCount > 0 ? fMoneyShort(kpis.totalPending) : '✓ Al día', label: 'Balance pendiente', accent: kpis.pendingCount > 0 ? '#ef4444' : '#16a34a' },
            { value: kpis.nextDue ? relativeDate(kpis.nextDue.due_date) : '—', label: 'Próximo vencimiento', accent: '#f59e0b' },
            { value: String(kpis.paidCount), label: 'Pagos realizados', accent: '#16a34a' },
            { value: fMoneyShort(kpis.totalPaid), label: 'Total pagado', accent: '#2563eb' },
          ].map((k, i) => (
            <div key={i} className="py-kpi" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="py-kpi__accent" style={{ background: k.accent }} />
              <span className="py-kpi__value">{loading ? '—' : k.value}</span>
              <span className="py-kpi__label">{k.label}</span>
            </div>
          ))}
        </div>

        {/* ── SINPE info ── */}
        {kpis.pendingCount > 0 && !loading && (
          <div className="py-sinpe">
            <div className="py-sinpe__head">
              <span className="py-sinpe__emoji">📱</span>
              <div>
                <p className="py-sinpe__title">Pagá con SINPE Móvil</p>
                <p className="py-sinpe__sub">Enviá el monto al siguiente número y subí tu comprobante</p>
              </div>
            </div>
            <div className="py-sinpe__body">
              <div className="py-sinpe__row">
                <span className="py-sinpe__label">Número SINPE</span>
                <span className="py-sinpe__number">{SINPE_NUMBER}</span>
              </div>
              <div className="py-sinpe__row">
                <span className="py-sinpe__label">A nombre de</span>
                <span className="py-sinpe__value">{SINPE_NAME}</span>
              </div>
              <div className="py-sinpe__row">
                <span className="py-sinpe__label">Monto del plan</span>
                <span className="py-sinpe__value py-sinpe__value--bold">{fMoney(planPrice)}</span>
              </div>
            </div>
            <p className="py-sinpe__note">💡 Después de enviar el SINPE, subí el comprobante en la factura correspondiente.</p>
          </div>
        )}

        {/* ── Statements ── */}
        <div className="py-card">
          <div className="py-card__head">
            <div>
              <h3 className="py-card__title">Estados de cuenta</h3>
              <p className="py-card__sub">Historial de facturación</p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-sk-rows">
              {[1,2,3,4].map(i => <div key={i} className="py-sk-row" style={{ animationDelay: `${i * 60}ms` }} />)}
            </div>
          )}

          {/* Empty */}
          {!loading && statements.length === 0 && (
            <div className="py-empty">
              <span className="py-empty__ico">📭</span>
              <p className="py-empty__title">Sin estados de cuenta</p>
              <p className="py-empty__sub">Tu primer cobro se generará al finalizar los {PLAN_TRIAL_DAYS} días de prueba gratis.</p>
            </div>
          )}

          {/* List */}
          {!loading && statements.length > 0 && (
            <div className="py-list">
              {statements.map((s, i) => {
                const isOverdue = s.status === 'pending' && new Date(s.due_date + 'T23:59:59') < new Date()
                const effectiveStatus = isOverdue ? 'failed' : s.status
                const cfg = STATUS_CFG[effectiveStatus] ?? STATUS_CFG.pending
                return (
                  <div key={s.id} className={`py-stmt ${isOverdue ? 'py-stmt--overdue' : ''} ${s.status === 'paid' ? 'py-stmt--paid' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                    {/* Timeline dot */}
                    <div className="py-stmt__dot" style={{ background: cfg.dot }} />

                    {/* Content */}
                    <div className="py-stmt__body">
                      <div className="py-stmt__top">
                        <div className="py-stmt__period">
                          <span className="py-stmt__month">{monthName(s.month)} {s.year}</span>
                          <span className={`py-badge py-badge--${effectiveStatus}`}>{cfg.label}</span>
                        </div>
                        <span className="py-stmt__amount">{fMoney(s.amount_due)}</span>
                      </div>

                      <div className="py-stmt__meta">
                        <span>Plan mensual · {s.reservations_count > 0 ? `${s.reservations_count} reservas` : 'Plan fijo'}</span>
                        <span>{isOverdue ? relativeDate(s.due_date) : s.status === 'paid' ? `Pagado ${s.paid_at ? fmtDate(s.paid_at.split('T')[0]) : ''}` : relativeDate(s.due_date)}</span>
                      </div>

                      {/* Actions */}
                      <div className="py-stmt__actions">
                        {(s.status === 'pending' || s.status === 'failed') && (
                          <button className="py-btn py-btn--green py-btn--sm" onClick={() => setUploadingReceipt(s)}>
                            📱 Subir comprobante SINPE
                          </button>
                        )}
                        {s.status === 'processing' && (
                          <span className="py-stmt__processing">⏳ Comprobante en revisión</span>
                        )}
                        {s.status === 'paid' && (
                          <button className="py-btn py-btn--ghost py-btn--sm" onClick={() => downloadReceipt(s)}>
                            ↓ Comprobante
                          </button>
                        )}
                        {s.transaction_id && (
                          <span className="py-stmt__tx">Ref: {s.transaction_id.slice(0, 16)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && statements.length > 0 && (
            <div className="py-card__foot">
              {statements.length} estado{statements.length !== 1 ? 's' : ''} de cuenta
            </div>
          )}
        </div>

      </div>

      {/* ── Upload Receipt Modal ── */}
      {uploadingReceipt && (
        <ReceiptUploadModal
          statement={uploadingReceipt}
          currency={currency}
          fMoney={fMoney}
          onClose={() => setUploadingReceipt(null)}
          onSuccess={() => { setUploadingReceipt(null); load(); showToast('Comprobante enviado ✓') }}
        />
      )}
    </AdminLayout>
  )
}

// ─── Receipt Upload Modal ─────────────────────────────────────────────────────

function ReceiptUploadModal({ statement, currency, fMoney, onClose, onSuccess }: {
  statement: Statement; currency: string; fMoney: (v: number) => string
  onClose: () => void; onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [method, setMethod] = useState<'sinpe' | 'transfer' | 'deposit'>('sinpe')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Máximo 5MB'); return }
    setFile(f); setError('')
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(f)
    } else { setPreview(null) }
  }

  const handleUpload = async () => {
    if (!file) { setError('Seleccioná un archivo'); return }
    setUploading(true); setError('')
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No autenticado')
      const ext = file.name.split('.').pop()
      const path = `receipts/${userData.user.id}/${statement.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('payment-receipts').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('payment-receipts').getPublicUrl(path)
      await supabase.from('payment_receipts').insert({
        statement_id: statement.id, owner_id: userData.user.id,
        file_url: urlData.publicUrl, file_name: file.name,
        payment_method: method, notes: notes.trim() || null, status: 'pending',
      })
      await supabase.from('monthly_statements').update({ status: 'processing', payment_method: method }).eq('id', statement.id)
      setDone(true)
      setTimeout(onSuccess, 1500)
    } catch (e: any) { setError(e.message ?? 'Error al subir') }
    finally { setUploading(false) }
  }

  return (
    <div className="py-overlay" onClick={e => { if (e.target === e.currentTarget && !uploading) onClose() }}>
      <div className="py-modal">
        {!uploading && !done && (
          <button className="py-modal__close" onClick={onClose}>✕</button>
        )}

        {done ? (
          <div className="py-modal__done">
            <div className="py-modal__done-icon">✓</div>
            <p className="py-modal__done-title">Comprobante enviado</p>
            <p className="py-modal__done-sub">Lo revisaremos y confirmaremos tu pago pronto.</p>
          </div>
        ) : (
          <>
            <div className="py-modal__head">
              <div className="py-modal__head-icon">📱</div>
              <div>
                <p className="py-modal__title">Subir comprobante</p>
                <p className="py-modal__sub">{monthName(statement.month)} {statement.year} · {fMoney(statement.amount_due)}</p>
              </div>
            </div>

            {/* SINPE info box */}
            <div className="py-modal__sinpe">
              <p className="py-modal__sinpe-title">Datos para SINPE Móvil</p>
              <div className="py-modal__sinpe-row">
                <span>Número:</span>
                <strong>{SINPE_NUMBER}</strong>
              </div>
              <div className="py-modal__sinpe-row">
                <span>Nombre:</span>
                <strong>{SINPE_NAME}</strong>
              </div>
              <div className="py-modal__sinpe-row">
                <span>Monto:</span>
                <strong>{fMoney(statement.amount_due)}</strong>
              </div>
            </div>

            {/* Method */}
            <p className="py-modal__label">Método de pago</p>
            <div className="py-modal__methods">
              {([
                { value: 'sinpe' as const, label: 'SINPE Móvil', icon: '📱' },
                { value: 'transfer' as const, label: 'Transferencia', icon: '🏦' },
                { value: 'deposit' as const, label: 'Depósito', icon: '💵' },
              ]).map(m => (
                <button key={m.value} className={`py-method ${method === m.value ? 'py-method--sel' : ''}`} onClick={() => setMethod(m.value)}>
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {/* File upload */}
            <p className="py-modal__label">Comprobante *</p>
            <label className={`py-upload ${file ? 'py-upload--has' : ''}`}>
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
              {preview ? (
                <img src={preview} alt="Preview" style={{ maxHeight: 140, borderRadius: 8, objectFit: 'contain' }} />
              ) : file ? (
                <p className="py-upload__name">📄 {file.name}</p>
              ) : (
                <>
                  <span className="py-upload__icon">📤</span>
                  <p className="py-upload__text">Subí tu comprobante</p>
                  <p className="py-upload__hint">Imagen o PDF · Máx 5MB</p>
                </>
              )}
            </label>

            {/* Notes */}
            <textarea
              className="py-modal__textarea"
              placeholder="Notas adicionales (opcional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            {error && <div className="py-modal__error">⚠️ {error}</div>}

            <div className="py-modal__actions">
              <button className="py-btn py-btn--ghost" onClick={onClose}>Cancelar</button>
              <button className="py-btn py-btn--green" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? '⏳ Subiendo...' : '📤 Enviar comprobante'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Syne:wght@700;800&display=swap');

*,*::before,*::after{box-sizing:border-box}

.py{font-family:'DM Sans',sans-serif;padding:24px 24px 80px;color:#0f172a;background:#f0f2f5;min-height:100vh}

/* Header */
.py-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.py-hd__actions{display:flex;gap:8px}
.py-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;letter-spacing:-.5px;margin:0}
.py-sub{font-size:13px;color:#94a3b8;margin:4px 0 0}

/* Buttons */
.py-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:none;transition:all .14s;white-space:nowrap}
.py-btn--ghost{background:#fff;color:#374151;border:1.5px solid #e2e8f0}.py-btn--ghost:hover{background:#f8fafc;border-color:#cbd5e1}
.py-btn--green{background:#16a34a;color:#fff;box-shadow:0 2px 8px rgba(22,163,74,.25)}.py-btn--green:hover{background:#15803d}
.py-btn--sm{padding:7px 12px;font-size:11px}
.py-btn:disabled{opacity:.45;cursor:not-allowed}

/* Plan card */
.py-plan{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1.5px solid #bbf7d0;border-radius:14px;padding:16px 20px;margin-bottom:16px}
.py-plan__left{display:flex;align-items:center;gap:12px}
.py-plan__icon{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#16a34a,#15803d);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.py-plan__name{margin:0;font-size:15px;font-weight:700;color:#0f172a}
.py-plan__meta{margin:2px 0 0;font-size:12px;color:#64748b}
.py-plan__badge{font-size:11px;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:4px 12px;border-radius:999px}

/* Alert */
.py-alert{display:flex;align-items:center;gap:12px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:14px;padding:14px 18px;margin-bottom:16px}
.py-alert__icon{font-size:20px;flex-shrink:0}
.py-alert__body{flex:1}
.py-alert__title{margin:0;font-size:13px;font-weight:700;color:#991b1b}
.py-alert__sub{margin:2px 0 0;font-size:12px;color:#dc2626}

/* KPIs */
.py-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.py-kpi{background:#fff;border-radius:14px;padding:16px 18px;position:relative;overflow:hidden;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,.03);animation:pyUp .35s ease both}
.py-kpi__accent{position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 3px 3px 0}
.py-kpi__value{display:block;font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-.3px;font-family:'DM Sans',sans-serif}
.py-kpi__label{display:block;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-top:2px}

/* SINPE info */
.py-sinpe{background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:0;margin-bottom:20px;overflow:hidden}
.py-sinpe__head{display:flex;align-items:center;gap:10px;padding:16px 20px;background:#f8fafc;border-bottom:1px solid #f1f5f9}
.py-sinpe__emoji{font-size:24px;flex-shrink:0}
.py-sinpe__title{margin:0;font-size:14px;font-weight:700;color:#0f172a}
.py-sinpe__sub{margin:2px 0 0;font-size:12px;color:#64748b}
.py-sinpe__body{padding:16px 20px}
.py-sinpe__row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f8fafc;font-size:13px}
.py-sinpe__row:last-child{border-bottom:none}
.py-sinpe__label{color:#64748b;font-weight:500}
.py-sinpe__number{font-size:18px;font-weight:800;color:#0f172a;letter-spacing:.02em;font-family:'DM Sans',monospace}
.py-sinpe__value{font-weight:600;color:#0f172a}
.py-sinpe__value--bold{font-size:16px;font-weight:800;color:#16a34a}
.py-sinpe__note{margin:0;padding:12px 20px;font-size:12px;color:#64748b;background:#fffbeb;border-top:1px solid #fef3c7}

/* Card */
.py-card{background:#fff;border-radius:16px;border:1px solid #eaecf0;box-shadow:0 1px 3px rgba(0,0,0,.04);overflow:hidden}
.py-card__head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #f1f5f9}
.py-card__title{margin:0;font-size:15px;font-weight:700;color:#0f172a}
.py-card__sub{margin:2px 0 0;font-size:12px;color:#94a3b8}
.py-card__foot{padding:12px 20px;font-size:11px;color:#94a3b8;text-align:center;border-top:1px solid #f8fafc}

/* Statement list — timeline style */
.py-list{padding:0 20px 12px}
.py-stmt{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid #f8fafc;position:relative;animation:pyUp .3s ease both}
.py-stmt:last-child{border-bottom:none}
.py-stmt--overdue{background:#fffbeb;margin:0 -20px;padding:16px 20px;border-radius:0}
.py-stmt--paid{opacity:.85}
.py-stmt__dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:5px}
.py-stmt__body{flex:1;min-width:0}
.py-stmt__top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
.py-stmt__period{display:flex;align-items:center;gap:8px}
.py-stmt__month{font-size:14px;font-weight:700;color:#0f172a}
.py-stmt__amount{font-size:16px;font-weight:800;color:#0f172a;font-family:'DM Sans',sans-serif}
.py-stmt__meta{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:8px}
.py-stmt__actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.py-stmt__processing{font-size:11px;font-weight:600;color:#1e40af;background:#eff6ff;padding:4px 10px;border-radius:8px}
.py-stmt__tx{font-size:10px;color:#94a3b8;font-family:monospace}

/* Badge */
.py-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px}
.py-badge--paid{background:#f0fdf4;color:#15803d}
.py-badge--pending{background:#fffbeb;color:#92400e}
.py-badge--failed{background:#fef2f2;color:#991b1b}
.py-badge--processing{background:#eff6ff;color:#1e40af}

/* Empty & Skeleton */
.py-empty{text-align:center;padding:48px 20px}
.py-empty__ico{font-size:40px;display:block;margin-bottom:10px}
.py-empty__title{font-size:15px;font-weight:700;margin:0 0 4px}
.py-empty__sub{font-size:12px;color:#94a3b8;margin:0}
.py-sk-rows{padding:16px 20px;display:flex;flex-direction:column;gap:10px}
.py-sk-row{height:56px;border-radius:10px;background:linear-gradient(90deg,#f1f5f9 25%,#e8ecf2 50%,#f1f5f9 75%);background-size:200% 100%;animation:pyShim 1.6s infinite}

/* Modal */
.py-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:500;padding:20px;animation:pyFade .18s ease}
.py-modal{background:#fff;border-radius:20px;width:100%;max-width:440px;box-shadow:0 24px 80px rgba(0,0,0,.2);animation:pySlide .2s ease;overflow:hidden;padding:24px;position:relative;max-height:90vh;overflow-y:auto}
.py-modal__close{position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#94a3b8;transition:all .12s}
.py-modal__close:hover{background:#f8fafc;color:#0f172a}
.py-modal__head{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.py-modal__head-icon{width:40px;height:40px;border-radius:10px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.py-modal__title{margin:0;font-size:16px;font-weight:700;color:#0f172a}
.py-modal__sub{margin:2px 0 0;font-size:12px;color:#94a3b8}
.py-modal__sinpe{background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:14px;margin-bottom:16px}
.py-modal__sinpe-title{margin:0 0 8px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em}
.py-modal__sinpe-row{display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:4px}
.py-modal__sinpe-row strong{color:#0f172a}
.py-modal__label{font-size:12px;font-weight:600;color:#374151;margin:0 0 8px}
.py-modal__methods{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:16px}
.py-method{padding:9px 10px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;color:#64748b;display:flex;align-items:center;gap:5px;transition:all .12s}
.py-method:hover{border-color:#16a34a;color:#15803d}
.py-method--sel{border-color:#16a34a;background:#f0fdf4;color:#15803d}
.py-upload{display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px;border-radius:12px;border:2px dashed #e2e8f0;background:#fafafa;cursor:pointer;transition:all .15s;margin-bottom:12px}
.py-upload:hover{border-color:#16a34a;background:#f0fdf4}
.py-upload--has{border-color:#16a34a;background:#f0fdf4;padding:10px}
.py-upload__icon{font-size:24px}
.py-upload__text{font-size:13px;font-weight:600;color:#374151;margin:0}
.py-upload__hint{font-size:11px;color:#94a3b8;margin:0}
.py-upload__name{font-size:13px;font-weight:600;color:#15803d;margin:0}
.py-modal__textarea{width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;font-size:13px;font-family:inherit;resize:vertical;min-height:50px;outline:none;color:#0f172a;box-sizing:border-box;margin-bottom:12px}
.py-modal__textarea:focus{border-color:#16a34a}
.py-modal__error{padding:8px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;font-size:12px;color:#b91c1c;margin-bottom:12px}
.py-modal__actions{display:flex;gap:8px}
.py-modal__actions .py-btn{flex:1;justify-content:center}

/* Done state */
.py-modal__done{text-align:center;padding:24px 0}
.py-modal__done-icon{width:56px;height:56px;border-radius:50%;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:24px;color:#16a34a;font-weight:800;margin:0 auto 16px;border:2px solid #bbf7d0}
.py-modal__done-title{font-size:18px;font-weight:700;color:#0f172a;margin:0 0 4px}
.py-modal__done-sub{font-size:13px;color:#64748b;margin:0}

/* Toast */
.py-toast{position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.18);animation:pyUp .2s ease}
.py-toast--ok{background:#0f172a;color:#fff}.py-toast--err{background:#ef4444;color:#fff}

/* Animations */
@keyframes pyUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pyFade{from{opacity:0}to{opacity:1}}
@keyframes pySlide{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
@keyframes pyShim{to{background-position:-200% 0}}

/* Responsive */
@media(max-width:1100px){.py-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){.py-modal__methods{grid-template-columns:1fr}}
@media(max-width:640px){
  .py{padding:16px 12px 80px}
  .py-kpis{grid-template-columns:repeat(2,1fr);gap:8px}
  .py-kpi{padding:12px 14px}.py-kpi__value{font-size:17px}
  .py-sinpe__number{font-size:15px}
  .py-stmt__amount{font-size:14px}
  .py-overlay{align-items:flex-end;padding:0}
  .py-modal{border-radius:20px 20px 0 0;max-height:95vh}
}
`
