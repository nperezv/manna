const pool = require('../db/pool')
const { getFinancialMonthRange } = require('../utils/financialMonth')

async function getStartDay(familyId) {
  const r = await pool.query(`SELECT month_start_day FROM families WHERE id = $1`, [familyId])
  return r.rows[0]?.month_start_day || 1
}

// GET /api/budget?month=2026-03
const getBudget = async (req, res) => {
  const { month } = req.query
  const familyId = req.user.familyId
  const m = month || new Date().toISOString().slice(0, 7)

  try {
    const startDay = await getStartDay(familyId)
    const { from, to } = getFinancialMonthRange(m, startDay)

    const [budgetRes, subBudgetRes, expensesRes, familyRes, incomesRes, debtsRes] = await Promise.all([
      pool.query(`SELECT * FROM budget_categories WHERE family_id=$1 AND month=$2`, [familyId, m]),
      pool.query(`SELECT * FROM subcategory_budgets WHERE family_id=$1 AND month=$2`, [familyId, m]),
      pool.query(
        `SELECT category_id, SUM(amount) as spent FROM expenses
         WHERE family_id=$1 AND date>=$2 AND date<=$3 GROUP BY category_id`,
        [familyId, from, to]
      ),
      pool.query(
        `SELECT tithe_percent, fast_offering_percent, fast_offering_fixed FROM families WHERE id=$1`,
        [familyId]
      ),
      pool.query(
        `SELECT SUM(amount) as total FROM incomes
         WHERE family_id=$1 AND date>=$2 AND date<=$3 AND computable=true`,
        [familyId, from, to]
      ),
      pool.query(
        `SELECT id, name, monthly_payment, remaining FROM debts WHERE family_id=$1 AND active=true`,
        [familyId]
      ),
    ])

    const spentByCategory = {}
    expensesRes.rows.forEach(r => { spentByCategory[r.category_id] = parseFloat(r.spent) })

    const family = familyRes.rows[0]
    const computableIncome = parseFloat(incomesRes.rows[0]?.total) || 0
    const titheOwed = Math.round(computableIncome * (family.tithe_percent / 100) * 100) / 100
    const fastOwed  = family.fast_offering_fixed
      ? parseFloat(family.fast_offering_fixed)
      : Math.round(computableIncome * (family.fast_offering_percent / 100) * 100) / 100
    const totalDebtPayments = debtsRes.rows.reduce((s, d) => s + (parseFloat(d.monthly_payment) || 0), 0)

    return res.json({
      budgetCategories: budgetRes.rows,
      subcategoryBudgets: subBudgetRes.rows,
      spentByCategory,
      month: m,
      // Auto-calculated values the UI needs
      titheOwed,
      fastOwed,
      totalDebtPayments,
      debts: debtsRes.rows,
      computableIncome,
    })
  } catch (err) {
    console.error('getBudget error:', err)
    return res.status(500).json({ error: 'Error al obtener presupuesto' })
  }
}

const upsertBudgetCategory = async (req, res) => {
  const { category_id, budgeted, month } = req.body
  const familyId = req.user.familyId
  const m = month || new Date().toISOString().slice(0, 7)
  try {
    const result = await pool.query(
      `INSERT INTO budget_categories (family_id, category_id, budgeted, month)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (family_id, category_id, month) DO UPDATE SET budgeted=$3 RETURNING *`,
      [familyId, category_id, budgeted, m]
    )
    return res.json(result.rows[0])
  } catch (err) {
    console.error('upsertBudgetCategory error:', err)
    return res.status(500).json({ error: 'Error al actualizar presupuesto' })
  }
}

const upsertSubcategoryBudget = async (req, res) => {
  const { subcategory_id, budgeted, month } = req.body
  const familyId = req.user.familyId
  const m = month || new Date().toISOString().slice(0, 7)
  try {
    const result = await pool.query(
      `INSERT INTO subcategory_budgets (family_id, subcategory_id, budgeted, month)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (family_id, subcategory_id, month) DO UPDATE SET budgeted=$3 RETURNING *`,
      [familyId, subcategory_id, budgeted, m]
    )
    return res.json(result.rows[0])
  } catch (err) {
    console.error('upsertSubcategoryBudget error:', err)
    return res.status(500).json({ error: 'Error al actualizar subcategoría' })
  }
}

module.exports = { getBudget, upsertBudgetCategory, upsertSubcategoryBudget }
