const bcrypt = require('bcryptjs')
const { sendWelcome } = require('../utils/email')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db/pool')

const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    familyId: user.family_id,
    role: user.role,
    name: user.name,
  }
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  )
  return { accessToken, refreshToken }
}

// POST /api/auth/register
// Creates family + admin user in one step
const register = async (req, res) => {
  const { familyName, name, email, password } = req.body
  if (!familyName || !name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check email not taken
    const exists = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (exists.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Este email ya está registrado' })
    }

    // Create family
    const familyRes = await client.query(
      `INSERT INTO families (name) VALUES ($1) RETURNING *`,
      [familyName]
    )
    const family = familyRes.rows[0]

    // Create admin user
    const hash = await bcrypt.hash(password, 12)
    const userRes = await client.query(
      `INSERT INTO users (family_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING *`,
      [family.id, name, email.toLowerCase(), hash]
    )
    const user = userRes.rows[0]

    await client.query('COMMIT')

    const { accessToken, refreshToken } = generateTokens(user)

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    )

    // Send welcome email (non-blocking)
    sendWelcome({ to: user.email, name: user.name, familyName: family.name }).catch(err => {
      console.error('Welcome email failed:', err.message)
    })

    // Send welcome email (non-blocking)
      .catch(err => console.error('Welcome email error:', err))

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      family: { id: family.id, name: family.name },
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Register error:', err)
    return res.status(500).json({ error: 'Error al crear la cuenta' })
  } finally {
    client.release()
  }
}

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  try {
    const result = await pool.query(
      `SELECT u.*, f.name as family_name FROM users u
       JOIN families f ON u.family_id = f.id
       WHERE u.email = $1 AND u.active = true`,
      [email.toLowerCase()]
    )
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const { accessToken, refreshToken } = generateTokens(user)

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    )

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      family: { id: user.family_id, name: user.family_name },
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token requerido' })

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    const stored = await pool.query(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
      [refreshToken]
    )
    if (stored.rows.length === 0) {
      return res.status(401).json({ error: 'Token inválido o expirado' })
    }

    const userRes = await pool.query(
      `SELECT u.*, f.name as family_name FROM users u
       JOIN families f ON u.family_id = f.id
       WHERE u.id = $1`,
      [payload.userId]
    )
    const user = userRes.rows[0]
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })

    // Rotate refresh token
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken])
    const tokens = generateTokens(user)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokens.refreshToken, expiresAt]
    )

    return res.json({
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// POST /api/auth/logout
const logout = async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken) {
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken])
  }
  return res.json({ ok: true })
}

module.exports = { register, login, refresh, logout }
