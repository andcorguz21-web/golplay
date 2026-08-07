// pages/jugadores/crear.tsx
import { useState, ChangeEvent } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";

const POSITIONS = [
  { v: "", l: "Sin especificar" },
  { v: "portero", l: "Portero" },
  { v: "defensa", l: "Defensa" },
  { v: "medio", l: "Medio" },
  { v: "delantero", l: "Delantero" },
];

type BgState = "idle" | "downloading" | "processing" | "preview";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function CrearJugador() {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [alias, setAlias] = useState("");
  const [position, setPosition] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  // Foto: original subida y final (puede ser igual o sin fondo)
  const [photoOriginal, setPhotoOriginal] = useState<string | null>(null);
  const [photoOriginalMime, setPhotoOriginalMime] = useState<string | null>(null);
  const [photoFinal, setPhotoFinal] = useState<string | null>(null);
  const [photoFinalMime, setPhotoFinalMime] = useState<string | null>(null);

  // BG removal state
  const [bgState, setBgState] = useState<BgState>("idle");
  const [bgProgress, setBgProgress] = useState(0);
  const [bgRemovedDataUrl, setBgRemovedDataUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formato no soportado. Usá JPG, PNG o WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("La foto excede 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoOriginal(result);
      setPhotoOriginalMime(file.type);
      setPhotoFinal(result);
      setPhotoFinalMime(file.type);
      setBgRemovedDataUrl(null);
      setBgState("idle");
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveBg() {
    if (!photoOriginal) return;
    setError(null);
    setBgState("downloading");
    setBgProgress(0);

    try {
      const { removeBackground } = await import("@imgly/background-removal");

      const blob = await removeBackground(photoOriginal, {
        progress: (key, current, total) => {
          const isDownload = /model|wasm|onnx|data/i.test(key);
          setBgState(isDownload ? "downloading" : "processing");
          if (total > 0) setBgProgress(Math.round((current / total) * 100));
        },
        output: {
          format: "image/png",
          quality: 0.9,
        },
      });

      const dataUrl = await blobToDataUrl(blob);
      setBgRemovedDataUrl(dataUrl);
      setBgState("preview");
      setBgProgress(100);
    } catch (e: any) {
      console.error(e);
      setError("Error procesando la foto. Probá con otra o mantené la original.");
      setBgState("idle");
    }
  }

  function useRemovedBg() {
    if (!bgRemovedDataUrl) return;
    setPhotoFinal(bgRemovedDataUrl);
    setPhotoFinalMime("image/png");
    setBgState("idle");
  }

  function keepOriginal() {
    if (!photoOriginal) return;
    setPhotoFinal(photoOriginal);
    setPhotoFinalMime(photoOriginalMime);
    setBgRemovedDataUrl(null);
    setBgState("idle");
  }

  async function onSubmit() {
    setError(null);
    if (!/^\d{9}$/.test(cedula)) { setError("Cédula debe ser 9 dígitos"); return; }
    if (displayName.trim().length < 2) { setError("Nombre muy corto"); return; }
    if (!/^\d{4}$/.test(pin)) { setError("PIN debe ser 4 dígitos"); return; }
    if (pin !== pinConfirm) { setError("Los PIN no coinciden"); return; }
    if (!photoFinal || !photoFinalMime) { setError("Subí una foto"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/players/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula, displayName, alias, position: position || null, pin,
          photoBase64: photoFinal, photoMimeType: photoFinalMime,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Error creando perfil"); return; }
      router.push(`/jugadores/${j.player.slug}`);
    } catch (e: any) {
      setError(e.message || "Error de red");
    } finally { setLoading(false); }
  }

  const photoBoxContent = photoFinal
    ? <img src={photoFinal} alt="" className="jc-photo-img" />
    : <div className="jc-photo-hint"><span>Tocá para subir foto</span><small>JPG / PNG / WebP · máx 3MB</small></div>;

  const buttonStyle = loading ? "jc-btn jc-btn--off" : "jc-btn";

  return (
    <>
      <Head><title>Crear perfil — GolPlay</title></Head>
      <style>{CSS}</style>

      <Navbar dark={true} />

      <div className="jc">
        <div className="jc-content">
          <h1 className="jc-title">Creá tu perfil</h1>
          <p className="jc-subtitle">Cédula, foto y PIN. Sin contraseñas. El PIN te sirve para recuperar tu perfil si cambiás de celular.</p>

          {/* ========== FOTO ========== */}
          <label className="jc-photo-label">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChange} style={{display:'none'}}/>
            <div className="jc-photo-box">{photoBoxContent}</div>
          </label>

          {/* Botón quitar fondo (solo si hay foto y estamos idle) */}
          {photoOriginal && bgState === "idle" && (
            <button type="button" className="jc-bg-btn" onClick={handleRemoveBg}>
              ✨ {bgRemovedDataUrl ? "Volver a probar quitar fondo" : "Quitar fondo automáticamente (opcional)"}
            </button>
          )}

          {/* Loading state */}
          {(bgState === "downloading" || bgState === "processing") && (
            <div className="jc-bg-loading">
              <div className="jc-bg-bar"><div className="jc-bg-bar-fill" style={{width: `${bgProgress}%`}}/></div>
              <p className="jc-bg-loading-text">
                {bgState === "downloading"
                  ? <>Descargando modelo IA <small>(primera vez, ~80MB · después es instantáneo)</small></>
                  : <>Procesando foto</>
                } · <b>{bgProgress}%</b>
              </p>
            </div>
          )}

          {/* Preview comparativo */}
          {bgState === "preview" && bgRemovedDataUrl && photoOriginal && (
            <div className="jc-bg-preview">
              <div className="jc-bg-compare">
                <div className="jc-bg-side">
                  <div className="jc-bg-img-wrap"><img src={photoOriginal} alt="" className="jc-bg-img"/></div>
                  <span className="jc-bg-side-lbl">Original</span>
                </div>
                <div className="jc-bg-side">
                  <div className="jc-bg-img-wrap jc-bg-img-wrap--transparent"><img src={bgRemovedDataUrl} alt="" className="jc-bg-img"/></div>
                  <span className="jc-bg-side-lbl">Sin fondo</span>
                </div>
              </div>
              <div className="jc-bg-actions">
                <button type="button" className="jc-bg-action jc-bg-action--ghost" onClick={keepOriginal}>Mantener original</button>
                <button type="button" className="jc-bg-action jc-bg-action--green" onClick={useRemovedBg}>Usar sin fondo ✓</button>
              </div>
            </div>
          )}

          {/* ========== RESTO DEL FORM ========== */}
          <label className="jc-label">Cédula (9 dígitos)</label>
          <input className="jc-input" value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" placeholder="123456789"/>

          <label className="jc-label">Nombre completo</label>
          <input className="jc-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Andrés Cordero"/>

          <label className="jc-label">Alias (opcional)</label>
          <input className="jc-input" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="El Toro"/>
          <div className="jc-hint">Si lo dejás vacío usamos tu nombre.</div>

          <label className="jc-label">Posición (opcional)</label>
          <select className="jc-input" value={position} onChange={(e) => setPosition(e.target.value)}>
            {POSITIONS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>

          <label className="jc-label">PIN (4 dígitos)</label>
          <input className="jc-input" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••"/>
          <div className="jc-hint">Memorizalo. Sin PIN no podés recuperar tu perfil.</div>

          <label className="jc-label">Confirmar PIN</label>
          <input className="jc-input" type="password" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••"/>

          {error && <div className="jc-error">{error}</div>}

          <button className={buttonStyle} onClick={onSubmit} disabled={loading}>
            {loading ? "Creando..." : "Crear perfil"}
          </button>

          <div className="jc-foot">
            ¿Ya tenés perfil? <Link href="/recuperar" className="jc-link">Recuperar con cédula + PIN</Link>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
*,*::before,*::after{box-sizing:border-box}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}

.jc{min-height:100vh;padding-top:62px;background:#121628;font-family:var(--font-u),system-ui,sans-serif;color:#e7ebf3;-webkit-font-smoothing:antialiased}
.jc-content{max-width:460px;margin:0 auto;padding:28px 20px 80px;animation:fadeUp .35s ease both}
.jc-title{font-family:var(--font-d),sans-serif;font-size:40px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.05;margin-bottom:8px}
.jc-subtitle{font-size:14px;color:#9ca3af;line-height:1.5;margin-bottom:28px}

/* ========== FOTO ========== */
.jc-photo-label{display:block;cursor:pointer;margin-bottom:14px}
.jc-photo-box{width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;margin:0 auto;overflow:hidden;transition:all .15s;
  background-image:linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%);
  background-size:14px 14px;background-position:0 0,0 7px,7px -7px,-7px 0px}
.jc-photo-label:hover .jc-photo-box{border-color:var(--g4);background-color:rgba(58,91,240,.04)}
.jc-photo-img{width:100%;height:100%;object-fit:cover}
.jc-photo-hint{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;color:#6b7385;padding:0 16px;background:#121628;width:100%;height:100%;display:flex;justify-content:center}
.jc-photo-hint span{font-family:var(--font-d),sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.jc-photo-hint small{font-size:10px;color:#525a68;letter-spacing:.04em}

/* ========== BG REMOVAL ========== */
.jc-bg-btn{display:block;margin:0 auto 14px;padding:10px 18px;border-radius:999px;background:rgba(58,91,240,.08);border:1px solid rgba(58,91,240,.25);color:var(--g4);font-family:var(--font-d),sans-serif;font-size:12px;font-weight:600;letter-spacing:.04em;cursor:pointer;transition:all .15s}
.jc-bg-btn:hover{background:rgba(58,91,240,.15);border-color:rgba(58,91,240,.5)}

.jc-bg-loading{margin:14px 0 8px;padding:14px;border-radius:12px;background:rgba(58,91,240,.06);border:1px solid rgba(58,91,240,.2)}
.jc-bg-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:8px}
.jc-bg-bar-fill{height:100%;background:linear-gradient(90deg,var(--g6),var(--g4));transition:width .3s ease;border-radius:99px}
.jc-bg-loading-text{font-size:12px;color:#9ca3af;line-height:1.5;animation:pulse 1.8s ease-in-out infinite}
.jc-bg-loading-text small{display:block;color:#525a68;font-size:10px;margin-top:2px}
.jc-bg-loading-text b{color:var(--g4);font-weight:700}

.jc-bg-preview{margin:14px 0 8px;padding:14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}
.jc-bg-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.jc-bg-side{display:flex;flex-direction:column;align-items:center;gap:6px}
.jc-bg-img-wrap{width:100%;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#121628}
.jc-bg-img-wrap--transparent{background-image:linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0px;background-color:#121628}
.jc-bg-img{width:100%;height:100%;object-fit:cover}
.jc-bg-side-lbl{font-family:var(--font-d),sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7385}
.jc-bg-actions{display:flex;gap:8px}
.jc-bg-action{flex:1;padding:10px;border-radius:10px;font-family:var(--font-d),sans-serif;font-size:12px;font-weight:700;letter-spacing:.04em;cursor:pointer;border:none;transition:all .15s}
.jc-bg-action--ghost{background:rgba(255,255,255,.06);color:#e7ebf3;border:1px solid rgba(255,255,255,.1)}
.jc-bg-action--ghost:hover{background:rgba(255,255,255,.1)}
.jc-bg-action--green{background:var(--g6);color:#fff;box-shadow:0 3px 14px rgba(58,91,240,.3)}
.jc-bg-action--green:hover{background:var(--g7)}

/* ========== FORM ========== */
.jc-label{display:block;font-family:var(--font-d),sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b7385;margin:18px 0 6px}
.jc-input{width:100%;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:15px;font-family:inherit;outline:none;transition:border-color .15s}
.jc-input::placeholder{color:rgba(255,255,255,.3)}
.jc-input:focus{border-color:var(--g4)}
.jc-input:-webkit-autofill,.jc-input:-webkit-autofill:hover,.jc-input:-webkit-autofill:focus{-webkit-text-fill-color:#fff;-webkit-box-shadow:0 0 0 1000px #141a33 inset;caret-color:#fff}
.jc-hint{font-size:11px;color:#525a68;margin-top:5px;letter-spacing:.02em}
.jc-error{margin-top:18px;padding:11px 14px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);border-radius:10px;color:#fca5a5;font-size:13px}
.jc-btn{width:100%;margin-top:28px;padding:15px;border-radius:12px;background:var(--g6);color:#fff;border:none;font-family:var(--font-d),sans-serif;font-size:14px;font-weight:700;letter-spacing:.04em;cursor:pointer;box-shadow:0 3px 16px rgba(58,91,240,.35);transition:all .15s}
.jc-btn:hover{background:var(--g7)}
.jc-btn--off{background:#3a4158;cursor:not-allowed;box-shadow:none}
.jc-foot{margin-top:20px;text-align:center;font-size:13px;color:#6b7385}
.jc-link{color:var(--g4);text-decoration:underline}
@media(max-width:480px){.jc-title{font-size:34px}.jc-photo-box{width:140px;height:140px}}
`