import { useMemo, useState } from "react";

const DAYS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DAYS_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12,
      padding: "20px 24px", flex: "1 1 160px", minWidth: 0,
    }}>
      <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? "var(--ac)" : "var(--t1)", lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--tm)" }}>{sub}</div>}
    </div>
  );
}

function HBar({ label, value, max, color = "var(--ac)" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ width: 130, fontSize: 12, color: "var(--t1)", whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 8, background: "var(--bd)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99,
          transition: "width .4s ease" }} />
      </div>
      <div style={{ width: 24, fontSize: 12, color: "var(--t2)", textAlign: "right", flexShrink: 0 }}>{value}</div>
    </div>
  );
}

function WeekChart({ data, labels }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: v > 0 ? "var(--ac)" : "var(--bd)",
            borderRadius: "4px 4px 0 0", height: `${Math.max((v / max) * 52, v > 0 ? 6 : 2)}px`,
            transition: "height .3s ease", opacity: v > 0 ? 1 : 0.35 }} />
          <span style={{ fontSize: 9, color: "var(--tm)" }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ history, count, onBack, lang = "es" }) {
  const [tab, setTab] = useState("overview");

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 86400000);
    const monthAgo = new Date(now - 30 * 86400000);

    // Tool usage
    const toolCounts = {};
    const typeCounts = {};
    let thisWeek = 0;
    let thisMonth = 0;
    const dayActivity = [0, 0, 0, 0, 0, 0, 0];

    for (const h of history) {
      toolCounts[h.tool] = (toolCounts[h.tool] || 0) + 1;
      const ext = (h.filename.split(".").pop() || "?").toLowerCase();
      typeCounts[ext] = (typeCounts[ext] || 0) + 1;
      const d = new Date(h.date);
      if (d >= weekAgo) thisWeek++;
      if (d >= monthAgo) thisMonth++;
      dayActivity[d.getDay()]++;
    }

    const topTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topTool = topTools[0]?.[0] ?? "—";
    const uniqueTools = Object.keys(toolCounts).length;

    return { toolCounts, topTools, topTypes, topTool, uniqueTools, thisWeek, thisMonth, dayActivity };
  }, [history]);

  const days = lang === "es" ? DAYS_ES : DAYS_EN;
  // Rotate so today is last
  const todayIdx = new Date().getDay();
  const rotatedDays = [...days.slice(todayIdx + 1), ...days.slice(0, todayIdx + 1)];
  const rotatedActivity = [
    ...stats.dayActivity.slice(todayIdx + 1),
    ...stats.dayActivity.slice(0, todayIdx + 1),
  ];

  const tabStyle = (t) => ({
    padding: "7px 16px", fontSize: 13, borderRadius: 7, border: "none",
    cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
    background: tab === t ? "var(--bg)" : "transparent",
    color: tab === t ? "var(--t1)" : "var(--t2)",
    boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.08)" : "none",
    transition: "all .15s",
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 0 20px" }}>
        <div>
          <button onClick={onBack}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 8,
              background: "none", border: "none", cursor: "pointer", color: "var(--t2)",
              fontSize: 12, padding: 0, fontFamily: "'DM Sans',sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--t1)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--t2)"}>
            ← Volver
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--t2)", margin: "4px 0 0" }}>
            Resumen de tus conversiones en morf
          </p>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--al)", borderRadius: 9, padding: 3, gap: 2 }}>
          {[["overview", "Resumen"], ["tools", "Herramientas"], ["files", "Archivos"]].map(([v, label]) => (
            <button key={v} style={tabStyle(v)} onClick={() => setTab(v)}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <>
          {/* Stat cards */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Total conversiones" value={count > 0 ? count.toLocaleString() : history.length} sub="desde que empezaste a usar morf" />
            <StatCard label="Esta semana" value={stats.thisWeek} sub={`${stats.thisMonth} este mes`} />
            <StatCard label="Herramienta top" value={stats.topTool !== "—" ? stats.topTool.split(" ").slice(0, 2).join(" ") : "—"}
              sub={stats.topTool !== "—" ? `${stats.toolCounts[stats.topTool]}× usada` : "sin datos aún"} accent />
            <StatCard label="Herramientas usadas" value={stats.uniqueTools} sub={`de ${32} disponibles`} />
          </div>

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
            {/* Left: tool chart */}
            <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--t1)", marginBottom: 4 }}>
                Herramientas más usadas
              </div>
              <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 18 }}>
                Basado en tus últimas {history.length} conversiones
              </div>
              {stats.topTools.length > 0 ? (
                stats.topTools.map(([tool, n]) => (
                  <HBar key={tool} label={tool} value={n} max={stats.topTools[0][1]} />
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--tm)", fontSize: 13 }}>
                  Aún no hay conversiones registradas
                </div>
              )}
            </div>

            {/* Right: activity + recent */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Weekly activity */}
              <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--t1)", marginBottom: 2 }}>
                  Actividad semanal
                </div>
                <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 14 }}>
                  Conversiones por día
                </div>
                <WeekChart data={rotatedActivity} labels={rotatedDays} />
              </div>

              {/* Recent activity */}
              <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--t1)", marginBottom: 14 }}>
                  Actividad reciente
                </div>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0", color: "var(--tm)", fontSize: 13 }}>
                    Sin actividad aún
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {history.slice(0, 8).map((h, i) => {
                      const d = new Date(h.date);
                      const now = new Date();
                      const diffH = Math.round((now - d) / 3600000);
                      const timeLabel = diffH < 1 ? "Ahora"
                        : diffH < 24 ? `Hace ${diffH}h`
                        : diffH < 48 ? "Ayer"
                        : d.toLocaleDateString("es", { day: "numeric", month: "short" });
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--al)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, color: "var(--ac)", flexShrink: 0,
                            fontFamily: "'DM Mono',monospace" }}>
                            {(h.filename.split(".").pop() || "?").toUpperCase().slice(0, 3)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {h.filename}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--t2)" }}>{h.tool}</div>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--tm)", flexShrink: 0 }}>{timeLabel}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TOOLS TAB ── */}
      {tab === "tools" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12, padding: "24px" }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--t1)", marginBottom: 6 }}>
              Todas las herramientas usadas
            </div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 20 }}>
              {stats.uniqueTools > 0
                ? `Has usado ${stats.uniqueTools} herramienta${stats.uniqueTools !== 1 ? "s" : ""} distintas`
                : "Aún no hay datos"}
            </div>
            {stats.topTools.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {stats.topTools.map(([tool, n], idx) => (
                  <div key={tool} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8,
                    background: idx % 2 === 0 ? "var(--al)" : "transparent" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--ac)",
                      color: "#fff", fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{tool}</div>
                    <div style={{ width: 120, height: 6, background: "var(--bd)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${(n / stats.topTools[0][1]) * 100}%`, height: "100%",
                        background: "var(--ac)", borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--t2)", fontFamily: "'DM Mono',monospace",
                      minWidth: 30, textAlign: "right" }}>
                      {n}×
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--tm)", fontSize: 13 }}>
                Convierte archivos para ver estadísticas de herramientas
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FILES TAB ── */}
      {tab === "files" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* File types */}
          <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12, padding: "24px" }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--t1)", marginBottom: 6 }}>
              Tipos de archivo
            </div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 20 }}>
              Formatos de entrada más usados
            </div>
            {stats.topTypes.length > 0 ? (
              <>
                {stats.topTypes.map(([ext, n]) => (
                  <HBar key={ext} label={`.${ext}`} value={n} max={stats.topTypes[0][1]} />
                ))}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--tm)", fontSize: 13 }}>
                Sin datos aún
              </div>
            )}
          </div>

          {/* All files list */}
          <div style={{ background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12, padding: "24px" }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--t1)", marginBottom: 6 }}>
              Archivos recientes
            </div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 20 }}>
              Últimos {history.length} archivos convertidos
            </div>
            {history.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
                {history.map((h, i) => {
                  const ext = (h.filename.split(".").pop() || "?").toUpperCase().slice(0, 4);
                  const d = new Date(h.date);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 8, background: "var(--al)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: "var(--ac)",
                        opacity: 0.15 + (i * 0.05), display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0, position: "relative" }}>
                        <span style={{ position: "absolute", fontSize: 9, fontWeight: 800,
                          color: "var(--ac)", fontFamily: "'DM Mono',monospace" }}>{ext}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {h.filename}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--t2)" }}>
                          {h.tool} · {d.toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--tm)", fontSize: 13 }}>
                Sin archivos aún
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state CTA */}
      {history.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 40, padding: "40px 20px",
          background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)", marginBottom: 6 }}>
            Tu dashboard está vacío
          </div>
          <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 20 }}>
            Convierte tu primer archivo y aquí verás tus estadísticas
          </div>
          <button onClick={onBack}
            style={{ padding: "9px 20px", background: "var(--ac)", color: "#fff",
              border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            Empezar a convertir
          </button>
        </div>
      )}
    </div>
  );
}
