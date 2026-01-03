import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ===================== */
  /* LOGIN */
  /* ===================== */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1️⃣ Login
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError || !data.user) {
        setError('Credenciales incorrectas');
        setLoading(false);
        return;
      }

      // 2️⃣ Obtener perfil
      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

      if (profileError || !profile) {
        setError('No se pudo cargar el perfil del usuario');
        setLoading(false);
        return;
      }

      // 3️⃣ Redirección según rol
      if (profile.role === 'admin' || profile.role === 'owner') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }

    } catch (err) {
      console.error(err);
      setError('Error inesperado, intentá nuevamente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={container}>
      <div style={card}>
        <h1 style={title}>Acceso a tu negocio</h1>
        <p style={subtitle}>
          Iniciá sesión para administrar tus canchas
        </p>

        <form onSubmit={handleLogin} style={{ marginTop: 24 }}>
          {/* EMAIL */}
          <div style={field}>
            <label style={label}>Email</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={input}
            />
          </div>

          {/* PASSWORD */}
          <div style={field}>
            <label style={label}>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={input}
            />
          </div>

          {/* ERROR */}
          {error && <div style={errorBox}>{error}</div>}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...button,
              backgroundColor: loading ? '#9ca3af' : '#16a34a',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}

/* ===================== */
/* STYLES */
/* ===================== */

const container: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f7f7f7',
  padding: 24,
};

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: 'white',
  borderRadius: 24,
  padding: 32,
  boxShadow: '0 15px 35px rgba(0,0,0,0.12)',
};

const title: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 600,
  marginBottom: 6,
};

const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: '#6b7280',
};

const field: React.CSSProperties = {
  marginBottom: 16,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  fontSize: 14,
};

const button: React.CSSProperties = {
  width: '100%',
  marginTop: 16,
  padding: '14px 16px',
  borderRadius: 14,
  border: 'none',
  color: 'white',
  fontSize: 15,
  fontWeight: 500,
};

const errorBox: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #fecaca',
  color: '#7f1d1d',
  padding: 10,
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 12,
};
