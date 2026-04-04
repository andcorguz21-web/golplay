/**
 * GolPlay — pages/admin/coupons/index.tsx
 * Gestión de cupones de descuento (solo admin).
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import {
  Plus, Tag, Trash2, ToggleLeft, ToggleRight, Copy,
  RefreshCw, X, CheckCircle, Loader2, Percent, DollarSign,
  Calendar, Users, Hash,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coupon {
  id: number
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_usd'
  discount_value: number
  max_uses: number | null
  current_uses: number
  valid_from: string | null
  valid_until: string | null
  active: boolean
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const fmtDiscount = (type: string, value: number) =>
  type === 'percentage' ? `${value}%` : `$${value.toFixed(2)}`

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'GP-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Form state
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_usd'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Load ──
  const loadCoupons = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setCoupons(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadCoupons() }, [loadCoupons])

  // ── Reset form ──
  const resetForm = () => {
    setCode(genCode()); setDescription(''); setDiscountType('percentage')
    setDiscountValue(''); setMaxUses(''); setValidFrom(''); setValidUntil('')
    setFormError(''); setEditing(null)
  }

  const openCreate = () => { resetForm(); setShowForm(true) }

  const openEdit = (c: Coupon) => {
    setEditing(c); setCode(c.code); setDescription(c.description ?? '')
    setDiscountType(c.discount_type); setDiscountValue(String(c.discount_value))
    setMaxUses(c.max_uses ? String(c.max_uses) : '')
    setValidFrom(c.valid_from ?? ''); setValidUntil(c.valid_until ?? '')
    setFormError(''); setShowForm(true)
  }

  // ── Save ──
  const handleSave = async () => {
    setFormError('')
    if (!code.trim()) { setFormError('El código es obligatorio'); return }
    if (!discountValue || Number(discountValue) <= 0) { setFormError('El valor debe ser mayor a 0'); return }
    if (discountType === 'percentage' && Number(discountValue) > 100) { setFormError('El porcentaje no puede ser mayor a 100'); return }

    setSaving(true)
    const payload = {
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_uses: maxUses ? Number(maxUses) : null,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
    }

    if (editing) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', editing.id)
      if (error) { setFormError(error.code === '23505' ? 'Ya existe un cupón con este código' : error.message); setSaving(false); return }
      showToast('Cupón actualizado')
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('coupons').insert({ ...payload, created_by: userData?.user?.id })
      if (error) { setFormError(error.code === '23505' ? 'Ya existe un cupón con este código' : error.message); setSaving(false); return }
      showToast('Cupón creado')
    }

    setSaving(false); setShowForm(false); loadCoupons()
  }

  // ── Toggle active ──
  const toggleActive = async (c: Coupon) => {
    await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id)
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
    showToast(c.active ? 'Cupón desactivado' : 'Cupón activado')
  }

  // ── Delete ──
  const deleteCoupon = async (c: Coupon) => {
    if (!confirm(`¿Eliminar el cupón ${c.code}?`)) return
    await supabase.from('coupons').delete().eq('id', c.id)
    setCoupons(prev => prev.filter(x => x.id !== c.id))
    showToast('Cupón eliminado')
  }

  // ── Copy code ──
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    showToast(`Código ${code} copiado`)
  }

  const activeCoupons = coupons.filter(c => c.active)
  const totalRedemptions = coupons.reduce((s, c) => s + c.current_uses, 0)

  return (
    <AdminLayout>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        * { box-sizing: border-box; }
        button:hover { opacity:.92; }
      `}</style>

      {toast && (
        <div style={{ position:'fixed',bottom:24,right:24,zIndex:9999,background:'#0f172a',color:'#fff',
          padding:'12px 20px',borderRadius:12,fontSize:13,fontWeight:600,boxShadow:'0 8px 32px rgba(0,0,0,.2)',
          animation:'fadeIn .2s ease' }}>✓ {toast}</div>
      )}

      <div style={{ background:'#f8fafc',minHeight:'100vh',fontFamily:"'Inter',-apple-system,sans-serif" }}>
        <div style={{ maxWidth:1100,margin:'0 auto',padding:'32px 20px' }}>

          {/* Header */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16,marginBottom:28 }}>
            <div>
              <h1 style={{ fontSize:24,fontWeight:700,color:'#0f172a',margin:0 }}>Cupones de descuento</h1>
              <p style={{ fontSize:13,color:'#94a3b8',marginTop:4,marginBottom:0 }}>Creá y gestioná cupones para tus clientes</p>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={loadCoupons} disabled={loading} style={{
                display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,
                background:'#fff',border:'1px solid #e2e8f0',fontSize:13,fontWeight:500,color:'#475569',cursor:'pointer',
              }}>
                <RefreshCw size={13} style={loading?{animation:'spin 1s linear infinite'}:{}} /> Actualizar
              </button>
              <button onClick={openCreate} style={{
                display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,
                background:'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',
                fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(22,163,74,.3)',
              }}>
                <Plus size={14} /> Nuevo cupón
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24 }}>
            {[
              { icon: Tag, bg:'#f0fdf4', color:'#16a34a', value: String(coupons.length), label:'Total cupones' },
              { icon: ToggleRight, bg:'#eff6ff', color:'#2563eb', value: String(activeCoupons.length), label:'Activos' },
              { icon: Users, bg:'#fffbeb', color:'#d97706', value: String(totalRedemptions), label:'Canjes totales' },
            ].map(k => (
              <div key={k.label} style={{ background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                <div style={{ width:32,height:32,borderRadius:8,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10 }}>
                  <k.icon size={16} color={k.color} />
                </div>
                <p style={{ margin:0,fontSize:22,fontWeight:700,color:'#0f172a' }}>{k.value}</p>
                <p style={{ margin:'2px 0 0',fontSize:11,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em' }}>{k.label}</p>
              </div>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ background:'#fff',borderRadius:16,border:'1px solid #f1f5f9',padding:20 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display:'flex',gap:16,marginBottom:14,alignItems:'center' }}>
                  <span style={{ height:36,width:90,borderRadius:8,background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',backgroundSize:'200% 100%',animation:'pulse 1.5s infinite' }} />
                  <span style={{ height:14,flex:1,borderRadius:6,background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',backgroundSize:'200% 100%',animation:'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && coupons.length === 0 && (
            <div style={{ background:'#fff',borderRadius:16,border:'1px solid #f1f5f9',padding:'60px 24px',textAlign:'center' }}>
              <Tag size={40} color="#cbd5e1" style={{ marginBottom:16 }} />
              <p style={{ fontSize:16,fontWeight:600,color:'#64748b',margin:'0 0 6px' }}>Sin cupones</p>
              <p style={{ fontSize:13,color:'#94a3b8',margin:'0 0 20px' }}>Creá tu primer cupón de descuento para tus owners.</p>
              <button onClick={openCreate} style={{
                display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,
                background:'#16a34a',color:'#fff',border:'none',fontSize:13,fontWeight:700,cursor:'pointer',
              }}><Plus size={14} /> Crear cupón</button>
            </div>
          )}

          {/* List */}
          {!loading && coupons.length > 0 && (
            <div style={{ background:'#fff',borderRadius:16,border:'1px solid #f1f5f9',overflow:'hidden' }}>
              {coupons.map((c, i) => {
                const expired = c.valid_until && new Date(c.valid_until) < new Date()
                const usedUp = c.max_uses && c.current_uses >= c.max_uses
                return (
                  <div key={c.id} style={{
                    display:'flex',alignItems:'center',gap:14,padding:'16px 20px',
                    borderBottom: i < coupons.length - 1 ? '1px solid #f8fafc' : 'none',
                    animation:`fadeIn .3s ease ${i*40}ms both`,
                    opacity: (!c.active || expired || usedUp) ? 0.5 : 1,
                  }}>
                    {/* Code badge */}
                    <button onClick={() => copyCode(c.code)} title="Copiar código" style={{
                      display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,
                      background:'#f8fafc',border:'1.5px solid #e2e8f0',cursor:'pointer',
                      fontFamily:'monospace',fontSize:13,fontWeight:700,color:'#0f172a',
                    }}>
                      <Hash size={12} color="#94a3b8" /> {c.code} <Copy size={10} color="#94a3b8" />
                    </button>

                    {/* Info */}
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ margin:0,fontSize:13,fontWeight:600,color:'#0f172a' }}>
                        {fmtDiscount(c.discount_type, c.discount_value)} descuento
                        {c.description && <span style={{ fontWeight:400,color:'#64748b' }}> · {c.description}</span>}
                      </p>
                      <p style={{ margin:'2px 0 0',fontSize:11,color:'#94a3b8' }}>
                        {c.current_uses}{c.max_uses ? `/${c.max_uses}` : ''} canjes
                        {c.valid_from && ` · Desde ${fmtDate(c.valid_from)}`}
                        {c.valid_until && ` · Hasta ${fmtDate(c.valid_until)}`}
                        {expired && ' · EXPIRADO'}
                        {usedUp && ' · AGOTADO'}
                      </p>
                    </div>

                    {/* Status */}
                    <span style={{
                      fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,
                      background: c.active ? '#f0fdf4' : '#f1f5f9',
                      color: c.active ? '#15803d' : '#94a3b8',
                      border: `1px solid ${c.active ? '#bbf7d0' : '#e2e8f0'}`,
                    }}>{c.active ? 'Activo' : 'Inactivo'}</span>

                    {/* Actions */}
                    <div style={{ display:'flex',gap:4 }}>
                      <button onClick={() => toggleActive(c)} title={c.active ? 'Desactivar' : 'Activar'} style={{
                        width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                      }}>
                        {c.active ? <ToggleRight size={14} color="#16a34a" /> : <ToggleLeft size={14} color="#94a3b8" />}
                      </button>
                      <button onClick={() => openEdit(c)} title="Editar" style={{
                        width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,
                      }}>✏️</button>
                      <button onClick={() => deleteCoupon(c)} title="Eliminar" style={{
                        width:32,height:32,borderRadius:8,border:'1px solid #fecaca',background:'#fff',
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                      }}>
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      {showForm && (
        <div style={{
          position:'fixed',inset:0,background:'rgba(15,23,42,.5)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:20,
        }} onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); resetForm() } }}>
          <div style={{
            background:'#fff',borderRadius:20,width:'100%',maxWidth:460,
            boxShadow:'0 24px 80px rgba(0,0,0,.2)',animation:'slideUp .2s ease',
            overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column',
          }}>
            {/* Header */}
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin:0,fontSize:17,fontWeight:700,color:'#0f172a' }}>{editing ? 'Editar cupón' : 'Nuevo cupón'}</h3>
                <p style={{ margin:'2px 0 0',fontSize:12,color:'#94a3b8' }}>{editing ? `Editando ${editing.code}` : 'Creá un cupón de descuento'}</p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm() }} style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b' }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding:'20px 24px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:14 }}>

              {/* Code */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6 }}>Código *</label>
                <div style={{ display:'flex',gap:8 }}>
                  <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="GP-XXXXX"
                    style={{ flex:1,padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,fontFamily:'monospace',fontWeight:700,color:'#0f172a',outline:'none',textTransform:'uppercase' }} />
                  <button onClick={() => setCode(genCode())} title="Generar código" style={{
                    padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',
                    display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'#64748b',
                  }}><RefreshCw size={12} /> Generar</button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6 }}>Descripción <span style={{ fontWeight:400,color:'#94a3b8' }}>(opcional)</span></label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Descuento primer mes"
                  style={{ width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,color:'#0f172a',outline:'none',fontFamily:'inherit' }} />
              </div>

              {/* Discount type + value */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6 }}>Tipo *</label>
                  <div style={{ display:'flex',gap:6 }}>
                    {(['percentage', 'fixed_usd'] as const).map(t => (
                      <button key={t} onClick={() => setDiscountType(t)} style={{
                        flex:1,padding:'9px 12px',borderRadius:10,
                        border:`1.5px solid ${discountType === t ? '#16a34a' : '#e2e8f0'}`,
                        background: discountType === t ? '#f0fdf4' : '#fff',
                        color: discountType === t ? '#15803d' : '#64748b',
                        fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                        display:'flex',alignItems:'center',justifyContent:'center',gap:4,
                      }}>
                        {t === 'percentage' ? <><Percent size={12} /> Porcentaje</> : <><DollarSign size={12} /> USD fijo</>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6 }}>Valor *</label>
                  <input type="number" min="0" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? 'Ej: 25' : 'Ej: 0.50'}
                    style={{ width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,color:'#0f172a',outline:'none',fontFamily:'inherit' }} />
                </div>
              </div>

              {/* Max uses */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6 }}>Usos máximos <span style={{ fontWeight:400,color:'#94a3b8' }}>(vacío = ilimitado)</span></label>
                <input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Ilimitado"
                  style={{ width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,color:'#0f172a',outline:'none',fontFamily:'inherit' }} />
              </div>

              {/* Dates */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6 }}>Válido desde</label>
                  <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                    style={{ width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,color:'#0f172a',outline:'none',fontFamily:'inherit' }} />
                </div>
                <div>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6 }}>Válido hasta</label>
                  <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                    style={{ width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,color:'#0f172a',outline:'none',fontFamily:'inherit' }} />
                </div>
              </div>

              {/* Preview */}
              {discountValue && Number(discountValue) > 0 && (
                <div style={{ background:'#f0fdf4',borderRadius:10,padding:'10px 14px',border:'1px solid #bbf7d0',
                  display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#15803d' }}>
                  <Tag size={14} />
                  <strong>{fmtDiscount(discountType, Number(discountValue))}</strong> de descuento
                  {maxUses && <span style={{ color:'#6b7280' }}> · máx {maxUses} usos</span>}
                </div>
              )}

              {formError && (
                <div style={{ padding:'8px 12px',borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',fontSize:12,color:'#b91c1c' }}>{formError}</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding:'16px 24px',borderTop:'1px solid #f1f5f9',display:'flex',gap:10 }}>
              <button onClick={() => { setShowForm(false); resetForm() }} style={{
                flex:1,padding:12,borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',
                fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:'#374151',
              }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{
                flex:2,padding:12,borderRadius:12,border:'none',
                background:'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',
                fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 2px 8px rgba(22,163,74,.3)',
                opacity: saving ? 0.6 : 1,
              }}>
                {saving ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite',display:'inline' }} /> Guardando...</> : (editing ? 'Guardar cambios' : 'Crear cupón')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
