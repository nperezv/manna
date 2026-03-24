export const formatCurrency = (amount, currency = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)

export const formatDate = (dateStr) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr))

export const formatShortDate = (dateStr) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(dateStr))

export const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const getMonthLabel = (month) => {
  const [year, m] = month.split('-')
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
    .format(new Date(parseInt(year), parseInt(m) - 1))
}

export const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

export const getPillarName = (pillar) => ({
  1: 'Pagar al Señor',
  2: 'Vivir dentro de tus posibilidades',
  3: 'Ahorrar para el futuro',
  4: 'Evitar deudas',
}[pillar] || '')

// Re-export from categories for backward compat
export { SUGGESTED_PCT, EXPENSE_CATEGORIES, PARENT_CATEGORIES, SUBCATEGORIES, getSubcategories, getCategoryName, getCategoryColor, getParentId } from './categories'

export const getLast6Months = () => {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export const getShortMonthLabel = (month) => {
  const [year, m] = month.split('-')
  return new Intl.DateTimeFormat('es-ES', { month: 'short' })
    .format(new Date(parseInt(year), parseInt(m) - 1))
}

// Convert file to base64 for localStorage storage
export const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

// Get all financial months of current year up to current month
export const getYearMonths = () => {
  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-indexed
  const months = []
  for (let m = 1; m <= currentMonth; m++) {
    months.push(`${year}-${String(m).padStart(2, '0')}`)
  }
  return months
}

// Check if a month is in the future (relative to current month)
export const isFutureMonth = (month) => {
  const now = new Date()
  const current = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  return month > current
}

// Check if a month is in a past year
export const isPastYear = (month) => {
  const year = parseInt(month.split('-')[0])
  return year < new Date().getFullYear()
}
