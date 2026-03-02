/**
 * GolPlay — pages/register.tsx
 *
 * Mejoras vs versión original:
 *  - Se selecciona país al registrarse → se guarda en profiles.country y profiles.currency
 *  - Rol 'player' renombrado internamente a 'user' para consistencia con la DB
 *    (la DB usa 'user', el original usaba 'player' que no existe en profiles.role)
 *  - complex_name del owner se guarda correctamente en profiles
 *  - Manejo de error si el perfil ya existe (ON CONFLICT en trigger handle_new_user)
 *  - Loading state correcto: se deshabilita el botón durante el submit
 *  - Sin cambios visuales — se mantiene el diseño exacto del original
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle, Check } from 'lucide-react'
import TermsModal from '@/components/ui/TermsModal'

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
  if (!p) return { score: 0, label: '', color: '#e2e8f0' }
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
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= score ? color : '#e2e8f0', transition: 'background 0.2s' }} />
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
            role:        userType,
            first_name:  firstName,
            last_name:   lastName,
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes spin    { to { transform: rotate(360deg) } }
        .r-input:focus  { outline:none; border-color:#22c55e !important; box-shadow:0 0 0 3px rgba(34,197,94,.12) !important; }
        .r-input        { transition: border-color .15s, box-shadow .15s; }
        .r-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(34,197,94,.35) !important; }
        .r-btn { transition: all .15s; }
        .type-btn { transition: all .2s; cursor:pointer; }
        .auth-left { display: none; }
        @media (min-width: 960px) {
          .auth-left { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>

      <main style={{
        minHeight: '100vh', display: 'flex',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #eff6ff 100%)',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* ── Left panel ── */}
        <div className="auth-left" style={{
          flex: '0 0 400px',
          background: 'linear-gradient(160deg, #052e16 0%, #14532d 60%, #166534 100%)',
          padding: '60px 48px', flexDirection: 'column', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ marginBottom: 64 }}>
              <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 150, width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }} />
            </div>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.04em', fontFamily: 'Outfit, sans-serif', marginBottom: 20 }}>
              El marketplace<br />deportivo<br />de LATAM
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>
              Conectamos jugadores con las mejores canchas de la región.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {[
              { icon: '⚽', text: 'Reservas en segundos' },
              { icon: '📅', text: 'Calendario siempre actualizado' },
              { icon: '💰', text: 'Sin cobros anticipados' },
              { icon: '🌎', text: 'Disponible en toda LATAM' },
            ].map(item => (
              <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp .5s ease both' }}>

            {/* Mobile logo */}
            <div className="mobile-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <img src="/logo-golplay.svg" alt="GolPlay" style={{ height: 36, width: 'auto', display: 'block' }} />
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>Crear cuenta</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28 }}>
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
            </p>

            {/* Success */}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
                <CheckCircle size={18} color="#16a34a" />
                <div>
                  <p style={{ fontSize: 14, color: '#15803d', fontWeight: 700 }}>¡Cuenta creada!</p>
                  <p style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                    {/* If email confirmation required */}
                    Revisá tu email para confirmar tu cuenta.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <AlertCircle size={16} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
              </div>
            )}

            {/* Account type selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {([
                { type: 'user' as UserType,  icon: '🧑‍⚽', title: 'Jugador',     desc: 'Quiero reservar canchas' },
                { type: 'owner' as UserType, icon: '🏟️',   title: 'Propietario', desc: 'Tengo canchas para alquilar' },
              ]).map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  className="type-btn"
                  onClick={() => setUserType(opt.type)}
                  style={{
                    padding: '14px 12px', borderRadius: 14, textAlign: 'left',
                    border: `2px solid ${userType === opt.type ? '#16a34a' : '#e2e8f0'}`,
                    background: userType === opt.type ? '#f0fdf4' : '#fff',
                    position: 'relative',
                  }}
                >
                  {userType === opt.type && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{opt.title}</p>
                  <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{opt.desc}</p>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Name */}
              <Field label="Nombre completo" error={errors.name}>
                <input className="r-input" type="text" placeholder="Juan Pérez" value={form.name} autoComplete="name"
                  onChange={e => update('name', e.target.value)} onBlur={() => touch('name')}
                  style={{ ...S.input, borderColor: errors.name ? '#ef4444' : '#e2e8f0' }} />
              </Field>

              {/* Email */}
              <Field label="Email" error={errors.email}>
                <input className="r-input" type="email" placeholder="tu@email.com" value={form.email} autoComplete="email"
                  onChange={e => update('email', e.target.value)} onBlur={() => touch('email')}
                  style={{ ...S.input, borderColor: errors.email ? '#ef4444' : '#e2e8f0' }} />
              </Field>

              {/* Country */}
              <Field label="País">
                <select value={form.country} onChange={e => update('country', e.target.value)}
                  className="r-input"
                  style={{ ...S.input, appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' strokeWidth='1.5' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </Field>

              {/* Password */}
              <Field label="Contraseña" error={errors.password}>
                <div style={{ position: 'relative' }}>
                  <input className="r-input" type={showPass ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                    value={form.password} autoComplete="new-password"
                    onChange={e => update('password', e.target.value)} onBlur={() => touch('password')}
                    style={{ ...S.input, paddingRight: 44, borderColor: errors.password ? '#ef4444' : '#e2e8f0' }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={S.eyeBtn} aria-label="Toggle password">
                    {showPass ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                  </button>
                </div>
                <PasswordStrengthBar password={form.password} />
              </Field>

              {/* Confirm password */}
              <Field label="Confirmar contraseña" error={errors.confirmPass}>
                <div style={{ position: 'relative' }}>
                  <input className="r-input" type={showConfirm ? 'text' : 'password'} placeholder="Repetí tu contraseña"
                    value={form.confirmPass} autoComplete="new-password"
                    onChange={e => update('confirmPass', e.target.value)} onBlur={() => touch('confirmPass')}
                    style={{ ...S.input, paddingRight: 44, borderColor: errors.confirmPass ? '#ef4444' : '#e2e8f0' }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={S.eyeBtn} aria-label="Toggle confirm password">
                    {showConfirm ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                  </button>
                </div>
              </Field>

              {/* Owner-only fields */}
              {userType === 'owner' && (
                <>
                  <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase' }}>Datos del complejo</p>

                  <Field label="Nombre del complejo" error={errors.complexName}>
                    <input className="r-input" type="text" placeholder="Ej: Complejo Deportivo XYZ"
                      value={form.complexName} onChange={e => update('complexName', e.target.value)} onBlur={() => touch('complexName')}
                      style={{ ...S.input, borderColor: errors.complexName ? '#ef4444' : '#e2e8f0' }} />
                  </Field>

                  <Field label="Teléfono de contacto" error={errors.phone}>
                    <input className="r-input" type="tel" placeholder="Ej: 8888-8888"
                      value={form.phone} onChange={e => update('phone', e.target.value)} onBlur={() => touch('phone')}
                      style={{ ...S.input, borderColor: errors.phone ? '#ef4444' : '#e2e8f0' }} />
                  </Field>
                </>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!isValid || loading}
                className="r-btn"
                style={{
                  marginTop: 8, width: '100%', padding: 14, borderRadius: 12,
                  border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                  fontFamily: 'Outfit, sans-serif',
                  background: isValid && !loading ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#cbd5e1',
                  cursor: isValid && !loading ? 'pointer' : 'not-allowed',
                  boxShadow: isValid && !loading ? '0 4px 16px rgba(34,197,94,.25)' : 'none',
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Creando cuenta…
                  </span>
                ) : 'Crear cuenta gratis'}
              </button>

            </form>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 24 }}>
              Al registrarte aceptás nuestros{' '}
              <Link href="/terms" style={{ color: '#64748b', textDecoration: 'underline' }}>Términos</Link>
              {' '}y{' '}
              <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Privacidad</Link>.
            </p>
          </div>
        </div>
      </main>

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
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  input: { width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 11, border: '1.5px solid #e2e8f0', background: '#fff', color: '#0f172a', outline: 'none', fontFamily: "'DM Sans', sans-serif" },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 },
}
