import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('manna_theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('manna_theme', theme)
  }, [theme])

  // Apply on mount
  useEffect(() => {
    const saved = localStorage.getItem('manna_theme') || 'light'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return { theme, toggleTheme }
}
