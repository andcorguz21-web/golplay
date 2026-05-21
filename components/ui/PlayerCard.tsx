// pages/jugadores/[slug].tsx
import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import PlayerCard, { PlayerCardData } from "@/components/ui/PlayerCard";

type Player = PlayerCardData & { id: string; slug: string };

export default function PerfilPublico({ player }: { player: Player | null }) {
  const router = useRouter();

  if (!player) {
    return (
      <>
        <style>{CSS}</style>
        <div className="jp"><div className="jp-notfound"><h2>Perfil no encontrado</h2><Link href="/" className="jp-link">Volver</Link></div></div>
      </>
    );
  }

  const displayLabel = player.alias || player.display_name;

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${displayLabel} — Rating ${player.rating} · GolPlay`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: "GolPlay", text, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert("Link copiado"); } catch {}
    }
  }

  return (
    <>
      <Head>
        <title>{displayLabel} — GolPlay</title>
        <meta property="og:title" content={`${displayLabel} — GolPlay`}/>
        <meta property="og:description" content={`Rating ${player.rating} · GolPlay`}/>
        {player.photo_url && <meta property="og:image" content={player.photo_url}/>}
      </Head>
      <style>{CSS}</style>
      <div className="jp">
        <header className="jp-header">
          <button className="jp-back" onClick={() => router.back()} aria-label="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Link href="/"><Image src="/logo-golplay.svg" alt="GolPlay" width={110} height={80} style={{objectFit:'contain'}}/></Link>
          <div style={{width:40}}/>
        </header>

        <div className="jp-content">
          <PlayerCard player={player}/>
          <button className="jp-share" onClick={share}>Compartir tarjeta</button>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = ctx.params?.slug as string;
  const { data } = await supabase.from("public_players").select("*").eq("slug", slug).maybeSingle();
  return { props: { player: data || null } };
};

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.jp{min-height:100vh;background:#0C0D0B;font-family:system-ui,-apple-system,sans-serif;color:#e2e8e0}
.jp-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
.jp-back{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8e0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.jp-content{max-width:380px;margin:0 auto;padding:32px 20px 80px;animation:fadeUp .35s ease both}
.jp-notfound{max-width:400px;margin:0 auto;padding:80px 20px;text-align:center}
.jp-notfound h2{font-size:32px;color:#fff;margin-bottom:16px;font-weight:600}
.jp-link{color:#4ade80;text-decoration:underline;font-size:14px}
.jp-share{width:100%;margin-top:24px;padding:15px;border-radius:12px;background:#16a34a;color:#fff;border:none;font-size:14px;font-weight:700;letter-spacing:.04em;cursor:pointer;box-shadow:0 3px 16px rgba(22,163,74,.35)}
.jp-share:hover{background:#15803d}
`