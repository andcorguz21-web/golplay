// pages/recuperar.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

export default function Recuperar() {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!/^\d{9}$/.test(cedula)) { setError("Cédula debe ser 9 dígitos"); return; }
    if (!/^\d{4}$/.test(pin)) { setError("PIN debe ser 4 dígitos"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/players/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula, pin }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "No se pudo recuperar"); return; }
      router.push("/jugadores/mi-perfil");
    } catch (e: any) {
      setError(e.message || "Error de red");
    } finally { setLoading(false); }
  }

  return (
    <>
      <Head><title>Recuperar perfil — GolPlay</title></Head>
      <style>{CSS}</style>
      <div className="rc">
        <header className="rc-header">
          <button className="rc-back" onClick={() => router.back()} aria-label="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Link href="/"><Image src="/logo-golplay.svg" alt="GolPlay" width={110} height={80} style={{objectFit:'contain'}}/></Link>
          <div style={{width:40}}/>
        </header>

        <div className="rc-content">
          <h1 className="rc-title">Recuperar perfil</h1>
          <p className="rc-subtitle">Ingresá tu cédula y el PIN que pusiste cuando creaste tu perfil.</p>

          <label className="rc-label">Cédula</label>
          <input className="rc-input" value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" placeholder="123456789"/>

          <label className="rc-label">PIN</label>
          <input className="rc-input" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••"/>

          {error && <div className="rc-error">{error}</div>}

          <button className={`rc-btn${loading?' rc-btn--off':''}`} onClick={onSubmit} disabled={loading}>
            {loading ? "Recuperando..." : "Recuperar"}
          </button>

          <div className="rc-foot">¿Sin perfil? <Link href="/jugadores/crear" className="rc-link">Crear uno</Link></div>
        </div>
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.rc{min-height:100vh;background:#0C0D0B;font-family:'DM Sans',system-ui,sans-serif;color:#e2e8e0;-webkit-font-smoothing:antialiased}
.rc-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
.rc-back{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8e0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.rc-content{max-width:420px;margin:0 auto;padding:60px 20px 80px;animation:fadeUp .35s ease both}
.rc-title{font-family:'Instrument Serif',Georgia,serif;font-size:40px;color:#fff;font-weight:400;line-height:1.05;letter-spacing:-.01em;margin-bottom:8px}
.rc-subtitle{font-size:14px;color:#9ca3af;line-height:1.5;margin-bottom:32px}
.rc-label{display:block;font-family:'Kanit',sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b7569;margin:20px 0 6px}
.rc-input{width:100%;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:15px;font-family:inherit;outline:none;transition:border-color .15s}
.rc-input:focus{border-color:#4ade80}
.rc-error{margin-top:18px;padding:11px 14px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);border-radius:10px;color:#fca5a5;font-size:13px}
.rc-btn{width:100%;margin-top:28px;padding:15px;border-radius:12px;background:#16a34a;color:#fff;border:none;font-family:'Kanit',sans-serif;font-size:14px;font-weight:700;letter-spacing:.04em;cursor:pointer;box-shadow:0 3px 16px rgba(22,163,74,.35);transition:all .15s}
.rc-btn:hover{background:#15803d}
.rc-btn--off{background:#3a4138;cursor:not-allowed;box-shadow:none}
.rc-foot{margin-top:20px;text-align:center;font-size:13px;color:#6b7569}
.rc-link{color:#4ade80;text-decoration:underline}
@media(max-width:480px){.rc-title{font-size:34px}.rc-content{padding:40px 20px 80px}}
`