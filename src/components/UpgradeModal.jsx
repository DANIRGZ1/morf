import { Ic } from "./icons";

/* ── Upgrade Modal ───────────────────────────────────────────────────────── */
function UpgradeModal({ reason, billingYear, setBillingYear, onClose, T }) {
  const monthly = 5.99;
  const yearly  = (monthly * 12 * 0.75 / 12).toFixed(2);
  const price   = billingYear ? yearly : monthly;

  return (
    <div className="ov" role="presentation" onClick={onClose}>
      <div className="sh" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
        <div className="sh-head">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="zap" s={16} c="var(--ac)"/>
            <span id="upgrade-title" style={{fontWeight:600,fontSize:14}}>{T.upgrade_cta}</span>
          </div>
          <button style={{background:"none",border:"none",cursor:"pointer",padding:4}} onClick={onClose} aria-label="Cerrar">
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
              <button className="bp" style={{width:"100%",marginTop:12,fontSize:12,padding:"8px 0",justifyContent:"center"}}
                onClick={()=>alert('Pasarela de pago próximamente')}>
                {T.plan_cta_pro}
              </button>
            </div>
          </div>
          <div style={{textAlign:"center",fontSize:11,color:"var(--tm)"}}>{T.pricing_sub}</div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
