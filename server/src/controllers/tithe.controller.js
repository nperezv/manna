const pool = require('../db/pool')
const { getFinancialMonthRange, getYearFinancialMonths } = require('../utils/financialMonth')

async function getStartDay(familyId) {
  const r = await pool.query(`SELECT month_start_day, tithe_percent, fast_offering_percent, fast_offering_fixed FROM families WHERE id = $1`, [familyId])
  return r.rows[0] || { month_start_day: 1, tithe_percent: 10, fast_offering_percent: 2 }
}

const getTitheData = async (req, res) => {
  const { month } = req.query
  const familyId = req.user.familyId
  try {
    const family = await getStartDay(familyId)
    const m = month || new Date().toISOString().slice(0, 7)
    const { from, to } = getFinancialMonthRange(m, family.month_start_day)

    const [titheRes, fastRes, incomeRes] = await Promise.all([
      pool.query(`SELECT * FROM tithe_payments WHERE family_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC`, [familyId, from, to]),
      pool.query(`SELECT * FROM fast_offering_payments WHERE family_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC`, [familyId, from, to]),
      pool.query(`SELECT SUM(amount) as total FROM incomes WHERE family_id = $1 AND date >= $2 AND date <= $3 AND computable = true`, [familyId, from, to]),
    ])

    const computableIncome = parseFloat(incomeRes.rows[0].total) || 0
    const titheOwed = Math.round(computableIncome * (family.tithe_percent / 100) * 100) / 100
    const fastOwed  = family.fast_offering_fixed
      ? parseFloat(family.fast_offering_fixed)
      : Math.round(computableIncome * (family.fast_offering_percent / 100) * 100) / 100
    const tithePaid = titheRes.rows.reduce((s, p) => s + parseFloat(p.amount), 0)
    const fastPaid  = fastRes.rows.reduce((s, p) => s + parseFloat(p.amount), 0)

    return res.json({
      titheOwed, tithePaid, tithePending: Math.max(titheOwed - tithePaid, 0),
      fastOwed,  fastPaid,  fastPending:  Math.max(fastOwed  - fastPaid,  0),
      tithePayments: titheRes.rows,
      fastOfferingPayments: fastRes.rows,
      computableIncome,
      tithePercent: family.tithe_percent,
      fastOfferingPercent: family.fast_offering_percent,
      monthRange: { from, to },
    })
  } catch (err) {
    console.error('getTitheData error:', err)
    return res.status(500).json({ error: 'Error al obtener datos de diezmos' })
  }
}

const registerPayment = async (req, res) => {
  const { tithe_amount, fast_amount, note, receipt_data, receipt_name, date } = req.body
  const familyId = req.user.familyId
  const userId   = req.user.userId
  const payDate  = date || new Date().toISOString().split('T')[0]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let tithePayment = null
    let fastPayment  = null

    if (tithe_amount > 0) {
      const r = await client.query(
        `INSERT INTO tithe_payments (family_id, user_id, amount, note, receipt_data, receipt_name, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [familyId, userId, tithe_amount, note, receipt_data, receipt_name, payDate]
      )
      tithePayment = r.rows[0]
      await client.query(
        `INSERT INTO expenses (family_id, user_id, description, amount, category_id, date, source, auto_from_payment)
         VALUES ($1,$2,$3,$4,1,$5,'manual',$6)`,
        [familyId, userId, note ? `Diezmo — ${note}` : 'Diezmo', tithe_amount, payDate, tithePayment.id]
      )
    }
    if (fast_amount > 0) {
      const r = await client.query(
        `INSERT INTO fast_offering_payments (family_id, user_id, amount, note, receipt_data, receipt_name, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [familyId, userId, fast_amount, note, receipt_data, receipt_name, payDate]
      )
      fastPayment = r.rows[0]
      await client.query(
        `INSERT INTO expenses (family_id, user_id, description, amount, category_id, date, source, auto_from_payment)
         VALUES ($1,$2,$3,$4,11,$5,'manual',$6)`,
        [familyId, userId, note ? `Ofrenda de ayuno — ${note}` : 'Ofrenda de ayuno', fast_amount, payDate, fastPayment.id]
      )
    }
    await client.query('COMMIT')
    req.app.get('emitToFamily')?.(req.user.familyId, 'data_changed', { type: 'tithe' })
    return res.status(201).json({ tithePayment, fastPayment })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('registerPayment error:', err)
    return res.status(500).json({ error: 'Error al registrar pago' })
  } finally { client.release() }
}

const getTitheHistory = async (req, res) => {
  const familyId = req.user.familyId
  try {
    const family = await getStartDay(familyId)
    const months = getYearFinancialMonths(family.month_start_day)
    const result = []

    for (const m of months) {
      const { from, to } = getFinancialMonthRange(m, family.month_start_day)
      const [incomeRes, titheRes, fastRes] = await Promise.all([
        pool.query(`SELECT SUM(amount) as total FROM incomes WHERE family_id=$1 AND date>=$2 AND date<=$3 AND computable=true`, [familyId, from, to]),
        pool.query(`SELECT SUM(amount) as paid FROM tithe_payments WHERE family_id=$1 AND date>=$2 AND date<=$3`, [familyId, from, to]),
        pool.query(`SELECT SUM(amount) as paid FROM fast_offering_payments WHERE family_id=$1 AND date>=$2 AND date<=$3`, [familyId, from, to]),
      ])
      const computable = parseFloat(incomeRes.rows[0].total) || 0
      const titheOwed  = Math.round(computable * (family.tithe_percent / 100) * 100) / 100
      const fastOwed   = family.fast_offering_fixed
        ? parseFloat(family.fast_offering_fixed)
        : Math.round(computable * (family.fast_offering_percent / 100) * 100) / 100

      result.push({
        month: m,
        titheOwed, tithePaid: parseFloat(titheRes.rows[0].paid) || 0,
        fastOwed,  fastPaid:  parseFloat(fastRes.rows[0].paid)  || 0,
        computableIncome: computable,
      })
    }
    return res.json(result)
  } catch (err) {
    console.error('getTitheHistory error:', err)
    return res.status(500).json({ error: 'Error al obtener historial' })
  }
}

module.exports = { getTitheData, registerPayment, getTitheHistory }
