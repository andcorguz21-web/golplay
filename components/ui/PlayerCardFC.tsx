// components/ui/PlayerCardFC.tsx
// Carta de jugador estilo FC/FUT (holográfica pink+teal).
// Datos-driven: solo cambian rating, posición, foto, nombre y stats.
// Stats: rit→PAC, tir→SHO, pas→PAS, reg→DRI, def→DEF, fis→PHY.

import { useRef, useCallback } from "react";

export type FCPlayer = {
  display_name: string;
  alias?: string | null;
  position: string | null;
  photo_url: string | null;
  rating?: number;
  rit: number; tir: number; pas: number; reg: number; def: number; fis: number;
  nationality?: string | null; // ISO emoji flag opcional
};

// Posición principal en estilo FC (inglés) + alternativas
const POS_MAIN: Record<string, string> = {
  portero: "GK", defensa: "CB", medio: "CM", delantero: "ST",
};
const POS_ALTS: Record<string, string[]> = {
  portero: [], defensa: ["LB", "RB"], medio: ["CDM", "CAM"], delantero: ["CF", "LW"],
};

const clamp99 = (n: number) => Math.max(0, Math.min(99, Math.round(n)));

export default function PlayerCardFC({
  player,
  flag = "🇨🇷",
  club = "GP",
}: {
  player: FCPlayer;
  flag?: string;
  club?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform =
      `perspective(900px) rotateY(${(x - 0.5) * 16}deg) rotateX(${-(y - 0.5) * 16}deg)`;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }, []);
  const onLeave = useCallback(() => {
    const el = cardRef.current; if (!el) return;
    el.style.transform = "perspective(900px) rotateY(0) rotateX(0)";
  }, []);

  const pos = player.position ?? "";
  const mainPos = POS_MAIN[pos] ?? (pos ? pos.slice(0, 3).toUpperCase() : "JUG");
  const altPos = POS_ALTS[pos] ?? [];
  const name = (player.alias || player.display_name || "").trim();

  const stats: [string, number][] = [
    ["PAC", player.rit], ["SHO", player.tir], ["PAS", player.pas],
    ["DRI", player.reg], ["DEF", player.def], ["PHY", player.fis],
  ];
  const avg = (player.rit + player.tir + player.pas + player.reg + player.def + player.fis) / 6;
  const rating = player.rating ?? Math.round(avg);
  const sub = avg.toFixed(1);

  return (
    <>
      <style>{CSS}</style>
      <div className="fcx-wrap" ref={wrapRef} onMouseMove={onMove} onMouseLeave={onLeave}>
        <div className="fcx-card" ref={cardRef}>
          <div className="fcx-shine" aria-hidden />

          {/* Columna izquierda: rating + posición + playstyles */}
          <div className="fcx-left">
            <div className="fcx-rating">{clamp99(rating)}</div>
            <div className="fcx-pos">{mainPos}</div>
            <div className="fcx-anchor" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="2.2" /><path d="M12 7v13M5 12H3a9 9 0 0018 0h-2M6 12l-2 2M18 12l2 2" />
              </svg>
            </div>
            <div className="fcx-ps" aria-hidden>
              {[0, 1, 2].map(i => (
                <span key={i} className="fcx-ps-i">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></svg>
                </span>
              ))}
            </div>
          </div>

          {/* Columna derecha: posiciones alternativas + pie/skills */}
          <div className="fcx-right">
            {altPos.map(p => <span key={p} className="fcx-altpos">{p}</span>)}
            <span className="fcx-badge">L</span>
            <span className="fcx-badge">5<span className="fcx-star">★</span></span>
          </div>

          {/* Foto */}
          <div className="fcx-photo">
            {player.photo_url
              ? <img src={player.photo_url} alt={name} crossOrigin="anonymous" />
              : <div className="fcx-photo-empty">SIN FOTO</div>}
          </div>

          {/* Nombre */}
          <div className="fcx-name">{name || "Jugador"}</div>
          <div className="fcx-divider" aria-hidden />

          {/* Nacionalidad + club */}
          <div className="fcx-mid">
            <span className="fcx-flag">{player.nationality || flag}</span>
            <span className="fcx-sep" />
            <span className="fcx-club">{club}</span>
          </div>

          {/* Stats */}
          <div className="fcx-stats">
            {stats.map(([lbl, val]) => (
              <div key={lbl} className="fcx-stat">
                <span className="fcx-stat-lbl">{lbl}</span>
                <span className="fcx-stat-val">{clamp99(val)}</span>
              </div>
            ))}
          </div>

          {/* Chip inferior */}
          <div className="fcx-chip">{mainPos} · {sub}</div>
        </div>
      </div>
    </>
  );
}

const CSS = `
.fcx-wrap{ width:310px; max-width:86vw; margin:0 auto; perspective:900px; }
.fcx-card{
  position:relative; width:100%; aspect-ratio:235/329;
  background:url(/card-frame.png) center/100% 100% no-repeat;
  filter:drop-shadow(0 22px 38px rgba(120,20,80,.42)) drop-shadow(0 6px 12px rgba(0,0,0,.3));
  transform:perspective(900px) rotateY(0) rotateX(0);
  transition:transform .15s ease; transform-style:preserve-3d;
  color:#fff; isolation:isolate;
}
.fcx-shine{
  position:absolute; inset:0; z-index:6; pointer-events:none; mix-blend-mode:soft-light;
  background:radial-gradient(220px 220px at var(--mx,50%) var(--my,40%), rgba(255,255,255,.6), rgba(255,255,255,0) 60%);
  -webkit-mask:url(/card-frame.png) center/100% 100% no-repeat; mask:url(/card-frame.png) center/100% 100% no-repeat;
}
/* Columna izquierda */
.fcx-left{ position:absolute; top:9%; left:11%; z-index:4; display:flex; flex-direction:column; align-items:center; gap:1px; text-shadow:0 1px 4px rgba(0,0,0,.4); }
.fcx-rating{ font-family:var(--font-d),'Poppins',sans-serif; font-weight:800; font-size:42px; line-height:.9; font-style:italic; }
.fcx-pos{ font-family:var(--font-d),'Poppins',sans-serif; font-weight:700; font-size:15px; letter-spacing:.02em; margin-top:1px; }
.fcx-anchor{ margin-top:5px; opacity:.95; }
.fcx-ps{ display:flex; flex-direction:column; gap:6px; margin-top:9px; }
.fcx-ps-i{ width:21px; height:21px; border-radius:6px; background:rgba(20,10,25,.5); display:grid; place-items:center; color:#ffd0e6; box-shadow:0 1px 3px rgba(0,0,0,.4); }
/* Columna derecha */
.fcx-right{ position:absolute; top:9%; right:10%; z-index:4; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.fcx-altpos, .fcx-badge{
  min-width:38px; text-align:center; padding:3px 8px; border-radius:7px;
  background:rgba(20,8,24,.5); color:#ff8dc0; font-family:var(--font-d),'Poppins',sans-serif;
  font-weight:800; font-size:12px; letter-spacing:.03em; box-shadow:0 1px 3px rgba(0,0,0,.4);
}
.fcx-badge{ color:#fff; }
.fcx-star{ color:#ffd84d; margin-left:1px; }
/* Foto */
.fcx-photo{ position:absolute; z-index:3; top:8%; right:8%; width:63%; height:47%; display:flex; align-items:flex-end; justify-content:center; }
.fcx-photo img{ width:100%; height:100%; object-fit:contain; object-position:bottom; filter:drop-shadow(0 10px 14px rgba(0,0,0,.4)); }
.fcx-photo-empty{ width:120px; height:120px; margin:auto; border-radius:50%; background:rgba(0,0,0,.22); display:grid; place-items:center; font-size:11px; font-weight:700; letter-spacing:.1em; color:rgba(255,255,255,.7); }
/* Nombre */
.fcx-name{ position:absolute; z-index:4; top:53%; left:6%; right:6%; text-align:center; font-family:var(--font-d),'Poppins',sans-serif; font-weight:800; font-size:24px; letter-spacing:.01em; text-shadow:0 2px 6px rgba(0,0,0,.45); }
.fcx-divider{ position:absolute; z-index:4; top:calc(53% + 32px); left:24%; right:24%; height:2px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent); }
/* Nacionalidad + club */
.fcx-mid{ position:absolute; z-index:4; top:calc(53% + 42px); left:0; right:0; display:flex; align-items:center; justify-content:center; gap:12px; }
.fcx-flag{ font-size:19px; filter:drop-shadow(0 1px 2px rgba(0,0,0,.4)); }
.fcx-sep{ width:1px; height:15px; background:rgba(255,255,255,.55); }
.fcx-club{ width:23px; height:23px; border-radius:50%; background:rgba(0,0,0,.35); display:grid; place-items:center; font-family:var(--font-d),'Poppins',sans-serif; font-weight:800; font-size:11px; color:#fff; }
/* Stats */
.fcx-stats{ position:absolute; z-index:4; bottom:15%; left:12%; right:12%; display:grid; grid-template-columns:repeat(6,1fr); gap:1px; }
.fcx-stat{ display:flex; flex-direction:column; align-items:center; gap:0; }
.fcx-stat-lbl{ font-family:var(--font-d),'Poppins',sans-serif; font-weight:700; font-size:9.5px; letter-spacing:.02em; color:rgba(255,255,255,.92); }
.fcx-stat-val{ font-family:var(--font-d),'Poppins',sans-serif; font-weight:800; font-size:15px; text-shadow:0 1px 3px rgba(0,0,0,.4); }
/* Chip inferior */
.fcx-chip{ position:absolute; z-index:5; bottom:6%; left:50%; transform:translateX(-50%); background:#7a1533; color:#fff; font-family:var(--font-d),'Poppins',sans-serif; font-weight:800; font-size:12px; letter-spacing:.02em; padding:4px 14px; border-radius:7px; box-shadow:0 3px 10px rgba(0,0,0,.45); white-space:nowrap; }
@media (max-width:360px){ .fcx-name{ font-size:21px; } .fcx-rating{ font-size:36px; } }
`;
