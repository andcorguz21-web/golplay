import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (!error) setSent(true)
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Recuperar contraseña</h1>

        {sent ? (
          <p style={styles.success}>
            Te enviamos un enlace para restablecer tu contraseña.
          </p>
        ) : (
          <form onSubmit={sendReset}>
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

const styles: any = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #16a34a, #0f172a)',
    padding: 20,
  },
  card: {
    background: 'white',
    padding: 40,
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 25px 60px rgba(0,0,0,.25)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    background: '#16a34a',
    color: 'white',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
  },
  success: {
    color: '#16a34a',
    fontWeight: 500,
  },
}
