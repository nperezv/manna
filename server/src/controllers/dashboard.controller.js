const pool = require('../db/pool')
const { getFinancialMonthRange, getYearFinancialMonths } = require('../utils/financialMonth')

async function getFamilyConfig(familyId) {
  const r = await pool.query(
    `SELECT tithe_percent, fast_offering_percent, fast_offering_fixed, name, month_start_day FROM families WHERE id = $1`,
    [familyId]
  )
  return r.rows[0] || {}
}

const getDashboard = async (req, res) => {
  const { month } = req.query
  const familyId = req.user.familyId
  try {
    const family = await getFamilyConfig(familyId)
    const startDay = family.month_start_day || 1
    const m = month || new Date().toISOString().slice(0, 7)
    const { from, to } = getFinancialMonthRange(m, startDay)

    const [incomeRes, expenseRes, titheRes, fastRes, budgetRes, recentRes, debtsRes, donationsRes] = await Promise.all([
      pool.query(`SELECT SUM(amount) as total, SUM(CASE WHEN computable THEN amount ELSE 0 END) as computable FROM incomes WHERE family_id=$1 AND date>=$2 AND date<=$3`, [familyId, from, to]),
      pool.query(`SELECT category_id, SUM(amount) as spent FROM expenses WHERE family_id=$1 AND date>=$2 AND date<=$3 GROUP BY category_id`, [familyId, from, to]),
      pool.query(`SELECT SUM(amount) as paid FROM tithe_payments WHERE family_id=$1 AND date>=$2 AND date<=$3`, [familyId, from, to]),
      pool.query(`SELECT SUM(amount) as paid FROM fast_offering_payments WHERE family_id=$1 AND date>=$2 AND date<=$3`, [familyId, from, to]),
      pool.query(`SELECT category_id, budgeted FROM budget_categories WHERE family_id=$1 AND month=$2`, [familyId, m]),
      pool.query(
        `(SELECT 'income' as kind, id::text, source as description, amount, NULL::integer as category_id, date, member_name, computable, created_at FROM incomes WHERE family_id=$1 AND date>=$2 AND date<=$3)
         UNION ALL
         (SELECT 'expense' as kind, id::text, description, amount, category_id, date, member_name, NULL, created_at FROM expenses WHERE family_id=$1 AND date>=$2 AND date<=$3)
         ORDER BY date DESC, created_at DESC LIMIT 8`,
        [familyId, from, to]
      ),
      pool.query(`SELECT SUM(monthly_payment) as monthly_total, COUNT(*) as count FROM debts WHERE family_id=$1 AND active=true`, [familyId]),
      pool.query(`SELECT SUM(budgeted) as total FROM donations WHERE family_id=$1 AND active=true`, [familyId]),
    ])

    const totalIncome     = parseFloat(incomeRes.rows[0]?.total)      || 0
    const computableIncome= parseFloat(incomeRes.rows[0]?.computable) || 0
    const titheOwed = Math.round(computableIncome * (family.tithe_percent / 100) * 100) / 100
    const fastOwed  = family.fast_offering_fixed
      ? parseFloat(family.fast_offering_fixed)
      : Math.round(computableIncome * (family.fast_offering_percent / 100) * 100) / 100
    const tithePaid = parseFloat(titheRes.rows[0]?.paid) || 0
    const fastPaid  = parseFloat(fastRes.rows[0]?.paid)  || 0
    const totalSpent= expenseRes.rows.reduce((s, r) => s + parseFloat(r.spent), 0)

    return res.json({
      month: m,
      monthRange: { from, to },
      income: { total: totalIncome, computable: computableIncome },
      expenses: {
        total: totalSpent,
        byCategory: expenseRes.rows.map(r => ({ categoryId: r.category_id, spent: parseFloat(r.spent) })),
      },
      tithe: {
        owed: titheOwed, paid: tithePaid, pending: Math.max(titheOwed - tithePaid, 0),
        fastOwed, fastPaid, fastPending: Math.max(fastOwed - fastPaid, 0),
        tithePercent: family.tithe_percent,
        fastOfferingPercent: family.fast_offering_percent,
      },
      budget: budgetRes.rows.map(r => ({ categoryId: r.category_id, budgeted: parseFloat(r.budgeted) })),
      recentTransactions: recentRes.rows,
      debts: {
        monthlyTotal: parseFloat(debtsRes.rows[0]?.monthly_total) || 0,
        count: parseInt(debtsRes.rows[0]?.count) || 0,
      },
      donationsMonthly: parseFloat(donationsRes.rows[0]?.total) || 0,
      family: { name: family.name, tithePercent: family.tithe_percent, fastOfferingPercent: family.fast_offering_percent, monthStartDay: startDay },
    })
  } catch (err) {
    console.error('getDashboard error:', err)
    return res.status(500).json({ error: 'Error al obtener datos del dashboard' })
  }
}

const getDashboardHistory = async (req, res) => {
  const familyId = req.user.familyId
  try {
    const family = await getFamilyConfig(familyId)
    const startDay = family.month_start_day || 1
    const months = getYearFinancialMonths(startDay)
    const result = []

    for (const m of months) {
      const { from, to } = getFinancialMonthRange(m, startDay)
      const [incomeRes, expenseRes] = await Promise.all([
        pool.query(`SELECT SUM(amount) as total FROM incomes WHERE family_id=$1 AND date>=$2 AND date<=$3`, [familyId, from, to]),
        pool.query(`SELECT SUM(amount) as total FROM expenses WHERE family_id=$1 AND date>=$2 AND date<=$3`, [familyId, from, to]),
      ])
      result.push({
        month,
        income:  parseFloat(incomeRes.rows[0].total)  || 0,
        expense: parseFloat(expenseRes.rows[0].total) || 0,
      })
    }
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener historial' })
  }
}

module.exports = { getDashboard, getDashboardHistory }
