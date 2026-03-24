const pool = require('../db/pool')

const getDebts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM debts WHERE family_id = $1 AND active = true ORDER BY created_at DESC`,
      [req.user.familyId]
    )
    return res.json(result.rows)
  } catch (err) {
    console.error('getDebts error:', err)
    return res.status(500).json({ error: 'Error al obtener deudas' })
  }
}

const createDebt = async (req, res) => {
  const { name, total_amount, remaining, monthly_payment, interest_rate, type = 'other' } = req.body
  if (!name || !total_amount || !remaining) {
    return res.status(400).json({ error: 'Nombre, total y pendiente son obligatorios' })
  }
  try {
    const result = await pool.query(
      `INSERT INTO debts (family_id, name, total_amount, remaining, monthly_payment, interest_rate, type)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.familyId, name, total_amount, remaining, monthly_payment, interest_rate, type]
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('createDebt error:', err)
    return res.status(500).json({ error: 'Error al crear deuda' })
  }
}

const updateDebt = async (req, res) => {
  const { id } = req.params
  const { name, remaining, monthly_payment, interest_rate } = req.body
  try {
    const result = await pool.query(
      `UPDATE debts SET
        name = COALESCE($1, name),
        remaining = COALESCE($2, remaining),
        monthly_payment = COALESCE($3, monthly_payment),
        interest_rate = COALESCE($4, interest_rate)
       WHERE id = $5 AND family_id = $6 RETURNING *`,
      [name, remaining, monthly_payment, interest_rate, id, req.user.familyId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Deuda no encontrada' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar deuda' })
  }
}

const deleteDebt = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(
      `UPDATE debts SET active = false WHERE id = $1 AND family_id = $2`,
      [id, req.user.familyId]
    )
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar deuda' })
  }
}

const makePayment = async (req, res) => {
  const { id } = req.params
  const { amount } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const debt = await client.query(
      `UPDATE debts SET remaining = GREATEST(remaining - $1, 0)
       WHERE id = $2 AND family_id = $3 RETURNING *`,
      [amount, id, req.user.familyId]
    )
    if (!debt.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Deuda no encontrada' }) }
    await client.query(
      `INSERT INTO expenses (family_id, user_id, description, amount, category_id, date, source)
       VALUES ($1,$2,$3,$4,10,CURRENT_DATE,'manual')`,
      [req.user.familyId, req.user.userId, `Pago — ${debt.rows[0].name}`, amount]
    )
    await client.query('COMMIT')
    return res.json(debt.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    return res.status(500).json({ error: 'Error al registrar pago' })
  } finally { client.release() }
}

module.exports = { getDebts, createDebt, updateDebt, deleteDebt, makePayment }
