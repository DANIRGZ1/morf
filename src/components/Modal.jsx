import { useEffect } from "react";
import { Ic } from "./icons";

/* ── Modal ───────────────────────────────────────────────────────────────── */
function Modal({ title, icon, onClose, children }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="ov" role="presentation" onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="sh" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="sh-head">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:7,background:"var(--al)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n={icon} s={15} c="var(--ac)"/>
            </div>
            <span id="modal-title" style={{fontWeight:600,fontSize:14}}>{title}</span>
          </div>
          <button className="bg" style={{padding:"5px 9px"}} onClick={onClose} aria-label="Cerrar"><Ic n="x" s={14}/></button>
        </div>
        <div className="sh-body lg">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
