import { useState, useRef } from "react";
import { Ic } from "./icons";
import { useLang } from "../contexts/LangContext";
import { mergePdfs, splitPdf, imagesToPdf, compressPdf, wordToPdf, pdfToWord, pngToJpg, jpgToPng, rotatePdf, excelToPdf } from "../utils/convert";

/* ── Tools ───────────────────────────────────────────────────────────────── */
// eslint-disable-next-line react-refresh/only-export-components
export const TOOL_BASE = [
  {id:"pdf-word",  icon:"word",     accepts:[".pdf"],                        from:"pdf",  to:"docx", popular:true},
  {id:"word-pdf",  icon:"pdf",      accepts:[".doc",".docx"], mimeTypes:["application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"], from:"docx", to:"pdf", popular:true},
  {id:"img-pdf",   icon:"img",      accepts:[".jpg",".jpeg",".png",".webp"], from:"img",  to:"pdf", multi:true},
  {id:"merge",     icon:"merge",    accepts:[".pdf"],                        from:"pdf",  to:"pdf", multi:true, popular:true},
  {id:"split",     icon:"split",    accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"compress",  icon:"compress", accepts:[".pdf"],                        from:"pdf",  to:"pdf", popular:true},
  {id:"png-jpg",   icon:"img",      accepts:[".png"],                            from:"png",  to:"jpg"},
  {id:"jpg-png",   icon:"img",      accepts:[".jpg",".jpeg"],                    from:"jpg",  to:"png"},
  {id:"rotate",    icon:"rotate",   accepts:[".pdf"],                            from:"pdf",  to:"pdf"},
  {id:"excel-pdf", icon:"excel",    accepts:[".xlsx",".xls"], mimeTypes:["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"], from:"xlsx", to:"pdf"},
];

function FileRow({ file, onRemove, showHandle=false, index=0 }) {
  const ext = file.name.split(".").pop().toUpperCase();
  const kb  = (file.size/1024).toFixed(0);
  const sz  = kb<1024?`${kb} KB`:`${(kb/1024).toFixed(1)} MB`;
  return (
    <div className="fr" style={{gap:8}}>
      {showHandle&&(
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{opacity:.35,cursor:"grab"}}>
            <circle cx="3" cy="2.5" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
            <circle cx="3" cy="7"   r="1.2" fill="currentColor"/>
            <circle cx="7" cy="7"   r="1.2" fill="currentColor"/>
            <circle cx="3" cy="11.5" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
          </svg>
          <span style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",
            color:"var(--ac)",background:"var(--al)",borderRadius:3,padding:"1px 5px",
            minWidth:16,textAlign:"center"}}>{index+1}</span>
        </div>
      )}
      <Ic n="file" s={14} c="var(--tm)"/>
      <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</span>
      <span style={{fontSize:10,color:"var(--tm)",fontFamily:"'DM Mono',monospace",flexShrink:0}}>{sz}</span>
      <span style={{fontSize:10,color:"var(--tm)",fontFamily:"'DM Mono',monospace",background:"var(--bd)",padding:"1px 5px",borderRadius:3,flexShrink:0}}>{ext}</span>
      <button onClick={onRemove} aria-label={`Eliminar ${file.name}`} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:"var(--tm)",display:"flex",alignItems:"center"}}>
        <Ic n="x" s={13} aria-hidden="true"/>
      </button>
    </div>
  );
}

function Panel({ tool, onClose, showToast, bumpCount=()=>{}, addToHistory=()=>{}, checkLimits=()=>true }) {
  const T = useLang();
  const [files,setFiles]     = useState([]);
  const [drag,setDrag]       = useState(false);
  const [status,setStatus]   = useState("idle"); // idle | proc | done | error
  const [range,setRange]     = useState("");
  const [quality,setQuality] = useState("medium");
  const [rotation,setRotation] = useState(90);
  const [dragIdx,setDragIdx] = useState(null);
  const [errMsg,setErrMsg]   = useState("");
  const [step,setStep]       = useState(0); // 0=idle 1=read 2=proc 3=done
  const ref = useRef();

  const addFiles = l => {
    const list = Array.from(l);
    const hasOdt = list.some(f =>
      f.name.toLowerCase().endsWith(".odt") ||
      f.type === "application/vnd.oasis.opendocument.text"
    );
    if (hasOdt) { showToast(T.err_odt,"err"); return; }
    const ok = list.filter(f => {
      const name = f.name.toLowerCase();
      const mime = f.type.toLowerCase();
      const extOk  = (tool.accepts||[]).some(e => name.endsWith(e.replace(".","").toLowerCase()));
      const mimeOk = (tool.mimeTypes||[]).some(m => mime === m);
      return extOk || mimeOk;
    });
    if (!ok.length){ showToast(T.incompat,"err"); return; }
    setFiles(p=>tool.multi?[...p,...ok]:[ok[0]]);
  };

  const getErrMsg = (e) => {
    const msg = (e.message || "").toLowerCase();
    if (files[0] && files[0].size > 200 * 1024 * 1024) return T.err_size;
    if (msg.includes("encrypt") || msg.includes("password") || msg.includes("protected")) return T.err_protected;
    if (msg.includes("range") || msg.includes("rango")) return T.err_range;
    if (msg.includes("invalid") || msg.includes("corrupt") || msg.includes("unexpected")) return T.err_corrupt;
    return T.err_generic;
  };

  const convert = async () => {
    // Validar tamaño antes de procesar
    const maxSize = 200 * 1024 * 1024;
    if (files.some(f => f.size > maxSize)) {
      setErrMsg(T.err_size);
      setStatus("error");
      return;
    }
    // Check freemium limits
    if (!checkLimits(files, tool.id)) return;

    setStatus("proc");
    setStep(1); // leyendo
    setErrMsg("");
    await new Promise(r => setTimeout(r, 350)); // pequeña pausa para que se vea el paso 1
    setStep(2); // procesando
    try {
      if (tool.id==="merge")         { await mergePdfs(files); }
      else if (tool.id==="split")    { await splitPdf(files[0], range); }
      else if (tool.id==="img-pdf")  { await imagesToPdf(files); }
      else if (tool.id==="compress") { await compressPdf(files[0], quality); }
      else if (tool.id==="word-pdf") {
        const f = files[0];
        const res = await wordToPdf(f);
        if (res === "popup-blocked") {
          setErrMsg(T.err_popup);
          setStatus("error");
          return;
        }
        showToast(T.conv_done);
        bumpCount();
          addToHistory(files[0]?.name, tool.label);
        setStatus("idle"); setFiles([]); return;
      }
      else if (tool.id==="pdf-word")  { await pdfToWord(files[0]); }
      else if (tool.id==="png-jpg")   { await pngToJpg(files[0]); }
      else if (tool.id==="jpg-png")   { await jpgToPng(files[0]); }
      else if (tool.id==="rotate")    { await rotatePdf(files[0], rotation); }
      else if (tool.id==="excel-pdf") {
        const res = await excelToPdf(files[0]);
        if (res === "popup-blocked") { setErrMsg(T.err_popup); setStatus("error"); return; }
        showToast(T.conv_done); bumpCount(); setStatus("idle"); setFiles([]); return;
      }
      setStep(3);
      setStatus("done");
      showToast(T.conv_done);
      bumpCount();
      addToHistory(files[0]?.name, tool.label);
    } catch(e) {
      console.error(e);
      setStep(0);
      setErrMsg(getErrMsg(e));
      setStatus("error");
    }
  };

  const dl = () => { setStatus("idle"); setFiles([]); };

  return (
    <div style={{background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:10,overflow:"hidden",animation:"fu .3s ease both"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:7,background:"var(--al)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic n={tool.icon} s={15} c="var(--ac)"/>
          </div>
          <div>
            <div style={{fontWeight:500,fontSize:13}}>{tool.label}</div>
            <div style={{fontSize:11,color:"var(--tm)"}}>{tool.desc}</div>
          </div>
        </div>
        <button className="bg" style={{padding:"5px 9px"}} onClick={onClose} aria-label="Cerrar panel"><Ic n="x" s={13} aria-hidden="true"/></button>
      </div>
      <div style={{padding:18}}>
        {status==="done"?(
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
              <Ic n="check" s={20} c="var(--ok)"/>
            </div>
            <div style={{fontWeight:500,marginBottom:4}}>{T.conv_done}</div>
            <div style={{fontSize:12,color:"var(--tm)",marginBottom:18}}>
              {files.length} {files.length===1?T.done_sub_s:T.done_sub_p}
            </div>
            <button className="bg" onClick={dl}>{T.other}</button>
          </div>
        ):status==="error"?(
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
              <Ic n="x" s={20} c="#B91C1C"/>
            </div>
            <div style={{fontWeight:600,marginBottom:10,color:"#B91C1C",fontSize:14}}>{T.err_title}</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:6,maxWidth:340,margin:"0 auto 8px",lineHeight:1.6}}>{errMsg}</div>
            <div style={{fontSize:11,color:"var(--tm)",marginBottom:20}}>{T.err_suggest}</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button className="bg" onClick={()=>{ setStatus("idle"); setFiles([]); }}>{T.cancel}</button>
              <button className="bp" onClick={()=>setStatus("idle")}>{T.err_retry}</button>
            </div>
          </div>
        ):(
          <>
            {/* Input oculto — se resetea tras cada selección para poder añadir el mismo archivo */}
            <input ref={ref} type="file" accept={[...(tool.accepts||[]),...(tool.mimeTypes||[])].join(",")} multiple={!!tool.multi}
              style={{display:"none"}}
              onChange={e=>{ addFiles(e.target.files); e.target.value=""; }}/>

            {/* Zona drop — solo se muestra si no hay archivos o la herramienta no es multi */}
            {(!tool.multi || files.length===0) && (
              <div className={`dz ${drag?"ov":""}`}
                role="button" tabIndex={0}
                aria-label={tool.multi?T.drag_multi:T.drag_single}
                style={{padding:"28px 18px",textAlign:"center",marginBottom:12}}
                onDragOver={e=>{e.preventDefault();setDrag(true)}}
                onDragLeave={()=>setDrag(false)}
                onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
                onClick={()=>ref.current?.click()}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();ref.current?.click();}}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                  <Ic n="upload" s={22} c={drag?"var(--ac)":"var(--tm)"}/>
                </div>
                <div style={{fontWeight:500,fontSize:13,marginBottom:2,color:drag?"var(--ac)":"var(--t1)"}}>
                  {tool.multi?T.drag_multi:T.drag_single}
                </div>
                <div style={{fontSize:11,color:"var(--tm)"}}>{T.click_hint} · {tool.accepts.join(", ")} · {T.max_size}</div>
              </div>
            )}

            {/* Lista de archivos + botón añadir más (solo herramientas multi) */}
            {files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:tool.multi?8:0}}>
                  {files.map((f,i)=>(
                    <div key={i}
                      draggable={!!tool.multi}
                      onDragStart={()=>setDragIdx(i)}
                      onDragOver={e=>e.preventDefault()}
                      onDrop={e=>{
                        e.preventDefault();
                        if(dragIdx===null||dragIdx===i)return;
                        setFiles(p=>{const n=[...p];const[m]=n.splice(dragIdx,1);n.splice(i,0,m);return n;});
                        setDragIdx(null);
                      }}
                      onDragEnd={()=>setDragIdx(null)}
                      style={{opacity:dragIdx===i?.4:1,transition:"opacity .15s",cursor:tool.multi?"grab":"default"}}>
                      <FileRow file={f} onRemove={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                        showHandle={!!tool.multi} index={i}/>
                    </div>
                  ))}
                </div>
                {tool.multi&&(()=>{
                  const isFreeLimit = tool.id==='merge' && !localStorage.getItem('morf_pro') && files.length >= 2;
                  return isFreeLimit ? (
                    <div style={{padding:"10px 12px",background:"var(--al)",border:"1px solid var(--ac)",
                      borderRadius:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                      <span style={{fontSize:11,color:"var(--ac)"}}>{T.merge_hint}</span>
                      <button className="bp" style={{fontSize:10,padding:"4px 10px",borderRadius:5}}
                        onClick={()=>checkLimits([...files,{size:0,name:"x"}],"merge")}>Pro</button>
                    </div>
                  ) : (
                    <div
                      className={`dz ${drag?"ov":""}`}
                      style={{padding:"12px",textAlign:"center",cursor:"pointer",borderStyle:"dashed"}}
                      onDragOver={e=>{e.preventDefault();setDrag(true)}}
                      onDragLeave={()=>setDrag(false)}
                      onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
                      onClick={()=>ref.current?.click()}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--t2)"}}>
                        <Ic n="upload" s={13} c="var(--t2)"/>
                        Añadir más archivos
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {tool.id==="split"&&files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:5}}>{T.pages_label}</div>
                <input value={range} onChange={e=>setRange(e.target.value)} placeholder={T.pages_ph}
                  className="fi-inp" style={{fontFamily:"'DM Mono',monospace",fontSize:12}}
                  onFocus={e=>e.target.style.borderColor="var(--ac)"}
                  onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
              </div>
            )}
            {tool.id==="rotate"&&files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:6}}>Ángulo de rotación</div>
                <div style={{display:"flex",gap:6}}>
                  {[[90,"90°"],[180,"180°"],[270,"270°"]].map(([deg,lbl])=>(
                    <button key={deg} onClick={()=>setRotation(deg)}
                      style={{flex:1,padding:"7px 0",border:`1px solid ${rotation===deg?"var(--ac)":"var(--bd)"}`,borderRadius:6,
                        fontSize:13,fontFamily:"'DM Mono',monospace",background:rotation===deg?"var(--al)":"transparent",
                        color:rotation===deg?"var(--ac)":"var(--t2)",cursor:"pointer",fontWeight:rotation===deg?500:400,transition:"all .16s"}}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tool.id==="compress"&&files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:6}}>{T.compress_level}</div>
                <div style={{display:"flex",gap:6}}>
                  {[["low",T.q_low],["medium",T.q_med],["high",T.q_high]].map(([q,l])=>(
                    <button key={q} onClick={()=>setQuality(q)}
                      style={{flex:1,padding:"7px 0",border:`1px solid ${quality===q?"var(--ac)":"var(--bd)"}`,borderRadius:6,
                        fontSize:12,fontFamily:"'DM Sans',sans-serif",background:quality===q?"var(--al)":"transparent",
                        color:quality===q?"var(--ac)":"var(--t2)",cursor:"pointer",fontWeight:quality===q?500:400,transition:"all .16s"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {status==="proc"&&(
              <div className="m-steps" style={{marginBottom:16,padding:"16px",background:"var(--al)",borderRadius:10,textAlign:"center"}}>
                {/* Pasos */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:12}}>
                  {[T.step_read, T.step_proc].map((label,i)=>{
                    const idx = i+1;
                    const isDone = step > idx;
                    const isActive = step === idx;
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center"}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div className={`step-dot ${isActive?"active":isDone?"done":""}`}/>
                          <span style={{fontSize:10,color:isActive?"var(--ac)":isDone?"var(--ok)":"var(--tm)",fontWeight:isActive?500:400,transition:"color .3s",whiteSpace:"nowrap"}}>
                            {label}
                          </span>
                        </div>
                        {i<1&&<div style={{width:48,height:1,background:step>idx?"var(--ok)":"var(--bd)",margin:"0 8px",marginBottom:14,transition:"background .3s"}}/>}
                      </div>
                    );
                  })}
                </div>
                {/* Barra */}
                <div className="tr" style={{maxWidth:200,margin:"0 auto"}}>
                  <div className="fill" style={{animationDuration: step===1?"0.8s":"2s"}}/>
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="bg" onClick={onClose}>{T.cancel}</button>
              <button className="bp" disabled={!files.length||status==="proc"} onClick={convert}>
                {status==="proc"?<><div className="spn"/>{T.processing}</>:<><Ic n="arrow" s={14}/>{T.convert}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Panel;
