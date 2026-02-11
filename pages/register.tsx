import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /* ===================== */
  /* REGISTER */
  /* ===================== */

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1️⃣ Crear usuario en Supabase Auth
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (signUpError || !data.user) {
        setError(signUpError?.message || 'Error creando la cuenta');
        setLoading(false);
        return;
      }

      // 2️⃣ Crear profile como OWNER
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          role: 'owner',
          first_name: firstName,
          last_name: lastName,
          phone,
        });

      if (profileError) {
        setError('La cuenta se creó pero falló el perfil');
        setLoading(false);
        return;
      }

      // 3️⃣ Aviso de confirmación
      setSuccess(true);

    } catch (err) {
      console.error(err);
      setError('Error inesperado, intentá nuevamente');
    } finally {
      setLoading(false);
    }
  };

  /* ===================== */
  /* UI */
  /* ===================== */

  return (
    <main style={container}>
      <div style={card}>
        <h1 style={title}>Crear cuenta</h1>
        <p style={subtitle}>
          Registrá tu cancha y comenzá a recibir reservas
        </p>

        {success ? (
          <div style={successBox}>
            📩 Te enviamos un correo para confirmar tu cuenta.  
            <br />
            Después de confirmar, podrás ingresar al panel de administración.
          </div>
        ) : (
          <form onSubmit={handleRegister} style={{ marginTop: 24 }}>
            <Field label="Nombre">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={input}
              />
            </Field>

            <Field label="Apellido">
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={input}
              />
            </Field>

            <Field label="Teléfono">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={input}
              />
            </Field>

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
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>

            <p style={loginLink}>
              ¿Ya tenés cuenta?{' '}
              <span onClick={() => router.push('/login')}>
                Iniciá sesión
              </span>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

/* ===================== */
/* UI HELPERS */
/* ===================== */

const Field = ({ label, children }: any) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

/* ===================== */
/* STYLES */
/* ===================== */

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
  maxWidth: 460,
  background: 'white',
  borderRadius: 26,
  padding: 40,
  boxShadow: '0 20px 45px rgba(0,0,0,0.12)',
};

const title = {
  fontSize: 28,
  fontWeight: 600,
};

const subtitle = {
  fontSize: 14,
  color: '#6b7280',
  marginBottom: 16,
};

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

const successBox = {
  background: '#dcfce7',
  border: '1px solid #86efac',
  color: '#166534',
  padding: 16,
  borderRadius: 14,
  fontSize: 14,
};

const loginLink = {
  marginTop: 18,
  fontSize: 13,
  color: '#6b7280',
  textAlign: 'center' as const,
  cursor: 'pointer',
};
