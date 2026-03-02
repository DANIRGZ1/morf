import { useState } from "react";
import { Ic } from "./icons";

/* ── FAQ Item ────────────────────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{borderBottom:"1px solid var(--bd)"}}>
      <button onClick={()=>setOpen(o=>!o)}
        aria-expanded={open}
        className="faq-q"
        style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 0",background:"transparent",border:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:"var(--t1)",
          textAlign:"left",gap:12}}>
        <span>{q}</span>
        <span style={{flexShrink:0,transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}} aria-hidden="true">
          <Ic n="chevron" s={16} c="var(--tm)"/>
        </span>
      </button>
      {open&&(
        <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.7,paddingBottom:14,animation:"fu .2s ease both"}}>
          {a}
        </div>
      )}
    </div>
  );
}

export default FaqItem;
