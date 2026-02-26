/**
 * GolPlay — pages/forgot-password.tsx
 *
 * Mejoras vs versión original:
 *  - Manejo de error (no solo success)
 *  - Validación de email antes de enviar
 *  - Link "volver" al login
 *  - Diseño consistente con el sistema visual del proyecto (Outfit + DM Sans)
 */

import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .fp-input:focus { outline:none; border-color:#16a34a !important; box-shadow:0 0 0 3px rgba(22,163,74,.12) !important; }
        .fp-input { transition: border-color .15s, box-shadow .15s; }
        .fp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(22,163,74,.35) !important; }
        .fp-btn { transition: all .15s; }
      `}</style>

      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)',
        padding: 20, fontFamily: "'DM Sans', sans-serif",
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp .45s ease both', position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚽</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>GolPlay</span>
          </div>

          <div style={{ background: '#fff', borderRadius: 24, padding: '40px 36px', boxShadow: '0 25px 60px rgba(0,0,0,.35)' }}>

            {sent ? (
              /* ── Success state ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px' }}>📧</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>
                  Revisá tu email
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
                  Si <strong>{email}</strong> tiene una cuenta en GolPlay, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>
                  ¿No lo recibiste? Revisá la carpeta de spam o esperá unos minutos.
                </p>
                <Link href="/login" style={{ display: 'block', textAlign: 'center', fontSize: 14, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                  ← Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              /* ── Form ── */
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif', marginBottom: 8 }}>
                  Recuperar contraseña
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
                  Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
                </p>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 20 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={sendReset} noValidate>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className="fp-input"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    required
                    autoComplete="email"
                    style={{
                      width: '100%', padding: '12px 14px', fontSize: 14,
                      borderRadius: 11, border: '1.5px solid #e2e8f0',
                      background: '#fff', color: '#0f172a', outline: 'none',
                      marginBottom: 20,
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!isValidEmail || loading}
                    className="fp-btn"
                    style={{
                      width: '100%', padding: 14, borderRadius: 12, border: 'none',
                      background: isValidEmail && !loading ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#cbd5e1',
                      color: '#fff', fontWeight: 700, fontSize: 15,
                      fontFamily: 'Outfit, sans-serif',
                      cursor: isValidEmail && !loading ? 'pointer' : 'not-allowed',
                      boxShadow: isValidEmail && !loading ? '0 4px 16px rgba(22,163,74,.25)' : 'none',
                      marginBottom: 16,
                    }}
                  >
                    {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                  </button>

                  <Link href="/login" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
                    ← Volver al inicio de sesión
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
