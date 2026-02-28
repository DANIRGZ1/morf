import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface HistoryEntry {
  filename: string;
  tool: string;
  date: string;
  size?: number; // bytes del archivo de entrada
}

export interface HistoryState {
  history: HistoryEntry[];
  addToHistory: (filename: string, toolLabel: string, size?: number) => void;
  clearHistory: () => void;
}


export function useHistory(userId?: string): HistoryState {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("morf_history") || "[]"
      ) as HistoryEntry[];
    } catch {
      return [];
    }
  });

  // Cuando el usuario se autentica, carga su historial desde Supabase
  useEffect(() => {
    if (!userId || !supabase) return;
    supabase
      .from("conversions")
      .select("filename, tool, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setHistory(
            data.map((d) => ({
              filename: d.filename,
              tool: d.tool,
              date: d.created_at,
            }))
          );
        }
      });
  }, [userId]);

  const addToHistory = (filename: string, toolLabel: string, size?: number) => {
    const entry: HistoryEntry = {
      filename,
      tool: toolLabel,
      date: new Date().toISOString(),
      ...(size !== undefined && { size }),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 10);
      if (!userId) localStorage.setItem("morf_history", JSON.stringify(next));
      return next;
    });
    // Fire-and-forget: sync con la nube en background
    if (userId && supabase) {
      supabase.from("conversions").insert({ user_id: userId, filename, tool: toolLabel });
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("morf_history");
    // Fire-and-forget
    if (userId && supabase) {
      supabase.from("conversions").delete().eq("user_id", userId);
    }
  };

  return { history, addToHistory, clearHistory };
}
