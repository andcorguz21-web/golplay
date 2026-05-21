import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { GOLPLAY_BASE_CSS } from "@/lib/styles/golplay";

type Player = { id: string; name: string; slug: string; photo_url: string | null };
type Status = "loading" | "no_player" | "no_photo" | "ready" | "submitting";

const CSS = `${GOLPLAY_BASE_CSS}
.page { min-height: 100vh; background: var(--bone); padding-top: 62px; }
.wrap { max-width: 560px; margin: 0 auto; padding: 48px clamp(16px,4vw,32px) 64px; animation: fadeUp .5s ease both; }
.back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--muted); text-decoration: none;
  margin-bottom: 20px; font-weight: 500; padding: 5px 10px; border-radius: 8px;
  transition: all .15s;
}
.back:hover { color: var(--ink); background: rgba(0,0,0,.04); }
.heading {
  font-family: var(--font-d); font-size: clamp(32px,7vw,48px);
  font-weight: 800; line-height: .95; letter-spacing: -.02em;
  color: var(--ink); margin: 0 0 10px;
}
.heading em { font-style: italic; color: var(--g6); }
.subheading { color: var(--muted); font-size: 14px; line-height: 1.6; margin: 0 0 32px; max-width: 440px; }
.card { background: var(--white); border: 1.5px solid var(--bd); border-radius: var(--r-xl); padding: 28px; box-shadow: var(--sh-xs); }
.field { margin-bottom: 22px; }
.label {
  display: block; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 8px;
}
.input, .textarea {
  width: 100%; padding: 13px 14px; border: 1.5px solid var(--bd);
  background: var(--white); font-family: var(--font-u); font-size: 15px;
  border-radius: var(--r-md); outline: none; color: var(--ink);
  transition: border .15s, box-shadow .15s;
}
.input:focus, .textarea:focus { border-color: var(--g6); box-shadow: 0 0 0 4px rgba(22,163,74,.08); }
.textarea { resize: vertical; min-height: 90px; font-family: var(--font-u); }
.char-count { font-size: 10px; color: var(--faint); text-align: right; margin-top: 4px; letter-spacing: .04em; }
.file-row { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
.file-button {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 18px; border: 1.5px dashed var(--bd); background: var(--bone);
  font-family: inherit; font-size: 13px; color: var(--ink); font-weight: 600;
  cursor: pointer; border-radius: var(--r-md); transition: all .15s ease;
}
.file-button:hover { border-color: var(--g6); background: var(--g0); color: var(--g7); }
.logo-preview { width: 80px; height: 80px; border-radius: 14px; object-fit: cover; border: 1.5px solid var(--bd); }
.helper { font-size: 12px; color: var(--muted); margin-top: 8px; line-height: 1.5; }
.submit {
  width: 100%; padding: 15px; margin-top: 8px;
  background: linear-gradient(135deg, var(--g5), var(--g6));
  color: #fff; border: none; cursor: pointer;
  font-family: var(--font-d); font-size: 15px; font-weight: 800;
  border-radius: var(--r-md);
  display: flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 4px 22px rgba(34,197,94,.3); transition: all .15s ease; letter-spacing: -.01em;
}
.submit:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(34,197,94,.42); }
.submit:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.error {
  padding: 12px 14px; background: #fef2f2; border: 1px solid #fecaca;
  color: #b91c1c; border-radius: var(--r-md); font-size: 13px; margin-bottom: 16px; font-weight: 500;
}
.warn-card {
  background: var(--white); border: 1.5px solid var(--bd); border-radius: var(--r-xl);
  padding: 36px 28px; text-align: center; margin: 12px 0;
}
.warn-emoji { font-size: 44px; margin-bottom: 14px; display: block; }
.warn-title {
  font-family: var(--font-d); font-size: 24px; font-weight: 800;
  color: var(--ink); margin: 0 0 10px; letter-spacing: -.02em;
}
.warn-text { color: var(--muted); margin: 0 0 22px; font-size: 14px; line-height: 1.6; }
.warn-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 12px 22px; background: var(--g6); color: #fff;
  border-radius: var(--r-md); font-weight: 700; font-size: 13px; text-decoration: none;
  box-shadow: 0 2px 10px rgba(22,163,74,.28);
}
.warn-cta:hover { background: var(--g7); }
.loading-text { text-align: center; padding: 80px; color: var(--muted); }
`;

export default function CrearEquipo() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [, setPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/players/me", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) { setStatus("no_player"); return; }
        const data = await res.json();
        const p: Player | null = data.player ?? null;
        if (!p) { setStatus("no_player"); return; }
        setPlayer(p);
        setStatus(p.photo_url ? "ready" : "no_photo");
      } catch { if (!cancelled) setStatus("no_player"); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Logo demasiado pesado (máx 5MB)"); return; }
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) {
      setError("Formato no soportado (PNG/JPG/WebP)"); return;
    }
    setError(null); setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 3) { setError("Mínimo 3 caracteres"); return; }
    setStatus("submitting");
    try {
      const createRes = await fetch("/api/teams/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: trimmedName, description: description.trim() || null }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) { setError(createData.error ?? "Error"); setStatus("ready"); return; }
      const team = createData.team;
      if (logoFile) {
        const fd = new FormData();
        fd.append("team_id", team.id); fd.append("file", logoFile);
        await fetch("/api/teams/upload-logo", { method: "POST", credentials: "include", body: fd });
      }
      router.push("/equipos/" + team.slug);
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado"); setStatus("ready");
    }
  }

  return (
    <>
      <Head><title>Crear equipo · GolPlay</title></Head>
      <style>{CSS}</style>
      <Navbar dark={false} />
      <div className="page">
        <div className="wrap">
          <Link href="/equipos/mis-equipos" className="back">← Mis equipos</Link>

          {status === "loading" && <div className="loading-text">Cargando…</div>}

          {status === "no_player" && (
            <div className="warn-card">
              <span className="warn-emoji">⚽</span>
              <h2 className="warn-title">Primero, tu perfil</h2>
              <p className="warn-text">Para crear un equipo necesitás tu perfil de jugador. Es rápido.</p>
              <Link href="/jugadores/crear" className="warn-cta">Crear perfil →</Link>
            </div>
          )}

          {status === "no_photo" && (
            <div className="warn-card">
              <span className="warn-emoji">📷</span>
              <h2 className="warn-title">Subí tu foto</h2>
              <p className="warn-text">El capitán necesita foto de perfil antes de crear un equipo.</p>
              <Link href="/jugadores/mi-perfil" className="warn-cta">Ir a mi perfil →</Link>
            </div>
          )}

          {(status === "ready" || status === "submitting") && (
            <>
              <p className="eyebrow">Nuevo equipo</p>
              <h1 className="heading">Armá tu <em>plantilla.</em></h1>
              <p className="subheading">Vas a ser el capitán. Después podés invitar jugadores con tu link o agregarlos por cédula.</p>
              {error && <div className="error">{error}</div>}
              <div className="card">
                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label className="label" htmlFor="name">Nombre del equipo</label>
                    <input id="name" type="text" className="input" value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Los Cibeles FC" maxLength={50} required autoFocus />
                    <div className="char-count">{name.length} / 50</div>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="desc">Descripción (opcional)</label>
                    <textarea id="desc" className="textarea" value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Jugamos los martes en Cibeles, fut7"
                      maxLength={300} rows={3} />
                    <div className="char-count">{description.length} / 300</div>
                  </div>
                  <div className="field">
                    <label className="label">Logo del equipo</label>
                    <input type="file" ref={fileInputRef} onChange={handleLogoChange}
                      accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} />
                    <div className="file-row">
                      <button type="button" className="file-button"
                        onClick={() => fileInputRef.current?.click()}>
                        {logoFile ? "Cambiar logo" : "Subir logo"}
                      </button>
                      {logoPreview && <img src={logoPreview} alt="Preview" className="logo-preview" />}
                    </div>
                    <p className="helper">PNG, JPG o WebP · máx 5MB · podés agregarlo después</p>
                  </div>
                  <button type="submit" className="submit" disabled={status === "submitting"}>
                    {status === "submitting" ? "Creando…" : "Crear equipo"}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}