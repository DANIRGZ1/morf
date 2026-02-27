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
    if (!email || !email.includes('@')) { setEmailErr('Introduce un email válido'); return; }
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

  return (
    <div className="ov" onClick={onClose}>
      <div className="sh" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
        <div className="sh-head">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="zap" s={16} c="var(--ac)"/>
            <span style={{fontWeight:600,fontSize:14}}>{T.upgrade_cta}</span>
          </div>
          <button style={{background:"none",border:"none",cursor:"pointer",padding:4}} onClick={onClose}>
            <Ic n="x" s={16} c="var(--tm)"/>
          </button>
        </div>
        <div className="sh-body">
          {/* Reason */}
          <div style={{background:"#FEF9EC",border:"1px solid #FCD34D",borderRadius:8,padding:"10px 14px",
            fontSize:13,color:"#92400E",marginBottom:20,display:"flex",gap:8,alignItems:"flex-start"}}>
            <Ic n="zap" s={14} c="#F59E0B" style={{flexShrink:0,marginTop:1}}/>
            <span>{reason==='batch' ? T.free_batch : T.free_size}</span>
          </div>

          {/* Billing toggle */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:20}}>
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

          {/* Plans */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {/* Free */}
            <div style={{border:"1px solid var(--bd)",borderRadius:10,padding:"16px 14px"}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{T.plan_free}</div>
              <div style={{fontSize:11,color:"var(--tm)",marginBottom:12}}>{T.plan_free_desc}</div>
              <div style={{fontSize:22,fontWeight:700,marginBottom:12}}>€0</div>
              {[T.feat_batch, T.feat_size_free, T.feat_tools].map((f,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:12,color:"var(--t2)",marginBottom:6}}>
                  <Ic n="check" s={12} c="var(--tm)"/>{f}
                </div>
              ))}
              <button className="bg" style={{width:"100%",marginTop:12,fontSize:12,padding:"7px 0",textAlign:"center"}} onClick={onClose}>
                {T.plan_current}
              </button>
            </div>
            {/* Pro */}
            <div style={{border:"2px solid var(--ac)",borderRadius:10,padding:"16px 14px",background:"var(--al)",position:"relative"}}>
              <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                background:"var(--ac)",color:"#fff",fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:10,
                fontFamily:"'DM Mono',monospace",letterSpacing:".05em",whiteSpace:"nowrap"}}>MÁS POPULAR</div>
              <div style={{fontWeight:600,fontSize:13,marginBottom:2,color:"var(--ac)"}}>{T.plan_pro}</div>
              <div style={{fontSize:11,color:"var(--tm)",marginBottom:12}}>{T.plan_pro_desc}</div>
              <div style={{fontSize:22,fontWeight:700,marginBottom:2,color:"var(--ac)"}}>€{price}</div>
              <div style={{fontSize:10,color:"var(--tm)",marginBottom:10}}>{billingYear ? T.plan_monthly : T.plan_monthly}</div>
              {[T.feat_unlimited, T.feat_size_pro, T.feat_tools, T.feat_noad, T.feat_priority].map((f,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:12,color:"var(--t1)",marginBottom:6}}>
                  <Ic n="check" s={12} c="var(--ok)"/>{f}
                </div>
              ))}
              <div style={{marginTop:12}}>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e=>{setEmail(e.target.value);setEmailErr('');}}
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${emailErr?"#F87171":"var(--bd)"}`,
                    borderRadius:6,fontSize:12,background:"var(--bg)",color:"var(--t1)",
                    fontFamily:"'DM Sans',sans-serif",marginBottom:6,outline:"none"}}
                />
                {emailErr&&<div style={{fontSize:10,color:"#EF4444",marginBottom:6}}>{emailErr}</div>}
                <button className="bp" style={{width:"100%",fontSize:12,padding:"8px 0",justifyContent:"center",
                  opacity:loading?0.7:1,pointerEvents:loading?"none":"auto"}}
                  onClick={startCheckout}>
                  {loading ? <><div className="spn"/></> : T.plan_cta_pro}
                </button>
              </div>
            </div>
          </div>
          <div style={{textAlign:"center",fontSize:11,color:"var(--tm)"}}>{T.pricing_sub}</div>
          <div style={{textAlign:"center",marginTop:10}}>
            <a href="mailto:hola@morf.app?subject=Quiero%20contratar%20el%20plan%20Pro&body=Hola%2C%20me%20interesa%20el%20plan%20Pro%20de%20morf.%20Mi%20email%20es%3A%20"
              style={{fontSize:10,color:"var(--tm)",textDecoration:"underline",textDecorationColor:"var(--bd)"}}>
              ¿Problemas con el pago? Escríbenos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
