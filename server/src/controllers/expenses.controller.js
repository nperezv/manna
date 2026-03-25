const pool = require('../db/pool')
const { getFinancialMonthRange } = require('../utils/financialMonth')

async function getStartDay(familyId) {
  const r = await pool.query(`SELECT month_start_day FROM families WHERE id = $1`, [familyId])
  return r.rows[0]?.month_start_day || 1
}

const getExpenses = async (req, res) => {
  const { month, category_id } = req.query
  const familyId = req.user.familyId
  try {
    const startDay = await getStartDay(familyId)
    const m = month || new Date().toISOString().slice(0, 7)
    const { from, to } = getFinancialMonthRange(m, startDay)

    let query = `SELECT e.*, u.name as user_name FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.family_id = $1 AND e.date >= $2 AND e.date <= $3`
    const params = [familyId, from, to]

    if (category_id) { params.push(category_id); query += ` AND e.category_id = $${params.length}` }
    query += ` ORDER BY e.date DESC, e.created_at DESC`

    const result = await pool.query(query, params)
    return res.json(result.rows)
  } catch (err) {
    console.error('getExpenses error:', err)
    return res.status(500).json({ error: 'Error al obtener gastos' })
  }
}

const createExpense = async (req, res) => {
  const { description, amount, category_id = 301, date, member_name, source = 'manual' } = req.body
  if (!description || !amount || !date) return res.status(400).json({ error: 'Descripción, importe y fecha son obligatorios' })
  try {
    const result = await pool.query(
      `INSERT INTO expenses (family_id, user_id, description, amount, category_id, date, member_name, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.familyId, req.user.userId, description, amount, category_id, date, member_name, source]
    )
    req.app.get('emitToFamily')?.(req.user.familyId, 'data_changed', { type: 'expense' })
    return res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('createExpense error:', err)
    return res.status(500).json({ error: 'Error al crear gasto' })
  }
}

const updateExpense = async (req, res) => {
  const { id } = req.params
  const { description, amount, category_id, date } = req.body
  try {
    const result = await pool.query(
      `UPDATE expenses SET
        description = COALESCE($1, description),
        amount = COALESCE($2, amount),
        category_id = COALESCE($3, category_id),
        date = COALESCE($4, date)
       WHERE id = $5 AND family_id = $6 RETURNING *`,
      [description, amount, category_id, date, id, req.user.familyId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Gasto no encontrado' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar gasto' })
  }
}

const deleteExpense = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(`DELETE FROM expenses WHERE id = $1 AND family_id = $2`, [id, req.user.familyId])
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar gasto' })
  }
}

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense }
