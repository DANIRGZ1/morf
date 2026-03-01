import { useState, useEffect, useRef, useCallback } from "react";
import { renderPdfPage, applyEdits } from "../utils/convert";

const COLORS = { red: "#e11d48", blue: "#2563eb", black: "#111" };

export default function VisualAnnotate({ file, showToast }) {
  const canvasRef  = useRef(null);
  const [page, setPage]         = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [dims, setDims]         = useState({ pdfW: 595, pdfH: 842, scale: 1 });
  const [rendering, setRendering] = useState(false);
  const [mode, setMode]         = useState("text"); // "text" | "rect"
  const [textColor, setTextColor] = useState("red");
  const [textSize, setTextSize]   = useState(14);

  // Edits
  const [textEdits, setTextEdits]   = useState([]); // {page, text, x, y, size, color}
  const [redactZones, setRedactZones] = useState([]); // {page, x%, y%, w%, h%}

  // Interaction state
  const [promptPos, setPromptPos]   = useState(null); // {canvasX, canvasY, pdfX, pdfY}
  const [promptText, setPromptText] = useState("");
  const [drag, setDrag]             = useState(null);  // {startX, startY, curX, curY} in canvas coords
  const [applying, setApplying]     = useState(false);

  // Re-render PDF page when file or page changes
  useEffect(() => {
    if (!file || !canvasRef.current) return;
    setRendering(true);
    renderPdfPage(file, page, canvasRef.current)
      .then(({ pdfW, pdfH, scale, numPages: n }) => {
        setDims({ pdfW, pdfH, scale });
        setNumPages(n);
        setRendering(false);
      })
      .catch(() => setRendering(false));
  }, [file, page]);

  // Map browser event coords → canvas pixel coords
  const toCanvas = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx   = canvasRef.current.width  / rect.width;
    const sy   = canvasRef.current.height / rect.height;
    return { cx: (e.clientX - rect.left) * sx, cy: (e.clientY - rect.top) * sy };
  }, []);

  // Canvas pixel → PDF unit (y flipped)
  const toPdf = useCallback(({ cx, cy }) => ({
    pdfX: cx / dims.scale,
    pdfY: dims.pdfH - cy / dims.scale,
  }), [dims]);

  const handleMouseDown = (e) => {
    if (mode !== "rect") return;
    const { cx, cy } = toCanvas(e);
    setDrag({ startX: cx, startY: cy, curX: cx, curY: cy });
  };

  const handleMouseMove = (e) => {
    if (!drag || mode !== "rect") return;
    const { cx, cy } = toCanvas(e);
    setDrag(d => ({ ...d, curX: cx, curY: cy }));
  };

  const handleMouseUp = (e) => {
    if (mode === "text") {
      const { cx, cy } = toCanvas(e);
      const { pdfX, pdfY } = toPdf({ cx, cy });
      setPromptPos({ cx, cy, pdfX, pdfY });
      setPromptText("");
    } else if (drag) {
      const x0 = Math.min(drag.startX, drag.curX);
      const y0 = Math.min(drag.startY, drag.curY);
      const x1 = Math.max(drag.startX, drag.curX);
      const y1 = Math.max(drag.startY, drag.curY);
      const w  = x1 - x0;
      const h  = y1 - y0;
      if (w > 4 && h > 4) {
        setRedactZones(z => [...z, {
          page,
          x: (x0 / dims.scale / dims.pdfW) * 100,
          y: (y0 / dims.scale / dims.pdfH) * 100,
          w: (w  / dims.scale / dims.pdfW) * 100,
          h: (h  / dims.scale / dims.pdfH) * 100,
        }]);
      }
      setDrag(null);
    }
  };

  const confirmText = () => {
    if (!promptText.trim() || !promptPos) return;
    setTextEdits(a => [...a, {
      page,
      text: promptText.trim(),
      x: promptPos.pdfX,
      y: promptPos.pdfY,
      size: textSize,
      color: textColor,
    }]);
    setPromptPos(null);
  };

  const apply = async () => {
    if (!textEdits.length && !redactZones.length) return;
    setApplying(true);
    try {
      await applyEdits(file, textEdits, redactZones);
      showToast?.("PDF editado descargado");
    } catch (e) {
      showToast?.("Error: " + e.message);
    } finally {
      setApplying(false);
    }
  };

  // Build SVG overlay items (convert PDF coords → canvas px → %)
  const canvasW = canvasRef.current?.width  || 595;
  const canvasH = canvasRef.current?.height || 842;

  const textMarkers = textEdits.filter(e => e.page === page).map((e, i) => ({
    key: i,
    xPct: (e.x * dims.scale / canvasW) * 100,
    yPct: ((dims.pdfH - e.y) * dims.scale / canvasH) * 100,
    color: COLORS[e.color],
    label: e.text.slice(0, 20),
  }));

  const rectMarkers = redactZones.filter(z => z.page === page).map((z, i) => ({
    key: i,
    xPct: z.x,
    yPct: z.y,
    wPct: z.w,
    hPct: z.h,
  }));

  const allEdits = textEdits.length + redactZones.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Mode */}
        {[["text", "Texto (clic)"], ["rect", "Redactar (arrastrar)"]].map(([v, label]) => (
          <button key={v} onClick={() => setMode(v)}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6,
              border: `1px solid ${mode === v ? "var(--ac)" : "var(--bd)"}`,
              background: mode === v ? "var(--al)" : "transparent",
              color: mode === v ? "var(--ac)" : "var(--t2)", cursor: "pointer", fontWeight: mode === v ? 600 : 400 }}>
            {label}
          </button>
        ))}
        {/* Color and size for text mode */}
        {mode === "text" && (
          <>
            {Object.entries(COLORS).map(([name, hex]) => (
              <button key={name} onClick={() => setTextColor(name)}
                style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${textColor === name ? "var(--ac)" : "transparent"}`,
                  background: hex, cursor: "pointer", padding: 0, flexShrink: 0 }} />
            ))}
            <select value={textSize} onChange={e => setTextSize(+e.target.value)}
              style={{ padding: "4px 6px", border: "1px solid var(--bd)", borderRadius: 6,
                fontSize: 12, background: "var(--bg)", color: "var(--tf)" }}>
              {[8, 10, 12, 14, 16, 20, 24, 32].map(s => (
                <option key={s} value={s}>{s}pt</option>
              ))}
            </select>
          </>
        )}
        {/* Page nav */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: "4px 10px", border: "1px solid var(--bd)", borderRadius: 6,
              background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>‹</button>
          <span style={{ fontSize: 12, color: "var(--t2)", minWidth: 60, textAlign: "center" }}>
            {page} / {numPages}
          </span>
          <button onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}
            style={{ padding: "4px 10px", border: "1px solid var(--bd)", borderRadius: 6,
              background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>›</button>
        </div>
      </div>

      {/* Hint */}
      <div style={{ fontSize: 11, color: "var(--t2)", textAlign: "center" }}>
        {mode === "text"
          ? "Haz clic en el PDF para colocar una anotación de texto"
          : "Arrastra sobre el PDF para crear una zona de redacción negra"}
      </div>

      {/* Canvas + overlay */}
      <div style={{ position: "relative", border: "1px solid var(--bd)", borderRadius: 8,
        overflow: "hidden", cursor: mode === "text" ? "text" : "crosshair", userSelect: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}>

        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />

        {/* Rendering spinner */}
        {rendering && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.6)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spn" />
          </div>
        )}

        {/* SVG overlay for annotations on current page */}
        {!rendering && (
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none" }}>
            {/* Text annotation markers */}
            {textMarkers.map(m => (
              <g key={m.key}>
                <circle cx={`${m.xPct}%`} cy={`${m.yPct}%`} r={6} fill={m.color} opacity={0.85} />
                <text x={`${m.xPct}%`} y={`${m.yPct}%`} dy={-10}
                  style={{ fontSize: 9, fill: m.color, fontFamily: "sans-serif" }}>
                  {m.label}
                </text>
              </g>
            ))}
            {/* Redact zone markers */}
            {rectMarkers.map(r => (
              <rect key={r.key}
                x={`${r.xPct}%`} y={`${r.yPct}%`}
                width={`${r.wPct}%`} height={`${r.hPct}%`}
                fill="black" opacity={0.5} />
            ))}
            {/* Live drag rect */}
            {drag && mode === "rect" && (() => {
              const x0  = Math.min(drag.startX, drag.curX);
              const y0  = Math.min(drag.startY, drag.curY);
              const w   = Math.abs(drag.curX - drag.startX);
              const h   = Math.abs(drag.curY - drag.startY);
              return (
                <rect
                  x={`${(x0 / canvasW) * 100}%`} y={`${(y0 / canvasH) * 100}%`}
                  width={`${(w / canvasW) * 100}%`} height={`${(h / canvasH) * 100}%`}
                  fill="black" opacity={0.4} stroke="black" strokeWidth={1} />
              );
            })()}
          </svg>
        )}

        {/* Text prompt popup */}
        {promptPos && (
          <div style={{ position: "absolute",
            left: Math.min((promptPos.cx / canvasW) * 100, 70) + "%",
            top: Math.max((promptPos.cy / canvasH) * 100 - 12, 2) + "%",
            transform: "translate(-50%, -100%)",
            background: "var(--bg)", border: "1px solid var(--bd)", borderRadius: 8,
            padding: 10, boxShadow: "0 4px 20px rgba(0,0,0,.2)", zIndex: 10,
            display: "flex", gap: 6, pointerEvents: "all" }}>
            <input autoFocus value={promptText} onChange={e => setPromptText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") confirmText();
                if (e.key === "Escape") setPromptPos(null);
              }}
              placeholder="Texto…"
              style={{ border: "1px solid var(--bd)", borderRadius: 5, padding: "4px 8px",
                fontSize: 12, outline: "none", width: 160, background: "var(--bg)", color: "var(--tf)" }}
            />
            <button onClick={confirmText}
              style={{ padding: "4px 8px", background: "var(--ac)", color: "#fff",
                border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>✓</button>
            <button onClick={() => setPromptPos(null)}
              style={{ padding: "4px 8px", background: "none", border: "1px solid var(--bd)",
                borderRadius: 5, cursor: "pointer", fontSize: 12, color: "var(--t2)" }}>✕</button>
          </div>
        )}
      </div>

      {/* Summary + actions */}
      {allEdits > 0 && (
        <div style={{ background: "var(--al)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tf)", marginBottom: 8 }}>
            {textEdits.length} anotación{textEdits.length !== 1 ? "es" : ""} ·{" "}
            {redactZones.length} zona{redactZones.length !== 1 ? "s" : ""} redactada{redactZones.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {textEdits.map((e, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                background: COLORS[e.color], color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                p.{e.page}: {e.text.slice(0, 18)}
                <button onClick={() => setTextEdits(a => a.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer",
                    fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
            {redactZones.map((z, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                background: "#1f2937", color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                p.{z.page}: rect {Math.round(z.w)}×{Math.round(z.h)}%
                <button onClick={() => setRedactZones(a => a.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer",
                    fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <button className="bp" onClick={apply} disabled={applying}
            style={{ width: "100%", padding: "9px 0", fontSize: 13 }}>
            {applying
              ? <><div className="spn" />Aplicando…</>
              : "⬇ Aplicar y descargar PDF editado"}
          </button>
        </div>
      )}

      {allEdits === 0 && (
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--t2)", paddingTop: 4 }}>
          Añade anotaciones o zonas de redacción y luego descarga el PDF
        </div>
      )}
    </div>
  );
}
