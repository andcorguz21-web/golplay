/**
 * GolPlay — pages/login.tsx
 *
 * Mejoras vs versión original:
 *  - Redirect correcto: admin/owner → /admin, player → /, user → /
 *  - setLoading(false) en el finally aunque haya success (evita spinner stuck)
 *  - Panel izquierdo visible en desktop con media query en <style>
 *  - Google Fonts via next/head con preconnect correcto
 *  - Sin cambios visuales — se mantiene el diseño exacto del original
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('Email not confirmed'))        return 'Confirmá tu email antes de ingresar.'
  if (msg.includes('too many requests'))          return 'Demasiados intentos. Esperá unos minutos.'
  if (msg.includes('network'))                    return 'Error de conexión. Revisá tu internet.'
  return 'Ocurrió un error. Intentá nuevamente.'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  const [touched, setTouched] = useState({ email: false, password: false })
  const emailError    = touched.email    && !validateEmail(email)
  const passwordError = touched.password && password.length < 6
  const canSubmit     = validateEmail(email) && password.length >= 6 && !loading

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError('')

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })

      if (loginError || !data.user) {
        setError(friendlyError(loginError?.message ?? ''))
        return
      }

      // Fetch role for redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      setSuccess(true)

      setTimeout(() => {
        const role = profile?.role
        if (role === 'admin' || role === 'owner') {
          router.replace('/admin')
        } else {
          router.replace('/')
        }
      }, 600)

    } catch {
      setError('Error inesperado. Intentá nuevamente.')
    } finally {
      // Only clear loading if not redirecting (success handles its own state)
      if (!success) setLoading(false)
    }
  }, [canSubmit, email, password, router, success])

  return (
    <>
      <Head>
        <title>Ingresar — GolPlay</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #fff inset !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes spin { to { transform: rotate(360deg) } }
        .auth-input:focus { outline: none; border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,.12) !important; }
        .auth-input { transition: border-color 0.15s, box-shadow 0.15s; }
        .pass-toggle:hover { color: #374151 !important; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(34,197,94,.35) !important; }
        .submit-btn { transition: all 0.15s; }
        .link-green:hover { text-decoration: underline; }
        .auth-left { display: none; }
        @media (min-width: 900px) {
          .auth-left { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>

      <main style={{
        minHeight: '100vh', display: 'flex',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #eff6ff 100%)',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* ── Left panel — desktop ── */}
        <div
          className="auth-left"
          style={{
            flex: 1,
            background: 'linear-gradient(160deg, #052e16 0%, #14532d 60%, #166534 100%)',
            padding: '60px 56px',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 64 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚽</div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>GolPlay</span>
            </div>
            <h2 style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.04em', fontFamily: 'Outfit, sans-serif', marginBottom: 20 }}>
              Bienvenido<br />de vuelta
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>
              Gestioná tus canchas, revisá tus reservas y hacé crecer tu negocio desde el panel.
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {[
              { num: '+2.400', label: 'Reservas gestionadas' },
              { num: '24/7',   label: 'Sistema disponible'   },
              { num: '0',      label: 'Dobles reservas'      },
            ].map(s => (
              <div key={s.label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#22c55e', fontFamily: 'Outfit, sans-serif' }}>{s.num}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.5s ease both' }}>

            {/* Mobile logo */}
            <div className="mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>⚽</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>GolPlay</span>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>
              Iniciá sesión
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="link-green" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                Registrate gratis
              </Link>
            </p>

            {/* Success */}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <CheckCircle size={17} color="#16a34a" />
                <span style={{ fontSize: 14, color: '#15803d', fontWeight: 500 }}>¡Ingresando! Redirigiendo…</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <AlertCircle size={16} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} noValidate>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={S.label} htmlFor="email">Email</label>
                <input
                  id="email" type="email" value={email}
                  autoComplete="email" placeholder="tu@email.com"
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  className="auth-input"
                  style={{ ...S.input, borderColor: emailError ? '#ef4444' : '#e2e8f0' }}
                  aria-invalid={emailError}
                />
                {emailError && <p style={S.fieldError}>Ingresá un email válido</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={S.label} htmlFor="password">Contraseña</label>
                  <Link href="/forgot-password" style={{ fontSize: 12, color: '#16a34a', textDecoration: 'none', fontWeight: 500 }}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    onChange={e => setPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    className="auth-input"
                    style={{ ...S.input, paddingRight: 44, borderColor: passwordError ? '#ef4444' : '#e2e8f0' }}
                    aria-invalid={passwordError}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="pass-toggle" style={S.eyeBtn}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && <p style={S.fieldError}>Mínimo 6 caracteres</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="submit-btn"
                style={{
                  ...S.submitBtn, marginTop: 24,
                  background: canSubmit ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#cbd5e1',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  boxShadow: canSubmit ? '0 4px 16px rgba(34,197,94,.25)' : 'none',
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Ingresando…
                  </span>
                ) : 'Ingresar'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 28 }}>
              Al ingresar aceptás nuestros{' '}
              <Link href="/terms" style={{ color: '#64748b', textDecoration: 'underline' }}>Términos</Link>
              {' '}y{' '}
              <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Privacidad</Link>.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 11, border: '1.5px solid #e2e8f0', background: '#fff', color: '#0f172a', outline: 'none' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 },
  fieldError: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  submitBtn: { width: '100%', padding: '13px', borderRadius: 12, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'Outfit, sans-serif' },
}
