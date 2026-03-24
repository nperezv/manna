import { getCurrentMonth, getMonthLabel } from '../../utils/helpers'

function prevMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function nextMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

/**
 * MonthNav — allows navigating months within current year only.
 * Can't go before January of current year or after current month.
 */
export default function MonthNav({ month, onChange, className = '' }) {
  const current  = getCurrentMonth()
  const thisYear = new Date().getFullYear()
  const [year]   = month.split('-').map(Number)

  const canGoPrev = !(year === thisYear && month === `${thisYear}-01`)
  const canGoNext = month < current

  return (
    <div className={`month-nav ${className}`}>
      <button className="month-btn" onClick={() => canGoPrev && onChange(prevMonth(month))} disabled={!canGoPrev}>‹</button>
      <span className="month-nav-label">{getMonthLabel(month)}</span>
      <button className="month-btn" onClick={() => canGoNext && onChange(nextMonth(month))} disabled={!canGoNext}>›</button>
    </div>
  )
}
