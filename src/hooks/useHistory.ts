import { useState } from 'react'

export interface HistoryEntry {
  filename: string
  tool: string
  date: string
}

export interface HistoryState {
  history: HistoryEntry[]
  addToHistory: (filename: string, toolLabel: string) => void
  clearHistory: () => void
}

export function useHistory(): HistoryState {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('morf_history') || '[]') as HistoryEntry[]
    } catch {
      return []
    }
  })

  const addToHistory = (filename: string, toolLabel: string) => {
    setHistory(prev => {
      const entry: HistoryEntry = { filename, tool: toolLabel, date: new Date().toISOString() }
      const next = [entry, ...prev].slice(0, 10)
      localStorage.setItem('morf_history', JSON.stringify(next))
      return next
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('morf_history')
  }

  return { history, addToHistory, clearHistory }
}
