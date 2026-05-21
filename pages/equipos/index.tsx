import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { GOLPLAY_BASE_CSS } from "@/lib/styles/golplay";

type TeamRow = {
  id: string; name: string; slug: string;
  logo_url: string | null; description: string | null;
  captain_player_id: string; created_at: string;
  role: "captain" | "member"; joined_at: string;
  pending_requests_count: number;
};
type State = "loading" | "no_player" | "ready" | "error";

const CSS = `${GOLPLAY_BASE_CSS}
.page { min-height: 100vh; background: var(--bone); padding-top: 62px; }
.header-section { padding: 48px clamp(16px,4vw,40px) 28px; max-width: 1100px; margin: 0 auto; }
.header-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.title-block { animation: fadeUp .5s ease both; }
.create-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 11px 22px; background: var(--g6); color: #fff;
  border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 13px;
  text-decoration: none; box-shadow: 0 2px 10px rgba(22,163,74,.28);
  transition: all .15s ease; border: none; cursor: pointer;
}
.create-cta:hover { background: var(--g7); transform: translateY(-1px); }
.content-section { padding: 0 clamp(16px,4vw,40px) clamp(60px,8vw,100px); max-width: 1100px; margin: 0 auto; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 14px; }
.team-card {
  display: flex; gap: 14px; padding: 18px;
  border: 1.5px solid var(--bd); border-radius: var(--r-lg);
  background: var(--white); text-decoration: none; color: inherit;
  transition: all .22s cubic-bezier(.16,1,.3,1); align-items: center;
  box-shadow: var(--sh-xs); animation: fadeUp .5s ease both;
  position: relative;
}
.team-card:hover { border-color: var(--g4); transform: translateY(-4px); box-shadow: var(--sh-md); }
.card-logo {
  width: 64px; height: 64px; border-radius: 14px; flex-shrink: 0;
  background: var(--dark); display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.card-logo img { width: 100%; height: 100%; object-fit: cover; }
.card-logo-fallback { color: var(--g4); font-family: var(--font-d); font-size: 28px; font-weight: 800; line-height: 1; }
.card-body { flex: 1; min-width: 0; }
.card-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.card-name {
  font-family: var(--font-d); font-weight: 800; font-size: 17px;
  color: var(--ink); letter-spacing: -.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1; min-width: 0;
}
.pending-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 800; letter-spacing: .04em;
  padding: 3px 8px; border-radius: 99px;
  box-shadow: 0 2px 8px rgba(239,68,68,.35);
  animation: pulseDot 2s infinite;
  flex-shrink: 0;
}
.card-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.role-pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 99px;
}
.role-pill.captain { background: var(--g1); color: var(--g7); border: 1px solid rgba(22,163,74,.2); }
.role-pill.member { background: #f1f5f4; color: var(--muted); border: 1px solid var(--bd); }
.card-date { font-size: 11px; color: var(--muted); }
.empty { text-align: center; padding: 60px 28px; background: var(--white); border: 1.5px dashed var(--bd); border-radius: var(--r-xl); }
.empty-emoji { font-size: 48px; margin-bottom: 16px; display: block; }
.empty-title { font-family: var(--font-d); font-size: 26px; font-weight: 800; color: var(--ink); margin: 0 0 8px; letter-spacing: -.02em; }
.empty-text { color: var(--muted); margin: 0 auto 22px; font-size: 14px; line-height: 1.6; max-width: 360px; }
.warn-card { background: var(--white); border: 1.5px solid var(--bd); border-radius: var(--r-xl); padding: 36px 28px; text-align: center; max-width: 480px; margin: 12px auto; animation: fadeUp .5s ease both; }
.warn-emoji { font-size: 44px; margin-bottom: 12px; display: block; }
.warn-title { font-family: var(--font-d); font-size: 24px; font-weight: 800; color: var(--ink); margin: 0 0 10px; letter-spacing: -.02em; }
.warn-text { color: var(--muted); margin: 0 0 22px; font-size: 14px; line-height: 1.6; }
.skeleton-card { height: 100px; border: 1.5px solid var(--bd); border-radius: var(--r-lg); background: var(--white); padding: 18px; display: flex; gap: 14px; align-items: center; }
`;

function teamInitial(name: string): string { return name.trim()[0]?.toUpperCase() ?? "?"; }
function daysSince(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "hoy"; if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  if (d < 30) return `hace ${Math.floor(d/7)} sem`;
  return `hace ${Math.floor(d/30)} meses`;
}

export default function MisEquipos() {
  const [state, setState] = useState<State>("loading");
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/teams/my_teams", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify({}),
        });
        if (cancelled) return;
        if (res.status === 401) { setState("no_player"); return; }
        const json = await res.json();
        if (!res.ok) { setErrorMsg(json.error ?? "Error"); setState("error"); return; }
        setTeams(json.teams ?? []); setState("ready");
      } catch (e: any) {
        if (!cancelled) { setErrorMsg(e?.message ?? "Error"); setState("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Head><title>Mis equipos · GolPlay</title></Head>
      <style>{CSS}</style>
      <Navbar dark={false} />
      <div className="page">
        <div className="header-section">
          <div className="header-row">
            <div className="title-block">
              <p className="eyebrow">Tu plantilla</p>
              <h1 className="h2">Mis <em>equipos.</em></h1>
            </div>
            {state === "ready" && teams.length > 0 && (
              <Link href="/equipos/crear" className="create-cta">+ Crear equipo</Link>
            )}
          </div>
        </div>
        <div className="content-section">
          {state === "loading" && (
            <div className="grid">
              {[1,2,3].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="sk" style={{ width: 64, height: 64, borderRadius: 14 }} />
                  <div style={{ flex: 1 }}>
                    <div className="sk" style={{ height: 14, width: "60%", marginBottom: 8 }} />
                    <div className="sk" style={{ height: 10, width: "35%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {state === "no_player" && (
            <div className="warn-card">
              <span className="warn-emoji">⚽</span>
              <h2 className="warn-title">Primero, tu perfil</h2>
              <p className="warn-text">Para crear o unirte a un equipo necesitás tu perfil de jugador. Toma menos de un minuto.</p>
              <Link href="/jugadores/crear" className="create-cta">Crear mi perfil →</Link>
            </div>
          )}
          {state === "error" && (
            <div className="warn-card">
              <span className="warn-emoji">⚠️</span>
              <h2 className="warn-title">No pudimos cargar tus equipos</h2>
              <p className="warn-text">{errorMsg ?? "Intentá refrescar la página."}</p>
            </div>
          )}
          {state === "ready" && teams.length === 0 && (
            <div className="empty">
              <span className="empty-emoji">🏆</span>
              <h2 className="empty-title">Sin equipos aún</h2>
              <p className="empty-text">Creá tu primer equipo o pedile a un capitán que te invite con tu cédula.</p>
              <Link href="/equipos/crear" className="create-cta">+ Crear mi primer equipo</Link>
            </div>
          )}
          {state === "ready" && teams.length > 0 && (
            <div className="grid">
              {teams.map((t, i) => (
                <Link
                  key={t.id} href={"/equipos/" + t.slug}
                  className="team-card"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="card-logo">
                    {t.logo_url
                      ? <img src={t.logo_url} alt={t.name} />
                      : <span className="card-logo-fallback">{teamInitial(t.name)}</span>}
                  </div>
                  <div className="card-body">
                    <div className="card-name-row">
                      <div className="card-name">{t.name}</div>
                      {t.role === "captain" && t.pending_requests_count > 0 && (
                        <span className="pending-badge">
                          {t.pending_requests_count} {t.pending_requests_count === 1 ? "reto" : "retos"}
                        </span>
                      )}
                    </div>
                    <div className="card-meta">
                      <span className={"role-pill " + t.role}>
                        {t.role === "captain" ? "Capitán" : "Miembro"}
                      </span>
                      <span className="card-date">{daysSince(t.joined_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}