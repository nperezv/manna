const pool = require('../db/pool')
const { getFinancialMonthRange } = require('../utils/financialMonth')

async function getStartDay(familyId) {
  const r = await pool.query(`SELECT month_start_day FROM families WHERE id = $1`, [familyId])
  return r.rows[0]?.month_start_day || 1
}

// GET /api/budget?month=2026-03
const getBudget = async (req, res) => {
  const { month } = req.query
  const familyId = req.user.familyId
  const m = month || new Date().toISOString().slice(0, 7)

  try {
    const startDay = await getStartDay(familyId)
    const { from, to } = getFinancialMonthRange(m, startDay)

    const [budgetRes, subBudgetRes, expensesRes, familyRes, incomesRes, debtsRes] = await Promise.all([
      pool.query(`SELECT * FROM budget_categories WHERE family_id=$1 AND month=$2`, [familyId, m]),
      pool.query(`SELECT * FROM subcategory_budgets WHERE family_id=$1 AND month=$2`, [familyId, m]),
      pool.query(
        `SELECT category_id, SUM(amount) as spent FROM expenses
         WHERE family_id=$1 AND date>=$2 AND date<=$3 GROUP BY category_id`,
        [familyId, from, to]
      ),
      pool.query(
        `SELECT tithe_percent, fast_offering_percent, fast_offering_fixed FROM families WHERE id=$1`,
        [familyId]
      ),
      pool.query(
        `SELECT SUM(amount) as total FROM incomes
         WHERE family_id=$1 AND date>=$2 AND date<=$3 AND computable=true`,
        [familyId, from, to]
      ),
      pool.query(
        `SELECT id, name, monthly_payment, remaining FROM debts WHERE family_id=$1 AND active=true`,
        [familyId]
      ),
    ])

    const spentByCategory = {}
    expensesRes.rows.forEach(r => { spentByCategory[r.category_id] = parseFloat(r.spent) })

    const family = familyRes.rows[0]
    const computableIncome = parseFloat(incomesRes.rows[0]?.total) || 0
    const titheOwed = Math.round(computableIncome * (family.tithe_percent / 100) * 100) / 100
    const fastOwed  = family.fast_offering_fixed
      ? parseFloat(family.fast_offering_fixed)
      : Math.round(computableIncome * (family.fast_offering_percent / 100) * 100) / 100
    const totalDebtPayments = debtsRes.rows.reduce((s, d) => s + (parseFloat(d.monthly_payment) || 0), 0)

    return res.json({
      budgetCategories: budgetRes.rows,
      subcategoryBudgets: subBudgetRes.rows,
      spentByCategory,
      month: m,
      // Auto-calculated values the UI needs
      titheOwed,
      fastOwed,
      totalDebtPayments,
      debts: debtsRes.rows,
      computableIncome,
    })
  } catch (err) {
    console.error('getBudget error:', err)
    return res.status(500).json({ error: 'Error al obtener presupuesto' })
  }
}

const upsertBudgetCategory = async (req, res) => {
  const { category_id, budgeted, month } = req.body
  const familyId = req.user.familyId
  const m = month || new Date().toISOString().slice(0, 7)
  try {
    const result = await pool.query(
      `INSERT INTO budget_categories (family_id, category_id, budgeted, month)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (family_id, category_id, month) DO UPDATE SET budgeted=$3 RETURNING *`,
      [familyId, category_id, budgeted, m]
    )
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'budget' })
    return res.json(result.rows[0])
  } catch (err) {
    console.error('upsertBudgetCategory error:', err)
    return res.status(500).json({ error: 'Error al actualizar presupuesto' })
  }
}

const upsertSubcategoryBudget = async (req, res) => {
  const { subcategory_id, budgeted, month } = req.body
  const familyId = req.user.familyId
  const m = month || new Date().toISOString().slice(0, 7)
  try {
    const result = await pool.query(
      `INSERT INTO subcategory_budgets (family_id, subcategory_id, budgeted, month)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (family_id, subcategory_id, month) DO UPDATE SET budgeted=$3 RETURNING *`,
      [familyId, subcategory_id, budgeted, m]
    )
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'budget' })
    return res.json(result.rows[0])
  } catch (err) {
    console.error('upsertSubcategoryBudget error:', err)
    return res.status(500).json({ error: 'Error al actualizar subcategoría' })
  }
}

// ── Custom subcategories (shared across family via DB) ────────

// Default subcategories to seed for new families
const DEFAULT_SUBS = [
  { name: 'Alquiler / hipoteca',    color: '#4a9fd4', parent_id: 2,  pillar: 2 },
  { name: 'Comunidad de vecinos',   color: '#5aaee4', parent_id: 2,  pillar: 2 },
  { name: 'Seguro del hogar',       color: '#6abed4', parent_id: 2,  pillar: 2 },
  { name: 'Agua',                   color: '#2d8bbf', parent_id: 20, pillar: 2 },
  { name: 'Electricidad',           color: '#3d9bcf', parent_id: 20, pillar: 2 },
  { name: 'Gas',                    color: '#4dabbf', parent_id: 20, pillar: 2 },
  { name: 'Internet / teléfono',    color: '#5dbbcf', parent_id: 20, pillar: 2 },
  { name: 'Supermercado',           color: '#e6ad3c', parent_id: 3,  pillar: 2 },
  { name: 'Restaurantes',           color: '#f0bd4c', parent_id: 3,  pillar: 2 },
  { name: 'Transporte público',     color: '#8b6cf7', parent_id: 4,  pillar: 2 },
  { name: 'Gasolina',               color: '#9b7cf7', parent_id: 4,  pillar: 2 },
  { name: 'Colegio / universidad',  color: '#e05c4e', parent_id: 5,  pillar: 2 },
  { name: 'Material escolar',       color: '#f06c5e', parent_id: 5,  pillar: 2 },
  { name: 'Farmacia',               color: '#f0a030', parent_id: 6,  pillar: 2 },
  { name: 'Médico / seguro',        color: '#f0b040', parent_id: 6,  pillar: 2 },
  { name: 'Streaming',              color: '#7c5cbf', parent_id: 21, pillar: 2 },
  { name: 'Gimnasio',               color: '#8c6ccf', parent_id: 21, pillar: 2 },
  { name: 'Ocio familiar',          color: '#d4548a', parent_id: 7,  pillar: 2 },
  { name: 'Vacaciones',             color: '#e4649a', parent_id: 7,  pillar: 2 },
]

async function seedDefaultSubs(familyId) {
  for (const sub of DEFAULT_SUBS) {
    await pool.query(
      `INSERT INTO custom_subcategories (family_id, name, color, parent_id, pillar, bank_channel, budgeted)
       VALUES ($1,$2,$3,$4,$5,'manual',0)
       ON CONFLICT DO NOTHING`,
      [familyId, sub.name, sub.color, sub.parent_id, sub.pillar]
    ).catch(() => {})
  }
}


const getCustomSubs = async (req, res) => {
  const { parent_id } = req.query
  const familyId = req.user.familyId
  try {
    // Check if family has any custom subs — if not, seed defaults
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM custom_subcategories WHERE family_id=$1`, [familyId]
    )
    if (parseInt(countRes.rows[0].count) === 0) {
      await seedDefaultSubs(familyId)
    }

    const q = parent_id
      ? `SELECT * FROM custom_subcategories WHERE family_id=$1 AND parent_id=$2 ORDER BY created_at`
      : `SELECT * FROM custom_subcategories WHERE family_id=$1 ORDER BY created_at`
    const result = await pool.query(q, parent_id ? [familyId, parseInt(parent_id)] : [familyId])
    return res.json(result.rows)
  } catch (err) {
    console.error('getCustomSubs error:', err)
    return res.status(500).json({ error: 'Error al obtener subcategorías' })
  }
}

const createCustomSub = async (req, res) => {
  const { name, color, parent_id, pillar, bank_channel, bank_pattern, budgeted } = req.body
  const familyId = req.user.familyId
  try {
    const result = await pool.query(
      `INSERT INTO custom_subcategories (family_id, name, color, parent_id, pillar, bank_channel, bank_pattern, budgeted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [familyId, name, color||'#4a9fd4', parent_id, pillar||1, bank_channel||'manual', bank_pattern||'', budgeted||0]
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('createCustomSub error:', err)
    return res.status(500).json({ error: 'Error al crear subcategoría' })
  }
}

const updateCustomSub = async (req, res) => {
  const { id } = req.params
  const { name, color, budgeted } = req.body
  const familyId = req.user.familyId
  try {
    const result = await pool.query(
      `UPDATE custom_subcategories SET
        name     = COALESCE($1, name),
        color    = COALESCE($2, color),
        budgeted = COALESCE($3, budgeted)
       WHERE id=$4 AND family_id=$5 RETURNING *`,
      [name||null, color||null, budgeted!=null?budgeted:null, id, familyId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrada' })
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'budget' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar subcategoría' })
  }
}

const deleteCustomSub = async (req, res) => {
  const { id } = req.params
  const familyId = req.user.familyId
  try {
    await pool.query(`DELETE FROM custom_subcategories WHERE id=$1 AND family_id=$2`, [id, familyId])
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'budget' })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar subcategoría' })
  }
}

// ── Renamed system subs (stored as JSONB on families table) ──

const getRenamedSubs = async (req, res) => {
  const familyId = req.user.familyId
  try {
    await pool.query(`ALTER TABLE families ADD COLUMN IF NOT EXISTS renamed_subs jsonb DEFAULT '{}'`).catch(()=>{})
    const result = await pool.query(`SELECT renamed_subs FROM families WHERE id=$1`, [familyId])
    return res.json(result.rows[0]?.renamed_subs || {})
  } catch (err) {
    return res.json({})
  }
}

const updateRenamedSub = async (req, res) => {
  const { sub_id, name } = req.body
  const familyId = req.user.familyId
  try {
    await pool.query(`ALTER TABLE families ADD COLUMN IF NOT EXISTS renamed_subs jsonb DEFAULT '{}'`).catch(()=>{})
    await pool.query(
      `UPDATE families SET renamed_subs = COALESCE(renamed_subs,'{}') || $1::jsonb WHERE id=$2`,
      [JSON.stringify({[sub_id]: name}), familyId]
    )
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'budget' })
    return res.json({ ok: true })
  } catch (err) {
    console.error('updateRenamedSub error:', err)
    return res.status(500).json({ error: 'Error al renombrar' })
  }
}


// ── Hidden system subs (stored as JSONB on families table) ───

const getHiddenSubs = async (req, res) => {
  const familyId = req.user.familyId
  try {
    await pool.query(`ALTER TABLE families ADD COLUMN IF NOT EXISTS hidden_subs jsonb DEFAULT '[]'`).catch(()=>{})
    const result = await pool.query(`SELECT hidden_subs FROM families WHERE id=$1`, [familyId])
    return res.json(result.rows[0]?.hidden_subs || [])
  } catch (err) {
    return res.json([])
  }
}

const hideSystemSub = async (req, res) => {
  const { sub_id } = req.body
  const familyId = req.user.familyId
  try {
    await pool.query(`ALTER TABLE families ADD COLUMN IF NOT EXISTS hidden_subs jsonb DEFAULT '[]'`).catch(()=>{})
    await pool.query(
      `UPDATE families SET hidden_subs = COALESCE(hidden_subs,'[]'::jsonb) || $1::jsonb WHERE id=$2`,
      [JSON.stringify([sub_id]), familyId]
    )
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'budget' })
    return res.json({ ok: true })
  } catch (err) {
    console.error('hideSystemSub error:', err)
    return res.status(500).json({ error: 'Error al ocultar subcategoría' })
  }
}

const showSystemSub = async (req, res) => {
  const { sub_id } = req.body
  const familyId = req.user.familyId
  try {
    await pool.query(`ALTER TABLE families ADD COLUMN IF NOT EXISTS hidden_subs jsonb DEFAULT '[]'`).catch(()=>{})
    // Remove sub_id from the array
    await pool.query(
      `UPDATE families SET hidden_subs = (
        SELECT jsonb_agg(elem) FROM jsonb_array_elements(COALESCE(hidden_subs,'[]')) elem
        WHERE elem::text != $1::text
      ) WHERE id=$2`,
      [sub_id, familyId]
    )
    req.app.get('emitToFamily')?.(familyId, 'data_changed', { type: 'budget' })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'Error al mostrar subcategoría' })
  }
}

module.exports = {
  getBudget, upsertBudgetCategory, upsertSubcategoryBudget,
  getCustomSubs, createCustomSub, updateCustomSub, deleteCustomSub,
  getRenamedSubs, updateRenamedSub,
  getHiddenSubs, hideSystemSub, showSystemSub,
}
