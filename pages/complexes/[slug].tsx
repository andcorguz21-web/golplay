/**
 * GolPlay — pages/complexes/[slug].tsx  v2 "Premium Complex Landing"
 */

import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Complex { id:number; name:string; slug:string; country:string|null; city:string|null; address:string|null; phone:string|null; whatsapp:string|null; logo_url:string|null; latitude:number|null; longitude:number|null }
interface Field { id:number; name:string; sport:string|null; price_day:number; price_night:number|null; active:boolean; image:string|null; slot_duration:number; description:string|null }

const SPORT: Record<string,{label:string;emoji:string;color:string;bg:string}> = {
  futbol5:{label:'Fútbol 5',emoji:'⚽',color:'#4ade80',bg:'rgba(22,163,74,.15)'},futbol7:{label:'Fútbol 7',emoji:'⚽',color:'#86efac',bg:'rgba(21,128,61,.15)'},futbol8:{label:'Fútbol 8',emoji:'⚽',color:'#4ade80',bg:'rgba(22,163,74,.15)'},futbol11:{label:'Fútbol 11',emoji:'⚽',color:'#22c55e',bg:'rgba(22,163,74,.18)'},padel:{label:'Pádel',emoji:'🎾',color:'#67e8f9',bg:'rgba(21,94,117,.15)'},tenis:{label:'Tenis',emoji:'🎾',color:'#fde68a',bg:'rgba(133,77,14,.15)'},basquet:{label:'Básquet',emoji:'🏀',color:'#fdba74',bg:'rgba(154,52,18,.15)'},voleibol:{label:'Voleibol',emoji:'🏐',color:'#c4b5fd',bg:'rgba(76,29,149,.15)'},multiuso:{label:'Multiuso',emoji:'🏟️',color:'#a78bfa',bg:'rgba(76,29,149,.12)'},otro:{label:'Otro',emoji:'🏟️',color:'#94a3b8',bg:'rgba(100,116,139,.12)'},
}
const FLAGS:Record<string,string>={CR:'🇨🇷',MX:'🇲🇽',CO:'🇨🇴',AR:'🇦🇷',CL:'🇨🇱',PE:'🇵🇪',UY:'🇺🇾',PA:'🇵🇦',GT:'🇬🇹',HN:'🇭🇳'}
const fmt=(n:number)=>n>0?`₡${n.toLocaleString('es-CR')}`:'Consultar'
const FALLBACK='https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&q=80'

function useInView(threshold=0.12){const ref=useRef<HTMLDivElement>(null);const[vis,setVis]=useState(false);useEffect(()=>{const el=ref.current;if(!el)return;const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);obs.disconnect()}},{threshold});obs.observe(el);return()=>obs.disconnect()},[threshold]);return{ref,vis}}
function FadeIn({children,delay=0,className=''}:{children:React.ReactNode;delay?:number;className?:string}){const{ref,vis}=useInView();return(<div ref={ref} className={className} style={{opacity:vis?1:0,transform:vis?'none':'translateY(20px)',transition:`opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms`}}>{children}</div>)}

export default function ComplexPage(){
  const router=useRouter()
  const slug=router.query.slug as string|undefined
  const[complex,setComplex]=useState<Complex|null>(null)
  const[fields,setFields]=useState<Field[]>([])
  const[allImages,setAllImages]=useState<string[]>([])
  const[loading,setLoading]=useState(true)
  const[notFound,setNotFound]=useState(false)
  const[heroIdx,setHeroIdx]=useState(0)

  useEffect(()=>{if(allImages.length<=1)return;const t=setInterval(()=>setHeroIdx(i=>(i+1)%allImages.length),4000);return()=>clearInterval(t)},[allImages.length])

  // Close nav dropdown on outside click
  useEffect(()=>{
    const handler=(e:MouseEvent)=>{const open=document.querySelector('.cx-nav-dropdown--open');if(open&&!open.contains(e.target as Node))open.classList.remove('cx-nav-dropdown--open')}
    document.addEventListener('click',handler)
    return()=>document.removeEventListener('click',handler)
  },[])

  useEffect(()=>{
    if(!router.isReady||!slug)return
    ;(async()=>{
      setLoading(true)
      const{data:cx,error:cxErr}=await supabase.from('complexes').select('id,name,slug,country,city,address,phone,whatsapp,logo_url,latitude,longitude').eq('slug',slug).eq('active',true).single()
      if(cxErr||!cx){setNotFound(true);setLoading(false);return}
      setComplex(cx)
      const{data:fieldsByComplex}=await supabase.from('fields').select('id,name,sport,price_day,price_night,active,slot_duration,description').eq('complex_id',cx.id).eq('active',true).order('name')
      const fieldList=fieldsByComplex??[]
      const fieldIds=fieldList.map(f=>f.id)
      let imageMap:Record<number,string>={};let allImgs:string[]=[]
      if(fieldIds.length>0){
        const{data:imgs}=await supabase.from('field_images').select('field_id,url,is_main').in('field_id',fieldIds).order('is_main',{ascending:false})
        if(imgs){const seen=new Set<number>();for(const img of imgs){allImgs.push(img.url);if(!seen.has(img.field_id)){imageMap[img.field_id]=img.url;seen.add(img.field_id)}}}
      }
      setAllImages(allImgs.length?allImgs:[FALLBACK])
      setFields(fieldList.map(f=>({...f,price_day:Number(f.price_day??0),price_night:f.price_night?Number(f.price_night):null,slot_duration:Number(f.slot_duration??1),image:imageMap[f.id]??null})))
      setLoading(false)
    })()
  },[router.isReady,slug])

  const sportSummary=useMemo(()=>{const c:Record<string,number>={};fields.forEach(f=>{const k=f.sport||'otro';c[k]=(c[k]||0)+1});return Object.entries(c).map(([s,n])=>({sport:s,count:n,meta:SPORT[s]||SPORT.otro}))},[fields])
  const uniqueSports=sportSummary.length
  const minPrice=fields.length?Math.min(...fields.map(f=>f.price_day).filter(p=>p>0)):0

  if(loading)return<Shell><Skeleton/></Shell>
  if(notFound||!complex)return<Shell><NotFound slug={slug}/></Shell>

  const flag=FLAGS[complex.country??'']??'🌎'
  const waClean=complex.whatsapp?.replace(/[^0-9]/g,'')??''

  return(
    <Shell>
      <Head>
        <title>{complex.name} — Reservar cancha · GolPlay</title>
        <meta name="description" content={`Reservá tu cancha en ${complex.name}. ${fields.length} canchas disponibles. Reserva online 24/7.`}/>
      </Head>

      {/* HERO */}
      <header className="cx-hero">
        <div className="cx-hero__imgs">{allImages.map((src,i)=>(<div key={i} className="cx-hero__img-layer" style={{backgroundImage:`url(${src})`,opacity:i===heroIdx?1:0}}/>))}<div className="cx-hero__overlay"/></div>
        <div className="cx-hero__inner">
          {complex.logo_url&&<img src={complex.logo_url} alt="" className="cx-hero__logo"/>}
          <h1 className="cx-hero__title">{complex.name}</h1>
          <div className="cx-hero__meta-row">
            {complex.city&&<span className="cx-hero__mi">📍 {complex.city}</span>}
            {complex.country&&<span className="cx-hero__mi">{flag} {complex.country}</span>}
            <span className="cx-hero__mi">⚽ {fields.length} cancha{fields.length!==1?'s':''}</span>
            {uniqueSports>1&&<span className="cx-hero__mi">🏆 {uniqueSports} deportes</span>}
          </div>
          {complex.address&&<p className="cx-hero__address">{complex.address}</p>}
          <div className="cx-hero__pills">{sportSummary.map(s=>(<span key={s.sport} className="cx-pill" style={{color:s.meta.color,background:s.meta.bg,borderColor:s.meta.color+'30'}}>{s.meta.emoji} {s.meta.label} <span className="cx-pill__c">{s.count}</span></span>))}</div>
          <div className="cx-hero__ctas">
            {fields.length>0&&<Link href={`/reserve/${fields[0].id}`} className="cx-btn cx-btn--primary">Reservar ahora →</Link>}
            {(complex.latitude&&complex.longitude)&&<div className="cx-nav-dropdown">
              <button className="cx-btn cx-btn--maps" onClick={()=>{const el=document.querySelector('.cx-nav-dropdown');el?.classList.toggle('cx-nav-dropdown--open')}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Cómo llegar
              </button>
              <div className="cx-nav-dropdown__menu">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${complex.latitude},${complex.longitude}`} target="_blank" rel="noopener noreferrer" className="cx-nav-dropdown__item">
                  <span>🗺️</span> Google Maps
                </a>
                <a href={`https://www.waze.com/ul?ll=${complex.latitude},${complex.longitude}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="cx-nav-dropdown__item">
                  <span>🚗</span> Waze
                </a>
                <a href={`https://maps.apple.com/?daddr=${complex.latitude},${complex.longitude}`} target="_blank" rel="noopener noreferrer" className="cx-nav-dropdown__item">
                  <span>🍎</span> Apple Maps
                </a>
              </div>
            </div>}
            {complex.phone&&<a href={`tel:${complex.phone}`} className="cx-btn cx-btn--ghost">📞 Llamar</a>}
          </div>
          <div className="cx-hero__scroll"><div className="cx-hero__scroll-line"/></div>
        </div>
      </header>

      {/* STATS */}
      <section className="cx-stats"><FadeIn className="cx-stats__inner">
        {[{value:String(fields.length),label:'Canchas',accent:'#22c55e'},{value:String(uniqueSports),label:'Deportes',accent:'#4ade80'},{value:minPrice>0?fmt(minPrice):'—',label:'Desde',accent:'#86efac'},{value:'24/7',label:'Disponible',accent:'#a7f3d0'}].map((s,i)=>(
          <FadeIn key={s.label} delay={i*80}><div className="cx-stat"><div className="cx-stat__bar" style={{background:s.accent}}/><span className="cx-stat__value">{s.value}</span><span className="cx-stat__label">{s.label}</span></div></FadeIn>
        ))}
      </FadeIn></section>

      {/* FIELDS */}
      <section className="cx-fields"><div className="cx-container">
        <FadeIn><div className="cx-fields__header"><div><p className="cx-label">CANCHAS DISPONIBLES</p><h2 className="cx-h2">Elegí tu cancha y reservá</h2></div></div></FadeIn>
        <div className="cx-fields__grid">
          {fields.map((f,i)=>{const sm=SPORT[f.sport??'']||SPORT.otro;return(
            <FadeIn key={f.id} delay={i*60}><Link href={`/reserve/${f.id}`} className="cx-fcard">
              <div className="cx-fcard__img"><img src={f.image||FALLBACK} alt={f.name} loading="lazy"/><div className="cx-fcard__img-ov"/>
                <span className="cx-fcard__sport" style={{color:sm.color,background:sm.bg}}>{sm.emoji} {sm.label}</span>
                {f.slot_duration>1&&<span className="cx-fcard__dur">{f.slot_duration}h por turno</span>}
              </div>
              <div className="cx-fcard__body">
                <h3 className="cx-fcard__name">{f.name}</h3>
                {f.description&&<p className="cx-fcard__desc">{f.description.slice(0,80)}{f.description.length>80?'...':''}</p>}
                <div className="cx-fcard__bottom">
                  <div className="cx-fcard__prices">
                    <div className="cx-fcard__price"><span className="cx-fcard__pl">Día</span><span className="cx-fcard__pv">{fmt(f.price_day)}</span></div>
                    {f.price_night&&f.price_night!==f.price_day&&<div className="cx-fcard__price cx-fcard__price--n"><span className="cx-fcard__pl">Noche</span><span className="cx-fcard__pv">{fmt(f.price_night)}</span></div>}
                  </div>
                  <span className="cx-fcard__cta">Reservar →</span>
                </div>
              </div>
            </Link></FadeIn>
          )})}
        </div>
        {fields.length===0&&<div className="cx-empty"><span>🏟️</span><p>Este complejo aún no tiene canchas publicadas.</p></div>}
      </div></section>

      {/* INFO */}
      <section className="cx-info-section"><div className="cx-container">
        <FadeIn><p className="cx-label">INFORMACIÓN</p><h2 className="cx-h2">Sobre {complex.name}</h2></FadeIn>
        <div className="cx-info-grid">
          {([
            complex.address&&{icon:'📍',label:'Dirección',value:complex.address},
            complex.city&&{icon:'🌆',label:'Ciudad',value:complex.city},
            complex.whatsapp&&{icon:'📱',label:'WhatsApp',value:complex.whatsapp,href:`https://wa.me/${waClean}`},
            complex.phone&&{icon:'📞',label:'Teléfono',value:complex.phone,href:`tel:${complex.phone}`},
            {icon:'⚽',label:'Canchas activas',value:`${fields.length} cancha${fields.length!==1?'s':''}`},
            {icon:'🕐',label:'Disponibilidad',value:'24/7 · Reserva online'},
            {icon:'✅',label:'Confirmación',value:'Inmediata por correo'},
            {icon:'💰',label:'Pagos',value:'Sin cobro anticipado'},
          ] as any[]).filter(Boolean).map((item:any,i:number)=>(
            <FadeIn key={i} delay={i*50}><div className="cx-info-card"><span className="cx-info-card__icon">{item.icon}</span><div><p className="cx-info-card__label">{item.label}</p>
              {item.href?<a href={item.href} target="_blank" rel="noopener noreferrer" className="cx-info-card__link">{item.value}</a>:<p className="cx-info-card__value">{item.value}</p>}
            </div></div></FadeIn>
          ))}
        </div>
      </div></section>

      {/* CTA */}
      <section className="cx-cta-section"><FadeIn><div className="cx-cta-section__inner"><div className="cx-cta-section__bg"/>
        <span className="cx-cta-section__emoji">⚽</span>
        <h2 className="cx-cta-section__title">¿Listo para jugar?</h2>
        <p className="cx-cta-section__sub">Elegí tu cancha, seleccioná el horario y reservá en segundos.<br/>Sin llamadas, sin esperas, sin complicaciones.</p>
        {fields.length>0&&<Link href={`/reserve/${fields[0].id}`} className="cx-btn cx-btn--primary cx-btn--lg">Reservar cancha ahora →</Link>}
        <p className="cx-cta-section__note">✅ Sin cobro anticipado · Confirmación inmediata</p>
      </div></FadeIn></section>

      {/* FOOTER */}
      <footer className="cx-footer"><Link href="/"><img src="/logo-golplay.svg" alt="GolPlay" style={{height:32,opacity:.6}}/></Link><p>© {new Date().getFullYear()} GolPlay · golplay.app</p></footer>

      {/* WA BUBBLE */}
      {complex.whatsapp&&<a href={`https://wa.me/${waClean}`} target="_blank" rel="noopener noreferrer" className="cx-wa" title="WhatsApp"><svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a1.077 1.077 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>}

      {/* MOBILE STICKY */}
      {fields.length>0&&<div className="cx-mobile-cta"><Link href={`/reserve/${fields[0].id}`} className="cx-mobile-cta__btn">Reservar cancha →</Link></div>}
    </Shell>
  )
}

function Shell({children}:{children:React.ReactNode}){return(<><style>{CSS}</style><nav className="cx-nav"><Link href="/" className="cx-nav__logo"><img src="/logo-golplay.svg" alt="GolPlay" style={{height:120}}/></Link><div className="cx-nav__right"><Link href="/reserve" className="cx-nav__link">Canchas</Link><Link href="/login" className="cx-nav__link">Ingresar</Link><Link href="/register" className="cx-nav__cta">Registrarse</Link></div></nav><main>{children}</main></>)}
function Skeleton(){return(<div style={{padding:'160px 24px 60px',maxWidth:800,margin:'0 auto',textAlign:'center'}}><div className="cx-sk" style={{width:72,height:72,borderRadius:18,margin:'0 auto 20px'}}/><div className="cx-sk" style={{width:280,height:32,borderRadius:10,margin:'0 auto 14px'}}/><div className="cx-sk" style={{width:180,height:16,borderRadius:6,margin:'0 auto 48px'}}/><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>{[1,2,3].map(i=><div key={i} className="cx-sk" style={{height:300,borderRadius:20}}/>)}</div></div>)}
function NotFound({slug}:{slug?:string}){return(<div style={{padding:'180px 24px 80px',textAlign:'center',maxWidth:480,margin:'0 auto'}}><div style={{fontSize:64,marginBottom:20}}>🏟️</div><h2 style={{fontSize:28,fontWeight:900,fontFamily:"'Kanit',sans-serif",letterSpacing:'-.03em',marginBottom:10}}>Complejo no encontrado</h2><p style={{fontSize:15,color:'rgba(255,255,255,.5)',marginBottom:32,lineHeight:1.7}}>No encontramos un complejo con el código <strong style={{color:'#fff'}}>"{slug}"</strong>.</p><Link href="/reserve" style={{display:'inline-flex',alignItems:'center',gap:8,background:'#22c55e',color:'#0a0a0a',padding:'14px 30px',borderRadius:14,fontSize:15,fontWeight:800,textDecoration:'none'}}>Ver todas las canchas →</Link></div>)}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Kanit:wght@700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#050a05;color:#fff;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}a{text-decoration:none;color:inherit}
.cx-container{max-width:1100px;margin:0 auto;padding:0 24px}

.cx-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:64px;background:rgba(5,10,5,.8);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.05)}
.cx-nav__logo{display:flex;align-items:center}.cx-nav__right{display:flex;gap:16px;align-items:center}
.cx-nav__link{font-size:13px;font-weight:500;color:rgba(255,255,255,.55);transition:color .2s}.cx-nav__link:hover{color:#fff}
.cx-nav__cta{font-size:12px;font-weight:700;color:#0a0a0a;background:#22c55e;padding:7px 16px;border-radius:8px;transition:all .15s}.cx-nav__cta:hover{background:#16a34a}

.cx-hero{position:relative;min-height:85vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
.cx-hero__imgs{position:absolute;inset:0}.cx-hero__img-layer{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity 1.2s ease}
.cx-hero__overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,10,5,.6) 0%,rgba(5,10,5,.85) 60%,#050a05 100%)}
.cx-hero__inner{position:relative;z-index:1;text-align:center;max-width:680px;padding:100px 24px 60px;animation:cxFadeUp .8s ease}
.cx-hero__flag{font-size:56px;margin-bottom:16px}.cx-hero__logo{height:72px;border-radius:16px;margin-bottom:16px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
.cx-hero__title{font-family:'Kanit',sans-serif;font-size:clamp(32px,6vw,56px);font-weight:900;letter-spacing:-.04em;line-height:1.05;margin:0 0 16px}
.cx-hero__meta-row{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.cx-hero__mi{font-size:13px;color:rgba(255,255,255,.5);font-weight:500}
.cx-hero__address{font-size:14px;color:rgba(255,255,255,.35);margin:0 0 20px}
.cx-hero__pills{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.cx-pill{font-size:11px;font-weight:700;padding:5px 14px;border-radius:999px;border:1px solid;display:inline-flex;align-items:center;gap:5px}.cx-pill__c{font-size:10px;opacity:.7}
.cx-hero__ctas{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:32px}
.cx-hero__scroll{display:flex;justify-content:center}.cx-hero__scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,rgba(34,197,94,.5),transparent);animation:cxPulse 2s ease-in-out infinite}

.cx-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:13px;font-size:14px;font-weight:700;font-family:inherit;transition:all .18s;cursor:pointer;border:none}
.cx-btn--primary{background:#22c55e;color:#0a0a0a;box-shadow:0 0 32px rgba(34,197,94,.3)}.cx-btn--primary:hover{background:#16a34a;transform:translateY(-2px);box-shadow:0 8px 40px rgba(34,197,94,.45)}
.cx-btn--maps{background:rgba(59,130,246,.2);color:#93c5fd;border:1px solid rgba(59,130,246,.25)}.cx-btn--maps:hover{background:rgba(59,130,246,.3);transform:translateY(-1px)}
.cx-nav-dropdown{position:relative;display:inline-block}
.cx-nav-dropdown__menu{display:none;position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);background:rgba(15,20,15,.95);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:6px;min-width:180px;box-shadow:0 16px 48px rgba(0,0,0,.5);z-index:10}
.cx-nav-dropdown--open .cx-nav-dropdown__menu{display:flex;flex-direction:column;animation:cxFadeUp .2s ease}
.cx-nav-dropdown__item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:600;color:rgba(255,255,255,.8);transition:all .12s;white-space:nowrap}
.cx-nav-dropdown__item:hover{background:rgba(255,255,255,.08);color:#fff}
.cx-nav-dropdown__item span{font-size:16px}
.cx-btn--ghost{background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.12)}.cx-btn--ghost:hover{background:rgba(255,255,255,.13)}
.cx-btn--lg{padding:16px 36px;font-size:16px;border-radius:16px}

.cx-stats{padding:0 24px;margin-top:-20px;position:relative;z-index:2}
.cx-stats__inner{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.cx-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:20px;text-align:center;position:relative;overflow:hidden;transition:border-color .2s}.cx-stat:hover{border-color:rgba(34,197,94,.25)}
.cx-stat__bar{position:absolute;top:0;left:50%;transform:translateX(-50%);width:32px;height:3px;border-radius:0 0 4px 4px}
.cx-stat__value{display:block;font-size:24px;font-weight:900;font-family:'Kanit',sans-serif;letter-spacing:-.02em;line-height:1.2}
.cx-stat__label{display:block;font-size:11px;font-weight:600;color:rgba(255,255,255,.4);margin-top:4px;text-transform:uppercase;letter-spacing:.06em}

.cx-label{font-size:11px;font-weight:700;color:#22c55e;letter-spacing:.1em;text-transform:uppercase;margin:0 0 10px}
.cx-h2{font-family:'Kanit',sans-serif;font-size:clamp(24px,4vw,40px);font-weight:900;letter-spacing:-.03em;line-height:1.1;margin:0 0 32px}

.cx-fields{padding:80px 0}.cx-fields__header{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px}
.cx-fields__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}

.cx-fcard{display:block;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:20px;overflow:hidden;transition:all .25s}
.cx-fcard:hover{border-color:rgba(34,197,94,.35);transform:translateY(-6px);box-shadow:0 20px 60px rgba(0,0,0,.35)}
.cx-fcard__img{position:relative;height:200px;overflow:hidden}.cx-fcard__img img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
.cx-fcard:hover .cx-fcard__img img{transform:scale(1.08)}
.cx-fcard__img-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(5,10,5,.5) 0%,transparent 50%)}
.cx-fcard__sport{position:absolute;top:12px;left:12px;font-size:11px;font-weight:700;padding:5px 12px;border-radius:10px;backdrop-filter:blur(10px)}
.cx-fcard__dur{position:absolute;top:12px;right:12px;font-size:10px;font-weight:800;color:#fff;background:rgba(0,0,0,.55);padding:4px 10px;border-radius:8px;backdrop-filter:blur(6px)}
.cx-fcard__body{padding:18px 20px 20px}.cx-fcard__name{font-size:18px;font-weight:800;margin:0 0 6px;letter-spacing:-.02em}
.cx-fcard__desc{font-size:12px;color:rgba(255,255,255,.4);margin:0 0 14px;line-height:1.5}
.cx-fcard__bottom{display:flex;justify-content:space-between;align-items:flex-end}
.cx-fcard__prices{display:flex;gap:16px}.cx-fcard__price{display:flex;flex-direction:column}
.cx-fcard__pl{font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.04em}
.cx-fcard__pv{font-size:17px;font-weight:800;color:#4ade80;font-family:'Kanit',sans-serif}
.cx-fcard__price--n .cx-fcard__pv{color:#c4b5fd}
.cx-fcard__cta{font-size:12px;font-weight:700;color:#22c55e;background:rgba(34,197,94,.1);padding:6px 14px;border-radius:8px;transition:all .15s}
.cx-fcard:hover .cx-fcard__cta{background:#22c55e;color:#0a0a0a}

.cx-empty{text-align:center;padding:80px 20px;font-size:14px;color:rgba(255,255,255,.4)}.cx-empty span{font-size:48px;display:block;margin-bottom:12px}

.cx-info-section{padding:60px 0;border-top:1px solid rgba(255,255,255,.05)}
.cx-info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.cx-info-card{display:flex;align-items:flex-start;gap:14px;padding:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;transition:border-color .2s}.cx-info-card:hover{border-color:rgba(34,197,94,.2)}
.cx-info-card__icon{font-size:22px;flex-shrink:0;margin-top:1px}
.cx-info-card__label{font-size:10px;font-weight:700;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px}
.cx-info-card__value{font-size:14px;font-weight:600;color:#fff;margin:0}
.cx-info-card__link{font-size:14px;font-weight:600;color:#4ade80;transition:color .15s}.cx-info-card__link:hover{color:#22c55e}

.cx-cta-section{padding:80px 24px;text-align:center;position:relative;overflow:hidden}
.cx-cta-section__inner{position:relative;z-index:1;max-width:600px;margin:0 auto}
.cx-cta-section__bg{position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 50% 50%,rgba(34,197,94,.12) 0%,transparent 70%);pointer-events:none}
.cx-cta-section__emoji{font-size:48px;display:block;margin-bottom:16px}
.cx-cta-section__title{font-family:'Kanit',sans-serif;font-size:clamp(28px,4.5vw,44px);font-weight:900;letter-spacing:-.03em;margin:0 0 12px}
.cx-cta-section__sub{font-size:15px;color:rgba(255,255,255,.5);line-height:1.7;margin:0 0 28px}
.cx-cta-section__note{font-size:12px;color:rgba(255,255,255,.3);margin-top:20px}

.cx-footer{text-align:center;padding:40px 24px;border-top:1px solid rgba(255,255,255,.05)}.cx-footer p{font-size:11px;color:rgba(255,255,255,.2);margin:8px 0 0}

.cx-wa{position:fixed;bottom:24px;right:24px;z-index:90;width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(37,211,102,.4);transition:transform .2s,box-shadow .2s;animation:cxFloat 3s ease-in-out infinite}
.cx-wa:hover{transform:scale(1.12);box-shadow:0 8px 32px rgba(37,211,102,.55)}

.cx-mobile-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:80;padding:10px 16px 20px;background:linear-gradient(to top,rgba(5,10,5,1) 60%,transparent)}
.cx-mobile-cta__btn{display:flex;justify-content:center;align-items:center;gap:8px;width:100%;background:#22c55e;color:#0a0a0a;padding:15px;border-radius:14px;font-size:15px;font-weight:800;box-shadow:0 0 32px rgba(34,197,94,.4)}

.cx-sk{background:linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.03) 75%);background-size:200% 100%;animation:cxShim 1.5s infinite}

@keyframes cxFadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes cxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes cxPulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes cxShim{to{background-position:-200% 0}}

@media(max-width:900px){.cx-stats__inner{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.cx-mobile-cta{display:block}.cx-hero{min-height:75vh}.cx-fields__grid{grid-template-columns:1fr}.cx-info-grid{grid-template-columns:1fr}.cx-nav__cta{display:none}.cx-wa{bottom:80px}}
@media(max-width:480px){.cx-stats__inner{grid-template-columns:repeat(2,1fr);gap:8px}.cx-stat{padding:14px}.cx-stat__value{font-size:20px}.cx-wa{width:48px;height:48px;bottom:76px;right:16px}.cx-wa svg{width:22px;height:22px}}
`
