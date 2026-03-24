const pool = require('../db/pool')

const getDonations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM donations WHERE family_id = $1 AND active = true ORDER BY created_at`,
      [req.user.familyId]
    )
    return res.json(result.rows)
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener donaciones' })
  }
}

const createDonation = async (req, res) => {
  const { name, color = '#e05c9e', bank_channel = 'manual', bank_pattern, budgeted = 0 } = req.body
  if (!name) return res.status(400).json({ error: 'Nombre requerido' })
  try {
    const result = await pool.query(
      `INSERT INTO donations (family_id, name, color, bank_channel, bank_pattern, budgeted)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.familyId, name, color, bank_channel, bank_pattern, budgeted]
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear donación' })
  }
}

const deleteDonation = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(
      `UPDATE donations SET active = false WHERE id = $1 AND family_id = $2`,
      [id, req.user.familyId]
    )
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar donación' })
  }
}

const payDonation = async (req, res) => {
  const { id } = req.params
  const { amount, note, date } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const donation = await client.query(
      `SELECT * FROM donations WHERE id = $1 AND family_id = $2`,
      [id, req.user.familyId]
    )
    if (!donation.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Donación no encontrada' }) }

    const payment = await client.query(
      `INSERT INTO donation_payments (family_id, donation_id, amount, note, date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.familyId, id, amount, note, date || new Date().toISOString().split('T')[0]]
    )
    await client.query(
      `INSERT INTO expenses (family_id, user_id, description, amount, category_id, date, source, is_donation)
       VALUES ($1,$2,$3,$4,1,$5,'manual',true)`,
      [req.user.familyId, req.user.userId,
       note ? `${donation.rows[0].name} — ${note}` : donation.rows[0].name,
       amount, date || new Date().toISOString().split('T')[0]]
    )
    await client.query('COMMIT')
    return res.status(201).json(payment.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    return res.status(500).json({ error: 'Error al registrar pago' })
  } finally { client.release() }
}

module.exports = { getDonations, createDonation, deleteDonation, payDonation }
