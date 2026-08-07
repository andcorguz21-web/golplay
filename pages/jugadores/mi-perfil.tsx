// pages/jugadores/mi-perfil.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";

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
        <Navbar dark={true} />
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

      <Navbar dark={true} />

      <div className="jm">
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
*,*::before,*::after{box-sizing:border-box}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.jm{min-height:100vh;padding-top:62px;background:#121628;font-family:var(--font-u),system-ui,sans-serif;color:#e7ebf3;-webkit-font-smoothing:antialiased}
.jm-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:14px}
.jm-spinner{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.1);border-top-color:var(--g4);animation:spin .7s linear infinite}
.jm-loading p{font-family:var(--font-d),sans-serif;font-size:13px;color:#6b7385}
.jm-content{max-width:560px;margin:0 auto;padding:32px 20px 80px;animation:fadeUp .35s ease both}
.jm-hero{display:flex;gap:20px;align-items:flex-start;margin-bottom:24px}
.jm-avatar{width:88px;height:88px;border-radius:50%;flex-shrink:0;overflow:hidden;border:2px solid var(--g6);box-shadow:0 4px 18px rgba(58,91,240,.3)}
.jm-avatar-img{width:100%;height:100%;object-fit:cover}
.jm-avatar-empty{width:100%;height:100%;background:linear-gradient(135deg,var(--g6),var(--g7));color:#fff;font-family:var(--font-d),sans-serif;font-size:34px;font-weight:800;display:flex;align-items:center;justify-content:center}
.jm-info{flex:1;min-width:0}
.jm-name{font-family:var(--font-d),sans-serif;font-size:30px;color:#fff;font-weight:800;line-height:1.1;letter-spacing:-.02em;margin-bottom:4px}
.jm-sub{font-size:13px;color:#9ca3af;margin-bottom:10px}
.jm-logout{background:transparent;border:none;color:#6b7385;font-size:12px;font-family:var(--font-d),sans-serif;letter-spacing:.04em;cursor:pointer;text-decoration:underline;padding:0}
.jm-logout:hover{color:#e7ebf3}
.jm-cta{display:block;width:100%;text-align:center;padding:14px;background:var(--g6);color:#fff;text-decoration:none;font-family:var(--font-d),sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:12px;box-shadow:0 3px 14px rgba(58,91,240,.3);margin-bottom:24px;transition:all .15s}
.jm-cta:hover{background:var(--g7)}
.jm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
.jm-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;text-align:center}
.jm-stat-val{display:block;font-family:var(--font-d),sans-serif;font-size:30px;font-weight:800;color:var(--g4);line-height:1;margin-bottom:6px}
.jm-stat-lbl{font-family:var(--font-d),sans-serif;font-size:10px;color:#6b7385;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
.jm-record{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;margin-bottom:28px}
.jm-record-title{font-family:var(--font-d),sans-serif;font-size:11px;color:#6b7385;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px}
.jm-record-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.jm-record-row > div{display:flex;flex-direction:column;align-items:flex-start}
.jm-record-num{font-family:var(--font-d),sans-serif;font-size:28px;font-weight:800;color:#fff;line-height:1}
.jm-record-lbl{font-size:11px;color:#6b7385;margin-top:4px}
.jm-section{font-family:var(--font-d),sans-serif;font-size:11px;color:#525a68;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.jm-soon{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:14px;overflow:hidden}
.jm-soon-row{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.04);font-size:14px;color:#6b7385}
.jm-soon-row:last-child{border-bottom:none}
.jm-soon-row span{font-family:var(--font-d),sans-serif;font-size:10px;color:#d4f24d88;text-transform:uppercase;letter-spacing:.1em;font-weight:700;padding:3px 9px;border:1px solid rgba(58,91,240,.2);border-radius:999px}
@media(max-width:480px){.jm-hero{flex-direction:column;align-items:center;text-align:center}.jm-name{font-size:26px}.jm-stat-val{font-size:24px}}
`