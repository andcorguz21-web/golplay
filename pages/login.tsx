import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error) {
        await supabase.auth.getSession(); // 👈 CLAVE
        router.push('/admin');
      }      

    if (error) {
      setError('Credenciales incorrectas');
      setLoading(false);
      return;
    }

    // ✅ Esperar a que Supabase setee la sesión
    setTimeout(() => {
      router.replace('/admin');
    }, 300);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Login Admin</h1>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br />

        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </main>
  );
}
