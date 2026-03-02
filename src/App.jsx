import { useState, useEffect, useRef, memo } from "react";
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
import Panel from "./components/Panel";
import { TOOL_BASE } from "./utils/tools";
import { Privacy, Terms, Contact, API } from "./components/ModalContents";

/* ── CSS ──────────────────────────────────────────────────────────────────── */
const css = `
  html,body,#root{margin:0;padding:0;min-height:100vh;background:inherit;overflow-x:hidden;scroll-behavior:smooth}
  .m*{box-sizing:border-box;margin:0;padding:0}
  .m{
    --bg:#F9F9F8;--sf:#FFF;--bd:#E3E3E0;--bh:#C4C4C0;
    --t1:#111110;--t2:#6B6B68;--tm:#9B9B98;--tf:#111110;
    --ac:#1C3042;--al:#E8EDF2;--ah:#142435;--ok:#1B6640;
    font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1);
    font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh;
    transition:background .2s,color .2s;
  }
  .m.dark{
    --bg:#0F1117;--sf:#1A1D27;--bd:#2A2D3A;--bh:#3A3D4A;
    --t1:#F0F0EE;--t2:#9A9AA8;--tm:#6A6A78;--tf:#F0F0EE;
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
  @keyframes rv{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
  @keyframes tp{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes pr{from{width:0}to{width:100%}}
  @keyframes fo{from{opacity:0}to{opacity:1}}
  @keyframes mu{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ld{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
  @keyframes nb{0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)}}

  .fu{animation:fu .32s ease both}
  .fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
  .fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}

  /* Scroll-reveal: oculto por defecto, animado cuando se añade la clase .on */
  .rv{opacity:0}
  .rv.on{animation:rv .55s cubic-bezier(.25,.46,.45,.94) both}
  /* Stagger para hijos de .rv-wrap cuando el padre recibe .on */
  .rv-wrap .rv-item{opacity:0;transition:none}
  .rv-wrap.on .rv-item{animation:rv .5s cubic-bezier(.25,.46,.45,.94) both}
  .rv-wrap.on .rv-item:nth-child(1){animation-delay:0s}
  .rv-wrap.on .rv-item:nth-child(2){animation-delay:.1s}
  .rv-wrap.on .rv-item:nth-child(3){animation-delay:.2s}
  .rv-wrap.on .rv-item:nth-child(4){animation-delay:.3s}
  .rv-wrap.on .rv-item:nth-child(5){animation-delay:.4s}
  .rv-wrap.on .rv-item:nth-child(6){animation-delay:.5s}

  /* Hero stagger — cada hijo directo del bloque hero anima secuencialmente */
  .hero-seq > *{opacity:0;animation:fu .45s ease both}
  .hero-seq > *:nth-child(1){animation-delay:.05s}
  .hero-seq > *:nth-child(2){animation-delay:.18s}
  .hero-seq > *:nth-child(3){animation-delay:.30s}
  .hero-seq > *:nth-child(4){animation-delay:.42s}
  .hero-seq > *:nth-child(5){animation-delay:.54s}

  /* ToolPage slide-in */
  .tool-page-enter{animation:tp .3s cubic-bezier(.25,.46,.45,.94) both}

  /* Icono de card: escala suave en hover */
  .card-icon{transition:transform .22s cubic-bezier(.34,1.56,.64,1)}
  .card:hover .card-icon{transform:scale(1.15)}

  .card{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:18px;cursor:pointer;
    transition:border-color .16s,box-shadow .16s,transform .16s}
  .card:hover{border-color:var(--bh);box-shadow:0 2px 10px rgba(0,0,0,.07);transform:translateY(-1px)}
  .card.on{border-color:var(--ac);box-shadow:0 0 0 3px var(--al)}

  .bp{background:var(--ac);color:#fff;border:none;border-radius:6px;padding:9px 18px;
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;
    display:inline-flex;align-items:center;gap:7px;transition:background .16s,transform .16s}
  .bp:hover{background:var(--ah)}.bp:disabled{opacity:.4;cursor:not-allowed}
  .bp:focus-visible{outline:2px solid var(--ac);outline-offset:3px}

  .bg{background:transparent;color:var(--t2);border:1px solid var(--bd);border-radius:6px;
    padding:8px 16px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all .16s}
  .bg:hover{border-color:var(--bh);color:var(--t1);background:#F5F5F3}
  .bg:focus-visible{outline:2px solid var(--ac);outline-offset:2px}

  .nl:focus-visible,.fl:focus-visible{outline:2px solid var(--ac);outline-offset:2px;border-radius:2px}
  .card:focus-visible{outline:2px solid var(--ac);outline-offset:2px}

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
    /* !important so it overrides any inline display style */
    .m-nav-labels{display:none!important}
    /* Hamburger visible en móvil, botón "Herramientas" de la nav oculto */
    .m-hamburger{display:inline-flex!important;color:var(--t1)}
    .m-tools-nav-btn{display:none!important}

    /* Hero */
    .m-hero{padding:32px 14px 48px!important}
    .m-hero-drop{padding:28px 14px!important;margin-bottom:32px!important}

    /* Stats: 2 columns on mobile */
    .m-stats{grid-template-columns:1fr 1fr!important}

    /* How-it-works: full rounded + hide arrows when stacked + add gap */
    .m-how-step{border-radius:10px!important}
    .m-how-arrow{display:none!important}
    .m-how-grid{gap:8px!important}

    /* Panel */
    .m-panel{margin:0 -14px!important;border-radius:0!important;border-left:none!important;border-right:none!important}

    /* Features */
    .m-feat{grid-template-columns:1fr 1fr!important}

    /* Buttons: bigger tap targets */
    .bp,.bg{font-size:12px!important;padding:10px 14px!important;min-height:44px!important}

    /* Modal: limit height so keyboard doesn't cover inputs */
    .sh{max-height:80vh!important}
    .sh-body{padding:16px!important}

    /* Toast */
    .toast{left:14px!important;right:14px!important;bottom:14px!important;font-size:11px!important}

    /* Steps UI */
    .m-steps{padding:12px!important}

    /* Footer grid: brand full-width, tools+company side by side below */
    .m-footer-grid{grid-template-columns:1fr!important;gap:20px!important}
    .m-footer-cols{display:grid!important;grid-template-columns:1fr 1fr;gap:16px}

    /* Hide Ctrl+K keyboard shortcut badge on touch screens */
    .m-ctrl-k{display:none!important}

    /* Search input: remove extra right padding when badge is hidden */
    .m-search-inp{padding-right:9px!important}

    /* Before/After history: stack vertically on mobile */
    .m-hist-item{grid-template-columns:1fr!important;gap:6px!important}
    .m-hist-arrow{display:none!important}

    /* Tools overlay: ocultar logo en móvil, mostrar título */
    .m-overlay-logo{display:none!important}
    .m-overlay-title{display:inline!important}
    .m-overlay-header{padding:0 12px!important;gap:8px!important}

    /* iOS: prevent input zoom (inputs must be ≥16px font-size on mobile) */
    input,textarea,select{font-size:16px!important}

    /* Hero CTA: full-width on mobile */
    .m-hero-cta{width:100%!important;justify-content:center!important;padding:14px 20px!important}

    /* Card description: slightly larger on mobile */
    .m-card-desc{font-size:12px!important}
  }

  @media(max-width:400px){
    .grid{grid-template-columns:1fr 1fr!important}
    /* Hide date in history items when screen is very narrow */
    .m-hist-date{display:none!important}
  }

  /* Overlay: el título sólo se muestra en móvil (logo visible en desktop) */
  .m-overlay-title{display:none}

  /* Onboarding banner */
  @keyframes ob{0%{transform:translateY(-8px);opacity:0}100%{transform:translateY(0);opacity:1}}
  .onboarding-banner{animation:ob .4s .6s ease both}

  /* PWA install banner (desliza desde abajo) */
  @keyframes pwa-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
  .pwa-banner{animation:pwa-in .35s cubic-bezier(.25,.46,.45,.94) both}

  /* Tool list item hover */
  .tli:hover{background:var(--al)}
  .tli:focus-visible{outline:2px solid var(--ac);outline-offset:-2px;background:var(--al)}

  /* ── Touch active states (no hover on touch) ── */
  @media(hover:none){
    .card:active{transform:scale(.97)!important;transition:transform .1s!important}
    .bp:active{opacity:.85!important;transform:scale(.98)!important}
    .bg:active{opacity:.7!important}
    .bp:hover,.bg:hover,.card:hover{transform:none;box-shadow:none}
  }

  /* ── Respect user's reduced-motion preference ── */
  @media(prefers-reduced-motion:reduce){
    *,*::before,*::after{
      animation-duration:.01ms!important;animation-iteration-count:1!important;
      transition-duration:.01ms!important;scroll-behavior:auto!important
    }
  }

  /* ── Scroll-to-top FAB ── */
  .scroll-top{position:fixed;bottom:72px;right:16px;width:40px;height:40px;border-radius:50%;
    background:var(--ac);color:#fff;border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 12px rgba(0,0,0,.18);z-index:90;
    animation:ld .2s ease both;transition:opacity .2s,background .16s}
  .scroll-top:hover{background:var(--ah)}

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

  /* ── Tool color themes ───────────────────────────────────────────────────── */
  .tc-blue   {--ti-bg:#DBEAFE;--ti-ic:#2563EB}
  .tc-green  {--ti-bg:#D1FAE5;--ti-ic:#059669}
  .tc-orange {--ti-bg:#FFEDD5;--ti-ic:#EA580C}
  .tc-emerald{--ti-bg:#ECFDF5;--ti-ic:#10B981}
  .tc-red    {--ti-bg:#FEE2E2;--ti-ic:#EF4444}
  .tc-amber  {--ti-bg:#FEF3C7;--ti-ic:#D97706}
  .tc-teal   {--ti-bg:#CCFBF1;--ti-ic:#0D9488}
  .tc-purple {--ti-bg:#EDE9FE;--ti-ic:#7C3AED}
  .tc-gray   {--ti-bg:#F3F4F6;--ti-ic:#6B7280}
  .m.dark .tc-blue   {--ti-bg:#1E3A5F;--ti-ic:#60A5FA}
  .m.dark .tc-green  {--ti-bg:#064E3B;--ti-ic:#34D399}
  .m.dark .tc-orange {--ti-bg:#431407;--ti-ic:#FB923C}
  .m.dark .tc-emerald{--ti-bg:#022C22;--ti-ic:#34D399}
  .m.dark .tc-red    {--ti-bg:#450A0A;--ti-ic:#F87171}
  .m.dark .tc-amber  {--ti-bg:#451A03;--ti-ic:#FCD34D}
  .m.dark .tc-teal   {--ti-bg:#042F2E;--ti-ic:#2DD4BF}
  .m.dark .tc-purple {--ti-bg:#2E1065;--ti-ic:#A78BFA}
  .m.dark .tc-gray   {--ti-bg:#1F2937;--ti-ic:#9CA3AF}

  /* card with color theme: hover border matches icon color */
  .card.tc-blue:hover  {border-color:#2563EB;box-shadow:0 2px 12px rgba(37,99,235,.12)}
  .card.tc-green:hover {border-color:#059669;box-shadow:0 2px 12px rgba(5,150,105,.12)}
  .card.tc-orange:hover{border-color:#EA580C;box-shadow:0 2px 12px rgba(234,88,12,.12)}
  .card.tc-emerald:hover{border-color:#10B981;box-shadow:0 2px 12px rgba(16,185,129,.12)}
  .card.tc-red:hover   {border-color:#EF4444;box-shadow:0 2px 12px rgba(239,68,68,.12)}
  .card.tc-amber:hover {border-color:#D97706;box-shadow:0 2px 12px rgba(217,119,6,.12)}
  .card.tc-teal:hover  {border-color:#0D9488;box-shadow:0 2px 12px rgba(13,148,136,.12)}
  .card.tc-purple:hover{border-color:#7C3AED;box-shadow:0 2px 12px rgba(124,58,237,.12)}
  /* Color wash: card gets its tool color as tinted background on hover */
  .card[class*="tc-"]:hover{background:var(--ti-bg)}

  /* category header color dots */
  .cat-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}

  /* hero: graph-paper grid + radial gradients */
  .m-hero-wrap{
    background:
      linear-gradient(rgba(0,0,0,.028) 1px,transparent 1px),
      linear-gradient(90deg,rgba(0,0,0,.028) 1px,transparent 1px),
      radial-gradient(ellipse at 15% 60%,rgba(99,102,241,.06) 0%,transparent 55%),
      radial-gradient(ellipse at 85% 40%,rgba(16,185,129,.06) 0%,transparent 55%);
    background-size:40px 40px,40px 40px,auto,auto;
  }
  .m.dark .m-hero-wrap{
    background:
      linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px),
      radial-gradient(ellipse at 15% 60%,rgba(99,102,241,.09) 0%,transparent 55%),
      radial-gradient(ellipse at 85% 40%,rgba(16,185,129,.07) 0%,transparent 55%);
    background-size:40px 40px,40px 40px,auto,auto;
  }

  /* ── Stat cards: hover lift ──────────────────────────────────────────── */
  .stat-card{transition:border-color .2s,transform .22s,box-shadow .22s!important}
  .stat-card:hover{border-color:var(--ac)!important;transform:translateY(-3px)!important;
    box-shadow:0 8px 24px rgba(0,0,0,.09)!important}

  /* ── Hero badge dot: pulse ───────────────────────────────────────────── */
  @keyframes hpulse{
    0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}
    70%{box-shadow:0 0 0 7px rgba(34,197,94,0)}
    100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
  }
  .hero-dot{animation:hpulse 2.5s ease-out infinite;border-radius:50%}

  /* ── How-it-works step circles: gradient ────────────────────────────── */
  .how-step-num{background:linear-gradient(145deg,var(--ac),var(--ah))!important;
    box-shadow:0 4px 12px rgba(28,48,66,.2)}
  .m.dark .how-step-num{box-shadow:0 4px 12px rgba(123,167,196,.2)}

  /* ── Pro plan badge: subtle shimmer ─────────────────────────────────── */
  @keyframes prsh{0%,100%{opacity:1}50%{opacity:.82}}
  .pro-badge-pill{animation:prsh 3.2s ease infinite}

  /* ── Feature icons: depth + hover scale ─────────────────────────────── */
  .feat-icon{box-shadow:0 2px 10px rgba(0,0,0,.07);transition:transform .22s cubic-bezier(.34,1.56,.64,1)}
  .rv-item:hover .feat-icon{transform:scale(1.1)}

  /* ── Pro pricing card: premium glow ──────────────────────────────────── */
  .pro-card{box-shadow:0 0 0 1px rgba(28,48,66,.12),0 8px 32px rgba(28,48,66,.18)!important;
    transition:box-shadow .3s,transform .3s!important}
  .pro-card:hover{box-shadow:0 0 0 1px rgba(28,48,66,.2),0 14px 44px rgba(28,48,66,.28)!important;
    transform:translateY(-3px)!important}
  .m.dark .pro-card{box-shadow:0 0 0 1px rgba(123,167,196,.2),0 8px 32px rgba(123,167,196,.18)!important}
  .m.dark .pro-card:hover{box-shadow:0 0 0 1px rgba(123,167,196,.3),0 14px 44px rgba(123,167,196,.26)!important;
    transform:translateY(-3px)!important}

  /* ── Dropzone: bounce icon on hover/drag ─────────────────────────────── */
  @keyframes dz-bounce{0%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} 70%{transform:translateY(-3px)}}
  .dz{border-width:2px!important;border-radius:12px!important;transition:all .22s!important}
  .dz:hover,.dz.ov{box-shadow:0 0 0 3px var(--al)!important}
  .dz:hover .dz-icon,.dz.ov .dz-icon{animation:dz-bounce .75s ease-in-out infinite}

  /* ── Toast types ──────────────────────────────────────────────────────── */
  .toast{padding-left:14px!important}
  .toast-ok{border-left:3px solid #22C55E}
  .toast-err{border-left:3px solid #EF4444}

  /* ── Tool page banner: icono hover scale ─────────────────────────────── */
  .tool-banner-icon{transition:transform .22s cubic-bezier(.34,1.56,.64,1)}
  .tool-banner-icon:hover{transform:scale(1.07)}

  /* ── Eyebrow bar: barra de acento encima de h2 ───────────────────────── */
  .eyebrow-bar{width:28px;height:3px;border-radius:2px;background:var(--ac);margin:0 auto 14px}

  /* ── Footer: gradiente de color como separador superior ─────────────── */
  .m-footer::before{
    content:"";display:block;height:3px;
    background:linear-gradient(90deg,var(--ac) 0%,transparent 50%,var(--ok) 100%);
    margin-bottom:32px}

  /* ── Progress bar: shimmer ───────────────────────────────────────────── */
  @keyframes bar-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  .prog-fill{
    height:100%;border-radius:3px;
    background:linear-gradient(90deg,var(--ac) 0%,var(--ah) 45%,var(--ac) 100%);
    background-size:200% 100%;
    animation:bar-shimmer 1.4s linear infinite;
    transition:width .12s linear}

  /* ── Done check: pop de entrada ──────────────────────────────────────── */
  @keyframes check-pop{
    0%{transform:scale(0);opacity:0}
    65%{transform:scale(1.2)}
    100%{transform:scale(1);opacity:1}}
  .done-check{animation:check-pop .5s cubic-bezier(.34,1.56,.64,1) both}

  /* ── How-it-works steps: hover lift ──────────────────────────────────── */
  .m-how-step{transition:transform .2s,box-shadow .2s,border-color .2s}
  .m-how-step:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08);border-color:var(--bh)}

  /* ── Error state: shake animation ────────────────────────────────────── */
  @keyframes err-shake{
    0%,100%{transform:translateX(0)}
    20%,60%{transform:translateX(-5px)}
    40%,80%{transform:translateX(5px)}}
  .err-icon{animation:err-shake .45s ease .05s both}

  /* ── FAQ: hover en botón de pregunta ─────────────────────────────────── */
  .faq-q{transition:color .15s}
  .faq-q:hover{color:var(--ac)!important}

  /* ── Search highlight ────────────────────────────────────────────────── */
  .srch-hl{background:#FEF08A;color:#78350F;border-radius:2px;padding:0 1px}
  .m.dark .srch-hl{background:#713F12;color:#FEF9C3}

  /* ── Floating hero format pills ──────────────────────────────────────── */
  @keyframes float-pill{
    0%,100%{transform:translateY(0px) rotate(var(--rot,0deg))}
    50%{transform:translateY(-12px) rotate(var(--rot,0deg))}
  }
  .hero-pill{
    position:absolute;pointer-events:none;user-select:none;
    padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;
    fontFamily:"'DM Mono',monospace";letter-spacing:.08em;
    border:1px solid;animation:float-pill var(--dur,4s) ease-in-out infinite;
    animation-delay:var(--delay,0s);opacity:.65;
  }

  /* ── Dark mode icon: flip animation ─────────────────────────────────── */
  @keyframes icon-flip{
    0%{opacity:0;transform:rotate(-90deg) scale(.7)}
    100%{opacity:1;transform:rotate(0deg) scale(1)}
  }
  .dark-icon{animation:icon-flip .3s ease both}

  /* ── Pricing: segmented control ──────────────────────────────────────── */
  .seg-ctrl{display:inline-flex;background:var(--bd);border-radius:8px;padding:3px;gap:2px}
  .seg-btn{border:none;border-radius:6px;padding:5px 14px;font-size:12px;font-weight:500;
    cursor:pointer;transition:background .18s,color .18s,box-shadow .18s;
    fontFamily:"'DM Sans',sans-serif";color:var(--t2);background:transparent}
  .seg-btn.active{background:var(--sf);color:var(--t1);font-weight:600;
    box-shadow:0 1px 4px rgba(0,0,0,.12)}

  /* ── Coming soon: improved state ─────────────────────────────────────── */
  @keyframes cs-drift{0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)}}
  .cs-icon{animation:cs-drift 3s ease-in-out infinite}
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

/* ── Tool color map ──────────────────────────────────────────────────────── */
const TOOL_COLOR = {
  // Document ↔ Word/HTML → blue
  "pdf-word":"tc-blue","word-pdf":"tc-blue","html-pdf":"tc-blue",
  // Excel → green
  "excel-pdf":"tc-green","pdf-excel":"tc-green",
  // PowerPoint → orange
  "pptx-pdf":"tc-orange","pdf-pptx":"tc-orange",
  // Images → emerald
  "img-pdf":"tc-emerald","png-jpg":"tc-emerald","jpg-png":"tc-emerald","pdf-img":"tc-emerald",
  // Core PDF ops → red
  "merge":"tc-red","split":"tc-red","compress":"tc-red","rotate":"tc-red",
  "organize-pdf":"tc-red","delete-pages":"tc-red","repair-pdf":"tc-red","flatten-pdf":"tc-red",
  // Edit / annotate → amber
  "watermark-pdf":"tc-amber","number-pages":"tc-amber","crop-pdf":"tc-amber",
  "sign-pdf":"tc-amber","annotate-pdf":"tc-amber","visual-annotate":"tc-amber","redact-pdf":"tc-amber",
  // Grayscale → gray
  "grayscale-pdf":"tc-gray",
  // Security → teal
  "unlock-pdf":"tc-teal","protect-pdf":"tc-teal",
  // AI / advanced → purple
  "ocr-pdf":"tc-purple","ocr-searchable":"tc-purple","chat-pdf":"tc-purple",
  "summarize-pdf":"tc-purple","compare-pdf":"tc-purple","pdf-markdown":"tc-purple",
};

const CAT_DOT_COLOR = {
  cat_conv:"#2563EB", cat_img:"#10B981", cat_ops:"#EF4444",
  cat_edit:"#D97706", cat_sec:"#0D9488",
};

/* ── StatCard — card de estadística con contador roll-up ─────────────────── */
function StatCard({ value, label, parentRef }) {
  const str = String(value);
  const m   = str.match(/^(\d[\d,]*)/);
  const tgt = m ? parseInt(m[1].replace(/,/g,"")) : 0;
  const sfx = m ? str.slice(m[0].length) : "";
  // null = mostrar valor crudo (pre-animación / tests); número = animando
  const [n, setN] = useState(null);
  const ran = useRef(false);
  useEffect(() => {
    if (!m) return;
    const el = parentRef.current;
    if (!el) return;
    const run = () => {
      if (ran.current) return;
      ran.current = true;
      const t0 = performance.now();
      const tick = now => {
        const p = Math.min((now - t0) / 900, 1);
        setN(Math.round((1 - (1-p)**3) * tgt));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (el.classList.contains("on")) { run(); return; }
    const obs = new MutationObserver(() => { if (el.classList.contains("on")) run(); });
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [parentRef, tgt]); // eslint-disable-line react-hooks/exhaustive-deps
  const display = n === null ? str : n.toLocaleString() + sfx;
  return (
    <div className="rv-item stat-card" style={{textAlign:"center",padding:"16px 12px",background:"var(--sf)",
      border:"1px solid var(--bd)",borderRadius:10}}>
      <div style={{fontSize:22,fontWeight:700,color:"var(--ac)",
        fontFamily:"'DM Mono',monospace",marginBottom:4,letterSpacing:"-.02em"}}>{display}</div>
      <div style={{fontSize:11,color:"var(--tm)",lineHeight:1.4}}>{label}</div>
    </div>
  );
}

/* ── useReveal — anima sección al entrar en viewport ────────────────────── */
function useReveal(threshold=0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
      el.classList.add('on'); return;
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('on'); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

/* ── Tool Page (hash routing + SEO) ─────────────────────────────────────── */
function ToolPage({ tool, showToast, bumpCount, addToHistory, checkLimits, onBack, preloadedFile=null, onGoToTool=null, TOOLS=[] }) {
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
  // Herramientas relacionadas: misma categoría, excluye la actual
  const related = (() => {
    const cat = MENU_CATS.find(c => c.ids.includes(tool.id));
    if (!cat) return [];
    return cat.ids
      .filter(id => id !== tool.id)
      .map(id => TOOLS.find(t => t.id === id))
      .filter(Boolean)
      .slice(0, 4);
  })();

  const shareUrl = `${window.location.origin}/${tool.id}`;
  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Enlace copiado', 'ok');
    }).catch(() => {
      showToast('No se pudo copiar', 'err');
    });
  };

  return (
    <div className="tool-page-enter" style={{minHeight:"100vh"}}>
      {/* Cabecera de navegación */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={onBack} className="nl"
          style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:13,color:"var(--t2)",minHeight:44,padding:"0 4px"}}>
          <span style={{display:"inline-flex",transform:"rotate(90deg)"}}><Ic n="chevron" s={14} c="var(--t2)"/></span>
          morf
        </button>
        {/* Botón compartir */}
        <button onClick={handleShare} className="bg"
          style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,padding:"5px 11px",height:32}}
          title={`Copiar enlace: ${shareUrl}`}>
          <Ic n="share" s={13} c="var(--t2)"/>
          <span className="m-nav-labels">Compartir</span>
        </button>
      </div>

      {/* Banner de la herramienta — coloreado con su categoría */}
      <div className={TOOL_COLOR[tool.id]||"tc-gray"}
        style={{background:"var(--ti-bg)",borderBottom:"1px solid var(--bd)"}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"28px 20px 36px",textAlign:"center"}}>
          <div className="tool-banner-icon" style={{width:66,height:66,borderRadius:18,background:"var(--sf)",
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",
            border:"1px solid rgba(0,0,0,.06)",boxShadow:"0 2px 16px rgba(0,0,0,.08)"}}>
            <Ic n={tool.icon} s={28} c="var(--ti-ic)"/>
          </div>
          <h1 style={{fontSize:"clamp(22px,4vw,36px)",fontWeight:700,letterSpacing:"-.02em",marginBottom:8}}>{tool.label}</h1>
          <p style={{fontSize:15,color:"var(--t2)",maxWidth:440,margin:"0 auto 14px",lineHeight:1.7}}>{tool.desc}</p>
          {/* Tags de formato */}
          <div style={{display:"flex",gap:6,justifyContent:"center",alignItems:"center"}}>
            <Tag type={tool.from}/>
            <Ic n="arrow" s={14} c="var(--tm)"/>
            <Tag type={tool.to}/>
            {tool.pro&&<span style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",
              background:"var(--ac)",color:"#fff",borderRadius:3,padding:"2px 6px",letterSpacing:".04em"}}>PRO</span>}
          </div>
        </div>
      </div>

      {/* Panel principal */}
      <div style={{maxWidth:560,margin:"0 auto",padding:"0 20px 32px"}}>
        <Panel tool={tool} onClose={onBack} showToast={showToast}
          bumpCount={bumpCount} addToHistory={addToHistory} checkLimits={checkLimits}
          preloadedFile={preloadedFile} onGoToTool={onGoToTool}/>
      </div>

      {/* Anuncio */}
      <div style={{maxWidth:560,margin:"0 auto",padding:"0 20px 32px"}}>
        <AdUnit slot="5009358755" style={{minHeight:90}}/>
      </div>

      {/* Herramientas relacionadas */}
      {related.length > 0 && (
        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 48px"}}>
          <div style={{borderTop:"1px solid var(--bd)",paddingTop:28}}>
            <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:"var(--t2)",letterSpacing:"-.01em"}}>
              Herramientas relacionadas
            </h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
              {related.map((t,i)=>(
                <ToolCard key={t.id} t={t} i={i} goToTool={onGoToTool||onBack}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Highlight matching text in search results ───────────────────────────── */
function Highlight({ text, query }) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark className="srch-hl">{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

/* ── ToolCard ────────────────────────────────────────────────────────────── */
const ToolCard = memo(function ToolCard({ t, i, goToTool, query="" }) {
  const tc = TOOL_COLOR[t.id] || "tc-gray";
  return (
    <div className={`card fu fu${(i%6)+1} ${tc}`}
      role="button" tabIndex={0}
      aria-label={t.label}
      style={{opacity:t.comingSoon?.6:1}}
      onClick={()=>goToTool(t)}
      onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();goToTool(t);}}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
        <div className="card-icon" style={{width:36,height:36,borderRadius:9,background:"var(--ti-bg)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Ic n={t.icon} s={16} c="var(--ti-ic)"/>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {t.pro&&<span style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",background:"var(--ac)",color:"#fff",borderRadius:3,padding:"1px 5px",letterSpacing:".04em"}}>PRO</span>}
          {t.comingSoon&&<span style={{fontSize:9,fontWeight:600,fontFamily:"'DM Mono',monospace",background:"var(--al)",color:"var(--ac)",borderRadius:3,padding:"1px 5px"}}>SOON</span>}
          <Tag type={t.from}/><span style={{color:"var(--tm)",fontSize:10}}>→</span><Tag type={t.to}/>
        </div>
      </div>
      <div style={{fontWeight:600,fontSize:13,marginBottom:4}}><Highlight text={t.label} query={query}/></div>
      <div className="m-card-desc" style={{fontSize:11,color:"var(--t2)",lineHeight:1.5}}><Highlight text={t.desc} query={query}/></div>
    </div>
  );
});

/* ── Tools Menu Overlay (pantalla completa, estilo lista) ────────────────── */
const MENU_CATS = [
  {key:"cat_conv", color:"#2563EB", ids:["pdf-word","word-pdf","excel-pdf","pptx-pdf","pdf-pptx","pdf-excel","pdf-img","html-pdf"]},
  {key:"cat_img",  color:"#10B981", ids:["img-pdf","png-jpg","jpg-png"]},
  {key:"cat_ops",  color:"#EF4444", ids:["merge","split","compress","rotate","organize-pdf","delete-pages","repair-pdf","flatten-pdf"]},
  {key:"cat_edit", color:"#D97706", ids:["watermark-pdf","number-pages","crop-pdf","grayscale-pdf","sign-pdf","annotate-pdf","visual-annotate","redact-pdf"]},
  {key:"cat_sec",  color:"#0D9488", ids:["unlock-pdf","protect-pdf","ocr-pdf","ocr-searchable","chat-pdf","summarize-pdf","compare-pdf","pdf-markdown"]},
];

/* Item de lista (estilo iLovePDF) */
const ToolListItem = memo(function ToolListItem({ t, goToTool, last=false }) {
  const tc = TOOL_COLOR[t.id] || "tc-gray";
  return (
    <div className={`tli ${tc}`}
      role="button" tabIndex={0}
      aria-label={t.label}
      onClick={()=>!t.comingSoon&&goToTool(t)}
      onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&!t.comingSoon){e.preventDefault();goToTool(t);}}}
      style={{display:"flex",alignItems:"center",gap:14,padding:"13px 20px",
        cursor:t.comingSoon?"default":"pointer",opacity:t.comingSoon?.55:1,
        borderBottom:last?"none":"1px solid var(--bd)",transition:"background .1s",
        userSelect:"none"}}>
      <div style={{width:42,height:42,borderRadius:11,background:"var(--ti-bg)",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ic n={t.icon} s={19} c="var(--ti-ic)"/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:15,color:"var(--t1)",lineHeight:1.2}}>{t.label}</div>
        {t.comingSoon&&<span style={{fontSize:10,color:"var(--ac)",fontFamily:"'DM Mono',monospace"}}>SOON</span>}
      </div>
      <Ic n="arrow" s={14} c="var(--tm)"/>
    </div>
  );
});

function ToolsMenuOverlay({ TOOLS, goToTool, T, onClose }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const q = search.trim().toLowerCase();
  const hits = q ? TOOLS.filter(t =>
    t.label.toLowerCase().includes(q) ||
    (t.desc||"").toLowerCase().includes(q) ||
    t.from.toLowerCase().includes(q) ||
    t.to.toLowerCase().includes(q)
  ) : null;

  const open = t2 => { goToTool(t2); onClose(); };

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"var(--bg)",
      display:"flex",flexDirection:"column",animation:"fo .18s ease both"}}>

      {/* Barra superior: buscador + botón cerrar */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",
        background:"var(--sf)",borderBottom:"1px solid var(--bd)",flexShrink:0}}>
        {/* Buscador */}
        <div style={{flex:1,position:"relative"}}>
          <Ic n="search" s={14} c="var(--tm)"
            style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
          <input ref={inputRef} value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={T.search_ph} type="search" autoComplete="off"
            style={{width:"100%",padding:"9px 34px 9px 34px",border:"1px solid var(--bd)",
              borderRadius:10,background:"var(--bg)",fontSize:14,color:"var(--t1)",
              outline:"none",fontFamily:"'DM Sans',sans-serif",transition:"border-color .15s",boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor="var(--ac)"}
            onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
          {search&&(
            <button onClick={()=>setSearch("")}
              style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}>
              <Ic n="x" s={13} c="var(--tm)"/>
            </button>
          )}
        </div>
        {/* Cerrar */}
        <button onClick={onClose} aria-label="Cerrar"
          style={{width:38,height:38,borderRadius:10,border:"1px solid var(--bd)",
            background:"var(--al)",cursor:"pointer",display:"flex",alignItems:"center",
            justifyContent:"center",flexShrink:0,transition:"background .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="var(--bd)"}
          onMouseLeave={e=>e.currentTarget.style.background="var(--al)"}>
          <Ic n="x" s={16} c="var(--t1)"/>
        </button>
      </div>

      {/* Cuerpo — lista scrollable */}
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{maxWidth:640,margin:"0 auto",paddingBottom:48}}>
          {hits ? (
            hits.length > 0 ? (
              <div>
                {hits.map((t,i)=>(
                  <ToolListItem key={t.id} t={t} goToTool={open} last={i===hits.length-1}/>
                ))}
              </div>
            ) : (
              <div style={{textAlign:"center",padding:"64px 20px",color:"var(--tm)",fontSize:13}}>
                No se encontraron herramientas para «{search}»
              </div>
            )
          ) : (
            MENU_CATS.map(({key,ids})=>{
              const tools = ids.map(id=>TOOLS.find(t=>t.id===id)).filter(Boolean);
              if (!tools.length) return null;
              return (
                <div key={key}>
                  {/* Cabecera de categoría */}
                  <div style={{padding:"20px 20px 6px",fontSize:11,fontWeight:700,
                    letterSpacing:".1em",textTransform:"uppercase",color:"var(--tm)"}}>
                    {T[key]}
                  </div>
                  {/* Items */}
                  {tools.map((t,i)=>(
                    <ToolListItem key={t.id} t={t} goToTool={open} last={i===tools.length-1}/>
                  ))}
                  <div style={{height:8,background:"var(--bg)"}}/>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── History Section ────────────────────────────────────────────────────── */
function HistorySection({ history, clearHistory, T, goToTool, TOOLS }) {
  const [filter, setFilter] = useState(null); // null = todos
  const locale = T.code==="en"?"en-GB":T.code==="de"?"de-DE":T.code==="fr"?"fr-FR":T.code==="pt"?"pt-PT":"es-ES";

  // Herramientas únicas que aparecen en el historial
  const tools = [...new Set(history.map(h=>h.tool))];

  const visible = filter ? history.filter(h=>h.tool===filter) : history;

  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 48px"}}>
      <div style={{borderTop:"1px solid var(--bd)",paddingTop:32}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="download" s={14} c="var(--t2)"/>
            <span style={{fontWeight:600,fontSize:13}}>{T.hist_title}</span>
          </div>
          <button className="nl" style={{fontSize:11,color:"var(--tm)"}} onClick={clearHistory}>{T.hist_clear}</button>
        </div>
        {/* Filtros por herramienta */}
        {tools.length > 1 && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            <button onClick={()=>setFilter(null)}
              style={{fontSize:10,padding:"3px 9px",borderRadius:20,border:"1px solid",cursor:"pointer",fontFamily:"'DM Mono',monospace",
                background:!filter?"var(--ac)":"transparent",
                color:!filter?"#fff":"var(--tm)",
                borderColor:!filter?"var(--ac)":"var(--bd)"}}>
              Todo
            </button>
            {tools.map(tool=>(
              <button key={tool} onClick={()=>setFilter(f=>f===tool?null:tool)}
                style={{fontSize:10,padding:"3px 9px",borderRadius:20,border:"1px solid",cursor:"pointer",fontFamily:"'DM Mono',monospace",
                  background:filter===tool?"var(--ac)":"transparent",
                  color:filter===tool?"#fff":"var(--tm)",
                  borderColor:filter===tool?"var(--ac)":"var(--bd)"}}>
                {tool}
              </button>
            ))}
          </div>
        )}
        {/* Lista */}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {visible.map((h,i)=>{
            const d = new Date(h.date);
            const dateStr = d.toLocaleDateString(locale,{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
            const tool = TOOLS?.find(x=>x.id===h.toolId);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:8,
                animation:`fu .2s ease ${i*0.04}s both`,cursor:tool?"pointer":"default"}}
                onClick={()=>tool&&goToTool(tool)}
                role={tool?"button":undefined}
                title={tool?"Abrir herramienta":undefined}>
                <Ic n="file" s={13} c="var(--tm)" style={{flexShrink:0}}/>
                <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--t1)"}}>{h.filename}</span>
                <span style={{fontSize:11,color:"var(--ac)",fontWeight:500,flexShrink:0,
                  background:"var(--al)",padding:"2px 7px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>
                  {h.tool}
                </span>
                <span className="m-hist-date" style={{fontSize:10,color:"var(--tm)",flexShrink:0}}>{dateStr}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Scroll-to-top FAB ──────────────────────────────────────────────────── */
function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', h, {passive:true});
    return () => window.removeEventListener('scroll', h);
  }, []);
  if (!show) return null;
  return (
    <button className="scroll-top" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}
      aria-label="Volver arriba">
      <div style={{display:'flex',transform:'rotate(180deg)'}}>
        <Ic n="chevron" s={16} c="#fff"/>
      </div>
    </button>
  );
}

/* ── App ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang]       = useState(detectLang);
  const [toolPage, setToolPage] = useState(() => {
    // Support both pathname (/compress) and legacy hash (#compress)
    const path = window.location.pathname.replace(/^\//, '') ||
                 window.location.hash.replace(/^#\/?/, '');
    return TOOL_BASE.find(t => t.id === path) || null;
  });
  const [modal, setModal]     = useState(null);
  const [toast, setToast]     = useState(null);
  const [globalDrag, setGlobalDrag] = useState(false);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('morf-dark');
    if (saved !== null) return saved === '1';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', h, {passive:true});
    return () => window.removeEventListener('scroll', h);
  }, []);

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
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [preloadedFile, setPreloadedFile] = useState(null);
  const [dropCandidates, setDropCandidates] = useState(null); // {file, tools[]}
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('morf-onboarded'));
  const [pwaPrompt, setPwaPrompt] = useState(null); // beforeinstallprompt event
  const searchInputRef = useRef(null);
  // Scroll-reveal refs para las secciones de la landing
  const rvStats    = useReveal(0.1);
  const rvHow      = useReveal(0.1);
  const rvFeatures = useReveal(0.08);
  const rvPricing  = useReveal(0.08);
  const rvFaq      = useReveal(0.08);

  useEffect(() => {
    document.body.style.background = dark ? '#0F1117' : '#F9F9F8';
  }, [dark]);

  // Captura el evento de instalación PWA
  useEffect(() => {
    const handler = e => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname.replace(/^\//, '') ||
                   window.location.hash.replace(/^#\/?/, '');
      setToolPage(path ? (TOOL_BASE.find(t => t.id === path) || null) : null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const T = LANGS[lang];
  const showToast = (msg, type="ok") => setToast({msg,type});
  // Build tools with translated labels
  const TOOLS = TOOL_BASE.map((t,i) => ({ ...t, ...T.t[i] }));
  const dismissOnboarding = () => {
    if (showOnboarding) { setShowOnboarding(false); localStorage.setItem('morf-onboarded','1'); }
  };
  const goToTool = (t, preFile=null) => {
    dismissOnboarding();
    if (t.comingSoon) { showToast(T.coming_soon_toast||"¡Próximamente! Estamos trabajando en esta herramienta.","ok"); return; }
    window.history.pushState(null, '', `/${t.id}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setToolPage(t);
    setPreloadedFile(preFile || null);
  };

  // Ctrl+V / Cmd+V → paste file from clipboard (home only)
  useEffect(() => {
    const h = e => {
      if (toolPage) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // Try clipboard files first, then image items
      let file = e.clipboardData?.files?.[0];
      if (!file) {
        const imgItem = Array.from(e.clipboardData?.items||[]).find(i=>i.type.startsWith("image/"));
        if (imgItem) {
          const blob = imgItem.getAsFile();
          if (blob) file = new File([blob], `imagen-portapapeles.${imgItem.type.split("/")[1]||"png"}`, {type:imgItem.type});
        }
      }
      if (!file) return;
      e.preventDefault();
      const ext  = "."+file.name.split(".").pop().toLowerCase();
      const mime = file.type.toLowerCase();
      if (ext===".odt"||mime==="application/vnd.oasis.opendocument.text"){showToast(T.err_odt,"err");return;}
      const compatible = TOOLS.filter(t=>
        !t.comingSoon&&(
          (t.accepts||[]).some(a=>ext===a||ext==="."+a.replace(/^\./,""))||
          (t.mimeTypes||[]).includes(mime)
        )
      );
      if (!compatible.length){showToast(T.unknown_fmt,"err");return;}
      if (compatible.length===1){goToTool(compatible[0],file);return;}
      setDropCandidates({file,tools:compatible});
    };
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  }, [toolPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+K / Cmd+K → focus search
  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey||e.metaKey) && e.key==='k') {
        e.preventDefault();
        if (toolPage) return;
        document.getElementById('tools')?.scrollIntoView({behavior:'smooth'});
        setTimeout(() => { searchInputRef.current?.focus(); }, 380);
      }
      if (e.key==='Escape') { setDropCandidates(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [toolPage]);

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

  const heroDrop = e => {
    e.preventDefault(); setGlobalDrag(false);
    if (fullToolPage) return; // let Panel handle its own drops
    dismissOnboarding();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = "."+file.name.split(".").pop().toLowerCase();
    const mime = file.type.toLowerCase();
    if (ext === ".odt" || mime === "application/vnd.oasis.opendocument.text") {
      showToast(T.err_odt,"err"); return;
    }
    const compatible = TOOLS.filter(t =>
      !t.comingSoon && (
        (t.accepts||[]).some(a => ext === a || ext === "."+a.replace(/^\./,"")) ||
        (t.mimeTypes||[]).includes(mime)
      )
    );
    if (!compatible.length) { showToast(T.unknown_fmt,"err"); return; }
    if (compatible.length === 1) { goToTool(compatible[0], file); return; }
    setDropCandidates({ file, tools: compatible });
  };

  const modalCfg = {
    privacy:{ title:T.modal_privacy, icon:"shield" },
    terms:  { title:T.modal_terms,   icon:"file"   },
    contact:{ title:T.modal_contact, icon:"mail"   },
    api:    { title:T.modal_api,     icon:"code"   },
  };

  const backHome = () => {
    window.history.pushState(null, '', '/');
    setToolPage(null);
    setPreloadedFile(null);
  };
  const fullToolPage = toolPage ? TOOLS.find(t => t.id === toolPage.id) || toolPage : null;

  return (
    <LangCtx.Provider value={T}>
      <div className={`m${dark?" dark":""}${globalDrag?" global-drag":""}`}
        onDragOver={e=>{e.preventDefault();setGlobalDrag(true)}}
        onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setGlobalDrag(false)}}
        onDrop={heroDrop}
        onTouchStart={()=>{}}>
        <style>{css}</style>

        {/* Tool page (hash routing) */}
        {fullToolPage&&(
          <ToolPage tool={fullToolPage} showToast={showToast}
            bumpCount={bumpCount} addToHistory={addToHistory} checkLimits={checkLimits}
            onBack={backHome} preloadedFile={preloadedFile} onGoToTool={goToTool}
            TOOLS={TOOLS}/>
        )}

        {/* Main app — hidden (not unmounted) when tool page is active */}
        <div style={{display:fullToolPage?'none':'block'}}>

        {/* Header */}
        <header style={{
          borderBottom:"1px solid var(--bd)",
          background:dark?"rgba(15,17,23,.88)":"rgba(255,255,255,.88)",
          backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
          position:"sticky",top:0,zIndex:100,
          boxShadow:scrolled?"0 2px 20px rgba(0,0,0,.07)":"none",
          transition:"box-shadow .25s"}}>
          <div className="m-header-inner" style={{maxWidth:960,margin:"0 auto",padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            {/* Hamburger — solo visible en móvil, a la izquierda */}
            <button className="m-hamburger" onClick={()=>setShowToolsMenu(true)}
              aria-label="Ver todas las herramientas"
              style={{display:"none",background:"none",border:"none",padding:"4px",
                cursor:"pointer",borderRadius:6,marginRight:4,alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4"  width="16" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="9"  width="16" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
            <button onClick={backHome}
              style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",alignItems:"center"}}>
              <span className="m-logo-text" style={{fontWeight:700,fontSize:15,letterSpacing:"-.03em",color:"var(--t1)"}}>morf<span style={{fontWeight:300,color:"var(--ac)"}}>.</span><span style={{fontWeight:400,color:"var(--ac)"}}>pdf</span></span>
            </button>
            <nav aria-label="Menú principal" style={{display:"flex",gap:8,alignItems:"center"}}>
              {/* Todas las herramientas — oculto en móvil (reemplazado por el hamburger) */}
              <button className="m-tools-nav-btn" onClick={()=>setShowToolsMenu(true)}
                aria-label="Ver todas las herramientas"
                style={{display:"inline-flex",alignItems:"center",gap:6,height:32,
                  background:"var(--al)",border:"1px solid var(--bd)",
                  borderRadius:7,padding:"0 11px",cursor:"pointer",
                  fontSize:12,color:"var(--ac)",fontFamily:"'DM Sans',sans-serif",
                  fontWeight:500,transition:"border-color .16s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ac)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bd)"}>
                <Ic n="grid" s={13} c="var(--ac)"/>
                <span className="m-nav-labels">Herramientas</span>
              </button>

              {/* Text links — hidden on mobile */}
              <div className="m-nav-labels" style={{display:"flex",gap:4,alignItems:"center"}}>
                <button className="nl" style={{height:32,padding:"0 8px",display:"flex",alignItems:"center"}}
                  onClick={()=>setModal("privacy")}>{T.nav_privacy}</button>
                <button className="nl" style={{height:32,padding:"0 8px",display:"flex",alignItems:"center"}}
                  onClick={()=>setModal("api")}>{T.nav_api}</button>
                <button className="nl" style={{height:32,padding:"0 8px",display:"flex",alignItems:"center"}}
                  onClick={()=>setModal("contact")}>{T.nav_help}</button>
              </div>

              {/* Icon buttons */}
              <button onClick={()=>setDark(d=>{ const n=!d; localStorage.setItem('morf-dark',n?'1':'0'); return n; })}
                aria-label={dark?"Modo claro":"Modo oscuro"}
                aria-pressed={dark}
                title={dark?"Modo claro":"Modo oscuro"}
                style={{background:"transparent",border:"1px solid var(--bd)",borderRadius:6,
                  width:32,height:32,cursor:"pointer",color:"var(--t2)",display:"flex",
                  alignItems:"center",justifyContent:"center",transition:"border-color .16s",flexShrink:0}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--bh)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bd)"}>
                <span key={dark} className="dark-icon" style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic n={dark?"sun":"moon"} s={14} c="var(--t2)" aria-hidden="true"/>
                </span>
              </button>
              <LangPicker lang={lang} setLang={setLang}/>
              {(supabase && user) ? (
                <div ref={userMenuRef} style={{position:"relative"}}>
                  <button
                    onClick={()=>setUserMenuOpen(o=>!o)}
                    title={user.email}
                    style={{display:"inline-flex",alignItems:"center",gap:5,height:32,
                      background:"var(--al)",border:"1px solid var(--ac)",
                      borderRadius:6,padding:"0 9px",cursor:"pointer",
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
                  style={{display:"inline-flex",alignItems:"center",gap:5,height:32,
                    background:"transparent",border:"1px solid var(--bd)",
                    borderRadius:6,padding:"0 9px",cursor:"pointer",
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

        <div className="m-hero-wrap" style={{position:"relative",overflow:"hidden"}}>
          {/* Floating format pills */}
          {[
            {label:"PDF",  bg:"#FEE2E2", color:"#991B1B", bd:"#FECACA", x:"7%",  y:"18%", dur:"4.8s", delay:"0s",   rot:"-6deg"},
            {label:"DOCX", bg:"#DBEAFE", color:"#1E40AF", bd:"#BFDBFE", x:"89%", y:"14%", dur:"5.2s", delay:".7s",  rot:"5deg"},
            {label:"JPG",  bg:"#D1FAE5", color:"#065F46", bd:"#A7F3D0", x:"4%",  y:"65%", dur:"4.4s", delay:"1.1s", rot:"-4deg"},
            {label:"XLSX", bg:"#D1FAE5", color:"#14532D", bd:"#6EE7B7", x:"92%", y:"60%", dur:"5.6s", delay:".3s",  rot:"7deg"},
            {label:"PNG",  bg:"#EDE9FE", color:"#5B21B6", bd:"#DDD6FE", x:"13%", y:"82%", dur:"4.1s", delay:"1.6s", rot:"-8deg"},
            {label:"PPTX", bg:"#FFEDD5", color:"#9A3412", bd:"#FED7AA", x:"83%", y:"80%", dur:"5.0s", delay:".5s",  rot:"4deg"},
          ].map(p=>(
            <div key={p.label} className="hero-pill" style={{
              left:p.x, top:p.y, background:p.bg, color:p.color, borderColor:p.bd,
              "--dur":p.dur, "--delay":p.delay, "--rot":p.rot,
            }}>{p.label}</div>
          ))}
        <div className="m-hero" style={{maxWidth:960,margin:"0 auto",padding:"48px 20px 64px"}}>
          {/* Hero */}
          <div className="hero-seq" style={{textAlign:"center",marginBottom:44}}>
            {/* Badge */}
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:20,padding:"3px 11px 3px 7px",fontSize:11,color:"var(--tm)",marginBottom:24,fontFamily:"'DM Mono',monospace"}}>
              <span className="hero-dot" style={{width:6,height:6,borderRadius:"50%",background:"#22C55E",display:"inline-block"}}/>
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
            <button className="bp m-hero-cta" onClick={()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"})}
              style={{fontSize:14,padding:"12px 28px",borderRadius:8,gap:8,marginBottom:20}}>
              <Ic n="zap" s={15} c="#fff"/>
              {T.hero_cta}
            </button>

            {/* Trust badges */}
            <div style={{display:"flex",gap:18,justifyContent:"center",flexWrap:"wrap",marginTop:18,marginBottom:count>0?8:0}}>
              {[[T.trust_browser,"lock"],[T.trust_noreg,"check"],[T.trust_free,"zap"]].map(([label,icon])=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--tm)"}}>
                  <Ic n={icon} s={11} c="var(--ok)"/>
                  {label}
                </div>
              ))}
            </div>
            {count>0&&(
              <div style={{fontSize:12,color:"var(--tm)",fontFamily:"'DM Mono',monospace"}}>
                <span>{count.toLocaleString()}</span> {T.counter}
              </div>
            )}

          </div>

          {/* Onboarding hint — primer uso */}
          {showOnboarding && !fullToolPage && (
            <div className="onboarding-banner" style={{
              display:"flex",alignItems:"center",gap:10,background:"var(--al)",
              border:"1px solid var(--ac)",borderRadius:10,padding:"11px 16px",
              marginBottom:24,maxWidth:440,margin:"0 auto 24px"}}>
              <div style={{width:28,height:28,borderRadius:7,background:"var(--ac)",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Ic n="upload" s={13} c="#fff"/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--ac)",marginBottom:1}}>
                  Arrastra un archivo aquí
                </div>
                <div style={{fontSize:11,color:"var(--t2)"}}>
                  O pulsa en cualquier herramienta para empezar
                </div>
              </div>
              <button onClick={()=>{setShowOnboarding(false);localStorage.setItem('morf-onboarded','1');}}
                style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",flexShrink:0}}>
                <Ic n="x" s={13} c="var(--tm)"/>
              </button>
            </div>
          )}

          {/* Stats grid */}
          <div ref={rvStats} className="rv-wrap m-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:48}}>
            {[
              {value:TOOLS.filter(t=>!t.comingSoon).length+"",  label:T.tools_count},
              {value:count>0?count:"1000+",                      label:T.stat_files},
              {value:"<3s",                                      label:T.stat_speed},
              {value:"100%",                                     label:T.stat_priv},
            ].map((s,i)=>(
              <StatCard key={i} value={s.value} label={s.label} parentRef={rvStats}/>
            ))}
          </div>

          {/* Anuncio 1 — tras propuesta de valor */}
          <div style={{marginBottom:48}}>
            <AdUnit slot="9092219780" style={{minHeight:90}}/>
          </div>

          {/* Cómo funciona */}
          <div style={{marginBottom:48}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div className="eyebrow-bar"/>
              <h2 style={{fontSize:17,fontWeight:600,letterSpacing:"-.02em",marginBottom:6}}>{T.how_title}</h2>
              <p style={{fontSize:13,color:"var(--tm)",maxWidth:440,margin:"0 auto"}}>{T.how_sub}</p>
            </div>
            <div ref={rvHow} className="m-how-grid rv-wrap" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:2,position:"relative"}}>
              {T.how_steps.map(([title,desc],i)=>(
                <div key={i} className="m-how-step rv-item" style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",
                  padding:"24px 20px",background:"var(--sf)",border:"1px solid var(--bd)",
                  borderRadius:i===0?"10px 0 0 10px":i===2?"0 10px 10px 0":"0",
                  position:"relative"}}>
                  <div className="how-step-num" style={{width:36,height:36,borderRadius:"50%",
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
                    <div className="m-how-arrow" style={{position:"absolute",right:-12,top:"50%",transform:"translateY(-50%)",
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
                <div className="eyebrow-bar"/>
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
                    <div key={i} className="m-hist-item" style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center"}}>
                      <div style={{padding:"11px 13px",background:"var(--sf)",border:"1px solid var(--bd)",
                        borderRadius:8,display:"flex",alignItems:"center",gap:9,minWidth:0,overflow:"hidden"}}>
                        <Ic n="file" s={15} c="var(--tm)" style={{flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",
                            whiteSpace:"nowrap"}}>{h.filename}</div>
                          <div style={{fontSize:10,color:"var(--tm)",fontFamily:"'DM Mono',monospace"}}>{h.tool}</div>
                        </div>
                      </div>
                      <div className="m-hist-arrow" style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
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
            {/* Header + search */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:600}}>{T.tools_title} <span style={{fontWeight:400,color:"var(--tm)",fontFamily:"'DM Mono',monospace",fontSize:11}}>{TOOLS.filter(t=>!t.comingSoon).length} {T.tools_count}</span></span>
              <div style={{position:"relative",flex:"1 1 180px",maxWidth:260}}>
                <Ic n="search" s={13} c="var(--tm)" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                <input
                  ref={searchInputRef}
                  value={toolSearch}
                  onChange={e=>setToolSearch(e.target.value)}
                  placeholder={T.search_ph}
                  className="m-search-inp"
                  style={{width:"100%",padding:"7px 52px 7px 28px",border:"1px solid var(--bd)",borderRadius:7,
                    background:"var(--sf)",fontSize:12,color:"var(--t1)",outline:"none",
                    fontFamily:"'DM Sans',sans-serif",transition:"border-color .15s"}}
                  onFocus={e=>e.target.style.borderColor="var(--ac)"}
                  onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                {toolSearch ? (
                  <button onClick={()=>setToolSearch("")}
                    style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",
                      background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center"}}>
                    <Ic n="x" s={12} c="var(--tm)"/>
                  </button>
                ) : (
                  <span className="m-ctrl-k" style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",
                    fontSize:9,fontFamily:"'DM Mono',monospace",color:"var(--tm)",background:"var(--bd)",
                    padding:"2px 4px",borderRadius:3,pointerEvents:"none"}}>
                    Ctrl K
                  </span>
                )}
              </div>
            </div>

            {/* Recent tools row */}
            {!toolSearch.trim() && history.length > 0 && (()=>{
              const seen = new Set();
              const recent = history
                .map(h => TOOLS.find(t => t.label === h.tool))
                .filter(t => t && !t.comingSoon && !seen.has(t.id) && seen.add(t.id))
                .slice(0, 4);
              if (!recent.length) return null;
              return (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
                  <span style={{fontSize:11,color:"var(--tm)",flexShrink:0}}>{T.hist_title||"Recientes"}:</span>
                  {recent.map(t=>(
                    <button key={t.id} onClick={()=>goToTool(t)}
                      style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",
                        border:"1px solid var(--bd)",borderRadius:20,background:"var(--sf)",
                        cursor:"pointer",fontSize:11,color:"var(--t2)",
                        fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="var(--al)";e.currentTarget.style.borderColor="var(--ac)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="var(--sf)";e.currentTarget.style.borderColor="var(--bd)";}}>
                      <Ic n={t.icon} s={11} c="var(--ac)"/>
                      {t.label}
                    </button>
                  ))}
                </div>
              );
            })()}

            {toolSearch.trim() ? (
              /* ── Resultados de búsqueda ── */
              (()=>{
                const q = toolSearch.trim().toLowerCase();
                const hits = TOOLS.filter(t=>
                  t.label.toLowerCase().includes(q) ||
                  t.desc.toLowerCase().includes(q) ||
                  t.from.toLowerCase().includes(q) ||
                  t.to.toLowerCase().includes(q)
                );
                return hits.length > 0 ? (
                  <div className="grid fu" style={{marginBottom:14}}>
                    {hits.map((t,i)=>(
                      <ToolCard key={t.id} t={t} i={i} goToTool={goToTool} query={toolSearch.trim()}/>
                    ))}
                  </div>
                ) : (
                  <div style={{textAlign:"center",padding:"32px 0",color:"var(--tm)",fontSize:13}}>
                    No se encontraron herramientas para «{toolSearch}»
                  </div>
                );
              })()
            ) : (
              /* ── Vista por categorías ── */
              <>
                {[
                  {key:"cat_conv", ids:["pdf-word","word-pdf","excel-pdf","pptx-pdf","pdf-pptx","pdf-excel","pdf-img"]},
                  {key:"cat_img",  ids:["img-pdf","png-jpg","jpg-png"]},
                  {key:"cat_ops",  ids:["merge","split","compress","rotate","organize-pdf","delete-pages"]},
                  {key:"cat_edit", ids:["watermark-pdf","number-pages","crop-pdf","grayscale-pdf","sign-pdf"]},
                  {key:"cat_sec",  ids:["unlock-pdf","ocr-pdf","protect-pdf"]},
                ].map(({key,ids})=>{
                  const catTools = ids.map(id=>TOOLS.find(t=>t.id===id)).filter(Boolean);
                  if (!catTools.length) return null;
                  const visible = showAllTools ? catTools : catTools.filter(t=>!t.comingSoon);
                  if (!visible.length) return null;
                  return (
                    <div key={key} style={{marginBottom:22}}>
                      <div style={{marginBottom:10,paddingLeft:2}}>
                        <span style={{
                          display:"inline-flex",alignItems:"center",gap:5,
                          padding:"3px 10px 3px 8px",borderRadius:20,
                          border:CAT_DOT_COLOR[key]?`1px solid ${CAT_DOT_COLOR[key]}33`:"1px solid var(--bd)",
                          background:CAT_DOT_COLOR[key]?`${CAT_DOT_COLOR[key]}12`:"transparent",
                          fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",
                          fontFamily:"'DM Mono',monospace",
                          color:CAT_DOT_COLOR[key]||"var(--tm)"}}>
                          <span style={{width:5,height:5,borderRadius:"50%",
                            background:CAT_DOT_COLOR[key]||"var(--tm)",flexShrink:0}}/>
                          {T[key]}
                        </span>
                      </div>
                      <div className="grid">
                        {visible.map((t,i)=>(
                          <ToolCard key={t.id} t={t} i={i} goToTool={goToTool}/>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button className="bg"
                  onClick={()=>setShowAllTools(s=>!s)}
                  style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,marginTop:10,padding:"7px 14px"}}>
                  <span style={{display:"inline-flex",transform:showAllTools?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>
                    <Ic n="chevron" s={12} c="var(--t2)"/>
                  </span>
                  {showAllTools ? T.tools_less : T.tools_more}
                </button>
              </>
            )}
          </div>

          {/* Anuncio 2 — tras herramientas */}
          <AdUnit slot="4442528333" style={{marginTop:32,minHeight:90}}/>

          {/* Features */}
          <div ref={rvFeatures} className="rv-wrap m-feat" style={{borderTop:"1px solid var(--bd)",marginTop:48,paddingTop:36,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:20}}>
            {T.feat.map(([title,desc],i)=>(
              <div key={i} className="rv-item" style={{display:"flex",gap:11,alignItems:"flex-start"}}>
                <div className="feat-icon" style={{width:30,height:30,borderRadius:7,
                  background:["#DBEAFE","#D1FAE5","#ECFDF5","#EDE9FE"][i],
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Ic n={["file","check","download","compress"][i]} s={14}
                    c={["#2563EB","#059669","#10B981","#7C3AED"][i]}/>
                </div>
                <div>
                  <div style={{fontWeight:500,fontSize:12,marginBottom:1}}>{title}</div>
                  <div style={{fontSize:11,color:"var(--tm)",lineHeight:1.5}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>{/* /m-hero-wrap */}

        {/* Pricing — banda de fondo */}
        <div style={{background:"var(--sf)",borderTop:"1px solid var(--bd)",borderBottom:"1px solid var(--bd)"}}>
        <div ref={rvPricing} className="rv" style={{maxWidth:960,margin:"0 auto",padding:"36px 20px 48px"}}>
          <div>
            <div className="eyebrow-bar"/>
            <h2 style={{fontSize:18,fontWeight:600,letterSpacing:"-.02em",marginBottom:6,textAlign:"center"}}>{T.pricing_title}</h2>
            <p style={{fontSize:13,color:"var(--tm)",textAlign:"center",marginBottom:24}}>{T.pricing_sub}</p>

            {/* Billing segmented control */}
            <div style={{display:"flex",justifyContent:"center",marginBottom:28}}>
              <div className="seg-ctrl">
                <button className={`seg-btn${!billingYear?" active":""}`}
                  onClick={()=>setBillingYear(false)}>
                  Mensual
                </button>
                <button className={`seg-btn${billingYear?" active":""}`}
                  onClick={()=>setBillingYear(true)}>
                  Anual&nbsp;<span style={{fontSize:9,background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:3,fontWeight:700,verticalAlign:"middle"}}>{T.plan_save}</span>
                </button>
              </div>
            </div>

            {/* Plan cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16,maxWidth:560,margin:"0 auto",overflow:"visible"}}>
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
              <div className="pro-card" style={{border:"2px solid var(--ac)",borderRadius:12,padding:"24px 20px",background:"var(--al)",position:"relative",marginTop:12}}>
                <div className="pro-badge-pill" style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",
                  background:"var(--ac)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:10,
                  fontFamily:"'DM Mono',monospace",letterSpacing:".05em",whiteSpace:"nowrap"}}>MÁS POPULAR</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:2,color:"var(--ac)"}}>{T.plan_pro}</div>
                <div style={{fontSize:12,color:"var(--tm)",marginBottom:16}}>{T.plan_pro_desc}</div>
                <div style={{fontSize:32,fontWeight:700,marginBottom:4,color:"var(--ac)"}}>
                  €{billingYear?"4.49":"5.99"}
                </div>
                <div style={{fontSize:11,color:"var(--tm)",marginBottom:billingYear?4:20}}>{T.plan_monthly}{billingYear&&<span style={{color:"var(--ok)",fontWeight:500}}> · {T.plan_save}</span>}</div>
                {billingYear&&<div style={{fontSize:10,color:"var(--tm)",marginBottom:20}}>{T.plan_annual_total}</div>}
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
        </div>{/* /pricing band */}

        {/* FAQ */}
        <div ref={rvFaq} className="rv" style={{maxWidth:960,margin:"0 auto",padding:"0 20px 48px"}}>
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
          <HistorySection history={history} clearHistory={clearHistory} T={T} goToTool={goToTool} TOOLS={TOOLS}/>
        )}

        </div>{/* /Main app */}

        {/* Footer */}
        <footer className="m-footer" style={{display:fullToolPage?'none':'block',background:"var(--sf)"}}>
          <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 20px"}}>
            {/* Top row: brand + columns */}
            <div className="m-footer-grid" style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:32,marginBottom:28}}>
              {/* Brand */}
              <div>
                <div style={{fontSize:14,fontWeight:700,letterSpacing:"-.02em",marginBottom:6}}>
                  morf<span style={{fontWeight:300,color:"var(--ac)"}}>.</span><span style={{fontWeight:400,color:"var(--ac)"}}>pdf</span>
                </div>
                <p style={{fontSize:11,color:"var(--tm)",lineHeight:1.6,maxWidth:200,margin:0}}>
                  {T.hero_sub?.split(".")[0]}.
                </p>
              </div>
              {/* Tools + Company columns — wrapped so mobile CSS can target them as a pair */}
              <div className="m-footer-cols" style={{display:"contents"}}>
                {/* Tools column */}
                <div>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--tm)",marginBottom:10}}>{T.footer_tools}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {["merge","compress","pdf-word","word-pdf","split"].map(id=>{
                      const t = TOOLS.find(x=>x.id===id);
                      return t ? (
                        <button key={id} className="fl" style={{textAlign:"left",fontSize:12}}
                          onClick={()=>goToTool(t)}>{t.label}</button>
                      ) : null;
                    })}
                  </div>
                </div>
                {/* Company column */}
                <div>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--tm)",marginBottom:10}}>{T.footer_company}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <button className="fl" style={{textAlign:"left",fontSize:12}} onClick={()=>setModal("privacy")}>{T.modal_privacy}</button>
                    <button className="fl" style={{textAlign:"left",fontSize:12}} onClick={()=>setModal("terms")}>{T.modal_terms}</button>
                    <button className="fl" style={{textAlign:"left",fontSize:12}} onClick={()=>setModal("contact")}>{T.modal_contact}</button>
                    <button className="fl" style={{textAlign:"left",fontSize:12}} onClick={()=>setModal("api")}>{T.modal_api}</button>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom row: copyright */}
            <div style={{borderTop:"1px solid var(--bd)",paddingTop:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:11,color:"var(--tm)"}}>{T.footer_copy}</span>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <Ic n="lock" s={10} c="var(--ok)"/>
                <span style={{fontSize:10,color:"var(--tm)"}}>{T.privacy_note}</span>
              </div>
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

        {/* PWA install banner */}
        {pwaPrompt&&(
          <div className="pwa-banner" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:190,
            background:"var(--sf)",borderTop:"1px solid var(--bd)",padding:"14px 20px",
            display:"flex",alignItems:"center",gap:12,boxShadow:"0 -4px 20px rgba(0,0,0,.08)"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"var(--al)",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Ic n="zap" s={16} c="var(--ac)"/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>Instala morf en tu dispositivo</div>
              <div style={{fontSize:11,color:"var(--tm)"}}>Acceso rápido sin abrir el navegador</div>
            </div>
            <button className="bp" style={{fontSize:12,padding:"7px 14px",flexShrink:0}}
              onClick={async()=>{
                pwaPrompt.prompt();
                const {outcome} = await pwaPrompt.userChoice;
                if(outcome==='accepted') setPwaPrompt(null);
              }}>
              Instalar
            </button>
            <button onClick={()=>setPwaPrompt(null)}
              style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",flexShrink:0}}>
              <Ic n="x" s={15} c="var(--tm)"/>
            </button>
          </div>
        )}

        <ScrollTop/>

        {/* Tools full-screen menu */}
        {showToolsMenu&&(
          <ToolsMenuOverlay TOOLS={TOOLS} goToTool={goToTool} T={T}
            onClose={()=>setShowToolsMenu(false)}/>
        )}

        {/* Drop overlay — choose tool for dropped file */}
        {dropCandidates&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:300,
            display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
            onClick={()=>setDropCandidates(null)}>
            <div style={{background:"var(--sf)",borderRadius:14,width:"92vw",maxWidth:500,
              border:"1px solid var(--bd)",overflow:"hidden",animation:"fu .22s ease both"}}
              onClick={e=>e.stopPropagation()}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid var(--bd)",
                display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{T.home_drop_title}</div>
                  <div style={{fontSize:11,color:"var(--tm)",display:"flex",alignItems:"center",gap:4}}>
                    <Ic n="file" s={11} c="var(--tm)"/>
                    {dropCandidates.file.name}
                    <span style={{color:"var(--tm)"}}>·</span>
                    {(dropCandidates.file.size/1048576).toFixed(1)} MB
                  </div>
                </div>
                <button className="bg" style={{padding:"4px 8px",flexShrink:0}}
                  onClick={()=>setDropCandidates(null)}>
                  <Ic n="x" s={13}/>
                </button>
              </div>
              <div style={{padding:"12px 18px 18px",maxHeight:"60vh",overflowY:"auto"}}>
                <div style={{fontSize:11,color:"var(--tm)",marginBottom:10}}>{T.home_drop_sub}</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {dropCandidates.tools.map((t)=>(
                    <button key={t.id}
                      onClick={()=>{ goToTool(t, dropCandidates.file); setDropCandidates(null); }}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                        background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:8,
                        cursor:"pointer",textAlign:"left",width:"100%",
                        fontFamily:"'DM Sans',sans-serif",transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--al)"}
                      onMouseLeave={e=>e.currentTarget.style.background="var(--sf)"}>
                      <div style={{width:32,height:32,borderRadius:7,background:"var(--al)",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Ic n={t.icon} s={15} c="var(--ac)"/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:500,fontSize:13}}>{t.label}</div>
                        <div style={{fontSize:11,color:"var(--tm)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                      </div>
                      <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
                        <Tag type={t.from}/><span style={{color:"var(--tm)",fontSize:10}}>→</span><Tag type={t.to}/>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LangCtx.Provider>
  );
}
