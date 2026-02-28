import { useState, useEffect, useRef } from "react";
import { useHistory }   from "./hooks/useHistory";
import { useFreemium }  from "./hooks/useFreemium";
import { useCounter }   from "./hooks/useCounter";
import { useAuth }      from "./hooks/useAuth";
import { supabase }     from "./lib/supabase";
import { LANGS, LangCtx, detectLang } from "./contexts/LangContext";
import { Ic, Tag } from "./components/icons";
import FaqItem from "./components/FaqItem";
import LangPicker from "./components/LangPicker";
import Modal from "./components/Modal";
import UpgradeModal from "./components/UpgradeModal";
import AuthModal from "./components/AuthModal";
import Toast from "./components/Toast";
import Panel, { TOOL_BASE } from "./components/Panel";
import { Privacy, Terms, Contact, API } from "./components/ModalContents";

/* ── CSS ──────────────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  html,body,#root{margin:0;padding:0;min-height:100vh;background:inherit}
  .m*{box-sizing:border-box;margin:0;padding:0}
  .m{
    --bg:#F9F9F8;--sf:#FFF;--bd:#E3E3E0;--bh:#C4C4C0;
    --t1:#111110;--t2:#6B6B68;--tm:#9B9B98;
    --ac:#1C3042;--al:#E8EDF2;--ah:#142435;--ok:#1B6640;
    font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1);
    font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh;
    transition:background .2s,color .2s;
  }
  .m.dark{
    --bg:#0F1117;--sf:#1A1D27;--bd:#2A2D3A;--bh:#3A3D4A;
    --t1:#F0F0EE;--t2:#9A9AA8;--tm:#6A6A78;
    --ac:#7BA7C4;--al:#1A2535;--ah:#8FB8D5;--ok:#4ADE80;
  }
  .m.dark .fr{background:#1E2130}
  .m.dark .bg:hover{background:#2A2D3A}
  .m.dark .lang-btn:hover{background:#2A2D3A}
  .m.dark .lang-opt:hover{background:#2A2D3A}
  .m.dark .tpdf{background:#3B1515;color:#F87171}
  .m.dark .tdocx{background:#1A2540;color:#93C5FD}
  .m.dark .timg{background:#142515;color:#4ADE80}
  @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes pr{from{width:0}to{width:100%}}
  @keyframes fo{from{opacity:0}to{opacity:1}}
  @keyframes mu{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ld{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}

  .fu{animation:fu .32s ease both}
  .fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
  .fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}

  .card{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:18px;cursor:pointer;
    transition:border-color .16s,box-shadow .16s,transform .16s}
  .card:hover{border-color:var(--bh);box-shadow:0 2px 10px rgba(0,0,0,.07);transform:translateY(-1px)}
  .card.on{border-color:var(--ac);box-shadow:0 0 0 3px var(--al)}

  .bp{background:var(--ac);color:#fff;border:none;border-radius:6px;padding:9px 18px;
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;
    display:inline-flex;align-items:center;gap:7px;transition:background .16s,transform .16s}
  .bp:hover{background:var(--ah)}.bp:disabled{opacity:.4;cursor:not-allowed}

  .bg{background:transparent;color:var(--t2);border:1px solid var(--bd);border-radius:6px;
    padding:8px 16px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all .16s}
  .bg:hover{border-color:var(--bh);color:var(--t1);background:#F5F5F3}

  .dz{border:1.5px dashed var(--bd);border-radius:10px;background:var(--sf);transition:all .16s;cursor:pointer}
  .dz:hover,.dz.ov{border-color:var(--ac);background:var(--al)}
  .global-drag::after{content:"";position:fixed;inset:0;border:3px solid var(--ac);border-radius:12px;pointer-events:none;z-index:9999;background:rgba(28,48,66,.06);}

  .tr{height:3px;background:var(--bd);border-radius:2px;overflow:hidden}
  .fill{height:100%;background:var(--ac);border-radius:2px;animation:pr 2.4s cubic-bezier(.4,0,.2,1) forwards}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .step-dot{width:8px;height:8px;border-radius:50%;background:var(--bd);transition:all .3s}
  .step-dot.active{background:var(--ac);animation:pulse 1.2s ease infinite}
  .step-dot.done{background:var(--ok)}
  .spn{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite}

  .fr{display:flex;align-items:center;gap:9px;padding:9px 12px;background:#F5F5F3;
    border-radius:6px;border:1px solid var(--bd);animation:fu .2s ease both}

  .toast{position:fixed;bottom:20px;right:20px;background:var(--t1);color:#fff;
    padding:10px 16px;border-radius:6px;font-size:12px;display:flex;align-items:center;gap:8px;
    box-shadow:0 8px 24px rgba(0,0,0,.18);animation:fu .25s ease both;z-index:9999;
    font-family:'DM Sans',sans-serif}

  .tag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;
    font-size:10px;font-weight:500;letter-spacing:.03em;font-family:'DM Mono',monospace}
  .tpdf{background:#FEF2F2;color:#B91C1C}
  .tdocx{background:#EFF6FF;color:#1D4ED8}
  .timg{background:#F0FDF4;color:#15803D}

  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  @media(max-width:560px){.grid{grid-template-columns:repeat(2,1fr)!important}}
  @media(max-width:360px){.grid{grid-template-columns:1fr!important}}

  /* ── Mobile improvements ── */
  @media(max-width:600px){
    /* Header */
    .m-header-inner{padding:0 14px!important}
    .m-logo-text{font-size:13px!important}
    .m-nav-labels{display:none}

    /* Hero */
    .m-hero{padding:32px 14px 48px!important}
    .m-hero-drop{padding:28px 14px!important;margin-bottom:32px!important}

    /* Panel */
    .m-panel{margin:0 -14px!important;border-radius:0!important;border-left:none!important;border-right:none!important}

    /* Features */
    .m-feat{grid-template-columns:1fr 1fr!important}

    /* Buttons */
    .bp,.bg{font-size:12px!important;padding:8px 14px!important}

    /* Modal */
    .sh{max-height:92vh!important}
    .sh-body{padding:16px!important}

    /* Toast */
    .toast{left:14px!important;right:14px!important;bottom:14px!important;font-size:11px!important}

    /* Steps UI */
    .m-steps{padding:12px!important}
  }

  @media(max-width:400px){
    .grid{grid-template-columns:1fr 1fr!important}
    .m-nav-privacy{display:none}
  }

  /* lang picker */
  .lang-wrap{position:relative}
  .lang-btn{display:flex;align-items:center;gap:6px;background:transparent;border:1px solid var(--bd);
    border-radius:6px;padding:5px 10px;font-family:'DM Sans',sans-serif;font-size:12px;
    color:var(--t2);cursor:pointer;transition:all .16s}
  .lang-btn:hover{border-color:var(--bh);color:var(--t1);background:#F5F5F3}
  .lang-drop{position:absolute;top:calc(100% + 6px);right:0;background:var(--sf);
    border:1px solid var(--bd);border-radius:8px;overflow:hidden;z-index:300;min-width:140px;
    box-shadow:0 4px 16px rgba(0,0,0,.1);animation:ld .16s ease both}
  .lang-opt{display:flex;align-items:center;gap:8px;padding:9px 13px;font-size:13px;
    color:var(--t2);cursor:pointer;transition:background .12s;border:none;
    background:transparent;width:100%;font-family:'DM Sans',sans-serif;text-align:left}
  .lang-opt:hover{background:#F5F5F3;color:var(--t1)}
  .lang-opt.sel{color:var(--ac);font-weight:500}

  /* modal */
  .ov{position:fixed;inset:0;background:rgba(17,17,16,.55);backdrop-filter:blur(4px);
    z-index:200;display:flex;align-items:flex-end;justify-content:center;animation:fo .2s ease both}
  .sh{background:var(--sf);width:100%;max-width:700px;max-height:88vh;
    border-radius:14px 14px 0 0;overflow:hidden;display:flex;flex-direction:column;
    animation:mu .28s cubic-bezier(.25,.46,.45,.94) both}
  @media(min-width:720px){.ov{align-items:center;padding:20px}.sh{border-radius:14px;max-height:84vh}}
  .sh-head{padding:18px 22px 14px;border-bottom:1px solid var(--bd);
    display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .sh-body{overflow-y:auto;padding:22px;flex:1}
  .sh-body::-webkit-scrollbar{width:5px}
  .sh-body::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}

  /* legal */
  .lg h2{font-size:13px;font-weight:600;color:var(--t1);margin:22px 0 7px;letter-spacing:-.01em}
  .lg h2:first-child{margin-top:0}
  .lg p{font-size:13px;color:var(--t2);line-height:1.75;margin-bottom:10px}
  .lg ul{padding-left:18px;margin-bottom:10px}
  .lg li{font-size:13px;color:var(--t2);line-height:1.75;margin-bottom:4px}
  .lg strong{color:var(--t1);font-weight:500}
  .divv{height:1px;background:var(--bd);margin:18px 0}
  .chip{display:inline-flex;align-items:center;gap:5px;background:var(--al);color:var(--ac);
    border-radius:5px;padding:3px 9px;font-size:11px;font-weight:500;margin:0 4px 4px 0}

  /* code */
  .cb{background:#111110;color:#E5E5E5;border-radius:8px;padding:15px;
    font-family:'DM Mono',monospace;font-size:11px;line-height:1.75;
    overflow-x:auto;margin:8px 0 14px;position:relative}
  .kw{color:#7DD3FC}.st{color:#86EFAC}.cm{color:#6B7280}.fn{color:#FCA5A5}
  .cpbtn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.1);
    border:none;border-radius:4px;padding:3px 9px;cursor:pointer;
    font-size:10px;color:#9CA3AF;font-family:'DM Sans',sans-serif;transition:all .16s}
  .cpbtn:hover{background:rgba(255,255,255,.2);color:#fff}

  /* form */
  .fi-label{font-size:11px;font-weight:500;color:var(--t2);display:block;margin-bottom:5px}
  .fi-inp{width:100%;padding:9px 12px;border:1px solid var(--bd);border-radius:6px;
    font-family:'DM Sans',sans-serif;font-size:13px;color:var(--t1);
    background:var(--sf);outline:none;transition:border-color .16s}
  .fi-inp:focus{border-color:var(--ac)}
  .fi-ta{resize:vertical;min-height:96px}

  .nl{color:var(--tm);text-decoration:none;font-size:12px;background:none;border:none;
    cursor:pointer;font-family:'DM Sans',sans-serif;transition:color .16s;padding:0}
  .nl:hover{color:var(--t1)}
  .fl{color:var(--tm);text-decoration:none;font-size:11px;background:none;border:none;
    cursor:pointer;font-family:'DM Sans',sans-serif;transition:color .16s;padding:0}
  .fl:hover{color:var(--t1)}
`;

/* ── AdSense Unit ────────────────────────────────────────────────────────── */
// TODO: reemplaza cada data-ad-slot con el ID real de tu panel AdSense
// (AdSense > Anuncios > Por bloque de anuncios > Crear bloque)
function AdUnit({ slot, style={} }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch { /* AdSense no disponible */ }
  }, []);
  return (
    <ins className="adsbygoogle"
      style={{display:"block",overflow:"hidden",...style}}
      data-ad-client="ca-pub-1101880383290833"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"/>
  );
}

/* ── Tool Page (hash routing + SEO) ─────────────────────────────────────── */
function ToolPage({ tool, showToast, bumpCount, addToHistory, checkLimits, onBack }) {
  useEffect(() => {
    document.title = `${tool.label} — morf`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', tool.desc || '');
    // JSON-LD per tool for Google rich results
    const existing = document.getElementById('ld-tool');
    const s = existing || document.createElement('script');
    s.id = 'ld-tool';
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": `morf — ${tool.label}`,
      "url": `https://morf-three.vercel.app/#${tool.id}`,
      "description": tool.desc,
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
      "isAccessibleForFree": !tool.pro,
      "browserRequirements": "Requires JavaScript"
    });
    if (!existing) document.head.appendChild(s);
    return () => { document.title = 'morf'; document.getElementById('ld-tool')?.remove(); };
  }, [tool.id, tool.label, tool.desc, tool.pro]);
  return (
    <div style={{minHeight:"100vh"}}>
      <div style={{maxWidth:960,margin:"0 auto",padding:"16px 20px"}}>
        <button onClick={onBack} className="nl"
          style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:13,color:"var(--t2)"}}>
          <span style={{display:"inline-flex",transform:"rotate(90deg)"}}><Ic n="chevron" s={14} c="var(--t2)"/></span>
          morf
        </button>
      </div>
      <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 32px",textAlign:"center"}}>
        <div style={{width:52,height:52,borderRadius:14,background:"var(--al)",
          display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
          <Ic n={tool.icon} s={22} c="var(--ac)"/>
        </div>
        <h1 style={{fontSize:"clamp(22px,4vw,36px)",fontWeight:700,letterSpacing:"-.02em",marginBottom:8}}>{tool.label}</h1>
        <p style={{fontSize:15,color:"var(--t2)",maxWidth:440,margin:"0 auto"}}>{tool.desc}</p>
      </div>
      <div style={{maxWidth:560,margin:"0 auto",padding:"0 20px 32px"}}>
        <Panel tool={tool} onClose={onBack} showToast={showToast}
          bumpCount={bumpCount} addToHistory={addToHistory} checkLimits={checkLimits}/>
      </div>
      {/* Anuncio 4 — post-conversión */}
      <div style={{maxWidth:560,margin:"0 auto",padding:"0 20px 48px"}}>
        <AdUnit slot="5009358755" style={{minHeight:90}}/>
      </div>
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang]       = useState(detectLang);
  const [toolPage, setToolPage] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return TOOL_BASE.find(t => t.id === hash) || null;
  });
  const [modal, setModal]     = useState(null);
  const [toast, setToast]     = useState(null);
  const [globalDrag, setGlobalDrag] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);
  const { count, bumpCount }                           = useCounter();
  const { showUpgrade, setShowUpgrade, upgradeReason, checkLimits } = useFreemium();
  const { user, signOut }                              = useAuth();
  const { history, addToHistory, clearHistory }        = useHistory(user?.id);
  const [showAuth, setShowAuth]                        = useState(false);
  const [billingYear, setBillingYear] = useState(true);
  const [showAllTools, setShowAllTools] = useState(false);
  useEffect(() => {
    document.body.style.background = dark ? '#0F1117' : '#F9F9F8';
  }, [dark]);

  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      setToolPage(hash ? (TOOL_BASE.find(t => t.id === hash) || null) : null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Stripe return handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const sessionId = params.get('session_id');
      const verifyPro = async () => {
        try {
          const res = await fetch(`/api/verify-session?session_id=${sessionId}`);
          const data = await res.json();
          if (data.pro && data.email) {
            localStorage.setItem('morf_pro', 'true');
            localStorage.setItem('morf_pro_email', data.email);
            setToast({ msg: '🎉 ¡Bienvenido a Pro! Ya tienes acceso ilimitado.', type: 'ok' });
          }
        } catch {
          localStorage.setItem('morf_pro', 'true');
          setToast({ msg: '🎉 ¡Bienvenido a Pro!', type: 'ok' });
        }
        window.history.replaceState({}, '', '/');
      };
      verifyPro();
    } else if (params.get('canceled') === 'true') {
      window.history.replaceState({}, '', '/');
      setTimeout(() => setToast({ msg: 'Pago cancelado.', type: 'ok' }), 0);
    }
  }, []);

  // FAQ structured data para SEO
  useEffect(() => {
    const existing = document.getElementById('faq-schema');
    if (existing) existing.remove();
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": LANGS[lang].faq.map(([q,a]) => ({
        "@type": "Question",
        "name": q,
        "acceptedAnswer": { "@type": "Answer", "text": a }
      }))
    };
    const s = document.createElement('script');
    s.id = 'faq-schema';
    s.type = 'application/ld+json';
    s.text = JSON.stringify(schema);
    document.head.appendChild(s);
  }, [lang]);

  const T = LANGS[lang];
  const showToast = (msg, type="ok") => setToast({msg,type});

  // Build tools with translated labels
  const TOOLS = TOOL_BASE.map((t,i) => ({ ...t, ...T.t[i] }));

  const heroDrop = e => {
    e.preventDefault(); setGlobalDrag(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = "."+file.name.split(".").pop().toLowerCase();
    const mime = file.type.toLowerCase();
    if (ext === ".odt" || mime === "application/vnd.oasis.opendocument.text") {
      showToast(T.err_odt,"err");
      return;
    }
    const found = TOOLS.find(t =>
      (t.accepts||[]).includes(ext) ||
      (t.mimeTypes||[]).includes(mime)
    );
    if (found){ goToTool(found); showToast(`${T.detected}: ${found.label}`); }
    else showToast(T.unknown_fmt,"err");
  };

  const modalCfg = {
    privacy:{ title:T.modal_privacy, icon:"shield" },
    terms:  { title:T.modal_terms,   icon:"file"   },
    contact:{ title:T.modal_contact, icon:"mail"   },
    api:    { title:T.modal_api,     icon:"code"   },
  };

  const goToTool = t => {
    if (t.comingSoon) { showToast(T.coming_soon_toast||"¡Próximamente! Estamos trabajando en esta herramienta.","ok"); return; }
    window.history.pushState(null, '', `#${t.id}`); setToolPage(t);
  };
  const backHome = () => { window.history.pushState(null, '', location.pathname + location.search); setToolPage(null); };
  const fullToolPage = toolPage ? TOOLS.find(t => t.id === toolPage.id) || toolPage : null;

  return (
    <LangCtx.Provider value={T}>
      <div className={`m${dark?" dark":""}${globalDrag?" global-drag":""}`}
        onDragOver={e=>{e.preventDefault();setGlobalDrag(true)}}
        onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setGlobalDrag(false)}}
        onDrop={heroDrop}>
        <style>{css}</style>

        {/* Tool page (hash routing) */}
        {fullToolPage&&(
          <ToolPage tool={fullToolPage} showToast={showToast}
            bumpCount={bumpCount} addToHistory={addToHistory} checkLimits={checkLimits}
            onBack={backHome}/>
        )}

        {/* Main app — hidden (not unmounted) when tool page is active */}
        <div style={{display:fullToolPage?'none':'block'}}>

        {/* Header */}
        <header style={{borderBottom:"1px solid var(--bd)",background:"var(--sf)",position:"sticky",top:0,zIndex:100}}>
          <div className="m-header-inner" style={{maxWidth:960,margin:"0 auto",padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <span className="m-logo-text" style={{fontWeight:700,fontSize:15,letterSpacing:"-.03em",color:"var(--t1)"}}>morf<span style={{fontWeight:300,color:"var(--ac)"}}>.</span><span style={{fontWeight:400,color:"var(--ac)"}}>pdf</span></span>
              <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",background:"var(--al)",color:"var(--ac)",padding:"2px 6px",borderRadius:3,fontWeight:500}}>BETA</span>
            </div>
            <nav aria-label="Menú principal" style={{display:"flex",gap:16,alignItems:"center"}}>
              <button className="nl m-nav-privacy" onClick={()=>setModal("privacy")}>{T.nav_privacy}</button>
              <button className="nl m-nav-labels" onClick={()=>setModal("api")}>{T.nav_api}</button>
              <button className="nl m-nav-labels" onClick={()=>setModal("contact")}>{T.nav_help}</button>

              <button onClick={()=>setDark(d=>!d)}
                aria-label={dark?"Modo claro":"Modo oscuro"}
                aria-pressed={dark}
                title={dark?"Modo claro":"Modo oscuro"}
                style={{background:"transparent",border:"1px solid var(--bd)",borderRadius:6,
                  padding:"5px 8px",cursor:"pointer",color:"var(--t2)",display:"flex",
                  alignItems:"center",transition:"all .16s"}}>
                <Ic n={dark?"sun":"moon"} s={14} c="var(--t2)" aria-hidden="true"/>
              </button>
              <LangPicker lang={lang} setLang={setLang}/>
              {(supabase && user) ? (
                <div ref={userMenuRef} style={{position:"relative"}}>
                  <button
                    onClick={()=>setUserMenuOpen(o=>!o)}
                    title={user.email}
                    style={{display:"inline-flex",alignItems:"center",gap:5,
                      background:"var(--al)",border:"1px solid var(--ac)",
                      borderRadius:6,padding:"4px 9px",cursor:"pointer",
                      fontSize:11,color:"var(--ac)",fontFamily:"'DM Sans',sans-serif"}}>
                    <Ic n="user" s={13} c="var(--ac)" aria-hidden="true"/>
                    <span className="m-nav-labels">{user.email?.split("@")[0]}</span>
                  </button>
                  {userMenuOpen && (
                    <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,
                      background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:8,
                      minWidth:160,boxShadow:"0 4px 16px rgba(0,0,0,.1)",
                      animation:"ld .16s ease both",zIndex:300}}>
                      <div style={{padding:"10px 13px 8px",borderBottom:"1px solid var(--bd)"}}>
                        <div style={{fontSize:11,color:"var(--tm)",overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
                      </div>
                      <button
                        onClick={()=>{setUserMenuOpen(false);signOut();}}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",
                          padding:"9px 13px",fontSize:13,color:"#B91C1C",cursor:"pointer",
                          background:"transparent",border:"none",fontFamily:"'DM Sans',sans-serif",
                          textAlign:"left",transition:"background .12s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--bg)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <Ic n="x" s={13} c="#B91C1C"/>
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={()=>setShowAuth(true)}
                  style={{display:"inline-flex",alignItems:"center",gap:5,
                    background:"transparent",border:"1px solid var(--bd)",
                    borderRadius:6,padding:"4px 9px",cursor:"pointer",
                    fontSize:11,color:"var(--t2)",fontFamily:"'DM Sans',sans-serif",
                    transition:"border-color .16s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ac)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bd)"}>
                  <Ic n="user" s={13} c="var(--t2)" aria-hidden="true"/>
                  <span className="m-nav-labels">Entrar</span>
                </button>
              )}
            </nav>
          </div>
        </header>

        <div className="m-hero" style={{maxWidth:960,margin:"0 auto",padding:"48px 20px 64px"}}>
          {/* Hero */}
          <div className="fu" style={{textAlign:"center",marginBottom:44}}>
            {/* Badge */}
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:20,padding:"3px 11px 3px 7px",fontSize:11,color:"var(--tm)",marginBottom:24,fontFamily:"'DM Mono',monospace"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#22C55E",display:"inline-block"}}/>
              {T.tagline}
            </div>

            {/* Título */}
            <h1 style={{fontSize:"clamp(30px,5vw,52px)",fontWeight:300,letterSpacing:"-.03em",lineHeight:1.14,marginBottom:18,maxWidth:640,margin:"0 auto 18px"}}>
              {T.hero_h1a}<br/>
              <span style={{fontWeight:700,background:"linear-gradient(135deg,var(--ac),var(--ah))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
                {T.hero_h1b}
              </span>
            </h1>

            {/* Subtítulo */}
            <p style={{fontSize:15,color:"var(--t2)",maxWidth:480,margin:"0 auto 24px",lineHeight:1.75,fontWeight:300}}>
              {T.hero_sub}
            </p>

            {/* CTA */}
            <button className="bp" onClick={()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"})}
              style={{fontSize:14,padding:"12px 28px",borderRadius:8,gap:8,marginBottom:20}}>
              <Ic n="zap" s={15} c="#fff"/>
              {T.hero_cta}
            </button>

            {count>0&&(
              <div style={{fontSize:12,color:"var(--tm)",fontFamily:"'DM Mono',monospace"}}>
                <span>{count.toLocaleString()}</span> {T.counter}
              </div>
            )}

          </div>

          {/* Stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:48}}>
            {[
              {value:"10",                                    label:T.tools_count},
              {value:count>0?count.toLocaleString():"1000+", label:"archivos procesados"},
              {value:"<3s",                                   label:"velocidad media"},
              {value:"100%",                                  label:"privado siempre"},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:"center",padding:"16px 12px",background:"var(--sf)",
                border:"1px solid var(--bd)",borderRadius:10}}>
                <div style={{fontSize:22,fontWeight:700,color:"var(--ac)",
                  fontFamily:"'DM Mono',monospace",marginBottom:4,letterSpacing:"-.02em"}}>{s.value}</div>
                <div style={{fontSize:11,color:"var(--tm)",lineHeight:1.4}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Anuncio 1 — tras propuesta de valor */}
          <div style={{marginBottom:48}}>
            <AdUnit slot="9092219780" style={{minHeight:90}}/>
          </div>

          {/* Cómo funciona */}
          <div style={{marginBottom:48}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <h2 style={{fontSize:17,fontWeight:600,letterSpacing:"-.02em",marginBottom:6}}>{T.how_title}</h2>
              <p style={{fontSize:13,color:"var(--tm)",maxWidth:440,margin:"0 auto"}}>{T.how_sub}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:2,position:"relative"}}>
              {T.how_steps.map(([title,desc],i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",
                  padding:"24px 20px",background:"var(--sf)",border:"1px solid var(--bd)",
                  borderRadius:i===0?"10px 0 0 10px":i===2?"0 10px 10px 0":"0",
                  position:"relative"}}>
                  <div style={{width:36,height:36,borderRadius:"50%",
                    background:i===0?"var(--ac)":i===1?"var(--ah)":"var(--ok)",
                    display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,flexShrink:0}}>
                    <span style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"'DM Mono',monospace"}}>{i+1}</span>
                  </div>
                  <div style={{marginBottom:10}}>
                    <Ic n={["grid","upload","download"][i]} s={20} c={["var(--ac)","var(--ah)","var(--ok)"][i]}/>
                  </div>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>{title}</div>
                  <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.6}}>{desc}</div>
                  {i<2&&(
                    <div style={{position:"absolute",right:-12,top:"50%",transform:"translateY(-50%)",
                      zIndex:1,background:"var(--sf)",padding:"2px 0",display:"flex",alignItems:"center"}}>
                      <span style={{display:"block",transform:"rotate(-90deg)"}}><Ic n="chevron" s={16} c="var(--tm)"/></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Before / After — only shown when user has real history */}
          {history.length > 0 && (
            <div style={{marginBottom:48}}>
              <div style={{textAlign:"center",marginBottom:20}}>
                <h2 style={{fontSize:17,fontWeight:600,letterSpacing:"-.02em",marginBottom:4}}>Tus últimas conversiones</h2>
                <p style={{fontSize:13,color:"var(--tm)"}}>Solo visible para ti en este dispositivo</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:600,margin:"0 auto"}}>
                {history.slice(0,3).map((h,i)=>{
                  const tool = TOOLS.find(t=>t.label===h.tool);
                  const extMap = {pdf:".pdf",docx:".docx",jpg:".jpg",png:".png",xlsx:".xlsx",img:".pdf"};
                  const outExt = tool ? (extMap[tool.to]||"") : "";
                  const outName = h.filename.replace(/\.[^.]+$/,"") + outExt;
                  return (
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center"}}>
                      <div style={{padding:"11px 13px",background:"var(--sf)",border:"1px solid var(--bd)",
                        borderRadius:8,display:"flex",alignItems:"center",gap:9,minWidth:0,overflow:"hidden"}}>
                        <Ic n="file" s={15} c="var(--tm)" style={{flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",
                            whiteSpace:"nowrap"}}>{h.filename}</div>
                          <div style={{fontSize:10,color:"var(--tm)",fontFamily:"'DM Mono',monospace"}}>{h.tool}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Ic n="arrow" s={18} c="var(--ac)" sw={1.6}/>
                      </div>
                      <div style={{padding:"11px 13px",background:"var(--sf)",border:"1px solid var(--ok)",
                        borderRadius:8,display:"flex",alignItems:"center",gap:9,minWidth:0,overflow:"hidden"}}>
                        <Ic n="file" s={15} c="var(--ok)" style={{flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",
                            whiteSpace:"nowrap"}}>{outName}</div>
                          <div style={{fontSize:10,color:"var(--ok)",fontFamily:"'DM Mono',monospace",fontWeight:500}}>listo ✓</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tools */}
          <div id="tools">
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:600}}>{T.tools_title}</span>
              <span style={{fontSize:11,color:"var(--tm)",fontFamily:"'DM Mono',monospace"}}>{TOOLS.length} {T.tools_count}</span>
            </div>
            {/* Popular tools (always visible) */}
            <div className="grid" style={{marginBottom:10}}>
              {TOOLS.filter(t=>t.popular).map((t,i)=>(
                <div key={t.id} className={`card fu fu${i+1}`}
                  role="button" tabIndex={0}
                  aria-label={t.label}
                  style={{opacity:t.comingSoon?.6:1}}
                  onClick={()=>goToTool(t)}
                  onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();goToTool(t);}}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{width:34,height:34,borderRadius:7,background:"#F5F5F3",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Ic n={t.icon} s={15} c="var(--t2)"/>
                    </div>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      {t.pro&&<span style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",background:"var(--ac)",color:"#fff",borderRadius:3,padding:"1px 5px",letterSpacing:".04em"}}>PRO</span>}
                      {t.comingSoon&&<span style={{fontSize:9,fontWeight:600,fontFamily:"'DM Mono',monospace",background:"var(--al)",color:"var(--ac)",borderRadius:3,padding:"1px 5px"}}>SOON</span>}
                      <Tag type={t.from}/><span style={{color:"var(--tm)",fontSize:10}}>→</span><Tag type={t.to}/>
                    </div>
                  </div>
                  <div style={{fontWeight:500,fontSize:13,marginBottom:3}}>{t.label}</div>
                  <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.5}}>{t.desc}</div>
                </div>
              ))}
            </div>
            {/* More tools toggle */}
            <button
              onClick={()=>setShowAllTools(s=>!s)}
              style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",
                cursor:"pointer",color:"var(--tm)",fontSize:12,padding:"4px 0",marginBottom:10,
                fontFamily:"'DM Sans',sans-serif",transition:"color .16s"}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--t2)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--tm)"}>
              <span style={{display:"inline-flex",transform:showAllTools?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>
                <Ic n="chevron" s={12} c="var(--tm)"/>
              </span>
              {showAllTools ? T.tools_less ?? "Menos herramientas" : T.tools_more ?? `+${TOOLS.filter(t=>!t.popular).length} más herramientas`}
            </button>
            {/* Extra tools (collapsible) */}
            {showAllTools&&(
              <div className="grid fu" style={{marginBottom:14}}>
                {TOOLS.filter(t=>!t.popular).map((t,i)=>(
                  <div key={t.id} className={`card fu fu${i+1}`}
                    role="button" tabIndex={0}
                    aria-label={t.label}
                    style={{opacity:t.comingSoon?.6:1}}
                    onClick={()=>goToTool(t)}
                    onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();goToTool(t);}}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                      <div style={{width:34,height:34,borderRadius:7,background:"#F5F5F3",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n={t.icon} s={15} c="var(--t2)"/>
                      </div>
                      <div style={{display:"flex",gap:4,alignItems:"center"}}>
                        {t.pro&&<span style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",background:"var(--ac)",color:"#fff",borderRadius:3,padding:"1px 5px",letterSpacing:".04em"}}>PRO</span>}
                        {t.comingSoon&&<span style={{fontSize:9,fontWeight:600,fontFamily:"'DM Mono',monospace",background:"var(--al)",color:"var(--ac)",borderRadius:3,padding:"1px 5px"}}>SOON</span>}
                        <Tag type={t.from}/><span style={{color:"var(--tm)",fontSize:10}}>→</span><Tag type={t.to}/>
                      </div>
                    </div>
                    <div style={{fontWeight:500,fontSize:13,marginBottom:3}}>{t.label}</div>
                    <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.5}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anuncio 2 — tras herramientas */}
          <AdUnit slot="4442528333" style={{marginTop:32,minHeight:90}}/>

          {/* Features */}
          <div className="m-feat" style={{borderTop:"1px solid var(--bd)",marginTop:48,paddingTop:36,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:20}}>
            {T.feat.map(([title,desc],i)=>(
              <div key={i} style={{display:"flex",gap:11,alignItems:"flex-start"}}>
                <div style={{width:28,height:28,borderRadius:6,background:"#F5F5F3",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Ic n={["file","check","download","compress"][i]} s={13} c="var(--t2)"/>
                </div>
                <div>
                  <div style={{fontWeight:500,fontSize:12,marginBottom:1}}>{title}</div>
                  <div style={{fontSize:11,color:"var(--tm)",lineHeight:1.5}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 48px"}}>
          <div style={{borderTop:"1px solid var(--bd)",paddingTop:36}}>
            <h2 style={{fontSize:18,fontWeight:600,letterSpacing:"-.02em",marginBottom:6,textAlign:"center"}}>{T.pricing_title}</h2>
            <p style={{fontSize:13,color:"var(--tm)",textAlign:"center",marginBottom:24}}>{T.pricing_sub}</p>

            {/* Billing toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:28}}>
              <span style={{fontSize:13,color:!billingYear?"var(--t1)":"var(--tm)",fontWeight:!billingYear?500:400}}>Mensual</span>
              <button onClick={()=>setBillingYear(y=>!y)}
                style={{width:40,height:22,borderRadius:11,border:"none",cursor:"pointer",
                  background:billingYear?"var(--ac)":"var(--bd)",transition:"background .2s",position:"relative",padding:0}}>
                <span style={{position:"absolute",top:3,left:billingYear?20:3,width:16,height:16,
                  borderRadius:"50%",background:"#fff",transition:"left .2s",display:"block"}}/>
              </button>
              <span style={{fontSize:13,color:billingYear?"var(--t1)":"var(--tm)",fontWeight:billingYear?500:400}}>
                Anual <span style={{fontSize:10,background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:3,fontWeight:600}}>{T.plan_save}</span>
              </span>
            </div>

            {/* Plan cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16,maxWidth:560,margin:"0 auto"}}>
              {/* Free */}
              <div style={{border:"1px solid var(--bd)",borderRadius:12,padding:"24px 20px",background:"var(--sf)"}}>
                <div style={{fontWeight:600,fontSize:15,marginBottom:2}}>{T.plan_free}</div>
                <div style={{fontSize:12,color:"var(--tm)",marginBottom:16}}>{T.plan_free_desc}</div>
                <div style={{fontSize:32,fontWeight:700,marginBottom:4}}>€0</div>
                <div style={{fontSize:11,color:"var(--tm)",marginBottom:20}}>para siempre</div>
                {[T.feat_batch, T.feat_size_free, T.feat_tools].map((f,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,color:"var(--t2)",marginBottom:8}}>
                    <Ic n="check" s={13} c="var(--tm)"/>{f}
                  </div>
                ))}
                <button className="bg" style={{width:"100%",marginTop:20,fontSize:13,padding:"9px 0",textAlign:"center"}}>
                  {T.plan_cta_free}
                </button>
              </div>
              {/* Pro */}
              <div style={{border:"2px solid var(--ac)",borderRadius:12,padding:"24px 20px",background:"var(--al)",position:"relative"}}>
                <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",
                  background:"var(--ac)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:10,
                  fontFamily:"'DM Mono',monospace",letterSpacing:".05em",whiteSpace:"nowrap"}}>MÁS POPULAR</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:2,color:"var(--ac)"}}>{T.plan_pro}</div>
                <div style={{fontSize:12,color:"var(--tm)",marginBottom:16}}>{T.plan_pro_desc}</div>
                <div style={{fontSize:32,fontWeight:700,marginBottom:4,color:"var(--ac)"}}>
                  €{billingYear?(5.99*12*0.75/12).toFixed(2):"5.99"}
                </div>
                <div style={{fontSize:11,color:"var(--tm)",marginBottom:20}}>{T.plan_monthly}{billingYear&&<span style={{color:"var(--ok)",fontWeight:500}}> · {T.plan_save}</span>}</div>
                {[T.feat_unlimited, T.feat_size_pro, T.feat_tools, T.feat_noad, T.feat_priority].map((f,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,color:"var(--t1)",marginBottom:8}}>
                    <Ic n="check" s={13} c="var(--ok)"/>{f}
                  </div>
                ))}
                <button className="bp" style={{width:"100%",marginTop:20,fontSize:13,padding:"10px 0",justifyContent:"center"}}
                  onClick={()=>setShowUpgrade(true)}>
                  {T.plan_cta_pro}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 48px"}}>
          <div style={{borderTop:"1px solid var(--bd)",paddingTop:36}}>
            <h2 style={{fontSize:18,fontWeight:600,letterSpacing:"-.02em",marginBottom:24,textAlign:"center"}}>{T.faq_title}</h2>
            <div style={{maxWidth:680,margin:"0 auto",display:"flex",flexDirection:"column",gap:2}}>
              {T.faq.map(([q,a],i)=>(
                <FaqItem key={i} q={q} a={a}/>
              ))}
            </div>
          </div>
        </div>

        {/* Anuncio 3 — tras FAQ */}
        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 32px"}}>
          <AdUnit slot="4789866901" style={{minHeight:90}}/>
        </div>

        {/* Historial */}
        {history.length > 0 && (
          <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 48px"}}>
            <div style={{borderTop:"1px solid var(--bd)",paddingTop:32}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Ic n="download" s={14} c="var(--t2)"/>
                  <span style={{fontWeight:600,fontSize:13}}>{T.hist_title}</span>
                </div>
                <button className="nl" style={{fontSize:11,color:"var(--tm)"}} onClick={clearHistory}>{T.hist_clear}</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {history.map((h,i)=>{
                  const d = new Date(h.date);
                  const dateStr = d.toLocaleDateString(T.code==="en"?"en-GB":T.code==="de"?"de-DE":T.code==="fr"?"fr-FR":T.code==="pt"?"pt-PT":"es-ES",
                    {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                      background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:8,
                      animation:`fu .2s ease ${i*0.04}s both`}}>
                      <Ic n="file" s={13} c="var(--tm)"/>
                      <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--t1)"}}>{h.filename}</span>
                      <span style={{fontSize:11,color:"var(--ac)",fontWeight:500,flexShrink:0,
                        background:"var(--al)",padding:"2px 7px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>
                        {h.tool}
                      </span>
                      <span style={{fontSize:10,color:"var(--tm)",flexShrink:0}}>{dateStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        </div>{/* /Main app */}

        {/* Footer */}
        <footer style={{display:fullToolPage?'none':'block',borderTop:"1px solid var(--bd)",background:"var(--sf)"}}>
          <div style={{maxWidth:960,margin:"0 auto",padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:12,fontWeight:700,letterSpacing:"-.02em",color:"var(--tm)"}}>morf<span style={{fontWeight:300,color:"var(--ac)"}}>.</span><span style={{fontWeight:400,color:"var(--ac)"}}>pdf</span></span>
              <span style={{fontSize:12,color:"var(--tm)"}}>{T.footer_copy}</span>
            </div>
            <div style={{display:"flex",gap:16}}>
              <button className="fl" onClick={()=>setModal("privacy")}>{T.modal_privacy}</button>
              <button className="fl" onClick={()=>setModal("terms")}>{T.modal_terms}</button>
              <button className="fl" onClick={()=>setModal("contact")}>{T.modal_contact}</button>
              <button className="fl" onClick={()=>setModal("api")}>{T.modal_api}</button>
            </div>
          </div>
        </footer>

        {/* Modals */}
        {showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}
        {showUpgrade&&(
          <UpgradeModal reason={upgradeReason} billingYear={billingYear} setBillingYear={setBillingYear}
            onClose={()=>setShowUpgrade(false)} T={T}/>
        )}

        {modal&&(
          <Modal title={modalCfg[modal].title} icon={modalCfg[modal].icon} onClose={()=>setModal(null)}>
            {modal==="privacy"&&<Privacy/>}
            {modal==="terms"  &&<Terms/>}
            {modal==="contact"&&<Contact showToast={showToast} onClose={()=>setModal(null)}/>}
            {modal==="api"    &&<API/>}
          </Modal>
        )}

        {toast&&<Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      </div>
    </LangCtx.Provider>
  );
}
