const pool = require('../db/pool')

const getSavings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM savings_goals WHERE family_id = $1 ORDER BY created_at DESC`,
      [req.user.familyId]
    )
    return res.json(result.rows)
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener metas' })
  }
}

const createGoal = async (req, res) => {
  const { name, target, saved = 0, deadline, color = '#2d9b8a' } = req.body
  if (!name || !target) return res.status(400).json({ error: 'Nombre y objetivo son obligatorios' })
  try {
    const result = await pool.query(
      `INSERT INTO savings_goals (family_id, name, target, saved, deadline, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.familyId, name, target, saved, deadline || null, color]
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear meta' })
  }
}

const updateGoal = async (req, res) => {
  const { id } = req.params
  const { name, target, saved, deadline, color } = req.body
  try {
    const result = await pool.query(
      `UPDATE savings_goals SET
        name = COALESCE($1, name), target = COALESCE($2, target),
        saved = COALESCE($3, saved), deadline = COALESCE($4, deadline),
        color = COALESCE($5, color)
       WHERE id = $6 AND family_id = $7 RETURNING *`,
      [name, target, saved, deadline, color, id, req.user.familyId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Meta no encontrada' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar meta' })
  }
}

const deleteGoal = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(`DELETE FROM savings_goals WHERE id = $1 AND family_id = $2`, [id, req.user.familyId])
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar meta' })
  }
}

const addToGoal = async (req, res) => {
  const { id } = req.params
  const { amount } = req.body
  try {
    const result = await pool.query(
      `UPDATE savings_goals SET saved = LEAST(saved + $1, target)
       WHERE id = $2 AND family_id = $3 RETURNING *`,
      [amount, id, req.user.familyId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Meta no encontrada' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al añadir ahorro' })
  }
}

module.exports = { getSavings, createGoal, updateGoal, deleteGoal, addToGoal }
