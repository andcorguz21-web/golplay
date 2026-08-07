// pages/jugadores/preview.tsx
// Preview standalone. Layout FC EA compacto.

import Head from "next/head";
import PlayerCardFC from "@/components/ui/PlayerCardFC";

type PlayerCardData = {
  display_name: string;
  alias: string | null;
  position: string | null;
  photo_url: string | null;
  rit: number; tir: number; pas: number;
  reg: number; def: number; fis: number;
};

const POSITION_LABELS: Record<string, string> = {
  portero: "POR", defensa: "DC", medio: "MC", delantero: "DEL",
};

function calculateRating(p: PlayerCardData): number {
  return Math.round((p.rit + p.tir + p.pas + p.reg + p.def + p.fis) / 6);
}

function getTier(rating: number): "bronze" | "silver" | "gold" {
  if (rating >= 75) return "gold";
  if (rating >= 65) return "silver";
  return "bronze";
}

function PlayerCard({ player }: { player: PlayerCardData }) {
  const rating = calculateRating(player);
  const tier = getTier(rating);
  const fullName = player.alias || player.display_name;
  const posLabel = player.position ? POSITION_LABELS[player.position] : "JUG";

  const photoNode = player.photo_url
    ? <img src={player.photo_url} alt={fullName} className="pc-photo"/>
    : <div className="pc-photo-empty">SIN<br/>FOTO</div>;

  const stats = [
    { val: player.rit, lbl: "RIT" },
    { val: player.tir, lbl: "TIR" },
    { val: player.pas, lbl: "PAS" },
    { val: player.reg, lbl: "REG" },
    { val: player.def, lbl: "DEF" },
    { val: player.fis, lbl: "FÍS" },
  ];

  return (
    <div className="pc-shadow">
      <div className={`pc-card pc-card--${tier}`}>
        <div className="pc-rays"/>

        {/* Foto: GRANDE, centrada, ocupando casi toda la mitad superior */}
        <div className="pc-photo-wrap">{photoNode}</div>

        {/* Rating: montado encima de la foto, top-left */}
        <div className="pc-rating-block">
          <div className="pc-rating-num">{rating}</div>
          <div className="pc-pos">{posLabel}</div>
        </div>

        {/* Bottom: nombre + stats + flags, todo apretado abajo */}
        <div className="pc-bottom">
          <div className="pc-name">{fullName}</div>
          <div className="pc-divider"/>
          <div className="pc-stats">
            {stats.map((s, i) => (
              <div className="pc-stat" key={i}>
                <span className="pc-stat-val">{s.val}</span>
                <span className="pc-stat-lbl">{s.lbl}</span>
              </div>
            ))}
          </div>
          <div className="pc-flags">
            <span className="pc-flag">🇨🇷</span>
            <span className="pc-club-badge">GP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const AVATAR = (seed: string) => `https://i.pravatar.cc/400?u=${seed}`;

const CASES: { label: string; description: string; player: PlayerCardData }[] = [
  {
    label: "GOLD — Delantero top",
    description: "Stats altas → rating 76",
    player: {
      display_name: "Andrés Cordero", alias: null, position: "delantero",
      photo_url: AVATAR("andres-1"),
      rit: 92, tir: 88, pas: 76, reg: 90, def: 34, fis: 76,
    },
  },
  {
    label: "BRONCE — Inicio",
    description: "Stats bajas → rating 58",
    player: {
      display_name: "Joel Campbell", alias: null, position: "medio",
      photo_url: AVATAR("joel-2"),
      rit: 55, tir: 50, pas: 65, reg: 60, def: 58, fis: 60,
    },
  },
  {
    label: "PLATA — Sin foto",
    description: "Stats medias → rating 68",
    player: {
      display_name: "Mauricio Vargas Solano", alias: "Capi", position: null,
      photo_url: null,
      rit: 70, tir: 65, pas: 72, reg: 68, def: 65, fis: 70,
    },
  },
  {
    label: "GOLD — Elite portero",
    description: "Stats top → rating 65",
    player: {
      display_name: "Keylor Navas", alias: null, position: "portero",
      photo_url: AVATAR("keylor-3"),
      rit: 60, tir: 30, pas: 65, reg: 50, def: 95, fis: 88,
    },
  },
  {
    label: "PLATA — Defensa intermedio",
    description: "Stats balanceadas → rating 70",
    player: {
      display_name: "Luis Díaz", alias: null, position: "defensa",
      photo_url: AVATAR("luis-4"),
      rit: 68, tir: 50, pas: 70, reg: 65, def: 85, fis: 80,
    },
  },
];

export default function PreviewTarjeta() {
  return (
    <>
      <Head><title>Preview tarjeta FC — GolPlay</title></Head>
      <style>{CSS}</style>
      <div className="pv">
        <div className="pv-content">
          <h1 className="pv-title">Tarjeta FC — Preview</h1>
          <p className="pv-subtitle">Stats auto-asignadas 0–99 (honor system). Rating = promedio. Tiers: <b>bronce</b> &lt; 65 · <b>plata</b> 65–74 · <b>oro</b> ≥ 75</p>

          <div className="pv-grid">
            {CASES.map((c, i) => (
              <div className="pv-case" key={i}>
                <div className="pv-case-head">
                  <div className="pv-case-label">{c.label}</div>
                  <div className="pv-case-desc">{c.description}</div>
                </div>
                <PlayerCardFC player={c.player}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ============== PAGE ============== */
.pv{min-height:100vh;background:#121628;font-family:'DM Sans',system-ui,sans-serif;color:#e7ebf3;padding:40px 20px 80px}
.pv-content{max-width:1200px;margin:0 auto}
.pv-title{font-family:'Bebas Neue',sans-serif;font-size:56px;color:#fff;letter-spacing:.02em;margin-bottom:8px;line-height:1}
.pv-subtitle{font-size:14px;color:#9ca3af;margin-bottom:40px}
.pv-subtitle b{color:#d4f24d;font-weight:600}
.pv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:40px;justify-items:center}
.pv-case{display:flex;flex-direction:column;gap:14px;align-items:flex-start;width:100%}
.pv-case-head{padding-bottom:6px}
.pv-case-label{font-family:'Inter',sans-serif;font-size:12px;font-weight:800;color:#d4f24d;text-transform:uppercase;letter-spacing:.08em}
.pv-case-desc{font-size:12px;color:#6b7385;margin-top:4px;line-height:1.4}

/* ============== SHADOW WRAPPER ============== */
.pc-shadow{
  width:100%;max-width:280px;aspect-ratio:5/7;
  filter:drop-shadow(0 22px 45px rgba(0,0,0,.65)) drop-shadow(0 6px 12px rgba(0,0,0,.4));
}

/* ============== CARD ============== */
.pc-card{
  position:relative;width:100%;height:100%;
  font-family:'Inter',sans-serif;color:#1a1a1a;
  clip-path:polygon(
    50% 4%,
    44% 2%, 36% 1%, 28% 0%, 20% 0%, 12% 1%,
    7% 3%, 3% 7%, 1% 12%, 0% 18%,
    0% 70%,
    1% 78%, 3% 84%, 7% 89%, 12% 93%, 18% 96%, 26% 98%,
    36% 99%, 44% 100%, 50% 100%, 56% 100%, 64% 99%,
    74% 98%, 82% 96%, 88% 93%, 93% 89%, 97% 84%, 99% 78%,
    100% 70%,
    100% 18%,
    99% 12%, 97% 7%, 93% 3%, 88% 1%,
    80% 0%, 72% 0%, 64% 1%, 56% 2%
  );
}
.pc-card::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0,transparent 16px,rgba(255,255,255,.04) 16px,rgba(255,255,255,.04) 17px);z-index:1;pointer-events:none}
.pc-card::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 5%,rgba(255,255,255,.3) 0%,transparent 55%);z-index:1;pointer-events:none}

/* ============== TIERS ============== */
.pc-card--gold{background:linear-gradient(165deg,#FFE588 0%,#D4A431 25%,#FFE588 48%,#A37516 75%,#F8D56A 100%)}
.pc-card--gold .pc-rating-num,.pc-card--gold .pc-pos,.pc-card--gold .pc-name,.pc-card--gold .pc-stat-val,.pc-card--gold .pc-stat-lbl,.pc-card--gold .pc-club-badge{color:#3a1a00}
.pc-card--gold .pc-divider{background:linear-gradient(90deg,transparent,#5C2C0C,transparent)}
.pc-card--gold .pc-club-badge{background:rgba(58,26,0,.18)}

.pc-card--silver{background:linear-gradient(165deg,#F5F5F5 0%,#9CA0A8 25%,#EAEAEA 48%,#6F7480 75%,#F0F0F0 100%)}
.pc-card--silver .pc-rating-num,.pc-card--silver .pc-pos,.pc-card--silver .pc-name,.pc-card--silver .pc-stat-val,.pc-card--silver .pc-stat-lbl,.pc-card--silver .pc-club-badge{color:#1a1a1a}
.pc-card--silver .pc-divider{background:linear-gradient(90deg,transparent,#2a2a2a,transparent)}
.pc-card--silver .pc-club-badge{background:rgba(26,26,26,.15)}

.pc-card--bronze{background:linear-gradient(165deg,#DBA672 0%,#8B4513 25%,#C57C42 48%,#5C2C0C 75%,#DBA672 100%)}
.pc-card--bronze .pc-rating-num,.pc-card--bronze .pc-pos,.pc-card--bronze .pc-name,.pc-card--bronze .pc-stat-val,.pc-card--bronze .pc-stat-lbl,.pc-card--bronze .pc-club-badge{color:#1F0F00}
.pc-card--bronze .pc-divider{background:linear-gradient(90deg,transparent,#1F0F00,transparent)}
.pc-card--bronze .pc-club-badge{background:rgba(31,15,0,.2)}

/* ============== RAYOS ============== */
.pc-rays{
  position:absolute;
  top:10%;left:50%;transform:translateX(-50%);
  width:78%;height:42%;
  background:repeating-conic-gradient(
    from 200deg at 50% 100%,
    rgba(255,255,255,.2) 0deg, rgba(255,255,255,.2) 2deg,
    transparent 2deg, transparent 9deg
  );
  -webkit-mask-image:radial-gradient(ellipse at 50% 100%, black 25%, transparent 75%);
  mask-image:radial-gradient(ellipse at 50% 100%, black 25%, transparent 75%);
  z-index:1;pointer-events:none;
}

/* ============== FOTO (centrada, grande, MASSIVE) ============== */
.pc-photo-wrap{
  position:absolute;
  top:7%;
  left:50%;
  transform:translateX(-50%);
  width:78%;
  height:52%;
  z-index:2;
  display:flex;
  align-items:flex-end;
  justify-content:center;
}
.pc-photo{
  width:100%;height:100%;
  object-fit:cover;object-position:top center;
  -webkit-mask-image:radial-gradient(ellipse at 50% 30%, black 65%, transparent 100%);
  mask-image:radial-gradient(ellipse at 50% 30%, black 65%, transparent 100%);
}
.pc-photo-empty{
  width:100%;height:100%;
  display:flex;align-items:center;justify-content:center;
  text-align:center;font-family:'Inter',sans-serif;
  font-size:11px;font-weight:800;letter-spacing:.1em;
  color:rgba(0,0,0,.35);line-height:1.2;
}

/* ============== RATING (overlay top-left, encima de la foto) ============== */
.pc-rating-block{
  position:absolute;
  top:14px;
  left:18px;
  z-index:4;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
}
.pc-rating-num{
  font-family:'Inter',sans-serif;
  font-size:48px;
  line-height:.85;
  font-weight:900;
  letter-spacing:-.04em;
  text-shadow:0 2px 4px rgba(0,0,0,.15), 0 1px 0 rgba(255,255,255,.2);
}
.pc-pos{
  font-family:'Inter',sans-serif;
  font-size:14px;
  line-height:1;
  font-weight:800;
  letter-spacing:.02em;
  margin-top:2px;
  opacity:.95;
  text-shadow:0 1px 2px rgba(0,0,0,.15);
}

/* ============== BOTTOM (compacto, anchored al bottom) ============== */
.pc-bottom{
  position:absolute;
  bottom:0;
  left:0;
  right:0;
  z-index:3;
  padding:0 16px 14px;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.pc-name{
  font-family:'Inter',sans-serif;
  font-size:17px;
  line-height:1.1;
  font-weight:700;
  text-align:center;
  letter-spacing:-.01em;
  margin-bottom:5px;
  text-shadow:0 1px 0 rgba(255,255,255,.18);
  width:100%;
}
.pc-divider{
  height:1px;
  width:70%;
  margin:0 auto 6px;
  opacity:.55;
}
.pc-stats{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:0;
  width:100%;
  margin-bottom:8px;
}
.pc-stat{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:0;
}
.pc-stat-val{
  font-family:'Inter',sans-serif;
  font-size:18px;
  font-weight:800;
  line-height:1;
  letter-spacing:-.02em;
}
.pc-stat-lbl{
  font-family:'Inter',sans-serif;
  font-size:9px;
  font-weight:700;
  letter-spacing:.04em;
  opacity:.85;
  line-height:1;
  margin-top:2px;
}

/* ============== FLAGS (justo debajo de stats, compacto) ============== */
.pc-flags{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
}
.pc-flag{font-size:13px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
.pc-club-badge{
  width:18px;height:18px;
  border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:'Inter',sans-serif;
  font-size:8px;
  font-weight:900;
}

@media(max-width:480px){
  .pc-rating-num{font-size:42px}
  .pc-name{font-size:15px}
  .pc-stat-val{font-size:16px}
}
`