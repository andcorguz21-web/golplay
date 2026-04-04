/**
 * GolPlay — pages/admin/receipts/index.tsx
 * Panel de validación de comprobantes de pago (solo admin).
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import {
  CheckCircle, XCircle, Clock, Eye, Download, RefreshCw,
  AlertTriangle, FileText, X, Loader2, ChevronDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Receipt {
  id: number
  statement_id: string
  owner_id: string
  file_url: string
  file_name: string | null
  payment_method: string
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
  // Joined
  owner_name: string
  owner_email: string
  period: string
  amount_due: number
  field_name: string
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) => `$${Number(v).toFixed(2)}`
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const METHOD_LABEL: Record<string, string> = {
  sinpe: '📱 SINPE Móvil', transfer: '🏦 Transferencia', deposit: '💵 Depósito', other: '📋 Otro',
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pendiente', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  approved: { label: 'Aprobado',  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  rejected: { label: 'Rechazado', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const router = useRouter()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [viewing, setViewing] = useState<Receipt | null>(null)
  const [rejecting, setRejecting] = useState<Receipt | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Load ──
  const loadReceipts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('payment_receipts')
      .select(`
        id, statement_id, owner_id, file_url, file_name,
        payment_method, notes, status, rejection_reason, reviewed_at, created_at
      `)
      .order('created_at', { ascending: false })

    if (error || !data) { setLoading(false); return }

    // Enrich with owner + statement data
    const ownerIds = [...new Set(data.map(r => r.owner_id))]
    const stmtIds = [...new Set(data.map(r => r.statement_id))]

    const [{ data: profiles }, { data: statements }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name').in('id', ownerIds),
      supabase.from('monthly_statements').select('id, month, year, amount_due, field_id').in('id', stmtIds),
    ])

    const fieldIds = [...new Set((statements ?? []).map(s => s.field_id))]
    const { data: fields } = await supabase.from('fields').select('id, name').in('id', fieldIds.length ? fieldIds : [-1])

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
    const stmtMap = new Map((statements ?? []).map(s => [s.id, s]))
    const fieldMap = new Map((fields ?? []).map(f => [f.id, f]))

    // Get owner emails from auth (via owner_email in fields or profiles)
    const { data: authFields } = await supabase.from('fields').select('owner_id, owner_email').in('owner_id', ownerIds)
    const emailMap = new Map((authFields ?? []).map(f => [f.owner_id, f.owner_email]))

    const enriched: Receipt[] = data.map(r => {
      const p = profileMap.get(r.owner_id)
      const s = stmtMap.get(r.statement_id)
      const f = s ? fieldMap.get(s.field_id) : null
      return {
        ...r,
        owner_name: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Sin nombre' : 'Desconocido',
        owner_email: emailMap.get(r.owner_id) ?? '—',
        period: s ? `${MONTHS[s.month - 1]} ${s.year}` : '—',
        amount_due: s?.amount_due ?? 0,
        field_name: f?.name ?? '—',
      }
    })

    setReceipts(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { loadReceipts() }, [loadReceipts])

  // ── Actions ──
  const approveReceipt = async (receipt: Receipt) => {
    setActing(receipt.id)
    const { data: userData } = await supabase.auth.getUser()

    // Update receipt
    await supabase.from('payment_receipts').update({
      status: 'approved', reviewed_by: userData?.user?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', receipt.id)

    // Mark statement as paid
    await supabase.from('monthly_statements').update({
      status: 'paid', paid_at: new Date().toISOString(),
      transaction_id: `MANUAL-${receipt.id}`,
    }).eq('id', receipt.statement_id)

    setActing(null)
    showToast('Comprobante aprobado — pago marcado como pagado')
    setViewing(null)
    loadReceipts()
  }

  const rejectReceipt = async () => {
    if (!rejecting) return
    setActing(rejecting.id)
    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('payment_receipts').update({
      status: 'rejected', reviewed_by: userData?.user?.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectReason.trim() || null,
    }).eq('id', rejecting.id)

    // Revert statement to pending
    await supabase.from('monthly_statements').update({ status: 'pending' }).eq('id', rejecting.statement_id)

    setActing(null)
    setRejecting(null)
    setRejectReason('')
    showToast('Comprobante rechazado', false)
    setViewing(null)
    loadReceipts()
  }

  const filtered = filter === 'all' ? receipts : receipts.filter(r => r.status === filter)
  const pendingCount = receipts.filter(r => r.status === 'pending').length

  return (
    <AdminLayout>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        * { box-sizing: border-box; }
        button:hover { opacity:.92; }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#0f172a' : '#ef4444', color: '#fff',
          padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,.2)', animation: 'fadeIn .2s ease',
        }}>{toast.ok ? '✓' : '✗'} {toast.msg}</div>
      )}

      <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter',-apple-system,sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Comprobantes de pago</h1>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 0 }}>
                Revisá y validá los comprobantes subidos por los dueños de canchas
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {pendingCount > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                  <AlertTriangle size={14} /> {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                </span>
              )}
              <button onClick={loadReceipts} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                background: '#fff', border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer',
              }}>
                <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Actualizar
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {([
              { id: 'pending', label: 'Pendientes', count: receipts.filter(r => r.status === 'pending').length },
              { id: 'approved', label: 'Aprobados', count: receipts.filter(r => r.status === 'approved').length },
              { id: 'rejected', label: 'Rechazados', count: receipts.filter(r => r.status === 'rejected').length },
              { id: 'all', label: 'Todos', count: receipts.length },
            ] as { id: FilterStatus; label: string; count: number }[]).map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                borderColor: filter === t.id ? '#0f172a' : '#e2e8f0',
                background: filter === t.id ? '#0f172a' : '#fff',
                color: filter === t.id ? '#fff' : '#64748b',
                fontFamily: 'inherit', transition: 'all .12s',
              }}>
                {t.label}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                  background: filter === t.id ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.06)',
                }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: '16px 20px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center' }}>
                  <span style={{ height: 40, width: 40, borderRadius: 10, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ height: 14, width: '30%', borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ height: 14, width: '20%', borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'pulse 1.5s infinite', marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: '60px 24px', textAlign: 'center' }}>
              <FileText size={40} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: '#64748b', margin: '0 0 6px' }}>
                {filter === 'pending' ? 'Sin comprobantes pendientes' : 'Sin comprobantes'}
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                {filter === 'pending' ? 'Todos los comprobantes han sido revisados.' : 'Los comprobantes aparecerán aquí cuando los owners los suban.'}
              </p>
            </div>
          )}

          {/* List */}
          {!loading && filtered.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              {filtered.map((r, i) => {
                const stCfg = STATUS_CFG[r.status] ?? STATUS_CFG.pending
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    animation: `fadeIn .3s ease ${i * 40}ms both`, cursor: 'pointer',
                    transition: 'background .1s',
                  }}
                  onClick={() => setViewing(r)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: r.status === 'pending' ? '#fffbeb' : r.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {r.status === 'pending' ? '⏳' : r.status === 'approved' ? '✅' : '❌'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.owner_name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        {r.field_name} · {r.period} · {METHOD_LABEL[r.payment_method] ?? r.payment_method}
                      </p>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{fmt(r.amount_due)}</p>
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        color: stCfg.color, background: stCfg.bg, border: `1px solid ${stCfg.border}`, marginTop: 4,
                      }}>{stCfg.label}</span>
                    </div>

                    <ChevronDown size={14} color="#cbd5e1" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Detail Modal ── */}
      {viewing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setViewing(null) }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
            boxShadow: '0 24px 80px rgba(0,0,0,.2)', animation: 'fadeIn .2s ease',
            overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Comprobante #{viewing.id}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{fmtDate(viewing.created_at)}</p>
              </div>
              <button onClick={() => setViewing(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {/* Owner info */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Owner</p>
                <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{viewing.owner_name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{viewing.owner_email}</p>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  ['Período', viewing.period],
                  ['Cancha', viewing.field_name],
                  ['Monto', fmt(viewing.amount_due)],
                  ['Método', METHOD_LABEL[viewing.payment_method] ?? viewing.payment_method],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {viewing.notes && (
                <div style={{ background: '#fffbeb', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                  <strong>Nota del owner:</strong> {viewing.notes}
                </div>
              )}

              {/* Rejection reason */}
              {viewing.status === 'rejected' && viewing.rejection_reason && (
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
                  <strong>Motivo de rechazo:</strong> {viewing.rejection_reason}
                </div>
              )}

              {/* Image preview */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#374151' }}>Comprobante adjunto</p>
                {viewing.file_url.endsWith('.pdf') ? (
                  <a href={viewing.file_url} target="_blank" rel="noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10,
                    background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#2563eb', fontSize: 13, fontWeight: 600,
                  }}>
                    <FileText size={18} /> {viewing.file_name ?? 'Abrir PDF'}
                  </a>
                ) : (
                  <a href={viewing.file_url} target="_blank" rel="noreferrer">
                    <img src={viewing.file_url} alt="Comprobante" style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', cursor: 'zoom-in' }} />
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            {viewing.status === 'pending' && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
                <button onClick={() => { setRejecting(viewing); }} disabled={acting === viewing.id} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px', borderRadius: 12, border: '1.5px solid #fecaca', background: '#fff',
                  color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <XCircle size={16} /> Rechazar
                </button>
                <button onClick={() => approveReceipt(viewing)} disabled={acting === viewing.id} style={{
                  flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #15803d, #16a34a)', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(22,163,74,.3)',
                }}>
                  {acting === viewing.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                  Aprobar pago
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejecting && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 20,
        }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.2)', animation: 'fadeIn .2s ease', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <XCircle size={26} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Rechazar comprobante</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              El owner será notificado y deberá subir un nuevo comprobante.
            </p>
            <textarea
              placeholder="Motivo del rechazo (opcional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 70, outline: 'none', color: '#0f172a', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setRejecting(null); setRejectReason('') }} style={{
                flex: 1, padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#374151',
              }}>Cancelar</button>
              <button onClick={rejectReceipt} disabled={acting === rejecting.id} style={{
                flex: 1, padding: 12, borderRadius: 12, border: 'none',
                background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {acting === rejecting.id ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
