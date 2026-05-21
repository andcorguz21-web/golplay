/**
 * GolPlay — pages/register.tsx
 *
 * Migrado al DS oficial:
 *   - Theme: dark two-panel (matchea login). Panel derecho pasó de light → dark.
 *   - Sin Navbar (página de entrada de auth, igual que login).
 *   - Tipografía: Syne (var(--font-d)) + DM Sans. Outfit eliminado (weight 900→800).
 *   - Tokens CSS: var(--g4/g6/g7), var(--dark/dark2).
 *   - Logo via <Logo dark link={false}> (panel izq + mobile).
 *   - const S record + estilos inline → clases CSS.
 *   - Inputs dark translúcidos, focus var(--g4) + halo. Autofill fix dark.
 *
 * Sin cambios (lógica intacta):
 *   - userType (user/owner), validación, errors, password strength.
 *   - handleSubmit: signUp + update profiles (country/currency/terms).
 *   - TermsModal flow para owners (re-submit tras aceptar).
 *   - COUNTRIES, getPasswordStrength, friendlyError, Field.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle, Check } from 'lucide-react'
import TermsModal from '@/components/ui/TermsModal'
import Logo from '@/components/ui/Logo'

// ─── Types ────────────────────────────────────────────────────────────────────

// 'user' matches profiles.role default. 'owner' matches the owner role.
type UserType = 'user' | 'owner'

interface FormData {
  name:        string
  email:       string
  password:    string
  confirmPass: string
  complexName: string
  location:    string
  phone:       string
  country:     string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'CR', label: '🇨🇷 Costa Rica',   currency: 'CRC' },
  { code: 'MX', label: '🇲🇽 México',        currency: 'MXN' },
  { code: 'CO', label: '🇨🇴 Colombia',      currency: 'COP' },
  { code: 'AR', label: '🇦🇷 Argentina',     currency: 'ARS' },
  { code: 'CL', label: '🇨🇱 Chile',         currency: 'CLP' },
  { code: 'PE', label: '🇵🇪 Perú',          currency: 'PEN' },
  { code: 'GT', label: '🇬🇹 Guatemala',     currency: 'GTQ' },
  { code: 'PA', label: '🇵🇦 Panamá',        currency: 'USD' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPasswordStrength(p: string): { score: number; label: string; color: string } {
  if (!p) return { score: 0, label: '', color: 'rgba(255,255,255,.1)' }
  let score = 0
  if (p.length >= 8)            score++
  if (p.length >= 12)           score++
  if (/[A-Z]/.test(p))         score++
  if (/[0-9]/.test(p))         score++
  if (/[^a-zA-Z0-9]/.test(p)) score++
  if (score <= 1) return { score: 1, label: 'Muy débil',  color: '#ef4444' }
  if (score === 2) return { score: 2, label: 'Débil',      color: '#f97316' }
  if (score === 3) return { score: 3, label: 'Regular',    color: '#eab308' }
  if (score === 4) return { score: 4, label: 'Fuerte',     color: '#22c55e' }
  return               { score: 5, label: 'Muy fuerte',  color: '#16a34a' }
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function friendlyError(msg: string): string {
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Este email ya tiene una cuenta. ¿Querés ingresar?'
  if (msg.includes('password'))  return 'La contraseña no cumple los requisitos mínimos.'
  if (msg.includes('network'))   return 'Error de conexión. Revisá tu internet.'
  if (msg.includes('rate'))      return 'Demasiados intentos. Esperá unos minutos.'
  return 'Ocurrió un error. Intentá nuevamente.'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= score ? color : 'rgba(255,255,255,.1)', transition: 'background 0.2s' }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()

  const [userType, setUserType] = useState<UserType>('user')
  const [form, setForm] = useState<FormData>({
    name: '', email: '', password: '', confirmPass: '',
    complexName: '', location: '', phone: '', country: 'CR',
  })
  const [showPass, setShowPass]         = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [touched, setTouched]           = useState<Partial<Record<keyof FormData, boolean>>>({})
  const [termsOpen,     setTermsOpen]     = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const update = useCallback((field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (error) setError('')
  }, [error])

  const touch = useCallback((field: keyof FormData) => {
    setTouched(t => ({ ...t, [field]: true }))
  }, [])

  // Validation
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (touched.name        && form.name.trim().length < 2)           e.name        = 'Mínimo 2 caracteres'
    if (touched.email       && !validateEmail(form.email))            e.email       = 'Email inválido'
    if (touched.password    && form.password.length < 8)              e.password    = 'Mínimo 8 caracteres'
    if (touched.confirmPass && form.confirmPass !== form.password)    e.confirmPass = 'Las contraseñas no coinciden'
    if (userType === 'owner') {
      if (touched.complexName && form.complexName.trim().length < 2)  e.complexName = 'Nombre requerido'
      if (touched.phone       && form.phone.trim().length < 7)        e.phone       = 'Teléfono inválido'
    }
    return e
  }, [form, touched, userType])

  const isValid = useMemo(() => {
    const base = validateEmail(form.email) && form.password.length >= 8 && form.password === form.confirmPass && form.name.trim().length >= 2
    if (userType === 'owner') return base && form.complexName.trim().length >= 2 && form.phone.trim().length >= 7
    return base
  }, [form, userType])

  const selectedCountry = COUNTRIES.find(c => c.code === form.country) ?? COUNTRIES[0]

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || loading) return

    // Si es owner y aún no aceptó los términos → mostrar modal primero
    if (userType === 'owner' && !termsAccepted) {
      setTermsOpen(true)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Split name into first/last
      const nameParts  = form.name.trim().split(/\s+/)
      const firstName  = nameParts[0] ?? ''
      const lastName   = nameParts.slice(1).join(' ') || ''

      // Sign up — trigger handle_new_user creates the profile
      const { data, error: signUpError } = await supabase.auth.signUp({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            role:         userType,
            first_name:   firstName,
            last_name:    lastName,
            phone:        form.phone.trim() || null,
            complex_name: form.complexName.trim() || null,
          },
        },
      })

      if (signUpError) { setError(friendlyError(signUpError.message)); return }
      if (!data.user)  { setError('No se pudo crear la cuenta. Intentá de nuevo.'); return }

      // Update profile with additional fields not available in signUp metadata
      // (handle_new_user trigger already created the row)
      await supabase
        .from('profiles')
        .update({
          phone:             form.phone.trim()       || null,
          complex_name:      form.complexName.trim() || null,
          country:           form.country,
          currency:          selectedCountry.currency,
          ...(userType === 'owner' ? { terms_accepted_at: new Date().toISOString() } : {}),
        })
        .eq('id', data.user.id)

      setSuccess(true)

      // If email confirmation is disabled in Supabase, redirect immediately
      if (data.session) {
        setTimeout(() => {
          router.replace(userType === 'owner' ? '/admin' : '/')
        }, 1000)
      }

    } catch {
      setError('Error inesperado. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [form, isValid, loading, router, userType, selectedCountry, termsAccepted])

  return (
    <>
      <Head>
        <title>Crear cuenta — GolPlay</title>
      </Head>

      <style>{CSS}</style>

      <div className="theme-dark">
        <main className="rg">

          {/* ── Left panel ── */}
          <div className="rg-left">
            <div className="rg-left__grid" />
            <div className="rg-left__top">
              <div className="rg-left__logo">
                <Logo dark height={150} link={false} />
              </div>
              <h2 className="rg-left__title">El marketplace<br />deportivo<br />de LATAM</h2>
              <p className="rg-left__sub">Conectamos jugadores con las mejores canchas de la región.</p>
            </div>
            <div className="rg-left__features">
              {[
                { icon: '⚽', text: 'Reservas en segundos' },
                { icon: '📅', text: 'Calendario siempre actualizado' },
                { icon: '💰', text: 'Sin cobros anticipados' },
                { icon: '🌎', text: 'Disponible en toda LATAM' },
              ].map(item => (
                <div key={item.icon} className="rg-feat">
                  <div className="rg-feat__icon">{item.icon}</div>
                  <span className="rg-feat__text">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="rg-right">
            <div className="rg-card">

              {/* Mobile logo */}
              <div className="rg-mobile-logo">
                <Logo dark height={36} link={false} />
              </div>

              <h1 className="rg-title">Crear cuenta</h1>
              <p className="rg-subtitle">
                ¿Ya tenés cuenta?{' '}
                <Link href="/login" className="rg-link">Iniciar sesión</Link>
              </p>

              {/* Success */}
              {success && (
                <div className="rg-success">
                  <CheckCircle size={18} color="var(--g4)" />
                  <div>
                    <p className="rg-success__title">¡Cuenta creada!</p>
                    <p className="rg-success__sub">Revisá tu email para confirmar tu cuenta.</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rg-error">
                  <AlertCircle size={16} color="#fca5a5" style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Account type selector */}
              <div className="rg-types">
                {([
                  { type: 'user' as UserType,  icon: '🧑‍⚽', title: 'Jugador',     desc: 'Quiero reservar canchas' },
                  { type: 'owner' as UserType, icon: '🏟️',   title: 'Propietario', desc: 'Tengo canchas para alquilar' },
                ]).map(opt => (
                  <button
                    key={opt.type}
                    type="button"
                    className={`type-btn ${userType === opt.type ? 'type-btn--sel' : ''}`}
                    onClick={() => setUserType(opt.type)}
                  >
                    {userType === opt.type && (
                      <div className="type-btn__check">
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                    <div className="type-btn__icon">{opt.icon}</div>
                    <p className="type-btn__title">{opt.title}</p>
                    <p className="type-btn__desc">{opt.desc}</p>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} noValidate className="rg-form">

                {/* Name */}
                <Field label="Nombre completo" error={errors.name}>
                  <input className={`rg-input ${errors.name ? 'rg-input--err' : ''}`} type="text" placeholder="Juan Pérez" value={form.name} autoComplete="name"
                    onChange={e => update('name', e.target.value)} onBlur={() => touch('name')} />
                </Field>

                {/* Email */}
                <Field label="Email" error={errors.email}>
                  <input className={`rg-input ${errors.email ? 'rg-input--err' : ''}`} type="email" placeholder="tu@email.com" value={form.email} autoComplete="email"
                    onChange={e => update('email', e.target.value)} onBlur={() => touch('email')} />
                </Field>

                {/* Country */}
                <Field label="País">
                  <select value={form.country} onChange={e => update('country', e.target.value)} className="rg-input rg-select">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>

                {/* Password */}
                <Field label="Contraseña" error={errors.password}>
                  <div className="rg-pass-wrap">
                    <input className={`rg-input rg-input--pass ${errors.password ? 'rg-input--err' : ''}`} type={showPass ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                      value={form.password} autoComplete="new-password"
                      onChange={e => update('password', e.target.value)} onBlur={() => touch('password')} />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="rg-eye" aria-label="Toggle password">
                      {showPass ? <EyeOff size={16} color="rgba(255,255,255,.5)" /> : <Eye size={16} color="rgba(255,255,255,.5)" />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={form.password} />
                </Field>

                {/* Confirm password */}
                <Field label="Confirmar contraseña" error={errors.confirmPass}>
                  <div className="rg-pass-wrap">
                    <input className={`rg-input rg-input--pass ${errors.confirmPass ? 'rg-input--err' : ''}`} type={showConfirm ? 'text' : 'password'} placeholder="Repetí tu contraseña"
                      value={form.confirmPass} autoComplete="new-password"
                      onChange={e => update('confirmPass', e.target.value)} onBlur={() => touch('confirmPass')} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="rg-eye" aria-label="Toggle confirm password">
                      {showConfirm ? <EyeOff size={16} color="rgba(255,255,255,.5)" /> : <Eye size={16} color="rgba(255,255,255,.5)" />}
                    </button>
                  </div>
                </Field>

                {/* Owner-only fields */}
                {userType === 'owner' && (
                  <>
                    <div className="rg-divider" />
                    <p className="rg-owner-label">Datos del complejo</p>

                    <Field label="Nombre del complejo" error={errors.complexName}>
                      <input className={`rg-input ${errors.complexName ? 'rg-input--err' : ''}`} type="text" placeholder="Ej: Complejo Deportivo XYZ"
                        value={form.complexName} onChange={e => update('complexName', e.target.value)} onBlur={() => touch('complexName')} />
                    </Field>

                    <Field label="Teléfono de contacto" error={errors.phone}>
                      <input className={`rg-input ${errors.phone ? 'rg-input--err' : ''}`} type="tel" placeholder="Ej: 8888-8888"
                        value={form.phone} onChange={e => update('phone', e.target.value)} onBlur={() => touch('phone')} />
                    </Field>
                  </>
                )}

                {/* Submit */}
                <button type="submit" disabled={!isValid || loading} className="rg-submit">
                  {loading ? (
                    <span className="rg-submit__loading">
                      <Loader2 size={16} style={{ animation: 'rgSpin 1s linear infinite' }} />
                      Creando cuenta…
                    </span>
                  ) : 'Crear cuenta gratis'}
                </button>

              </form>

              <p className="rg-terms">
                Al registrarte aceptás nuestros{' '}
                <Link href="/terms" className="rg-terms__link">Términos</Link>
                {' '}y{' '}
                <Link href="/privacy" className="rg-terms__link">Privacidad</Link>.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* ── Terms Modal (solo para owners) ── */}
      <TermsModal
        open={termsOpen}
        context="register"
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setTermsAccepted(true)
          setTermsOpen(false)
          // Re-submit automáticamente ahora que aceptó
          setTimeout(() => {
            document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click()
          }, 50)
        }}
      />
    </>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="rg-label">{label}</label>
      {children}
      {error && <p className="rg-field__err">{error}</p>}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
@keyframes rgSpin { to { transform: rotate(360deg); } }

.rg {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(160deg, var(--dark) 0%, var(--dark2) 100%);
}

/* — Left panel ───────────────────────────────────────────────── */
.rg-left {
  display: none;
  flex: 0 0 400px;
  background: linear-gradient(160deg, #052e16 0%, #14532d 60%, #166534 100%);
  padding: 60px 48px;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.rg-left__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
  background-size: 40px 40px;
}
.rg-left__top { position: relative; z-index: 1; }
.rg-left__logo { margin-bottom: 64px; }
.rg-left__title {
  font-family: var(--font-d);
  font-size: 34px;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  letter-spacing: -.04em;
  margin-bottom: 20px;
}
.rg-left__sub {
  font-size: 15px;
  color: rgba(255,255,255,.6);
  line-height: 1.7;
}
.rg-left__features { position: relative; z-index: 1; }
.rg-feat {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.rg-feat__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.rg-feat__text {
  font-size: 13px;
  color: rgba(255,255,255,.65);
  font-weight: 500;
}

/* — Right panel ──────────────────────────────────────────────── */
.rg-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  overflow-y: auto;
}
.rg-card {
  width: 100%;
  max-width: 440px;
  animation: fadeUp .5s ease both;
}
.rg-mobile-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}
.rg-title {
  font-family: var(--font-d);
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -.03em;
  margin-bottom: 6px;
}
.rg-subtitle {
  font-size: 14px;
  color: rgba(255,255,255,.55);
  margin-bottom: 28px;
}
.rg-link {
  color: var(--g4);
  font-weight: 600;
  text-decoration: none;
}
.rg-link:hover { text-decoration: underline; }

/* — Alerts ───────────────────────────────────────────────────── */
.rg-success {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(74,222,128,.1);
  border: 1px solid rgba(74,222,128,.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}
.rg-success__title { font-size: 14px; color: var(--g4); font-weight: 700; }
.rg-success__sub   { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 2px; }

.rg-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(248,113,113,.1);
  border: 1px solid rgba(248,113,113,.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
}
.rg-error span { font-size: 13px; color: #fca5a5; }

/* — Account type ─────────────────────────────────────────────── */
.rg-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 24px;
}
.type-btn {
  padding: 14px 12px;
  border-radius: 14px;
  text-align: left;
  border: 2px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  position: relative;
  cursor: pointer;
  font-family: inherit;
  transition: all .2s;
}
.type-btn:hover { border-color: rgba(255,255,255,.25); }
.type-btn--sel {
  border-color: var(--g4);
  background: rgba(74,222,128,.08);
}
.type-btn__check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--g6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.type-btn__icon { font-size: 22px; margin-bottom: 6px; }
.type-btn__title { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px; }
.type-btn__desc  { font-size: 11px; color: rgba(255,255,255,.5); line-height: 1.4; }

/* — Form ─────────────────────────────────────────────────────── */
.rg-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.rg-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,.85);
  margin-bottom: 6px;
}
.rg-field__err { font-size: 12px; color: #fca5a5; margin-top: 4px; }

.rg-input {
  width: 100%;
  padding: 11px 14px;
  font-size: 14px;
  border-radius: 11px;
  border: 1.5px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: #fff;
  outline: none;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.rg-input::placeholder { color: rgba(255,255,255,.3); }
.rg-input:focus {
  border-color: var(--g4);
  box-shadow: 0 0 0 3px rgba(74,222,128,.15);
  background: rgba(255,255,255,.06);
}
.rg-input--err { border-color: #f87171; }
.rg-input--pass { padding-right: 44px; }

/* Autofill (dark) */
.rg-input:-webkit-autofill,
.rg-input:-webkit-autofill:hover,
.rg-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px rgba(8,14,10,.95) inset;
  -webkit-text-fill-color: #fff;
  caret-color: #fff;
}

.rg-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a1a1aa' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}
.rg-select option { background: var(--dark2); color: #fff; }

.rg-pass-wrap { position: relative; }
.rg-eye {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
}

.rg-divider {
  height: 1px;
  background: rgba(255,255,255,.1);
  margin: 4px 0;
}
.rg-owner-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,.5);
  letter-spacing: .06em;
  text-transform: uppercase;
}

/* — Submit ───────────────────────────────────────────────────── */
.rg-submit {
  margin-top: 8px;
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-d);
  background: linear-gradient(135deg, var(--g6), var(--g7));
  box-shadow: 0 4px 16px rgba(34,197,94,.25);
  cursor: pointer;
  transition: all .15s;
}
.rg-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(34,197,94,.35);
}
.rg-submit:disabled {
  background: rgba(255,255,255,.1);
  color: rgba(255,255,255,.4);
  box-shadow: none;
  cursor: not-allowed;
}
.rg-submit__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* — Terms ────────────────────────────────────────────────────── */
.rg-terms {
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,.4);
  margin-top: 24px;
}
.rg-terms__link {
  color: rgba(255,255,255,.6);
  text-decoration: underline;
}

@media (min-width: 960px) {
  .rg-left { display: flex; }
  .rg-mobile-logo { display: none; }
}
`