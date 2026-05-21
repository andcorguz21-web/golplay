import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { GOLPLAY_BASE_CSS } from "@/lib/styles/golplay";

type State = "loading" | "no_player" | "joined" | "already_member" | "error";
type TeamInfo = { id: string; name: string; slug: string; logo_url: string | null };

const CSS = `${GOLPLAY_BASE_CSS}
.page {
  min-height: 100vh;
  background: linear-gradient(155deg, #030c06 0%, #0a3018 55%, #0e4820 100%);
  padding-top: 62px; position: relative; overflow: hidden;
}
.page::before {
  content: ''; position: absolute; top: 30%; left: 50%;
  transform: translate(-50%,-50%);
  width: 600px; height: 400px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(22,163,74,.12) 0%, transparent 65%);
  pointer-events: none;
}
.page::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.02) 59px,rgba(255,255,255,.02) 60px),
    repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,.02) 59px,rgba(255,255,255,.02) 60px);
}
.wrap {
  position: relative; z-index: 1; max-width: 500px; margin: 0 auto;
  padding: 56px 24px; text-align: center; animation: fadeUp .5s ease both;
}
.team-logo-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  width: 130px; height: 130px;
  background: rgba(255,255,255,.05); border: 1.5px solid rgba(74,222,128,.25);
  border-radius: 28px; margin-bottom: 28px; overflow: hidden;
}
.team-logo-img { width: 100%; height: 100%; object-fit: cover; }
.team-logo-fallback {
  font-family: var(--font-d); font-size: 60px; font-weight: 800;
  color: var(--g4); line-height: 1;
}
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.22);
  border-radius: 999px; padding: 5px 12px; margin-bottom: 20px;
}
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--g4);
  animation: pulseDot 2s infinite;
}
.badge-text {
  font-size: 10px; font-weight: 700; color: rgba(74,222,128,.88);
  letter-spacing: .08em; text-transform: uppercase;
}
.title {
  font-family: var(--font-d); font-size: clamp(36px,8vw,52px);
  font-weight: 800; line-height: 1; letter-spacing: -.03em;
  color: #fff; margin: 0 0 8px;
}
.title-accent {
  background: linear-gradient(110deg, var(--g4) 0%, #34d399 60%, #22d3ee 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.subtitle {
  font-size: 15px; color: rgba(255,255,255,.55);
  margin: 0 auto 32px; line-height: 1.6; max-width: 400px;
}
.cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 14px 28px; border-radius: 13px;
  background: var(--g4); color: var(--dark);
  border: none; text-decoration: none;
  font-family: var(--font-d); font-size: 14px; font-weight: 800;
  cursor: pointer; box-shadow: 0 4px 22px rgba(74,222,128,.38);
  transition: all .15s ease;
}
.cta:hover { background: #34d399; transform: translateY(-1px); }
.cta-ghost {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 14px 24px; border-radius: 13px;
  background: rgba(255,255,255,.07); color: rgba(255,255,255,.65);
  border: 1px solid rgba(255,255,255,.13);
  font-family: var(--font-d); font-size: 13px; font-weight: 700; text-decoration: none;
  transition: all .15s ease;
}
.cta-ghost:hover { background: rgba(255,255,255,.12); color: #fff; }
.loading-text { color: rgba(255,255,255,.5); padding: 80px; }
.error-text {
  background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3);
  color: #fca5a5; padding: 16px 20px; border-radius: var(--r-md);
  font-size: 14px; margin-bottom: 24px;
}
`;

function teamInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export default function UnirseEquipo() {
  const router = useRouter();
  const { token } = router.query;
  const [state, setState] = useState<State>("loading");
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token || typeof token !== "string") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/teams/join_via_link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ invite_token: token }),
        });
        if (cancelled) return;
        if (res.status === 401) { setState("no_player"); return; }
        const json = await res.json();
        if (!res.ok) {
          setErrorMsg(json.error ?? "Link inválido");
          setState("error");
          return;
        }
        setTeam(json.team);
        setState(json.already_member ? "already_member" : "joined");
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message ?? "Error");
          setState("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <>
      <Head><title>Unirse al equipo · GolPlay</title></Head>
      <style>{CSS}</style>
      <Navbar dark={true} />
      <div className="page">
        <div className="wrap">
          {state === "loading" && <div className="loading-text">Cargando invitación…</div>}

          {state === "no_player" && (
            <>
              <div className="badge">
                <span className="badge-dot" />
                <span className="badge-text">Invitación pendiente</span>
              </div>
              <h1 className="title">
                Primero<br /><span className="title-accent">tu perfil.</span>
              </h1>
              <p className="subtitle">
                Para sumarte al equipo, creá tu perfil de jugador. Cuando termines, volvé a abrir este link y entrás directo.
              </p>
              <div className="cta-row">
                <Link href="/jugadores/crear" className="cta">Crear mi perfil →</Link>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <div className="team-logo-wrap">
                <span style={{ fontSize: 48 }}>⚠️</span>
              </div>
              <h1 className="title">Link inválido</h1>
              {errorMsg && <div className="error-text">{errorMsg}</div>}
              <p className="subtitle">Verificá con el capitán que el link sea correcto.</p>
              <div className="cta-row">
                <Link href="/equipos" className="cta">Ver equipos</Link>
              </div>
            </>
          )}

          {(state === "joined" || state === "already_member") && team && (
            <>
              <div className="team-logo-wrap">
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="team-logo-img" />
                ) : (
                  <span className="team-logo-fallback">{teamInitial(team.name)}</span>
                )}
              </div>
              <div className="badge">
                <span className="badge-dot" />
                <span className="badge-text">
                  {state === "joined" ? "Bienvenido al equipo" : "Ya sos miembro"}
                </span>
              </div>
              <h1 className="title">
                {state === "joined" ? "Listo," : "Ya estás"}<br />
                <span className="title-accent">{team.name}.</span>
              </h1>
              <p className="subtitle">
                {state === "joined"
                  ? "Te uniste al equipo. Andá al perfil para ver la plantilla y conocer a tus compañeros."
                  : "Ya formás parte. Andá al perfil para ver la plantilla y novedades."}
              </p>
              <div className="cta-row">
                <Link href={"/equipos/" + team.slug} className="cta">Ir al equipo →</Link>
                <Link href="/equipos/mis-equipos" className="cta-ghost">Mis equipos</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}