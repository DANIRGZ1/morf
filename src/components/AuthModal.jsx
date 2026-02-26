import { useState } from "react";
import { Ic } from "./icons";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function AuthModal({ onClose }) {
  const { signIn } = useAuth();
  const [email,    setEmail]   = useState("");
  const [sent,     setSent]    = useState(false);
  const [loading,  setLoading] = useState(false);
  const [errMsg,   setErrMsg]  = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrMsg("");
    const { error } = await signIn(email.trim());
    if (error) {
      setErrMsg(error.message || "Error al enviar el enlace");
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const ModalShell = ({ children }) => (
    <div
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
        zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={onClose}>
      <div
        style={{background:"var(--sf)",borderRadius:12,width:"92vw",maxWidth:360,
          padding:24,border:"1px solid var(--bd)",animation:"fu .25s ease both"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:7,background:"var(--al)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n="user" s={14} c="var(--ac)"/>
            </div>
            <span style={{fontWeight:600,fontSize:14}}>Historial en la nube</span>
          </div>
          <button className="bg" style={{padding:"4px 8px"}} onClick={onClose} aria-label="Cerrar">
            <Ic n="x" s={13} aria-hidden="true"/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  /* ── Sin Supabase configurado ── */
  if (!supabase) {
    return (
      <ModalShell>
        <div style={{textAlign:"center",padding:"8px 0 4px"}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:"var(--al)",
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <Ic n="user" s={20} c="var(--ac)"/>
          </div>
          <div style={{fontWeight:500,marginBottom:8}}>Configuración necesaria</div>
          <p style={{fontSize:12,color:"var(--tm)",lineHeight:1.7,marginBottom:16}}>
            Para activar el historial en la nube, añade estas variables a tu archivo <code style={{background:"var(--bd)",padding:"1px 5px",borderRadius:3,fontSize:11}}>.env</code>:
          </p>
          <div style={{background:"var(--bg)",border:"1px solid var(--bd)",borderRadius:8,
            padding:"12px 14px",textAlign:"left",fontSize:11,fontFamily:"'DM Mono',monospace",
            color:"var(--t2)",lineHeight:1.8,marginBottom:16,userSelect:"all"}}>
            VITE_SUPABASE_URL=https://xxxx.supabase.co<br/>
            VITE_SUPABASE_ANON_KEY=eyJ...
          </div>
          <p style={{fontSize:11,color:"var(--tm)",lineHeight:1.6,marginBottom:16}}>
            Crea tu proyecto gratis en{" "}
            <strong>supabase.com</strong> y ejecuta el SQL del archivo{" "}
            <code style={{fontSize:10}}>src/lib/supabase.ts</code> para crear la tabla.
          </p>
          <button className="bg" onClick={onClose}>Entendido</button>
        </div>
      </ModalShell>
    );
  }

  return (
    <div
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
        zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={onClose}>
      <div
        style={{background:"var(--sf)",borderRadius:12,width:"92vw",maxWidth:360,
          padding:24,border:"1px solid var(--bd)",animation:"fu .25s ease both"}}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:7,background:"var(--al)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n="user" s={14} c="var(--ac)"/>
            </div>
            <span style={{fontWeight:600,fontSize:14}}>Historial en la nube</span>
          </div>
          <button className="bg" style={{padding:"4px 8px"}} onClick={onClose}
            aria-label="Cerrar">
            <Ic n="x" s={13} aria-hidden="true"/>
          </button>
        </div>

        {sent ? (
          /* ── Confirmación ── */
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:"#F0FDF4",
              display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
              <Ic n="check" s={20} c="var(--ok)"/>
            </div>
            <div style={{fontWeight:500,marginBottom:6}}>¡Revisa tu correo!</div>
            <div style={{fontSize:12,color:"var(--tm)",lineHeight:1.6,marginBottom:18}}>
              Te hemos enviado un enlace mágico a <strong>{email}</strong>.
              Haz clic en él para iniciar sesión y sincronizar tu historial.
            </div>
            <button className="bg" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          /* ── Formulario ── */
          <>
            <p style={{fontSize:12,color:"var(--tm)",lineHeight:1.6,marginBottom:16}}>
              Guarda tu historial de conversiones en la nube y accede desde
              cualquier dispositivo. Recibirás un enlace mágico sin contraseña.
            </p>
            <form onSubmit={handleSubmit}>
              <label style={{fontSize:11,fontWeight:500,color:"var(--t2)",display:"block",marginBottom:5}}>
                Correo electrónico
              </label>
              <input
                type="email" required autoFocus
                value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="fi-inp"
                style={{marginBottom:errMsg?8:12}}
                onFocus={e=>e.target.style.borderColor="var(--ac)"}
                onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
              {errMsg && (
                <div style={{fontSize:11,color:"#B91C1C",marginBottom:10}}>{errMsg}</div>
              )}
              <button type="submit" className="bp" disabled={loading}
                style={{width:"100%",justifyContent:"center",display:"flex",alignItems:"center",gap:6}}>
                {loading
                  ? <><div className="spn"/>Enviando…</>
                  : <><Ic n="mail" s={13}/>Enviar enlace mágico</>
                }
              </button>
            </form>
            <p style={{fontSize:10,color:"var(--tm)",textAlign:"center",marginTop:12,lineHeight:1.5}}>
              Sin contraseña · Tus archivos nunca se suben al servidor
            </p>
          </>
        )}
      </div>
    </div>
  );
}
