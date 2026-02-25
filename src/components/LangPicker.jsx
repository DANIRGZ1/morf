import { useState, useRef, useEffect } from "react";
import { Ic } from "./icons";
import { LANGS } from "../contexts/LangContext";

/* ── Language Picker ─────────────────────────────────────────────────────── */
function LangPicker({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = LANGS[lang];
  return (
    <div className="lang-wrap" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox" aria-expanded={open} aria-label={`Idioma: ${cur.name}`}>
        <span style={{fontSize:15}} aria-hidden="true">{cur.flag}</span>
        <span>{cur.code.toUpperCase()}</span>
        <Ic n="chevron" s={12} c="var(--tm)" aria-hidden="true"/>
      </button>
      {open && (
        <div className="lang-drop" role="listbox" aria-label="Seleccionar idioma">
          {Object.values(LANGS).map(l => (
            <button key={l.code} className={`lang-opt ${lang===l.code?"sel":""}`}
              role="option" aria-selected={lang===l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}>
              <span style={{fontSize:15}} aria-hidden="true">{l.flag}</span>
              <span>{l.name}</span>
              {lang===l.code && <Ic n="check" s={12} c="var(--ac)" style={{marginLeft:"auto"}} aria-hidden="true"/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LangPicker;
