import { useState } from 'react'

export function useCounter() {
  const [count, setCount] = useState(
    () => parseInt(localStorage.getItem('morf_count') || '0')
  )

  const bumpCount = () => {
    setCount(c => {
      const n = c + 1
      localStorage.setItem('morf_count', n)
      return n
    })
  }

  return { count, bumpCount }
}
