import { useState } from 'react'

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('morf_history') || '[]') } catch { return [] }
  })

  const addToHistory = (filename, toolLabel) => {
    setHistory(prev => {
      const entry = { filename, tool: toolLabel, date: new Date().toISOString() }
      const next  = [entry, ...prev].slice(0, 10)
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
