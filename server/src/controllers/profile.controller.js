const pool = require('../db/pool')
const bcrypt = require('bcryptjs')

const updateProfile = async (req, res) => {
  const { name, phone } = req.body
  const userId = req.user.userId
  try {
    // Check if phone column exists, add if not
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)
    `).catch(() => {})

    const result = await pool.query(
      `UPDATE users SET
        name  = COALESCE($1, name),
        phone = COALESCE($2, phone)
       WHERE id = $3 RETURNING id, name, email, role, phone`,
      [name || null, phone || null, userId]
    )
    return res.json(result.rows[0])
  } catch (err) {
    console.error('updateProfile error:', err)
    return res.status(500).json({ error: 'Error al actualizar perfil' })
  }
}

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan campos' })
  if (newPassword.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres' })

  try {
    const userRes = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.userId])
    const valid = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' })

    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, req.user.userId])
    return res.json({ ok: true })
  } catch (err) {
    console.error('changePassword error:', err)
    return res.status(500).json({ error: 'Error al cambiar contraseña' })
  }
}

module.exports = { updateProfile, changePassword }
