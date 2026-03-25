require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const rateLimit = require('express-rate-limit')
const http    = require('http')
const { Server } = require('socket.io')

const routes = require('./src/routes')
const pool   = require('./src/db/pool')

const app    = express()
const server = http.createServer(app)
const PORT   = process.env.PORT || 3001

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }
})

// Make io accessible in controllers via app.get('io')
app.set('io', io)

io.on('connection', (socket) => {
  // Client joins their family room
  socket.on('join_family', (familyId) => {
    if (familyId) {
      socket.join(`family-${familyId}`)
    }
  })
  socket.on('disconnect', () => {})
})

// Helper — emit to all family members (used in controllers)
app.set('emitToFamily', (familyId, event, data) => {
  io.to(`family-${familyId}`).emit(event, data)
})

// ── Express middleware ────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Demasiados intentos, espera 15 minutos' },
}))
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }))
app.use(express.json({ limit: '10mb' }))
app.use('/api', routes)

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected', app: 'Manna API', version: '1.0.0' })
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected' })
  }
})

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

server.listen(PORT, () => {
  console.log(`
  ✦ Manna API running
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Local:   http://localhost:${PORT}
  Health:  http://localhost:${PORT}/health
  DB:      ${process.env.DB_NAME}@${process.env.DB_HOST}
  Env:     ${process.env.NODE_ENV}
  `)
})
