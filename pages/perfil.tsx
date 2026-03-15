/**
 * GolPlay — pages/perfil.tsx
 * Perfil del usuario: datos, historial de reservas, favoritos.
 * Dark theme + green accents — consistente con landing de GolPlay.
 */

import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

interface Profile { first_name: string; last_name: string; phone: string | null; role: string; complex_name: string | null; country: string; currency: string; created_at: string }
interface BookingHistory { id: number; date: string; hour: string; status: string; price: number | null; field_name: string; field_sport: string | null; field_location: string | null }
interface FavoriteField { favoriteId: number; fieldId: number; name: string; sport: string | null; location: string | null; image: string | null }

const SPORT_META: Record<string, { label: string; emoji: string }> = { futbol5:{label:'Fútbol 5',emoji:'⚽'}, futbol7:{label:'Fútbol 7',emoji:'⚽'}, futbol11:{label:'Fútbol 11',emoji:'⚽'}, padel:{label:'Pádel',emoji:'🎾'}, tenis:{label:'Tenis',emoji:'🎾'}, basquet:{label:'Básquet',emoji:'🏀'}, voleibol:{label:'Voleibol',emoji:'🏐'}, multiuso:{label:'Multiuso',emoji:'🏟️'}, otro:{label:'Otro',emoji:'🏅'} }
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = { confirmed:{label:'Confirmada',color:'#4ade80',bg:'rgba(74,222,128,.12)'}, pending:{label:'Pendiente',color:'#fbbf24',bg:'rgba(251,191,36,.12)'}, cancelled:{label:'Cancelada',color:'#6b7280',bg:'rgba(107,114,128,.12)'}, completed:{label:'Completada',color:'#60a5fa',bg:'rgba(96,165,250,.12)'}, no_show:{label:'No asistió',color:'#f87171',bg:'rgba(248,113,113,.12)'} }
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=400&q=60'
const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR')}`
const fmtDate = (d: string) => { try { return new Date(d+'T00:00:00').toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'}) } catch { return d } }

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [bookings, setBookings] = useState<BookingHistory[]>([])
  const [favorites, setFavorites] = useState<FavoriteField[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings'|'favorites'>('bookings')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({first_name:'',last_name:'',phone:''})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string|null>(null)
  const showToast = useCallback((msg:string)=>{setToast(msg);setTimeout(()=>setToast(null),3000)},[])

  useEffect(()=>{;(async()=>{
    const {data:userData}=await supabase.auth.getUser()
    if(!userData.user){router.push('/login');return}
    const userId=userData.user.id; setEmail(userData.user.email??'')
    const {data:prof}=await supabase.from('profiles').select('first_name,last_name,phone,role,complex_name,country,currency,created_at').eq('id',userId).single()
    if(prof){setProfile(prof);setEditForm({first_name:prof.first_name||'',last_name:prof.last_name||'',phone:prof.phone||''})}
    const {data:bData}=await supabase.from('bookings').select('id,date,hour,status,price,field_id').eq('user_id',userId).order('date',{ascending:false}).limit(50)
    if(bData&&bData.length>0){
      const fieldIds=[...new Set(bData.map((b:any)=>b.field_id))]
      const {data:fields}=await supabase.from('fields').select('id,name,sport,location').in('id',fieldIds)
      const fm=new Map((fields||[]).map((f:any)=>[f.id,f]))
      setBookings(bData.map((b:any)=>{const f=fm.get(b.field_id);return{id:b.id,date:b.date,hour:b.hour,status:b.status||'confirmed',price:b.price?Number(b.price):null,field_name:f?.name??'Cancha eliminada',field_sport:f?.sport??null,field_location:f?.location??null}}))
    }
    const {data:favData}=await supabase.from('favorites').select('id,field_id,fields(id,name,sport,location)').eq('user_id',userId).order('created_at',{ascending:false})
    if(favData&&favData.length>0){
      const favFieldIds=favData.map((f:any)=>{const field=Array.isArray(f.fields)?f.fields[0]:f.fields;return field?.id}).filter(Boolean)
      const {data:favImages}=await supabase.from('field_images').select('field_id,url').in('field_id',favFieldIds).eq('is_main',true)
      const imgMap=new Map((favImages||[]).map((i:any)=>[i.field_id,i.url]))
      setFavorites(favData.map((row:any)=>{const f=Array.isArray(row.fields)?row.fields[0]:row.fields;return{favoriteId:row.id,fieldId:f?.id??0,name:f?.name??'—',sport:f?.sport??null,location:f?.location??null,image:imgMap.get(f?.id)??null}}).filter((f:any)=>f.fieldId>0))
    }
    setLoading(false)
  })()},[router])

  const saveProfile=async()=>{setSaving(true);const{data:userData}=await supabase.auth.getUser();if(!userData.user)return;const{error}=await supabase.from('profiles').update({first_name:editForm.first_name.trim(),last_name:editForm.last_name.trim(),phone:editForm.phone.trim()||null}).eq('id',userData.user.id);setSaving(false);if(error){showToast('Error al guardar');return};setProfile(p=>p?{...p,first_name:editForm.first_name.trim(),last_name:editForm.last_name.trim(),phone:editForm.phone.trim()||null}:p);setEditing(false);showToast('Perfil actualizado ✓')}
  const removeFavorite=async(favId:number)=>{await supabase.from('favorites').delete().eq('id',favId);setFavorites(prev=>prev.filter(f=>f.favoriteId!==favId));showToast('Favorito eliminado')}
  const activeBookings=bookings.filter(b=>b.status!=='cancelled')
  const totalSpent=activeBookings.reduce((s,b)=>s+(b.price??0),0)
  const memberSince=profile?.created_at?new Date(profile.created_at).toLocaleDateString('es-CR',{month:'long',year:'numeric'}):'—'

  if(loading)return(<><style>{CSS}</style><div className="pf"><div className="pf-loading"><div className="pf-spinner"/><p>Cargando perfil...</p></div></div></>)

  return(
    <><Head><title>Mi perfil — GolPlay</title><meta name="description" content="Tu perfil y actividad en GolPlay."/></Head>
    <style>{CSS}</style>
    {toast&&<div className="pf-toast">{toast}</div>}
    <div className="pf">
      <header className="pf-header">
        <button className="pf-back" onClick={()=>router.back()} aria-label="Volver"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        <Link href="/"><Image src="/logo-golplay.svg" alt="GolPlay" width={110} height={80} style={{objectFit:'contain'}}/></Link>
        <div style={{width:40}}/>
      </header>
      <div className="pf-content">
        <section className="pf-card pf-hero">
          <div className="pf-avatar">{(profile?.first_name?.[0]||'U').toUpperCase()}</div>
          {!editing?(
            <div className="pf-info">
              <h1 className="pf-name">{profile?.first_name} {profile?.last_name}</h1>
              <p className="pf-role">{profile?.role==='owner'?'🏟️ Dueño de complejo':'⚽ Jugador'}{profile?.complex_name?` · ${profile.complex_name}`:''}</p>
              <div className="pf-details"><span>✉️ {email}</span>{profile?.phone&&<span>📱 {profile.phone}</span>}<span>📍 {profile?.country??'CR'} · Desde {memberSince}</span></div>
              <button className="pf-edit-trigger" onClick={()=>setEditing(true)}>Editar perfil</button>
            </div>
          ):(
            <div className="pf-info">
              <h2 className="pf-edit-title">Editar perfil</h2>
              <div className="pf-form">
                <div className="pf-form-row"><div className="pf-form-group"><label className="pf-form-label">Nombre</label><input className="pf-form-input" value={editForm.first_name} onChange={e=>setEditForm(f=>({...f,first_name:e.target.value}))}/></div><div className="pf-form-group"><label className="pf-form-label">Apellido</label><input className="pf-form-input" value={editForm.last_name} onChange={e=>setEditForm(f=>({...f,last_name:e.target.value}))}/></div></div>
                <div className="pf-form-group"><label className="pf-form-label">Teléfono</label><input className="pf-form-input" value={editForm.phone} placeholder="8888-8888" onChange={e=>setEditForm(f=>({...f,phone:e.target.value}))}/></div>
                <div className="pf-form-actions"><button className="pf-btn pf-btn--ghost" onClick={()=>setEditing(false)}>Cancelar</button><button className="pf-btn pf-btn--green" onClick={saveProfile} disabled={saving}>{saving?'Guardando...':'Guardar'}</button></div>
              </div>
            </div>
          )}
        </section>
        <div className="pf-stats">
          <div className="pf-stat"><span className="pf-stat-val">{activeBookings.length}</span><span className="pf-stat-lbl">Reservas</span></div>
          <div className="pf-stat"><span className="pf-stat-val">{favorites.length}</span><span className="pf-stat-lbl">Favoritos</span></div>
          <div className="pf-stat"><span className="pf-stat-val">{totalSpent>0?fmt(totalSpent):'—'}</span><span className="pf-stat-lbl">Invertido</span></div>
        </div>
        <div className="pf-tabs">
          <button className={`pf-tab${activeTab==='bookings'?' pf-tab--on':''}`} onClick={()=>setActiveTab('bookings')}>📅 Reservas {bookings.length>0&&<span className="pf-tab-ct">{bookings.length}</span>}</button>
          <button className={`pf-tab${activeTab==='favorites'?' pf-tab--on':''}`} onClick={()=>setActiveTab('favorites')}>❤️ Favoritos {favorites.length>0&&<span className="pf-tab-ct">{favorites.length}</span>}</button>
        </div>
        {activeTab==='bookings'&&(bookings.length===0?(
          <div className="pf-empty"><span>📅</span><h3>Sin reservas aún</h3><p>Cuando reserves una cancha, tu historial aparecerá acá.</p><Link href="/reserve" className="pf-btn pf-btn--green" style={{textDecoration:'none'}}>Explorar canchas</Link></div>
        ):(
          <div className="pf-list">{bookings.map(b=>{const sport=b.field_sport?SPORT_META[b.field_sport]:null;const st=STATUS_CFG[b.status]??STATUS_CFG.confirmed;const isPast=b.date<new Date().toISOString().split('T')[0];return(
            <div key={b.id} className={`pf-bk${isPast?' pf-bk--past':''}`}><span className="pf-bk-emoji">{sport?.emoji??'🏟️'}</span><div className="pf-bk-body"><p className="pf-bk-field">{b.field_name}</p><p className="pf-bk-date">{fmtDate(b.date)} · {b.hour}{b.field_location?` · 📍 ${b.field_location}`:''}</p></div><div className="pf-bk-end">{b.price!=null&&<span className="pf-bk-price">{fmt(b.price)}</span>}<span className="pf-bk-status" style={{color:st.color,background:st.bg}}>{st.label}</span></div></div>
          )})}</div>
        ))}
        {activeTab==='favorites'&&(favorites.length===0?(
          <div className="pf-empty"><span>❤️</span><h3>Sin favoritos</h3><p>Guardá canchas que te gusten para encontrarlas más rápido.</p><Link href="/reserve" className="pf-btn pf-btn--green" style={{textDecoration:'none'}}>Explorar canchas</Link></div>
        ):(
          <div className="pf-favs">{favorites.map(f=>{const sport=f.sport?SPORT_META[f.sport]:null;return(
            <div key={f.favoriteId} className="pf-fav" onClick={()=>router.push(`/reserve/${f.fieldId}`)}><div className="pf-fav-img" style={{backgroundImage:`url(${f.image??FALLBACK_IMG})`}}>{sport&&<span className="pf-fav-sport">{sport.emoji} {sport.label}</span>}<button className="pf-fav-rm" onClick={e=>{e.stopPropagation();removeFavorite(f.favoriteId)}} aria-label="Quitar">✕</button></div><div className="pf-fav-body"><p className="pf-fav-name">{f.name}</p>{f.location&&<p className="pf-fav-loc">📍 {f.location}</p>}</div></div>
          )})}</div>
        ))}
      </div>
    </div></>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes toastPop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

.pf{min-height:100vh;background:#0C0D0B;font-family:'DM Sans',system-ui,sans-serif;color:#e2e8e0;-webkit-font-smoothing:antialiased}
.pf-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:14px}
.pf-spinner{width:36px;height:36px;border-radius:50%;border:3px solid rgba(255,255,255,.1);border-top-color:#4ade80;animation:spin .7s linear infinite}
.pf-loading p{font-family:'Kanit',sans-serif;font-size:13px;color:#6b7569}
.pf-toast{position:fixed;bottom:24px;right:24px;z-index:9999;background:#16a34a;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;font-family:'Kanit',sans-serif;box-shadow:0 8px 32px rgba(22,163,74,.4);animation:toastPop .2s ease}
.pf-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
.pf-back{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8e0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.pf-back:hover{background:rgba(255,255,255,.12)}
.pf-content{max-width:780px;margin:0 auto;padding:32px 20px 80px}
.pf-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px;animation:fadeUp .4s ease both}
.pf-hero{display:flex;gap:20px;align-items:flex-start;margin-bottom:20px}
.pf-avatar{width:64px;height:64px;border-radius:16px;flex-shrink:0;background:linear-gradient(135deg,#16a34a,#0B4D2C);color:#fff;font-family:'Kanit',sans-serif;font-size:26px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(22,163,74,.35)}
.pf-info{flex:1;min-width:0}
.pf-name{font-family:'Kanit',sans-serif;font-size:24px;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:2px}
.pf-role{font-size:13px;color:#4ade80;font-weight:500;margin-bottom:10px}
.pf-details{display:flex;flex-direction:column;gap:3px}
.pf-details span{font-size:12px;color:#9ca3af}
.pf-edit-trigger{margin-top:14px;padding:7px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#e2e8e0;font-size:12px;font-weight:600;cursor:pointer;font-family:'Kanit',sans-serif;letter-spacing:.03em;transition:all .15s}
.pf-edit-trigger:hover{background:rgba(255,255,255,.1);border-color:#4ade80;color:#4ade80}
.pf-edit-title{font-family:'Kanit',sans-serif;font-size:16px;font-weight:700;color:#fff;margin-bottom:14px}
.pf-form{display:flex;flex-direction:column;gap:12px}
.pf-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pf-form-label{display:block;font-size:11px;font-weight:600;color:#6b7569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
.pf-form-input{width:100%;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s}
.pf-form-input:focus{border-color:#4ade80}
.pf-form-actions{display:flex;gap:8px;margin-top:4px}
.pf-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:700;font-family:'Kanit',sans-serif;letter-spacing:.03em;cursor:pointer;border:none;transition:all .15s}
.pf-btn--green{background:#16a34a;color:#fff;box-shadow:0 3px 14px rgba(22,163,74,.35)}
.pf-btn--green:hover{background:#15803d}
.pf-btn--green:disabled{opacity:.5;cursor:not-allowed}
.pf-btn--ghost{background:rgba(255,255,255,.06);color:#e2e8e0;border:1px solid rgba(255,255,255,.1)}
.pf-btn--ghost:hover{background:rgba(255,255,255,.1)}
.pf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;animation:fadeUp .45s ease both}
.pf-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;text-align:center}
.pf-stat-val{display:block;font-family:'Kanit',sans-serif;font-size:24px;font-weight:800;color:#4ade80;margin-bottom:2px}
.pf-stat-lbl{font-size:10px;color:#6b7569;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.pf-tabs{display:flex;gap:6px;margin-bottom:20px;animation:fadeUp .5s ease both}
.pf-tab{display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:600;font-family:'Kanit',sans-serif;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#6b7569;cursor:pointer;transition:all .15s;letter-spacing:.02em}
.pf-tab:hover{background:rgba(255,255,255,.08);color:#e2e8e0}
.pf-tab--on{background:#16a34a;color:#fff;border-color:#16a34a}
.pf-tab-ct{font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;background:rgba(0,0,0,.2)}
.pf-empty{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:60px 24px;text-align:center;animation:fadeUp .5s ease both}
.pf-empty span{font-size:48px;display:block;margin-bottom:16px}
.pf-empty h3{font-family:'Kanit',sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:8px}
.pf-empty p{font-size:14px;color:#6b7569;margin-bottom:24px;line-height:1.6}
.pf-list{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden;animation:fadeUp .5s ease both}
.pf-bk{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.05);transition:background .1s}
.pf-bk:last-child{border-bottom:none}
.pf-bk:hover{background:rgba(255,255,255,.03)}
.pf-bk--past{opacity:.45}
.pf-bk-emoji{font-size:20px;flex-shrink:0}
.pf-bk-body{flex:1;min-width:0}
.pf-bk-field{font-family:'Kanit',sans-serif;font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pf-bk-date{font-size:12px;color:#6b7569;margin-top:1px}
.pf-bk-end{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.pf-bk-price{font-family:'Kanit',sans-serif;font-size:14px;font-weight:700;color:#4ade80}
.pf-bk-status{font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;font-family:'Kanit',sans-serif}
.pf-favs{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;animation:fadeUp .5s ease both}
.pf-fav{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;position:relative}
.pf-fav:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(0,0,0,.3);border-color:rgba(74,222,128,.3)}
.pf-fav-img{height:120px;background-size:cover;background-position:center;background-color:rgba(22,163,74,.15);position:relative}
.pf-fav-sport{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;font-family:'Kanit',sans-serif;letter-spacing:.04em}
.pf-fav-rm{position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:8px;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.pf-fav:hover .pf-fav-rm{opacity:1}
.pf-fav-rm:hover{background:#ef4444}
.pf-fav-body{padding:12px 14px}
.pf-fav-name{font-family:'Kanit',sans-serif;font-size:14px;font-weight:600;color:#fff;margin-bottom:2px}
.pf-fav-loc{font-size:11px;color:#6b7569}
@media(max-width:640px){.pf-content{padding:20px 16px 80px}.pf-hero{flex-direction:column;align-items:center;text-align:center}.pf-details{align-items:center}.pf-form-row{grid-template-columns:1fr}.pf-stats{gap:8px}.pf-stat{padding:14px 8px}.pf-stat-val{font-size:18px}.pf-bk{flex-direction:column;align-items:flex-start}.pf-bk-end{flex-direction:row;gap:8px}.pf-favs{grid-template-columns:1fr}}
`
