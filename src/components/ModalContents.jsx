import { useState } from "react";
import { Ic } from "./icons";
import { useLang } from "../contexts/LangContext";

/* ── Privacy ─────────────────────────────────────────────────────────────── */
export function Privacy() {
  const T = useLang();
  return <>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:20}}>
      {[["shield",T.priv_chips[0]],["lock",T.priv_chips[1]],["check",T.priv_chips[2]]].map(([i,l])=>(
        <span key={l} className="chip"><Ic n={i} s={11} c="var(--ac)"/>{l}</span>
      ))}
    </div>
    <h2>{T.code==="es"?"Qué datos procesamos":T.code==="en"?"What data we process":T.code==="fr"?"Données traitées":T.code==="de"?"Welche Daten wir verarbeiten":"Que dados processamos"}</h2>
    <p>{T.code==="es"?"morf procesa tus archivos directamente en tu navegador mediante WebAssembly. Ningún archivo es enviado a servidores externos — todo ocurre localmente en tu dispositivo.":T.code==="en"?"morf processes your files directly in your browser using WebAssembly. No file is ever sent to external servers — everything happens locally on your device.":T.code==="fr"?"morf traite vos fichiers directement dans votre navigateur via WebAssembly. Aucun fichier n'est envoyé à des serveurs externes — tout se passe localement sur votre appareil.":T.code==="de"?"morf verarbeitet deine Dateien direkt im Browser per WebAssembly. Keine Datei wird an externe Server gesendet — alles geschieht lokal auf deinem Gerät.":"morf processa os teus ficheiros diretamente no browser via WebAssembly. Nenhum ficheiro é enviado para servidores externos — tudo acontece localmente no teu dispositivo."}</p>
    <h2>{T.code==="es"?"Qué no recopilamos":T.code==="en"?"What we don't collect":T.code==="fr"?"Ce que nous ne collectons pas":T.code==="de"?"Was wir nicht erfassen":"O que não recolhemos"}</h2>
    <ul>
      {(T.code==="es"?["No guardamos ni transmitimos el contenido de tus archivos.","No creamos cuentas ni perfiles de usuario.","No usamos cookies de seguimiento ni píxeles de rastreo.","No compartimos datos con terceros con fines publicitarios."]:T.code==="en"?["We do not save or transmit the content of your files.","We do not create user accounts or profiles.","We do not use tracking cookies or tracking pixels.","We do not share data with third parties for advertising purposes."]:T.code==="fr"?["Nous ne sauvegardons pas le contenu de vos fichiers.","Nous ne créons pas de comptes ni de profils utilisateur.","Nous n'utilisons pas de cookies de suivi.","Nous ne partageons pas de données avec des tiers à des fins publicitaires."]:T.code==="de"?["Wir speichern oder übertragen keine Dateiinhalte.","Wir erstellen keine Benutzerkonten oder Profile.","Wir verwenden keine Tracking-Cookies oder Tracking-Pixel.","Wir teilen keine Daten mit Dritten für Werbezwecke."]:["Não guardamos nem transmitimos o conteúdo dos teus ficheiros.","Não criamos contas nem perfis de utilizador.","Não usamos cookies de rastreio.","Não partilhamos dados com terceiros para fins publicitários."]).map((item,i)=>(
        <li key={i}>{item}</li>
      ))}
    </ul>
    <div className="divv"/>
    <h2>{T.code==="es"?"Retención de archivos":T.code==="en"?"File retention":T.code==="fr"?"Conservation des fichiers":T.code==="de"?"Dateispeicherung":"Retenção de ficheiros"}</h2>
    <p>{T.code==="es"?"Los archivos procesados existen únicamente en memoria temporal durante la sesión activa. Al cerrar la pestaña o el navegador, todos los datos son eliminados automáticamente.":T.code==="en"?"Processed files exist only in temporary browser memory during the active session. When you close the tab or browser, all processing data is automatically deleted.":T.code==="fr"?"Les fichiers traités n'existent que dans la mémoire temporaire du navigateur. Lorsque vous fermez l'onglet, toutes les données sont automatiquement supprimées.":T.code==="de"?"Verarbeitete Dateien existieren nur im temporären Browserspeicher während der aktiven Sitzung. Beim Schließen des Tabs werden alle Daten automatisch gelöscht.":"Os ficheiros processados existem apenas na memória temporária do browser durante a sessão. Ao fechar o separador, todos os dados são eliminados automaticamente."}</p>
    <div className="divv"/>
    <p style={{fontSize:11,color:"var(--tm)"}}>{T.code==="es"?"Última actualización: enero 2025 · morf v0.1 Beta":T.code==="en"?"Last updated: January 2025 · morf v0.1 Beta":T.code==="fr"?"Dernière mise à jour : janvier 2025 · morf v0.1 Beta":T.code==="de"?"Letzte Aktualisierung: Januar 2025 · morf v0.1 Beta":"Última atualização: janeiro de 2025 · morf v0.1 Beta"}</p>
  </>;
}

/* ── Terms ───────────────────────────────────────────────────────────────── */
export function Terms() {
  const T = useLang();
  const isEs = T.code==="es", isEn = T.code==="en", isFr = T.code==="fr", isDe = T.code==="de";
  return <>
    <p>{isEs?"Al usar morf aceptas estos términos.":isEn?"By using morf you accept these terms.":isFr?"En utilisant morf, vous acceptez ces conditions.":isDe?"Durch die Nutzung von morf akzeptierst du diese Bedingungen.":"Ao usar o morf aceitas estes termos."}</p>
    <h2>{isEs?"1. Uso del servicio":isEn?"1. Use of the service":isFr?"1. Utilisation du service":isDe?"1. Nutzung des Dienstes":"1. Utilização do serviço"}</h2>
    <p>{isEs?"morf es una herramienta de conversión de archivos de uso personal y profesional. Puedes usarla para convertir archivos propios o sobre los que tengas los derechos necesarios.":isEn?"morf is a file conversion tool for personal and professional use. You may use it to convert files you own or have the necessary rights to.":isFr?"morf est un outil de conversion de fichiers à usage personnel et professionnel. Vous pouvez l'utiliser pour convertir des fichiers qui vous appartiennent.":isDe?"morf ist ein Dateikonvertierungstool für den persönlichen und beruflichen Einsatz. Du darfst es für Dateien nutzen, die dir gehören oder für die du die nötigen Rechte hast.":"morf é uma ferramenta de conversão de ficheiros para uso pessoal e profissional."}</p>
    <h2>{isEs?"2. Propiedad intelectual":isEn?"2. Intellectual property":isFr?"2. Propriété intellectuelle":isDe?"2. Geistiges Eigentum":"2. Propriedade intelectual"}</h2>
    <p>{isEs?"El software, diseño y marca de morf son propiedad exclusiva de sus creadores. Tus archivos siguen siendo de tu entera propiedad — morf no reclama ningún derecho sobre el contenido que procesas.":isEn?"The software, design and brand of morf are the exclusive property of its creators. Your files remain entirely your property — morf claims no rights over the content you process.":isFr?"Le logiciel, le design et la marque morf sont la propriété exclusive de ses créateurs. Vos fichiers restent entièrement votre propriété.":isDe?"Software, Design und Marke von morf sind ausschließliches Eigentum der Entwickler. Deine Dateien bleiben vollständig dein Eigentum.":"O software, design e marca do morf são propriedade exclusiva dos seus criadores. Os teus ficheiros continuam a ser tua propriedade."}</p>
    <h2>{isEs?"3. Limitación de responsabilidad":isEn?"3. Limitation of liability":isFr?"3. Limitation de responsabilité":isDe?"3. Haftungsbeschränkung":"3. Limitação de responsabilidade"}</h2>
    <p>{isEs?"morf no se hace responsable de pérdida de datos o incompatibilidades de formato. Recomendamos mantener siempre una copia de seguridad de los archivos originales.":isEn?"morf is not responsible for data loss or format incompatibilities. We recommend always keeping a backup of your original files.":isFr?"morf n'est pas responsable de la perte de données ou des incompatibilités de format. Conservez toujours une copie de sauvegarde de vos fichiers originaux.":isDe?"morf haftet nicht für Datenverlust oder Formatinkompatibilitäten. Behalte immer eine Sicherungskopie deiner Originaldateien.":"morf não se responsabiliza por perda de dados ou incompatibilidades de formato. Recomendamos manter sempre uma cópia de segurança dos ficheiros originais."}</p>
    <div className="divv"/>
    <p style={{fontSize:11,color:"var(--tm)"}}>{isEs?"Última actualización: enero 2025":isEn?"Last updated: January 2025":isFr?"Dernière mise à jour : janvier 2025":isDe?"Letzte Aktualisierung: Januar 2025":"Última atualização: janeiro de 2025"}</p>
  </>;
}

/* ── Contact ─────────────────────────────────────────────────────────────── */
export function Contact({ showToast, onClose }) {
  const T = useLang();
  const [form, setForm] = useState({ name:"", email:"", subject:"general", msg:"" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const send = () => {
    if (!form.name||!form.email||!form.msg){ showToast(T.con_required,"err"); return; }
    setSending(true);
    setTimeout(()=>{ setSending(false); setSent(true); showToast(T.con_sent); }, 1800);
  };

  if (sent) return (
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{width:52,height:52,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <Ic n="check" s={22} c="var(--ok)"/>
      </div>
      <div style={{fontWeight:500,marginBottom:6}}>{T.con_done_title}</div>
      <p style={{color:"var(--t2)",fontSize:13,maxWidth:300,margin:"0 auto 22px",lineHeight:1.6}}>{T.con_done_sub}</p>
      <button className="bg" onClick={onClose}>{T.con_close}</button>
    </div>
  );

  return <>
    <p style={{marginBottom:18}}>{T.con_intro}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div><label className="fi-label">{T.con_name}</label><input className="fi-inp" placeholder={T.con_name_ph} value={form.name} onChange={set("name")}/></div>
      <div><label className="fi-label">{T.con_email}</label><input className="fi-inp" type="email" placeholder={T.con_email_ph} value={form.email} onChange={set("email")}/></div>
    </div>
    <div style={{marginBottom:12}}>
      <label className="fi-label">{T.con_subject}</label>
      <select className="fi-inp" value={form.subject} onChange={set("subject")}>
        {T.con_subjects.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
    <div style={{marginBottom:16}}>
      <label className="fi-label">{T.con_msg}</label>
      <textarea className="fi-inp fi-ta" placeholder={T.con_msg_ph} value={form.msg} onChange={set("msg")}/>
    </div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginBottom:20}}>
      <button className="bg" onClick={onClose}>{T.con_cancel}</button>
      <button className="bp" onClick={send} disabled={sending}>
        {sending?<><div className="spn"/>{T.con_sending}</>:<><Ic n="mail" s={14}/>{T.con_send}</>}
      </button>
    </div>
    <div className="divv"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[{i:"mail",t:"Email",v:"hola@morf.app"},{i:"zap",t:T.con_resp_t,v:T.con_resp_v}].map(r=>(
        <div key={r.t} style={{display:"flex",gap:10,padding:"12px 14px",background:"#F9F9F8",borderRadius:8,border:"1px solid var(--bd)"}}>
          <Ic n={r.i} s={14} c="var(--ac)"/>
          <div><div style={{fontSize:11,fontWeight:500,marginBottom:1}}>{r.t}</div><div style={{fontSize:11,color:"var(--tm)"}}>{r.v}</div></div>
        </div>
      ))}
    </div>
  </>;
}

/* ── CB helper ───────────────────────────────────────────────────────────── */
function CB({ id, txt, children, cop, copy, T }) {
  return (
    <div className="cb">
      {children}
      <button className="cpbtn" onClick={()=>copy(id,txt)}>{cop===id?T.api_copied:T.api_copy}</button>
    </div>
  );
}

/* ── API ─────────────────────────────────────────────────────────────────── */
export function API() {
  const T = useLang();
  const [cop, setCop] = useState(null);
  const copy = (id, txt) => {
    try { navigator.clipboard.writeText(txt); } catch { /* ignore */ }
    setCop(id); setTimeout(()=>setCop(null), 1600);
  };
  return <>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--al)",borderRadius:8,marginBottom:20,border:"1px solid #CBD5E1"}}>
      <Ic n="zap" s={13} c="var(--ac)"/>
      <span style={{fontSize:12,color:"var(--ac)"}}>{T.api_beta}</span>
    </div>
    <h2>Endpoint</h2>
    <CB id="req" txt="POST https://api.morf.app/v1/convert" cop={cop} copy={copy} T={T}>
      <span className="fn">POST</span> https://api.morf.app/<span className="kw">v1</span>/convert{"\n\n"}
      <span className="cm">// multipart/form-data</span>{"\n"}
      file:          <span className="st">document.pdf</span>{"\n"}
      output_format: <span className="st">"docx"</span>{"\n"}
      quality:       <span className="st">"high"</span>   <span className="cm">// low | medium | high</span>
    </CB>
    <h2>JavaScript</h2>
    <CB id="js" txt={`const form = new FormData();\nform.append('file', fileInput.files[0]);\nform.append('output_format', 'docx');\n\nconst res = await fetch('https://api.morf.app/v1/convert', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer mk_live_xxx' },\n  body: form\n});\nconst blob = await res.blob();`} cop={cop} copy={copy} T={T}>
      <span className="kw">const</span> form = <span className="kw">new</span> <span className="fn">FormData</span>();{"\n"}
      form.<span className="fn">append</span>(<span className="st">'file'</span>, fileInput.files[<span className="kw">0</span>]);{"\n"}
      form.<span className="fn">append</span>(<span className="st">'output_format'</span>, <span className="st">'docx'</span>);{"\n\n"}
      <span className="kw">const</span> res = <span className="kw">await</span> <span className="fn">fetch</span>(<span className="st">'https://api.morf.app/v1/convert'</span>, {"{\n"}
      {"  method: "}<span className="st">'POST'</span>,{"\n"}
      {"  headers: { "}<span className="st">'Authorization'</span>: <span className="st">'Bearer mk_live_xxx'</span> {" },\n"}
      {"  body: form\n})"};{"\n"}
      <span className="kw">const</span> blob = <span className="kw">await</span> res.<span className="fn">blob</span>();
    </CB>
    <h2>{T.code==="es"?"Planes":T.code==="en"?"Plans":T.code==="fr"?"Forfaits":T.code==="de"?"Pläne":"Planos"}</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {T.api_plans.map(p=>(
        <div key={p.t} style={{padding:"14px",border:"1px solid var(--bd)",borderRadius:8,textAlign:"center"}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>{p.t}</div>
          <div style={{fontSize:11,color:"var(--tm)",marginBottom:2}}>{p.r}</div>
          <div style={{fontSize:11,color:"var(--tm)",marginBottom:10}}>Max {p.s}</div>
          <div style={{fontWeight:500,fontSize:13,color:"var(--ac)"}}>{p.p}</div>
        </div>
      ))}
    </div>
  </>;
}
