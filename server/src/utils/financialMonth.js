/**
 * Financial month utilities
 * A "financial month" is defined by a start day (e.g. 24).
 * If startDay = 24:
 *   - "March financial month" = Mar 24 → Apr 23
 *   - A date of Mar 23 belongs to February financial month
 *   - A date of Mar 24 belongs to March financial month
 */

/**
 * Given a date and startDay, return the financial month label "YYYY-MM"
 * where MM is the month the period is NAMED after.
 */
function getFinancialMonth(date, startDay = 1) {
  if (startDay === 1) {
    // Calendar month — no change
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const d = new Date(date)
  const day = d.getDate()
  const month = d.getMonth() // 0-indexed
  const year  = d.getFullYear()

  // If we're before the start day, we belong to the PREVIOUS month's period
  if (day < startDay) {
    // Previous month
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear  = month === 0 ? year - 1 : year
    return `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`
  } else {
    // Current month
    return `${year}-${String(month + 1).padStart(2, '0')}`
  }
}

/**
 * Get the date range for a financial month period
 * e.g. financialMonth="2026-03", startDay=24
 * returns { from: "2026-03-24", to: "2026-04-23" }
 */
function getFinancialMonthRange(financialMonth, startDay = 1) {
  if (startDay === 1) {
    const [year, month] = financialMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    return {
      from: `${financialMonth}-01`,
      to:   `${financialMonth}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  const [year, month] = financialMonth.split('-').map(Number)

  // Period starts on startDay of this month
  const fromDate = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`

  // Period ends on (startDay - 1) of NEXT month
  const nextMonth = month === 12 ? 1  : month + 1
  const nextYear  = month === 12 ? year + 1 : year
  const endDay    = startDay - 1

  const toDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  return { from: fromDate, to: toDate }
}

/**
 * Get all financial months for the current year up to today
 * e.g. if startDay=24 and today is Mar 15 2026:
 * returns ["2026-01", "2026-02"] (Mar financial month hasn't started yet)
 */
function getYearFinancialMonths(startDay = 1) {
  const today = new Date()
  const currentFM = getFinancialMonth(today, startDay)
  const year = parseInt(currentFM.split('-')[0])
  const currentFMMonth = parseInt(currentFM.split('-')[1])

  const months = []
  for (let m = 1; m <= currentFMMonth; m++) {
    months.push(`${year}-${String(m).padStart(2, '0')}`)
  }
  return months
}

/**
 * Build a WHERE clause fragment for date-based filtering by financial month
 */
function financialMonthWhere(tableAlias, financialMonth, startDay = 1) {
  const { from, to } = getFinancialMonthRange(financialMonth, startDay)
  const col = tableAlias ? `${tableAlias}.date` : 'date'
  return {
    clause: `${col} >= $FROM AND ${col} <= $TO`,
    from,
    to,
  }
}

module.exports = {
  getFinancialMonth,
  getFinancialMonthRange,
  getYearFinancialMonths,
  financialMonthWhere,
}
