const pool = require('../db/pool')

// GET /api/family
const getFamily = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*,
        json_agg(json_build_object(
          'id', u.id, 'name', u.name, 'email', u.email,
          'role', u.role, 'avatar_color', u.avatar_color
        )) as members
       FROM families f
       LEFT JOIN users u ON u.family_id = f.id AND u.active = true
       WHERE f.id = $1
       GROUP BY f.id`,
      [req.user.familyId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Familia no encontrada' })
    return res.json(result.rows[0])
  } catch (err) {
    console.error('getFamily error:', err)
    return res.status(500).json({ error: 'Error al obtener la familia' })
  }
}

// PATCH /api/family
const updateFamily = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede modificar la familia' })
  }
  const {
    name, tithe_percent, fast_offering_percent, fast_offering_fixed,
    church_bank_reference, church_bank_name, currency, month_start_day
  } = req.body

  try {
    const result = await pool.query(
      `UPDATE families SET
        name                  = COALESCE($1, name),
        tithe_percent         = COALESCE($2, tithe_percent),
        fast_offering_percent = COALESCE($3, fast_offering_percent),
        fast_offering_fixed   = $4,
        church_bank_reference = COALESCE($5, church_bank_reference),
        church_bank_name      = COALESCE($6, church_bank_name),
        currency              = COALESCE($7, currency),
        month_start_day       = COALESCE($8, month_start_day),
        updated_at            = NOW()
       WHERE id = $9 RETURNING *`,
      [
        name, tithe_percent, fast_offering_percent,
        fast_offering_fixed || null,
        church_bank_reference, church_bank_name, currency,
        month_start_day || null,
        req.user.familyId
      ]
    )
    return res.json(result.rows[0])
  } catch (err) {
    console.error('updateFamily error:', err)
    return res.status(500).json({ error: 'Error al actualizar la familia' })
  }
}

// POST /api/family/invite
const inviteMember = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede invitar miembros' })
  }
  const { name, email, password, role = 'member' } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' })
  }
  const bcrypt = require('bcryptjs')
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Este email ya está registrado' })
    }
    const hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      `INSERT INTO users (family_id, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role`,
      [req.user.familyId, name, email.toLowerCase(), hash, role]
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('inviteMember error:', err)
    return res.status(500).json({ error: 'Error al añadir miembro' })
  }
}

module.exports = { getFamily, updateFamily, inviteMember }
