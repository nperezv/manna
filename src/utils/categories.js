// ─── CATEGORY SYSTEM ────────────────────────────────────────────────────────
// Parent categories map to SUD pillars (used in budget + consejero)
// Subcategories are the actual expense categories (used in gastos)

export const PARENT_CATEGORIES = [
  { id: 1,   name: 'Diezmo',                  color: '#e6ad3c', pillar: 1, locked: true  },
  { id: 11,  name: 'Ofrenda de ayuno',         color: '#f5c842', pillar: 1, locked: false },
  { id: 2,   name: 'Vivienda',                 color: '#4a9fd4', pillar: 2, locked: false },
  { id: 20,  name: 'Suministros',              color: '#2d8bbf', pillar: 2, locked: false },
  { id: 3,   name: 'Alimentación',             color: '#e6ad3c', pillar: 2, locked: false },
  { id: 4,   name: 'Transporte',               color: '#8b6cf7', pillar: 2, locked: false },
  { id: 5,   name: 'Educación',                color: '#e05c4e', pillar: 2, locked: false },
  { id: 6,   name: 'Salud',                    color: '#f0a030', pillar: 2, locked: false },
  { id: 21,  name: 'Suscripciones',            color: '#7c5cbf', pillar: 2, locked: false },
  { id: 7,   name: 'Ocio y familia',           color: '#d4548a', pillar: 2, locked: false },
  { id: 8,   name: 'Ahorro emergencias',       color: '#2d9b8a', pillar: 3, locked: false },
  { id: 9,   name: 'Metas de ahorro',          color: '#6b8fd4', pillar: 3, locked: false },
  { id: 10,  name: 'Deudas',                   color: '#c05a3a', pillar: 4, locked: false },
]

export const SUBCATEGORIES = [
  // ── Pilar 1 ──────────────────────────────────────────────────────────────
  { id: 101, parentId: 1,   name: 'Diezmo',                    color: '#e6ad3c' },
  { id: 111, parentId: 11,  name: 'Ofrenda de ayuno',          color: '#f5c842' },

  // ── Vivienda ─────────────────────────────────────────────────────────────
  { id: 201, parentId: 2,   name: 'Alquiler / hipoteca',       color: '#4a9fd4' },
  { id: 202, parentId: 2,   name: 'Comunidad de vecinos',      color: '#5aaee4' },
  { id: 203, parentId: 2,   name: 'Seguro del hogar',          color: '#6abed4' },

  // ── Suministros ──────────────────────────────────────────────────────────
  { id: 204, parentId: 20,  name: 'Electricidad',              color: '#f5c842' },
  { id: 205, parentId: 20,  name: 'Gas',                       color: '#f0a030' },
  { id: 206, parentId: 20,  name: 'Agua',                      color: '#4ab4d4' },
  { id: 207, parentId: 20,  name: 'Internet y fibra',          color: '#5a9fd4' },
  { id: 208, parentId: 20,  name: 'Teléfono móvil',            color: '#6a8fd4' },

  // ── Alimentación ─────────────────────────────────────────────────────────
  { id: 301, parentId: 3,   name: 'Supermercado',              color: '#e6ad3c' },
  { id: 302, parentId: 3,   name: 'Mercado / frutería',        color: '#d4a030' },
  { id: 303, parentId: 3,   name: 'Delivery a domicilio',      color: '#e08020' },

  // ── Transporte ───────────────────────────────────────────────────────────
  { id: 401, parentId: 4,   name: 'Combustible',               color: '#8b6cf7' },
  { id: 402, parentId: 4,   name: 'Transporte público',        color: '#9b7cf7' },
  { id: 403, parentId: 4,   name: 'Seguro de coche',           color: '#7b5ce7' },
  { id: 404, parentId: 4,   name: 'Mantenimiento coche',       color: '#6b4cd7' },
  { id: 405, parentId: 4,   name: 'Parking y peajes',          color: '#ab8cf7' },
  { id: 406, parentId: 4,   name: 'Taxi / Uber / Cabify',      color: '#bb9cf7' },

  // ── Educación ────────────────────────────────────────────────────────────
  { id: 501, parentId: 5,   name: 'Colegio / universidad',     color: '#e05c4e' },
  { id: 502, parentId: 5,   name: 'Extraescolares',            color: '#e07060' },
  { id: 503, parentId: 5,   name: 'Material escolar',          color: '#e08470' },
  { id: 504, parentId: 5,   name: 'Formación adultos',         color: '#e09880' },

  // ── Salud ────────────────────────────────────────────────────────────────
  { id: 601, parentId: 6,   name: 'Farmacia',                  color: '#f0a030' },
  { id: 602, parentId: 6,   name: 'Médico / especialista',     color: '#e09020' },
  { id: 603, parentId: 6,   name: 'Dentista',                  color: '#d08010' },
  { id: 604, parentId: 6,   name: 'Seguro médico',             color: '#f0b040' },
  { id: 605, parentId: 6,   name: 'Óptica',                    color: '#f0c050' },

  // ── Suscripciones ────────────────────────────────────────────────────────
  { id: 701, parentId: 21,  name: 'Streaming (Netflix, etc.)', color: '#7c5cbf' },
  { id: 702, parentId: 21,  name: 'Música (Spotify, etc.)',    color: '#8c6ccf' },
  { id: 703, parentId: 21,  name: 'Software y apps',           color: '#9c7cdf' },
  { id: 704, parentId: 21,  name: 'Gimnasio',                  color: '#6c4caf' },
  { id: 705, parentId: 21,  name: 'Otras suscripciones',       color: '#ac8cef' },

  // ── Ocio y familia ───────────────────────────────────────────────────────
  { id: 801, parentId: 7,   name: 'Restaurantes y bares',      color: '#d4548a' },
  { id: 802, parentId: 7,   name: 'Viajes y vacaciones',       color: '#e4649a' },
  { id: 803, parentId: 7,   name: 'Cultura y entretenimiento', color: '#c4447a' },
  { id: 804, parentId: 7,   name: 'Deporte y actividades',     color: '#b4346a' },
  { id: 805, parentId: 7,   name: 'Ropa y calzado',            color: '#f474aa' },
  { id: 806, parentId: 7,   name: 'Otros gastos',              color: '#e484ba' },

  // ── Ahorro ───────────────────────────────────────────────────────────────
  { id: 901, parentId: 8,   name: 'Fondo de emergencias',      color: '#2d9b8a' },
  { id: 902, parentId: 9,   name: 'Meta de ahorro',            color: '#6b8fd4' },

  // ── Deudas ───────────────────────────────────────────────────────────────
  { id: 1001, parentId: 10, name: 'Hipoteca',                  color: '#c05a3a' },
  { id: 1002, parentId: 10, name: 'Préstamo personal',         color: '#d06a4a' },
  { id: 1003, parentId: 10, name: 'Tarjeta de crédito',        color: '#b04a2a' },
]

// Get parent for a subcategory
export const getParentId = (subcategoryId) => {
  const sub = SUBCATEGORIES.find(s => s.id === subcategoryId)
  return sub?.parentId ?? subcategoryId
}

// Get all subcategories for a parent
export const getSubcategories = (parentId) =>
  SUBCATEGORIES.filter(s => s.parentId === parentId)

// Get category name (works for both parent and sub)
export const getCategoryName = (id) => {
  const sub = SUBCATEGORIES.find(s => s.id === id)
  if (sub) return sub.name
  const parent = PARENT_CATEGORIES.find(p => p.id === id)
  return parent?.name || 'Sin categoría'
}

export const getCategoryColor = (id) => {
  const sub = SUBCATEGORIES.find(s => s.id === id)
  if (sub) return sub.color
  const parent = PARENT_CATEGORIES.find(p => p.id === id)
  return parent?.color || '#888'
}

// Legacy alias — maps old category IDs to new parent IDs for migration
export const LEGACY_TO_PARENT = {
  1: 1, 11: 11, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10
}

// Default subcategory for a parent (used when migrating old expenses)
export const DEFAULT_SUB = {
  1: 101, 11: 111, 2: 201, 3: 301, 4: 401, 5: 501,
  6: 601, 7: 801, 8: 901, 9: 902, 10: 1001, 20: 204, 21: 701
}

// Suggested budget percentages per PARENT category (sums to 100%)
export const SUGGESTED_PCT = {
  1:  0.10,  // diezmo — locked
  11: 0.02,  // ofrenda
  2:  0.25,  // vivienda
  20: 0.08,  // suministros
  3:  0.14,  // alimentación
  4:  0.08,  // transporte
  5:  0.05,  // educación
  6:  0.04,  // salud
  21: 0.04,  // suscripciones
  7:  0.06,  // ocio
  8:  0.08,  // ahorro emergencias
  9:  0.05,  // metas ahorro
  10: 0.05,  // deudas (si las hay)
  // 10+2+25+8+14+8+5+4+4+6+8+5+5 = 104 → reduce vivienda a 22 y suministros a 7
  // Adjusted: 10+2+22+7+14+8+5+4+4+6+8+5+5 = 100 ✓
}
// Fix to exactly 100%
Object.assign(SUGGESTED_PCT, { 2: 0.22, 20: 0.07 })

// Backward compat — old pages use EXPENSE_CATEGORIES
export const EXPENSE_CATEGORIES = PARENT_CATEGORIES

// Note: donation categories are dynamic (stored in useAppStore.donations)
// For unknown IDs (donations), callers should check store.donations first
// getCategoryName/Color return fallbacks for unknown IDs
