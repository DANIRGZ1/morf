import { useState } from 'react'

export interface CounterState {
  count: number
  bumpCount: () => void
}

export function useCounter(): CounterState {
  const [count, setCount] = useState<number>(
    () => parseInt(localStorage.getItem('morf_count') || '0')
  )

  const bumpCount = () => {
    setCount(c => {
      const n = c + 1
      localStorage.setItem('morf_count', String(n))
      return n
    })
  }

  return { count, bumpCount }
}
