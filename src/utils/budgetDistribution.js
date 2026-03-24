import { getLast6Months } from './helpers'

/**
 * Calculate suggested distribution for subcategories based on spend history
 * Returns { [subId]: suggestedAmount }
 */
export function distributeByHistory(parentId, totalBudget, subcategories, expenses) {
  if (!totalBudget || subcategories.length === 0) return {}

  const months = getLast6Months()

  // Calculate average spend per subcategory over last 3 months
  const avgSpend = {}
  let totalAvg = 0

  subcategories.forEach(sub => {
    const monthlySpends = months.slice(-3).map(m =>
      expenses
        .filter(e => e.categoryId === sub.id && e.date.startsWith(m))
        .reduce((s, e) => s + e.amount, 0)
    ).filter(v => v > 0)

    const avg = monthlySpends.length > 0
      ? monthlySpends.reduce((s, v) => s + v, 0) / monthlySpends.length
      : 0
    avgSpend[sub.id] = avg
    totalAvg += avg
  })

  // If no history at all, distribute equally
  if (totalAvg === 0) {
    const equal = Math.floor(totalBudget / subcategories.length)
    const remainder = totalBudget - equal * subcategories.length
    return subcategories.reduce((acc, sub, i) => {
      acc[sub.id] = equal + (i === 0 ? remainder : 0)
      return acc
    }, {})
  }

  // Distribute proportionally based on history
  let distributed = 0
  const result = {}
  const sorted = [...subcategories].sort((a, b) => (avgSpend[b.id] || 0) - (avgSpend[a.id] || 0))

  sorted.forEach((sub, i) => {
    if (i === sorted.length - 1) {
      // Last one gets the remainder to avoid rounding errors
      result[sub.id] = Math.max(totalBudget - distributed, 0)
    } else {
      const pct = avgSpend[sub.id] / totalAvg
      const amount = Math.round(totalBudget * pct)
      result[sub.id] = amount
      distributed += amount
    }
  })

  return result
}

/**
 * When a subcategory budget changes, recalculate parent total
 */
export function recalcParentFromSubs(subcategories, subcategoryBudgets) {
  return subcategories.reduce((sum, sub) => sum + (subcategoryBudgets[sub.id] || 0), 0)
}
