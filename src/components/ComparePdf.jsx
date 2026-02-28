import { useState } from "react";
import { extractPdfPages } from "../utils/convert";

// Simple word-level diff using LCS
function diffWords(oldText, newText) {
  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);

  // Build LCS table
  const m = oldWords.length, n = newWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldWords[i - 1] === newWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // Backtrack
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: "eq", word: oldWords[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", word: newWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: "del", word: oldWords[i - 1] });
      i--;
    }
  }
  return result;
}

function DiffView({ diff }) {
  const added   = diff.filter(d => d.type === "add").length;
  const removed = diff.filter(d => d.type === "del").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46",
          padding: "2px 8px", borderRadius: 99, fontFamily: "'DM Mono',monospace" }}>
          +{added} palabras añadidas
        </span>
        <span style={{ fontSize: 11, background: "#FEE2E2", color: "#991B1B",
          padding: "2px 8px", borderRadius: 99, fontFamily: "'DM Mono',monospace" }}>
          −{removed} palabras eliminadas
        </span>
      </div>
      <div style={{ lineHeight: 1.8, fontSize: 13, color: "var(--tf)" }}>
        {diff.map((d, i) => {
          if (d.type === "eq")  return <span key={i}>{d.word} </span>;
          if (d.type === "add") return (
            <mark key={i} style={{ background: "#D1FAE5", color: "#065F46",
              borderRadius: 3, padding: "1px 2px" }}>{d.word} </mark>
          );
          return (
            <del key={i} style={{ background: "#FEE2E2", color: "#991B1B",
              borderRadius: 3, padding: "1px 2px", textDecoration: "line-through" }}>{d.word} </del>
          );
        })}
      </div>
    </div>
  );
}

export default function ComparePdf({ file }) {
  const [file2, setFile2]       = useState(null);
  const [comparing, setComparing] = useState(false);
  const [diffs, setDiffs]       = useState(null); // per-page diffs
  const [errMsg, setErrMsg]     = useState("");
  const [page, setPage]         = useState(0); // 0-indexed

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (f?.type === "application/pdf" || f?.name.endsWith(".pdf")) setFile2(f);
  };

  const compare = async () => {
    if (!file || !file2) return;
    setComparing(true);
    setErrMsg("");
    setDiffs(null);
    try {
      const [pages1, pages2] = await Promise.all([
        extractPdfPages(file),
        extractPdfPages(file2),
      ]);
      const maxPages = Math.max(pages1.length, pages2.length);
      const results = [];
      for (let p = 0; p < maxPages; p++) {
        const t1 = pages1[p] || "";
        const t2 = pages2[p] || "";
        // Limit diff to 2000 words per page for performance
        const w1 = t1.split(/\s+/).filter(Boolean).slice(0, 2000);
        const w2 = t2.split(/\s+/).filter(Boolean).slice(0, 2000);
        results.push(diffWords(w1.join(" "), w2.join(" ")));
      }
      setDiffs(results);
      setPage(0);
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setComparing(false);
    }
  };

  const totalAdded   = diffs?.reduce((s, d) => s + d.filter(x => x.type === "add").length, 0) ?? 0;
  const totalRemoved = diffs?.reduce((s, d) => s + d.filter(x => x.type === "del").length, 0) ?? 0;
  const identical    = diffs && totalAdded === 0 && totalRemoved === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* File 2 drop zone */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>
          Segundo PDF para comparar
        </div>
        {file2 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            background: "var(--al)", borderRadius: 8, border: "1px solid var(--bd)" }}>
            <span style={{ fontSize: 13, color: "var(--t1)", flex: 1, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file2.name}</span>
            <button onClick={() => { setFile2(null); setDiffs(null); }}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "var(--t2)", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ) : (
          <label style={{ display: "block", border: "2px dashed var(--bd)", borderRadius: 8,
            padding: "20px", textAlign: "center", cursor: "pointer",
            transition: "border-color .15s", color: "var(--t2)", fontSize: 13 }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--ac)"; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "var(--bd)"; }}
            onDrop={e => { e.currentTarget.style.borderColor = "var(--bd)"; handleDrop(e); }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ac)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--bd)"}>
            <input type="file" accept=".pdf,application/pdf" onChange={handleDrop} style={{ display: "none" }} />
            Arrastra aquí el segundo PDF o haz clic para seleccionarlo
          </label>
        )}
      </div>

      {/* Compare button */}
      <button className="bp" onClick={compare} disabled={!file2 || comparing}
        style={{ padding: "9px 0" }}>
        {comparing
          ? <><div className="spn" /> Comparando…</>
          : "⇄ Comparar PDFs"}
      </button>

      {errMsg && (
        <div style={{ color: "#B91C1C", fontSize: 12, padding: "6px 10px",
          background: "#FEF2F2", borderRadius: 6 }}>⚠ {errMsg}</div>
      )}

      {/* Results */}
      {diffs && (
        <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 10, padding: "16px 18px" }}>
          {/* Summary bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
              {identical
                ? "✓ Los documentos son idénticos"
                : `Diferencias encontradas en ${diffs.filter(d => d.some(x => x.type !== "eq")).length} de ${diffs.length} página${diffs.length !== 1 ? "s" : ""}`}
            </div>
            {!identical && (
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46",
                  padding: "2px 8px", borderRadius: 99 }}>+{totalAdded}</span>
                <span style={{ fontSize: 11, background: "#FEE2E2", color: "#991B1B",
                  padding: "2px 8px", borderRadius: 99 }}>−{totalRemoved}</span>
              </div>
            )}
          </div>

          {/* Page navigation */}
          {diffs.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {diffs.map((d, i) => {
                const hasDiff = d.some(x => x.type !== "eq");
                return (
                  <button key={i} onClick={() => setPage(i)}
                    style={{ padding: "3px 10px", fontSize: 11, borderRadius: 6,
                      border: `1px solid ${page === i ? "var(--ac)" : "var(--bd)"}`,
                      background: page === i ? "var(--ac)" : hasDiff ? "#FEF2F2" : "var(--bg)",
                      color: page === i ? "#fff" : hasDiff ? "#991B1B" : "var(--t2)",
                      cursor: "pointer" }}>
                    p.{i + 1}{hasDiff ? " ●" : ""}
                  </button>
                );
              })}
            </div>
          )}

          {/* Diff view */}
          <div style={{ maxHeight: 400, overflowY: "auto", padding: "12px",
            background: "var(--bg)", borderRadius: 8, border: "1px solid var(--bd)" }}>
            {diffs[page] ? (
              <DiffView diff={diffs[page]} />
            ) : (
              <div style={{ textAlign: "center", color: "var(--t2)", fontSize: 12, padding: 20 }}>
                Página vacía
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            <span style={{ fontSize: 10, color: "var(--t2)", display: "flex", alignItems: "center", gap: 4 }}>
              <mark style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 3, padding: "0 4px", fontSize: 10 }}>texto</mark>
              añadido en 2º PDF
            </span>
            <span style={{ fontSize: 10, color: "var(--t2)", display: "flex", alignItems: "center", gap: 4 }}>
              <del style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 3, padding: "0 4px", fontSize: 10, textDecoration: "line-through" }}>texto</del>
              eliminado del 1º PDF
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
