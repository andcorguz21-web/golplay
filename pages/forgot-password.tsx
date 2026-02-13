import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const router = useRouter()

  const sendReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://golplay.app/reset-password',
    })

    if (!error) setSent(true)
    else alert(error.message)
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Recuperar contraseña</h1>

      {sent ? (
        <p>Revisa tu correo para restablecer tu contraseña.</p>
      ) : (
        <>
          <input
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 12, marginTop: 10 }}
          />

          <button
            onClick={sendReset}
            style={{ display: 'block', marginTop: 10 }}
          >
            Enviar enlace
          </button>
        </>
      )}

      <p
        style={{ marginTop: 20, cursor: 'pointer' }}
        onClick={() => router.push('/login')}
      >
        Volver
      </p>
    </main>
  )
}
