/**
 * GolPlay — pages/reset-password.tsx
 *
 * Fixes aplicados:
 *  - Verifica sesión PASSWORD_RECOVERY con onAuthStateChange antes de mostrar el form
 *  - Sin token válido → redirect a /forgot-password
 *  - Validación de contraseña: mínimo 8 caracteres, 1 mayúscula, 1 número
 *  - Confirmación de contraseña (dos campos)
 *  - Manejo de error si updateUser falla
 *  - Diseño consistente con login.tsx (mismo fondo, fuentes, card)
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Lock } from 'lucide-react'

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
        <main style={S.page}>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ fontSize: 14, opacity: 0.7 }}>Verificando enlace de recuperación…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </main>
      </>
    )
  }

  // ── Invalid session (should have redirected, fallback) ───────────────────
  if (!validSession) {
    return (
      <>
        <Head><title>Enlace inválido — GolPlay</title></Head>
        <main style={S.page}>
          <div style={S.card}>
            <div style={{ textAlign: 'center' }}>
              <AlertCircle size={40} color="#dc2626" style={{ marginBottom: 16 }} />
              <h1 style={S.title}>Enlace inválido o expirado</h1>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
                Este enlace de recuperación no es válido o ya expiró. Los enlaces tienen una validez de 1 hora.
              </p>
              <Link href="/forgot-password" style={S.linkBtn}>
                Solicitar nuevo enlace →
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Nueva contraseña — GolPlay</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes spin   { to { transform: rotate(360deg) } }
        .rp-input:focus { outline:none; border-color:#16a34a !important; box-shadow:0 0 0 3px rgba(22,163,74,.12) !important; }
        .rp-input { transition: border-color .15s, box-shadow .15s; }
        .rp-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(22,163,74,.35) !important; }
        .rp-btn { transition: all .15s; }
        .eye-btn:hover { color: #374151 !important; }
      `}</style>

      <main style={S.page}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp .45s ease both', position: 'relative', zIndex: 1 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚽</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>GolPlay</span>
          </div>

          <div style={S.card}>

            {done ? (
              /* ── Success ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={32} color="#16a34a" />
                </div>
                <h1 style={{ ...S.title, marginBottom: 12 }}>¡Contraseña actualizada!</h1>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 8 }}>
                  Tu contraseña fue cambiada correctamente.
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>Redirigiendo al inicio de sesión…</p>
              </div>
            ) : (
              /* ── Form ── */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Lock size={18} color="#16a34a" />
                  </div>
                  <div>
                    <h1 style={S.title}>Nueva contraseña</h1>
                    <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Creá una contraseña segura para tu cuenta</p>
                  </div>
                </div>

                {error && (
                  <div style={{ display: 'flex', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
                    <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>

                  {/* Nueva contraseña */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={S.label}>Nueva contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        className="rp-input"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        onBlur={() => setTouched(t => ({ ...t, password: true }))}
                        autoComplete="new-password"
                        style={{ ...S.input, paddingRight: 44, borderColor: passError ? '#ef4444' : '#e2e8f0' }}
                      />
                      <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)} style={S.eyeBtn}
                        aria-label={showPass ? 'Ocultar' : 'Mostrar'}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passError
                      ? <p style={S.fieldError}>{passError}</p>
                      : password.length > 0 && !validatePassword(password) &&
                        <p style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>✓ Contraseña válida</p>
                    }
                  </div>

                  {/* Confirmar contraseña */}
                  <div style={{ marginBottom: 8 }}>
                    <label style={S.label}>Confirmar contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        className="rp-input"
                        placeholder="Repetí la contraseña"
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setError('') }}
                        onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                        autoComplete="new-password"
                        style={{ ...S.input, paddingRight: 44, borderColor: confirmError ? '#ef4444' : '#e2e8f0' }}
                      />
                      <button type="button" className="eye-btn" onClick={() => setShowConfirm(v => !v)} style={S.eyeBtn}
                        aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmError && <p style={S.fieldError}>{confirmError}</p>}
                  </div>

                  {/* Requisitos */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 20, marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requisitos</p>
                    {[
                      { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
                      { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(password) },
                      { label: 'Al menos un número', ok: /[0-9]/.test(password) },
                    ].map(req => (
                      <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: req.ok ? '#16a34a' : '#cbd5e1' }}>{req.ok ? '✓' : '○'}</span>
                        <span style={{ fontSize: 12, color: req.ok ? '#16a34a' : '#94a3b8' }}>{req.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rp-btn"
                    style={{
                      width: '100%', padding: 14, borderRadius: 12, border: 'none',
                      background: canSubmit ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#cbd5e1',
                      color: '#fff', fontWeight: 700, fontSize: 15,
                      fontFamily: 'Outfit, sans-serif',
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      boxShadow: canSubmit ? '0 4px 16px rgba(22,163,74,.25)' : 'none',
                      marginBottom: 16,
                    }}
                  >
                    {loading
                      ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Actualizando…
                        </span>
                      : 'Guardar nueva contraseña'
                    }
                  </button>

                  <Link href="/login" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
                    ← Volver al inicio de sesión
                  </Link>

                </form>
              </>
            )}
          </div>
        </div>

        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      </main>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    background: '#fff',
    borderRadius: 24,
    padding: '36px 32px',
    boxShadow: '0 25px 60px rgba(0,0,0,.35)',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    fontFamily: 'Outfit, sans-serif',
    letterSpacing: '-0.02em',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    fontSize: 14,
    borderRadius: 11,
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    color: '#0f172a',
    outline: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    padding: 2,
  },
  fieldError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  linkBtn: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 14,
    textDecoration: 'none',
    fontFamily: 'Outfit, sans-serif',
  },
}
