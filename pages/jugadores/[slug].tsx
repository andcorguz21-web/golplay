// pages/jugadores/[slug].tsx
import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/ui/Navbar";

type Player = {
  id: string;
  display_name: string;
  alias: string | null;
  position: string | null;
  photo_url: string | null;
  slug: string;
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

function cardNumber(id: string): string {
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

export default function PerfilPublico({ player }: { player: Player | null }) {
  const [toast, setToast] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  // Parallax 3D — mouse
  function handleMouseMove(e: React.MouseEvent) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const card = wrap.querySelector(".card") as HTMLElement | null;
    const holo = wrap.querySelector(".card-holo") as HTMLElement | null;
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (card) {
      card.style.transform = `rotateY(${(x - 0.5) * 14}deg) rotateX(${-(y - 0.5) * 14}deg)`;
    }
    if (holo) {
      holo.style.setProperty("--holo-angle", `${x * 360 + y * 180}deg`);
    }
  }
  function handleMouseLeave() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const card = wrap.querySelector(".card") as HTMLElement | null;
    if (card) card.style.transform = "";
  }

  // Parallax 3D — mobile gyroscope
  useEffect(() => {
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
      if (holo) {
        holo.style.setProperty("--holo-angle", `${(rotateY + 12) * 15 + (rotateX + 12) * 10}deg`);
      }
    }

    const DeviceEvt: any = typeof window !== "undefined" ? (window as any).DeviceOrientationEvent : null;
    if (DeviceEvt && typeof DeviceEvt.requestPermission === "function") {
      const wrap = wrapRef.current;
      const requestPermission = async () => {
        try {
          const p = await DeviceEvt.requestPermission();
          if (p === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
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
  }, []);

  if (!player) {
    return (
      <>
        <style>{CSS}</style>
        <Navbar dark={true} />
        <div className="page">
          <div className="not-found">
            <h2>Perfil no encontrado</h2>
            <Link href="/" className="link-back">Volver al inicio</Link>
          </div>
        </div>
      </>
    );
  }

  const tier = getTier(player.rating);
  const cardName = (player.alias || player.display_name.split(" ").slice(-1)[0]).toUpperCase();
  const posLabel = player.position ? POSITION_LABELS[player.position] : "JUG";
  const altLabel = player.position ? POSITION_ALT[player.position] : "—";
  const stamp = TIER_STAMP[tier];
  const cardNum = cardNumber(player.id);
  const displayLabel = player.alias || player.display_name;

  const stats: Array<[number, string]> = [
    [player.rit, "RIT"], [player.tir, "TIR"], [player.pas, "PAS"],
    [player.reg, "REG"], [player.def, "DEF"], [player.fis, "FÍS"],
  ];

  const url = typeof window !== "undefined" ? window.location.href : "";

  async function generateCardImage(): Promise<{ blob: Blob; dataUrl: string } | null> {
    if (!wrapRef.current) return null;
    const card = wrapRef.current.querySelector(".card") as HTMLElement | null;
    const originalTransform = card?.style.transform;
    if (card) card.style.transform = "";

    const { toPng } = await import("html-to-image");
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 60));

    const dataUrl = await toPng(wrapRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "transparent",
      filter: (node: any) => !node.classList?.contains?.("card-shine"),
    });

    if (card && originalTransform !== undefined) card.style.transform = originalTransform;
    const blob = await (await fetch(dataUrl)).blob();
    return { blob, dataUrl };
  }

  function canShareFiles(file: File): boolean {
    return !!(navigator.canShare && navigator.canShare({ files: [file] }));
  }

  function triggerDownload(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function shareWhatsApp() {
    setIsGenerating(true);
    try {
      const result = await generateCardImage();
      if (!result) return;
      const file = new File([result.blob], "golplay-card.png", { type: "image/png" });
      const text = `Mirá mi tarjeta en GolPlay 🇨🇷⚽\n${displayLabel} · Rating ${player!.rating}\n${url}`;
      if (canShareFiles(file)) {
        try { await navigator.share({ files: [file], text }); } catch {}
      } else {
        triggerDownload(result.dataUrl, "golplay-card.png");
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        showToast("Imagen descargada. Adjuntala en WhatsApp.");
      }
    } catch (e) {
      console.error(e);
      showToast("No se pudo generar la imagen");
    } finally { setIsGenerating(false); }
  }

  async function shareInstagram() {
    setIsGenerating(true);
    try {
      const result = await generateCardImage();
      if (!result) return;
      const file = new File([result.blob], "golplay-card.png", { type: "image/png" });
      if (canShareFiles(file)) {
        try { await navigator.share({ files: [file], title: "Mi tarjeta GolPlay" }); } catch {}
      } else {
        triggerDownload(result.dataUrl, "golplay-card.png");
        showToast("Imagen descargada. Subila a tu story desde el celular.");
      }
    } catch (e) {
      console.error(e);
      showToast("No se pudo generar la imagen");
    } finally { setIsGenerating(false); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copiado");
    } catch { showToast("No se pudo copiar"); }
  }

  return (
    <>
      <Head>
        <title>{displayLabel} — GolPlay</title>
        <meta property="og:title" content={`${displayLabel} — GolPlay`} />
        <meta property="og:description" content={`Rating ${player.rating} · GolPlay`} />
        {player.photo_url && <meta property="og:image" content={player.photo_url} />}
      </Head>

      <style>{CSS}</style>

      <Navbar dark={true} />

      <div className="page">
        <div className="content">
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
                    {player.photo_url ? (
                      <img src={player.photo_url} alt={cardName} crossOrigin="anonymous" />
                    ) : (
                      <div className="card-photo-empty">SIN FOTO</div>
                    )}
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

          <div className="share-grid">
            <button className="btn-share btn-share--wa" onClick={shareWhatsApp} disabled={isGenerating}>
              {isGenerating ? <span className="spinner" /> : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              )}
              <span>WhatsApp</span>
            </button>
            <button className="btn-share btn-share--ig" onClick={shareInstagram} disabled={isGenerating}>
              {isGenerating ? <span className="spinner" /> : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              )}
              <span>Instagram</span>
            </button>
          </div>

          <button className="btn-copy" onClick={copyLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            Copiar link
          </button>
        </div>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = ctx.params?.slug as string;
  const { data } = await supabase
    .from("public_players")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return { props: { player: data || null } };
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800;900&display=swap');

@property --holo-angle {
  syntax: '<angle>';
  initial-value: 90deg;
  inherits: false;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes shimmer {
  0% { transform: translateX(-100%) skewX(-15deg); }
  60%, 100% { transform: translateX(220%) skewX(-15deg); }
}
@keyframes sparkleFloat {
  0%, 100% { opacity: .9; transform: scale(1); }
  50% { opacity: .4; transform: scale(.7); }
}
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.page { min-height: 100vh; padding-top: 62px; background: #121628; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #e7ebf3; }
.content { max-width: 400px; margin: 0 auto; padding: 40px 20px 80px; animation: fadeUp .4s ease both; }
.not-found { max-width: 400px; margin: 0 auto; padding: 80px 20px; text-align: center; }
.not-found h2 { font-size: 28px; color: #fff; margin-bottom: 16px; font-weight: 600; }
.link-back { color: #d4f24d; text-decoration: underline; font-size: 14px; }

/* ============ CARD WRAPPER ============ */
.card-wrap {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  perspective: 1200px;
  cursor: pointer;
}
.card-wrap--gold {
  filter:
    drop-shadow(0 0 28px rgba(255, 215, 110, .35))
    drop-shadow(0 24px 50px rgba(196,140,30,.45))
    drop-shadow(0 8px 18px rgba(0,0,0,.5));
}
.card-wrap--silver {
  filter:
    drop-shadow(0 0 24px rgba(220, 225, 235, .25))
    drop-shadow(0 24px 50px rgba(140,148,160,.35))
    drop-shadow(0 8px 18px rgba(0,0,0,.5));
}
.card-wrap--bronze {
  filter:
    drop-shadow(0 0 24px rgba(220, 145, 80, .28))
    drop-shadow(0 24px 50px rgba(139,69,19,.35))
    drop-shadow(0 8px 18px rgba(0,0,0,.5));
}

/* ============ CARD ============ */
.card {
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 22px;
  padding: 5px;
  position: relative;
  overflow: hidden;
  transform-style: preserve-3d;
  transition: transform .4s cubic-bezier(.2,.8,.3,1);
  box-shadow:
    inset 0 0 0 1.5px rgba(255,255,255,.4),
    inset 0 0 0 4px rgba(0,0,0,.14),
    inset 0 1px 0 rgba(255,255,255,.45),
    inset 0 -1px 0 rgba(0,0,0,.22);
}

.card--gold { background: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.45) 0%, transparent 50%), linear-gradient(160deg, #FFE07A 0%, #C68F1F 22%, #FFEC9C 45%, #8C6517 75%, #E6BD51 100%); color: #3a1f00; }
.card--silver { background: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.45) 0%, transparent 50%), linear-gradient(160deg, #FAFAFA 0%, #8E94A0 22%, #E8EAEE 45%, #5C616C 75%, #DCDFE4 100%); color: #15171a; }
.card--bronze { background: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.35) 0%, transparent 50%), linear-gradient(160deg, #E3AC7B 0%, #7A3D11 22%, #C68850 45%, #4A230A 75%, #C6915D 100%); color: #1F0D00; }

/* ============ EFFECTS LAYERS ============ */
.card-pattern {
  position: absolute; inset: 5px; border-radius: 18px;
  background:
    repeating-linear-gradient(135deg, transparent 0, transparent 12px, rgba(0,0,0,.05) 12px, rgba(0,0,0,.05) 13px),
    repeating-linear-gradient(45deg, transparent 0, transparent 20px, rgba(255,255,255,.06) 20px, rgba(255,255,255,.06) 21px);
  pointer-events: none; z-index: 1;
}

.card-holo {
  position: absolute; inset: 5px; border-radius: 18px;
  background: conic-gradient(
    from var(--holo-angle, 90deg) at 50% 50%,
    rgba(255, 80, 120, .22) 0deg,
    rgba(80, 200, 255, .22) 60deg,
    rgba(120, 255, 160, .22) 120deg,
    rgba(255, 200, 80, .22) 180deg,
    rgba(220, 100, 255, .22) 240deg,
    rgba(80, 160, 255, .22) 300deg,
    rgba(255, 80, 120, .22) 360deg
  );
  mix-blend-mode: color-dodge;
  pointer-events: none; z-index: 2;
  transition: --holo-angle .15s ease-out;
}

.card-shine {
  position: absolute; top: 0; left: 0; width: 50%; height: 100%;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.22) 50%, transparent 70%);
  transform: translateX(-100%) skewX(-15deg);
  animation: shimmer 5s ease-in-out infinite;
  animation-delay: 1.5s;
  pointer-events: none; z-index: 3;
}

.card-sparkles { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
.card-sparkles span {
  position: absolute;
  width: var(--sp-size, 2px);
  height: var(--sp-size, 2px);
  background: rgba(255,255,255,.95);
  border-radius: 50%;
  box-shadow:
    0 0 6px 2px rgba(255,255,255,.55),
    0 0 12px 4px rgba(255,255,255,.25);
  animation: sparkleFloat 3.2s ease-in-out infinite;
}
.card-sparkles span:nth-child(2n) { animation-delay: .8s; animation-duration: 4.1s; }
.card-sparkles span:nth-child(3n) { animation-delay: 1.6s; animation-duration: 3.7s; }
.card-sparkles span:nth-child(4n) { animation-delay: 2.4s; }

/* ============ BADGES ABSOLUTOS ============ */
.card-stamp {
  position: absolute; top: 16px; right: 14px;
  padding: 4px 9px;
  border-radius: 4px;
  background: rgba(0,0,0,.22);
  border: 1px solid rgba(0,0,0,.32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(0,0,0,.15);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .15em;
  z-index: 6;
  text-shadow: 0 1px 0 rgba(255,255,255,.18);
}

.card-number {
  position: absolute; bottom: 14px; right: 16px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .1em;
  opacity: .65;
  z-index: 6;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 0 rgba(255,255,255,.15);
}

/* ============ INNER CONTENT ============ */
.card-inner { width: 100%; height: 100%; border-radius: 18px; padding: 18px 17px 14px; display: flex; flex-direction: column; position: relative; z-index: 5; }

.card-top { display: flex; gap: 10px; flex: 1; min-height: 0; margin-bottom: 12px; }

.card-meta { display: flex; flex-direction: column; align-items: center; width: 62px; flex-shrink: 0; padding-top: 2px; }
.card-rating {
  font-family: 'Anton', sans-serif;
  font-size: 58px;
  line-height: .85;
  font-weight: 400;
  letter-spacing: -.01em;
  text-shadow: 0 2px 0 rgba(255,255,255,.2), 0 -1px 0 rgba(0,0,0,.18);
}
.card-pos {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .03em;
  margin-top: 3px;
  text-shadow: 0 1px 0 rgba(255,255,255,.18);
  display: flex; align-items: baseline; gap: 3px;
}
.card-pos-sep { opacity: .55; }
.card-pos-alt { font-size: 11px; font-weight: 700; opacity: .75; }

.card-flag-wrap {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,.12);
  border: 1.5px solid rgba(0,0,0,.28);
  margin-top: 10px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.card-flag { font-size: 22px; line-height: 1; }
.card-country {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .12em;
  margin-top: 3px;
  opacity: .8;
}

.card-photo { flex: 1; height: 100%; border-radius: 12px; overflow: hidden; position: relative; background: rgba(0,0,0,.1); box-shadow: inset 0 0 0 1px rgba(0,0,0,.2), inset 0 -8px 18px rgba(0,0,0,.2); }
.card-photo img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
.card-photo-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; letter-spacing: .1em; opacity: .4; text-align: center; }

.card-bottom { display: flex; flex-direction: column; }
.card-name { font-size: 19px; font-weight: 800; text-align: center; letter-spacing: -.005em; margin-bottom: 7px; text-shadow: 0 1px 0 rgba(255,255,255,.22); }
.card-divider { height: 1.5px; background: linear-gradient(90deg, transparent, currentColor 30%, currentColor 70%, transparent); opacity: .42; margin-bottom: 11px; }
.card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px 10px; margin-bottom: 10px; }
.card-stat { display: flex; flex-direction: column; gap: 3px; }
.card-stat-row { display: flex; align-items: baseline; gap: 4px; justify-content: center; }
.card-stat-val { font-size: 17px; font-weight: 800; letter-spacing: -.02em; line-height: 1; }
.card-stat-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; opacity: .85; }
.card-stat-bar { width: 100%; height: 2.5px; background: rgba(0,0,0,.15); border-radius: 99px; overflow: hidden; }
.card-stat-bar-fill { height: 100%; background: currentColor; opacity: .58; border-radius: 99px; }
.card-footer { display: flex; justify-content: center; }
.card-club { width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,.16); border: 1.5px solid rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; letter-spacing: -.02em; }

/* ============ SHARE BUTTONS ============ */
.share-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 32px; }
.btn-share { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; border: none; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: .01em; cursor: pointer; color: #fff; transition: transform .15s, filter .15s; min-height: 50px; }
.btn-share:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.btn-share:active { transform: translateY(0); }
.btn-share:disabled { opacity: .6; cursor: wait; }
.btn-share--wa { background: #25D366; box-shadow: 0 4px 14px rgba(37,211,102,.35); }
.btn-share--ig { background: linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #FCAF45 100%); box-shadow: 0 4px 14px rgba(225,48,108,.35); }
.btn-share svg { display: block; }

.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }

.btn-copy { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 10px; padding: 11px; background: transparent; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: rgba(255,255,255,.6); font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: .02em; cursor: pointer; transition: background .15s, color .15s; }
.btn-copy:hover { background: rgba(255,255,255,.04); color: rgba(255,255,255,.85); }

.toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #1a1d1a; color: #fff; padding: 12px 18px; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,.1); box-shadow: 0 8px 30px rgba(0,0,0,.5); z-index: 100; animation: toastIn .25s ease both; max-width: 90%; text-align: center; }
`;