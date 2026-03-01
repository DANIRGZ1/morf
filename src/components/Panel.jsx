import { useState, useRef, useEffect, useMemo } from "react";
import { Ic } from "./icons";
import { useLang } from "../contexts/LangContext";
import { requestNotifyPermission, notifyDone } from "../utils/notify";
import {
  mergePdfs, splitPdf, imagesToPdf, wordToPdf, pdfToWord,
  pngToJpg, jpgToPng, rotatePdf, excelToPdf,
  compressPdfToBlob, rotatePdfToBlob, pngToJpgBlob, jpgToPngBlob,
  downloadAsZip, basename, parsePageRange,
  unlockPdf, unlockPdfToBlob,
  watermarkPdf, watermarkPdfToBlob,
  numberPagesPdf, numberPagesPdfToBlob,
  cropPdf, cropPdfToBlob,
  grayscalePdf, grayscalePdfToBlob,
  pdfToPptx, pdfToExcel, signPdfV2, ocrPdf,
  pdfToImages, organizePdf, deletePagesPdf, pptxToPdf, ensurePdfJs,
  repairPdf, htmlToPdf, flattenPdf,
  annotatePdf, redactPdf,
  ocrSearchablePdf, pdfToMarkdown,
} from "../utils/convert";
import ChatPdf from "./ChatPdf";
import VisualAnnotate from "./VisualAnnotate";
import SummarizePdf from "./SummarizePdf";
import ComparePdf from "./ComparePdf";

/* ── Tools ───────────────────────────────────────────────────────────────── */
// eslint-disable-next-line react-refresh/only-export-components
export const TOOL_BASE = [
  {id:"pdf-word",  icon:"word",     accepts:[".pdf"],                        from:"pdf",  to:"docx", popular:true},
  {id:"word-pdf",  icon:"pdf",      accepts:[".doc",".docx"], mimeTypes:["application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"], from:"docx", to:"pdf", popular:true},
  {id:"img-pdf",   icon:"img",      accepts:[".jpg",".jpeg",".png",".webp"], from:"img",  to:"pdf", multi:true},
  {id:"merge",     icon:"merge",    accepts:[".pdf"],                        from:"pdf",  to:"pdf", multi:true, popular:true},
  {id:"split",     icon:"split",    accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"compress",  icon:"compress", accepts:[".pdf"],                        from:"pdf",  to:"pdf", popular:true, batch:true},
  {id:"png-jpg",   icon:"img",      accepts:[".png"],                        from:"png",  to:"jpg", batch:true},
  {id:"jpg-png",   icon:"img",      accepts:[".jpg",".jpeg"],                from:"jpg",  to:"png", batch:true},
  {id:"rotate",    icon:"rotate",   accepts:[".pdf"],                        from:"pdf",  to:"pdf", batch:true},
  {id:"excel-pdf",     icon:"excel",     accepts:[".xlsx",".xls"], mimeTypes:["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"], from:"xlsx", to:"pdf"},
  {id:"pdf-pptx",      icon:"pptx",      accepts:[".pdf"],                        from:"pdf",  to:"pptx"},
  {id:"pdf-excel",     icon:"excel",     accepts:[".pdf"],                        from:"pdf",  to:"xlsx"},
  {id:"watermark-pdf", icon:"watermark", accepts:[".pdf"],                        from:"pdf",  to:"pdf", batch:true},
  {id:"number-pages",  icon:"number",    accepts:[".pdf"],                        from:"pdf",  to:"pdf", batch:true},
  {id:"crop-pdf",      icon:"crop",      accepts:[".pdf"],                        from:"pdf",  to:"pdf", batch:true},
  {id:"grayscale-pdf", icon:"grayscale", accepts:[".pdf"],                        from:"pdf",  to:"pdf", batch:true},
  {id:"unlock-pdf",    icon:"unlock",    accepts:[".pdf"],                        from:"pdf",  to:"pdf", batch:true},
  {id:"sign-pdf",      icon:"sign",      accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"ocr-pdf",       icon:"ocr",       accepts:[".pdf"],                        from:"pdf",  to:"txt",  pro:true},
  {id:"protect-pdf",   icon:"protect",   accepts:[".pdf"],                        from:"pdf",  to:"pdf",  comingSoon:true},
  {id:"pptx-pdf",      icon:"pptx",      accepts:[".pptx",".ppt"], mimeTypes:["application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.ms-powerpoint"], from:"pptx", to:"pdf"},
  {id:"pdf-img",       icon:"img",       accepts:[".pdf"],                        from:"pdf",  to:"png"},
  {id:"organize-pdf",  icon:"split",     accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"delete-pages",  icon:"x",         accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"repair-pdf",    icon:"file",      accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"html-pdf",      icon:"pdf",       accepts:[".html",".htm"],                from:"html", to:"pdf"},
  {id:"flatten-pdf",   icon:"compress",  accepts:[".pdf"],                        from:"pdf",  to:"pdf", batch:true},
  {id:"annotate-pdf",    icon:"edit",      accepts:[".pdf"],  from:"pdf",  to:"pdf"},
  {id:"redact-pdf",      icon:"x",         accepts:[".pdf"],  from:"pdf",  to:"pdf"},
  {id:"ocr-searchable",  icon:"file",      accepts:[".pdf"],  from:"pdf",  to:"pdf"},
  {id:"chat-pdf",        icon:"pdf",       accepts:[".pdf"],  from:"pdf",  to:"chat"},
  {id:"visual-annotate", icon:"edit",      accepts:[".pdf"],  from:"pdf",  to:"pdf"},
  {id:"pdf-markdown",    icon:"file",      accepts:[".pdf"],  from:"pdf",  to:"md"},
  {id:"summarize-pdf",   icon:"pdf",       accepts:[".pdf"],  from:"pdf",  to:"ai"},
  {id:"compare-pdf",     icon:"split",     accepts:[".pdf"],  from:"pdf",  to:"pdf"},
];

/* ── Preview modal ───────────────────────────────────────────────────────── */
function FilePreviewModal({ file, onClose }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const isPdf   = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");
  return (
    <div
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:200,
        display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={onClose}>
      <div
        style={{background:"var(--sf)",borderRadius:12,width:"92vw",maxWidth:820,
          maxHeight:"92vh",display:"flex",flexDirection:"column",
          border:"1px solid var(--bd)",overflow:"hidden"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--bd)",
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <span style={{fontWeight:500,fontSize:13,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{file.name}</span>
          <button className="bg" style={{padding:"4px 8px",flexShrink:0}}
            onClick={onClose} aria-label="Cerrar vista previa">
            <Ic n="x" s={13} aria-hidden="true"/>
          </button>
        </div>
        <div style={{flex:1,overflow:"auto",minHeight:200,background:"var(--bg)"}}>
          {url && isPdf && (
            <embed src={url} type="application/pdf"
              style={{width:"100%",height:"75vh",border:"none",display:"block"}}/>
          )}
          {url && isImage && (
            <img src={url} alt={file.name}
              style={{maxWidth:"100%",maxHeight:"75vh",display:"block",
                margin:"auto",padding:16,objectFit:"contain"}}/>
          )}
          {url && !isPdf && !isImage && (
            <div style={{padding:24,textAlign:"center",color:"var(--tm)",fontSize:13}}>
              Vista previa no disponible para este tipo de archivo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Dropbox import button ───────────────────────────────────────────────── */
// Requiere: VITE_DROPBOX_APP_KEY en .env
// Registra tu app en: https://www.dropbox.com/developers/apps
function DropboxImportButton({ onFiles, accepts }) {
  const [busy, setBusy] = useState(false);
  const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;
  if (!appKey) {
    return (
      <button disabled
        title="Añade VITE_DROPBOX_APP_KEY a tu .env para activar"
        style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",
          border:"1px solid var(--bd)",borderRadius:6,background:"transparent",
          cursor:"not-allowed",fontSize:11,color:"var(--tm)",opacity:.5,
          fontFamily:"'DM Sans',sans-serif"}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#0061FF" opacity=".4">
          <path d="M6 2l6 4-6 4-6-4zm12 0l6 4-6 4-6-4zm-12 9l6 4-6 4-6-4zm12 0l6 4-6 4-6-4zM6 20l6-4 6 4"/>
        </svg>
        Dropbox
      </button>
    );
  }
  const handle = async () => {
    setBusy(true);
    if (!window.Dropbox) {
      await new Promise((res, rej) => {
        if (document.getElementById("dropboxjs")) { res(); return; }
        const s = document.createElement("script");
        s.src = "https://www.dropbox.com/static/api/2/dropins.js";
        s.id  = "dropboxjs";
        s.setAttribute("data-app-key", appKey);
        s.onload = res;
        s.onerror = () => rej(new Error("Dropbox SDK error"));
        document.head.appendChild(s);
      });
    }
    setBusy(false);
    window.Dropbox.choose({
      linkType: "direct",
      multiselect: true,
      extensions: accepts,
      success: async (dbFiles) => {
        const files = await Promise.all(
          dbFiles.map(async ({ link, name }) => {
            const res  = await fetch(link);
            const blob = await res.blob();
            return new File([blob], name, { type: blob.type });
          })
        );
        onFiles(files);
      },
    });
  };
  return (
    <button onClick={handle} disabled={busy}
      style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",
        border:"1px solid var(--bd)",borderRadius:6,background:"transparent",
        cursor:"pointer",fontSize:11,color:"var(--t2)",fontFamily:"'DM Sans',sans-serif"}}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#0061FF">
        <path d="M6 2l6 4-6 4-6-4zm12 0l6 4-6 4-6-4zm-12 9l6 4-6 4-6-4zm12 0l6 4-6 4-6-4zM6 20l6-4 6 4"/>
      </svg>
      Dropbox
    </button>
  );
}

/* ── Google Drive import button ──────────────────────────────────────────── */
// Requiere: VITE_GOOGLE_API_KEY y VITE_GOOGLE_CLIENT_ID en .env
// Configura en: https://console.cloud.google.com
// Habilita: Google Drive API + Google Picker API
// Añade tu dominio como origen JS autorizado en el OAuth Client ID
function GoogleDriveImportButton({ onFiles }) {
  const [busy, setBusy] = useState(false);
  const apiKey   = import.meta.env.VITE_GOOGLE_API_KEY;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!apiKey || !clientId) {
    return (
      <button disabled
        title="Añade VITE_GOOGLE_API_KEY y VITE_GOOGLE_CLIENT_ID a tu .env para activar"
        style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",
          border:"1px solid var(--bd)",borderRadius:6,background:"transparent",
          cursor:"not-allowed",fontSize:11,color:"var(--tm)",opacity:.5,
          fontFamily:"'DM Sans',sans-serif"}}>
        <svg width="13" height="13" viewBox="0 0 24 24" opacity=".4">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google Drive
      </button>
    );
  }

  const loadScript = (src) =>
    new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });

  const handle = async () => {
    setBusy(true);
    try {
      await loadScript("https://apis.google.com/js/api.js");
      await loadScript("https://accounts.google.com/gsi/client");
      await new Promise(res => window.gapi.load("picker", res));

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: async (resp) => {
          if (resp.error) { setBusy(false); return; }
          const token = resp.access_token;
          const picker = new window.google.picker.PickerBuilder()
            .setOAuthToken(token)
            .setDeveloperKey(apiKey)
            .addView(new window.google.picker.DocsView().setIncludeFolders(false))
            .setCallback(async (data) => {
              if (data.action !== "picked") { setBusy(false); return; }
              const doc = data.docs[0];
              const r   = await fetch(
                `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const blob = await r.blob();
              onFiles([new File([blob], doc.name, { type: blob.type })]);
              setBusy(false);
            })
            .build();
          picker.setVisible(true);
        },
      });
      tokenClient.requestAccessToken({ prompt: "" });
    } catch { setBusy(false); }
  };
  return (
    <button onClick={handle} disabled={busy}
      style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",
        border:"1px solid var(--bd)",borderRadius:6,background:"transparent",
        cursor:"pointer",fontSize:11,color:"var(--t2)",fontFamily:"'DM Sans',sans-serif"}}>
      <svg width="13" height="13" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Google Drive
    </button>
  );
}

/* ── FileRow ─────────────────────────────────────────────────────────────── */
function FileRow({ file, onRemove, onPreview=null, showHandle=false, index=0 }) {
  const ext = file.name.split(".").pop().toUpperCase();
  const kb  = (file.size/1024).toFixed(0);
  const sz  = kb<1024?`${kb} KB`:`${(kb/1024).toFixed(1)} MB`;
  return (
    <div className="fr" style={{gap:8}}>
      {showHandle&&(
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,
          minWidth:44,minHeight:44,justifyContent:"center",cursor:"grab"}}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{opacity:.35,pointerEvents:"none"}}>
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
      {onPreview&&(
        <button onClick={onPreview} aria-label={`Vista previa ${file.name}`}
          style={{background:"none",border:"none",cursor:"pointer",padding:2,
            color:"var(--tm)",display:"flex",alignItems:"center"}}>
          <Ic n="eye" s={13} aria-hidden="true"/>
        </button>
      )}
      <button onClick={onRemove} aria-label={`Eliminar ${file.name}`}
        style={{background:"none",border:"none",cursor:"pointer",padding:2,
          color:"var(--tm)",display:"flex",alignItems:"center"}}>
        <Ic n="x" s={13} aria-hidden="true"/>
      </button>
    </div>
  );
}

/* ── SignaturePad ────────────────────────────────────────────────────────── */
function SignaturePad({ onChange }) {
  const canvasRef  = useRef();
  const drawing    = useRef(false);
  const [hasData, setHasData] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const start = e => {
    e.preventDefault();
    drawing.current = true;
    const cv  = canvasRef.current;
    const ctx = cv.getContext("2d");
    const pos = getPos(e, cv);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const move = e => {
    if (!drawing.current) return;
    e.preventDefault();
    const cv  = canvasRef.current;
    const ctx = cv.getContext("2d");
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.strokeStyle = "#1C3042";
    const pos = getPos(e, cv);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.moveTo(pos.x, pos.y);
    setHasData(true);
  };

  const stop = () => {
    drawing.current = false;
    if (hasData) onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const cv  = canvasRef.current;
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    setHasData(false);
    onChange(null);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={500} height={160}
        style={{border:"1px solid var(--bd)",borderRadius:6,background:"#fff",
          width:"100%",display:"block",cursor:"crosshair",touchAction:"none"}}
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={move} onTouchEnd={stop}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
        <span style={{fontSize:10,color:"var(--tm)"}}>Dibuja tu firma con el ratón o el dedo</span>
        {hasData&&(
          <button onClick={clear} style={{fontSize:10,color:"var(--tm)",background:"none",
            border:"1px solid var(--bd)",borderRadius:4,padding:"2px 8px",cursor:"pointer"}}>
            Borrar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
const BATCH_TOOL_IDS = new Set(["merge","compress","png-jpg","jpg-png","rotate","watermark-pdf","number-pages","crop-pdf","grayscale-pdf","unlock-pdf","flatten-pdf"]);

const NEXT_TOOLS = {
  "pdf-word":      ["compress","merge","split"],
  "word-pdf":      ["compress","merge","pdf-word"],
  "compress":      ["merge","pdf-word","split"],
  "merge":         ["compress","split","pdf-word"],
  "split":         ["merge","compress","pdf-word"],
  "img-pdf":       ["merge","compress"],
  "jpg-png":       ["png-jpg","img-pdf"],
  "png-jpg":       ["jpg-png","img-pdf"],
  "rotate":        ["compress","merge"],
  "excel-pdf":     ["pdf-excel","compress"],
  "pdf-excel":     ["excel-pdf","compress"],
  "pptx-pdf":      ["pdf-pptx","compress"],
  "pdf-pptx":      ["pptx-pdf","compress"],
  "watermark-pdf": ["compress","merge"],
  "number-pages":  ["compress","merge"],
  "crop-pdf":      ["compress","rotate"],
  "grayscale-pdf": ["compress","merge"],
  "unlock-pdf":    ["compress","pdf-word"],
  "sign-pdf":      ["compress","merge"],
  "ocr-pdf":       ["pdf-word","compress"],
  "pdf-img":       ["img-pdf","compress"],
  "organize-pdf":  ["compress","merge"],
  "delete-pages":  ["compress","merge"],
  "repair-pdf":    ["compress","pdf-word","merge"],
  "html-pdf":      ["compress","merge","pdf-word"],
  "flatten-pdf":   ["compress","unlock-pdf","merge"],
  "annotate-pdf":    ["compress","merge","sign-pdf"],
  "redact-pdf":      ["compress","annotate-pdf","merge"],
  "ocr-searchable":  ["pdf-word","compress","ocr-pdf"],
  "chat-pdf":        ["ocr-pdf","pdf-word","compress"],
  "visual-annotate": ["annotate-pdf","redact-pdf","compress"],
  "pdf-markdown":    ["ocr-pdf","pdf-word","compress"],
  "summarize-pdf":   ["chat-pdf","ocr-pdf","compress"],
  "compare-pdf":     ["merge","split","annotate-pdf"],
};

function Panel({ tool, onClose, showToast, bumpCount=()=>{}, addToHistory=()=>{}, checkLimits=()=>true, preloadedFile=null, onGoToTool=null }) {
  const T = useLang();
  const [files,setFiles]       = useState([]);
  const [drag,setDrag]         = useState(false);
  const [status,setStatus]     = useState("idle"); // idle | proc | done | error
  const [range,setRange]       = useState("");
  const [quality,setQuality]   = useState("medium");
  const [rotation,setRotation] = useState(90);
  const [dragIdx,setDragIdx]   = useState(null);
  const [errMsg,setErrMsg]     = useState("");
  const [progress,setProgress] = useState(0);
  const [previewFile,setPreviewFile]   = useState(null);
  const [watermarkText,setWatermarkText] = useState("CONFIDENCIAL");
  const [cropMargins,setCropMargins]   = useState({top:10,bottom:10,left:10,right:10});
  const [signatureDataUrl,setSignatureDataUrl] = useState(null);
  const [signPage,setSignPage]                 = useState("last"); // "first"|"last"|"all"|"num"
  const [signPageNum,setSignPageNum]           = useState(1);
  const [signPos,setSignPos]                   = useState("br");   // tl|tc|tr|bl|bc|br
  const [compressResult,setCompressResult]     = useState(null); // {before,after}
  const [ocrLang,setOcrLang]                  = useState("eng");
  const [pageOrder,setPageOrder]              = useState([]); // [{idx,thumb}] para organize-pdf
  const [orgDrag,setOrgDrag]                  = useState(null);
  const [thumbsReady,setThumbsReady]          = useState(false);
  const [thumbDataUrl,setThumbDataUrl]        = useState(null);
  const [pdfMeta,setPdfMeta]                 = useState(null); // {pages, encrypted}
  // annotate-pdf
  const [annotations,setAnnotations]         = useState([]); // [{page,text,pos,size,color}]
  const [annotText,setAnnotText]             = useState("");
  const [annotPage,setAnnotPage]             = useState(1);
  const [annotPos,setAnnotPos]               = useState("tc");
  const [annotSize,setAnnotSize]             = useState(16);
  const [annotColor,setAnnotColor]           = useState("red");
  // redact-pdf
  const [redactZones,setRedactZones]         = useState([]); // [{page,x,y,w,h}]
  const [redactPage,setRedactPage]           = useState(1);
  const [redactX,setRedactX]                 = useState(10);
  const [redactY,setRedactY]                 = useState(10);
  const [redactW,setRedactW]                 = useState(80);
  const [redactH,setRedactH]                 = useState(10);
  const ref = useRef();
  const progressTimer = useRef(null);
  const convertRef    = useRef(null);

  const isMulti = !!(tool.multi || tool.batch);

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
    setFiles(p => isMulti ? [...p,...ok] : [ok[0]]);
  };

  // Pre-load file passed from home drag-and-drop
  useEffect(() => {
    if (preloadedFile) addFiles([preloadedFile]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate thumbnail + PDF metadata for first file (combined to load PDF once)
  useEffect(() => {
    const f = files[0];
    if (!f) { setThumbDataUrl(null); setPdfMeta(null); return; }
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setThumbDataUrl(url); setPdfMeta(null);
      return () => URL.revokeObjectURL(url);
    }
    if (f.name.toLowerCase().endsWith(".pdf")) {
      let cancelled = false;
      (async () => {
        try {
          await ensurePdfJs();
          const bytes = await f.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
          if (cancelled) return;
          setPdfMeta({ pages: pdf.numPages, encrypted: false });
          const page = await pdf.getPage(1);
          const vp   = page.getViewport({ scale: 0.5 });
          const cv   = document.createElement("canvas");
          cv.width = vp.width; cv.height = vp.height;
          await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
          if (!cancelled) setThumbDataUrl(cv.toDataURL("image/jpeg", 0.7));
        } catch(e) {
          const isEnc = /password|encrypt/i.test(e.message||"");
          if (!cancelled) { setPdfMeta({ pages: null, encrypted: isEnc }); setThumbDataUrl(null); }
        }
      })();
      return () => { cancelled = true; };
    }
    setThumbDataUrl(null); setPdfMeta(null);
  }, [files[0]?.name, files[0]?.size]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep convertRef current so the keyboard handler always calls the latest version
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { convertRef.current = convert; });

  // Enter key → convert (when not focused on input/button)
  useEffect(() => {
    const h = e => {
      if (e.key !== "Enter") return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "SELECT") return;
      const canConvert = files.length > 0 && status === "idle" &&
        !(tool.id === "sign-pdf"     && !signatureDataUrl) &&
        !(tool.id === "organize-pdf" && (!thumbsReady || pageOrder.length === 0));
      if (canConvert) { e.preventDefault(); convertRef.current?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [files.length, status, signatureDataUrl, thumbsReady, pageOrder.length, tool.id]);

  // Generar miniaturas para el organizador de páginas
  useEffect(() => {
    if (tool.id !== "organize-pdf" || files.length === 0) {
      setPageOrder([]); setThumbsReady(false); return;
    }
    let cancelled = false;
    setThumbsReady(false); setPageOrder([]);
    (async () => {
      try {
        await ensurePdfJs();
        const bytes  = await files[0].arrayBuffer();
        const pdfSrc = await window.pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
        const items  = [];
        for (let i = 1; i <= pdfSrc.numPages; i++) {
          if (cancelled) return;
          const page = await pdfSrc.getPage(i);
          const vp   = page.getViewport({ scale: 0.4 });
          const cv   = document.createElement("canvas");
          cv.width = vp.width; cv.height = vp.height;
          await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
          items.push({ idx: i - 1, thumb: cv.toDataURL("image/jpeg", 0.6) });
        }
        if (!cancelled) { setPageOrder(items); setThumbsReady(true); }
      } catch(e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, [tool.id, files]);

  const getErrMsg = (e) => {
    const msg = (e.message || "").toLowerCase();
    if (files[0] && files[0].size > 200 * 1024 * 1024) return T.err_size;
    if (msg.includes("encrypt") || msg.includes("password") || msg.includes("protected")) return T.err_protected;
    if (msg.includes("range") || msg.includes("rango")) return T.err_range;
    if (msg.includes("invalid") || msg.includes("corrupt") || msg.includes("unexpected")) return T.err_corrupt;
    return T.err_generic;
  };

  const startProgress = () => {
    setProgress(0);
    const totalKB   = files.reduce((s, f) => s + f.size, 0) / 1024;
    const duration  = Math.max(1200, Math.min(totalKB * 0.5, 10000));
    const startTime = Date.now();
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(88, Math.round((elapsed / duration) * 88));
      setProgress(pct);
      if (pct >= 88) clearInterval(progressTimer.current);
    }, 50);
  };

  const finishOk = (histName) => {
    clearInterval(progressTimer.current);
    setProgress(100);
    setStatus("done");
    showToast(T.conv_done);
    bumpCount();
    const label = histName ?? files[0]?.name;
    addToHistory(label, tool.label, files[0]?.size);
    notifyDone(label);
  };

  const convert = async () => {
    const maxSize = 200 * 1024 * 1024;
    if (files.some(f => f.size > maxSize)) { setErrMsg(T.err_size); setStatus("error"); return; }
    if (!checkLimits(files, tool.id)) return;

    requestNotifyPermission();
    setStatus("proc");
    setErrMsg("");
    startProgress();

    try {
      /* ── Batch: múltiples archivos con tool.batch → ZIP ───────────────── */
      if (tool.batch && files.length > 1) {
        const items = [];
        for (let i = 0; i < files.length; i++) {
          setProgress(Math.round(10 + (i / files.length) * 75));
          const f = files[i];
          let blob, outName;
          if (tool.id === "compress") {
            blob = await compressPdfToBlob(f, quality);
            outName = `${basename(f)}-comprimido.pdf`;
          } else if (tool.id === "rotate") {
            blob = await rotatePdfToBlob(f, rotation);
            outName = `${basename(f)}-rotado.pdf`;
          } else if (tool.id === "png-jpg") {
            blob = await pngToJpgBlob(f);
            outName = `${basename(f)}.jpg`;
          } else if (tool.id === "jpg-png") {
            blob = await jpgToPngBlob(f);
            outName = `${basename(f)}.png`;
          } else if (tool.id === "watermark-pdf") {
            blob = await watermarkPdfToBlob(f, watermarkText);
            outName = `${basename(f)}-watermark.pdf`;
          } else if (tool.id === "number-pages") {
            blob = await numberPagesPdfToBlob(f);
            outName = `${basename(f)}-numerado.pdf`;
          } else if (tool.id === "crop-pdf") {
            blob = await cropPdfToBlob(f, cropMargins);
            outName = `${basename(f)}-recortado.pdf`;
          } else if (tool.id === "grayscale-pdf") {
            blob = await grayscalePdfToBlob(f);
            outName = `${basename(f)}-grises.pdf`;
          } else if (tool.id === "unlock-pdf") {
            blob = await unlockPdfToBlob(f);
            outName = `${basename(f)}-unlocked.pdf`;
          }
          if (blob) items.push({ filename: outName, blob });
        }
        clearInterval(progressTimer.current);
        setProgress(90);
        await downloadAsZip(items);
        finishOk(`${files.length} archivos`);
        return;
      }

      /* ── Conversiones individuales ─────────────────────────────────────── */
      if (tool.id==="merge")         { await mergePdfs(files); }
      else if (tool.id==="split")    { await splitPdf(files[0], range); }
      else if (tool.id==="img-pdf")  { await imagesToPdf(files); }
      else if (tool.id==="compress") {
        const blob = await compressPdfToBlob(files[0], quality);
        setCompressResult({before: files[0].size, after: blob.size});
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = `${basename(files[0])}-comprimido.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      else if (tool.id==="word-pdf") {
        const res = await wordToPdf(files[0]);
        clearInterval(progressTimer.current);
        if (res === "popup-blocked") { setErrMsg(T.err_popup); setStatus("error"); return; }
        setProgress(100); showToast(T.conv_done); bumpCount();
        addToHistory(files[0]?.name, tool.label, files[0]?.size);
        notifyDone(files[0]?.name);
        setStatus("idle"); setFiles([]); return;
      }
      else if (tool.id==="pdf-word")  { await pdfToWord(files[0]); }
      else if (tool.id==="png-jpg")   { await pngToJpg(files[0]); }
      else if (tool.id==="jpg-png")   { await jpgToPng(files[0]); }
      else if (tool.id==="rotate")    { await rotatePdf(files[0], rotation); }
      else if (tool.id==="excel-pdf") {
        const res = await excelToPdf(files[0]);
        clearInterval(progressTimer.current);
        if (res === "popup-blocked") { setErrMsg(T.err_popup); setStatus("error"); return; }
        setProgress(100); showToast(T.conv_done); bumpCount();
        addToHistory(files[0]?.name, tool.label, files[0]?.size);
        notifyDone(files[0]?.name);
        setStatus("idle"); setFiles([]); return;
      }
      else if (tool.id==="pdf-pptx")      { await pdfToPptx(files[0]); }
      else if (tool.id==="pdf-excel")     { await pdfToExcel(files[0]); }
      else if (tool.id==="watermark-pdf") { await watermarkPdf(files[0], watermarkText); }
      else if (tool.id==="number-pages")  { await numberPagesPdf(files[0]); }
      else if (tool.id==="crop-pdf")      { await cropPdf(files[0], cropMargins); }
      else if (tool.id==="grayscale-pdf") { await grayscalePdf(files[0]); }
      else if (tool.id==="unlock-pdf")    { await unlockPdf(files[0]); }
      else if (tool.id==="sign-pdf") {
        if (!signatureDataUrl) { setErrMsg("Dibuja tu firma antes de continuar."); setStatus("error"); return; }
        await signPdfV2(files[0], signatureDataUrl, signPage==="num" ? signPageNum : signPage, signPos);
      }
      else if (tool.id==="repair-pdf")   { await repairPdf(files[0]); }
      else if (tool.id==="flatten-pdf")  { await flattenPdf(files[0]); }
      else if (tool.id==="annotate-pdf") {
        if (!annotations.length) { setErrMsg("Añade al menos una anotación."); setStatus("error"); return; }
        await annotatePdf(files[0], annotations);
      }
      else if (tool.id==="redact-pdf") {
        if (!redactZones.length) { setErrMsg("Añade al menos una zona de redacción."); setStatus("error"); return; }
        await redactPdf(files[0], redactZones);
      }
      else if (tool.id==="ocr-searchable") {
        await ocrSearchablePdf(files[0], ocrLang, pct => setProgress(pct));
      }
      else if (tool.id==="pdf-markdown") {
        await pdfToMarkdown(files[0], pct => setProgress(pct));
      }
      else if (tool.id==="html-pdf") {
        const res = await htmlToPdf(files[0]);
        clearInterval(progressTimer.current);
        if (res === "popup-blocked") { setErrMsg(T.err_popup); setStatus("error"); return; }
        setProgress(100); showToast(T.conv_done); bumpCount();
        addToHistory(files[0]?.name, tool.label, files[0]?.size);
        notifyDone(files[0]?.name);
        setStatus("idle"); setFiles([]); return;
      }
      else if (tool.id==="ocr-pdf") {
        await ocrPdf(files[0], ocrLang, pct => setProgress(pct));
      }
      else if (tool.id==="pptx-pdf") {
        const res = await pptxToPdf(files[0]);
        clearInterval(progressTimer.current);
        if (res==="popup-blocked") { setErrMsg(T.err_popup); setStatus("error"); return; }
        setProgress(100); showToast(T.conv_done); bumpCount();
        addToHistory(files[0]?.name, tool.label, files[0]?.size);
        notifyDone(files[0]?.name);
        setStatus("idle"); setFiles([]); return;
      }
      else if (tool.id==="pdf-img") {
        await pdfToImages(files[0], pct => setProgress(pct));
      }
      else if (tool.id==="organize-pdf") {
        if (pageOrder.length===0) { setErrMsg("No quedan páginas para guardar."); setStatus("error"); return; }
        await organizePdf(files[0], pageOrder.map(item => item.idx));
      }
      else if (tool.id==="delete-pages") {
        await deletePagesPdf(files[0], range);
      }

      finishOk();
    } catch(e) {
      clearInterval(progressTimer.current);
      console.error(e);
      setProgress(0);
      setErrMsg(getErrMsg(e));
      setStatus("error");
    }
  };

  const dl = () => { setStatus("idle"); setFiles([]); setCompressResult(null); setSignatureDataUrl(null); setSignPage("last"); setSignPageNum(1); setSignPos("br"); setPageOrder([]); setThumbsReady(false); setThumbDataUrl(null); setPdfMeta(null); };

  return (
    <>
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
              <div style={{fontSize:12,color:"var(--tm)",marginBottom:compressResult?8:18}}>
                {files.length} {files.length===1?T.done_sub_s:T.done_sub_p}
              </div>
              {compressResult&&(()=>{
                const saving = Math.round((1 - compressResult.after / compressResult.before) * 100);
                const fmt = b => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;
                return (
                  <div style={{marginBottom:18,padding:"8px 14px",background:"var(--al)",borderRadius:8,
                    display:"inline-flex",alignItems:"center",gap:8,fontSize:12}}>
                    <span style={{color:"var(--tm)"}}>{fmt(compressResult.before)}</span>
                    <span style={{color:"var(--tm)"}}>→</span>
                    <span style={{fontWeight:600,color:"var(--ac)"}}>{fmt(compressResult.after)}</span>
                    {saving > 0 && <span style={{fontSize:10,background:"#F0FDF4",color:"var(--ok)",
                      borderRadius:4,padding:"1px 6px",fontWeight:600}}>-{saving}%</span>}
                  </div>
                );
              })()}
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                <button className="bg" onClick={()=>{ setStatus("idle"); setCompressResult(null); }}>
                  {T.reconvert||"Repetir conversión"}
                </button>
                <button className="bg" onClick={dl}>{T.other}</button>
              </div>
              {/* Next tool suggestions */}
              {onGoToTool && (NEXT_TOOLS[tool.id]||[]).length > 0 && (()=>{
                const nextTools = (NEXT_TOOLS[tool.id]||[]).slice(0,3).map(id=>{
                  const idx = TOOL_BASE.findIndex(t=>t.id===id);
                  if (idx<0) return null;
                  return { ...TOOL_BASE[idx], ...(T.t?.[idx]||{}) };
                }).filter(Boolean);
                if (!nextTools.length) return null;
                return (
                  <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--bd)"}}>
                    <div style={{fontSize:11,color:"var(--tm)",marginBottom:8}}>{T.next_tool||"Prueba también"}</div>
                    <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                      {nextTools.map(nt=>(
                        <button key={nt.id} className="bg"
                          style={{fontSize:11,padding:"5px 10px",display:"inline-flex",alignItems:"center",gap:4}}
                          onClick={()=>{ dl(); onGoToTool(nt); }}>
                          <Ic n={nt.icon} s={11} c="var(--t2)"/>
                          {nt.label||nt.id}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Share tool */}
              <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--bd)"}}>
                <div style={{fontSize:11,color:"var(--tm)",marginBottom:8}}>{T.share_hint||"¿Te ha sido útil? Comparte la herramienta"}</div>
                <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                  {typeof navigator.share==="function"&&(
                    <button className="bg" style={{fontSize:11,padding:"5px 10px",display:"inline-flex",alignItems:"center",gap:4}}
                      onClick={()=>navigator.share({title:"morf — "+tool.label,text:tool.desc,url:window.location.href}).catch(()=>{})}>
                      <Ic n="share" s={11} c="var(--t2)"/> {T.share_native||"Compartir"}
                    </button>
                  )}
                  <a href={`https://wa.me/?text=${encodeURIComponent("Convierte PDFs gratis sin registrarte → "+window.location.href)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{fontSize:11,padding:"5px 10px",border:"1px solid var(--bd)",borderRadius:6,
                      background:"var(--sf)",color:"var(--t2)",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,fontFamily:"'DM Sans',sans-serif"}}>
                    WhatsApp
                  </a>
                  <a href={`mailto:?subject=${encodeURIComponent("morf — "+tool.label)}&body=${encodeURIComponent(tool.desc+"\n\n"+window.location.href)}`}
                    style={{fontSize:11,padding:"5px 10px",border:"1px solid var(--bd)",borderRadius:6,
                      background:"var(--sf)",color:"var(--t2)",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,fontFamily:"'DM Sans',sans-serif"}}>
                    Email
                  </a>
                </div>
              </div>
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
              {tool.comingSoon ? (
                <div style={{textAlign:"center",padding:"28px 0"}}>
                  <div style={{width:46,height:46,borderRadius:"50%",background:"var(--al)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                    <Ic n={tool.icon} s={22} c="var(--ac)"/>
                  </div>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:6,color:"var(--ac)"}}>Próximamente</div>
                  <div style={{fontSize:13,color:"var(--t2)",maxWidth:300,margin:"0 auto 18px",lineHeight:1.6}}>{T.coming_soon_desc||"Estamos trabajando en esta herramienta. Disponible muy pronto."}</div>
                  <button className="bg" onClick={onClose}>{T.cancel}</button>
                </div>
              ) : (<>
              <input ref={ref} type="file"
                accept={[...(tool.accepts||[]),...(tool.mimeTypes||[])].join(",")}
                multiple={isMulti}
                style={{display:"none"}}
                onChange={e=>{ addFiles(e.target.files); e.target.value=""; }}/>

              {/* Drop zone — visible si no hay archivos o herramienta no es multi/batch */}
              {(!isMulti || files.length===0) && (
                <div className={`dz ${drag?"ov":""}`}
                  role="button" tabIndex={0}
                  aria-label={isMulti?T.drag_multi:T.drag_single}
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
                    {isMulti?T.drag_multi:T.drag_single}
                  </div>
                  <div style={{fontSize:11,color:"var(--tm)"}}>{T.click_hint} · {tool.accepts.join(", ")} · {T.max_size}</div>
                  {/* Importar desde la nube */}
                  <div style={{marginTop:12,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}
                    onClick={e=>e.stopPropagation()}>
                    <span style={{fontSize:10,color:"var(--tm)",alignSelf:"center"}}>o importa desde</span>
                    <DropboxImportButton onFiles={l=>{addFiles(l);}} accepts={tool.accepts}/>
                    <GoogleDriveImportButton onFiles={l=>{addFiles(l);}}/>
                  </div>
                </div>
              )}

              {/* Lista de archivos */}
              {files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:isMulti?8:0}}>
                    {files.map((f,i)=>(
                      <div key={i}
                        draggable={isMulti}
                        onDragStart={()=>setDragIdx(i)}
                        onDragOver={e=>e.preventDefault()}
                        onDrop={e=>{
                          e.preventDefault();
                          if(dragIdx===null||dragIdx===i)return;
                          setFiles(p=>{const n=[...p];const[m]=n.splice(dragIdx,1);n.splice(i,0,m);return n;});
                          setDragIdx(null);
                        }}
                        onDragEnd={()=>setDragIdx(null)}
                        style={{opacity:dragIdx===i?.4:1,transition:"opacity .15s",cursor:isMulti?"grab":"default"}}>
                        <FileRow file={f}
                          onRemove={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                          onPreview={()=>setPreviewFile(f)}
                          showHandle={isMulti} index={i}/>
                      </div>
                    ))}
                  </div>
                  {isMulti&&(()=>{
                    const isFreeLimit = BATCH_TOOL_IDS.has(tool.id) && !localStorage.getItem("morf_pro") && files.length >= 2;
                    return isFreeLimit ? (
                      <div style={{padding:"10px 12px",background:"var(--al)",border:"1px solid var(--ac)",
                        borderRadius:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                        <span style={{fontSize:11,color:"var(--ac)"}}>{T.merge_hint}</span>
                        <button className="bp" style={{fontSize:10,padding:"4px 10px",borderRadius:5}}
                          onClick={()=>checkLimits([...files,{size:0,name:"x"}],tool.id)}>Pro</button>
                      </div>
                    ) : (
                      <div className={`dz ${drag?"ov":""}`}
                        style={{padding:"12px",textAlign:"center",cursor:"pointer",borderStyle:"dashed"}}
                        onDragOver={e=>{e.preventDefault();setDrag(true)}}
                        onDragLeave={()=>setDrag(false)}
                        onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
                        onClick={()=>ref.current?.click()}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--t2)"}}>
                          <Ic n="upload" s={13} c="var(--t2)"/>
                          Añadir más archivos
                          {tool.batch && files.length > 0 && (
                            <span style={{fontSize:10,color:"var(--tm)"}}>({files.length} seleccionados → ZIP)</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* PDF metadata badges */}
              {pdfMeta && files.length===1 && status!=="proc" && (
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10,marginTop:-4}}>
                  {pdfMeta.pages && (
                    <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--tm)",
                      background:"var(--bd)",borderRadius:3,padding:"2px 6px"}}>
                      {pdfMeta.pages} {pdfMeta.pages===1?"página":"páginas"}
                    </span>
                  )}
                  {pdfMeta.encrypted && (
                    <span style={{fontSize:10,fontWeight:600,color:"#92400E",
                      background:"#FEF3C7",borderRadius:3,padding:"2px 6px"}}>
                      {T.err_protected||"Protegido con contraseña"}
                    </span>
                  )}
                </div>
              )}

              {tool.id==="split"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:5}}>{T.pages_label}</div>
                  <input value={range} onChange={e=>setRange(e.target.value)} placeholder={T.pages_ph}
                    className="fi-inp" style={{fontFamily:"'DM Mono',monospace",fontSize:12}}
                    onFocus={e=>e.target.style.borderColor="var(--ac)"}
                    onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                  {/* Live range preview */}
                  {pdfMeta?.pages && range.trim() && (()=>{
                    try {
                      const idxs = parsePageRange(range, pdfMeta.pages);
                      return (
                        <div style={{marginTop:5,fontSize:10,color:"var(--ac)",fontFamily:"'DM Mono',monospace"}}>
                          ✓ {idxs.length} {idxs.length===1?"página":"páginas"} de {pdfMeta.pages}
                        </div>
                      );
                    } catch {
                      return <div style={{marginTop:5,fontSize:10,color:"#B91C1C"}}>Rango inválido</div>;
                    }
                  })()}
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
              {tool.id==="watermark-pdf"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:5}}>{T.watermark_label||"Texto de marca de agua"}</div>
                  <input value={watermarkText} onChange={e=>setWatermarkText(e.target.value)}
                    placeholder="CONFIDENCIAL" className="fi-inp" style={{fontSize:13}}
                    onFocus={e=>e.target.style.borderColor="var(--ac)"}
                    onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                </div>
              )}
              {tool.id==="crop-pdf"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:6}}>{T.crop_label||"Márgenes a recortar (mm)"}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["top",T.crop_top||"Arriba"],["bottom",T.crop_bottom||"Abajo"],
                      ["left",T.crop_left||"Izquierda"],["right",T.crop_right||"Derecha"]].map(([k,l])=>(
                      <div key={k}>
                        <div style={{fontSize:10,color:"var(--tm)",marginBottom:3}}>{l}</div>
                        <input type="number" min="0" max="100"
                          value={cropMargins[k]}
                          onChange={e=>setCropMargins(p=>({...p,[k]:Math.max(0,Number(e.target.value))}))}
                          className="fi-inp" style={{fontSize:13,textAlign:"center"}}
                          onFocus={e=>e.target.style.borderColor="var(--ac)"}
                          onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tool.id==="sign-pdf"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:6}}>{T.sign_label||"Dibuja tu firma"}</div>
                  <SignaturePad onChange={setSignatureDataUrl}/>
                  {/* Página */}
                  <div style={{marginTop:10,marginBottom:6}}>
                    <div style={{fontSize:10,fontWeight:500,color:"var(--t2)",marginBottom:5}}>Página</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {[["first","Primera"],["last","Última"],["all","Todas"],["num","Nº específico"]].map(([v,l])=>(
                        <button key={v} onClick={()=>setSignPage(v)}
                          style={{padding:"4px 10px",fontSize:10,border:`1px solid ${signPage===v?"var(--ac)":"var(--bd)"}`,
                            borderRadius:5,background:signPage===v?"var(--al)":"transparent",
                            color:signPage===v?"var(--ac)":"var(--t2)",cursor:"pointer",fontWeight:signPage===v?500:400}}>
                          {l}
                        </button>
                      ))}
                    </div>
                    {signPage==="num"&&(
                      <input type="number" min={1} max={pdfMeta?.pages||999}
                        value={signPageNum} onChange={e=>setSignPageNum(Math.max(1,Number(e.target.value)))}
                        className="fi-inp" style={{marginTop:6,width:80,fontSize:12,textAlign:"center",fontFamily:"'DM Mono',monospace"}}
                        onFocus={e=>e.target.style.borderColor="var(--ac)"}
                        onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                    )}
                  </div>
                  {/* Posición (3×2 grid visual) */}
                  <div>
                    <div style={{fontSize:10,fontWeight:500,color:"var(--t2)",marginBottom:5}}>Posición</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,30px)",gap:3,width:"fit-content"}}>
                      {[["tl","↖"],["tc","↑"],["tr","↗"],["bl","↙"],["bc","↓"],["br","↘"]].map(([v,arrow])=>(
                        <button key={v} onClick={()=>setSignPos(v)}
                          style={{width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:14,border:`1px solid ${signPos===v?"var(--ac)":"var(--bd)"}`,
                            borderRadius:5,background:signPos===v?"var(--al)":"transparent",
                            color:signPos===v?"var(--ac)":"var(--t2)",cursor:"pointer"}}>
                          {arrow}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {tool.id==="ocr-pdf"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:6}}>{T.ocr_lang_label||"Idioma del documento"}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[["eng","English"],["spa","Español"],["fra","Français"],["deu","Deutsch"],["por","Português"]].map(([code,name])=>(
                      <button key={code} onClick={()=>setOcrLang(code)}
                        style={{padding:"5px 12px",border:`1px solid ${ocrLang===code?"var(--ac)":"var(--bd)"}`,borderRadius:6,
                          fontSize:11,background:ocrLang===code?"var(--al)":"transparent",
                          color:ocrLang===code?"var(--ac)":"var(--t2)",cursor:"pointer",fontWeight:ocrLang===code?500:400,transition:"all .16s"}}>
                        {name}
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:"var(--tm)",marginTop:6}}>{T.ocr_hint||"La primera ejecución descarga ~14 MB de datos de idioma."}</div>
                </div>
              )}
              {tool.id==="organize-pdf"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  {!thumbsReady?(
                    <div style={{fontSize:12,color:"var(--tm)",textAlign:"center",padding:"20px 0",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <div className="spn"/>Generando miniaturas…
                    </div>
                  ):(
                    <>
                      <div style={{fontSize:11,color:"var(--t2)",marginBottom:8}}>
                        {T.organize_hint||"Arrastra para reordenar · Clic en ✕ para eliminar"}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))",gap:6,maxHeight:320,overflowY:"auto",padding:"2px"}}>
                        {pageOrder.map((item,i)=>(
                          <div key={`${item.idx}-${i}`}
                            draggable
                            onDragStart={()=>setOrgDrag(i)}
                            onDragOver={e=>e.preventDefault()}
                            onDrop={e=>{e.preventDefault();if(orgDrag===null||orgDrag===i)return;setPageOrder(p=>{const n=[...p];const[m]=n.splice(orgDrag,1);n.splice(i,0,m);return n;});setOrgDrag(null);}}
                            onDragEnd={()=>setOrgDrag(null)}
                            style={{position:"relative",cursor:"grab",opacity:orgDrag===i?.35:1,transition:"opacity .15s",userSelect:"none"}}>
                            <img src={item.thumb} alt={`p${item.idx+1}`}
                              style={{width:"100%",borderRadius:4,border:"1px solid var(--bd)",display:"block"}}/>
                            <span style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",
                              fontSize:8,background:"rgba(0,0,0,.6)",color:"#fff",borderRadius:3,padding:"1px 5px",
                              fontFamily:"'DM Mono',monospace",pointerEvents:"none",whiteSpace:"nowrap"}}>
                              p.{i+1}
                            </span>
                            <button
                              onClick={()=>setPageOrder(p=>p.filter((_,j)=>j!==i))}
                              style={{position:"absolute",top:2,right:2,background:"rgba(185,28,28,.85)",color:"#fff",
                                border:"none",borderRadius:"50%",width:16,height:16,fontSize:9,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}
                              aria-label={`Eliminar página ${i+1}`}>✕</button>
                          </div>
                        ))}
                      </div>
                      {pageOrder.length===0&&(
                        <div style={{fontSize:12,color:"var(--tm)",textAlign:"center",padding:"12px 0"}}>
                          {T.organize_empty||"No quedan páginas. Vuelve a subir el archivo."}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {tool.id==="delete-pages"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:5}}>
                    {T.del_pages_label||"Páginas a eliminar (ej. 1-3, 5, 7-9)"}
                  </div>
                  <input value={range} onChange={e=>setRange(e.target.value)} placeholder="1, 3, 5-7"
                    className="fi-inp" style={{fontFamily:"'DM Mono',monospace",fontSize:12}}
                    onFocus={e=>e.target.style.borderColor="var(--ac)"}
                    onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                </div>
              )}
              {/* ── annotate-pdf UI ── */}
              {tool.id==="annotate-pdf"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--t2)",marginBottom:8}}>
                    {T.annot_add||"Añadir anotación de texto"}
                  </div>
                  <input value={annotText} onChange={e=>setAnnotText(e.target.value)}
                    placeholder={T.annot_text||"Texto de la anotación…"}
                    className="fi-inp" style={{marginBottom:8}}
                    onFocus={e=>e.target.style.borderColor="var(--ac)"}
                    onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                    <label style={{fontSize:11,color:"var(--t2)"}}>{T.annot_page||"Página"}</label>
                    <input type="number" min={1} max={pdfMeta?.pages||999} value={annotPage}
                      onChange={e=>setAnnotPage(Math.max(1,Number(e.target.value)))}
                      style={{width:56,padding:"3px 6px",border:"1px solid var(--bd)",borderRadius:5,fontSize:12,background:"var(--bg)"}}/>
                    <label style={{fontSize:11,color:"var(--t2)",marginLeft:6}}>{T.annot_size||"Tamaño"}</label>
                    <input type="number" min={8} max={72} value={annotSize}
                      onChange={e=>setAnnotSize(Math.max(8,Number(e.target.value)))}
                      style={{width:56,padding:"3px 6px",border:"1px solid var(--bd)",borderRadius:5,fontSize:12,background:"var(--bg)"}}/>
                    {["red","blue","black"].map(c=>(
                      <button key={c} onClick={()=>setAnnotColor(c)}
                        style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${annotColor===c?"var(--ac)":"transparent"}`,
                          background:c==="red"?"#e11d48":c==="blue"?"#2563eb":"#111",cursor:"pointer",padding:0}}/>
                    ))}
                  </div>
                  {/* Position 3x3 grid */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginBottom:8}}>
                    {[["tl","↖"],["tc","↑"],["tr","↗"],["ml","←"],["mc","·"],["mr","→"],["bl","↙"],["bc","↓"],["br","↘"]].map(([v,arrow])=>(
                      <button key={v} onClick={()=>setAnnotPos(v)}
                        style={{padding:"5px",fontSize:13,border:`1px solid ${annotPos===v?"var(--ac)":"var(--bd)"}`,
                          borderRadius:5,background:annotPos===v?"var(--al)":"transparent",
                          color:annotPos===v?"var(--ac)":"var(--t2)",cursor:"pointer"}}>
                        {arrow}
                      </button>
                    ))}
                  </div>
                  <button className="bg" style={{fontSize:12,marginBottom:8}} onClick={()=>{
                    if(!annotText.trim()) return;
                    setAnnotations(a=>[...a,{page:annotPage,text:annotText,pos:annotPos,size:annotSize,color:annotColor}]);
                    setAnnotText("");
                  }}>{T.annot_add_btn||"+ Añadir"}</button>
                  {annotations.map((a,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,padding:"4px 8px",
                      background:"var(--al)",borderRadius:5,fontSize:11}}>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        p.{a.page} · {a.text}
                      </span>
                      <button onClick={()=>setAnnotations(aa=>aa.filter((_,j)=>j!==i))}
                        style={{background:"none",border:"none",cursor:"pointer",color:"var(--t2)",fontSize:14,lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* ── redact-pdf UI ── */}
              {tool.id==="redact-pdf"&&files.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--t2)",marginBottom:8}}>
                    {T.redact_add||"Añadir zona de redacción (en % del tamaño de página)"}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                    {[["Página",redactPage,setRedactPage,1,999,1],
                      ["X %",redactX,setRedactX,0,100,0.1],
                      ["Y %",redactY,setRedactY,0,100,0.1],
                      ["Ancho %",redactW,setRedactW,1,100,0.1],
                      ["Alto %",redactH,setRedactH,1,100,0.1]].map(([label,val,setter,min,max,step])=>(
                      <label key={label} style={{fontSize:11,color:"var(--t2)"}}>
                        {label}
                        <input type="number" min={min} max={max} step={step} value={val}
                          onChange={e=>setter(Number(e.target.value))}
                          style={{display:"block",width:"100%",padding:"4px 6px",border:"1px solid var(--bd)",
                            borderRadius:5,fontSize:12,marginTop:2,background:"var(--bg)"}}/>
                      </label>
                    ))}
                  </div>
                  <button className="bg" style={{fontSize:12,marginBottom:8}} onClick={()=>{
                    setRedactZones(z=>[...z,{page:redactPage,x:redactX,y:redactY,w:redactW,h:redactH}]);
                  }}>{T.redact_add_btn||"+ Añadir zona"}</button>
                  {redactZones.map((z,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,padding:"4px 8px",
                      background:"var(--al)",borderRadius:5,fontSize:11}}>
                      <span style={{flex:1}}>p.{z.page} · X:{z.x}% Y:{z.y}% {z.w}×{z.h}%</span>
                      <button onClick={()=>setRedactZones(zz=>zz.filter((_,j)=>j!==i))}
                        style={{background:"none",border:"none",cursor:"pointer",color:"var(--t2)",fontSize:14,lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* ── chat-pdf: full chat UI ── */}
              {tool.id==="chat-pdf" && files.length>0 && status!=="proc" && (
                <ChatPdf file={files[0]} showToast={showToast} />
              )}
              {/* ── visual-annotate: canvas editor ── */}
              {tool.id==="visual-annotate" && files.length>0 && status!=="proc" && (
                <VisualAnnotate file={files[0]} showToast={showToast} />
              )}
              {/* ── summarize-pdf: AI one-shot summary ── */}
              {tool.id==="summarize-pdf" && files.length>0 && status!=="proc" && (
                <SummarizePdf file={files[0]} />
              )}
              {/* ── compare-pdf: text diff ── */}
              {tool.id==="compare-pdf" && files.length>0 && status!=="proc" && (
                <ComparePdf file={files[0]} />
              )}
              {/* ── ocr-searchable: lang selector (reuses ocrLang state) ── */}
              {tool.id==="ocr-searchable" && files.length>0 && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:5}}>
                    {T.ocr_lang_label||"Idioma del documento"}
                  </div>
                  <select value={ocrLang} onChange={e=>setOcrLang(e.target.value)}
                    style={{width:"100%",padding:"6px 10px",border:"1px solid var(--bd)",borderRadius:6,
                      background:"var(--bg)",color:"var(--tf)",fontSize:12}}>
                    <option value="eng">English</option>
                    <option value="spa">Español</option>
                    <option value="fra">Français</option>
                    <option value="deu">Deutsch</option>
                    <option value="por">Português</option>
                    <option value="ita">Italiano</option>
                    <option value="chi_sim">中文 (简体)</option>
                    <option value="jpn">日本語</option>
                    <option value="ara">العربية</option>
                    <option value="rus">Русский</option>
                  </select>
                  <div style={{fontSize:10,color:"var(--t2)",marginTop:4}}>
                    {T.ocr_hint||"El OCR descargará los datos del idioma (~4 MB) la primera vez."}
                  </div>
                </div>
              )}
              {/* Thumbnail preview */}
              {!isMulti && files.length===1 && thumbDataUrl && status!=="proc" && tool.id!=="organize-pdf" && tool.id!=="visual-annotate" && (
                <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
                  <div style={{position:"relative",width:80,height:110,borderRadius:6,overflow:"hidden",
                    border:"1px solid var(--bd)",boxShadow:"0 2px 12px rgba(0,0,0,.1)",flexShrink:0}}>
                    <img src={thumbDataUrl} alt="preview"
                      style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",display:"block"}}/>
                  </div>
                </div>
              )}
              {status==="proc"&&(
                <div style={{marginBottom:16,padding:"14px 16px",background:"var(--al)",borderRadius:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:11,color:"var(--tm)"}}>
                      {files.length} {files.length===1?"archivo":"archivos"} · {(files.reduce((s,f)=>s+f.size,0)/1048576).toFixed(1)} MB
                      {tool.batch && files.length > 1 && " → ZIP"}
                    </span>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--ac)",fontFamily:"'DM Mono',monospace"}}>{progress}%</span>
                  </div>
                  <div style={{height:4,background:"var(--bd)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${progress}%`,background:"var(--ac)",borderRadius:2,transition:"width .08s linear"}}/>
                  </div>
                </div>
              )}
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="bg" onClick={onClose}>{T.cancel}</button>
                {!["chat-pdf","visual-annotate","summarize-pdf","compare-pdf"].includes(tool.id) && (
                <button className="bp" disabled={!files.length||status==="proc"||(tool.id==="sign-pdf"&&!signatureDataUrl)||(tool.id==="organize-pdf"&&(!thumbsReady||pageOrder.length===0))||(tool.id==="annotate-pdf"&&!annotations.length)||(tool.id==="redact-pdf"&&!redactZones.length)} onClick={convert}>
                  {status==="proc"
                    ? <><div className="spn"/>{T.processing}</>
                    : <><Ic n="arrow" s={14}/>{tool.batch&&files.length>1?`Convertir ${files.length} archivos`:T.convert}</>
                  }
                </button>
                )}
              </div>
              {files.length>0&&(
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,marginTop:6}}>
                  <Ic n="lock" s={10} c="var(--ok)"/>
                  <span style={{fontSize:10,color:"var(--tm)"}}>{T.privacy_note||"Tu archivo nunca sale de tu navegador"}</span>
                </div>
              )}
            </>)}
            </>
          )}
        </div>
      </div>
      {previewFile&&<FilePreviewModal file={previewFile} onClose={()=>setPreviewFile(null)}/>}
    </>
  );
}

export default Panel;
