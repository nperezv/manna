const axios = require('axios')
const jwt   = require('jsonwebtoken')
const fs    = require('fs')
const pool  = require('../db/pool')

const APP_ID   = process.env.ENABLEBANKING_APP_ID
const KEY_PATH = process.env.ENABLEBANKING_KEY_PATH
const BASE_URL = process.env.ENABLEBANKING_BASE_URL || 'https://api.enablebanking.com'
const REDIRECT = process.env.FRONTEND_URL + '/bank/callback'

function makeJWT() {
  const privateKey = fs.readFileSync(KEY_PATH, 'utf8')
  const now = Math.floor(Date.now() / 1000)
  
  return jwt.sign(
    { 
      // PAYLOAD (Cuerpo): Debe ser así según la documentación
      iss: 'enablebanking.com',      // ¡IMPORTANTE! Cambia esto, antes tenías el APP_ID aquí
      aud: 'api.enablebanking.com',  // ¡NUEVO! Añade esta línea
      iat: now, 
      exp: now + 3600 
    },
    privateKey,
    { 
      algorithm: 'RS256',
      header: {
        typ: 'JWT',
        alg: 'RS256',
        kid: APP_ID
      }
    }
  )
}

function apiClient() {
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${makeJWT()}`, 'Content-Type': 'application/json' }
  })
}

// GET /api/bank/institutions?country=ES
const getInstitutions = async (req, res) => {
  try {
    const { country = 'ES' } = req.query
    const { data } = await apiClient().get(`/aspsps/?country=${country}`)
    return res.json(data)
  } catch (err) {
    console.error('getInstitutions error:', err.response?.data || err.message)
    return res.status(500).json({ error: 'Error al obtener bancos' })
  }
}

// POST /api/bank/connect  { institution_id }
const connectBank = async (req, res) => {
  const { institution_id } = req.body
  const { userId, familyId } = req.user
  if (!institution_id) return res.status(400).json({ error: 'institution_id requerido' })

  try {
    const client = apiClient()

    // 1. Create end-user agreement
    const { data: agreement } = await client.post('/consents/', {
      access: { valid_until: new Date(Date.now() + 90*24*3600*1000).toISOString().split('T')[0] },
      aspsp: { name: institution_id, country: 'ES' },
      state: `${familyId}:${userId}`,
      redirect_url: REDIRECT,
      psu_type: 'personal',
    })

    // 2. Save pending connection
    await pool.query(
      `INSERT INTO bank_connections
         (family_id, user_id, provider, institution_id, requisition_id, status)
       VALUES ($1,$2,'enablebanking',$3,$4,'pending')
       ON CONFLICT (family_id, user_id, institution_id)
       DO UPDATE SET requisition_id=$4, status='pending', updated_at=NOW()`,
      [familyId, userId, institution_id, agreement.id]
    )

    return res.json({ auth_url: agreement.url })
  } catch (err) {
    console.error('connectBank error:', err.response?.data || err.message)
    return res.status(500).json({ error: 'Error al iniciar conexión bancaria' })
  }
}

// GET /api/bank/callback?code=...&state=...
const handleCallback = async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/ajustes?bank_error=${error}`)
  }

  try {
    const [familyId, userId] = (state || '').split(':')

    // Find the pending connection
    const connRes = await pool.query(
      `SELECT * FROM bank_connections WHERE family_id=$1 AND user_id=$2 AND status='pending'`,
      [familyId, userId]
    )
    if (!connRes.rows[0]) {
      return res.redirect(`${process.env.FRONTEND_URL}/ajustes?bank_error=no_connection`)
    }

    const conn = connRes.rows[0]

    // Exchange code for session
    const client = apiClient()
    const { data: session } = await client.post('/sessions/', {
      code,
      consent_id: conn.requisition_id,
      redirect_url: REDIRECT,
    })

    // Get accounts
    const { data: accountsData } = await client.get(`/sessions/${session.session_id}/accounts/`)
    const accounts = accountsData.accounts || []

    // Save session and accounts
    await pool.query(
      `UPDATE bank_connections SET
         access_token=$1, status='active', updated_at=NOW()
       WHERE id=$2`,
      [session.session_id, conn.id]
    )

    // Save each account
    for (const acc of accounts) {
      const details = acc.account_id ? await client.get(`/accounts/${acc.account_id}/details/`).catch(() => null) : null
      await pool.query(
        `INSERT INTO bank_accounts (connection_id, family_id, user_id, account_id, iban, name, currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (connection_id, account_id) DO UPDATE SET iban=$5, name=$6, updated_at=NOW()`,
        [conn.id, familyId, userId, acc.account_id,
         details?.data?.account?.iban || null,
         details?.data?.account?.name || acc.account_id,
         acc.currency || 'EUR']
      ).catch(() => {})
    }

    return res.redirect(`${process.env.FRONTEND_URL}/ajustes?bank_connected=1`)
  } catch (err) {
    console.error('handleCallback error:', err.response?.data || err.message)
    return res.redirect(`${process.env.FRONTEND_URL}/ajustes?bank_error=callback_failed`)
  }
}

// POST /api/bank/sync — fetch new transactions
const syncTransactions = async (req, res) => {
  const { familyId, userId } = req.user
  try {
    const connsRes = await pool.query(
      `SELECT bc.*, ba.account_id, ba.iban, ba.id as bank_account_id
       FROM bank_connections bc
       JOIN bank_accounts ba ON ba.connection_id = bc.id
       WHERE bc.family_id=$1 AND bc.status='active'`,
      [familyId]
    )

    if (!connsRes.rows.length) return res.json({ synced: 0 })

    const client = apiClient()
    let totalSynced = 0
    const family = await pool.query(`SELECT month_start_day FROM families WHERE id=$1`, [familyId])
    const startDay = family.rows[0]?.month_start_day || 1

    for (const conn of connsRes.rows) {
      try {
        // Get transactions from last 90 days
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - 90)
        const { data } = await client.get(
          `/accounts/${conn.account_id}/transactions/?date_from=${dateFrom.toISOString().split('T')[0]}`
        )
        const txs = data.transactions?.booked || []

        for (const tx of txs) {
          const txId    = tx.transaction_id || tx.entry_reference
          const amount  = parseFloat(tx.transaction_amount?.amount || 0)
          const date    = tx.booking_date || tx.value_date
          const desc    = tx.remittance_information_unstructured ||
                          tx.creditor_name || tx.debtor_name || 'Movimiento bancario'

          if (!txId || !date) continue

          if (amount < 0) {
            // It's an expense
            const catId = suggestCategory(desc, familyId)
            await pool.query(
              `INSERT INTO expenses (family_id, user_id, description, amount, category_id, date, source, bank_tx_id)
               VALUES ($1,$2,$3,$4,$5,$6,'bank',$7)
               ON CONFLICT (bank_tx_id) DO NOTHING`,
              [familyId, userId, desc, Math.abs(amount), catId, date, txId]
            ).catch(() => {})
            totalSynced++
          } else {
            // It's income
            await pool.query(
              `INSERT INTO incomes (family_id, user_id, source, amount, date, computable, category, bank_tx_id)
               VALUES ($1,$2,$3,$4,$5,true,'salary',$6)
               ON CONFLICT (bank_tx_id) DO NOTHING`,
              [familyId, userId, desc, amount, date, txId]
            ).catch(() => {})
            totalSynced++
          }
        }

        // Update last synced
        await pool.query(
          `UPDATE bank_accounts SET last_synced=NOW() WHERE id=$1`,
          [conn.bank_account_id]
        )
      } catch (err) {
        console.error(`Sync error for account ${conn.account_id}:`, err.message)
      }
    }

    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'expense' })
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'income' })

    return res.json({ synced: totalSynced })
  } catch (err) {
    console.error('syncTransactions error:', err)
    return res.status(500).json({ error: 'Error al sincronizar' })
  }
}

// GET /api/bank/status
const getBankStatus = async (req, res) => {
  const { familyId } = req.user
  try {
    const result = await pool.query(
      `SELECT bc.id, bc.institution_id, bc.institution_name, bc.status, bc.updated_at,
              json_agg(json_build_object(
                'id', ba.id, 'iban', ba.iban, 'name', ba.name,
                'balance', ba.balance, 'last_synced', ba.last_synced
              )) as accounts
       FROM bank_connections bc
       LEFT JOIN bank_accounts ba ON ba.connection_id = bc.id
       WHERE bc.family_id=$1
       GROUP BY bc.id ORDER BY bc.created_at DESC`,
      [familyId]
    )
    return res.json(result.rows)
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener estado' })
  }
}

// DELETE /api/bank/connections/:id
const disconnectBank = async (req, res) => {
  const { id } = req.params
  const { familyId } = req.user
  try {
    await pool.query(
      `UPDATE bank_connections SET status='disconnected' WHERE id=$1 AND family_id=$2`,
      [id, familyId]
    )
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al desconectar' })
  }
}

// Simple category suggester based on description patterns
function suggestCategory(desc, familyId) {
  const d = desc.toUpperCase()
  if (/MERCADONA|LIDL|ALDI|CARREFOUR|SUPERMERCADO|HIPERCOR|DIA |ALCAMPO/.test(d)) return 301 // Alimentación - Supermercado
  if (/ALQUILER|HIPOTECA|COMUNIDAD/.test(d)) return 201 // Vivienda
  if (/IBERDROLA|ENDESA|NATURGY|AGUA|LUZ |GAS |ELECTRICIDAD/.test(d)) return 204 // Suministros
  if (/RENFE|EMT|METRO|CABIFY|UBER|GASOLINERA|REPSOL/.test(d)) return 401 // Transporte
  if (/FARMACIA|MEDICO|CLINICA|HOSPITAL|SANIDAD/.test(d)) return 601 // Salud
  if (/NETFLIX|SPOTIFY|AMAZON PRIME|HBO|DISNEY/.test(d)) return 701 // Suscripciones
  if (/COLEGIO|ESCUELA|ACADEMIA|UNIVERSIDAD/.test(d)) return 501 // Educación
  if (/RESTAURANTE|BAR |CAFE |CAFETERIA|MCDONALDS|BURGER/.test(d)) return 302 // Alimentación - Restaurantes
  return 3 // Alimentación (genérico si no encaja)
}

module.exports = { getInstitutions, connectBank, handleCallback, syncTransactions, getBankStatus, disconnectBank }
