import { useState, useEffect } from "react";
import { extractPdfText } from "../utils/convert";

const STORAGE_KEY = "morf_anthropic_key";
const MODEL = "claude-haiku-4-5-20251001";

export default function SummarizePdf({ file }) {
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [pdfText, setPdfText]   = useState("");
  const [extracting, setExtracting] = useState(true);
  const [errMsg, setErrMsg]     = useState("");
  const [lang, setLang]         = useState("es");

  useEffect(() => {
    if (!file) return;
    setSummary(null);
    setExtracting(true);
    extractPdfText(file)
      .then(t => { setPdfText(t); setExtracting(false); })
      .catch(() => { setErrMsg("Error al extraer el texto del PDF."); setExtracting(false); });
  }, [file]);

  const saveKey = k => {
    setApiKey(k);
    if (k) localStorage.setItem(STORAGE_KEY, k);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const summarize = async () => {
    if (!apiKey || !pdfText || loading) return;
    setLoading(true);
    setSummary(null);
    setErrMsg("");

    const prompts = {
      es: `Resume el siguiente documento PDF de forma clara y estructurada. Incluye:
1. **Resumen ejecutivo** (2-3 frases)
2. **Puntos clave** (máximo 7 bullets)
3. **Conclusión principal**

Responde en español.`,
      en: `Summarize the following PDF document clearly and in a structured way. Include:
1. **Executive summary** (2-3 sentences)
2. **Key points** (max 7 bullets)
3. **Main conclusion**

Respond in English.`,
    };

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `${prompts[lang] || prompts.es}\n\n--- DOCUMENTO ---\n${pdfText.slice(0, 60000)}\n--- FIN ---`,
          }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSummary(data.content?.[0]?.text || "Sin respuesta.");
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (summary) navigator.clipboard?.writeText(summary).catch(() => {});
  };

  const downloadMd = () => {
    if (!summary) return;
    const blob = new Blob([`# Resumen: ${file?.name}\n\n${summary}`], { type: "text/markdown" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `${file?.name.replace(/\.[^.]+$/, "")}-resumen.md`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const renderSummary = (text) => {
    // Simple markdown-like rendering
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ") || line.startsWith("**") && line.endsWith("**")) {
        const clean = line.replace(/^\#{1,3}\s*/, "").replace(/\*\*/g, "");
        return <div key={i} style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)", marginTop: 14, marginBottom: 4 }}>{clean}</div>;
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4 }}>
            <span style={{ color: "var(--ac)", flexShrink: 0, marginTop: 1 }}>·</span>
            <span style={{ fontSize: 13, color: "var(--tf)", lineHeight: 1.55 }}>
              {line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}
            </span>
          </div>
        );
      }
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      return (
        <div key={i} style={{ fontSize: 13, color: "var(--tf)", lineHeight: 1.55, marginBottom: 4 }}>
          {line.replace(/\*\*(.*?)\*\*/g, "$1")}
        </div>
      );
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* API key */}
      <div style={{ background: "var(--al)", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>
          Clave API de Anthropic (guardada solo en tu navegador)
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => saveKey(e.target.value)}
          placeholder="sk-ant-api03-…"
          style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--bd)", borderRadius: 6,
            fontSize: 12, fontFamily: "'DM Mono',monospace", background: "var(--bg)", color: "var(--tf)",
            boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "var(--ac)"}
          onBlur={e => e.target.style.borderColor = "var(--bd)"}
        />
        {!apiKey && (
          <div style={{ fontSize: 10, color: "var(--t2)", marginTop: 3 }}>
            Obtén tu clave en console.anthropic.com → API Keys
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={lang} onChange={e => setLang(e.target.value)}
          style={{ padding: "7px 10px", border: "1px solid var(--bd)", borderRadius: 7,
            background: "var(--bg)", color: "var(--tf)", fontSize: 12 }}>
          <option value="es">Resumen en español</option>
          <option value="en">Summary in English</option>
        </select>
        <button className="bp" onClick={summarize}
          disabled={!apiKey || extracting || loading}
          style={{ flex: 1, padding: "8px 0" }}>
          {loading
            ? <><div className="spn" /> Resumiendo…</>
            : extracting
              ? <><div className="spn" /> Extrayendo texto…</>
              : "✦ Resumir con IA"}
        </button>
      </div>

      {errMsg && (
        <div style={{ color: "#B91C1C", fontSize: 12, padding: "6px 10px",
          background: "#FEF2F2", borderRadius: 6 }}>⚠ {errMsg}</div>
      )}

      {/* Summary output */}
      {summary && (
        <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>
              Resumen generado · {Math.round(pdfText.length / 1000)}k caracteres analizados
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyToClipboard}
                style={{ padding: "4px 10px", fontSize: 11, border: "1px solid var(--bd)",
                  borderRadius: 6, background: "var(--bg)", cursor: "pointer", color: "var(--t2)" }}>
                Copiar
              </button>
              <button onClick={downloadMd}
                style={{ padding: "4px 10px", fontSize: 11, border: "1px solid var(--bd)",
                  borderRadius: 6, background: "var(--bg)", cursor: "pointer", color: "var(--t2)" }}>
                ↓ .md
              </button>
              <button onClick={() => setSummary(null)}
                style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--bd)",
                  borderRadius: 6, background: "var(--bg)", cursor: "pointer", color: "var(--t2)" }}>
                ✕
              </button>
            </div>
          </div>
          <div>{renderSummary(summary)}</div>
        </div>
      )}

      {!summary && !loading && !errMsg && pdfText && apiKey && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--t2)", padding: "12px 0" }}>
          {Math.round(pdfText.length / 1000)}k caracteres extraídos · pulsa "Resumir con IA" para empezar
        </div>
      )}
    </div>
  );
}
