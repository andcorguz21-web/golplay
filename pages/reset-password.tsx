import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (!error) {
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Nueva contraseña</h1>

        {done ? (
          <p style={styles.success}>Contraseña actualizada correctamente</p>
        ) : (
          <form onSubmit={updatePassword}>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Actualizando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #0f172a, #16a34a)',
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
  },
  success: {
    color: '#16a34a',
    fontWeight: 600,
  },
}
