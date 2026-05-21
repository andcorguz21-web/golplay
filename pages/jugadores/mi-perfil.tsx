// pages/jugadores/mi-perfil.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

type Player = {
  id: string; display_name: string; alias: string | null; position: string | null;
  photo_url: string | null; slug: string; rating: number; current_streak: number;
  matches_played: number; wins: number; losses: number; draws: number;
};

export default function MiPerfilJugador() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/players/me")
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(j => { setPlayer(j.player); setLoading(false); })
      .catch(() => { router.replace("/jugadores/crear"); });
  }, [router]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/jugadores/crear");
  }

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="jm"><div className="jm-loading"><div className="jm-spinner"/><p>Cargando perfil...</p></div></div>
      </>
    );
  }
  if (!player) return null;

  const displayLabel = player.alias || player.display_name;
  const subLine = player.alias ? player.display_name : (player.position ? `Posición · ${player.position}` : "Sin posición");
  const streakDisplay = player.current_streak === 0 ? "—" : (player.current_streak > 0 ? `🔥 +${player.current_streak}` : `❄ ${player.current_streak}`);

  const avatarNode = player.photo_url
    ? <img src={player.photo_url} alt="" className="jm-avatar-img"/>
    : <div className="jm-avatar-empty">{(player.display_name?.[0] || "?").toUpperCase()}</div>;

  return (
    <>
      <Head><title>Mi perfil de jugador — GolPlay</title></Head>
      <style>{CSS}</style>
      <div className="jm">
        <header className="jm-header">
          <button className="jm-back" onClick={() => router.back()} aria-label="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Link href="/"><Image src="/logo-golplay.svg" alt="GolPlay" width={110} height={80} style={{objectFit:'contain'}}/></Link>
          <div style={{width:40}}/>
        </header>

        <div className="jm-content">
          <div className="jm-hero">
            <div className="jm-avatar">{avatarNode}</div>
            <div className="jm-info">
              <h1 className="jm-name">{displayLabel}</h1>
              <p className="jm-sub">{subLine}</p>
              <button className="jm-logout" onClick={logout}>Cerrar sesión</button>
            </div>
          </div>

          <Link href={`/jugadores/${player.slug}`} className="jm-cta">Ver mi tarjeta pública</Link>

          <div className="jm-stats">
            <div className="jm-stat">
              <span className="jm-stat-val">{player.rating}</span>
              <span className="jm-stat-lbl">Rating</span>
            </div>
            <div className="jm-stat">
              <span className="jm-stat-val">{player.matches_played}</span>
              <span className="jm-stat-lbl">Partidos</span>
            </div>
            <div className="jm-stat">
              <span className="jm-stat-val">{streakDisplay}</span>
              <span className="jm-stat-lbl">Racha</span>
            </div>
          </div>

          <div className="jm-record">
            <div className="jm-record-title">Récord</div>
            <div className="jm-record-row">
              <div><span className="jm-record-num">{player.wins}</span><span className="jm-record-lbl">Victorias</span></div>
              <div><span className="jm-record-num">{player.draws}</span><span className="jm-record-lbl">Empates</span></div>
              <div><span className="jm-record-num">{player.losses}</span><span className="jm-record-lbl">Derrotas</span></div>
            </div>
          </div>

          <div className="jm-section">Próximamente</div>
          <div className="jm-soon">
            <div className="jm-soon-row">Mis equipos<span>Fase 2</span></div>
            <div className="jm-soon-row">Retos pendientes<span>Fase 3</span></div>
            <div className="jm-soon-row">Tarjeta FIFA descargable<span>Fase 4</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.jm{min-height:100vh;background:#0C0D0B;font-family:'DM Sans',system-ui,sans-serif;color:#e2e8e0;-webkit-font-smoothing:antialiased}
.jm-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:14px}
.jm-spinner{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.1);border-top-color:#4ade80;animation:spin .7s linear infinite}
.jm-loading p{font-family:'Kanit',sans-serif;font-size:13px;color:#6b7569}
.jm-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
.jm-back{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8e0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.jm-back:hover{background:rgba(255,255,255,.12)}
.jm-content{max-width:560px;margin:0 auto;padding:32px 20px 80px;animation:fadeUp .35s ease both}
.jm-hero{display:flex;gap:20px;align-items:flex-start;margin-bottom:24px}
.jm-avatar{width:88px;height:88px;border-radius:50%;flex-shrink:0;overflow:hidden;border:2px solid #16a34a;box-shadow:0 4px 18px rgba(22,163,74,.3)}
.jm-avatar-img{width:100%;height:100%;object-fit:cover}
.jm-avatar-empty{width:100%;height:100%;background:linear-gradient(135deg,#16a34a,#0B4D2C);color:#fff;font-family:'Kanit',sans-serif;font-size:34px;font-weight:800;display:flex;align-items:center;justify-content:center}
.jm-info{flex:1;min-width:0}
.jm-name{font-family:'Instrument Serif',Georgia,serif;font-size:30px;color:#fff;font-weight:400;line-height:1.1;letter-spacing:-.01em;margin-bottom:4px}
.jm-sub{font-size:13px;color:#9ca3af;margin-bottom:10px}
.jm-logout{background:transparent;border:none;color:#6b7569;font-size:12px;font-family:'Kanit',sans-serif;letter-spacing:.04em;cursor:pointer;text-decoration:underline;padding:0}
.jm-logout:hover{color:#e2e8e0}
.jm-cta{display:block;width:100%;text-align:center;padding:14px;background:#16a34a;color:#fff;text-decoration:none;font-family:'Kanit',sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:12px;box-shadow:0 3px 14px rgba(22,163,74,.3);margin-bottom:24px;transition:all .15s}
.jm-cta:hover{background:#15803d}
.jm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
.jm-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;text-align:center}
.jm-stat-val{display:block;font-family:'Instrument Serif',Georgia,serif;font-size:30px;color:#4ade80;line-height:1;margin-bottom:6px}
.jm-stat-lbl{font-family:'Kanit',sans-serif;font-size:10px;color:#6b7569;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
.jm-record{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;margin-bottom:28px}
.jm-record-title{font-family:'Kanit',sans-serif;font-size:11px;color:#6b7569;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px}
.jm-record-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.jm-record-row > div{display:flex;flex-direction:column;align-items:flex-start}
.jm-record-num{font-family:'Instrument Serif',Georgia,serif;font-size:28px;color:#fff;line-height:1}
.jm-record-lbl{font-size:11px;color:#6b7569;margin-top:4px}
.jm-section{font-family:'Kanit',sans-serif;font-size:11px;color:#525a52;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.jm-soon{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:14px;overflow:hidden}
.jm-soon-row{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.04);font-size:14px;color:#6b7569}
.jm-soon-row:last-child{border-bottom:none}
.jm-soon-row span{font-family:'Kanit',sans-serif;font-size:10px;color:#4ade8088;text-transform:uppercase;letter-spacing:.1em;font-weight:700;padding:3px 9px;border:1px solid rgba(74,222,128,.2);border-radius:999px}
@media(max-width:480px){.jm-hero{flex-direction:column;align-items:center;text-align:center}.jm-name{font-size:26px}.jm-stat-val{font-size:24px}}
`