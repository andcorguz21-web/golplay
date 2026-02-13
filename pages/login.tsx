import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

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
      // 1️⃣ Login Auth
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError || !data.user) {
        setError('Credenciales incorrectas');
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
        setError('No se pudo cargar el perfil');
        return;
      }

      // 3️⃣ Redirección por rol
      if (profile.role === 'admin' || profile.role === 'owner') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }

    } catch (err) {
      console.error(err);
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={container}>
      <div style={card}>
        <h1 style={title}>Acceso a tu negocio</h1>
        <p style={subtitle}>Ingresá para administrar tus canchas</p>

        <form onSubmit={handleLogin} style={{ marginTop: 24 }}>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={input}
            />
          </Field>

          <Field label="Contraseña">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={input}
            />
          </Field>

          {error && <div style={errorBox}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...button,
              backgroundColor: loading ? '#9ca3af' : '#16a34a',
            }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>

          {/* 🔐 RECUPERAR CONTRASEÑA */}
          <p
            style={{
              marginTop: 12,
              cursor: 'pointer',
              color: '#16a34a',
              textAlign: 'center',
              fontSize: 13,
            }}
            onClick={() => router.push('/forgot-password')}
          >
            ¿Olvidaste tu contraseña?
          </p>

          <p style={registerLink}>
            ¿No tenés cuenta?{' '}
            <span onClick={() => router.push('/register')}>
              Crear cuenta
            </span>
          </p>
        </form>
      </div>
    </main>
  );
}

/* ===================== */
/* UI HELPERS */
const Field = ({ label, children }: any) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

/* ===================== */
/* STYLES */
const container = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f9fafb',
  padding: 24,
};

const card = {
  width: '100%',
  maxWidth: 420,
  background: 'white',
  borderRadius: 24,
  padding: 36,
  boxShadow: '0 15px 35px rgba(0,0,0,0.12)',
};

const title = { fontSize: 26, fontWeight: 600 };
const subtitle = { fontSize: 14, color: '#6b7280' };

const labelStyle = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 6,
  display: 'block',
};

const input = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
};

const button = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  border: 'none',
  color: 'white',
  fontSize: 15,
  fontWeight: 500,
  marginTop: 12,
};

const errorBox = {
  background: '#fee2e2',
  border: '1px solid #fecaca',
  color: '#7f1d1d',
  padding: 10,
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 12,
};

const registerLink = {
  marginTop: 18,
  fontSize: 13,
  color: '#6b7280',
  textAlign: 'center' as const,
  cursor: 'pointer',
};
