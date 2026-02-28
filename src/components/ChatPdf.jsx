import { useState, useEffect, useRef } from "react";
import { extractPdfText } from "../utils/convert";

const STORAGE_KEY = "morf_anthropic_key";
const MODEL = "claude-haiku-4-5-20251001";

export default function ChatPdf({ file }) {
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [pdfText, setPdfText]   = useState("");
  const [extracting, setExtracting] = useState(true);
  const [errMsg, setErrMsg]     = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    setExtracting(true);
    setPdfText("");
    setMessages([]);
    extractPdfText(file)
      .then(t => { setPdfText(t); setExtracting(false); })
      .catch(() => { setErrMsg("Error al extraer el texto del PDF."); setExtracting(false); });
  }, [file]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const saveKey = k => {
    setApiKey(k);
    if (k) localStorage.setItem(STORAGE_KEY, k);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !apiKey || loading || extracting) return;
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setErrMsg("");

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
          system: `Eres un asistente que responde preguntas sobre el siguiente documento PDF. Responde siempre en el mismo idioma que el usuario.\n\n--- CONTENIDO DEL PDF (${Math.round(pdfText.length / 1000)}k caracteres) ---\n${pdfText.slice(0, 60000)}\n--- FIN ---`,
          messages: history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(m => [...m, {
        role: "assistant",
        content: data.content?.[0]?.text || "Sin respuesta.",
      }]);
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* API key */}
      <div style={{ background: "var(--al)", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>
          Clave API de Anthropic &mdash; solo se guarda en tu navegador
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type={keyVisible ? "text" : "password"}
            value={apiKey}
            onChange={e => saveKey(e.target.value)}
            placeholder="sk-ant-api03-…"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--bd)", borderRadius: 6,
              fontSize: 12, fontFamily: "'DM Mono',monospace", background: "var(--bg)", color: "var(--tf)" }}
            onFocus={e => e.target.style.borderColor = "var(--ac)"}
            onBlur={e => e.target.style.borderColor = "var(--bd)"}
          />
          <button onClick={() => setKeyVisible(v => !v)}
            style={{ padding: "6px 10px", border: "1px solid var(--bd)", borderRadius: 6,
              background: "var(--bg)", cursor: "pointer", fontSize: 12, color: "var(--t2)" }}>
            {keyVisible ? "Ocultar" : "Ver"}
          </button>
        </div>
        {!apiKey && (
          <div style={{ fontSize: 10, color: "var(--t2)", marginTop: 4 }}>
            Obtén tu clave en console.anthropic.com → API Keys
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div style={{ border: "1px solid var(--bd)", borderRadius: 10, padding: 10,
        minHeight: 220, maxHeight: 380, overflowY: "auto", background: "var(--bg)" }}>
        {extracting ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--t2)", fontSize: 12 }}>
            <div className="spn" style={{ margin: "0 auto 10px" }} />
            Extrayendo texto del PDF…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--t2)", fontSize: 12 }}>
            {apiKey
              ? `Haz cualquier pregunta sobre el PDF (${Math.round(pdfText.length / 1000)}k caracteres extraídos)`
              : "Introduce tu clave de API para empezar a chatear"}
          </div>
        ) : messages.map((m, i) => (
          <div key={i} style={{ display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 8 }}>
            <div style={{
              maxWidth: "88%", padding: "8px 12px",
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: m.role === "user" ? "var(--ac)" : "var(--al)",
              color: m.role === "user" ? "#fff" : "var(--tf)",
              fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
            <div style={{ padding: "10px 16px", borderRadius: "12px 12px 12px 2px",
              background: "var(--al)", color: "var(--t2)", display: "flex", alignItems: "center", gap: 8 }}>
              <div className="spn" />
              <span style={{ fontSize: 12 }}>Pensando…</span>
            </div>
          </div>
        )}
        {errMsg && (
          <div style={{ color: "#B91C1C", fontSize: 12, padding: "6px 10px",
            background: "#FEF2F2", borderRadius: 6, marginTop: 4 }}>
            ⚠ {errMsg}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={apiKey ? "Escribe una pregunta y pulsa Enter…" : "Introduce tu clave API primero"}
          disabled={!apiKey || extracting || loading}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--bd)", borderRadius: 8,
            fontSize: 13, background: "var(--bg)", color: "var(--tf)", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "var(--ac)"}
          onBlur={e => e.target.style.borderColor = "var(--bd)"}
        />
        <button className="bp" onClick={send}
          disabled={!input.trim() || !apiKey || loading || extracting}
          style={{ padding: "8px 14px", flexShrink: 0 }}>
          Enviar
        </button>
      </div>

      {messages.length > 0 && (
        <button onClick={() => setMessages([])}
          style={{ alignSelf: "flex-start", padding: "4px 10px", fontSize: 11,
            border: "1px solid var(--bd)", borderRadius: 6, background: "none",
            color: "var(--t2)", cursor: "pointer" }}>
          Limpiar chat
        </button>
      )}
    </div>
  );
}
