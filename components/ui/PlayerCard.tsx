// components/ui/PlayerCard.tsx
import { useEffect, useRef } from "react";

export type PlayerCardData = {
  id?: string;
  display_name: string;
  alias: string | null;
  position: string | null;
  photo_url: string | null;
  rating: number;
  rit: number; tir: number; pas: number; reg: number; def: number; fis: number;
};

const POSITION_LABELS: Record<string, string> = {
  portero: "POR", defensa: "DC", medio: "MC", delantero: "DEL",
};
const POSITION_ALT: Record<string, string> = {
  portero: "GK", defensa: "LD", medio: "CAM", delantero: "EXT",
};
const TIER_STAMP: Record<string, string> = {
  gold: "GOLD", silver: "RARE", bronze: "BASE",
};

function getTier(r: number): "bronze" | "silver" | "gold" {
  if (r >= 75) return "gold";
  if (r >= 65) return "silver";
  return "bronze";
}

function cardNumber(id?: string): string {
  if (!id) return "001";
  const hex = id.replace(/-/g, "").slice(-6);
  const n = (parseInt(hex, 16) % 999) + 1;
  return n.toString().padStart(3, "0");
}

const SPARKLES = [
  { top: "8%",  left: "22%", size: 3 },
  { top: "16%", left: "78%", size: 2 },
  { top: "31%", left: "10%", size: 2 },
  { top: "46%", left: "88%", size: 3 },
  { top: "58%", left: "14%", size: 2 },
  { top: "70%", left: "76%", size: 2 },
  { top: "82%", left: "20%", size: 3 },
  { top: "90%", left: "82%", size: 2 },
];

type Props = {
  player: PlayerCardData;
  /** Activa el parallax 3D (mouse + giroscopio). Default true. */
  interactive?: boolean;
};

export default function PlayerCard({ player, interactive = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent) {
    if (!interactive) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const card = wrap.querySelector(".card") as HTMLElement | null;
    const holo = wrap.querySelector(".card-holo") as HTMLElement | null;
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (card) card.style.transform = `rotateY(${(x - 0.5) * 14}deg) rotateX(${-(y - 0.5) * 14}deg)`;
    if (holo) holo.style.setProperty("--holo-angle", `${x * 360 + y * 180}deg`);
  }

  function handleMouseLeave() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const card = wrap.querySelector(".card") as HTMLElement | null;
    if (card) card.style.transform = "";
  }

  // Parallax 3D — giroscopio (mobile)
  useEffect(() => {
    if (!interactive) return;
    function handleOrientation(e: DeviceOrientationEvent) {
      if (e.gamma === null || e.beta === null) return;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const card = wrap.querySelector(".card") as HTMLElement | null;
      const holo = wrap.querySelector(".card-holo") as HTMLElement | null;
      if (!card) return;
      const rotateY = Math.max(-12, Math.min(12, e.gamma / 3));
      const rotateX = Math.max(-12, Math.min(12, (e.beta - 45) / 6));
      card.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
      if (holo) holo.style.setProperty("--holo-angle", `${(rotateY + 12) * 15 + (rotateX + 12) * 10}deg`);
    }

    const DeviceEvt: any = typeof window !== "undefined" ? (window as any).DeviceOrientationEvent : null;
    if (DeviceEvt && typeof DeviceEvt.requestPermission === "function") {
      const wrap = wrapRef.current;
      const requestPermission = async () => {
        try {
          const p = await DeviceEvt.requestPermission();
          if (p === "granted") window.addEventListener("deviceorientation", handleOrientation);
        } catch {}
      };
      wrap?.addEventListener("click", requestPermission, { once: true });
      return () => {
        wrap?.removeEventListener("click", requestPermission);
        window.removeEventListener("deviceorientation", handleOrientation);
      };
    } else if (typeof window !== "undefined") {
      window.addEventListener("deviceorientation", handleOrientation);
      return () => window.removeEventListener("deviceorientation", handleOrientation);
    }
  }, [interactive]);

  const tier = getTier(player.rating);
  const cardName = (player.alias || player.display_name.split(" ").slice(-1)[0]).toUpperCase();
  const posLabel = player.position ? (POSITION_LABELS[player.position] ?? "JUG") : "JUG";
  const altLabel = player.position ? (POSITION_ALT[player.position] ?? "—") : "—";
  const stamp = TIER_STAMP[tier];
  const cardNum = cardNumber(player.id);

  const stats: Array<[number, string]> = [
    [player.rit, "RIT"], [player.tir, "TIR"], [player.pas, "PAS"],
    [player.reg, "REG"], [player.def, "DEF"], [player.fis, "FÍS"],
  ];

  return (
    <>
      <style>{CARD_CSS}</style>
      <div
        ref={wrapRef}
        className={`card-wrap card-wrap--${tier}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`card card--${tier}`}>
          <div className="card-pattern" />
          <div className="card-holo" />
          <div className="card-shine" />
          <div className="card-sparkles">
            {SPARKLES.map((s, i) => (
              <span key={i} style={{ top: s.top, left: s.left, ['--sp-size' as any]: `${s.size}px` }} />
            ))}
          </div>
          <div className="card-stamp">{stamp}</div>
          <div className="card-number">#{cardNum}</div>

          <div className="card-inner">
            <div className="card-top">
              <div className="card-meta">
                <div className="card-rating">{player.rating}</div>
                <div className="card-pos">
                  {posLabel}
                  <span className="card-pos-sep">·</span>
                  <span className="card-pos-alt">{altLabel}</span>
                </div>
                <div className="card-flag-wrap"><span className="card-flag">🇨🇷</span></div>
                <div className="card-country">CRC</div>
              </div>
              <div className="card-photo">
                {player.photo_url
                  ? <img src={player.photo_url} alt={cardName} crossOrigin="anonymous" />
                  : <div className="card-photo-empty">SIN FOTO</div>}
              </div>
            </div>

            <div className="card-bottom">
              <div className="card-name">{cardName}</div>
              <div className="card-divider" />
              <div className="card-stats">
                {stats.map(([val, lbl], i) => (
                  <div key={i} className="card-stat">
                    <div className="card-stat-row">
                      <span className="card-stat-val">{val}</span>
                      <span className="card-stat-lbl">{lbl}</span>
                    </div>
                    <div className="card-stat-bar">
                      <div className="card-stat-bar-fill" style={{ width: `${(val / 99) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card-footer"><div className="card-club">GP</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const CARD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800;900&display=swap');

@property --holo-angle { syntax: '<angle>'; initial-value: 90deg; inherits: false; }

@keyframes pcShimmer { 0% { transform: translateX(-100%) skewX(-15deg); } 60%, 100% { transform: translateX(220%) skewX(-15deg); } }
@keyframes pcSparkle { 0%, 100% { opacity: .9; transform: scale(1); } 50% { opacity: .4; transform: scale(.7); } }

.card-wrap { width: 100%; max-width: 320px; margin: 0 auto; perspective: 1200px; cursor: pointer; }
.card-wrap--gold   { filter: drop-shadow(0 0 28px rgba(255,215,110,.35)) drop-shadow(0 24px 50px rgba(196,140,30,.45)) drop-shadow(0 8px 18px rgba(0,0,0,.5)); }
.card-wrap--silver { filter: drop-shadow(0 0 24px rgba(220,225,235,.25)) drop-shadow(0 24px 50px rgba(140,148,160,.35)) drop-shadow(0 8px 18px rgba(0,0,0,.5)); }
.card-wrap--bronze { filter: drop-shadow(0 0 24px rgba(220,145,80,.28)) drop-shadow(0 24px 50px rgba(139,69,19,.35)) drop-shadow(0 8px 18px rgba(0,0,0,.5)); }

.card {
  width: 100%; aspect-ratio: 5 / 7; border-radius: 22px; padding: 5px;
  position: relative; overflow: hidden; transform-style: preserve-3d;
  transition: transform .4s cubic-bezier(.2,.8,.3,1);
  box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.4), inset 0 0 0 4px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.22);
}
.card--gold   { background: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.45) 0%, transparent 50%), linear-gradient(160deg,#FFE07A 0%,#C68F1F 22%,#FFEC9C 45%,#8C6517 75%,#E6BD51 100%); color: #3a1f00; }
.card--silver { background: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.45) 0%, transparent 50%), linear-gradient(160deg,#FAFAFA 0%,#8E94A0 22%,#E8EAEE 45%,#5C616C 75%,#DCDFE4 100%); color: #15171a; }
.card--bronze { background: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.35) 0%, transparent 50%), linear-gradient(160deg,#E3AC7B 0%,#7A3D11 22%,#C68850 45%,#4A230A 75%,#C6915D 100%); color: #1F0D00; }

.card-pattern { position: absolute; inset: 5px; border-radius: 18px; background: repeating-linear-gradient(135deg,transparent 0,transparent 12px,rgba(0,0,0,.05) 12px,rgba(0,0,0,.05) 13px), repeating-linear-gradient(45deg,transparent 0,transparent 20px,rgba(255,255,255,.06) 20px,rgba(255,255,255,.06) 21px); pointer-events: none; z-index: 1; }
.card-holo { position: absolute; inset: 5px; border-radius: 18px; background: conic-gradient(from var(--holo-angle,90deg) at 50% 50%, rgba(255,80,120,.22) 0deg, rgba(80,200,255,.22) 60deg, rgba(120,255,160,.22) 120deg, rgba(255,200,80,.22) 180deg, rgba(220,100,255,.22) 240deg, rgba(80,160,255,.22) 300deg, rgba(255,80,120,.22) 360deg); mix-blend-mode: color-dodge; pointer-events: none; z-index: 2; transition: --holo-angle .15s ease-out; }
.card-shine { position: absolute; top: 0; left: 0; width: 50%; height: 100%; background: linear-gradient(110deg,transparent 30%,rgba(255,255,255,.22) 50%,transparent 70%); transform: translateX(-100%) skewX(-15deg); animation: pcShimmer 5s ease-in-out infinite; animation-delay: 1.5s; pointer-events: none; z-index: 3; }
.card-sparkles { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
.card-sparkles span { position: absolute; width: var(--sp-size,2px); height: var(--sp-size,2px); background: rgba(255,255,255,.95); border-radius: 50%; box-shadow: 0 0 6px 2px rgba(255,255,255,.55), 0 0 12px 4px rgba(255,255,255,.25); animation: pcSparkle 3.2s ease-in-out infinite; }
.card-sparkles span:nth-child(2n) { animation-delay: .8s; animation-duration: 4.1s; }
.card-sparkles span:nth-child(3n) { animation-delay: 1.6s; animation-duration: 3.7s; }
.card-sparkles span:nth-child(4n) { animation-delay: 2.4s; }

.card-stamp { position: absolute; top: 16px; right: 14px; padding: 4px 9px; border-radius: 4px; background: rgba(0,0,0,.22); border: 1px solid rgba(0,0,0,.32); box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(0,0,0,.15); font-size: 9px; font-weight: 900; letter-spacing: .15em; z-index: 6; text-shadow: 0 1px 0 rgba(255,255,255,.18); font-family: 'Inter', sans-serif; }
.card-number { position: absolute; bottom: 14px; right: 16px; font-size: 9px; font-weight: 700; letter-spacing: .1em; opacity: .65; z-index: 6; font-variant-numeric: tabular-nums; text-shadow: 0 1px 0 rgba(255,255,255,.15); font-family: 'Inter', sans-serif; }

.card-inner { width: 100%; height: 100%; border-radius: 18px; padding: 18px 17px 14px; display: flex; flex-direction: column; position: relative; z-index: 5; font-family: 'Inter', sans-serif; }
.card-top { display: flex; gap: 10px; flex: 1; min-height: 0; margin-bottom: 12px; }
.card-meta { display: flex; flex-direction: column; align-items: center; width: 62px; flex-shrink: 0; padding-top: 2px; }
.card-rating { font-family: 'Anton', sans-serif; font-size: 58px; line-height: .85; font-weight: 400; letter-spacing: -.01em; text-shadow: 0 2px 0 rgba(255,255,255,.2), 0 -1px 0 rgba(0,0,0,.18); }
.card-pos { font-size: 13px; font-weight: 800; letter-spacing: .03em; margin-top: 3px; text-shadow: 0 1px 0 rgba(255,255,255,.18); display: flex; align-items: baseline; gap: 3px; }
.card-pos-sep { opacity: .55; }
.card-pos-alt { font-size: 11px; font-weight: 700; opacity: .75; }
.card-flag-wrap { width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,.12); border: 1.5px solid rgba(0,0,0,.28); margin-top: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-flag { font-size: 22px; line-height: 1; }
.card-country { font-size: 9px; font-weight: 800; letter-spacing: .12em; margin-top: 3px; opacity: .8; }
.card-photo { flex: 1; height: 100%; border-radius: 12px; overflow: hidden; position: relative; background: rgba(0,0,0,.1); box-shadow: inset 0 0 0 1px rgba(0,0,0,.2), inset 0 -8px 18px rgba(0,0,0,.2); }
.card-photo img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
.card-photo-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; letter-spacing: .1em; opacity: .4; text-align: center; }

.card-bottom { display: flex; flex-direction: column; }
.card-name { font-size: 19px; font-weight: 800; text-align: center; letter-spacing: -.005em; margin-bottom: 7px; text-shadow: 0 1px 0 rgba(255,255,255,.22); }
.card-divider { height: 1.5px; background: linear-gradient(90deg,transparent,currentColor 30%,currentColor 70%,transparent); opacity: .42; margin-bottom: 11px; }
.card-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px 10px; margin-bottom: 10px; }
.card-stat { display: flex; flex-direction: column; gap: 3px; }
.card-stat-row { display: flex; align-items: baseline; gap: 4px; justify-content: center; }
.card-stat-val { font-size: 17px; font-weight: 800; letter-spacing: -.02em; line-height: 1; }
.card-stat-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; opacity: .85; }
.card-stat-bar { width: 100%; height: 2.5px; background: rgba(0,0,0,.15); border-radius: 99px; overflow: hidden; }
.card-stat-bar-fill { height: 100%; background: currentColor; opacity: .58; border-radius: 99px; }
.card-footer { display: flex; justify-content: center; }
.card-club { width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,.16); border: 1.5px solid rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; letter-spacing: -.02em; }
`;