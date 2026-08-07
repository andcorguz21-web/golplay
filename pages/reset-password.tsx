/**
 * GolPlay — pages/reset-password.tsx
 *
 * Migrado al DS oficial:
 *   - Theme: dark. Card blanco → dark sobre gradiente verde (matchea forgot-password).
 *   - Sin Navbar (página de auth).
 *   - Tipografía: Syne (var(--font-d)) + DM Sans. Outfit eliminado.
 *   - Logo via <Logo dark link={false}>.
 *   - const S record + estilos inline → clases CSS.
 *   - Eye icons inherit currentColor (dark).
 *
 * Sin cambios (lógica intacta):
 *   - Verificación de sesión PASSWORD_RECOVERY vía onAuthStateChange.
 *   - Redirect a /forgot-password si no hay token válido.
 *   - validatePassword (8+, mayúscula, número) + confirmación.
 *   - updateUser + redirect a /login.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Lock } from 'lucide-react'
import Logo from '@/components/ui/Logo'

// ─── Password validation ──────────────────────────────────────────────────────
function validatePassword(p: string): string | null {
  if (p.length < 8)           return 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(p))       return 'Debe incluir al menos una mayúscula'
  if (!/[0-9]/.test(p))       return 'Debe incluir al menos un número'
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResetPassword() {
  const router = useRouter()

  const [validSession,  setValidSession]  = useState(false)
  const [checking,      setChecking]      = useState(true)   // verifying token
  const [password,      setPassword]      = useState('')
  const [confirm,       setConfirm]       = useState('')
  const [showPass,      setShowPass]      = useState(false)
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [done,          setDone]          = useState(false)
  const [error,         setError]         = useState('')
  const [touched,       setTouched]       = useState({ password: false, confirm: false })

  const passError    = touched.password && validatePassword(password)
  const confirmError = touched.confirm  && confirm !== password ? 'Las contraseñas no coinciden' : null
  const canSubmit    = !validatePassword(password) && password === confirm && !loading

  // ── Verify recovery session ──────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        router.replace('/forgot-password')
      } else if (event === 'INITIAL_SESSION') {
        // Wait a moment for PASSWORD_RECOVERY event to fire
        setTimeout(() => {
          setChecking(prev => {
            if (prev) {
              // No PASSWORD_RECOVERY arrived — redirect
              router.replace('/forgot-password')
            }
            return false
          })
        }, 2000)
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado. Solicitá uno nuevo.')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  // ── Loading state (verifying token) ──────────────────────────────────────
  if (checking) {
    return (
      <>
        <Head><title>Verificando… — GolPlay</title></Head>
        <style>{CSS}</style>
        <div className="theme-dark">
          <main className="rp">
            <div className="rp__grid" />
            <div className="rp-checking">
              <Loader2 size={32} style={{ animation: 'rpSpin 1s linear infinite', marginBottom: 12 }} />
              <p>Verificando enlace de recuperación…</p>
            </div>
          </main>
        </div>
      </>
    )
  }

  // ── Invalid session (should have redirected, fallback) ───────────────────
  if (!validSession) {
    return (
      <>
        <Head><title>Enlace inválido — GolPlay</title></Head>
        <style>{CSS}</style>
        <div className="theme-dark">
          <main className="rp">
            <div className="rp__grid" />
            <div className="rp-wrap">
              <div className="rp-card">
                <div style={{ textAlign: 'center' }}>
                  <AlertCircle size={40} color="#fca5a5" style={{ marginBottom: 16 }} />
                  <h1 className="rp-title">Enlace inválido o expirado</h1>
                  <p className="rp-text">
                    Este enlace de recuperación no es válido o ya expiró. Los enlaces tienen una validez de 1 hora.
                  </p>
                  <Link href="/forgot-password" className="rp-linkBtn">
                    Solicitar nuevo enlace →
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Nueva contraseña — GolPlay</title>
      </Head>

      <style>{CSS}</style>

      <div className="theme-dark">
        <main className="rp">
          <div className="rp-wrap">

            <div className="rp-logo">
              <Logo dark height={40} link={false} />
            </div>

            <div className="rp-card">

              {done ? (
                /* ── Success ── */
                <div style={{ textAlign: 'center' }}>
                  <div className="rp-done-circle">
                    <CheckCircle size={32} color="var(--g4)" />
                  </div>
                  <h1 className="rp-title" style={{ marginBottom: 12 }}>¡Contraseña actualizada!</h1>
                  <p className="rp-text" style={{ marginBottom: 8 }}>Tu contraseña fue cambiada correctamente.</p>
                  <p className="rp-muted">Redirigiendo al inicio de sesión…</p>
                </div>
              ) : (
                /* ── Form ── */
                <>
                  <div className="rp-head">
                    <div className="rp-head__icon">
                      <Lock size={18} color="var(--g4)" />
                    </div>
                    <div>
                      <h1 className="rp-title">Nueva contraseña</h1>
                      <p className="rp-head__sub">Creá una contraseña segura para tu cuenta</p>
                    </div>
                  </div>

                  {error && (
                    <div className="rp-error">
                      <AlertCircle size={16} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>

                    {/* Nueva contraseña */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="rp-label">Nueva contraseña</label>
                      <div className="rp-pass-wrap">
                        <input
                          type={showPass ? 'text' : 'password'}
                          className={`rp-input rp-input--pass ${passError ? 'rp-input--err' : ''}`}
                          placeholder="Mínimo 8 caracteres"
                          value={password}
                          onChange={e => { setPassword(e.target.value); setError('') }}
                          onBlur={() => setTouched(t => ({ ...t, password: true }))}
                          autoComplete="new-password"
                        />
                        <button type="button" className="rp-eye" onClick={() => setShowPass(v => !v)}
                          aria-label={showPass ? 'Ocultar' : 'Mostrar'}>
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {passError
                        ? <p className="rp-field-error">{passError}</p>
                        : password.length > 0 && !validatePassword(password) &&
                          <p className="rp-valid">✓ Contraseña válida</p>
                      }
                    </div>

                    {/* Confirmar contraseña */}
                    <div style={{ marginBottom: 8 }}>
                      <label className="rp-label">Confirmar contraseña</label>
                      <div className="rp-pass-wrap">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          className={`rp-input rp-input--pass ${confirmError ? 'rp-input--err' : ''}`}
                          placeholder="Repetí la contraseña"
                          value={confirm}
                          onChange={e => { setConfirm(e.target.value); setError('') }}
                          onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                          autoComplete="new-password"
                        />
                        <button type="button" className="rp-eye" onClick={() => setShowConfirm(v => !v)}
                          aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {confirmError && <p className="rp-field-error">{confirmError}</p>}
                    </div>

                    {/* Requisitos */}
                    <div className="rp-reqs">
                      <p className="rp-reqs__title">Requisitos</p>
                      {[
                        { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
                        { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(password) },
                        { label: 'Al menos un número', ok: /[0-9]/.test(password) },
                      ].map(req => (
                        <div key={req.label} className={`rp-req ${req.ok ? 'rp-req--ok' : ''}`}>
                          <span className="rp-req__mark">{req.ok ? '✓' : '○'}</span>
                          <span className="rp-req__label">{req.label}</span>
                        </div>
                      ))}
                    </div>

                    <button type="submit" disabled={!canSubmit} className="rp-btn">
                      {loading
                        ? <span className="rp-btn__loading">
                            <Loader2 size={16} style={{ animation: 'rpSpin 1s linear infinite' }} />
                            Actualizando…
                          </span>
                        : 'Guardar nueva contraseña'
                      }
                    </button>

                    <Link href="/login" className="rp-back">
                      ← Volver al inicio de sesión
                    </Link>

                  </form>
                </>
              )}
            </div>
          </div>

          <div className="rp__grid" />
        </main>
      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
@keyframes rpSpin { to { transform: rotate(360deg); } }

.rp {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #141a33 0%, #1e2a66 50%, #26379e 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}
.rp__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.rp-checking {
  text-align: center;
  color: #fff;
  position: relative;
  z-index: 1;
}
.rp-checking p { font-size: 14px; opacity: .7; }

.rp-wrap {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
  animation: fadeUp .45s ease both;
}
.rp-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.rp-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 36px 32px;
  box-shadow: 0 25px 60px rgba(20,26,51,.28);
}

.rp-title {
  font-family: var(--font-d);
  font-size: 22px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -.02em;
}

.rp-text {
  font-size: 14px;
  color: var(--ink2);
  line-height: 1.7;
  margin-bottom: 24px;
}
.rp-muted { font-size: 13px; color: var(--muted); }

.rp-done-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(58,91,240,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

/* — Form head ────────────────────────────────────────────────── */
.rp-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.rp-head__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(58,91,240,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rp-head__sub { font-size: 13px; color: var(--muted); margin-top: 2px; }

/* — Error ────────────────────────────────────────────────────── */
.rp-error {
  display: flex;
  gap: 10px;
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.25);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 20px;
}
.rp-error span { font-size: 13px; color: #dc2626; line-height: 1.5; }

/* — Fields ───────────────────────────────────────────────────── */
.rp-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink2);
  margin-bottom: 6px;
}
.rp-pass-wrap { position: relative; }
.rp-input {
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
.rp-input::placeholder { color: var(--faint); }
.rp-input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(58,91,240,.14);
  background: #fff;
}
.rp-input--err { border-color: #ef4444; }
.rp-input--pass { padding-right: 44px; }
.rp-input:-webkit-autofill,
.rp-input:-webkit-autofill:hover,
.rp-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #fff inset;
  -webkit-text-fill-color: var(--ink);
  caret-color: var(--ink);
}

.rp-eye {
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
  transition: color .15s;
}
.rp-eye:hover { color: var(--ink2); }

.rp-field-error { font-size: 12px; color: #dc2626; margin-top: 4px; }
.rp-valid { font-size: 12px; color: var(--blue); margin-top: 4px; }

/* — Requisitos ───────────────────────────────────────────────── */
.rp-reqs {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  margin: 8px 0 20px;
}
.rp-reqs__title {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.rp-req {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.rp-req__mark { font-size: 12px; color: var(--faint); }
.rp-req__label { font-size: 12px; color: var(--muted); }
.rp-req--ok .rp-req__mark,
.rp-req--ok .rp-req__label { color: var(--blue); }

/* — Buttons ──────────────────────────────────────────────────── */
.rp-btn {
  width: 100%;
  padding: 15px;
  border-radius: 99px;
  border: none;
  background: var(--blue);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  font-family: var(--font-u);
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(58,91,240,.28);
  margin-bottom: 16px;
  transition: all .15s;
}
.rp-btn:hover:not(:disabled) {
  background: var(--blue2);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(58,91,240,.35);
}
.rp-btn:disabled {
  background: #e7ebf3;
  color: var(--faint);
  box-shadow: none;
  cursor: not-allowed;
}
.rp-btn__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.rp-back {
  display: block;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
}
.rp-back:hover { color: var(--ink2); }

.rp-linkBtn {
  display: inline-block;
  background: var(--blue);
  color: #fff;
  padding: 13px 26px;
  border-radius: 99px;
  font-weight: 700;
  font-size: 14px;
  font-family: var(--font-u);
  text-decoration: none;
  box-shadow: 0 8px 22px rgba(58,91,240,.28);
  transition: all .15s;
}
.rp-linkBtn:hover { background: var(--blue2); transform: translateY(-1px); box-shadow: 0 12px 28px rgba(58,91,240,.35); }
`