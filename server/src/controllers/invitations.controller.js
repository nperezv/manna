const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')
const { sendInvitation } = require('../utils/email')

const invite = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo el administrador puede invitar' })
  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  try {
    const existing = await pool.query(`SELECT id FROM users WHERE email = $1 AND family_id = $2`, [email.toLowerCase(), req.user.familyId])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Este email ya pertenece a tu familia' })

    const pending = await pool.query(`SELECT id FROM invitations WHERE email = $1 AND family_id = $2 AND status = 'pending' AND expires_at > NOW()`, [email.toLowerCase(), req.user.familyId])
    if (pending.rows.length > 0) return res.status(409).json({ error: 'Ya hay una invitación pendiente para este email' })

    const [familyRes, inviterRes] = await Promise.all([
      pool.query(`SELECT name FROM families WHERE id = $1`, [req.user.familyId]),
      pool.query(`SELECT name FROM users WHERE id = $1`, [req.user.userId]),
    ])

    const token = uuidv4()
    await pool.query(
      `INSERT INTO invitations (family_id, email, name, token, invited_by, expires_at)
       VALUES ($1,$2,$3,$4,$5, NOW() + INTERVAL '7 days')`,
      [req.user.familyId, email.toLowerCase(), name, token, req.user.userId]
    )

    sendInvitation({ to: email.toLowerCase(), name, familyName: familyRes.rows[0].name, invitedBy: inviterRes.rows[0].name, token })
      .catch(err => console.error('Email error:', err))

    return res.status(201).json({ ok: true, message: `Invitación enviada a ${email}` })
  } catch (err) {
    console.error('invite error:', err)
    return res.status(500).json({ error: 'Error al enviar invitación' })
  }
}

const list = async (req, res) => {
  try {
    const result = await pool.query(`SELECT i.*, u.name as invited_by_name FROM invitations i LEFT JOIN users u ON i.invited_by = u.id WHERE i.family_id = $1 ORDER BY i.created_at DESC`, [req.user.familyId])
    return res.json(result.rows)
  } catch (err) { return res.status(500).json({ error: 'Error al obtener invitaciones' }) }
}

const checkToken = async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token requerido' })
  try {
    const result = await pool.query(`SELECT i.*, f.name as family_name FROM invitations i JOIN families f ON i.family_id = f.id WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`, [token])
    if (!result.rows[0]) return res.status(404).json({ error: 'Invitación no válida o caducada' })
    const inv = result.rows[0]
    return res.json({ valid: true, email: inv.email, name: inv.name, familyName: inv.family_name, familyId: inv.family_id })
  } catch (err) { return res.status(500).json({ error: 'Error al verificar' }) }
}

const accept = async (req, res) => {
  const { token, name, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' })
  if (password.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const invRes = await client.query(`SELECT i.*, f.name as family_name FROM invitations i JOIN families f ON i.family_id = f.id WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW() FOR UPDATE`, [token])
    if (!invRes.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Invitación no válida o caducada' }) }
    const inv = invRes.rows[0]

    const exists = await client.query(`SELECT id FROM users WHERE email = $1`, [inv.email])
    if (exists.rows.length > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Este email ya tiene cuenta. Ve a iniciar sesión.' }) }

    const hash = await bcrypt.hash(password, 12)
    const userRes = await client.query(`INSERT INTO users (family_id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,'member') RETURNING *`, [inv.family_id, name || inv.name || 'Miembro', inv.email, hash])
    await client.query(`UPDATE invitations SET status = 'accepted' WHERE id = $1`, [inv.id])
    await client.query('COMMIT')

    const user = userRes.rows[0]
    const payload = { userId: user.id, familyId: user.family_id, role: user.role, name: user.name }
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query(`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)`, [user.id, refreshToken, expiresAt])

    return res.status(201).json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role }, family: { id: inv.family_id, name: inv.family_name } })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('accept error:', err)
    return res.status(500).json({ error: 'Error al aceptar invitación' })
  } finally { client.release() }
}

const cancel = async (req, res) => {
  try {
    await pool.query(`UPDATE invitations SET status = 'expired' WHERE id = $1 AND family_id = $2`, [req.params.id, req.user.familyId])
    return res.json({ ok: true })
  } catch (err) { return res.status(500).json({ error: 'Error al cancelar' }) }
}

module.exports = { invite, list, checkToken, accept, cancel }
