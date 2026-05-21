/**
 * GolPlay — pages/forgot-password.tsx
 *
 * Migrado al DS oficial:
 *   - Theme: dark. Card blanco → dark sobre el gradiente verde de branding.
 *   - Sin Navbar (página de auth).
 *   - Tipografía: Syne (var(--font-d)) + DM Sans. Outfit eliminado.
 *   - Logo via <Logo dark link={false}> (reemplaza el emoji + wordmark fake).
 *   - Estilos inline → clases CSS.
 *
 * Sin cambios (lógica intacta):
 *   - Validación de email.
 *   - resetPasswordForEmail con redirectTo /reset-password.
 *   - Anti email-enumeration: siempre muestra success.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/ui/Logo'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail || loading) return

    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      // Don't reveal if email exists for security — show generic success anyway
      // but log internally
      console.error('Reset error:', resetError.message)
    }

    // Always show success to avoid email enumeration
    setSent(true)
  }

  return (
    <>
      <Head>
        <title>Recuperar contraseña — GolPlay</title>
      </Head>

      <style>{CSS}</style>

      <div className="theme-dark">
        <main className="fp">
          <div className="fp__grid" />

          <div className="fp-card-wrap">
            <div className="fp-logo">
              <Logo dark height={40} link={false} />
            </div>

            <div className="fp-card">
              {sent ? (
                /* ── Success state ── */
                <div style={{ textAlign: 'center' }}>
                  <div className="fp-icon">📧</div>
                  <h1 className="fp-title">Revisá tu email</h1>
                  <p className="fp-text">
                    Si <strong>{email}</strong> tiene una cuenta en GolPlay, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                  </p>
                  <p className="fp-muted">
                    ¿No lo recibiste? Revisá la carpeta de spam o esperá unos minutos.
                  </p>
                  <Link href="/login" className="fp-back fp-back--accent">
                    ← Volver al inicio de sesión
                  </Link>
                </div>
              ) : (
                /* ── Form ── */
                <>
                  <h1 className="fp-title">Recuperar contraseña</h1>
                  <p className="fp-text fp-text--lead">
                    Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
                  </p>

                  {error && <div className="fp-error">{error}</div>}

                  <form onSubmit={sendReset} noValidate>
                    <label className="fp-label">Email</label>
                    <input
                      type="email"
                      className="fp-input"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      required
                      autoComplete="email"
                    />

                    <button type="submit" disabled={!isValidEmail || loading} className="fp-btn">
                      {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                    </button>

                    <Link href="/login" className="fp-back">
                      ← Volver al inicio de sesión
                    </Link>
                  </form>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
.fp {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}
.fp__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.fp-card-wrap {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
  animation: fadeUp .45s ease both;
}
.fp-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.fp-card {
  background: var(--dark2);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px;
  padding: 40px 36px;
  box-shadow: 0 25px 60px rgba(0,0,0,.45);
}

.fp-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(74,222,128,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin: 0 auto 20px;
}

.fp-title {
  font-family: var(--font-d);
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
}

.fp-text {
  font-size: 14px;
  color: rgba(255,255,255,.65);
  line-height: 1.7;
  margin-bottom: 28px;
}
.fp-text--lead { line-height: 1.6; }
.fp-text strong { color: #fff; }

.fp-muted {
  font-size: 12px;
  color: rgba(255,255,255,.4);
  margin-bottom: 24px;
}

.fp-error {
  background: rgba(248,113,113,.1);
  border: 1px solid rgba(248,113,113,.3);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  color: #fca5a5;
  margin-bottom: 20px;
}

.fp-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,.85);
  margin-bottom: 6px;
}

.fp-input {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  border-radius: 11px;
  border: 1.5px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: #fff;
  outline: none;
  margin-bottom: 20px;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.fp-input::placeholder { color: rgba(255,255,255,.3); }
.fp-input:focus {
  border-color: var(--g4);
  box-shadow: 0 0 0 3px rgba(74,222,128,.15);
  background: rgba(255,255,255,.06);
}
.fp-input:-webkit-autofill,
.fp-input:-webkit-autofill:hover,
.fp-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px rgba(8,14,10,.95) inset;
  -webkit-text-fill-color: #fff;
  caret-color: #fff;
}

.fp-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--g6), var(--g7));
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  font-family: var(--font-d);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(22,163,74,.25);
  margin-bottom: 16px;
  transition: all .15s;
}
.fp-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(22,163,74,.35);
}
.fp-btn:disabled {
  background: rgba(255,255,255,.1);
  color: rgba(255,255,255,.4);
  box-shadow: none;
  cursor: not-allowed;
}

.fp-back {
  display: block;
  text-align: center;
  font-size: 13px;
  color: rgba(255,255,255,.55);
  text-decoration: none;
  font-weight: 500;
}
.fp-back:hover { color: rgba(255,255,255,.8); }
.fp-back--accent {
  font-size: 14px;
  color: var(--g4);
  font-weight: 600;
}
.fp-back--accent:hover { color: var(--g4); text-decoration: underline; }
`