/**
 * GolPlay — pages/login.tsx
 *
 * Migrado al DS oficial (dark uniforme):
 *   - Theme: dark en ambos paneles (left mantiene su gradient verde profundo).
 *   - Tipografía: Syne (var(--font-d)) en headings + DM Sans (body default).
 *   - Tokens CSS: var(--g4), var(--g6), var(--g7), var(--dark), etc.
 *   - Logo via <Logo dark height={...} link={false} />.
 *   - Sin Navbar global (correcto: login es entry point, antes de auth).
 *   - Reset y fadeUp keyframe vienen de golplay-tokens.css.
 *
 * Lógica sin cambios:
 *   - Redirect por role: admin/owner → /admin, else → /
 *   - Validación email + password >= 6
 *   - Friendly error messages
 *   - Success state con redirect timer
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import Logo from '@/components/ui/Logo'

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
      if (!success) setLoading(false)
    }
  }, [canSubmit, email, password, router, success])

  return (
    <>
      <Head>
        <title>Ingresar — GolPlay</title>
      </Head>
      <style>{CSS}</style>

      <main className="auth-main">

        {/* ── Left panel — desktop only ── */}
        <div className="auth-left">
          <div className="auth-left-grid" aria-hidden />

          <div className="auth-left-top">
            <div style={{ marginBottom: 64 }}>
              <Logo dark height={150} link={false} />
            </div>
            <h2 className="auth-left-title">
              Bienvenido<br />de <em>vuelta</em>
            </h2>
            <p className="auth-left-sub">
              Gestioná tus canchas, revisá tus reservas y hacé crecer tu negocio desde el panel.
            </p>
          </div>

          <div className="auth-left-bottom">
            {[
              { num: '+2.400', label: 'Reservas gestionadas' },
              { num: '24/7',   label: 'Sistema disponible'   },
              { num: '0',      label: 'Dobles reservas'      },
            ].map(s => (
              <div key={s.label} className="auth-stat">
                <div className="auth-stat-num">{s.num}</div>
                <div className="auth-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="auth-right">
          <div className="auth-form-wrap">

            <div className="mobile-logo">
              <Logo height={36} link={false} />
            </div>

            <span className="auth-eyebrow">Acceso</span>
            <h1 className="auth-h1">Iniciá <em>sesión</em></h1>
            <p className="auth-tagline">
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="auth-link-green">
                Registrate gratis
              </Link>
            </p>

            {success && (
              <div className="auth-success">
                <CheckCircle size={17} color="var(--g4)" />
                <span className="auth-success-text">¡Ingresando! Redirigiendo…</span>
              </div>
            )}

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} color="#fca5a5" style={{ marginTop: 1, flexShrink: 0 }} />
                <span className="auth-error-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} noValidate>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label className="auth-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="tu@email.com"
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  className={`auth-input${emailError ? ' auth-input--error' : ''}`}
                  aria-invalid={emailError}
                />
                {emailError && <p className="auth-field-error">Ingresá un email válido</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 8 }}>
                <div className="auth-label-row">
                  <label className="auth-label" htmlFor="password">Contraseña</label>
                  <Link href="/forgot-password" className="auth-link-green" style={{ fontSize: 12, fontWeight: 500 }}>
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
                    className={`auth-input${passwordError ? ' auth-input--error' : ''}`}
                    style={{ paddingRight: 44 }}
                    aria-invalid={passwordError}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="pass-toggle"
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && <p className="auth-field-error">Mínimo 6 caracteres</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`submit-btn ${canSubmit ? 'submit-btn--active' : 'submit-btn--disabled'}`}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Ingresando…
                  </span>
                ) : 'Ingresar'}
              </button>
            </form>

            <p className="auth-footer-text">
              Al ingresar aceptás nuestros{' '}
              <Link href="/terms">Términos</Link>{' '}y{' '}
              <Link href="/privacy">Privacidad</Link>.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
@keyframes spin { to { transform: rotate(360deg); } }

.auth-main {
  min-height: 100vh;
  display: flex;
  background: var(--card);
  font-family: var(--font-u);
}

/* ── Left panel ────────────────────────────────────────────── */
.auth-left {
  display: none;
  flex: 1;
  background: var(--blue);
  padding: 60px 56px;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.auth-left::before {
  content: ""; position: absolute; top: -10%; left: -8%;
  width: 60%; height: 130%; background: rgba(255,255,255,.06);
  transform: skewX(-14deg); pointer-events: none;
}
.auth-left::after {
  content: ""; position: absolute; top: 0; left: 24%;
  width: 26%; height: 130%; background: rgba(255,255,255,.05);
  transform: skewX(-14deg); pointer-events: none;
}
.auth-left-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
.auth-left-top, .auth-left-bottom {
  position: relative;
  z-index: 1;
}
.auth-left-title {
  font-family: var(--font-d);
  font-size: 44px;
  font-weight: 800;
  color: #fff;
  line-height: 1.04;
  letter-spacing: -0.04em;
  margin-bottom: 20px;
}
.auth-left-title em { font-style: italic; color: var(--lime); }
.auth-left-sub {
  font-size: 16px;
  color: rgba(255,255,255,.6);
  line-height: 1.7;
}
.auth-stat { margin-bottom: 20px; }
.auth-stat-num {
  font-size: 28px;
  font-weight: 800;
  color: var(--lime);
  font-family: var(--font-d);
}
.auth-stat-lbl {
  font-size: 13px;
  color: rgba(255,255,255,.5);
}

/* ── Right panel ───────────────────────────────────────────── */
.auth-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: var(--card);
}
.auth-form-wrap {
  width: 100%;
  max-width: 420px;
  animation: fadeUp 0.5s ease both;
}
.mobile-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 36px;
}

.auth-eyebrow {
  display: inline-block;
  font-family: var(--font-u);
  font-size: 13px; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--blue); margin-bottom: 10px;
}
.auth-h1 {
  font-family: var(--font-d);
  font-size: 34px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 8px;
}
.auth-h1 em { font-style: italic; color: var(--blue); }
.auth-tagline {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 32px;
}
.auth-link-green {
  color: var(--blue);
  font-weight: 600;
  text-decoration: none;
}
.auth-link-green:hover {
  text-decoration: underline;
}

.auth-success {
  display: flex; align-items: center; gap: 10px;
  background: rgba(58,91,240,.08);
  border: 1px solid rgba(58,91,240,.25);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
}
.auth-success-text {
  font-size: 14px;
  color: var(--g4);
  font-weight: 500;
}
.auth-error {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.25);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
}
.auth-error-text {
  font-size: 13px;
  color: #fca5a5;
}

.auth-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink2);
  margin-bottom: 6px;
}
.auth-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.auth-label-row .auth-label { margin-bottom: 0; }

.auth-input {
  width: 100%;
  padding: 13px 16px;
  font-size: 14px;
  border-radius: 14px;
  border: 1.5px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  outline: none;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.auth-input::placeholder {
  color: var(--faint);
}
.auth-input:focus {
  border-color: var(--blue);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(58,91,240,.14);
}
.auth-input--error {
  border-color: #ef4444 !important;
}
.auth-input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 30px #fff inset !important;
  -webkit-text-fill-color: var(--ink) !important;
  caret-color: var(--ink) !important;
}

.pass-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--faint);
  display: flex;
  align-items: center;
  padding: 2px;
  font-family: inherit;
  transition: color .15s;
}
.pass-toggle:hover {
  color: var(--ink2);
}

.auth-field-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  border-radius: 99px;
  border: none;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-u);
  cursor: pointer;
  margin-top: 24px;
  transition: all .15s;
}
.submit-btn--active {
  background: var(--blue);
  box-shadow: 0 8px 22px rgba(58,91,240,.28);
}
.submit-btn--active:hover {
  background: var(--blue2);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(58,91,240,.35);
}
.submit-btn--disabled {
  background: #e7ebf3;
  color: var(--faint);
  cursor: not-allowed;
  box-shadow: none;
}

.auth-footer-text {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  margin-top: 28px;
}
.auth-footer-text a {
  color: var(--ink2);
  text-decoration: underline;
}

@media (min-width: 900px) {
  .auth-left { display: flex; }
  .mobile-logo { display: none; }
}
`