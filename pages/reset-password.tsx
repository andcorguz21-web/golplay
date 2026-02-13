import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const router = useRouter()

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) return alert(error.message)

    alert('Contraseña actualizada')
    router.push('/login')
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Nueva contraseña</h1>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: 12, marginTop: 10 }}
      />

      <button
        onClick={updatePassword}
        style={{ display: 'block', marginTop: 10 }}
      >
        Guardar
      </button>
    </main>
  )
}
