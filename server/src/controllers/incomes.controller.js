const pool = require('../db/pool')
const { getFinancialMonthRange, getYearFinancialMonths } = require('../utils/financialMonth')

async function getStartDay(familyId) {
  const r = await pool.query(`SELECT month_start_day FROM families WHERE id = $1`, [familyId])
  return r.rows[0]?.month_start_day || 1
}

const getIncomes = async (req, res) => {
  const { month } = req.query
  const familyId = req.user.familyId
  try {
    const startDay = await getStartDay(familyId)
    const m = month || (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    })()
    const { from, to } = getFinancialMonthRange(m, startDay)

    const result = await pool.query(
      `SELECT i.*, u.name as user_name FROM incomes i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.family_id = $1 AND i.date >= $2 AND i.date <= $3
       ORDER BY i.date DESC`,
      [familyId, from, to]
    )
    return res.json(result.rows)
  } catch (err) {
    console.error('getIncomes error:', err)
    return res.status(500).json({ error: 'Error al obtener ingresos' })
  }
}

const createIncome = async (req, res) => {
  const { source, category = 'salary', amount, computable = true, date, description, member_name } = req.body
  if (!source || !amount || !date) return res.status(400).json({ error: 'Origen, importe y fecha son obligatorios' })
  try {
    const result = await pool.query(
      `INSERT INTO incomes (family_id, user_id, source, category, amount, computable, date, description, member_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.familyId, req.user.userId, source, category, amount, computable, date, description, member_name]
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('createIncome error:', err)
    return res.status(500).json({ error: 'Error al crear ingreso' })
  }
}

const deleteIncome = async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      `DELETE FROM incomes WHERE id = $1 AND family_id = $2 RETURNING id`,
      [id, req.user.familyId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Ingreso no encontrado' })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar ingreso' })
  }
}

const getSummary = async (req, res) => {
  const { month } = req.query
  const familyId = req.user.familyId
  try {
    const startDay = await getStartDay(familyId)
    const m = month || new Date().toISOString().slice(0,7)
    const { from, to } = getFinancialMonthRange(m, startDay)
    const result = await pool.query(
      `SELECT SUM(amount) as total,
        SUM(CASE WHEN computable THEN amount ELSE 0 END) as computable_total,
        SUM(CASE WHEN NOT computable THEN amount ELSE 0 END) as non_computable_total,
        COUNT(*) as count
       FROM incomes WHERE family_id = $1 AND date >= $2 AND date <= $3`,
      [familyId, from, to]
    )
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener resumen' })
  }
}

module.exports = { getIncomes, createIncome, deleteIncome, getSummary }
