import { SUBCATEGORIES, getParentId } from './categories'

// Maps merchant/bank text → subcategory ID
export const CATEGORY_RULES = [
  // ── Pilar 1 ──────────────────────────────────────────────────────────────
  { id: 101,  patterns: ['iglesia jesucristo', 'lds', 'diezmo'] },
  { id: 111,  patterns: ['ofrenda ayuno', 'fast offering'] },

  // ── Vivienda ─────────────────────────────────────────────────────────────
  { id: 201,  patterns: ['alquiler', 'hipoteca', 'arrendamiento'] },
  { id: 202,  patterns: ['comunidad propietarios', 'comunidad vecinos', 'administrador finca'] },
  { id: 203,  patterns: ['seguro hogar', 'mapfre hogar', 'axa hogar', 'mutua hogar'] },

  // ── Suministros ──────────────────────────────────────────────────────────
  { id: 204,  patterns: ['iberdrola', 'endesa', 'naturgy luz', 'repsol luz', 'totalenergies', 'holaluz', 'factor energia'] },
  { id: 205,  patterns: ['naturgy gas', 'repsol gas', 'nedgia', 'gas natural'] },
  { id: 206,  patterns: ['canal isabel', 'aguas de madrid', 'emasagra', 'agbar', 'aqualia', 'empresa municipal aguas'] },
  { id: 207,  patterns: ['vodafone', 'movistar fibra', 'orange fibra', 'masmovil', 'jazztel', 'euskaltel', 'r cable', 'digi fibra'] },
  { id: 208,  patterns: ['movistar movil', 'orange movil', 'digi movil', 'yoigo', 'pepephone', 'amena', 'simyo', 'lowi'] },

  // ── Alimentación ─────────────────────────────────────────────────────────
  { id: 301,  patterns: ['mercadona', 'carrefour', 'lidl', 'aldi', 'eroski', 'alcampo', 'hipercor', 'supercor', 'consum', 'dia ', 'bon preu', 'supermercado', 'economato'] },
  { id: 302,  patterns: ['fruteria', 'verduleria', 'carniceria', 'pescaderia', 'panaderia', 'mercado municipal', 'plaza de abastos'] },
  { id: 303,  patterns: ['just eat', 'glovo', 'uber eats', 'deliveroo', 'telepizza', 'dominos', 'pizza hut', 'pedidos ya'] },

  // ── Transporte ───────────────────────────────────────────────────────────
  { id: 401,  patterns: ['gasolinera', 'repsol gasolinera', 'bp ', 'shell ', 'cepsa', 'galp ', 'campsa'] },
  { id: 402,  patterns: ['renfe', 'feve', 'metro ', 'cercanias', 'bus ', 'autobus', 'tram ', 'emt ', 'tmb ', 'bicing', 'abono transporte', 'tarjeta transporte'] },
  { id: 403,  patterns: ['mapfre auto', 'axa seguro coche', 'mutua automovilista', 'zurich auto', 'generali auto', 'linea directa', 'verti ', 'fenixa', 'seguro coche', 'seguro vehiculo'] },
  { id: 404,  patterns: ['taller', 'mecanico', 'automovil', 'neumaticos', 'itv ', 'inspeccion vehiculo', 'recauchutado', 'bosch car'] },
  { id: 405,  patterns: ['parking', 'estacionamiento', 'zona azul', 'servipark', 'indigo park', 'empark', 'peaje', 'autopista', 'ap-7', 'ap-6', 'ap-4'] },
  { id: 406,  patterns: ['uber', 'cabify', 'blablacar', 'taxi', 'mydriver', 'bolt '] },

  // ── Educación ────────────────────────────────────────────────────────────
  { id: 501,  patterns: ['colegio', 'escuela', 'instituto', 'universidad', 'ampa', 'comedor escolar', 'matricula'] },
  { id: 502,  patterns: ['extraescolar', 'conservatorio', 'academia', 'ingles', 'natacion', 'futbol escuela', 'danza', 'musica escuela'] },
  { id: 503,  patterns: ['material escolar', 'libreria', 'papeleria', 'libros texto'] },
  { id: 504,  patterns: ['udemy', 'coursera', 'linkedin learning', 'openwebinars', 'domestika', 'platzi', 'formacion', 'curso online'] },

  // ── Salud ────────────────────────────────────────────────────────────────
  { id: 601,  patterns: ['farmacia', 'parafarmacia'] },
  { id: 602,  patterns: ['clinica', 'hospital', 'centro medico', 'consulta medica', 'fisioterapia', 'psicologia', 'podologia'] },
  { id: 603,  patterns: ['dentista', 'clinica dental', 'ortodon', 'implante dental'] },
  { id: 604,  patterns: ['sanitas', 'adeslas', 'asisa', 'cigna', 'dkv ', 'generali salud', 'mapfre salud', 'seguro medico', 'mutua medica', 'seguro dental'] },
  { id: 605,  patterns: ['optica', 'gafas', 'lentillas', 'multioftalmica', 'general optica', 'vision plus'] },

  // ── Suscripciones ────────────────────────────────────────────────────────
  { id: 701,  patterns: ['netflix', 'disney', 'hbo', 'hbomax', 'prime video', 'apple tv', 'movistar plus', 'filmin', 'atresplayer', 'rtve'] },
  { id: 702,  patterns: ['spotify', 'apple music', 'amazon music', 'deezer', 'tidal', 'youtube premium'] },
  { id: 703,  patterns: ['microsoft 365', 'office 365', 'adobe', 'dropbox', 'icloud', 'google one', 'antivirus', 'nordvpn'] },
  { id: 704,  patterns: ['gimnasio', 'fitness', 'basic fit', 'mcfit', 'anytime fitness', 'virgin active', 'holmes place'] },
  { id: 705,  patterns: ['amazon prime', 'el pais', 'el mundo', 'suscripcion', 'membresia'] },

  // ── Ocio ─────────────────────────────────────────────────────────────────
  { id: 801,  patterns: ['restaurante', 'bar ', 'cafeteria', 'mcdonalds', 'burger king', 'kfc', 'starbucks', 'vips ', 'cerveceria', 'marisqueria', 'mesón', 'taberna'] },
  { id: 802,  patterns: ['booking', 'airbnb', 'hotel', 'apartamento vacacional', 'vueling', 'iberia', 'ryanair', 'easyjet', 'aena', 'agencia viajes', 'logitravel'] },
  { id: 803,  patterns: ['cine ', 'teatro', 'concierto', 'entrada evento', 'ticketmaster', 'entradas com', 'museo', 'parque tematico'] },
  { id: 804,  patterns: ['decathlon', 'go sport', 'sport zone', 'intersport', 'padel', 'tenis', 'pilates', 'crossfit', 'spinning'] },
  { id: 805,  patterns: ['zara', 'h&m', 'mango', 'primark', 'pull and bear', 'bershka', 'stradivarius', 'massimo dutti', 'el corte ingles moda', 'nike', 'adidas', 'calzedonia'] },
  { id: 806,  patterns: ['amazon', 'el corte ingles', 'fnac', 'mediamarkt', 'pccomponentes', 'aliexpress', 'shein'] },

  // ── Ahorro ───────────────────────────────────────────────────────────────
  { id: 901,  patterns: ['fondo emergencia', 'ahorro emergencia'] },
  { id: 902,  patterns: ['deposito ', 'inversion', 'fondo inversion', 'plan pensiones', 'robo advisor'] },

  // ── Deudas ───────────────────────────────────────────────────────────────
  { id: 1001, patterns: ['cuota hipoteca', 'prestamo hipotecario'] },
  { id: 1002, patterns: ['prestamo personal', 'cetelem', 'cofidis', 'santander consumer', 'financiacion'] },
  { id: 1003, patterns: ['tarjeta credito', 'wizink', 'aplazame', 'pago aplazado', 'cuota tarjeta'] },
]

export function suggestCategory(text, customRules = []) {
  if (!text) return { categoryId: 301, parentId: 3, confidence: 'low', matched: null }

  const normalized = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()

  // 1. Custom user rules (highest priority)
  for (const rule of customRules) {
    if (normalized.includes(rule.pattern.toLowerCase())) {
      const sub = SUBCATEGORIES.find(s => s.id === rule.categoryId)
      return {
        categoryId: rule.categoryId,
        parentId: sub?.parentId || rule.categoryId,
        confidence: 'high',
        matched: rule.pattern,
        isCustom: true,
      }
    }
  }

  // 2. Default rules — subcategory level
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
        const sub = SUBCATEGORIES.find(s => s.id === rule.id)
        return {
          categoryId: rule.id,
          parentId: sub?.parentId || rule.id,
          confidence: 'high',
          matched: pattern,
        }
      }
    }
  }

  // 3. Partial matching
  const words = normalized.split(/\s+/)
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      const pw = pattern.split(/\s+/)
      if (pw.some(p => words.some(w => w.startsWith(p) && p.length > 3))) {
        const sub = SUBCATEGORIES.find(s => s.id === rule.id)
        return {
          categoryId: rule.id,
          parentId: sub?.parentId || rule.id,
          confidence: 'medium',
          matched: pattern,
        }
      }
    }
  }

  return { categoryId: 301, parentId: 3, confidence: 'low', matched: null }
}

export function categorizeTransactions(transactions, customRules = []) {
  return transactions.map(tx => ({
    ...tx,
    suggestedCategory: suggestCategory(tx.description || tx.merchant || '', customRules),
  }))
}
