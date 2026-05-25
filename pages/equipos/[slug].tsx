// pages/equipos/[slug].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { GOLPLAY_BASE_CSS } from "@/lib/styles/golplay";

type Player = { id: string; name: string; slug: string; photo_url: string | null };
type Member = { id: string; role: "captain" | "member"; joined_at: string; player: Player };
type Team = {
  id: string; name: string; slug: string; logo_url: string | null;
  description: string | null; captain_player_id: string; created_at: string;
};
type TeamData = {
  team: Team; members: Member[]; is_captain: boolean;
  is_member: boolean; invite_url: string | null;
};

type PendingRequest = {
  id: string;
  message: string | null;
  proposed_date: string | null;
  proposed_hour: string | null;
  status: string;
  created_at: string;
  from_team: {
    id: string; name: string; slug: string;
    logo_url: string | null; description: string | null;
  } | null;
  requested_by: {
    id: string; name: string; slug: string; photo_url: string | null;
  } | null;
};

const CSS = `${GOLPLAY_BASE_CSS}
.page { min-height: 100vh; background: var(--dark); padding-top: 62px; }
.page .eyebrow { color: var(--g4); }
.page .h2 { color: #fff; }
.page .h2 em { color: var(--g4); }
.wrap { max-width: 880px; margin: 0 auto; padding: 32px clamp(16px,4vw,32px) 80px; }
.back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: #9ca3af; text-decoration: none;
  margin-bottom: 22px; font-weight: 500; padding: 5px 10px; border-radius: 8px;
  transition: all .15s;
}
.back:hover { color: #fff; background: rgba(255,255,255,.06); }
.hero-card {
  background: linear-gradient(150deg,#0d1f10 0%,#0a3018 60%,#062a12 100%);
  border: 1px solid rgba(74,222,128,.14);
  border-radius: var(--r-xl); padding: 44px 32px; position: relative;
  overflow: hidden; margin-bottom: 32px; animation: fadeUp .5s ease both;
}
.hero-card::before {
  content: ''; position: absolute; top: -40%; right: -20%;
  width: 280px; height: 280px; border-radius: 50%;
  background: radial-gradient(circle, rgba(22,163,74,.18) 0%, transparent 70%);
  pointer-events: none;
}
.hero-content { position: relative; z-index: 1; text-align: center; }
.team-logo-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  width: 120px; height: 120px;
  background: rgba(255,255,255,.05); border: 1.5px solid rgba(74,222,128,.2);
  border-radius: 24px; margin-bottom: 22px; overflow: hidden;
}
.team-logo-img { width: 100%; height: 100%; object-fit: cover; }
.team-logo-fallback {
  font-family: var(--font-d); font-size: 56px; font-weight: 800;
  color: var(--g4); line-height: 1;
}
.team-name {
  font-family: var(--font-d); font-size: clamp(32px,6.5vw,48px);
  font-weight: 800; margin: 0 0 8px; letter-spacing: -.02em; line-height: 1;
}
.team-name-accent {
  background: linear-gradient(110deg, var(--g4) 0%, #34d399 60%, #22d3ee 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.team-desc {
  color: rgba(255,255,255,.55); font-size: 14px; line-height: 1.65;
  max-width: 480px; margin: 0 auto 18px;
}
.team-meta {
  display: inline-flex; align-items: center; gap: 14px;
  font-size: 10px; color: rgba(255,255,255,.42);
  letter-spacing: .08em; text-transform: uppercase; font-weight: 600;
}
.meta-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,.2); }

.section { margin-bottom: 36px; }
.section-head { margin-bottom: 18px; }

/* Solicitudes pendientes (FASE 3) */
.requests-list { display: flex; flex-direction: column; gap: 12px; }
.request-card {
  background: rgba(255,255,255,.04);
  border: 1.5px solid rgba(255,255,255,.08); border-left: 4px solid var(--g6);
  border-radius: var(--r-lg); padding: 20px;
  transition: all .22s; animation: fadeUp .4s ease both;
}
.request-card:hover { background: rgba(255,255,255,.06); }
.rc-head {
  display: flex; gap: 14px; align-items: center;
  padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,.08);
  margin-bottom: 14px;
}
.rc-logo {
  width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
  background: rgba(255,255,255,.05); display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.rc-logo img { width: 100%; height: 100%; object-fit: cover; }
.rc-logo-fallback {
  color: var(--g4); font-family: var(--font-d);
  font-size: 20px; font-weight: 800; line-height: 1;
}
.rc-info { flex: 1; min-width: 0; }
.rc-team {
  font-family: var(--font-d); font-weight: 800; font-size: 16px;
  color: #fff; margin: 0 0 3px; letter-spacing: -.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rc-captain {
  font-size: 11px; color: #9ca3af;
  display: flex; align-items: center; gap: 6px; font-weight: 600;
}
.rc-time-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,.3); }
.rc-message {
  font-style: italic; color: rgba(255,255,255,.8);
  background: rgba(255,255,255,.03); border-radius: var(--r-md);
  padding: 11px 14px; font-size: 13.5px;
  line-height: 1.55; margin-bottom: 12px;
  border-left: 2px solid var(--g4);
}
.rc-proposal {
  display: flex; align-items: center; gap: 8px;
  background: rgba(34,197,94,.1); color: var(--g4);
  border: 1px solid rgba(74,222,128,.2);
  border-radius: var(--r-md); padding: 10px 14px;
  font-size: 13px; font-weight: 600; margin-bottom: 14px;
}
.rc-actions { display: flex; gap: 10px; }
.rc-btn {
  flex: 1; padding: 11px 14px; border-radius: var(--r-md);
  font-family: inherit; font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1.5px solid; transition: all .15s;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
}
.rc-btn:disabled { opacity: .55; cursor: not-allowed; }
.rc-btn.decline {
  background: rgba(255,255,255,.04); border-color: rgba(248,113,113,.3); color: #fca5a5;
}
.rc-btn.decline:hover:not(:disabled) {
  background: rgba(248,113,113,.1); border-color: rgba(248,113,113,.5);
}
.rc-btn.accept {
  background: var(--g6); border-color: var(--g6); color: #fff;
  font-family: var(--font-d); font-weight: 800;
}
.rc-btn.accept:hover:not(:disabled) {
  background: var(--g7); border-color: var(--g7);
}

/* Invite */
.invite-card {
  background: rgba(255,255,255,.04); border: 1.5px solid rgba(74,222,128,.2);
  border-radius: var(--r-lg); padding: 22px;
}
.invite-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.invite-icon {
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(34,197,94,.14); display: flex;
  align-items: center; justify-content: center; font-size: 16px;
}
.invite-title { font-family: var(--font-d); font-size: 15px; font-weight: 800; color: #fff; margin: 0; letter-spacing: -.01em; }
.invite-sub { font-size: 12px; color: #9ca3af; margin: 2px 0 0; }
.invite-row { display: flex; gap: 8px; align-items: stretch; }
.invite-input {
  flex: 1; padding: 11px 13px;
  border: 1.5px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03);
  font-family: ui-monospace, monospace; font-size: 11.5px;
  border-radius: var(--r-md); color: #9ca3af; min-width: 0; outline: none;
}
.invite-input:focus { border-color: var(--g4); }
.copy-btn {
  padding: 0 18px; background: var(--g6); color: #fff;
  border: none; font-family: var(--font-d); font-size: 13px;
  font-weight: 800; cursor: pointer; border-radius: var(--r-md);
  white-space: nowrap; letter-spacing: -.01em;
  transition: all .15s; box-shadow: 0 2px 10px rgba(22,163,74,.25);
}
.copy-btn:hover { background: var(--g7); transform: translateY(-1px); }
.copy-btn.copied { background: rgba(255,255,255,.14); }

/* Roster */
.roster {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.member-wrap { position: relative; }
.member-card {
  display: block; text-align: center; text-decoration: none; color: inherit;
  background: rgba(255,255,255,.04); border: 1.5px solid rgba(255,255,255,.08);
  border-radius: var(--r-lg); padding: 18px 10px;
  transition: all .22s cubic-bezier(.16,1,.3,1);
}
.member-card:hover { border-color: var(--g4); transform: translateY(-4px); background: rgba(255,255,255,.06); box-shadow: 0 12px 30px rgba(0,0,0,.4); }
.member-photo {
  width: 72px; height: 72px; border-radius: 50%;
  object-fit: cover; margin: 0 auto 10px; display: block; background: rgba(255,255,255,.08);
}
.member-photo-fallback {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(255,255,255,.05); color: var(--g4);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-d); font-size: 26px; font-weight: 800; margin: 0 auto 10px;
}
.member-name {
  font-weight: 600; font-size: 13px; color: #fff;
  margin: 0 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.captain-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 9px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--g4); font-weight: 700; background: rgba(34,197,94,.14);
  padding: 2px 8px; border-radius: 99px; border: 1px solid rgba(74,222,128,.25);
}
.remove-btn {
  position: absolute; top: 8px; right: 8px; z-index: 2;
  width: 24px; height: 24px; border-radius: 50%;
  background: #141914; border: 1.5px solid rgba(248,113,113,.4); color: #fca5a5;
  font-size: 14px; line-height: 1; cursor: pointer; padding: 0; font-family: inherit;
  display: flex; align-items: center; justify-content: center; transition: all .15s;
}
.remove-btn:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
.add-card {
  background: transparent; border: 1.5px dashed rgba(255,255,255,.12); border-radius: var(--r-lg);
  padding: 18px 10px; cursor: pointer; font-family: inherit; text-align: center; transition: all .15s;
}
.add-card:hover { background: rgba(74,222,128,.06); border-color: var(--g4); }
.add-icon {
  width: 72px; height: 72px; border-radius: 50%; background: rgba(255,255,255,.03);
  border: 1.5px dashed rgba(255,255,255,.12); display: flex; align-items: center; justify-content: center;
  font-size: 32px; color: #9ca3af; margin: 0 auto 10px; transition: all .15s;
}
.add-card:hover .add-icon { color: var(--g4); border-color: var(--g4); background: rgba(74,222,128,.06); }
.add-label { font-size: 12px; color: #9ca3af; font-weight: 600; transition: all .15s; }
.add-card:hover .add-label { color: var(--g4); }

/* Actions */
.actions { display: flex; flex-direction: column; gap: 10px; margin-top: 32px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,.08); }
.action-btn {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border: 1.5px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04);
  font-family: inherit; font-size: 14px; cursor: pointer; border-radius: var(--r-md);
  color: #fff; font-weight: 600; transition: all .15s;
}
.action-btn:hover { border-color: rgba(255,255,255,.3); background: rgba(255,255,255,.06); }
.action-btn.danger { color: #fca5a5; border-color: rgba(248,113,113,.3); }
.action-btn.danger:hover { background: rgba(248,113,113,.1); border-color: rgba(248,113,113,.5); }
.action-btn-arrow { color: #9ca3af; }

/* Modals */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000; padding: 24px; animation: fadeIn .2s ease; backdrop-filter: blur(4px);
}
.modal {
  background: var(--dark2); border: 1px solid rgba(255,255,255,.1); border-radius: var(--r-xl); padding: 28px;
  max-width: 440px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.6);
  animation: popIn .2s ease;
}
.modal-emoji { font-size: 36px; margin-bottom: 12px; }
.modal-title {
  font-family: var(--font-d); font-size: 24px; font-weight: 800;
  margin: 0 0 8px; line-height: 1.15; letter-spacing: -.02em; color: #fff;
}
.modal-subtitle { color: #9ca3af; font-size: 14px; margin: 0 0 22px; line-height: 1.5; }
.modal-input {
  width: 100%; padding: 13px 14px; border: 1.5px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04);
  font-family: inherit; font-size: 15px; border-radius: var(--r-md);
  outline: none; margin-bottom: 14px; color: #fff;
}
.modal-input::placeholder { color: rgba(255,255,255,.3); }
.modal-input:focus { border-color: var(--g4); box-shadow: 0 0 0 4px rgba(74,222,128,.12); }
.modal-row { display: flex; gap: 10px; margin-top: 6px; }
.modal-btn {
  flex: 1; padding: 13px; border: 1.5px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04);
  font-family: inherit; font-size: 14px; cursor: pointer; border-radius: var(--r-md);
  color: #fff; font-weight: 600; transition: all .15s;
}
.modal-btn:hover { background: rgba(255,255,255,.06); }
.modal-btn.primary { background: var(--g6); color: #fff; border-color: var(--g6); font-family: var(--font-d); font-weight: 800; }
.modal-btn.primary:hover { background: var(--g7); border-color: var(--g7); }
.modal-btn.primary:disabled { opacity: .55; cursor: not-allowed; }
.modal-btn.danger { background: #ef4444; color: #fff; border-color: #ef4444; font-family: var(--font-d); font-weight: 800; }
.modal-btn.danger:hover { background: #dc2626; border-color: #dc2626; }
.modal-error {
  padding: 11px 13px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3);
  color: #fca5a5; border-radius: var(--r-md); font-size: 13px; margin-bottom: 14px; font-weight: 500;
}
.error-card {
  background: rgba(255,255,255,.04); border: 1.5px solid rgba(255,255,255,.08); border-radius: var(--r-xl);
  padding: 40px 28px; text-align: center; margin: 12px 0;
}
.loading-state { text-align: center; padding: 80px 24px; color: #9ca3af; }

@media (max-width: 640px) {
  .hero-card { padding: 32px 22px; }
  .team-logo-wrap { width: 100px; height: 100px; }
  .team-logo-fallback { font-size: 48px; }
  .rc-actions { flex-direction: column; }
}
`;

function teamInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}
function memberInitials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function memberCountLabel(n: number): string {
  return n === 1 ? "1 miembro" : `${n} miembros`;
}
function daysSince(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  if (d < 30) return `hace ${Math.floor(d / 7)} sem`;
  return `hace ${Math.floor(d / 30)} meses`;
}
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} días`;
  if (d < 30) return `hace ${Math.floor(d / 7)} sem`;
  return `hace ${Math.floor(d / 30)} meses`;
}
function formatProposal(date: string | null, hour: string | null): string {
  const parts: string[] = [];
  if (date) {
    const d = new Date(date + "T12:00:00");
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    parts.push(`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`);
  }
  if (hour) parts.push(hour.slice(0, 5));
  return parts.join(" · ");
}

export default function TeamPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [showRemove, setShowRemove] = useState<Member | null>(null);
  const [showLeave, setShowLeave] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [addCedula, setAddCedula] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  async function fetchTeam() {
    if (!slug || typeof slug !== "string") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Equipo no encontrado");
      else {
        setData(json);
        setEditName(json.team.name);
        setEditDesc(json.team.description ?? "");
      }
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPending(teamId: string) {
    try {
      const res = await fetch("/api/teams/list_pending_requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ team_id: teamId }),
      });
      const json = await res.json();
      if (res.ok) setPendingRequests(json.requests ?? []);
    } catch {}
  }

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (data?.is_captain && data?.team?.id) {
      fetchPending(data.team.id);
    }
  }, [data?.is_captain, data?.team?.id]);

  async function handleCopyInvite() {
    if (!data?.invite_url) return;
    try {
      await navigator.clipboard.writeText(data.invite_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleRespond(requestId: string, action: "accept" | "decline") {
    if (!data) return;
    setRespondingId(requestId);
    setRespondError(null);
    try {
      const res = await fetch("/api/teams/respond_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ request_id: requestId, action }),
      });
      const json = await res.json();
      if (!res.ok) setRespondError(json.error ?? "Error al responder");
      else await fetchPending(data.team.id);
    } catch (e: any) {
      setRespondError(e?.message ?? "Error inesperado");
    } finally {
      setRespondingId(null);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setAddError(null);
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/teams/add_member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ team_id: data.team.id, cedula: addCedula }),
      });
      const json = await res.json();
      if (!res.ok) setAddError(json.error ?? "No se pudo agregar");
      else {
        setShowAdd(false);
        setAddCedula("");
        await fetchTeam();
      }
    } catch (e: any) {
      setAddError(e?.message ?? "Error");
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleRemove(member: Member) {
    if (!data) return;
    setActionError(null);
    try {
      const res = await fetch("/api/teams/remove_member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ team_id: data.team.id, player_id: member.player.id }),
      });
      const json = await res.json();
      if (!res.ok) setActionError(json.error ?? "Error");
      else {
        setShowRemove(null);
        await fetchTeam();
      }
    } catch (e: any) {
      setActionError(e?.message ?? "Error");
    }
  }

  async function handleLeave() {
    if (!data) return;
    try {
      const res = await fetch("/api/teams/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ team_id: data.team.id }),
      });
      if (res.ok) router.push("/equipos");
    } catch {}
  }

  async function handleDelete() {
    if (!data) return;
    try {
      const res = await fetch("/api/teams/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ team_id: data.team.id }),
      });
      if (res.ok) router.push("/equipos");
    } catch {}
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      const res = await fetch("/api/teams/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          team_id: data.team.id,
          name: editName,
          description: editDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) setEditError(json.error ?? "Error");
      else {
        setShowEdit(false);
        await fetchTeam();
      }
    } catch (e: any) {
      setEditError(e?.message ?? "Error");
    } finally {
      setEditSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <Navbar dark={true} />
        <div className="page">
          <div className="loading-state">Cargando equipo…</div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Head><title>Equipo · GolPlay</title></Head>
        <style>{CSS}</style>
        <Navbar dark={true} />
        <div className="page">
          <div className="wrap">
            <Link href="/equipos" className="back">← Mis equipos</Link>
            <div className="error-card">
              <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🔍</span>
              <h2 style={{ fontFamily: "var(--font-d)", fontSize: 22, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-.02em", color: "#fff" }}>
                {error ?? "Equipo no encontrado"}
              </h2>
              <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Volvé a tus equipos.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { team, members, is_captain, is_member, invite_url } = data;

  return (
    <>
      <Head><title>{team.name} · GolPlay</title></Head>
      <style>{CSS}</style>
      <Navbar dark={true} />

      <div className="page">
        <div className="wrap">
          {is_member && (
            <Link href="/equipos" className="back">← Mis equipos</Link>
          )}

          <div className="hero-card">
            <div className="hero-content">
              <div className="team-logo-wrap">
                {team.logo_url
                  ? <img src={team.logo_url} alt={team.name} className="team-logo-img" />
                  : <span className="team-logo-fallback">{teamInitial(team.name)}</span>}
              </div>
              <h1 className="team-name">
                <span className="team-name-accent">{team.name}</span>
              </h1>
              {team.description && <p className="team-desc">{team.description}</p>}
              <div className="team-meta">
                <span>{memberCountLabel(members.length)}</span>
                <span className="meta-dot" />
                <span>creado {daysSince(team.created_at)}</span>
              </div>
            </div>
          </div>

          {is_captain && pendingRequests.length > 0 && (
            <div className="section">
              <div className="section-head">
                <p className="eyebrow">Tenés rivales esperando</p>
                <h2 className="h2" style={{ fontSize: "clamp(22px,5vw,32px)" }}>
                  Solicitudes <em>pendientes.</em>
                </h2>
              </div>
              {respondError && <div className="modal-error">{respondError}</div>}
              <div className="requests-list">
                {pendingRequests.map((r) => (
                  <div key={r.id} className="request-card">
                    <div className="rc-head">
                      <div className="rc-logo">
                        {r.from_team?.logo_url
                          ? <img src={r.from_team.logo_url} alt={r.from_team.name} />
                          : <span className="rc-logo-fallback">
                              {teamInitial(r.from_team?.name ?? "?")}
                            </span>}
                      </div>
                      <div className="rc-info">
                        <div className="rc-team">{r.from_team?.name ?? "Equipo eliminado"}</div>
                        <div className="rc-captain">
                          <span>Cap. {r.requested_by?.name ?? "desconocido"}</span>
                          <span className="rc-time-dot" />
                          <span>{timeAgo(r.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {r.message && (
                      <div className="rc-message">"{r.message}"</div>
                    )}

                    {(r.proposed_date || r.proposed_hour) && (
                      <div className="rc-proposal">
                        <span>📅</span>
                        <span>Propuesta: {formatProposal(r.proposed_date, r.proposed_hour)}</span>
                      </div>
                    )}

                    <div className="rc-actions">
                      <button
                        type="button"
                        className="rc-btn decline"
                        onClick={() => handleRespond(r.id, "decline")}
                        disabled={respondingId === r.id}
                      >
                        {respondingId === r.id ? "..." : "Rechazar"}
                      </button>
                      <button
                        type="button"
                        className="rc-btn accept"
                        onClick={() => handleRespond(r.id, "accept")}
                        disabled={respondingId === r.id}
                      >
                        {respondingId === r.id ? "..." : "Aceptar reto"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {is_captain && invite_url && (
            <div className="section">
              <div className="invite-card">
                <div className="invite-head">
                  <div className="invite-icon">🔗</div>
                  <div>
                    <h3 className="invite-title">Link de invitación</h3>
                    <p className="invite-sub">Compartilo por WhatsApp para que se sumen</p>
                  </div>
                </div>
                <div className="invite-row">
                  <input
                    type="text" readOnly value={invite_url}
                    className="invite-input"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    className={"copy-btn" + (copied ? " copied" : "")}
                    onClick={handleCopyInvite}
                  >
                    {copied ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="section">
            <div className="section-head">
              <p className="eyebrow">Plantilla · {memberCountLabel(members.length)}</p>
              <h2 className="h2" style={{ fontSize: "clamp(22px,5vw,32px)" }}>
                Los <em>jugadores.</em>
              </h2>
            </div>
            <div className="roster">
              {members.map((m) => (
                <div key={m.id} className="member-wrap">
                  <Link href={"/jugadores/" + m.player.slug} className="member-card">
                    {m.player.photo_url
                      ? <img src={m.player.photo_url} alt={m.player.name} className="member-photo" />
                      : <div className="member-photo-fallback">{memberInitials(m.player.name)}</div>}
                    <div className="member-name">{m.player.name}</div>
                    {m.role === "captain" && <span className="captain-badge">CAPITÁN</span>}
                  </Link>
                  {is_captain && m.role !== "captain" && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => setShowRemove(m)}
                      title="Remover"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {is_captain && (
                <button type="button" className="add-card" onClick={() => setShowAdd(true)}>
                  <div className="add-icon">+</div>
                  <div className="add-label">Agregar</div>
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <div className="modal-error" style={{ marginBottom: 16 }}>{actionError}</div>
          )}

          {is_captain && (
            <div className="actions">
              <button type="button" className="action-btn" onClick={() => setShowEdit(true)}>
                <span>Editar nombre y descripción</span>
                <span className="action-btn-arrow">→</span>
              </button>
              <button type="button" className="action-btn danger" onClick={() => setShowDelete(true)}>
                <span>Eliminar equipo</span>
                <span className="action-btn-arrow">→</span>
              </button>
            </div>
          )}

          {is_member && !is_captain && (
            <div className="actions">
              <button type="button" className="action-btn danger" onClick={() => setShowLeave(true)}>
                <span>Salir del equipo</span>
                <span className="action-btn-arrow">→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">👤</div>
            <h2 className="modal-title">Agregar jugador</h2>
            <p className="modal-subtitle">Ingresá la cédula. El jugador tiene que tener perfil en GolPlay.</p>
            <form onSubmit={handleAddMember}>
              {addError && <div className="modal-error">{addError}</div>}
              <input
                type="text" inputMode="numeric" value={addCedula}
                onChange={(e) => setAddCedula(e.target.value)}
                placeholder="123456789" maxLength={11} autoFocus className="modal-input"
              />
              <div className="modal-row">
                <button type="button" className="modal-btn" onClick={() => setShowAdd(false)}>Cancelar</button>
                <button type="submit" className="modal-btn primary" disabled={addSubmitting}>
                  {addSubmitting ? "Agregando…" : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRemove && (
        <div className="modal-overlay" onClick={() => setShowRemove(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">👋</div>
            <h2 className="modal-title">¿Remover a {showRemove.player.name}?</h2>
            <p className="modal-subtitle">Va a salir del equipo. Podés volver a agregarlo después.</p>
            <div className="modal-row">
              <button type="button" className="modal-btn" onClick={() => setShowRemove(null)}>Cancelar</button>
              <button type="button" className="modal-btn danger" onClick={() => showRemove && handleRemove(showRemove)}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {showLeave && (
        <div className="modal-overlay" onClick={() => setShowLeave(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">🚪</div>
            <h2 className="modal-title">¿Salir del equipo?</h2>
            <p className="modal-subtitle">Vas a dejar de ser miembro de {team.name}.</p>
            <div className="modal-row">
              <button type="button" className="modal-btn" onClick={() => setShowLeave(false)}>Cancelar</button>
              <button type="button" className="modal-btn danger" onClick={handleLeave}>Salir</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">⚠️</div>
            <h2 className="modal-title">¿Eliminar {team.name}?</h2>
            <p className="modal-subtitle">El equipo desaparece para todos los miembros. Esta acción no se puede deshacer.</p>
            <div className="modal-row">
              <button type="button" className="modal-btn" onClick={() => setShowDelete(false)}>Cancelar</button>
              <button type="button" className="modal-btn danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">✏️</div>
            <h2 className="modal-title">Editar equipo</h2>
            <p className="modal-subtitle">Actualizá el nombre y la descripción.</p>
            <form onSubmit={handleEdit}>
              {editError && <div className="modal-error">{editError}</div>}
              <input
                type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del equipo" maxLength={50} className="modal-input"
              />
              <textarea
                value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descripción (opcional)" maxLength={300} className="modal-input" rows={3}
                style={{ resize: "vertical", minHeight: 80, fontFamily: "inherit" }}
              />
              <div className="modal-row">
                <button type="button" className="modal-btn" onClick={() => setShowEdit(false)}>Cancelar</button>
                <button type="submit" className="modal-btn primary" disabled={editSubmitting}>
                  {editSubmitting ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}