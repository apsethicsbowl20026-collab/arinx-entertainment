"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Search, Upload, Bell, Menu, Home, Zap, Users, Library, History, X, SlidersHorizontal, ThumbsUp, ThumbsDown, Share2, Bookmark, Download, MoreVertical, Sun, Moon, Settings, LogOut, LayoutDashboard, Shield, Radio, MessageCircle, Heart, Flag, Plus, Trash2, Pencil, Check, ChevronDown, Eye, Clock, ListVideo, User, Film, Send, Link2, Gauge, PictureInPicture2, Maximize, CircleUserRound, BadgeCheck, Globe, Lock, Link as LinkIcon, Sparkles, TrendingUp, Calendar, BarChart3, Crown as CrownIcon } from "lucide-react";
import { siteUrl } from "@/lib/site";

const CATS=["All","Gaming","Movies","Entertainment","Education","Coding","Hacking & Cybersecurity","Technology","Science","Music","Sports","News","Animation"];
const COUNTRIES=[{code:"US",name:"United States"},{code:"IN",name:"India"},{code:"GB",name:"United Kingdom"},{code:"CA",name:"Canada"},{code:"AU",name:"Australia"},{code:"JP",name:"Japan"},{code:"KR",name:"South Korea"},{code:"BR",name:"Brazil"},{code:"MX",name:"Mexico"},{code:"DE",name:"Germany"}];
type Route={name:string;id?:string;username?:string};
const fmt=(n:number)=> n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n||0);
const ago=(d:string)=>{const s=(Date.now()-new Date(d).getTime())/1000; if(s<60)return"just now"; if(s<3600)return Math.floor(s/60)+"m ago"; if(s<86400)return Math.floor(s/3600)+"h ago"; if(s<2592000)return Math.floor(s/86400)+"d ago"; return new Date(d).toLocaleDateString();};
const dur=(s:number)=>{if(!s)return""; const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60; return h?`${h}:${String(m).padStart(2,"0")}:${String(x).padStart(2,"0")}`:`${m}:${String(x).padStart(2,"0")}`;};
const avatar=(name="A",url="")=> url? <img src={url} className="w-full h-full object-cover" alt=""/> : <span className="font-bold text-white">{name.slice(0,1).toUpperCase()}</span>;
const isStaffUser=(u:any)=> !!u && (u.role==="admin"||u.role==="owner");
const isOwnerUser=(u:any)=> !!u && u.role==="owner";
/** Crown shown beside the ARINX owner's name and avatar. */
const Crown=({role,size=13,className=""}:{role?:string;size?:number;className?:string})=> role==="owner"? <span title="ARINX owner" aria-label="ARINX owner" className={`inline-flex ${className}`}><CrownIcon size={size} className="text-amber-400 fill-amber-400 drop-shadow-[0_1px_1px_rgba(120,70,0,.45)]"/></span> : null;

async function api(path:string, opts?:any){ const r=await fetch(path,{headers:{"Content-Type":"application/json"},...opts}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||"Request failed"); return j; }
const post=(path:string,body:any)=>api(path,{method:"POST",body:JSON.stringify(body)});

export default function App(){
 const [dark,setDark]=useState(false); const [user,setUser]=useState<any>(null); const [route,setRoute]=useState<Route>({name:"home"});
  const [videos,setVideos]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [loadingMore,setLoadingMore]=useState(false); const [hasMore,setHasMore]=useState(false); const [nextPage,setNextPage]=useState(2); const [totalVideos,setTotalVideos]=useState(0); const [err,setErr]=useState("");
  const [cat,setCat]=useState("All"); const [country,setCountry]=useState(""); const [query,setQuery]=useState(""); const [searchInput,setSearchInput]=useState(""); const [sort,setSort]=useState("new"); const [typeFilter,setTypeFilter]=useState("all"); const [filterOpen,setFilterOpen]=useState(false);
 const [sidebar,setSidebar]=useState(false); const [mobileNav,setMobileNav]=useState(false); const [showAuth,setShowAuth]=useState(false); const [showUpload,setShowUpload]=useState(false); const [showNotif,setShowNotif]=useState(false);
 const [notifs,setNotifs]=useState<any[]>([]); const [unread,setUnread]=useState(0); const [toast,setToast]=useState(""); const [menuOpen,setMenuOpen]=useState(false); const [channels,setChannels]=useState<any[]>([]);
 const anonRef=useRef<string>(""); if(typeof window!=="undefined"&&!anonRef.current){ anonRef.current=localStorage.getItem("arinx_anon")||Math.random().toString(36).slice(2); localStorage.setItem("arinx_anon",anonRef.current); }
 const notify=(m:string)=>{setToast(m); setTimeout(()=>setToast(""),3500);};
 const go=(r:Route)=>{setRoute(r); window.scrollTo({top:0}); setMenuOpen(false);};
 /**
  * Client state can go stale (a redeploy, a cross-site iframe reload, or a
  * cookie that arrived after first paint). Before asking anyone to sign in
  * again, re-ask the server — if they are actually signed in we just resync.
  * This is what stopped the "sign in again and again" loop.
  */
 const requireAuth=async()=>{
   if(user) return true;
   try{ const j=await api("/api/auth"); if(j.user){ setUser(j.user); notify(`Welcome back, ${j.user.displayName}`); return true; } }catch{}
   setShowAuth(true); return false;
 };

  const loadVideos=useCallback(async()=>{ setLoading(true); setErr(""); try{ const params=new URLSearchParams({category:cat,sort,type:typeFilter,page:"1",limit:"36"}); if(country)params.set("country",country); if(query)params.set("q",query); if(route.name==="subscriptions")params.set("feed","subscriptions"); const j=await api(`/api/videos?${params}`); setVideos(j.videos); setTotalVideos(j.total??j.videos.length); setHasMore(Boolean(j.hasMore)); setNextPage(2); if(query){ const c=await api(`/api/social?what=channels&q=${encodeURIComponent(query)}`); setChannels(c.channels);} else setChannels([]);}catch(e:any){setErr(e.message)} setLoading(false); },[cat,country,query,sort,typeFilter,route.name]);
  const loadMoreVideos=useCallback(async()=>{ if(loadingMore||!hasMore)return; setLoadingMore(true); try{ const params=new URLSearchParams({category:cat,sort,type:typeFilter,page:String(nextPage),limit:"36"}); if(country)params.set("country",country); if(query)params.set("q",query); if(route.name==="subscriptions")params.set("feed","subscriptions"); const j=await api(`/api/videos?${params}`); setVideos(current=>{const seen=new Set(current.map(v=>v.id)); return [...current,...j.videos.filter((v:any)=>!seen.has(v.id))];}); setTotalVideos(j.total??totalVideos); setHasMore(Boolean(j.hasMore)); setNextPage(nextPage+1);}catch(e:any){notify(e.message);} setLoadingMore(false); },[loadingMore,hasMore,cat,country,query,sort,typeFilter,nextPage,route.name,totalVideos]);
  useEffect(()=>{ if(["home","subscriptions","search"].includes(route.name)) loadVideos(); },[loadVideos]);
 useEffect(()=>{ api("/api/auth").then(j=>setUser(j.user)).catch(()=>{}); const t=localStorage.getItem("arinx_theme"); if(t==="dark")setDark(true); const sp=new URLSearchParams(location.search); const w=sp.get("watch"); if(w) setRoute({name:"watch",id:w}); const ch=sp.get("channel"); if(ch) setRoute({name:"channel",username:ch}); if(sp.get("view")==="shorts") setRoute({name:"shorts"}); },[]);
 useEffect(()=>{ document.documentElement.classList.toggle("dark",dark); localStorage.setItem("arinx_theme",dark?"dark":"light"); },[dark]);
 // Re-sync the session whenever the tab regains focus so a valid cookie is never
 // mistaken for being signed out.
 useEffect(()=>{
   const resync=()=>{ api("/api/auth").then(j=>{ if(j.user) setUser(j.user); }).catch(()=>{}); };
   const onVis=()=>{ if(!document.hidden) resync(); };
   window.addEventListener("focus",resync); document.addEventListener("visibilitychange",onVis);
   return ()=>{ window.removeEventListener("focus",resync); document.removeEventListener("visibilitychange",onVis); };
 },[]);
 useEffect(()=>{ if(user) loadNotifs(); },[user]);
 async function loadNotifs(){ try{const j=await api("/api/social?what=notifications"); setNotifs(j.notifications); setUnread(j.unread);}catch{} }

 const themeCls=dark?"bg-[#061021] text-slate-50":"bg-[#f3f6fb] text-slate-900";
 const cardCls=dark?"bg-[#0a1730] border-[#1c3464]":"bg-white border-blue-100";
 const muted=dark?"text-slate-400":"text-slate-500";

 return <div className={`min-h-screen ${themeCls}`}>
  {/* HEADER */}
  <header className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-[0_2px_12px_rgba(15,50,110,.04)] ${dark?"bg-[#07132a]/95 border-[#203a66]":"bg-[#f9fbff]/95 border-[#dbe6f5]"}`}>
   <div className="relative flex items-center gap-2 px-3 sm:px-5 h-14 max-w-[1600px] mx-auto">
    <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-white/10 shrink-0" onClick={()=>{if(window.innerWidth<768)setMobileNav(!mobileNav);else setSidebar(!sidebar);}} aria-label="Toggle navigation"><Menu size={21}/></button>
    <form className="hidden md:flex w-[min(32vw,420px)] ml-1" onSubmit={e=>{e.preventDefault();setQuery(searchInput);go({name:"search"});}}>
     <div className={`flex w-full items-center rounded-full border overflow-hidden ${dark?"bg-[#0b1c39] border-[#294875]":"bg-white border-[#c8d7eb] shadow-inner shadow-blue-50"}`}>
      <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Search" className="flex-1 px-4 py-2 bg-transparent text-sm min-w-0"/>
      {searchInput&&<button type="button" onClick={()=>{setSearchInput("");setQuery("");}} className="p-1 text-slate-500"><X size={16}/></button>}
      <button className={`px-4 py-2.5 border-l ${dark?"bg-[#12294f] border-[#294875] hover:bg-[#193765]":"bg-[#edf3fb] border-[#c8d7eb] hover:bg-[#e1ecfa]"}`} aria-label="Search"><Search size={18}/></button>
     </div>
    </form>
    <button onClick={()=>go({name:"home"})} className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2" aria-label="ARINX home">
     <span className="hidden sm:grid w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#6cb6ff] via-[#1765d9] to-[#06306e] ring-1 ring-blue-300/70 shadow-md shadow-blue-900/25 place-items-center"><Play className="text-white fill-white ml-0.5" size={15}/></span>
     <span className="arinx-logo text-[19px] sm:text-[22px]">ARINX</span>
    </button>
    <div className="ml-auto flex items-center gap-1 sm:gap-2">
     <button onClick={()=>setDark(!dark)} className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-white/10" aria-label="Toggle theme">{dark?<Sun size={19}/>:<Moon size={19}/>}</button>
     <button onClick={()=>user?setShowUpload(true):requireAuth().then(ok=>{if(ok)setShowUpload(true)})} className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-white/10 sm:hidden" aria-label="Upload"><Upload size={19}/></button>
     <button onClick={()=>user?setShowUpload(true):requireAuth().then(ok=>{if(ok)setShowUpload(true)})} className="hidden sm:flex items-center gap-1.5 bg-gradient-to-b from-[#287ded] to-[#0b4fd8] hover:from-[#388eff] hover:to-[#1766e8] text-white text-sm font-semibold px-3.5 py-2 rounded-full shadow-sm shadow-blue-800/15"><Upload size={16}/> Upload</button>
     {user&&<div className="relative"><button onClick={async()=>{setShowNotif(!showNotif);await loadNotifs();}} className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-white/10 relative" aria-label="Notifications"><Bell size={20}/>{unread>0&&<span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1">{unread}</span>}</button>
      {showNotif&&<div className={`absolute right-0 top-11 w-[340px] max-w-[90vw] rounded-2xl border shadow-2xl p-2 z-50 ${cardCls}`}><div className="flex justify-between items-center px-2 py-1"><b>Notifications</b><button className="text-xs text-[#1e7bff] font-semibold" onClick={async()=>{await post("/api/social",{action:"readNotifications"});setUnread(0);}}>Mark all read</button></div>
       {notifs.length===0?<p className={`text-sm p-3 ${muted}`}>No notifications yet. Real events will appear here.</p>:notifs.slice(0,20).map(n=><button key={n.id} onClick={()=>{if(n.videoId)go({name:"watch",id:n.videoId});setShowNotif(false);}} className={`w-full text-left flex gap-2 p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-white/5 ${!n.isRead?"bg-blue-50/70 dark:bg-blue-500/10":""}`}><span className="w-8 h-8 rounded-full bg-[#1e7bff] grid place-items-center shrink-0 overflow-hidden">{avatar(n.actor?.displayName||"A",n.actor?.avatarUrl||"")}</span><span className="text-sm"><span>{n.message}</span><span className={`block text-xs ${muted}`}>{ago(n.createdAt)}</span></span></button>)}
      </div>}</div>}
     {user?<div className="relative"><button onClick={()=>setMenuOpen(!menuOpen)} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4aa0ff] to-[#063c9d] grid place-items-center overflow-hidden shrink-0 ring-2 ring-white dark:ring-[#17305a]">{avatar(user.displayName,user.avatarUrl)}</button>{isOwnerUser(user)&&<span className="absolute -bottom-1 -right-1 pointer-events-none"><CrownIcon size={14} className="text-amber-400 fill-amber-400 drop-shadow-[0_1px_1px_rgba(90,55,0,.6)]"/></span>}
      {menuOpen&&<div className={`absolute right-0 top-11 w-60 rounded-2xl border shadow-2xl p-2 z-50 ${cardCls}`}><div className="px-3 py-2 border-b border-blue-100 dark:border-white/10"><b className="flex items-center gap-1.5">{isOwnerUser(user)&&<Crown role={user.role} size={14}/>}{user.displayName}</b><p className={`text-xs ${muted}`}>@{user.username} • {isOwnerUser(user)?"Owner — absolute powers":user.role}</p></div>
       {[["Your channel",CircleUserRound,()=>go({name:"channel",username:user.username})],["Creator Studio",LayoutDashboard,()=>go({name:"studio"})],["Settings",Settings,()=>go({name:"settings"})],["Community",MessageCircle,()=>go({name:"community"})],["Live",Radio,()=>go({name:"live"})]].map(([l,Icon,fn]:any)=><button key={l} onClick={()=>{fn();setMenuOpen(false);}} className="w-full flex gap-2 items-center px-3 py-2 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-white/5"><Icon size={17}/>{l}</button>)}
       {(user.role==="admin"||user.role==="owner")&&<button onClick={()=>{go({name:"admin"});setMenuOpen(false);}} className="w-full flex gap-2 items-center px-3 py-2 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-white/5"><Shield className={isOwnerUser(user)?"text-amber-400":"text-[#1e7bff]"}/>{isOwnerUser(user)?<span className="flex items-center gap-1"><Crown role={user.role} size={15}/><span className="text-amber-400 font-semibold text-xs">OWNER</span></span>:null}{isOwnerUser(user)?"Owner Panel":"Moderation Panel"}</button>}
       <button onClick={async()=>{await post("/api/auth",{action:"logout"});setUser(null);setMenuOpen(false);notify("Signed out");}} className="w-full flex gap-2 items-center px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50"><LogOut size={17}/> Sign out</button>
      </div>}</div>:<button onClick={()=>setShowAuth(true)} className="flex items-center gap-1 sm:gap-1.5 border border-[#9db9e0] text-[#0b4fd8] dark:text-blue-300 font-semibold text-sm px-2.5 sm:px-3.5 py-2 rounded-full hover:bg-blue-50 dark:hover:bg-white/5 shrink-0"><CircleUserRound size={17}/><span className="hidden sm:inline">Sign in</span></button>}
    </div>
   </div>
   <form className="md:hidden px-3 pb-2.5" onSubmit={e=>{e.preventDefault();setQuery(searchInput);go({name:"search"});}}>
    <div className={`flex items-center h-10 rounded-full border overflow-hidden ${dark?"bg-[#0b1c39] border-[#294875]":"bg-white border-[#c8d7eb] shadow-inner shadow-blue-50"}`}>
     <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Search videos and creators" className="flex-1 px-4 py-2 bg-transparent text-sm min-w-0"/>
     {searchInput&&<button type="button" onClick={()=>{setSearchInput("");setQuery("");}} className="p-1 text-slate-500"><X size={16}/></button>}
     <button className={`px-4 h-full border-l ${dark?"bg-[#12294f] border-[#294875]":"bg-[#edf3fb] border-[#c8d7eb]"}`} aria-label="Search"><Search size={17}/></button>
    </div>
   </form>
  </header>

  {mobileNav&&<div className="md:hidden fixed inset-x-0 top-[106px] bottom-0 z-[60] bg-black/35" onClick={()=>setMobileNav(false)}><aside className={`w-[260px] h-full p-3 border-r shadow-2xl ${dark?"bg-[#07132a] border-[#203a66]":"bg-[#f9fbff] border-[#dbe6f5]"}`} onClick={e=>e.stopPropagation()}>
   <NavItem icon={Home} label="Home" active={route.name==="home"} collapsed={false} onClick={()=>{go({name:"home"});setMobileNav(false);}}/>
   <NavItem icon={Zap} label="Shorts" active={route.name==="shorts"} collapsed={false} onClick={()=>{go({name:"shorts"});setMobileNav(false);}}/>
   <NavItem icon={Users} label="Subscriptions" active={route.name==="subscriptions"} collapsed={false} onClick={()=>{setMobileNav(false); if(!user){requireAuth().then(ok=>{if(ok)go({name:"subscriptions"})})}else go({name:"subscriptions"});}}/>
   <div className="my-2 border-t border-blue-100 dark:border-white/10"/>
   <NavItem icon={Library} label="Library" active={route.name==="library"} collapsed={false} onClick={()=>{setMobileNav(false); if(!user){requireAuth().then(ok=>{if(ok)go({name:"library"})})}else go({name:"library"});}}/>
   <NavItem icon={History} label="History" active={route.name==="history"} collapsed={false} onClick={()=>{setMobileNav(false); if(!user){requireAuth().then(ok=>{if(ok)go({name:"history"})})}else go({name:"history"});}}/>
   <NavItem icon={MessageCircle} label="Community" active={route.name==="community"} collapsed={false} onClick={()=>{go({name:"community"});setMobileNav(false);}}/>
   <NavItem icon={Radio} label="Live" active={route.name==="live"} collapsed={false} onClick={()=>{go({name:"live"});setMobileNav(false);}}/>
   {user&&<NavItem icon={LayoutDashboard} label="Creator Studio" active={route.name==="studio"} collapsed={false} onClick={()=>{go({name:"studio"});setMobileNav(false);}}/>}
  </aside></div>}

  <div className="flex max-w-[1600px] mx-auto">
   {/* SIDEBAR desktop */}
   <aside className={`hidden md:block sticky top-14 h-[calc(100vh-56px)] shrink-0 p-2 transition-all ${sidebar?"w-52":"w-[68px]"}`}>
     <NavItem icon={Home} label="Home" active={route.name==="home"} collapsed={!sidebar} onClick={()=>go({name:"home"})}/>
     <NavItem icon={Zap} label="Shorts" active={route.name==="shorts"} collapsed={!sidebar} onClick={()=>go({name:"shorts"})}/>
     <NavItem icon={Users} label="Subscriptions" active={route.name==="subscriptions"} collapsed={!sidebar} onClick={()=>user?go({name:"subscriptions"}):requireAuth().then(ok=>{if(ok)go({name:"subscriptions"})})}/>
     <NavItem icon={Library} label="Library" active={route.name==="library"} collapsed={!sidebar} onClick={()=>user?go({name:"library"}):requireAuth().then(ok=>{if(ok)go({name:"library"})})}/>
     <NavItem icon={History} label="History" active={route.name==="history"} collapsed={!sidebar} onClick={()=>user?go({name:"history"}):requireAuth().then(ok=>{if(ok)go({name:"history"})})}/>
     <NavItem icon={MessageCircle} label="Community" active={route.name==="community"} collapsed={!sidebar} onClick={()=>go({name:"community"})}/>
     <NavItem icon={Radio} label="Live" active={route.name==="live"} collapsed={!sidebar} onClick={()=>go({name:"live"})}/>
     {user&&<><div className="my-2 border-t border-blue-100 dark:border-white/10"/><NavItem icon={LayoutDashboard} label="Studio" active={route.name==="studio"} collapsed={!sidebar} onClick={()=>go({name:"studio"})}/></>}

   </aside>

   <main className="flex-1 min-w-0 pb-20 md:pb-8">
    {route.name==="watch"&&route.id? <Watch key={route.id} id={route.id} user={user} go={go} notify={notify} requireAuth={requireAuth} dark={dark} anonId={anonRef.current}/>
    : route.name==="shorts"? <Shorts user={user} go={go} notify={notify} requireAuth={requireAuth} anonId={anonRef.current}/>
    : route.name==="channel"&&route.username? <Channel key={route.username} username={route.username} user={user} go={go} notify={notify} requireAuth={requireAuth}/>
    : route.name==="library"? <LibraryPage user={user} go={go} notify={notify}/>
    : route.name==="history"? <HistoryPage user={user} go={go} notify={notify}/>
    : route.name==="playlist"&&route.id? <PlaylistPage id={route.id} user={user} go={go}/>
    : route.name==="studio"? <Studio user={user} go={go} notify={notify} requireAuth={requireAuth} onUpload={()=>setShowUpload(true)}/>
    : route.name==="community"? <Community user={user} go={go} notify={notify} requireAuth={requireAuth}/>
    : route.name==="live"? <LivePage user={user} go={go} notify={notify} requireAuth={requireAuth}/>
    : route.name==="settings"? <SettingsPage user={user} setUser={setUser} notify={notify} go={go}/>
    : route.name==="admin"? <AdminPage user={user} notify={notify} go={go}/>
    : <>
      {/* HOME / SEARCH / SUBSCRIPTIONS */}
      <div className="sticky top-[106px] md:top-14 z-30 px-3 sm:px-4 py-2 border-b backdrop-blur-xl" style={{background:dark?"rgba(5,11,29,.94)":"rgba(246,248,252,.94)",borderColor:dark?"#1c3464":"#dbe6f5"}}>
       <div className="relative flex items-center">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-12">
         {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition ${cat===c?"bg-gradient-to-b from-[#287ded] to-[#0b4fd8] text-white shadow-sm shadow-blue-800/20":dark?"bg-[#102344] hover:bg-[#19345d]":"bg-[#e9eff8] hover:bg-[#dce7f5] text-slate-700"}`}>{c}</button>)}
        </div>
        <div className="absolute right-0 top-0 z-10">
         <button onClick={()=>setFilterOpen(!filterOpen)} aria-label="Filters" className={`h-[34px] px-2.5 rounded-lg border flex items-center gap-1.5 text-sm font-semibold shadow-sm ${dark?"bg-[#0a1730] border-[#294875]":"bg-[#f6f8fc] border-[#c8d7eb]"}`}><SlidersHorizontal size={16}/><span className="hidden sm:inline">Filters</span></button>
         {filterOpen&&<div className={`absolute right-0 top-10 w-52 rounded-xl border shadow-xl p-3 space-y-2 ${cardCls}`}>
          <label className="block text-xs font-semibold text-slate-500">Sort by<select value={sort} onChange={e=>setSort(e.target.value)} className="block w-full mt-1 rounded-lg border px-2 py-2 text-sm bg-transparent"><option value="new">Newest</option><option value="views">Most viewed</option><option value="old">Oldest</option></select></label>
          <label className="block text-xs font-semibold text-slate-500">Content type<select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="block w-full mt-1 rounded-lg border px-2 py-2 text-sm bg-transparent"><option value="all">All types</option><option value="videos">Videos</option><option value="shorts">Shorts</option></select></label>
          <p className="text-[10px] leading-snug text-slate-400">Catalogue media is freely licensed from Wikimedia Commons (Public domain, CC0, CC BY, CC BY-SA). Author and licence are shown on each video.</p>
         </div>}
        </div>
       </div>
      </div>
      <div className="px-3 sm:px-4">
      {route.name==="subscriptions"&&<div className="py-3"><h1 className="text-xl font-black">Subscriptions</h1><p className={`text-sm ${muted}`}>Latest uploads from creators you subscribe to — real subscriptions only.</p></div>}
      {route.name==="search"&&<div className="py-3"><h1 className="text-xl font-black">Results for “{query}”</h1><p className={`text-sm ${muted}`}>{totalVideos.toLocaleString()} video(s){channels.length?`, ${channels.length} channel(s)`:""} found in the ARINX database.</p>
        {channels.length>0&&<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">{channels.map(c=><button key={c.id} onClick={()=>go({name:"channel",username:c.username})} className={`flex gap-3 items-center text-left p-3 rounded-2xl border ${cardCls}`}><span className="w-12 h-12 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0">{avatar(c.displayName,c.avatarUrl)}</span><span><b className="flex items-center gap-1">{c.displayName}</b><span className={`text-xs ${muted}`}>@{c.username} • {fmt(c.subscribers)} subscribers (real)</span><span className={`block text-xs line-clamp-1 ${muted}`}>{c.bio}</span></span></button>)}</div>}
      </div>}
      
      {!loading&&videos.length>0&&<p className="text-[11px] text-slate-500 pt-2">Showing {videos.length.toLocaleString()} of {totalVideos.toLocaleString()} available videos • ARINX uploads and clearly labelled external embeds</p>}
      {loading? <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-5 py-3">{Array.from({length:8}).map((_,i)=><div key={i} className="animate-pulse"><div className={`aspect-video rounded-2xl ${dark?"bg-[#12244d]":"bg-blue-100"}`}/><div className={`h-3 rounded mt-3 w-3/4 ${dark?"bg-[#12244d]":"bg-blue-100"}`}/><div className={`h-3 rounded mt-2 w-1/2 ${dark?"bg-[#12244d]":"bg-blue-100"}`}/></div>)}</div>
      : err? <Empty title="Something went wrong" text={err} action="Retry" onAction={loadVideos}/>
      : videos.length===0? <Empty title={route.name==="subscriptions"?"No subscription uploads yet":"No videos here yet"} text={route.name==="subscriptions"?"Subscribe to creators and their new uploads will appear here.":"Nothing matches this filter yet. The ARINX catalogue is built from freely-licensed Wikimedia Commons media plus real creator uploads — no fabricated entries."} action={user?"Upload a video":"Create free account"} onAction={()=>user?setShowUpload(true):requireAuth().then(ok=>{if(ok)setShowUpload(true)})}/>
      : <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-5 py-3">{videos.map(v=><VideoCard key={v.id} v={v} go={go} muted={muted} staff={isStaffUser(user)} onAdminDelete={(vid:string)=>{setVideos(cur=>cur.filter(x=>x.id!==vid)); setTotalVideos(t=>Math.max(0,t-1)); notify("Video permanently deleted by admin.");}}/>)}</div>}
      {!loading&&hasMore&&<div className="flex flex-col items-center gap-2 py-5"><button onClick={loadMoreVideos} disabled={loadingMore} className="min-w-40 bg-gradient-to-b from-[#287ded] to-[#0b4fd8] disabled:opacity-60 text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-sm shadow-blue-800/20">{loadingMore?"Loading videos…":"Load more videos"}</button><span className="text-xs text-slate-500">{videos.length.toLocaleString()} of {totalVideos.toLocaleString()}</span></div>}
      </div>
     </>}
   </main>
  </div>

  {/* MOBILE BOTTOM NAV */}
  <nav className={`md:hidden fixed bottom-0 inset-x-0 z-50 border-t backdrop-blur ${dark?"bg-[#050b1d]/95 border-[#1c3464]":"bg-white/95 border-blue-100"}`}>
    <div className="grid grid-cols-5 h-16">
      {[["Home",Home,"home"],["Shorts",Zap,"shorts"],["Upload",Plus,"upload"],["Subs",Users,"subscriptions"],["Library",Library,"library"]].map(([l,Icon,n]:any)=>(
        <button key={n} onClick={()=>{ if(n==="upload"){user?setShowUpload(true):requireAuth().then(ok=>{if(ok)setShowUpload(true)});} else if((n==="subscriptions"||n==="library")&&!user){ requireAuth().then(ok=>{if(ok)go({name:n})}); } else go({name:n});}} className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${route.name===n?"text-[#1e7bff]":""}`}>{n==="upload"?<span className="w-9 h-7 rounded-lg bg-[#0b4fd8] text-white grid place-items-center"><Plus size={18}/></span>:<Icon size={21}/>}{l}</button>))}
    </div>
  </nav>

  {showAuth&&<AuthModal close={()=>setShowAuth(false)} setUser={setUser} notify={notify} dark={dark}/>}
  {showUpload&&user&&<UploadModal close={()=>setShowUpload(false)} notify={notify} go={go} dark={dark}/>}
  {toast&&<div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-2xl flex gap-2 items-center max-w-[92vw]"><Check size={16} className="text-emerald-400 shrink-0"/>{toast}</div>}
 </div>;
}
function NavItem({icon:Icon,label,active,collapsed,onClick}:any){ return <button onClick={onClick} className={`w-full rounded-xl font-medium transition ${collapsed?"h-[68px] flex flex-col items-center justify-center gap-1 px-1 text-[10px] leading-tight text-center":"flex items-center gap-3 px-3 py-2.5 text-sm mb-0.5"} ${active?"bg-gradient-to-b from-[#287ded] to-[#0b4fd8] text-white shadow-sm shadow-blue-800/20":"hover:bg-blue-50 dark:hover:bg-white/5"}`} title={label}><Icon size={20} className="shrink-0"/>{collapsed?<span className="max-w-[62px]">{label}</span>:label}</button>; }
function Empty({title,text,action,onAction}:any){ return <div className="text-center py-14 px-4 fadeUp"><div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-[#12244d] grid place-items-center text-[#0b4fd8]"><Film size={28}/></div><h3 className="font-black text-lg mt-4">{title}</h3><p className="text-sm text-slate-500 max-w-md mx-auto mt-1">{text}</p>{action&&<button onClick={onAction} className="mt-4 bg-[#0b4fd8] text-white font-semibold text-sm px-5 py-2.5 rounded-full">{action}</button>}</div>; }

/** ARINX uploads stream through our own media endpoint; Commons media streams from Wikimedia. */
const mediaSrc=(v:any)=> v.sourceType==="upload"? `/api/media/${v.fileName}` : v.sourceUrl;
const licenceShort=(l:string)=> !l? "" : /^public domain/i.test(l)? "Public domain" : /^cc0/i.test(l)? "CC0" : l;
const creatorName=(v:any)=> v.creator?.displayName || v.attribution || "Wikimedia Commons";
function Thumb({v,className=""}:any){ if(v.thumbnailUrl) return <img src={v.thumbnailUrl} className={`w-full h-full object-cover ${className}`} alt={v.title} loading="lazy"/>; return <div className={`w-full h-full bg-gradient-to-br from-[#0b4fd8] to-[#38a3ff] grid place-items-center ${className}`}><Play className="text-white/90 fill-white/90" size={36}/></div>; }
function VideoCard({v,go,muted,staff,onAdminDelete}:any){ return <article className="group cursor-pointer fadeUp relative" onClick={()=>go({name:"watch",id:v.id})}>
  {staff&&<button title="Admin: delete this video" aria-label="Admin delete video" onClick={async e=>{e.stopPropagation(); if(!confirm(`Admin delete “${v.title}” permanently?`))return; const reason=""; try{await post("/api/admin",{action:"deleteVideo",videoId:v.id,reason}); onAdminDelete?.(v.id);}catch(err:any){alert(err.message)}}} className="absolute z-10 top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1"><Trash2 size={11}/> Admin delete</button>}
  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200"><Thumb v={v}/>{v.durationSec>0&&<span className="absolute bottom-2 right-2 bg-black/75 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-md">{dur(v.durationSec)}</span>}{v.isShort&&<span className="absolute top-2 left-2 bg-[#0b4fd8] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex gap-1 items-center"><Zap size={10}/>SHORT</span>}{v.license&&<span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full" title={`Freely licensed: ${v.license}`}>{licenceShort(v.license)}</span>}<span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 bg-black/20 transition"><span className="w-12 h-12 rounded-full bg-[#0b4fd8] grid place-items-center"><Play className="text-white fill-white ml-0.5"/></span></span></div>
  <div className="flex gap-2.5 mt-2.5"><button onClick={e=>{e.stopPropagation(); if(v.creator)go({name:"channel",username:v.creator.username});}} className="w-9 h-9 rounded-full bg-[#0b4fd8] grid place-items-center shrink-0 overflow-hidden">{v.creator?avatar(v.creator.displayName,v.creator.avatarUrl):<span className="text-white text-xs font-bold">YT</span>}</button>
  <div className="min-w-0"><h3 className="font-semibold text-[15px] leading-snug line-clamp-2">{v.title}</h3><p className={`text-[13px] flex items-center gap-1 ${muted||"text-slate-500"}`}><Crown role={v.creator?.role} size={12}/>{creatorName(v)} {v.creator&&<>• @{v.creator.username}</>}</p><p className={`text-[13px] ${muted||"text-slate-500"}`}>{fmt(v.views)} views • {ago(v.publishedAt||v.createdAt)} • {v.category}</p></div></div></article>; }

function AuthModal({close,setUser,notify,dark}:any){
 const [mode,setMode]=useState("login"); const [f,setF]=useState({email:"",password:"",displayName:"",username:""}); const [e,setE]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(ev:any){ ev.preventDefault(); setBusy(true); setE(""); try{ const j=await post("/api/auth",{action:mode,...f}); setUser(j.user); notify(mode==="login"?"Welcome back to ARINX!":"Account created — welcome to ARINX!"); close(); }catch(err:any){setE(err.message)} setBusy(false); }
 return <Modal close={close} dark={dark}><div className="text-center mb-4"><span className="w-12 h-12 rounded-2xl bg-[#0b4fd8] grid place-items-center mx-auto"><Play className="text-white fill-white ml-0.5"/></span><h2 className="font-black text-xl mt-2">{mode==="login"?"Sign in to ARINX":"Create your channel"}</h2><p className="text-sm text-slate-500">Your World. Your Videos.</p></div>
 {e&&<p className="bg-red-50 text-red-600 text-sm p-2.5 rounded-xl mb-3">{e}</p>}
 <form onSubmit={submit} className="space-y-2.5">
  {mode==="register"&&<><input required placeholder="Display name (e.g. Alex Creates)" value={f.displayName} onChange={e=>setF({...f,displayName:e.target.value})} className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-transparent"/><input required placeholder="Username (unique, e.g. alexcreates)" value={f.username} onChange={e=>setF({...f,username:e.target.value})} className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-transparent"/></>}
  <input required type="email" placeholder="Email address" value={f.email} onChange={e=>setF({...f,email:e.target.value})} className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-transparent"/>
  <input required type="password" placeholder="Password (8+ characters)" value={f.password} onChange={e=>setF({...f,password:e.target.value})} className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-transparent"/>
  <button disabled={busy} className="w-full bg-[#0b4fd8] hover:bg-[#1e7bff] text-white font-bold py-2.5 rounded-xl disabled:opacity-60">{busy?"Please wait…":mode==="login"?"Sign in":"Create account"}</button>
 </form>
 <div className="flex justify-between mt-3 text-sm"><button className="text-[#1e7bff] font-semibold" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"Create account":"Already have an account?"}</button>
 {mode==="login"&&<button className="text-slate-500" onClick={async()=>{try{await post("/api/auth",{action:"resetRequest",email:f.email})}catch(err:any){setE(err.message)}}}>Forgot password?</button>}</div>
 <p className="text-[11px] text-slate-400 mt-3 text-center">Passwords are bcrypt-hashed and never stored in plain text. By continuing you agree to the ARINX Community Guidelines.</p></Modal>;
}
function Modal({children,close,dark,wide}:any){ return <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto" onClick={close}><div onClick={e=>e.stopPropagation()} className={`w-full ${wide?"max-w-2xl":"max-w-md"} rounded-3xl p-5 my-6 relative fadeUp ${dark?"bg-[#0a1730] text-slate-50":"bg-white"}`}><button onClick={close} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><X size={18}/></button>{children}</div></div>; }

function UploadModal({close,notify,go,dark}:any){
 const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState(""); const [thumb,setThumb]=useState<Blob|null>(null); const [thumbUrl,setThumbUrl]=useState("");
 const [title,setTitle]=useState(""); const [desc,setDesc]=useState(""); const [catv,setCatv]=useState("Entertainment"); const [vis,setVis]=useState("public"); const [isShort,setIsShort]=useState(false); const [allowDl,setAllowDl]=useState(true);
 const [durationSec,setDurationSec]=useState(0); const [vertical,setVertical]=useState(false); const [progress,setProgress]=useState(0); const [busy,setBusy]=useState(false); const [e,setE]=useState("");
 function onFile(f:File|undefined){ if(!f)return; setFile(f); setPreview(URL.createObjectURL(f)); if(!title) setTitle(f.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," ")); }
 function captureThumb(video:HTMLVideoElement){ try{ const c=document.createElement("canvas"); c.width=640; c.height=Math.round(640*video.videoHeight/video.videoWidth)||360; c.getContext("2d")?.drawImage(video,0,0,c.width,c.height); c.toBlob(b=>{if(b){setThumb(b); setThumbUrl(URL.createObjectURL(b));}},"image/jpeg",.85);}catch{} }
 async function putToUrl(url:string, body:Blob|File, contentType:string, onProgress?:(p:number)=>void){
   await new Promise<void>((resolve,reject)=>{
     const xhr=new XMLHttpRequest(); xhr.open("PUT",url);
     xhr.setRequestHeader("Content-Type",contentType);
     if(onProgress) xhr.upload.onprogress=ev=>{if(ev.total)onProgress(Math.round(ev.loaded/ev.total*100));};
     xhr.onload=()=>{ xhr.status>=200&&xhr.status<300?resolve():reject(new Error(`Storage rejected the upload (HTTP ${xhr.status}). Nothing was published.`)); };
     xhr.onerror=()=>reject(new Error("Network error while uploading to storage. Nothing was published — please retry."));
     xhr.send(body);
   });
 }
 async function submit(){ if(!file)return setE("Choose a video file first — tap the picker to open your gallery / files."); setBusy(true); setE(""); setProgress(0);
  try{
   // Step 1 — small JSON request. The server decides which upload path this deployment uses.
   const intent=await api("/api/upload/intent",{method:"POST",body:JSON.stringify({fileName:file.name,size:file.size,type:file.type,title,description:desc,category:catv,visibility:vis,isShort,allowDownload:allowDl,durationSec,vertical,hasThumbnail:!!thumb})});
   if(intent.mode==="presigned"){
     // Serverless-safe path: bytes go browser → bucket, never through the function,
     // so Netlify/Lambda's 6 MB payload cap and 60s timeout do not apply.
     if(intent.thumbnailUploadUrl&&thumb) await putToUrl(intent.thumbnailUploadUrl,thumb,intent.thumbnailContentType||"image/jpeg");
     await putToUrl(intent.uploadUrl,file,intent.contentType||file.type||"video/mp4",p=>setProgress(p));
     // Step 2 — server confirms the object exists in the bucket before publishing.
     const done=await api("/api/upload/complete",{method:"POST",body:JSON.stringify({videoId:intent.videoId})});
     setBusy(false); notify("🎬 Published! Verified in object storage and live on ARINX."); close(); go({name:"watch",id:done.video.id}); return;
   }
   // Local-disk deployments: classic multipart POST with real progress.
   const fd=new FormData(); fd.append("file",file); if(thumb) fd.append("thumbnail",thumb,"thumb.jpg"); fd.append("title",title); fd.append("description",desc); fd.append("category",catv); fd.append("visibility",vis); fd.append("isShort",String(isShort)); fd.append("allowDownload",String(allowDl)); fd.append("durationSec",String(durationSec)); fd.append("vertical",String(vertical));
   const xhr=new XMLHttpRequest(); xhr.open("POST","/api/upload"); xhr.upload.onprogress=ev=>{if(ev.total)setProgress(Math.round(ev.loaded/ev.total*100));};
   xhr.onload=()=>{ setBusy(false); try{const j=JSON.parse(xhr.responseText); if(xhr.status>=400) throw new Error(j.error||"Upload failed"); notify("🎬 Published! Your video is live on ARINX."); close(); go({name:"watch",id:j.video.id});}catch(err:any){setE(err.message)} };
   xhr.onerror=()=>{setBusy(false); setE("Network error during upload — please retry.");}; xhr.send(fd);
  }catch(err:any){ setBusy(false); setE(err.message||"Upload failed. Nothing was published."); }
 }
 return <Modal close={close} dark={dark} wide><h2 className="font-black text-xl flex gap-2 items-center"><Upload className="text-[#1e7bff]"/> Upload video</h2><p className="text-sm text-slate-500">Opens your device gallery / file picker. MP4, MOV, WebM up to 200MB. Stored durably on the server — never just in your browser.</p>
 {e&&<p className="bg-red-50 text-red-600 text-sm p-2.5 rounded-xl mt-3">{e}</p>}
 <label className="mt-4 block border-2 border-dashed border-blue-300 rounded-2xl p-4 text-center cursor-pointer hover:bg-blue-50/60 dark:hover:bg-white/5">
   <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*,.mov,.mp4,.webm" className="hidden" onChange={e=>onFile(e.target.files?.[0])}/>
   {file?<span className="text-sm font-semibold">{file.name} • {(file.size/1048576).toFixed(1)} MB</span>:<span className="text-sm"><Upload className="mx-auto mb-1 text-[#1e7bff]"/><b>Tap to pick a video</b><br/><span className="text-slate-500">from Photos, Gallery or Files</span></span>}
 </label>
 {preview&&<div className="mt-3 rounded-2xl overflow-hidden bg-black aspect-video max-h-64 mx-auto w-full"><video src={preview} controls className="w-full h-full" onLoadedMetadata={e=>{const v=e.currentTarget; setDurationSec(Math.round(v.duration)); setVertical(v.videoHeight>v.videoWidth); if(durationSec<=60&&v.videoHeight>v.videoWidth) setIsShort(true); v.currentTime=Math.min(1,v.duration/2);}} onSeeked={e=>captureThumb(e.currentTarget)}/></div>}
 {thumbUrl&&<p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Check size={13} className="text-emerald-500"/> Auto thumbnail captured — or upload your own: <label className="text-[#1e7bff] font-semibold cursor-pointer">choose image<input type="file" accept="image/*" className="hidden" onChange={async e=>{const f=e.target.files?.[0]; if(f){setThumb(f); setThumbUrl(URL.createObjectURL(f));}}}/></label></p>}
 <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
  <input placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm bg-transparent sm:col-span-2"/>
  <textarea placeholder="Description — tell viewers what this video is about…" value={desc} onChange={e=>setDesc(e.target.value)} rows={3} className="border rounded-xl px-3 py-2.5 text-sm bg-transparent sm:col-span-2"/>
  <select value={catv} onChange={e=>setCatv(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm bg-transparent">{CATS.slice(1).map(c=><option key={c}>{c}</option>)}</select>
  <select value={vis} onChange={e=>setVis(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm bg-transparent"><option value="public">Public — everyone</option><option value="unlisted">Unlisted — link only</option><option value="private">Private — only me</option></select>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isShort} onChange={e=>setIsShort(e.target.checked)} className="accent-[#0b4fd8] w-4 h-4"/> Publish as Short (vertical / ≤60s)</label>
  <p className="text-xs text-slate-500 flex items-center gap-1.5 sm:col-span-2"><Gauge size={14} className="text-emerald-600 shrink-0"/> Uploaded for <b>streaming playback</b> on ARINX. Files are played over HTTP range requests and are not offered as downloads.</p>
 </div>
 {busy&&<div className="mt-3"><div className="h-2.5 bg-blue-100 rounded-full overflow-hidden"><div className="h-full bg-[#1e7bff] transition-all" style={{width:progress+"%"}}/></div><p className="text-xs text-slate-500 mt-1">Uploading… {progress}% — keep this open.</p></div>}
 <button disabled={busy} onClick={submit} className="w-full mt-4 bg-[#0b4fd8] hover:bg-[#1e7bff] text-white font-bold py-3 rounded-xl disabled:opacity-60">{busy?"Uploading…":"Publish video"}</button>
 </Modal>;
}

/* ---------------- WATCH ---------------- */
function Watch({id,user,go,notify,requireAuth,dark,anonId}:any){
 const [v,setV]=useState<any>(null); const [related,setRelated]=useState<any[]>([]); const [comments,setComments]=useState<any[]>([]); const [total,setTotal]=useState(0); const [text,setText]=useState(""); const [replyTo,setReplyTo]=useState<any>(null); const [e,setE]=useState(""); const [showDesc,setShowDesc]=useState(false); const [playlists,setPlaylists]=useState<any[]>([]); const [showSave,setShowSave]=useState(false); const [speed,setSpeed]=useState(1); const vidRef=useRef<HTMLVideoElement>(null); const counted=useRef(false);
 // Streaming quality: real transcodes published by Wikimedia Commons, so switching
 // swaps to an actual different rendition rather than faking a selector.
 const rends:any[] = Array.isArray((v as any)?.renditions)?(v as any).renditions:[];
 const [quality,setQuality]=useState("");
 const [playSrc,setPlaySrc]=useState("");
 const pending=useRef<{t:number;play:boolean}|null>(null);
 useEffect(()=>{ if(!v) return; const r:Array<any>=Array.isArray((v as any).renditions)?(v as any).renditions:[]; const best=r.length?r[r.length-1]:null; setQuality(best?best.label:"auto"); setPlaySrc(best?best.url:mediaSrc(v)); },[v?.id]);
 function changeQuality(label:string){ const el=vidRef.current; if(el) pending.current={t:el.currentTime,play:!el.paused}; const r=rends.find((x:any)=>x.label===label); setQuality(label); setPlaySrc(r?r.url:mediaSrc(v)); }
 const load=useCallback(async()=>{ try{ const j=await api(`/api/videos/${id}`); setV(j.video); const c=await api(`/api/comments?videoId=${id}`); setComments(c.comments); setTotal(c.total); const r=await api(`/api/videos?category=${encodeURIComponent(j.video.category)}`); setRelated(r.videos.filter((x:any)=>x.id!==id).slice(0,12)); if(user){const p=await api("/api/social?what=playlists"); setPlaylists(p.playlists);} }catch(err:any){setE(err.message)} },[id,user]);
 useEffect(()=>{load()},[load]);
 async function countView(){ if(counted.current) return; counted.current=true; try{await post(`/api/videos/${id}`,{action:"view",anonId});}catch{} }
 async function react(type:string){ if(!user)return requireAuth(); const next=v.myReaction===type?null:type; try{const j=await post(`/api/videos/${id}`,{action:"reaction",type:next}); setV({...v,...j});}catch(err:any){notify(err.message)} }
 async function subscribe(){ if(!user)return requireAuth(); try{const j=await post("/api/social",{action:"subscribe",creatorId:v.userId}); setV({...v,isSubscribed:j.isSubscribed,creatorSubscribers:j.count}); notify(j.isSubscribed?`Subscribed to ${v.creator.displayName}`:"Unsubscribed");}catch(err:any){notify(err.message)} }
 async function sendComment(){ if(!user)return requireAuth(); if(!text.trim())return; try{const j=await post(`/api/videos/${id}`,{action:"comment",content:text,parentId:replyTo?.id}); if(replyTo){ setComments(comments.map(c=>c.id===replyTo.id?{...c,replies:[...(c.replies||[]),j.comment]}:c)); } else setComments([j.comment,...comments]); setTotal(total+1); setText(""); setReplyTo(null);}catch(err:any){notify(err.message)} }
 async function share(){ const url=siteUrl(`/watch/${id}`); const data={title:v.title,text:`Watch “${v.title}” on ARINX`,url}; if(navigator.share){try{await navigator.share(data); return}catch{}} await navigator.clipboard.writeText(url); notify("Link copied — share it anywhere. It opens inside ARINX."); }
 if(e) return <div className="p-4"><Empty title="Video unavailable" text={e} action="Back home" onAction={()=>go({name:"home"})}/></div>;
 if(!v) return <div className="p-6 animate-pulse"><div className="aspect-video bg-blue-100 dark:bg-[#12244d] rounded-2xl"/><div className="h-5 bg-blue-100 dark:bg-[#12244d] rounded mt-4 w-2/3"/></div>;
 return <div className="lg:flex gap-5 px-0 sm:px-4 py-0 sm:py-4 max-w-[1500px] mx-auto fadeUp">
  <div className="flex-1 min-w-0 px-3 sm:px-0">
   <div className="relative bg-black sm:rounded-2xl overflow-hidden aspect-video shadow-xl">
    {/* Streaming player: range-request progressive playback. controlsList hides the
        native "Download" entry so the UI is player-first like a streaming service. */}
    <video
      ref={vidRef} key={playSrc} controls playsInline preload="metadata"
      controlsList="nodownload" disablePictureInPicture={false}
      className="w-full h-full bg-black" poster={v.thumbnailUrl||undefined}
      onPlay={countView} onContextMenu={e=>e.preventDefault()}
      onLoadedMetadata={e=>{ const p=pending.current; if(p){ pending.current=null; try{ e.currentTarget.currentTime=p.t; }catch{} if(p.play) e.currentTarget.play().catch(()=>{}); } }}
      src={playSrc}
    />
   </div>
   {v.sourceType==="commons"&&<p className="mt-2 text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2">🎞 Freely-licensed media from <b>Wikimedia Commons</b> — <b>{v.license}</b>, author {v.attribution}. It streams straight into the ARINX player, so the views, likes and comments below are real ARINX records. <a href={v.sourcePage} target="_blank" rel="noreferrer noopener" className="underline font-semibold">View source &amp; licence</a></p>}
   <h1 className="font-black text-lg sm:text-[22px] leading-snug mt-3">{v.title}</h1>
   <div className="flex flex-wrap items-center gap-2 mt-2">
     {v.creator? <button onClick={()=>go({name:"channel",username:v.creator.username})} className="flex items-center gap-2 mr-1"><span className="w-10 h-10 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden">{avatar(v.creator.displayName,v.creator.avatarUrl)}</span><span className="text-left"><b className="flex items-center gap-1 text-sm leading-tight"><Crown role={v.creator.role}/>{v.creator.displayName}</b><span className="text-xs text-slate-500">{fmt(v.creatorSubscribers)} subscribers</span></span></button>
     : <span className="flex items-center gap-2 mr-1"><span className="w-10 h-10 rounded-full bg-emerald-600 grid place-items-center text-white shrink-0"><Film size={17}/></span><span className="text-left"><b className="block text-sm leading-tight">{v.attribution||"Wikimedia Commons"}</b><span className="text-xs text-slate-500">Freely-licensed media{v.license?` • ${v.license}`:""}</span></span></span>}
     {v.creator&&user?.id!==v.userId&&<button onClick={subscribe} className={`px-4 py-2 rounded-full text-sm font-bold ${v.isSubscribed?"bg-slate-200 dark:bg-white/10 text-inherit":"bg-[#0b4fd8] text-white hover:bg-[#1e7bff]"}`}>{v.isSubscribed?"Subscribed":"Subscribe"}</button>}
     <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden ml-auto">
       <button onClick={()=>react("like")} className={`flex gap-1.5 items-center px-3.5 py-2 text-sm font-semibold ${v.myReaction==="like"?"text-[#1e7bff]":""}`}><ThumbsUp size={17} className={v.myReaction==="like"?"fill-blue-200":""}/>{fmt(v.likes)}</button>
       <span className="w-px h-5 bg-slate-300 dark:bg-white/20"/>
       <button onClick={()=>react("dislike")} className={`px-3.5 py-2 ${v.myReaction==="dislike"?"text-[#1e7bff]":""}`}><ThumbsDown size={17}/></button>
     </div>
     <button onClick={share} className="flex gap-1.5 items-center bg-slate-100 dark:bg-white/10 px-3.5 py-2 rounded-full text-sm font-semibold"><Share2 size={16}/> Share</button>
     <button onClick={()=>{if(!user)return requireAuth(); setShowSave(!showSave);}} className="flex gap-1.5 items-center bg-slate-100 dark:bg-white/10 px-3.5 py-2 rounded-full text-sm font-semibold"><Bookmark size={16}/> Save</button>
     {rends.length>1? <select value={quality} onChange={e=>changeQuality(e.target.value)} className="bg-slate-100 dark:bg-white/10 rounded-full text-sm px-2.5 py-2 font-semibold" aria-label="Video quality" title={`Streaming quality — ${rends.length} renditions available`}>
       {rends.map((r:any)=><option key={r.label} value={r.label}>{r.label}{r.width?` · ${r.width}×${r.height}`:""}</option>)}
     </select> : <span className="flex gap-1.5 items-center bg-slate-100 dark:bg-white/10 px-3.5 py-2 rounded-full text-sm font-semibold">{quality==="auto"?"Auto quality":quality}</span>}
     <span className="flex gap-1.5 items-center bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 px-3.5 py-2 rounded-full text-sm font-semibold" title="Streamed over HTTP range requests — no file download offered"><Gauge size={16}/> Streaming</span>
     <><select value={speed} onChange={e=>{const s=Number(e.target.value); setSpeed(s); if(vidRef.current)vidRef.current.playbackRate=s;}} className="bg-slate-100 dark:bg-white/10 rounded-full text-sm px-2 py-2" aria-label="Playback speed"><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select>
     <button onClick={async()=>{try{ if(document.pictureInPictureElement) await document.exitPictureInPicture(); else await vidRef.current?.requestPictureInPicture(); }catch{notify("Picture-in-picture is not available for this video/browser.");}}} className="bg-slate-100 dark:bg-white/10 p-2 rounded-full" title="Picture in picture"><PictureInPicture2 size={17}/></button></>
     <ReportBtn targetType="video" targetId={v.id} user={user} requireAuth={requireAuth} notify={notify}/>
   </div>
   {isStaffUser(user)&&<div className="mt-3 border border-red-200 dark:border-red-500/40 bg-red-50/70 dark:bg-red-500/10 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-sm"><span className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300 mr-1"><Shield size={15}/> Admin controls</span>
     {v.visibility!=="private"?<button onClick={async()=>{const reason=""; try{await post("/api/admin",{action:"takedownVideo",videoId:v.id,reason}); setV({...v,visibility:"private",status:"takedown"}); notify("Video taken down — hidden from everyone except admins.");}catch(err:any){notify(err.message)}}} className="bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-full text-xs">Take down</button>
     :<button onClick={async()=>{try{await post("/api/admin",{action:"restoreVideo",videoId:v.id}); setV({...v,visibility:"public",status:"ready"}); notify("Video restored to public.");}catch(err:any){notify(err.message)}}} className="bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-full text-xs">Restore</button>}
     <button onClick={async()=>{if(!confirm(`Permanently delete “${v.title}”${v.creator?` by @${v.creator.username}`:""}? This removes the record${v.fileName?" and stored file":""} and cannot be undone.`))return; const reason=""; try{await post("/api/admin",{action:"deleteVideo",videoId:v.id,reason}); notify("Video permanently deleted."); go({name:"home"});}catch(err:any){notify(err.message)}}} className="bg-red-600 text-white font-semibold px-3 py-1.5 rounded-full text-xs flex items-center gap-1"><Trash2 size={13}/> Delete video</button>
     {v.creator&&v.userId!==user.id&&<button onClick={async()=>{if(!confirm(`Suspend @${v.creator.username}? They will be signed out and unable to sign in until restored.`))return; try{await post("/api/admin",{action:"setStatus",userId:v.userId,status:"suspended"}); notify(`@${v.creator.username} suspended.`);}catch(err:any){notify(err.message)}}} className="border border-red-300 text-red-700 dark:text-red-300 font-semibold px-3 py-1.5 rounded-full text-xs">Suspend creator</button>}
     {v.status==="takedown"&&<span className="text-xs text-red-700 dark:text-red-300 font-semibold">Currently taken down</span>}
   </div>}
   {showSave&&<div className="mt-3 border border-blue-100 dark:border-[#24457f] rounded-2xl p-3 max-w-sm"><b className="text-sm">Save to playlist</b>{playlists.length===0?<p className="text-sm text-slate-500 mt-1">No playlists yet — create one in Library.</p>:playlists.map(p=><button key={p.id} onClick={async()=>{const j=await post("/api/social",{action:"togglePlaylistVideo",playlistId:p.id,videoId:id}); notify(j.added?`Saved to ${p.title}`:`Removed from ${p.title}`);}} className="w-full text-left text-sm px-2 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/5 flex justify-between">{p.title}<span className="text-slate-400">{p.items?.some((i:any)=>i.videoId===id)?"✓ saved":"+"}</span></button>)}</div>}
   <div className="mt-3 bg-slate-100/80 dark:bg-white/5 rounded-2xl p-3.5 text-sm cursor-pointer" onClick={()=>setShowDesc(!showDesc)}>
     <b>{fmt(v.views)} views • {new Date(v.publishedAt||v.createdAt).toLocaleDateString()} • {v.category}{v.license?` • ${licenceShort(v.license)}`:""}{v.creatorCountry?` • ${COUNTRIES.find(c=>c.code===v.creatorCountry)?.name||v.creatorCountry}`:""} • {v.visibility}</b>
     <p className={`whitespace-pre-wrap mt-1 ${showDesc?"":"line-clamp-2"}`}>{v.description||"No description provided."}</p><span className="text-[#1e7bff] font-semibold text-xs">{showDesc?"Show less":"…more"}</span>
   </div>

   {/* COMMENTS */}
   <section className="mt-6"><h2 className="font-black">{total} Comments</h2>
    <div className="flex gap-2.5 mt-3"><span className="w-9 h-9 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0">{user?avatar(user.displayName,user.avatarUrl):<User size={16} className="text-white"/>}</span>
    <div className="flex-1">{replyTo&&<p className="text-xs text-[#1e7bff] mb-1">Replying to @{replyTo.user.username} <button onClick={()=>setReplyTo(null)} className="underline">cancel</button></p>}<input value={text} onChange={e=>setText(e.target.value)} onFocus={()=>!user&&requireAuth()} placeholder={user?"Add a comment…":"Sign in to comment"} className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 py-2 text-sm"/>
    {text&&<div className="flex justify-end gap-2 mt-2"><button onClick={()=>{setText("");setReplyTo(null);}} className="text-sm px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">Cancel</button><button onClick={sendComment} className="text-sm bg-[#0b4fd8] text-white font-semibold px-4 py-1.5 rounded-full">Comment</button></div>}</div></div>
    <div className="space-y-4 mt-5">{comments.length===0&&<p className="text-sm text-slate-500">No comments yet — be the first to start the conversation. Real comments only.</p>}
    {comments.map(c=><CommentItem key={c.id} c={c} user={user} videoOwnerId={v.userId} go={go} notify={notify} requireAuth={requireAuth} onReply={(cc:any)=>{setReplyTo(cc);}} refresh={load}/>)}</div>
   </section>
  </div>
  <aside className="w-full lg:w-[380px] shrink-0 px-3 lg:px-0 mt-6 lg:mt-0"><h3 className="font-black mb-3">Up next</h3><div className="space-y-3">{related.map((r:any)=><button key={r.id} onClick={()=>go({name:"watch",id:r.id})} className="flex gap-2.5 w-full text-left group"><span className="w-40 aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-200 relative"><Thumb v={r}/>{r.durationSec>0&&<span className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">{dur(r.durationSec)}</span>}</span><span className="min-w-0"><b className="text-sm leading-snug line-clamp-2 group-hover:text-[#1e7bff]">{r.title}</b><span className="block text-xs text-slate-500 mt-0.5">{creatorName(r)}</span><span className="block text-xs text-slate-500">{fmt(r.views)} views • {ago(r.createdAt)}</span></span></button>)}{related.length===0&&<p className="text-sm text-slate-500">No related videos yet.</p>}</div></aside>
 </div>;
}
function ReportBtn({targetType,targetId,user,requireAuth,notify}:any){ const [open,setOpen]=useState(false); const [reason,setReason]=useState(""); if(!open) return <button onClick={()=>{if(!user)return requireAuth(); setOpen(true);}} className="flex gap-1.5 items-center bg-slate-100 dark:bg-white/10 px-3 py-2 rounded-full text-sm font-semibold"><Flag size={15}/> Report</button>;
 return <span className="flex gap-1 items-center"><input autoFocus value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason…" className="border rounded-full px-3 py-1.5 text-sm bg-transparent w-36"/><button onClick={async()=>{try{const j=await post("/api/social",{action:"report",targetType,targetId,reason}); notify(j.message); setOpen(false);}catch(e:any){notify(e.message)}}} className="bg-red-500 text-white text-sm font-semibold px-3 py-1.5 rounded-full">Send</button><button onClick={()=>setOpen(false)}><X size={16}/></button></span>; }

function CommentItem({c,user,videoOwnerId,go,notify,requireAuth,onReply,refresh,depth=0}:any){
 const [editing,setEditing]=useState(false); const [txt,setTxt]=useState(c.content);
 async function act(body:any){ try{const j=await post("/api/comments",{id:c.id,...body}); if(body.action==="like"){c.likes=j.likes;c.myLike=j.myLike;} refresh(); }catch(e:any){notify(e.message)} }
 return <div className={`${depth?"ml-10":""}`}><div className="flex gap-2.5"><button onClick={()=>go({name:"channel",username:c.user.username})} className="w-9 h-9 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0">{avatar(c.user.displayName,c.user.avatarUrl)}</button>
 <div className="flex-1 min-w-0"><p className="text-xs"><b>@{c.user.username}</b> <span className="text-slate-500">{ago(c.createdAt)}</span></p>
 {editing? <div><input value={txt} onChange={e=>setTxt(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm bg-transparent mt-1"/><div className="flex gap-2 mt-1"><button onClick={async()=>{await act({action:"edit",content:txt}); setEditing(false);}} className="text-xs bg-[#0b4fd8] text-white px-3 py-1 rounded-full font-semibold">Save</button><button onClick={()=>setEditing(false)} className="text-xs px-3 py-1">Cancel</button></div></div>
 : <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.content}</p>}
 <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
   <button onClick={()=>user?act({action:"like"}):requireAuth()} className={`flex gap-1 items-center ${c.myLike?"text-[#1e7bff] font-bold":""}`}><ThumbsUp size={13}/>{c.likes||0}</button>
   <button onClick={()=>user?onReply(c):requireAuth()} className="font-semibold hover:text-[#1e7bff]">Reply</button>
   {user&&(c.userId===user.id)&&<><button onClick={()=>setEditing(true)}>Edit</button></>}
   {user&&(c.userId===user.id||videoOwnerId===user.id||user.role==="admin"||user.role==="owner")&&<button onClick={async()=>{if(confirm("Delete this comment?")){await act({action:"delete"});}}} className="text-red-500">Delete</button>}
   <ReportBtn targetType="comment" targetId={c.id} user={user} requireAuth={requireAuth} notify={notify}/>
 </div></div></div>
 {(c.replies||[]).map((r:any)=><div key={r.id} className="mt-3"><CommentItem c={r} user={user} videoOwnerId={videoOwnerId} go={go} notify={notify} requireAuth={requireAuth} onReply={onReply} refresh={refresh} depth={1}/></div>)}
 </div>;
}

/* ---------------- SHORTS ---------------- */
function Shorts({user,go,notify,requireAuth,anonId}:any){
 const [shorts,setShorts]=useState<any[]>([]); const [active,setActive]=useState(0); const refs=useRef<(HTMLVideoElement|null)[]>([]); const ytRefs=useRef<any>({});
 useEffect(()=>{ api("/api/videos?type=shorts").then(j=>setShorts(j.videos)).catch(()=>{}); },[]);
 useEffect(()=>{ const obs=new IntersectionObserver(es=>{es.forEach(en=>{ const i=Number(en.target.getAttribute("data-i")); if(en.isIntersecting){ setActive(i); refs.current.forEach((v,idx)=>{ if(v){ if(idx===i){v.play().catch(()=>{});} else {v.pause();} }}); const s=shorts[i]; if(s) post(`/api/videos/${s.id}`,{action:"view",anonId}).catch(()=>{}); } });},{threshold:.65}); document.querySelectorAll(".short-slide").forEach(el=>obs.observe(el)); return ()=>obs.disconnect(); },[shorts]);
 async function react(s:any){ if(!user)return requireAuth(); const next=s.myReaction==="like"?null:"like"; const j=await post(`/api/videos/${s.id}`,{action:"reaction",type:next}); setShorts(shorts.map(x=>x.id===s.id?{...x,...j}:x)); }
 if(shorts.length===0) return <div className="p-4"><Empty title="No Shorts yet" text="Vertical videos under 60 seconds will appear here. Upload one and tick “Publish as Short” — real uploads only, no fake feed." action="Upload a Short" onAction={()=>user?notify("Use the Upload button (top) and tick Publish as Short"):requireAuth()}/></div>;
 return <div className="flex justify-center"><div className="h-[calc(100vh-56px-64px)] md:h-[calc(100vh-56px)] w-full max-w-[420px] overflow-y-auto snap-shorts no-scrollbar bg-black md:rounded-none">
  {shorts.map((s,i)=><div key={s.id} data-i={i} className="short-slide relative h-full w-full shrink-0">
    <video ref={el=>{refs.current[i]=el;}} src={mediaSrc(s)} loop playsInline muted={i!==active} poster={s.thumbnailUrl||undefined} onClick={e=>{const v=e.currentTarget; v.muted=false; v.paused?v.play():v.pause();}} className="w-full h-full object-cover"/>
    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white"><b className="line-clamp-2 text-[15px]">{s.title}</b><button onClick={()=>s.creator&&go({name:"channel",username:s.creator.username})} className="text-sm text-blue-200 mt-1 block">{s.creator?`@${s.creator.username}`:creatorName(s)}{s.license?` • ${licenceShort(s.license)}`:""}</button>
    {s.creator&&user?.id!==s.userId&&<button onClick={async()=>{if(!user)return requireAuth(); const j=await post("/api/social",{action:"subscribe",creatorId:s.userId}); setShorts(shorts.map(x=>x.id===s.id?{...x,isSubscribed:j.isSubscribed,creatorSubscribers:j.count}:x));}} className={`mt-2 px-3.5 py-1.5 rounded-full text-sm font-bold ${s.isSubscribed?"bg-white/20":"bg-[#0b4fd8]"}`}>{s.isSubscribed?"Subscribed":"Subscribe"}</button>}</div>
    <div className="absolute right-2 bottom-24 flex flex-col gap-4 text-white items-center">
      <button onClick={()=>react(s)} className="flex flex-col items-center"><span className="w-11 h-11 rounded-full bg-white/15 backdrop-blur grid place-items-center"><ThumbsUp size={19} className={s.myReaction==="like"?"fill-white":""}/></span><span className="text-xs font-semibold mt-0.5">{fmt(s.likes)}</span></button>
      <button onClick={()=>go({name:"watch",id:s.id})} className="flex flex-col items-center"><span className="w-11 h-11 rounded-full bg-white/15 backdrop-blur grid place-items-center"><MessageCircle size={19}/></span><span className="text-xs font-semibold mt-0.5">{s.commentCount||0}</span></button>
      <button onClick={async()=>{const url=siteUrl(`/watch/${s.id}`); if(navigator.share){try{await navigator.share({title:s.title,url}); return}catch{}} await navigator.clipboard.writeText(url); notify("Short link copied");}} className="flex flex-col items-center"><span className="w-11 h-11 rounded-full bg-white/15 backdrop-blur grid place-items-center"><Share2 size={19}/></span><span className="text-xs font-semibold mt-0.5">Share</span></button>
      {isStaffUser(user)&&<button onClick={async()=>{if(!confirm(`Admin: permanently delete this Short “${s.title}”?`))return; const reason=""; try{await post("/api/admin",{action:"deleteVideo",videoId:s.id,reason}); setShorts(shorts.filter(x=>x.id!==s.id)); notify("Short deleted by admin.");}catch(err:any){notify(err.message)}}} className="flex flex-col items-center"><span className="w-11 h-11 rounded-full bg-red-600/90 backdrop-blur grid place-items-center"><Trash2 size={19}/></span><span className="text-xs font-semibold mt-0.5">Admin</span></button>}
    </div></div>)}
 </div></div>;
}

/* ---------------- CHANNEL ---------------- */
function Channel({username,user,go,notify,requireAuth}:any){
 const [ch,setCh]=useState<any>(null); const [tab,setTab]=useState("videos"); const [e,setE]=useState("");
 useEffect(()=>{ api(`/api/social?what=channel&username=${encodeURIComponent(username)}`).then(setCh).catch(err=>setE(err.message)); },[username]);
 if(e) return <div className="p-4"><Empty title="Channel not found" text={e} action="Back home" onAction={()=>go({name:"home"})}/></div>;
 if(!ch) return <div className="p-8 text-center text-slate-500">Loading channel…</div>;
 const c=ch.channel; const isMe=user?.id===c.id;
 return <div className="px-3 sm:px-4 py-4 fadeUp"><div className="h-24 sm:h-32 rounded-3xl bg-gradient-to-r from-[#062a6b] via-[#0b4fd8] to-[#38a3ff] relative overflow-hidden"><div className="absolute -right-6 -bottom-10 w-44 h-44 rounded-full bg-white/10"/></div>
 <div className="flex flex-wrap gap-3 items-end -mt-8 px-2 relative"><span className="w-20 h-20 rounded-full bg-[#0b4fd8] border-4 border-white dark:border-[#050b1d] grid place-items-center overflow-hidden text-2xl">{avatar(c.displayName,c.avatarUrl)}</span>
 <div className="flex-1 min-w-[200px] pt-8 sm:pt-9"><h1 className="font-black text-xl flex gap-1.5 items-center"><Crown role={c.role} size={19}/>{c.displayName} {ch.subscriberCount>=100&&<BadgeCheck size={18} className="text-[#1e7bff]"/>}</h1><p className="text-sm text-slate-500">@{c.username} • <b className="text-inherit">{fmt(ch.subscriberCount)} subscribers</b> • {ch.videos.length} uploads • joined {new Date(c.createdAt).toLocaleDateString()}</p><p className="text-sm mt-1 max-w-xl whitespace-pre-wrap">{c.bio||"No bio yet."}</p></div>
 {isMe? <button onClick={()=>go({name:"settings"})} className="bg-slate-200 dark:bg-white/10 font-semibold text-sm px-4 py-2 rounded-full">Edit channel</button> : <div className="flex gap-2"><button onClick={async()=>{if(!user)return requireAuth(); const j=await post("/api/social",{action:"subscribe",creatorId:c.id}); setCh({...ch,isSubscribed:j.isSubscribed,subscriberCount:j.count}); notify(j.isSubscribed?`Subscribed to ${c.displayName}`:"Unsubscribed");}} className={`px-5 py-2.5 rounded-full text-sm font-bold ${ch.isSubscribed?"bg-slate-200 dark:bg-white/10":"bg-[#0b4fd8] text-white"}`}>{ch.isSubscribed?"Subscribed":"Subscribe"}</button><ReportBtn targetType="account" targetId={c.id} user={user} requireAuth={requireAuth} notify={notify}/>{user&&<button onClick={async()=>{const j=await post("/api/social",{action:"block",userId:c.id}); notify(j.blocked?`Blocked @${c.username} — you will not be recommended their content`:`Unblocked @${c.username}`);}} className="bg-slate-100 dark:bg-white/10 px-3.5 py-2 rounded-full text-sm font-semibold">Block</button>}</div>}
 </div>
 {isStaffUser(user)&&!isMe&&c.role!=="owner"&&<div className="mt-3 border border-red-200 dark:border-red-500/40 bg-red-50/70 dark:bg-red-500/10 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-sm"><span className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300 mr-1"><Shield size={15}/> Admin controls for @{c.username}</span>
  <button onClick={async()=>{const suspend=c.status!=="suspended"; if(!confirm(suspend?`Suspend @${c.username}? They are signed out immediately.`:`Restore @${c.username}?`))return; try{await post("/api/admin",{action:"setStatus",userId:c.id,status:suspend?"suspended":"active"}); setCh({...ch,channel:{...c,status:suspend?"suspended":"active"}}); notify(suspend?"Account suspended":"Account restored");}catch(err:any){notify(err.message)}}} className="bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-full text-xs">{c.status==="suspended"?"Unsuspend account":"Suspend account"}</button>
  <button onClick={async()=>{if(!confirm(`Delete ALL videos, comments, posts and streams by @${c.username}? The account remains.`))return; const reason=""; try{const j=await post("/api/admin",{action:"purgeUserContent",userId:c.id,reason}); setCh({...ch,videos:[],posts:[]}); notify(`Removed ${j.removedVideos} video(s) and all their comments/posts.`);}catch(err:any){notify(err.message)}}} className="bg-red-600 text-white font-semibold px-3 py-1.5 rounded-full text-xs flex items-center gap-1"><Trash2 size={13}/> Wipe all content</button>
  <button onClick={async()=>{if(!confirm(`Permanently delete the account @${c.username} (${c.email||"email hidden"}) and everything it owns?`))return; try{await post("/api/admin",{action:"deleteUser",userId:c.id}); notify("Account deleted."); go({name:"home"});}catch(err:any){notify(err.message)}}} className="border border-red-300 text-red-700 dark:text-red-300 font-semibold px-3 py-1.5 rounded-full text-xs">Delete account</button>
  {c.status==="suspended"&&<span className="text-xs font-semibold text-red-700 dark:text-red-300">Currently suspended</span>}
 </div>}
 <div className="flex gap-1 mt-5 border-b border-blue-100 dark:border-white/10 overflow-x-auto no-scrollbar">{["videos","shorts","posts","playlists","about"].map(t=><button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 -mb-px ${tab===t?"border-[#1e7bff] text-[#1e7bff]":"border-transparent text-slate-500"}`}>{t}</button>)}</div>
 {tab==="videos"&&<GridOrEmpty list={ch.videos.filter((v:any)=>!v.isShort)} go={go} empty="No public videos yet." staff={isStaffUser(user)} onAdminDelete={(vid:string)=>{setCh({...ch,videos:ch.videos.filter((x:any)=>x.id!==vid)}); notify("Video deleted by admin.");}}/>}
 {tab==="shorts"&&<GridOrEmpty list={ch.videos.filter((v:any)=>v.isShort)} go={go} empty="No Shorts yet." staff={isStaffUser(user)} onAdminDelete={(vid:string)=>{setCh({...ch,videos:ch.videos.filter((x:any)=>x.id!==vid)}); notify("Short deleted by admin.");}}/>}
 {tab==="playlists"&&<div className="py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{ch.playlists.map((p:any)=><button key={p.id} onClick={()=>go({name:"playlist",id:p.id})} className="text-left border border-blue-100 dark:border-[#24457f] rounded-2xl p-4 bg-white dark:bg-[#0a1730]"><ListVideo className="text-[#1e7bff]"/><b className="block mt-1">{p.title}</b><span className="text-xs text-slate-500">{p.visibility} playlist</span></button>)}{ch.playlists.length===0&&<p className="text-sm text-slate-500">No public playlists.</p>}</div>}
 {tab==="posts"&&<div className="py-4 max-w-2xl space-y-3">{ch.posts.map((p:any)=><PostCard key={p.id} p={{...p,user:c,likes:0,commentCount:0}} user={user} go={go} notify={notify} requireAuth={requireAuth} refresh={()=>{}}/> )}{ch.posts.length===0&&<p className="text-sm text-slate-500">No community posts yet.</p>}</div>}
 {tab==="about"&&<div className="py-4 text-sm space-y-1.5 max-w-xl"><p><b>Username:</b> @{c.username}</p><p><b>Joined:</b> {new Date(c.createdAt).toLocaleString()}</p><p><b>Subscribers:</b> {ch.subscriberCount} (counted from real subscription records)</p><p><b>Following:</b> {ch.subscriptionCount} channels</p><p className="whitespace-pre-wrap"><b>Bio:</b> {c.bio||"—"}</p></div>}
 </div>;
}
function GridOrEmpty({list,go,empty,staff,onAdminDelete}:any){ if(!list.length) return <p className="text-sm text-slate-500 py-6">{empty}</p>; return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 py-4">{list.map((v:any)=><VideoCard key={v.id} v={v} go={go} staff={staff} onAdminDelete={onAdminDelete}/>)}</div>; }

/* ---------------- LIBRARY / HISTORY / PLAYLIST ---------------- */
function LibraryPage({user,go,notify}:any){
 const [pls,setPls]=useState<any[]>([]); const [liked,setLiked]=useState<any[]>([]); const [title,setTitle]=useState(""); const [vis,setVis]=useState("public");
 const load=async()=>{ const p=await api("/api/social?what=playlists"); setPls(p.playlists); const l=await api("/api/social?what=liked"); setLiked(l.videos); };
 useEffect(()=>{load()},[]);
 return <div className="px-3 sm:px-4 py-4 fadeUp"><h1 className="font-black text-xl">Library</h1><p className="text-sm text-slate-500">Your playlists and liked videos — saved in the database, not just this device.</p>
 <div className="flex gap-2 mt-4 max-w-lg"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New playlist title…" className="flex-1 border rounded-full px-4 py-2 text-sm bg-transparent"/><select value={vis} onChange={e=>setVis(e.target.value)} className="border rounded-full px-2 text-sm bg-transparent"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select><button onClick={async()=>{if(!title.trim())return notify("Give your playlist a title"); await post("/api/social",{action:"createPlaylist",title,visibility:vis}); setTitle(""); load(); notify("Playlist created");}} className="bg-[#0b4fd8] text-white font-semibold text-sm px-4 rounded-full">Create</button></div>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">{pls.map(p=><div key={p.id} className="border border-blue-100 dark:border-[#24457f] rounded-2xl p-4 bg-white dark:bg-[#0a1730]"><button onClick={()=>go({name:"playlist",id:p.id})} className="text-left w-full"><ListVideo className="text-[#1e7bff]"/><b className="block mt-1">{p.title}</b><span className="text-xs text-slate-500">{p.items.length} videos • {p.visibility}</span></button><div className="flex gap-2 mt-2"><button onClick={async()=>{const t=prompt("Rename playlist",p.title); if(t){await post("/api/social",{action:"renamePlaylist",playlistId:p.id,title:t,visibility:p.visibility}); load();}}} className="text-xs font-semibold text-[#1e7bff]">Rename</button><button onClick={async()=>{if(confirm("Delete playlist? Videos themselves are not deleted.")){await post("/api/social",{action:"deletePlaylist",playlistId:p.id}); load();}}} className="text-xs font-semibold text-red-500">Delete</button></div></div>)}{pls.length===0&&<p className="text-sm text-slate-500">No playlists yet — create your first above.</p>}</div>
 <h2 className="font-black text-lg mt-8 mb-3">Liked videos</h2>{liked.length===0?<p className="text-sm text-slate-500">Videos you like will appear here.</p>:<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{liked.map((v:any)=><VideoCard key={v.id} v={v} go={go}/>)}</div>}
 </div>;
}
function HistoryPage({user,go,notify}:any){ const [vids,setVids]=useState<any[]>([]); useEffect(()=>{api("/api/social?what=history").then(j=>setVids(j.videos))},[]); return <div className="px-3 sm:px-4 py-4"><div className="flex justify-between items-center"><div><h1 className="font-black text-xl">Watch history</h1><p className="text-sm text-slate-500">Only recorded when you actually press play. You can clear it anytime.</p></div>{vids.length>0&&<button onClick={async()=>{await post("/api/social",{action:"clearHistory"}); setVids([]); notify("History cleared");}} className="text-sm font-semibold text-red-500">Clear all</button>}</div>{vids.length===0?<Empty title="No watch history" text="Videos you play will show up here."/>:<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4">{vids.map((v:any)=><VideoCard key={v.id} v={v} go={go}/>)}</div>}</div>; }
function PlaylistPage({id,user,go}:any){ const [data,setData]=useState<any>(null); useEffect(()=>{api(`/api/social?what=playlist&id=${id}`).then(setData).catch(e=>setData({error:e.message}))},[id]); if(!data) return <p className="p-6 text-slate-500">Loading playlist…</p>; if(data.error) return <div className="p-4"><Empty title="Playlist unavailable" text={data.error} action="Back home" onAction={()=>go({name:"home"})}/></div>; return <div className="px-3 sm:px-4 py-4"><h1 className="font-black text-xl">{data.playlist.title}</h1><p className="text-sm text-slate-500">{data.videos.length} videos • {data.playlist.visibility} • tap a video to watch in order</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4">{data.videos.map((v:any)=><VideoCard key={v.id} v={v} go={go}/>)}</div>{data.videos.length===0&&<p className="text-sm text-slate-500">This playlist is empty. Use “Save” on any watch page to add videos.</p>}</div>; }

/* ---------------- STUDIO ---------------- */
function Studio({user,go,notify,requireAuth,onUpload}:any){
 const [d,setD]=useState<any>(null); const [editing,setEditing]=useState<any>(null);
 const load=()=>api("/api/social?what=dashboard").then(setD).catch(()=>{});
 useEffect(()=>{ if(user) load(); },[user]);
 if(!user) return <div className="p-4"><Empty title="Sign in for Creator Studio" text="Your real stats, uploads and comments live here." action="Sign in" onAction={requireAuth}/></div>;
 if(!d) return <p className="p-6 text-slate-500">Loading your studio…</p>;
 const s=d.stats;
 return <div className="px-3 sm:px-4 py-4 fadeUp"><div className="flex flex-wrap justify-between gap-2 items-center"><div><h1 className="font-black text-xl">Creator Studio</h1><p className="text-sm text-slate-500">Real metrics from your ARINX database records — nothing invented.</p></div><button onClick={onUpload} className="bg-[#0b4fd8] text-white font-semibold text-sm px-4 py-2.5 rounded-full flex gap-1.5 items-center"><Upload size={16}/> Upload new</button></div>
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">{[["Videos",s.videos,Film],["Shorts",s.shorts,Zap],["Subscribers",s.subscribers,Users],["Total views",s.views,Eye],["Likes",s.likes,ThumbsUp]].map(([l,n,Icon]:any)=><div key={l} className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-4"><Icon size={18} className="text-[#1e7bff]"/><b className="block text-2xl mt-1">{fmt(n)}</b><span className="text-xs text-slate-500">{l} (actual)</span></div>)}</div>
 <h2 className="font-black mt-7 mb-2">Your uploads</h2>
 {d.videos.length===0?<Empty title="No uploads yet" text="Upload your first video and it will appear here with its real processing & visibility status." action="Upload video" onAction={onUpload}/>
 :<div className="space-y-2">{d.videos.map((v:any)=><div key={v.id} className="flex gap-3 items-center bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-2.5"><button onClick={()=>go({name:"watch",id:v.id})} className="w-28 aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-200"><Thumb v={v}/></button><div className="flex-1 min-w-0"><b className="line-clamp-1 text-sm">{v.title}</b><p className="text-xs text-slate-500">{fmt(v.views)} views • {v.visibility} • {v.status} • {ago(v.createdAt)} {v.isShort?"• Short":""}</p></div><button onClick={()=>setEditing({...v})} className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-white/10" title="Edit"><Pencil size={16}/></button><button onClick={async()=>{if(confirm("Delete this video permanently? Its stored file will also be removed.")){await api(`/api/videos/${v.id}`,{method:"DELETE"}); load(); notify("Video & file deleted");}}} className="p-2 rounded-full text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={16}/></button></div>)}</div>}
 <h2 className="font-black mt-7 mb-2">Recent comments on your videos</h2>{d.recentComments.length===0?<p className="text-sm text-slate-500">No comments yet.</p>:<div className="space-y-2 max-w-2xl">{d.recentComments.map((c:any)=><div key={c.id} className="flex gap-2.5 bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-3"><span className="w-8 h-8 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0">{avatar(c.user.displayName,c.user.avatarUrl)}</span><div className="text-sm"><b>@{c.user.username}</b> <span className="text-slate-400 text-xs">{ago(c.createdAt)}</span><p>{c.content}</p><button onClick={()=>go({name:"watch",id:c.videoId})} className="text-xs text-[#1e7bff] font-semibold">View video →</button></div></div>)}</div>}
 {editing&&<Modal close={()=>setEditing(null)} dark={false} wide><h3 className="font-black text-lg">Edit video</h3><div className="space-y-2 mt-3"><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 text-sm"/><textarea value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})} rows={4} className="w-full border rounded-xl px-3 py-2.5 text-sm"/><div className="grid grid-cols-2 gap-2"><select value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm">{CATS.slice(1).map(c=><option key={c}>{c}</option>)}</select><select value={editing.visibility} onChange={e=>setEditing({...editing,visibility:e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></div><input placeholder="Thumbnail image URL (optional)" value={editing.thumbnailUrl||""} onChange={e=>setEditing({...editing,thumbnailUrl:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 text-sm"/><p className="text-xs text-slate-500">This video is streamed on ARINX; it is not offered as a file download.</p><button onClick={async()=>{await api(`/api/videos/${editing.id}`,{method:"PATCH",body:JSON.stringify(editing)}); setEditing(null); load(); notify("Video updated");}} className="w-full bg-[#0b4fd8] text-white font-bold py-2.5 rounded-xl">Save changes</button></div></Modal>}
 </div>;
}

/* ---------------- COMMUNITY ---------------- */
function Community({user,go,notify,requireAuth}:any){
 const [posts,setPosts]=useState<any[]>([]); const [content,setContent]=useState(""); const [pollQ,setPollQ]=useState(""); const [pollOpts,setPollOpts]=useState(["",""]); const [showPoll,setShowPoll]=useState(false); const [imageUrl,setImageUrl]=useState("");
 const load=()=>api("/api/social?what=posts").then(j=>setPosts(j.posts)).catch(()=>{});
 useEffect(()=>{load()},[]);
 return <div className="px-3 sm:px-4 py-4 max-w-2xl mx-auto fadeUp"><h1 className="font-black text-xl">Community</h1><p className="text-sm text-slate-500">Real posts from ARINX creators. No simulated activity.</p>
 {user?<div className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-4 mt-4"><div className="flex gap-2.5"><span className="w-10 h-10 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0">{avatar(user.displayName,user.avatarUrl)}</span><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder={`Share an update, ${user.displayName.split(" ")[0]}…`} rows={3} className="flex-1 border rounded-2xl px-3 py-2.5 text-sm bg-transparent"/></div>
 {imageUrl&&<img src={imageUrl} className="rounded-2xl mt-2 max-h-56 w-full object-cover" alt="post"/>}
 {showPoll&&<div className="mt-2 space-y-2"><input value={pollQ} onChange={e=>setPollQ(e.target.value)} placeholder="Poll question…" className="w-full border rounded-xl px-3 py-2 text-sm bg-transparent"/>{pollOpts.map((o,i)=><input key={i} value={o} onChange={e=>{const n=[...pollOpts]; n[i]=e.target.value; setPollOpts(n);}} placeholder={`Option ${i+1}`} className="w-full border rounded-xl px-3 py-2 text-sm bg-transparent"/>)}{pollOpts.length<4&&<button onClick={()=>setPollOpts([...pollOpts,""])} className="text-xs text-[#1e7bff] font-semibold">+ Add option</button>}</div>}
 <div className="flex gap-2 mt-3 flex-wrap"><label className="text-sm font-semibold bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-full cursor-pointer">🖼 Image<input type="file" accept="image/*" className="hidden" onChange={async e=>{const f=e.target.files?.[0]; if(!f)return; const fd=new FormData(); fd.append("file",f); const r=await fetch("/api/image",{method:"POST",body:fd}); const j=await r.json(); if(j.url)setImageUrl(j.url); else notify(j.error||"Image upload failed");}}/></label>
 <button onClick={()=>setShowPoll(!showPoll)} className="text-sm font-semibold bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-full">📊 Poll</button>
 <button onClick={async()=>{try{await post("/api/social",{action:"createPost",content,imageUrl,pollQuestion:showPoll?pollQ:"",pollOptions:pollOpts}); setContent(""); setImageUrl(""); setPollQ(""); setPollOpts(["",""]); setShowPoll(false); load(); notify("Post published to your channel & community");}catch(e:any){notify(e.message)}}} className="ml-auto bg-[#0b4fd8] text-white text-sm font-bold px-5 py-1.5 rounded-full">Post</button></div></div>
 :<div className="mt-4"><Empty title="Join the conversation" text="Sign in to publish posts, polls and reply to creators." action="Sign in" onAction={requireAuth}/></div>}
 <div className="space-y-3 mt-4">{posts.map(p=><PostCard key={p.id} p={p} user={user} go={go} notify={notify} requireAuth={requireAuth} refresh={load}/>)}{posts.length===0&&<p className="text-sm text-slate-500 text-center py-6">No posts yet — creators' community posts will appear here.</p>}</div></div>;
}
function PostCard({p,user,go,notify,requireAuth,refresh}:any){
 const [showC,setShowC]=useState(false); const [comments,setComments]=useState<any[]>([]); const [txt,setTxt]=useState(""); const totalVotes=(p.voteCounts||[]).reduce((a:number,b:number)=>a+b,0);
 async function loadC(){ const j=await api(`/api/comments?postId=${p.id}`); setComments(j.comments); }
 return <article className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-4 fadeUp">
  <div className="flex gap-2.5"><button onClick={()=>go({name:"channel",username:p.user.username})} className="w-10 h-10 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0">{avatar(p.user.displayName,p.user.avatarUrl)}</button><div><b className="text-sm">{p.user.displayName}</b><p className="text-xs text-slate-500">@{p.user.username} • {ago(p.createdAt)}</p></div>
  {user&&(p.userId===user.id||user.id===p.user?.id)?<button onClick={async()=>{if(confirm("Delete this post?")){await post("/api/social",{action:"deletePost",postId:p.id}); refresh();}}} className="ml-auto text-red-500 p-1" title="Delete your post"><Trash2 size={16}/></button>
  :isStaffUser(user)&&<button onClick={async()=>{if(!confirm(`Admin: delete this post by @${p.user?.username}?`))return; const reason=""; try{await post("/api/admin",{action:"deletePost",postId:p.id,reason}); notify("Post deleted by admin."); refresh();}catch(err:any){notify(err.message)}}} className="ml-auto text-xs font-bold bg-red-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1" title="Admin delete"><Trash2 size={12}/> Admin delete</button>}</div>
  {p.content&&<p className="text-sm mt-2.5 whitespace-pre-wrap">{p.content}</p>}
  {p.imageUrl&&<img src={p.imageUrl} className="rounded-2xl mt-2 w-full max-h-80 object-cover" alt=""/>}
  {p.pollQuestion&&<div className="mt-3 border border-blue-100 dark:border-[#24457f] rounded-2xl p-3"><b className="text-sm">📊 {p.pollQuestion}</b><div className="space-y-1.5 mt-2">{(p.pollOptions||[]).map((o:string,i:number)=>{const pct=totalVotes?Math.round((p.voteCounts?.[i]||0)/totalVotes*100):0; return <button key={i} onClick={async()=>{if(!user)return requireAuth(); await post("/api/social",{action:"votePoll",postId:p.id,optionIndex:i}); refresh();}} className={`w-full text-left relative overflow-hidden border rounded-xl px-3 py-2 text-sm ${p.myVote===i?"border-[#1e7bff] font-bold":"border-slate-200 dark:border-white/15"}`}><span className="absolute inset-y-0 left-0 bg-blue-100 dark:bg-blue-500/20" style={{width:pct+"%"}}/><span className="relative flex justify-between"><span>{o}</span><span>{pct}% ({p.voteCounts?.[i]||0})</span></span></button>})}</div><p className="text-xs text-slate-500 mt-1">{totalVotes} real vote(s)</p></div>}
  <div className="flex gap-4 mt-3 text-sm text-slate-500">
   <button onClick={async()=>{if(!user)return requireAuth(); const j=await post("/api/social",{action:"likePost",postId:p.id}); p.likes=j.likes; p.myLike=j.myLike; refresh();}} className={`flex gap-1 items-center ${p.myLike?"text-red-500 font-bold":""}`}><Heart size={16} className={p.myLike?"fill-red-500":""}/>{p.likes}</button>
   <button onClick={()=>{setShowC(!showC); if(!showC)loadC();}} className="flex gap-1 items-center"><MessageCircle size={16}/>{p.commentCount||comments.length||0}</button>
   <button onClick={async()=>{const url=siteUrl(`/?post=${p.id}`); if(navigator.share){try{await navigator.share({title:"ARINX post",url}); return}catch{}} await navigator.clipboard.writeText(url); notify("Post link copied");}} className="flex gap-1 items-center"><Share2 size={16}/>Share</button>
   <ReportBtn targetType="post" targetId={p.id} user={user} requireAuth={requireAuth} notify={notify}/>
  </div>
  {showC&&<div className="mt-3 border-t border-blue-50 dark:border-white/10 pt-3 space-y-3">{comments.map((c:any)=><div key={c.id} className="flex gap-2"><span className="w-7 h-7 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0 text-xs">{avatar(c.user.displayName,c.user.avatarUrl)}</span><p className="text-sm"><b>@{c.user.username}</b> {c.content}</p></div>)}
   <div className="flex gap-2"><input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Reply…" className="flex-1 border rounded-full px-3 py-1.5 text-sm bg-transparent"/><button onClick={async()=>{if(!user)return requireAuth(); await post("/api/social",{action:"commentPost",postId:p.id,content:txt}); setTxt(""); loadC(); refresh();}} className="bg-[#0b4fd8] text-white p-2 rounded-full"><Send size={14}/></button></div></div>}
 </article>;
}

/* ---------------- LIVE ---------------- */
function LivePage({user,go,notify,requireAuth}:any){
 const [streams,setStreams]=useState<any[]>([]); const [title,setTitle]=useState(""); const [desc,setDesc]=useState(""); const [when,setWhen]=useState(""); const [sel,setSel]=useState<any>(null); const [msgs,setMsgs]=useState<any[]>([]); const [chat,setChat]=useState("");
 const load=()=>api("/api/social?what=live").then(j=>setStreams(j.streams));
 useEffect(()=>{load()},[]);
 useEffect(()=>{ if(!sel)return; const f=()=>api(`/api/social?what=liveMessages&streamId=${sel.id}`).then(j=>setMsgs(j.messages)); f(); const t=setInterval(f,3000); return ()=>clearInterval(t); },[sel]);
 return <div className="px-3 sm:px-4 py-4 fadeUp"><h1 className="font-black text-xl flex gap-2 items-center"><Radio className="text-red-500"/> Live on ARINX</h1>
 <div className="mt-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-sm rounded-2xl p-3.5"><b>Honest status:</b> Scheduling, discovery & live chat below are fully real. <b>Camera ingest</b> (RTMP/WebRTC → viewers) needs a media server — connect Mux, Livepeer or Cloudflare Stream keys in <code>.env</code> to enable broadcasting. We never show a fake LIVE badge: a stream is only “LIVE” after its creator presses Start.</div>
 <div className="lg:flex gap-5 mt-4"><div className="flex-1">
 {user&&<div className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-4 mb-4"><b>Schedule a stream</b><div className="grid sm:grid-cols-2 gap-2 mt-2"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Stream title *" className="border rounded-xl px-3 py-2.5 text-sm bg-transparent"/><input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm bg-transparent"/><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description" className="border rounded-xl px-3 py-2.5 text-sm bg-transparent sm:col-span-2"/></div><button onClick={async()=>{try{const j=await post("/api/social",{action:"createLive",title,description:desc,scheduledAt:when}); notify(j.note); setTitle(""); load();}catch(e:any){notify(e.message)}}} className="mt-2 bg-[#0b4fd8] text-white text-sm font-bold px-5 py-2 rounded-full">Schedule stream</button></div>}
 <div className="grid sm:grid-cols-2 gap-3">{streams.map(s=><div key={s.id} className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-4"><div className="flex justify-between"><span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${s.status==="live"?"bg-red-500 text-white":"bg-slate-200 dark:bg-white/10"}`}>{s.status==="live"?"● LIVE":s.status.toUpperCase()}</span><span className="text-xs text-slate-500">{s.scheduledAt?new Date(s.scheduledAt).toLocaleString():ago(s.createdAt)}</span></div><b className="block mt-2">{s.title}</b><p className="text-sm text-slate-500 line-clamp-2">{s.description||"No description"}</p><button onClick={()=>go({name:"channel",username:s.creator.username})} className="text-sm text-[#1e7bff] font-semibold mt-1">@{s.creator.username}</button>
 <div className="flex gap-2 mt-3"><button onClick={()=>setSel(s)} className="bg-[#0b4fd8] text-white text-sm font-semibold px-4 py-1.5 rounded-full">{s.status==="live"?"Join chat":"Open"}</button>
 {user?.id===s.userId&&<>{s.status!=="live"?<button onClick={async()=>{await post("/api/social",{action:"liveStatus",streamId:s.id,status:"live"}); load(); notify("Marked LIVE — connect your ingest server to broadcast video.");}} className="bg-red-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full">Start</button>:<button onClick={async()=>{await post("/api/social",{action:"liveStatus",streamId:s.id,status:"ended"}); load();}} className="bg-slate-800 text-white text-sm font-semibold px-4 py-1.5 rounded-full">End stream</button>}</>}
 {isStaffUser(user)&&user?.id!==s.userId&&<>{s.status==="live"&&<button onClick={async()=>{try{await post("/api/social",{action:"liveStatus",streamId:s.id,status:"ended"}); load(); notify("Stream ended by admin.");}catch(err:any){notify(err.message)}}} className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Admin: end</button>}<button onClick={async()=>{if(!confirm(`Admin: delete stream “${s.title}” by @${s.creator.username}?`))return; const reason=""; try{await post("/api/admin",{action:"deleteLive",streamId:s.id,reason}); load(); notify("Stream deleted by admin.");}catch(err:any){notify(err.message)}}} className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"><Trash2 size={12}/> Admin delete</button></>}</div></div>)}{streams.length===0&&<p className="text-sm text-slate-500">No streams scheduled yet.</p>}</div></div>
 {sel&&<aside className="w-full lg:w-[340px] mt-4 lg:mt-0 bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-4 h-fit"><b>Live chat — {sel.title}</b><div className="h-64 overflow-y-auto space-y-2 mt-2 text-sm">{msgs.map(m=><p key={m.id}><b>@{m.user.username}</b> {m.content}</p>)}{msgs.length===0&&<p className="text-slate-500">No messages yet. Say hello!</p>}</div><div className="flex gap-2 mt-2"><input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&document.getElementById("sendchat")?.click()} placeholder="Chat…" className="flex-1 border rounded-full px-3 py-2 text-sm bg-transparent"/><button id="sendchat" onClick={async()=>{if(!user)return requireAuth(); await post("/api/social",{action:"liveMessage",streamId:sel.id,content:chat}); setChat(""); api(`/api/social?what=liveMessages&streamId=${sel.id}`).then(j=>setMsgs(j.messages));}} className="bg-[#0b4fd8] text-white p-2.5 rounded-full"><Send size={15}/></button></div></aside>}
 </div></div>;
}

/* ---------------- SETTINGS / ADMIN ---------------- */
function SettingsPage({user,setUser,notify,go}:any){
 const [f,setF]=useState<any>(null); const [pw,setPw]=useState({currentPassword:"",newPassword:""}); const [delPw,setDelPw]=useState("");
 useEffect(()=>{ if(user) setF({...user}); },[user]);
 if(!user||!f) return <div className="p-4"><Empty title="Sign in required" text="Account settings are private to signed-in users."/></div>;
 async function save(){ try{const j=await post("/api/auth",{action:"updateProfile",...f}); setUser(j.user); notify("Profile saved");}catch(e:any){notify(e.message)} }
 return <div className="px-3 sm:px-4 py-4 max-w-2xl mx-auto fadeUp"><h1 className="font-black text-xl">Settings & channel</h1>
 <div className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-5 mt-4 space-y-3">
  <div className="flex items-center gap-3"><span className="w-16 h-16 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden text-xl">{avatar(f.displayName,f.avatarUrl)}</span><label className="bg-slate-100 dark:bg-white/10 text-sm font-semibold px-4 py-2 rounded-full cursor-pointer">Upload profile picture<input type="file" accept="image/*" className="hidden" onChange={async e=>{const file=e.target.files?.[0]; if(!file)return; const fd=new FormData(); fd.append("file",file); const r=await fetch("/api/image",{method:"POST",body:fd}); const j=await r.json(); if(j.url){setF({...f,avatarUrl:j.url}); notify("Picture selected — press Save profile");} else notify(j.error);}}/></label></div>
  <label className="block text-sm font-semibold">Display name<input value={f.displayName} onChange={e=>setF({...f,displayName:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 mt-1 bg-transparent font-normal"/></label>
  <label className="block text-sm font-semibold">Username (unique)<input value={f.username} onChange={e=>setF({...f,username:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 mt-1 bg-transparent font-normal"/></label>
  <label className="block text-sm font-semibold">Bio<textarea value={f.bio||""} onChange={e=>setF({...f,bio:e.target.value})} rows={3} className="w-full border rounded-xl px-3 py-2.5 mt-1 bg-transparent font-normal"/></label>
  <p className="text-sm text-slate-500">Email: {f.email} • Role: {f.role} • Joined {new Date(f.createdAt).toLocaleDateString()}</p>
  <div className="space-y-1.5"><b className="text-sm">Notifications</b><label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={!!f.notifyLikes} onChange={e=>setF({...f,notifyLikes:e.target.checked})} className="accent-[#0b4fd8]"/> Notify me about likes</label><label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={!!f.notifyComments} onChange={e=>setF({...f,notifyComments:e.target.checked})} className="accent-[#0b4fd8]"/> Notify me about comments & replies</label></div>
  <button onClick={save} className="bg-[#0b4fd8] text-white font-bold px-6 py-2.5 rounded-full text-sm">Save profile</button>
  <button onClick={()=>go({name:"channel",username:f.username})} className="ml-2 bg-slate-100 dark:bg-white/10 font-semibold px-5 py-2.5 rounded-full text-sm">View my channel</button>
 </div>
 <div className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-5 mt-4 space-y-2"><b>Change password</b><input type="password" placeholder="Current password" value={pw.currentPassword} onChange={e=>setPw({...pw,currentPassword:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent"/><input type="password" placeholder="New password (8+)" value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent"/><button onClick={async()=>{try{const j=await post("/api/auth",{action:"changePassword",...pw}); notify(j.message);}catch(e:any){notify(e.message)}}} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-semibold px-5 py-2 rounded-full text-sm">Update password</button>
 <p className="text-xs text-slate-500">Email verification & “forgot password” emails need an email provider — add Resend/SMTP credentials in .env to enable them (the button in the sign-in dialog explains this honestly rather than pretending an email was sent).</p></div>
 <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-3xl p-5 mt-4"><b className="text-red-600">Danger zone — delete account</b><p className="text-sm text-slate-600 dark:text-slate-300 mt-1">This permanently deletes your account, videos, comments, playlists and stored files' records. This cannot be undone.</p><div className="flex gap-2 mt-2"><input type="password" value={delPw} onChange={e=>setDelPw(e.target.value)} placeholder="Confirm with your password" className="flex-1 border rounded-xl px-3 py-2 text-sm bg-transparent"/><button onClick={async()=>{if(!confirm("Really delete your ARINX account forever?"))return; try{await post("/api/auth",{action:"deleteAccount",password:delPw}); setUser(null); go({name:"home"}); notify("Account deleted. We're sorry to see you go.");}catch(e:any){notify(e.message)}}} className="bg-red-500 text-white font-bold px-4 rounded-xl text-sm">Delete account</button></div></div>
 <div className="mt-4 text-sm bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-5"><b>Community guidelines (summary)</b><ul className="list-disc ml-5 mt-1 text-slate-600 dark:text-slate-300 space-y-1"><li>Upload only content you own or have permission to share.</li><li>No harassment, hate, spam, or illegal content. Reports go to real admins.</li><li>Respect visibility: private means private — enforced on the server.</li></ul></div>
 </div>;
}
function AdminPage({user,notify,go}:any){
 const isOwner=user?.role==="owner";
 const staff=isOwner||user?.role==="admin";
 const [tab,setTab]=useState("overview");
 const [reports,setReports]=useState<any[]>([]);
 const [overview,setOverview]=useState<any>(null); const [adminUsers,setAdminUsers]=useState<any[]>([]); const [adminVideos,setAdminVideos]=useState<any[]>([]); const [adminVideoTotal,setAdminVideoTotal]=useState(0); const [logs,setLogs]=useState<any[]>([]);
 const [vq,setVq]=useState(""); const [vsource,setVsource]=useState("all"); const [uq,setUq]=useState("");
 const loadReports=()=>api("/api/social?what=reports").then(j=>setReports(j.reports)).catch(()=>{});
 const loadVideosAdmin=async(q=vq,source=vsource)=>{try{const v=await api(`/api/admin?what=videos&q=${encodeURIComponent(q)}&source=${source}`); setAdminVideos(v.videos); setAdminVideoTotal(v.total??v.videos.length);}catch(e:any){notify(e.message);}};
 const loadAdmin=async()=>{try{const [o,v,l]=await Promise.all([api("/api/admin?what=overview"),api("/api/admin?what=videos"),api("/api/admin?what=logs")]); setOverview(o); setAdminVideos(v.videos); setLogs(l.logs);}catch(e:any){notify(e.message);} };
 const loadAdminUsers=async()=>{if(!isOwner)return;try{const u=await api("/api/admin?what=users"); setAdminUsers(u.users);}catch(e:any){notify(e.message);}};
 useEffect(()=>{if(staff){loadReports();loadAdmin();loadVideosAdmin();}},[user?.id,user?.role]);
 useEffect(()=>{if(isOwner)loadAdminUsers();},[user?.id,user?.role]);
 useEffect(()=>{if(!staff)return; const t=setTimeout(()=>loadVideosAdmin(vq,vsource),300); return ()=>clearTimeout(t);},[vq,vsource]);
 const adminAct=async(body:any,ok:string)=>{try{await post("/api/admin",body); notify(ok); loadAdmin();}catch(e:any){notify(e.message);}};
 const filteredUsers=adminUsers.filter((u:any)=>!uq||u.email.toLowerCase().includes(uq.toLowerCase())||u.username.toLowerCase().includes(uq.toLowerCase())||u.displayName.toLowerCase().includes(uq.toLowerCase()));

 if(!staff) return <div className="p-4"><Empty title="Admins only" text="The ARINX admin console is restricted to authorized staff accounts."/></div>;
 return <div className="px-3 sm:px-4 py-4 fadeUp max-w-5xl mx-auto">
  <h1 className="font-black text-xl flex gap-2 items-center">{isOwner?<Crown className="text-amber-400"/>:<Shield className="text-[#1e7bff]"/>}{isOwner?"Owner Panel":"Moderation Panel"}</h1>
  <p className="text-sm text-slate-500 mt-1">{isOwner?"Absolute powers: user lifecycle, roles, content takedown & reports moderation.":"Content moderation: takedown/restore/delete videos & reports."}</p>
  <div className="flex gap-1 mt-4 overflow-x-auto no-scrollbar">{[["overview","Overview"],["videos","Videos"],["reports","Reports"],["catalogue","Catalogue"],...(isOwner?[["users","Users"],["logs","Audit log"]]:[])].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${tab===id?"bg-[#0b4fd8] text-white":"bg-slate-100 dark:bg-white/10"}`}>{label}</button>)}</div>
  {tab==="overview"&&<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">{[["Users",overview?.stats.users],["Videos",overview?.stats.videos],["ARINX uploads",overview?.stats.uploads],["Commons media",overview?.stats.commons],["Comments",overview?.stats.comments],["Reports",overview?.stats.reports],["Suspended",overview?.stats.suspended],["Staff",overview?.stats.admins]].map(([l,n])=><div key={String(l)} className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-4"><span className="text-xs text-slate-500">{l}</span><b className="block text-2xl">{n??"—"}</b></div>)}</div>}
  {tab==="users"&&<div className="mt-4 space-y-2">
   <input value={uq} onChange={e=>setUq(e.target.value)} placeholder="Search users by email, username or name…" className="w-full max-w-md border rounded-full px-4 py-2 text-sm bg-transparent"/>
   {filteredUsers.map((u:any)=>{const protectedAcct=u.role==="owner"; return <div key={u.id} className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-3 flex flex-wrap gap-2 items-center"><span className="w-9 h-9 rounded-full bg-[#0b4fd8] grid place-items-center overflow-hidden shrink-0">{avatar(u.displayName,u.avatarUrl)}</span><div className="min-w-[180px] flex-1 text-sm"><b>{u.displayName}</b> <span className="text-slate-500">@{u.username}</span>{protectedAcct&&<span className="ml-2 text-[10px] font-bold bg-blue-100 text-[#0b4fd8] px-2 py-0.5 rounded-full">OWNER</span>}<p className="text-xs text-slate-500">{u.email} • {u.role} • {u.status}</p></div>
    {!protectedAcct&&u.id!==user.id&&<>{user.role==="owner"&&<button onClick={()=>adminAct({action:"setRole",userId:u.id,role:u.role==="admin"?"user":"admin"},"Role updated")} className="text-xs font-semibold bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-full">{u.role==="admin"?"Remove admin":"Make admin"}</button>}
    <button onClick={()=>adminAct({action:"setStatus",userId:u.id,status:u.status==="suspended"?"active":"suspended"},u.status==="suspended"?"User restored":"User suspended & signed out")} className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">{u.status==="suspended"?"Unsuspend":"Suspend"}</button>
    <button onClick={()=>{if(!confirm(`Delete ALL videos, comments, posts and streams by ${u.email}? The account stays, its content is wiped.`))return; const reason=""; adminAct({action:"purgeUserContent",userId:u.id,reason},"All content by this user removed");}} className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-full">Wipe content</button>
    <button onClick={()=>{if(!confirm(`Permanently delete the account ${u.email} and everything it owns?`))return; adminAct({action:"deleteUser",userId:u.id},"Account deleted");}} className="text-xs font-semibold text-red-600 px-3 py-1.5">Delete account</button></>}
   </div>;})}{filteredUsers.length===0&&<p className="text-sm text-slate-500">No matching accounts.</p>}</div>}
  {tab==="videos"&&<div className="mt-4 space-y-2">
   <div className="flex flex-wrap gap-2 items-center"><input value={vq} onChange={e=>setVq(e.target.value)} placeholder="Search by title, creator email/username, channel, category or ID…" className="flex-1 min-w-[240px] border rounded-full px-4 py-2 text-sm bg-transparent"/><select value={vsource} onChange={e=>setVsource(e.target.value)} className="border rounded-full px-3 py-2 text-sm bg-transparent"><option value="all">All sources</option><option value="upload">ARINX uploads only</option><option value="commons">Commons media only</option></select><span className="text-xs text-slate-500">{adminVideoTotal.toLocaleString()} match{adminVideoTotal===1?"":"es"}{adminVideoTotal>300?" (showing first 300 — refine search)":""}</span></div>
   {adminVideos.map((v:any)=><div key={v.id} className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-3 flex gap-3 items-center"><button onClick={()=>go({name:"watch",id:v.id})} className="w-28 aspect-video shrink-0 rounded-xl overflow-hidden bg-slate-200"><Thumb v={v}/></button><div className="flex-1 min-w-0 text-sm"><b className="line-clamp-1">{v.title}</b><p className="text-xs text-slate-500">{v.creator?`@${v.creator.username} • ${v.creator.email}`:`${v.attribution||"Wikimedia Commons"} • ${v.license||"free licence"}`} • {v.visibility} • {v.status} • {v.category}</p></div>
    {v.visibility!=="private"?<button onClick={()=>{const reason=""; adminAct({action:"takedownVideo",videoId:v.id,reason},"Taken down");}} className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">Takedown</button>:<button onClick={()=>adminAct({action:"restoreVideo",videoId:v.id},"Restored")} className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">Restore</button>}
    <button onClick={()=>{if(!confirm(`Delete “${v.title}” permanently?`))return; const reason=""; adminAct({action:"deleteVideo",videoId:v.id,reason},"Video deleted");}} className="text-xs font-semibold bg-red-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1"><Trash2 size={12}/> Delete</button></div>)}{adminVideos.length===0&&<p className="text-sm text-slate-500">No videos match.</p>}</div>}
  {tab==="logs"&&<div className="mt-4 space-y-2">{logs.map((l:any)=><div key={l.id} className="text-sm bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-3"><b>{l.action}</b> <span className="text-slate-500">{l.targetType} {l.targetId}</span><p className="text-xs text-slate-500">{l.actor?.email||"system"} • {l.detail} • {ago(l.createdAt)}</p></div>)}{logs.length===0&&<p className="text-sm text-slate-500">No admin actions logged yet.</p>}</div>}
   {tab==="reports"&&<section className="mt-4"><h2 className="font-black text-lg">Moderation queue</h2><p className="text-sm text-slate-500">Real user reports. Review or dismiss; ordinary accounts cannot access this queue.</p>
    <div className="space-y-2 mt-3 max-w-3xl">{reports.map(r=><div key={r.id} className="bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-2xl p-4 flex gap-3 flex-wrap items-center"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.status==="pending"?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>{r.status}</span><div className="flex-1 min-w-[200px] text-sm"><b className="capitalize">{r.targetType}</b> <span className="text-slate-400 text-xs">{r.targetId}</span><p>{r.reason}</p><p className="text-xs text-slate-500">{ago(r.createdAt)}</p></div>{r.status==="pending"&&<><button onClick={async()=>{await post("/api/social",{action:"resolveReport",reportId:r.id,status:"reviewed"});loadReports();notify("Marked reviewed");}} className="bg-[#0b4fd8] text-white text-sm font-semibold px-4 py-1.5 rounded-full">Mark reviewed</button><button onClick={async()=>{await post("/api/social",{action:"resolveReport",reportId:r.id,status:"dismissed"});loadReports();}} className="bg-slate-200 dark:bg-white/10 text-sm font-semibold px-4 py-1.5 rounded-full">Dismiss</button></>}</div>)}{reports.length===0&&<p className="text-sm text-slate-500 py-6 text-center">No reports in the moderation queue.</p>}</div>
   </section>}
   {tab==="catalogue"&&<section className="mt-4 bg-white dark:bg-[#0a1730] border border-blue-100 dark:border-[#24457f] rounded-3xl p-4 sm:p-5">
   <div className="flex flex-wrap gap-2 justify-between items-start"><div><h2 className="font-black text-lg flex items-center gap-2"><Globe size={19} className="text-[#1e7bff]"/> Media catalogue</h2><p className="text-sm text-slate-500 mt-1">All catalogue media is freely licensed from Wikimedia Commons — Public domain, CC0, CC BY and CC BY-SA. No third-party platform content is used.</p></div><span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{Number(overview?.stats.commons||0).toLocaleString()} Commons videos</span></div>
    <div className="mt-3 p-3 rounded-2xl border border-blue-100 dark:border-[#24457f] text-xs leading-relaxed text-slate-600 dark:text-slate-300"><b className="text-slate-800 dark:text-white">Where this media comes from:</b> every catalogue entry was harvested live from the Wikimedia Commons API, so titles, authors, licences, durations and file URLs are the genuine values Commons returned. Files stream directly from upload.wikimedia.org over HTTP 206 range requests, which is what makes seeking work. Author and licence are shown on every video, as CC BY and CC BY-SA require. Because ARINX plays these files in its own player, the view, like and comment counts are real ARINX records.</div>
    <p className="text-[11px] text-slate-400 mt-2">Catalogue media is limited to freely licensed Wikimedia Commons sources, with attribution on every video.</p>
   </section>}
  </div>;
}
