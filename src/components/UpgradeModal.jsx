import { useState } from "react";
import { Ic } from "./icons";

const PRICE_MONTHLY = 'price_1T44W83sk2Fy1VINm9ziKPV1';
const PRICE_YEARLY  = 'price_1T44XP3sk2Fy1VINdMircInl';

/* ── Upgrade Modal ───────────────────────────────────────────────────────── */
function UpgradeModal({ reason, billingYear, setBillingYear, onClose, T }) {
  const monthly = 5.99;
  const yearly  = (monthly * 12 * 0.75 / 12).toFixed(2);
  const price   = billingYear ? yearly : monthly;
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [emailErr, setEmailErr] = useState('');

  const startCheckout = async () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setEmailErr('Introduce un email válido'); return;
    }
    setEmailErr('');
    setLoading(true);
    try {
      const priceId = billingYear ? PRICE_YEARLY : PRICE_MONTHLY;
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setEmailErr(data.error || 'Error al conectar con Stripe');
        setLoading(false);
      }
    } catch {
      setEmailErr('Error de red. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const proFeatures = [
    { icon:"upload",   text: T.feat_size_pro  },
    { icon:"merge",    text: T.feat_unlimited },
    { icon:"eye",      text: T.feat_noad      },
    { icon:"zap",      text: T.feat_priority  },
    { icon:"grid",     text: T.feat_tools     },
  ];

  return (
    <div className="ov" onClick={onClose}>
      <div className="sh" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>

        {/* ── Botón cerrar ── */}
        <div style={{display:"flex",justifyContent:"flex-end",padding:"14px 18px 0",flexShrink:0}}>
          <button style={{background:"none",border:"none",cursor:"pointer",padding:6,
            borderRadius:6,display:"flex",color:"var(--tm)"}} onClick={onClose}
            aria-label="Cerrar">
            <Ic n="x" s={16} c="var(--tm)"/>
          </button>
        </div>

        <div className="sh-body" style={{paddingTop:0}}>

          {/* ── Hero card ── */}
          <div style={{
            background:"linear-gradient(135deg,var(--ac) 0%,var(--ah) 100%)",
            borderRadius:14,padding:"24px 22px 22px",marginBottom:20,position:"relative",overflow:"hidden"
          }}>
            {/* Glow sutil */}
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 80% 20%,rgba(255,255,255,.07) 0%,transparent 60%)",pointerEvents:"none"}}/>

            {/* Cabecera */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.15)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic n="zap" s={15} c="#fff"/>
                </div>
                <span style={{fontWeight:700,fontSize:16,color:"#fff",letterSpacing:"-.01em"}}>morf Pro</span>
              </div>
              {/* Toggle facturación */}
              <button onClick={()=>setBillingYear(y=>!y)}
                style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.12)",
                  border:"1px solid rgba(255,255,255,.2)",borderRadius:20,padding:"4px 10px",
                  cursor:"pointer",fontSize:11,color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>
                <span style={{opacity:!billingYear?1:.5}}>Mes</span>
                <div style={{width:28,height:16,borderRadius:8,background:"rgba(255,255,255,.25)",position:"relative"}}>
                  <span style={{position:"absolute",top:2,left:billingYear?13:2,width:12,height:12,
                    borderRadius:"50%",background:"#fff",transition:"left .2s",display:"block"}}/>
                </div>
                <span style={{opacity:billingYear?1:.5}}>Año</span>
                {billingYear&&<span style={{background:"#4ADE80",color:"#14532D",fontSize:9,fontWeight:700,
                  padding:"1px 5px",borderRadius:8,fontFamily:"'DM Mono',monospace"}}>-25%</span>}
              </button>
            </div>

            {/* Precio */}
            <div style={{marginBottom:18}}>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <span style={{fontSize:38,fontWeight:800,color:"#fff",letterSpacing:"-.03em",lineHeight:1}}>
                  €{price}
                </span>
                <span style={{fontSize:13,color:"rgba(255,255,255,.65)",fontWeight:400}}>
                  /{billingYear ? T.plan_yearly?.replace('/','') || 'mes' : T.plan_monthly?.replace('/','') || 'mes'}
                </span>
              </div>
              {billingYear&&(
                <div style={{fontSize:11,color:"rgba(255,255,255,.55)",marginTop:3}}>
                  €{(yearly*12).toFixed(2)} al año · ahorra €{((monthly-Number(yearly))*12).toFixed(2)}
                </div>
              )}
            </div>

            {/* Features checklist */}
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {proFeatures.map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(74,222,128,.25)",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Ic n="check" s={11} c="#4ADE80" sw={3}/>
                  </div>
                  <span style={{fontSize:13,color:"rgba(255,255,255,.9)",lineHeight:1.3}}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Razón del bloqueo ── */}
          {reason&&(
            <div style={{background:"var(--al)",border:"1px solid var(--bd)",borderRadius:8,
              padding:"9px 13px",fontSize:12,color:"var(--t2)",marginBottom:16,
              display:"flex",gap:8,alignItems:"center"}}>
              <Ic n="lock" s={13} c="var(--ac)" style={{flexShrink:0}}/>
              <span>{reason==='batch' ? T.free_batch : T.free_size}</span>
            </div>
          )}

          {/* ── Email + CTA ── */}
          <div>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e=>{setEmail(e.target.value);setEmailErr('');}}
              style={{width:"100%",padding:"11px 13px",
                border:`1.5px solid ${emailErr?"#F87171":"var(--bd)"}`,
                borderRadius:8,fontSize:14,background:"var(--bg)",color:"var(--t1)",
                fontFamily:"'DM Sans',sans-serif",marginBottom:8,outline:"none",
                boxSizing:"border-box",transition:"border-color .15s"}}
              onFocus={e=>e.target.style.borderColor="var(--ac)"}
              onBlur={e=>e.target.style.borderColor=emailErr?"#F87171":"var(--bd)"}
            />
            {emailErr&&<div style={{fontSize:11,color:"#EF4444",marginBottom:8}}>{emailErr}</div>}
            <button className="bp" style={{width:"100%",fontSize:14,padding:"12px 0",
              justifyContent:"center",borderRadius:9,fontWeight:600,
              opacity:loading?.7:1,pointerEvents:loading?"none":"auto"}}
              onClick={startCheckout}>
              {loading
                ? <><div className="spn"/><span style={{marginLeft:8}}>Redirigiendo…</span></>
                : <><Ic n="zap" s={15} c="#fff"/>{T.plan_cta_pro}</>
              }
            </button>
          </div>

          {/* ── Footer ── */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,marginTop:14}}>
            <div style={{display:"flex",gap:16}}>
              {["lock","check","rotate"].map((ic,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--tm)"}}>
                  <Ic n={ic} s={11} c="var(--tm)"/>
                  {["Pago seguro","Sin compromiso","Cancela cuando quieras"][i]}
                </div>
              ))}
            </div>
            <a href="mailto:hola@morf.app?subject=Plan%20Pro"
              style={{fontSize:11,color:"var(--tm)",textDecoration:"underline",textDecorationColor:"var(--bd)"}}>
              ¿Problemas con el pago? Escríbenos
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
