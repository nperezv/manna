const pool = require('../db/pool')
const { getFinancialMonthRange, getYearFinancialMonths } = require('../utils/financialMonth')

async function getStartDay(familyId) {
  const r = await pool.query(`SELECT month_start_day FROM families WHERE id = $1`, [familyId])
  return r.rows[0]?.month_start_day || 1
}

// GET /api/budget/suggest?month=2026-04
// Returns suggested budget amounts for a month based on:
// 1. Average of last 3 months (if data exists)
// 2. Percentage-based on current month income (fallback)
const getBudgetSuggestion = async (req, res) => {
  const { month } = req.query
  const familyId = req.user.familyId
  const m = month || new Date().toISOString().slice(0, 7)

  try {
    const startDay = await getStartDay(familyId)

    // Get last 3 months with actual budget data
    const now = new Date()
    const [year, mo] = m.split('-').map(Number)
    const prevMonths = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(year, mo - 1 - i, 1)
      prevMonths.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
    }

    // Get budget categories for each previous month
    const historyData = {}
    for (const pm of prevMonths) {
      const budgetRes = await pool.query(
        `SELECT category_id, budgeted FROM budget_categories WHERE family_id=$1 AND month=$2`,
        [familyId, pm]
      )
      if (budgetRes.rows.length > 0) {
        budgetRes.rows.forEach(r => {
          if (!historyData[r.category_id]) historyData[r.category_id] = []
          historyData[r.category_id].push(parseFloat(r.budgeted))
        })
      }
    }

    // Also get previous month's full budget for "copy" option
    const prevMonth = prevMonths[0]
    const prevBudgetRes = await pool.query(
      `SELECT category_id, budgeted FROM budget_categories WHERE family_id=$1 AND month=$2`,
      [familyId, prevMonth]
    )
    const prevBudget = {}
    prevBudgetRes.rows.forEach(r => { prevBudget[r.category_id] = parseFloat(r.budgeted) })

    // Calculate averages
    const averages = {}
    Object.entries(historyData).forEach(([catId, values]) => {
      averages[parseInt(catId)] = Math.round(values.reduce((s,v) => s+v, 0) / values.length)
    })

    // Get current month income for percentage-based suggestion
    const { from, to } = getFinancialMonthRange(m, startDay)
    const incomeRes = await pool.query(
      `SELECT SUM(amount) as total FROM incomes WHERE family_id=$1 AND date>=$2 AND date<=$3 AND computable=true`,
      [familyId, from, to]
    )
    const income = parseFloat(incomeRes.rows[0]?.total) || 0

    // Percentage-based suggestions (SUD principles)
    const percentages = {
      2:  0.30, // Vivienda
      20: 0.05, // Suministros
      3:  0.15, // Alimentación
      4:  0.05, // Transporte
      5:  0.05, // Educación
      6:  0.03, // Salud
      21: 0.03, // Suscripciones
      7:  0.05, // Ocio
      8:  0.05, // Ahorro emergencias
      9:  0.05, // Metas ahorro
    }
    const percentageBased = {}
    Object.entries(percentages).forEach(([catId, pct]) => {
      percentageBased[parseInt(catId)] = Math.round(income * pct)
    })

    const hasHistory = Object.keys(averages).length > 0
    const hasPrevMonth = Object.keys(prevBudget).length > 0

    return res.json({
      hasHistory,
      hasPrevMonth,
      prevMonth,
      prevBudget,          // copy previous month
      averages,            // average of last 3 months
      percentageBased,     // % of income
      income,
      monthsAnalyzed: prevMonths.filter(pm => historyData[Object.keys(historyData)[0]]?.length > 0).length || 0
    })
  } catch (err) {
    console.error('getBudgetSuggestion error:', err)
    return res.status(500).json({ error: 'Error al calcular sugerencias' })
  }
}

// POST /api/budget/copy — copy budget from one month to another
const copyBudget = async (req, res) => {
  const { from_month, to_month } = req.body
  const familyId = req.user.familyId

  try {
    const [cats, subs] = await Promise.all([
      pool.query(`SELECT category_id, budgeted FROM budget_categories WHERE family_id=$1 AND month=$2`, [familyId, from_month]),
      pool.query(`SELECT subcategory_id, budgeted FROM subcategory_budgets WHERE family_id=$1 AND month=$2`, [familyId, from_month]),
    ])

    for (const row of cats.rows) {
      await pool.query(
        `INSERT INTO budget_categories (family_id, category_id, budgeted, month)
         VALUES ($1,$2,$3,$4) ON CONFLICT (family_id,category_id,month) DO UPDATE SET budgeted=$3`,
        [familyId, row.category_id, row.budgeted, to_month]
      )
    }
    for (const row of subs.rows) {
      await pool.query(
        `INSERT INTO subcategory_budgets (family_id, subcategory_id, budgeted, month)
         VALUES ($1,$2,$3,$4) ON CONFLICT (family_id,subcategory_id,month) DO UPDATE SET budgeted=$3`,
        [familyId, row.subcategory_id, row.budgeted, to_month]
      )
    }

    return res.json({ ok: true, copied: cats.rows.length })
  } catch (err) {
    console.error('copyBudget error:', err)
    return res.status(500).json({ error: 'Error al copiar presupuesto' })
  }
}

module.exports = { getBudgetSuggestion, copyBudget }
