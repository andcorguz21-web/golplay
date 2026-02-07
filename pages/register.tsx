import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1️⃣ Crear usuario en Auth
    const { data, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (signUpError || !data.user) {
      setError('No se pudo crear el usuario');
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // 2️⃣ Actualizar profile (el trigger ya lo creó)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
      })
      .eq('id', userId);

    if (profileError) {
      setError('Usuario creado, pero no se pudo guardar el perfil');
      setLoading(false);
      return;
    }

    // 3️⃣ Redirect
    router.replace('/');
  };

  return (
    <main style={container}>
      <div style={card}>
        <h1 style={title}>Crear cuenta</h1>
        <p style={subtitle}>
          Administra tu complejo en un solo lugar
        </p>

        <form onSubmit={handleRegister} style={{ marginTop: 24 }}>
          <Input
            label="Nombre"
            value={firstName}
            onChange={setFirstName}
          />

          <Input
            label="Apellido"
            value={lastName}
            onChange={setLastName}
          />

          <Input
            label="Teléfono"
            value={phone}
            onChange={setPhone}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
          />

          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
          />

          {error && <div style={errorBox}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...button,
              background: loading ? '#9ca3af' : '#16a34a',
            }}
          >
            {loading ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>
      </div>
    </main>
  );
}

/* ===================== */
/* UI HELPERS */

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: any) {
  return (
    <div style={field}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={label !== 'Teléfono (opcional)'}
        style={input}
      />
    </div>
  );
}

/* ===================== */
/* STYLES */

const container = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f7f7f7',
  padding: 24,
};

const card = {
  width: '100%',
  maxWidth: 440,
  background: 'white',
  borderRadius: 24,
  padding: 32,
  boxShadow: '0 15px 35px rgba(0,0,0,0.12)',
};

const title = {
  fontSize: 26,
  fontWeight: 600,
};

const subtitle = {
  fontSize: 14,
  color: '#6b7280',
  marginTop: 4,
};

const field = { marginBottom: 14 };

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 6,
};

const input = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  fontSize: 14,
};

const button = {
  width: '100%',
  marginTop: 16,
  padding: '14px 16px',
  borderRadius: 14,
  border: 'none',
  color: 'white',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
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
