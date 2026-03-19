/**
 * GolPlay — AdminLayout
 * v3.0: Incluye FAB flotante para crear reservas desde cualquier página admin.
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import CreateBookingModal from './CreateBookingModal'

export type Role = 'admin' | 'owner'

interface AdminLayoutProps {
  children: React.ReactNode | ((ctx: { role: Role; userId: string }) => React.ReactNode)
}

interface UserContext {
  role: Role
  userId: string
  email: string
  name: string
}

const DESKTOP_BP = 768
export const SIDEBAR_EXPANDED  = 240
export const SIDEBAR_COLLAPSED = 64

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [isDesktop, setIsDesktop] = useState(false)

  // FAB state
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Complex onboarding state
  const [hasComplex, setHasComplex] = useState<boolean | null>(null)
  const [complexId, setComplexId] = useState<number | null>(null)

  // ── Auth + role guard + complex check ──
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !profile || !['admin', 'owner'].includes(profile.role)) {
        router.replace('/login')
        return
      }

      setCtx({
        role: profile.role as Role,
        userId: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.full_name ?? user.email ?? 'Usuario',
      })

      // Check if owner has a complex
      if (profile.role === 'owner') {
        const { data: cx } = await supabase
          .from('complexes')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .single()
        setHasComplex(!!cx)
        if (cx) setComplexId(cx.id)
      } else {
        setHasComplex(true) // admins skip onboarding
      }

      setAuthChecked(true)
    }
    check()
  }, [router])

  // ── Responsive ──
  useEffect(() => {
    const check = () => {
      const desktop = window.innerWidth >= DESKTOP_BP
      setIsDesktop(desktop)
      if (desktop) setMobileOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }, [])

  useEffect(() => { setMobileOpen(false) }, [router.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  if (!authChecked || !ctx) return null

  // ── Onboarding: owner sin complejo ──
  if (ctx.role === 'owner' && hasComplex === false) {
    return (
      <div style={S.root}>
        <style>{FAB_CSS}{ONBOARDING_CSS}</style>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ComplexOnboarding
            userId={ctx.userId}
            onCreated={(id: number) => {
              setComplexId(id)
              setHasComplex(true)
            }}
          />
        </div>
      </div>
    )
  }

  const sidebarWidth = isDesktop
    ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED)
    : 0

  return (
    <div style={S.root}>

      {/* ── Desktop sidebar ── */}
      {isDesktop && (
        <div style={{
          ...S.sidebarWrapper,
          width: sidebarWidth,
          transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
        }}>
          <AdminSidebar
            role={ctx.role}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>
      )}

      {/* ── Mobile drawer ── */}
      {!isDesktop && mobileOpen && (
        <div
          style={S.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        >
          <div
            style={S.drawer}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <AdminSidebar
              role={ctx.role}
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ ...S.main, marginLeft: 0 }}>

        <AdminTopbar
          userName={ctx.name}
          userEmail={ctx.email}
          role={ctx.role}
          onMenu={() => setMobileOpen(true)}
          showMenu={!isDesktop}
        />

        <main style={S.content}>
          {typeof children === 'function'
            ? children({ role: ctx.role, userId: ctx.userId })
            : children}
        </main>

      </div>

      {/* ── FAB: Nueva reserva ── */}
      <style>{FAB_CSS}</style>
      <button
        className="gp-fab"
        onClick={() => setShowBookingModal(true)}
        aria-label="Nueva reserva"
        title="Nueva reserva"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>

      {/* ── Create Booking Modal ── */}
      {showBookingModal && (
        <CreateBookingModal
          userId={ctx.userId}
          onClose={() => setShowBookingModal(false)}
          onCreated={() => {
            setShowBookingModal(false)
            // Reload current page to reflect new booking
            router.replace(router.asPath)
          }}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebarWrapper: {
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowX: 'hidden',
    zIndex: 20,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.45)',
    backdropFilter: 'blur(3px)',
    zIndex: 100,
    display: 'flex',
  },
  drawer: {
    width: SIDEBAR_EXPANDED,
    height: '100%',
    background: '#fff',
    boxShadow: '4px 0 24px rgba(0,0,0,.12)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  content: {
    flex: 1,
    padding: '24px 24px',
  },
}

// ─── FAB CSS ──────────────────────────────────────────────────────────────────
const FAB_CSS = `
@keyframes gpFabIn { from { opacity: 0; transform: scale(.8) translateY(10px); } to { opacity: 1; transform: none; } }

.gp-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 90;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(22,163,74,.4), 0 2px 8px rgba(0,0,0,.1);
  transition: all .2s cubic-bezier(.4,0,.2,1);
  animation: gpFabIn .3s ease both .5s;
}
.gp-fab:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 32px rgba(22,163,74,.5), 0 4px 12px rgba(0,0,0,.15);
}
.gp-fab:active {
  transform: scale(.95);
}

@media (max-width: 640px) {
  .gp-fab {
    bottom: 20px;
    right: 20px;
    width: 52px;
    height: 52px;
    border-radius: 14px;
  }
}
`

// ─── Complex Onboarding Component ─────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function ComplexOnboarding({ userId, onCreated }: { userId: string; onCreated: (id: number) => void }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const slug = slugify(name)

  const handleCreate = async () => {
    if (!name.trim()) { setError('El nombre del complejo es obligatorio'); return }
    if (name.trim().length < 3) { setError('El nombre debe tener al menos 3 caracteres'); return }
    setError(''); setSaving(true)

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('complexes')
      .select('id')
      .eq('slug', slug)
      .limit(1)

    if (existing && existing.length > 0) {
      setError('Ya existe un complejo con un nombre similar. Probá con otro nombre.')
      setSaving(false)
      return
    }

    const { data: cx, error: insertErr } = await supabase
      .from('complexes')
      .insert({
        owner_id: userId,
        name: name.trim(),
        slug,
        city: city.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        country: 'CR',
        timezone: 'America/Costa_Rica',
        currency: 'CRC',
        commission_usd: 1.00,
        active: true,
      })
      .select('id')
      .single()

    setSaving(false)
    if (insertErr || !cx) {
      setError('Error al crear el complejo. Intentá de nuevo.')
      return
    }

    // Vincular canchas huérfanas del owner a este complejo
    await supabase
      .from('fields')
      .update({ complex_id: cx.id })
      .eq('owner_id', userId)
      .is('complex_id', null)

    onCreated(cx.id)
  }

  return (
    <div className="ob-card">
      {/* Header */}
      <div className="ob-header">
        <div className="ob-icon">🏟️</div>
        <h1 className="ob-title">Bienvenido a GolPlay</h1>
        <p className="ob-sub">Antes de crear canchas, configuremos tu complejo deportivo</p>
      </div>

      {/* Steps indicator */}
      <div className="ob-steps">
        {[1, 2].map(s => (
          <div key={s} className={`ob-step ${step >= s ? 'ob-step--active' : ''}`}>
            <div className="ob-step__dot">{step > s ? '✓' : s}</div>
            <span className="ob-step__label">{s === 1 ? 'Nombre' : 'Contacto'}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Name */}
      {step === 1 && (
        <div className="ob-body">
          <div className="ob-field">
            <label className="ob-label">Nombre del complejo <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              className="ob-input"
              placeholder="Ej: Complejo Deportivo Cibeles"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              autoFocus
            />
            {slug && (
              <p className="ob-hint">
                🔗 Tu link será: <strong>golplay.com/complex/{slug}</strong>
              </p>
            )}
          </div>

          <div className="ob-field">
            <label className="ob-label">Ciudad / Provincia</label>
            <input
              className="ob-input"
              placeholder="Ej: San José"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>

          <div className="ob-field">
            <label className="ob-label">Dirección</label>
            <input
              className="ob-input"
              placeholder="Ej: 200m norte del parque central"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {error && <p className="ob-error">⚠️ {error}</p>}

          <button className="ob-btn ob-btn--primary" onClick={() => {
            if (!name.trim()) { setError('El nombre del complejo es obligatorio'); return }
            if (name.trim().length < 3) { setError('El nombre debe tener al menos 3 caracteres'); return }
            setError(''); setStep(2)
          }}>
            Siguiente →
          </button>
        </div>
      )}

      {/* Step 2: Contact */}
      {step === 2 && (
        <div className="ob-body">
          <div className="ob-field">
            <label className="ob-label">Teléfono</label>
            <input
              className="ob-input"
              placeholder="Ej: 2222-3333"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
            />
          </div>

          <div className="ob-field">
            <label className="ob-label">WhatsApp</label>
            <input
              className="ob-input"
              placeholder="Ej: 50688887777 (con código de país)"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              type="tel"
            />
            <p className="ob-hint">Este número se usará para el botón de WhatsApp en tu página pública</p>
          </div>

          {error && <p className="ob-error">⚠️ {error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ob-btn ob-btn--ghost" onClick={() => setStep(1)}>
              ← Atrás
            </button>
            <button className="ob-btn ob-btn--primary" onClick={handleCreate} disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Creando complejo…' : 'Crear complejo ✓'}
            </button>
          </div>

          <p className="ob-hint" style={{ textAlign: 'center', marginTop: 8 }}>
            Podés actualizar estos datos después desde la configuración
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Onboarding CSS ───────────────────────────────────────────────────────────
const ONBOARDING_CSS = `
@keyframes obFadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

.ob-card {
  width: 100%; max-width: 480px;
  background: #fff; border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 20px 60px rgba(0,0,0,.08);
  overflow: hidden;
  animation: obFadeUp .4s ease both;
}

.ob-header {
  padding: 40px 32px 24px; text-align: center;
  background: linear-gradient(160deg, #052e16 0%, #0B4D2C 100%);
  color: #fff;
}
.ob-icon { font-size: 40px; margin-bottom: 12px; }
.ob-title {
  font-size: 22px; font-weight: 800; margin: 0 0 6px;
  font-family: 'Inter', -apple-system, sans-serif;
}
.ob-sub { font-size: 13px; color: rgba(255,255,255,.65); margin: 0; font-weight: 500; }

.ob-steps {
  display: flex; justify-content: center; gap: 32px;
  padding: 20px 32px 0;
}
.ob-step { display: flex; align-items: center; gap: 8px; }
.ob-step__dot {
  width: 28px; height: 28px; border-radius: 50%;
  background: #f1f5f9; color: #94a3b8;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  transition: all .2s;
}
.ob-step--active .ob-step__dot {
  background: #16a34a; color: #fff;
}
.ob-step__label { font-size: 12px; font-weight: 600; color: #94a3b8; }
.ob-step--active .ob-step__label { color: #0f172a; }

.ob-body { padding: 24px 32px 32px; display: flex; flex-direction: column; gap: 16px; }

.ob-field { display: flex; flex-direction: column; gap: 6px; }
.ob-label { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .04em; }
.ob-input {
  width: 100%; padding: 12px 14px; border-radius: 12px;
  border: 1.5px solid #e2e8f0; font-size: 14px;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #0f172a; background: #fff; outline: none;
  transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box;
}
.ob-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
.ob-input::placeholder { color: #94a3b8; }
.ob-hint { font-size: 11px; color: #94a3b8; margin: 0; font-weight: 500; }
.ob-hint strong { color: #16a34a; }
.ob-error { font-size: 12px; color: #ef4444; font-weight: 600; margin: 0; }

.ob-btn {
  padding: 13px 24px; border-radius: 12px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer;
  font-family: 'Inter', -apple-system, sans-serif;
  transition: all .15s;
}
.ob-btn--primary {
  background: linear-gradient(135deg, #16a34a, #15803d); color: #fff;
  box-shadow: 0 2px 12px rgba(22,163,74,.3);
}
.ob-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(22,163,74,.4); }
.ob-btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.ob-btn--ghost { background: transparent; color: #64748b; border: 1.5px solid #e2e8f0; }
.ob-btn--ghost:hover { background: #f8fafc; }

@media (max-width: 480px) {
  .ob-card { border-radius: 18px; }
  .ob-header { padding: 28px 20px 20px; }
  .ob-body { padding: 20px 20px 28px; }
}
`
