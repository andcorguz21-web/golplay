/**
 * GolPlay — Mi Perfil
 * pages/admin/profile/index.tsx
 *
 * LATAM-ready: país, región, prefijo telefónico y moneda dinámicos.
 * Secciones:
 *   1. Identidad  — nombre, email, teléfono con prefijo dinámico
 *   2. Complejo   — nombre, país, región/estado, moneda, descripción (solo owners)
 *   3. Seguridad  — cambiar contraseña
 *   4. Cuenta     — plan activo con moneda local, accesos rápidos, cerrar sesión
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import type { Role } from '@/components/ui/admin/AdminLayout'
import {
  LATAM_COUNTRIES,
  formatMoney, formatMoneyShort,
  getPlanPriceLocal, PLAN_PRICE_CRC, PLAN_PRICE_USD, PLAN_TRIAL_DAYS,
  type CountryCode,
} from '@/sports'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  role: Role
  first_name: string
  last_name: string
  phone: string
  country: CountryCode | ''
  currency: string
  complex_name: string
  created_at: string
  email: string
}

interface PasswordForm {
  current: string
  next: string
  confirm: string
}

interface FieldStats {
  total: number
  active: number
  bookingsThisMonth: number
  revenueThisMonth: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
}

function fDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

/** Plan mensual en moneda local */
function planLabel(currency: string) {
  const price = getPlanPriceLocal(currency)
  return `${formatMoney(price, currency)} / mes`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminProfile() {
  const router = useRouter()

  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [savingPw,  setSavingPw]  = useState(false)
  const [stats,     setStats]     = useState<FieldStats | null>(null)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [activeTab, setActiveTab] = useState<'identity' | 'complex' | 'security' | 'account'>('identity')

  // Form — identidad
  const [fFirstName, setFFirstName] = useState('')
  const [fLastName,  setFLastName]  = useState('')
  const [fPhone,     setFPhone]     = useState('')

  // Form — complejo
  const [fCountry,     setFCountry]     = useState<CountryCode | ''>('')
  const [fCurrency,    setFCurrency]    = useState('')
  const [fComplexName, setFComplexName] = useState('')
  const [notifEmails,  setNotifEmails]  = useState<string[]>([])
  const [newNotifEmail, setNewNotifEmail] = useState('')
  const [complexId,    setComplexId]    = useState<number | null>(null)

  // Password
  const [pw,       setPw]       = useState<PasswordForm>({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<Partial<PasswordForm>>({})
  const [showPw,   setShowPw]   = useState({ current: false, next: false, confirm: false })

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3200)
  }, [])

  // ── Derived: país seleccionado ───────────────────────────────────────────────
  const selectedCountry = LATAM_COUNTRIES.find(c => c.code === fCountry) ?? null
  const phonePrefix     = selectedCountry?.phonePrefix ?? '+506'

  // Auto-sincroniza moneda cuando cambia el país
  const handleCountryChange = (code: CountryCode | '') => {
    setFCountry(code)
    if (code) {
      const country = LATAM_COUNTRIES.find(c => c.code === code)
      if (country) setFCurrency(country.currency)
    }
  }

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const merged: Profile = {
        id:           user.id,
        role:         (p?.role ?? 'owner') as Role,
        first_name:   p?.first_name ?? user.user_metadata?.first_name ?? '',
        last_name:    p?.last_name  ?? user.user_metadata?.last_name  ?? '',
        phone:        p?.phone ?? '',
        country:      (p?.country ?? '') as CountryCode | '',
        currency:     p?.currency ?? 'CRC',
        complex_name: p?.complex_name ?? '',
        created_at:   user.created_at,
        email:        user.email ?? '',
      }

      setProfile(merged)
      setFFirstName(merged.first_name)
      setFLastName(merged.last_name)
      setFPhone(merged.phone)
      setFCountry(merged.country)
      setFCurrency(merged.currency)
      setFComplexName(merged.complex_name)
      setLoading(false)

      // Stats para owners
      if (merged.role === 'owner') {
        const { data: ownerFields } = await supabase
          .from('fields').select('id, active').eq('owner_id', user.id)
        const fieldIds = ownerFields?.map(f => f.id) ?? []

        const thisMonthStart = new Date(
          new Date().getFullYear(), new Date().getMonth(), 1
        ).toISOString().split('T')[0]

        const { data: bkgs, count } = await supabase
          .from('bookings')
          .select('price', { count: 'exact' })
          .in('field_id', fieldIds.length ? fieldIds : [-1])
          .neq('status', 'cancelled')
          .gte('date', thisMonthStart)

        setStats({
          total: ownerFields?.length ?? 0,
          active: ownerFields?.filter(f => f.active !== false).length ?? 0,
          bookingsThisMonth: count ?? 0,
          revenueThisMonth: bkgs?.reduce((s, b) => s + (b.price ?? 0), 0) ?? 0,
        })

        // Load complex notification emails
        const { data: cx } = await supabase
          .from('complexes')
          .select('id, notification_emails')
          .eq('owner_id', user.id)
          .limit(1)
          .single()
        if (cx) {
          setComplexId(cx.id)
          setNotifEmails(cx.notification_emails ?? [])
        }
      }
    }
    load()
  }, [router])

  // ── Save profile ────────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)

    const payload: Record<string, string> = {
      first_name: fFirstName.trim(),
      last_name:  fLastName.trim(),
      phone:      fPhone.trim(),
      country:    fCountry,
      currency:   fCurrency,
    }
    if (profile.role === 'owner') {
      payload.complex_name = fComplexName.trim()
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)

    await supabase.auth.updateUser({
      data: {
        first_name: fFirstName.trim(),
        last_name:  fLastName.trim(),
      },
    })

    setSaving(false)
    if (error) { showToast(`Error al guardar: ${error.message}`, false); return }
    setProfile(prev => prev ? { ...prev, ...payload } : prev)
    showToast('Perfil actualizado ✓')
  }

  // ── Change password ─────────────────────────────────────────────────────────
  const changePassword = async () => {
    const errs: Partial<PasswordForm> = {}
    if (!pw.current)            errs.current = 'Ingresá tu contraseña actual'
    if (pw.next.length < 8)     errs.next    = 'Mínimo 8 caracteres'
    if (pw.next !== pw.confirm)  errs.confirm = 'Las contraseñas no coinciden'
    setPwErrors(errs)
    if (Object.keys(errs).length) return

    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setSavingPw(false)
    if (error) { showToast('Error al cambiar la contraseña', false); return }
    setPw({ current: '', next: '', confirm: '' })
    setPwErrors({})
    showToast('Contraseña actualizada ✓')
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading || !profile) {
    return (
      <AdminLayout>
        <style>{CSS}</style>
        <div className="p-page"><ProfileSkeleton/></div>
      </AdminLayout>
    )
  }

  const isOwner  = profile.role === 'owner'
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
  const initials = getInitials(fullName || profile.email)

  const TABS = [
    { id: 'identity', label: 'Mi identidad', icon: '👤' },
    ...(isOwner ? [{ id: 'complex', label: 'Mi complejo', icon: '🏟️' }] : []),
    { id: 'security', label: 'Seguridad', icon: '🔒' },
    { id: 'account',  label: 'Cuenta',    icon: '⚙️' },
  ] as const

  // Moneda activa para formatear stats
  const activeCurrency = profile.currency || 'CRC'

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && (
        <div className={`p-toast ${toast.ok ? 'p-toast--ok' : 'p-toast--err'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Logout modal */}
      {showLogoutModal && (
        <div className="p-overlay" role="dialog" aria-modal="true">
          <div className="p-modal">
            <div className="p-modal__icon">🔓</div>
            <h3 className="p-modal__title">Cerrar sesión</h3>
            <p className="p-modal__body">
              ¿Estás seguro de que querés cerrar sesión en todos los dispositivos?
            </p>
            <div className="p-modal__actions">
              <button className="p-btn p-btn--ghost" onClick={() => setShowLogoutModal(false)}>
                Cancelar
              </button>
              <button className="p-btn p-btn--danger" onClick={logout}>
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-page">

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <div className="p-hero">
          <div className="p-hero__bg"/>
          <div className="p-hero__content">
            <div className="p-avatar">
              <span className="p-avatar__initials">{initials}</span>
              <span className={`p-avatar__role p-avatar__role--${profile.role}`}>
                {profile.role === 'admin' ? '👑' : '🏟️'}
              </span>
            </div>
            <div className="p-hero__info">
              <h1 className="p-hero__name">{fullName || 'Sin nombre'}</h1>
              <p className="p-hero__email">{profile.email}</p>
              <div className="p-hero__badges">
                <span className={`p-badge p-badge--${profile.role}`}>
                  {profile.role === 'admin' ? 'Administrador' : 'Propietario'}
                </span>
                {selectedCountry && (
                  <span className="p-badge p-badge--country">
                    {selectedCountry.flag} {selectedCountry.name}
                  </span>
                )}
                {profile.created_at && (
                  <span className="p-badge p-badge--neutral">
                    Desde {fDate(profile.created_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Stats hero — solo owners */}
            {isOwner && stats && (
              <div className="p-hero__stats">
                <div className="p-stat">
                  <span className="p-stat__num">{stats.total}</span>
                  <span className="p-stat__lbl">Canchas</span>
                </div>
                <div className="p-stat__div"/>
                <div className="p-stat">
                  <span className="p-stat__num p-stat__num--green">{stats.active}</span>
                  <span className="p-stat__lbl">Activas</span>
                </div>
                <div className="p-stat__div"/>
                <div className="p-stat">
                  <span className="p-stat__num">{stats.bookingsThisMonth}</span>
                  <span className="p-stat__lbl">Reservas / mes</span>
                </div>
                <div className="p-stat__div"/>
                <div className="p-stat">
                  <span className="p-stat__num p-stat__num--green" style={{ fontSize: 15 }}>
                    {formatMoney(stats.revenueThisMonth, activeCurrency)}
                  </span>
                  <span className="p-stat__lbl">Ingresos / mes</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── LAYOUT ─────────────────────────────────────────────────────────── */}
        <div className="p-layout">

          {/* Sidebar nav */}
          <nav className="p-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`p-navitem ${activeTab === t.id ? 'p-navitem--active' : ''}`}
                onClick={() => setActiveTab(t.id as any)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {activeTab === t.id && <span className="p-navitem__bar"/>}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="p-content">

            {/* ── TAB: IDENTIDAD ───────────────────────────────────────────── */}
            {activeTab === 'identity' && (
              <Section title="Mi identidad" sub="Tu nombre y datos de contacto visibles en el panel">
                <div className="p-grid2">
                  <PField label="Nombre" hint="Tu nombre de pila">
                    <input
                      className="p-input"
                      placeholder="Ej: Carlos"
                      value={fFirstName}
                      onChange={e => setFFirstName(e.target.value)}
                    />
                  </PField>
                  <PField label="Apellido" hint="Tu apellido">
                    <input
                      className="p-input"
                      placeholder="Ej: Rodríguez"
                      value={fLastName}
                      onChange={e => setFLastName(e.target.value)}
                    />
                  </PField>
                  <PField label="Email" hint="No puede ser modificado directamente">
                    <input className="p-input p-input--disabled" value={profile.email} disabled/>
                  </PField>
                  <PField label="Teléfono" hint="Número de contacto (opcional)">
                    <div className="p-input-prefix">
                      <span className="p-input-prefix__code">{phonePrefix}</span>
                      <input
                        className="p-input p-input--tel"
                        placeholder="8888-8888"
                        type="tel"
                        value={fPhone}
                        onChange={e => setFPhone(e.target.value)}
                      />
                    </div>
                  </PField>
                </div>
                <div className="p-form-footer">
                  <button className="p-btn p-btn--primary" onClick={saveProfile} disabled={saving}>
                    {saving ? <><Spinner/> Guardando…</> : '💾 Guardar cambios'}
                  </button>
                </div>
              </Section>
            )}

            {/* ── TAB: COMPLEJO (owner only) ───────────────────────────────── */}
            {activeTab === 'complex' && isOwner && (
              <Section title="Mi complejo deportivo" sub="Información del complejo y configuración regional">

                <div className="p-grid2">
                  <PField label="Nombre del complejo" hint="Nombre público en el marketplace">
                    <input
                      className="p-input"
                      placeholder="Ej: Complejo Los Pinos"
                      value={fComplexName}
                      onChange={e => setFComplexName(e.target.value)}
                    />
                  </PField>

                  {/* País */}
                  <PField label="País" hint="Define la región y moneda por defecto">
                    <select
                      className="p-input"
                      value={fCountry}
                      onChange={e => handleCountryChange(e.target.value as CountryCode)}
                    >
                      <option value="">Seleccioná un país</option>
                      {LATAM_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </PField>

                  {/* Moneda */}
                  <PField label="Moneda" hint="Se usa para precios y reportes">
                    <div className="p-currency-row">
                      <select
                        className="p-input"
                        value={fCurrency}
                        onChange={e => setFCurrency(e.target.value)}
                      >
                        {LATAM_COUNTRIES.map(c => (
                          <option key={c.currency} value={c.currency}>
                            {c.currencySymbol} {c.currency} — {c.name}
                          </option>
                        ))}
                      </select>
                      {fCurrency && (
                        <span className="p-currency-badge">
                          {LATAM_COUNTRIES.find(c => c.currency === fCurrency)?.currencySymbol ?? ''}
                        </span>
                      )}
                    </div>
                  </PField>
                </div>

                <div className="p-callout p-callout--info">
                  <span>ℹ️</span>
                  <div>
                    <p className="p-callout__title">Información del complejo</p>
                    <p className="p-callout__text">
                      El país y la moneda configurados aquí se usan en todas las páginas de
                      facturación, reservas y reportes. Los detalles específicos de cada cancha
                      (precios, horarios, fotos) se gestionan desde la sección <strong>Canchas</strong>.
                    </p>
                  </div>
                </div>

                {/* ── Notification Emails ── */}
                <div style={{ marginTop: 20, padding: '16px 18px', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>📧 Emails de notificación</p>
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8' }}>
                    Agregá correos adicionales donde quieras recibir notificaciones de nuevas reservas. Tu email principal ({profile.email}) siempre recibe.
                  </p>

                  {/* Current emails */}
                  {notifEmails.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {notifEmails.map((em, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>✉️ {em}</span>
                          <button
                            onClick={async () => {
                              const updated = notifEmails.filter((_, j) => j !== i)
                              setNotifEmails(updated)
                              if (complexId) {
                                await supabase.from('complexes').update({ notification_emails: updated }).eq('id', complexId)
                                showToast('Email eliminado')
                              }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}
                            title="Eliminar"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new email */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="email"
                      className="p-input"
                      placeholder="correo@ejemplo.com"
                      value={newNotifEmail}
                      onChange={e => setNewNotifEmail(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && newNotifEmail.includes('@')) {
                          const updated = [...notifEmails, newNotifEmail.trim().toLowerCase()]
                          setNotifEmails(updated)
                          setNewNotifEmail('')
                          if (complexId) {
                            await supabase.from('complexes').update({ notification_emails: updated }).eq('id', complexId)
                            showToast('Email agregado ✓')
                          }
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="p-btn p-btn--primary"
                      disabled={!newNotifEmail.includes('@')}
                      onClick={async () => {
                        const updated = [...notifEmails, newNotifEmail.trim().toLowerCase()]
                        setNotifEmails(updated)
                        setNewNotifEmail('')
                        if (complexId) {
                          await supabase.from('complexes').update({ notification_emails: updated }).eq('id', complexId)
                          showToast('Email agregado ✓')
                        }
                      }}
                      style={{ padding: '8px 14px' }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                <div className="p-form-footer">
                  <button className="p-btn p-btn--primary" onClick={saveProfile} disabled={saving}>
                    {saving ? <><Spinner/> Guardando…</> : '💾 Guardar cambios'}
                  </button>
                </div>
              </Section>
            )}

            {/* ── TAB: SEGURIDAD ───────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <Section title="Seguridad" sub="Gestioná tu contraseña de acceso">

                <div className="p-callout p-callout--warn">
                  <span>🔒</span>
                  <div>
                    <p className="p-callout__title">Autenticación segura</p>
                    <p className="p-callout__text">
                      Tu contraseña es gestionada por Supabase Auth. Al cambiarla se actualizará en
                      todos los dispositivos donde tengas sesión activa.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>

                  <PField label="Contraseña actual" error={pwErrors.current}>
                    <div className="p-pw-wrap">
                      <input
                        className={`p-input ${pwErrors.current ? 'p-input--err' : ''}`}
                        type={showPw.current ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={pw.current}
                        onChange={e => { setPw(p => ({...p, current: e.target.value})); setPwErrors(p => ({...p, current: undefined})) }}
                      />
                      <button className="p-pw-eye" type="button" onClick={() => setShowPw(p => ({...p, current: !p.current}))}>
                        {showPw.current ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </PField>

                  <PField label="Nueva contraseña" error={pwErrors.next} hint="Mínimo 8 caracteres">
                    <div className="p-pw-wrap">
                      <input
                        className={`p-input ${pwErrors.next ? 'p-input--err' : ''}`}
                        type={showPw.next ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={pw.next}
                        onChange={e => { setPw(p => ({...p, next: e.target.value})); setPwErrors(p => ({...p, next: undefined})) }}
                      />
                      <button className="p-pw-eye" type="button" onClick={() => setShowPw(p => ({...p, next: !p.next}))}>
                        {showPw.next ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {pw.next && <PasswordStrength password={pw.next}/>}
                  </PField>

                  <PField label="Confirmar nueva contraseña" error={pwErrors.confirm}>
                    <div className="p-pw-wrap">
                      <input
                        className={`p-input ${pwErrors.confirm ? 'p-input--err' : ''}`}
                        type={showPw.confirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={pw.confirm}
                        onChange={e => { setPw(p => ({...p, confirm: e.target.value})); setPwErrors(p => ({...p, confirm: undefined})) }}
                      />
                      <button className="p-pw-eye" type="button" onClick={() => setShowPw(p => ({...p, confirm: !p.confirm}))}>
                        {showPw.confirm ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </PField>
                </div>

                <div className="p-form-footer">
                  <button className="p-btn p-btn--primary" onClick={changePassword} disabled={savingPw}>
                    {savingPw ? <><Spinner/> Actualizando…</> : '🔐 Cambiar contraseña'}
                  </button>
                </div>
              </Section>
            )}

            {/* ── TAB: CUENTA ──────────────────────────────────────────────── */}
            {activeTab === 'account' && (
              <Section title="Mi cuenta" sub="Información general y acciones de tu cuenta GolPlay">

                {/* Info grid */}
                <div className="p-info-grid">
                  <div className="p-info-item">
                    <span className="p-info-item__label">ID de cuenta</span>
                    <code className="p-info-item__val p-info-item__val--code">{profile.id}</code>
                  </div>
                  <div className="p-info-item">
                    <span className="p-info-item__label">Rol en la plataforma</span>
                    <span className={`p-badge p-badge--${profile.role}`}>
                      {profile.role === 'admin' ? '👑 Administrador' : '🏟️ Propietario'}
                    </span>
                  </div>
                  <div className="p-info-item">
                    <span className="p-info-item__label">Fecha de registro</span>
                    <span className="p-info-item__val">{profile.created_at ? fDate(profile.created_at) : '—'}</span>
                  </div>
                  <div className="p-info-item">
                    <span className="p-info-item__label">Email verificado</span>
                    <span className="p-badge p-badge--ok">✓ Verificado</span>
                  </div>
                  {selectedCountry && (
                    <div className="p-info-item">
                      <span className="p-info-item__label">País / Moneda</span>
                      <span className="p-info-item__val">
                        {selectedCountry.flag} {selectedCountry.name} · {selectedCountry.currencySymbol} {selectedCountry.currency}
                      </span>
                    </div>
                  )}
                  {isOwner && (
                    <div className="p-info-item">
                      <span className="p-info-item__label">Plan activo</span>
                      <span className="p-badge p-badge--plan">
                        ⚡ Plan Pro — {planLabel(activeCurrency)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Accesos rápidos — solo owners */}
                {isOwner && (
                  <div className="p-quick-links">
                    <p className="p-quick-links__title">Accesos rápidos</p>
                    <div className="p-quick-links__grid">
                      <button className="p-quick-link" onClick={() => router.push('/admin/fields')}>
                        <span className="p-quick-link__icon">⚽</span>
                        <span>Mis canchas</span>
                        <span className="p-quick-link__arrow">→</span>
                      </button>
                      <button className="p-quick-link" onClick={() => router.push('/admin/bookings')}>
                        <span className="p-quick-link__icon">📅</span>
                        <span>Mis reservas</span>
                        <span className="p-quick-link__arrow">→</span>
                      </button>
                      <button className="p-quick-link" onClick={() => router.push('/admin/billing')}>
                        <span className="p-quick-link__icon">💳</span>
                        <span>Facturación</span>
                        <span className="p-quick-link__arrow">→</span>
                      </button>
                      <button className="p-quick-link" onClick={() => router.push('/admin/business-model')}>
                        <span className="p-quick-link__icon">📊</span>
                        <span>Estadísticas</span>
                        <span className="p-quick-link__arrow">→</span>
                      </button>
                      <button className="p-quick-link" onClick={() => router.push('/admin/calendar')}>
                        <span className="p-quick-link__icon">🗓️</span>
                        <span>Calendario</span>
                        <span className="p-quick-link__arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cerrar sesión */}
                <div className="p-danger-zone">
                  <p className="p-danger-zone__title">⚠️ Zona de sesión</p>
                  <button className="p-btn p-btn--danger-outline" onClick={() => setShowLogoutModal(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    Cerrar sesión
                  </button>
                </div>

              </Section>
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, sub, children }: {
  title: string; sub: string; children: React.ReactNode
}) {
  return (
    <div className="p-section">
      <div className="p-section__head">
        <h2 className="p-section__title">{title}</h2>
        <p className="p-section__sub">{sub}</p>
      </div>
      <div className="p-section__body">{children}</div>
    </div>
  )
}

function PField({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="p-field">
      <label className="p-label">{label}</label>
      {children}
      {error  && <span className="p-error">{error}</span>}
      {!error && hint && <span className="p-hint">{hint}</span>}
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Mayúscula',     ok: /[A-Z]/.test(password) },
    { label: 'Número',        ok: /[0-9]/.test(password) },
    { label: 'Símbolo',       ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score  = checks.filter(c => c.ok).length
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#16a34a']
  const labels = ['Muy débil', 'Regular', 'Fuerte', 'Muy fuerte']
  return (
    <div className="p-pw-strength">
      <div className="p-pw-bars">
        {[0,1,2,3].map(i => (
          <div key={i} className="p-pw-bar" style={{ background: i < score ? colors[score - 1] : '#e2e8f0' }}/>
        ))}
      </div>
      <div className="p-pw-checks">
        {checks.map(c => (
          <span key={c.label} className={`p-pw-check ${c.ok ? 'p-pw-check--ok' : ''}`}>
            {c.ok ? '✓' : '·'} {c.label}
          </span>
        ))}
      </div>
      <span className="p-pw-label" style={{ color: colors[score - 1] ?? '#94a3b8' }}>
        {score > 0 ? labels[score - 1] : 'Ingresá una contraseña'}
      </span>
    </div>
  )
}

function Spinner() {
  return <span className="p-spinner"/>
}

function ProfileSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="p-sk" style={{ height: 180, borderRadius: 20 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        <div className="p-sk" style={{ height: 200, borderRadius: 16 }}/>
        <div className="p-sk" style={{ height: 200, borderRadius: 16 }}/>
      </div>
    </div>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@700;800&display=swap');

.p-page {
  font-family: 'DM Sans', sans-serif;
  background: #f0f2f5;
  min-height: 100vh;
  padding: 0 0 64px;
  color: #0f172a;
}

/* ── Hero ──────────────────────────────────────────────────────────────────── */
.p-hero {
  position: relative;
  overflow: hidden;
  background: #0f172a;
  padding: 32px 28px 28px;
  margin-bottom: 24px;
}
.p-hero__bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 80% 50%, rgba(34,197,94,.15), transparent 60%),
    radial-gradient(ellipse at 20% 80%, rgba(37,99,235,.1), transparent 60%);
  pointer-events: none;
}
.p-hero__content {
  position: relative; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
}

.p-avatar {
  width: 72px; height: 72px; border-radius: 20px;
  background: linear-gradient(135deg, #16a34a, #166534);
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(22,163,74,.35);
}
.p-avatar__initials { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: white; }
.p-avatar__role {
  position: absolute; bottom: -6px; right: -6px;
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; border: 2px solid #0f172a;
}
.p-avatar__role--admin { background: #fbbf24; }
.p-avatar__role--owner { background: #22c55e; }

.p-hero__info { flex: 1; min-width: 180px; }
.p-hero__name  { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: white; margin: 0 0 3px; }
.p-hero__email { font-size: 13px; color: #64748b; margin: 0 0 10px; }
.p-hero__badges { display: flex; gap: 8px; flex-wrap: wrap; }

.p-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
.p-badge--admin   { background: rgba(251,191,36,.2);  color: #fbbf24; border: 1px solid rgba(251,191,36,.3); }
.p-badge--owner   { background: rgba(34,197,94,.15);  color: #22c55e; border: 1px solid rgba(34,197,94,.25); }
.p-badge--neutral { background: rgba(255,255,255,.08); color: #94a3b8; border: 1px solid rgba(255,255,255,.1); }
.p-badge--ok      { background: #dcfce7; color: #15803d; }
.p-badge--country { background: rgba(255,255,255,.1);  color: #e2e8f0; border: 1px solid rgba(255,255,255,.15); }
.p-badge--plan    { background: rgba(34,197,94,.15); color: #22c55e; border: 1px solid rgba(34,197,94,.2); }

/* Stats hero */
.p-hero__stats {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px; padding: 12px 20px; margin-left: auto;
}
.p-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 16px; }
.p-stat__num { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: white; }
.p-stat__num--green { color: #22c55e; }
.p-stat__lbl { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
.p-stat__div { width: 1px; height: 36px; background: rgba(255,255,255,.1); }

/* ── Layout ────────────────────────────────────────────────────────────────── */
.p-layout  { display: grid; grid-template-columns: 200px 1fr; gap: 20px; padding: 0 28px; }
.p-content { min-width: 0; }

/* ── Nav ───────────────────────────────────────────────────────────────────── */
.p-nav { background: white; border-radius: 16px; border: 1.5px solid #eaecf0; overflow: hidden; position: sticky; top: 80px; height: fit-content; }
.p-navitem {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 12px 16px; border: none; background: transparent;
  font-family: inherit; font-size: 13px; font-weight: 500; color: #64748b;
  cursor: pointer; position: relative; text-align: left; transition: all .13s;
  border-bottom: 1px solid #f8fafc;
}
.p-navitem:last-child { border-bottom: none; }
.p-navitem:hover { background: #f8fafc; color: #0f172a; }
.p-navitem--active { background: #f0fdf4; color: #15803d; font-weight: 700; }
.p-navitem__bar { position: absolute; left: 0; top: 20%; height: 60%; width: 3px; background: #22c55e; border-radius: 0 3px 3px 0; }

/* ── Section ───────────────────────────────────────────────────────────────── */
.p-section { background: white; border-radius: 16px; border: 1.5px solid #eaecf0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.p-section__head { padding: 24px 28px 16px; border-bottom: 1px solid #f1f5f9; }
.p-section__title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; margin: 0; }
.p-section__sub { font-size: 12px; color: #94a3b8; margin: 3px 0 0; }
.p-section__body { padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }

.p-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.p-form-footer { display: flex; justify-content: flex-end; padding-top: 8px; border-top: 1px solid #f8fafc; }

/* ── Form ──────────────────────────────────────────────────────────────────── */
.p-field  { display: flex; flex-direction: column; gap: 5px; }
.p-label  { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .04em; }
.p-hint   { font-size: 11px; color: #94a3b8; margin: 0; }
.p-error  { font-size: 11px; color: #ef4444; font-weight: 600; }

.p-input {
  width: 100%; padding: 10px 12px; border-radius: 10px;
  border: 1.5px solid #e8ecf0; font-family: inherit; font-size: 13px;
  color: #0f172a; background: white; outline: none; box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s;
}
.p-input:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.1); }
.p-input--err  { border-color: #ef4444; }
.p-input--err:focus { box-shadow: 0 0 0 3px rgba(239,68,68,.1); }
.p-input--disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
.p-textarea { height: 90px; resize: vertical; }

/* Teléfono con prefijo */
.p-input-prefix { position: relative; display: flex; align-items: center; }
.p-input-prefix__code {
  position: absolute; left: 12px;
  font-size: 12px; font-weight: 700; color: #64748b;
  pointer-events: none; white-space: nowrap; z-index: 1;
}
.p-input--tel { padding-left: 52px; }

/* Moneda */
.p-currency-row { display: flex; align-items: center; gap: 8px; }
.p-currency-badge {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px;
  background: #f0fdf4; border: 1.5px solid #bbf7d0;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #16a34a;
}

/* Password */
.p-pw-wrap  { position: relative; }
.p-pw-eye   { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 15px; padding: 2px; }
.p-pw-strength { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
.p-pw-bars  { display: flex; gap: 4px; }
.p-pw-bar   { height: 4px; flex: 1; border-radius: 999px; transition: background .3s; }
.p-pw-checks { display: flex; gap: 10px; flex-wrap: wrap; }
.p-pw-check { font-size: 10px; font-weight: 600; color: #cbd5e1; }
.p-pw-check--ok { color: #16a34a; }
.p-pw-label { font-size: 11px; font-weight: 700; }

/* Callout */
.p-callout { display: flex; gap: 12px; padding: 14px 16px; border-radius: 12px; font-size: 13px; }
.p-callout--info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
.p-callout--warn { background: #fffbeb; border: 1px solid #fde68a; color: #78350f; }
.p-callout__title { font-weight: 700; margin: 0 0 3px; font-size: 13px; }
.p-callout__text  { font-size: 12px; margin: 0; line-height: 1.5; }

/* Account info grid */
.p-info-grid { display: flex; flex-direction: column; gap: 0; border: 1.5px solid #eaecf0; border-radius: 12px; overflow: hidden; }
.p-info-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f8fafc; gap: 12px; flex-wrap: wrap; }
.p-info-item:last-child { border-bottom: none; }
.p-info-item__label { font-size: 12px; font-weight: 600; color: #64748b; flex-shrink: 0; }
.p-info-item__val   { font-size: 13px; font-weight: 600; color: #0f172a; }
.p-info-item__val--code { font-family: monospace; font-size: 11px; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; color: #64748b; word-break: break-all; }

/* Quick links */
.p-quick-links { background: #f8fafc; border-radius: 14px; padding: 16px 18px; border: 1px solid #f1f5f9; }
.p-quick-links__title { font-size: 12px; font-weight: 700; color: #64748b; margin: 0 0 12px; text-transform: uppercase; letter-spacing: .04em; }
.p-quick-links__grid  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.p-quick-link {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px; border-radius: 10px;
  border: 1.5px solid #e8ecf0; background: white;
  font-family: inherit; font-size: 12px; font-weight: 600; color: #374151;
  cursor: pointer; transition: all .13s;
}
.p-quick-link:hover { border-color: #22c55e; background: #f0fdf4; color: #15803d; }
.p-quick-link__icon  { font-size: 16px; }
.p-quick-link__arrow { margin-left: auto; color: #94a3b8; font-size: 14px; }
.p-quick-link:hover .p-quick-link__arrow { color: #16a34a; }

/* Danger zone */
.p-danger-zone { background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 14px; padding: 18px 20px; }
.p-danger-zone__title { font-size: 13px; font-weight: 700; color: #991b1b; margin: 0 0 14px; }

/* Buttons */
.p-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; border: none; transition: all .14s; white-space: nowrap;
}
.p-btn--primary { background: #0f172a; color: white; }
.p-btn--primary:hover:not(:disabled) { background: #1e293b; }
.p-btn--primary:disabled { opacity: .5; cursor: not-allowed; }
.p-btn--ghost   { background: transparent; color: #374151; border: 1.5px solid #e2e8f0; }
.p-btn--ghost:hover { background: #f8fafc; }
.p-btn--danger  { background: #ef4444; color: white; }
.p-btn--danger:hover { background: #dc2626; }
.p-btn--danger-outline { background: transparent; color: #ef4444; border: 1.5px solid #fecaca; }
.p-btn--danger-outline:hover { background: #fef2f2; border-color: #ef4444; }

/* Spinner */
.p-spinner { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: white; animation: pSpin .7s linear infinite; display: inline-block; }
@keyframes pSpin { to { transform: rotate(360deg) } }

/* Skeleton */
.p-sk { background: linear-gradient(90deg,#f1f5f9 25%,#e8ecf2 50%,#f1f5f9 75%); background-size: 200% 100%; animation: pShimmer 1.6s infinite; }
@keyframes pShimmer { to { background-position: -200% 0 } }

/* Toast */
.p-toast { position: fixed; bottom: 28px; right: 28px; z-index: 9999; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,.18); animation: pToastIn .2s ease; }
.p-toast--ok  { background: #0f172a; color: white; }
.p-toast--err { background: #ef4444; color: white; }
@keyframes pToastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* Modal */
.p-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 400; padding: 20px; }
.p-modal { background: white; border-radius: 20px; padding: 32px; max-width: 380px; width: 100%; box-shadow: 0 32px 80px rgba(0,0,0,.25); text-align: center; animation: pModalIn .2s ease; }
@keyframes pModalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:none} }
.p-modal__icon    { font-size: 36px; margin-bottom: 12px; }
.p-modal__title   { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; margin: 0 0 8px; }
.p-modal__body    { font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 24px; }
.p-modal__actions { display: flex; gap: 10px; justify-content: center; }

/* Responsive */
@media (max-width: 900px) {
  .p-layout { grid-template-columns: 1fr; }
  .p-nav    { display: flex; flex-direction: row; overflow-x: auto; position: static; }
  .p-navitem { flex-shrink: 0; padding: 10px 14px; border-bottom: none; border-right: 1px solid #f8fafc; }
  .p-navitem__bar { top: auto; bottom: 0; left: 20%; width: 60%; height: 3px; border-radius: 3px 3px 0 0; }
  .p-grid2 { grid-template-columns: 1fr; }
  .p-hero__stats { margin-left: 0; width: 100%; justify-content: center; flex-wrap: wrap; }
  .p-quick-links__grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .p-hero { padding: 20px 16px; }
  .p-layout { padding: 0 16px; }
  .p-hero__content { gap: 14px; }
  .p-avatar { width: 56px; height: 56px; border-radius: 16px; }
  .p-hero__name { font-size: 18px; }
  .p-quick-links__grid { grid-template-columns: 1fr; }
  .p-stat { padding: 0 10px; }
}
`
