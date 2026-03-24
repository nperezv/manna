import { getLast6Months, getCurrentMonth } from './helpers'
import { PARENT_CATEGORIES as EXPENSE_CATEGORIES } from './categories'

const fmt = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getMonthIncome(incomes, month) {
  return incomes.filter(i => i.date.startsWith(month)).reduce((s, i) => s + i.amount, 0)
}

function getMonthExpenses(expenses, month) {
  return expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
}

function getCatExpenses(expenses, catId, month, customSubs = [], dons = []) {
  const isParent = catId < 100
  return expenses.filter(e => {
    if (!e.date.startsWith(month)) return false
    if (e.categoryId === catId) return true
    if (!isParent) return false
    const subId = e.categoryId
    if ((customSubs || []).some(c => c.id === subId && c.parentId === catId)) return true
    if (catId === 1 && (dons || []).some(d => d.id === subId)) return true
    if (subId < 100) return false
    const subParent =
      subId >= 1001 ? 10 : subId >= 901 ? (subId < 902 ? 8 : 9) :
      subId >= 801 ? 7 : subId >= 701 ? 21 : subId >= 601 ? 6 :
      subId >= 501 ? 5 : subId >= 401 ? 4 : subId >= 301 ? 3 :
      subId >= 204 ? 20 : subId >= 201 ? 2 : subId >= 111 ? 11 :
      subId >= 101 ? 1 : null
    return subParent === catId
  }).reduce((s, e) => s + e.amount, 0)
}

function avgOver(values) {
  const nonZero = values.filter(v => v > 0)
  return nonZero.length ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0
}

// ─── MAIN ENGINE ────────────────────────────────────────────────────────────

export function analyzeFinances(store) {
  const {
    incomes, expenses, debts, savingsGoals,
    budgetCategories, tithePayments, tithePercent,
    mealCost, fastOfferingAmount,
    customSubcategories, donations,
  } = store
  const customSubs = customSubcategories || []
  const dons = donations || []

  const months = getLast6Months()
  const curMonth = getCurrentMonth()
  const fastOffering = fastOfferingAmount || mealCost * 2

  const insights = []

  // ── Monthly data ──
  const monthlyData = months.map(m => ({
    month: m,
    income: getMonthIncome(incomes, m),
    expenses: getMonthExpenses(expenses, m),
    titheOwed: getMonthIncome(incomes, m) * (tithePercent / 100),
    tithePaid: tithePayments.filter(p => (p.date?.startsWith(m) || p.month === m)).reduce((s, p) => s + p.amount, 0),
  }))

  const curData = monthlyData.find(d => d.month === curMonth) || { income: 0, expenses: 0, titheOwed: 0, tithePaid: 0 }
  const avgIncome = avgOver(monthlyData.map(d => d.income))
  const avgExpenses = avgOver(monthlyData.map(d => d.expenses))
  const avgSavings = avgOver(monthlyData.map(d => Math.max(d.income - d.expenses, 0)))

  // ── HEALTH SCORE ──
  let score = 100
  const factors = []

  // Tithe compliance
  const titheMonths = monthlyData.filter(d => d.titheOwed > 0)
  const titheCompliance = titheMonths.length
    ? titheMonths.filter(d => d.tithePaid >= d.titheOwed * 0.99).length / titheMonths.length
    : 1
  if (titheCompliance < 1) { score -= (1 - titheCompliance) * 20; factors.push({ label: 'Diezmo', ok: false }) }
  else factors.push({ label: 'Diezmo', ok: true })

  // Savings rate
  const savingsRate = curData.income > 0 ? (curData.income - curData.expenses) / curData.income : 0
  if (savingsRate < 0.1) { score -= 20; factors.push({ label: 'Ahorro', ok: false }) }
  else if (savingsRate < 0.2) { score -= 8; factors.push({ label: 'Ahorro', ok: true }) }
  else factors.push({ label: 'Ahorro', ok: true })

  // Over budget categories
  const overBudget = budgetCategories.filter(c => {
    if (!c.budgeted) return false
    return getCatExpenses(expenses, c.id, curMonth, customSubs, dons) > c.budgeted * 1.05
  })
  if (overBudget.length > 0) { score -= overBudget.length * 8; factors.push({ label: 'Presupuesto', ok: false }) }
  else factors.push({ label: 'Presupuesto', ok: true })

  // Debts
  const totalDebt = debts.reduce((s, d) => s + d.remaining, 0)
  const debtToIncome = avgIncome > 0 ? totalDebt / (avgIncome * 12) : 0
  if (debtToIncome > 3) { score -= 20; factors.push({ label: 'Deudas', ok: false }) }
  else if (debtToIncome > 1) { score -= 8; factors.push({ label: 'Deudas', ok: true }) }
  else factors.push({ label: 'Deudas', ok: true })

  // Emergency fund
  const emergencyGoal = savingsGoals.find(g => g.name.toLowerCase().includes('emergencia') || g.name.toLowerCase().includes('emergency'))
  const emergencyTarget = avgExpenses * 3
  if (!emergencyGoal || emergencyGoal.saved < emergencyTarget * 0.5) {
    score -= 10; factors.push({ label: 'Emergencias', ok: false })
  } else factors.push({ label: 'Emergencias', ok: true })

  score = Math.max(0, Math.min(100, Math.round(score)))

  // ── INSIGHTS ──

  // 1. DIEZMO PENDIENTE ACUMULADO
  const titheUnpaid = monthlyData.reduce((s, d) => s + Math.max(d.titheOwed - d.tithePaid, 0), 0)
  if (titheUnpaid > 1) {
    const monthsOwed = monthlyData.filter(d => d.tithePaid < d.titheOwed * 0.99 && d.titheOwed > 0).length
    insights.push({
      id: 'tithe-backlog',
      priority: 1,
      type: 'warning',
      pillar: 1,
      icon: '✦',
      title: 'Diezmo pendiente acumulado',
      summary: `Tienes ${fmt(titheUnpaid)} de diezmo sin pagar en ${monthsOwed} ${monthsOwed === 1 ? 'mes' : 'meses'}.`,
      detail: `Si distribuyes el pago en 3 meses, serían ${fmt(titheUnpaid / 3)}/mes adicionales a tu diezmo habitual. Esto te permite ponerte al día sin un impacto brusco en el presupuesto.`,
      action: { label: 'Registrar pago', href: '/diezmos' },
      metric: { value: fmt(titheUnpaid), label: 'pendiente' }
    })
  }

  // 2. CATEGORÍA MÁS EXCEDIDA
  const catAnalysis = budgetCategories.filter(c => c.budgeted > 0).map(c => {
    const spent = getCatExpenses(expenses, c.id, curMonth, customSubs, dons)
    const avg3 = avgOver(months.slice(-3).map(m => getCatExpenses(expenses, c.id, m, customSubs, dons)))
    return { ...c, spent, avg3, excess: spent - c.budgeted, pct: spent / c.budgeted }
  }).sort((a, b) => b.pct - a.pct)

  const worstCat = catAnalysis.find(c => c.pct > 1.05)
  if (worstCat) {
    const saving = worstCat.spent - worstCat.avg3
    insights.push({
      id: 'over-budget-cat',
      priority: 2,
      type: 'danger',
      pillar: 2,
      icon: '▦',
      title: `"${worstCat.name}" excedida`,
      summary: `Llevas ${fmt(worstCat.spent)} en esta categoría, un ${((worstCat.pct - 1) * 100).toFixed(0)}% sobre tu límite de ${fmt(worstCat.budgeted)}.`,
      detail: worstCat.avg3 > 0
        ? `Tu media real de los últimos 3 meses es ${fmt(worstCat.avg3)}. Ajustar tu presupuesto a esa cifra sería más realista, o reducir el gasto a tu límite actual te liberaría ${fmt(worstCat.excess)}/mes.`
        : `Llevas ${fmt(worstCat.excess)} por encima de tu límite. Revisa los gastos de esta categoría para identificar dónde recortar.`,
      action: { label: 'Ver presupuesto', href: '/presupuesto' },
      metric: { value: fmt(worstCat.excess), label: 'excedido' }
    })
  }

  // 3. ESTRATEGIA DE DEUDAS
  if (debts.length > 0) {
    const totalDebtAmt = debts.reduce((s, d) => s + d.remaining, 0)
    const totalMonthly = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0)
    const freeMonthly = Math.max(curData.income - curData.expenses - totalMonthly, 0)

    // Snowball: smallest first
    const snowball = [...debts].sort((a, b) => a.remaining - b.remaining)
    // Avalanche: highest interest first
    const avalanche = [...debts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))

    const extraPayment = Math.min(freeMonthly * 0.5, 200)

    const calcPayoffMonths = (debtList, extra) => {
      let remaining = debtList.map(d => ({ ...d }))
      let months = 0
      while (remaining.some(d => d.remaining > 0) && months < 360) {
        months++
        let extraLeft = extra
        remaining = remaining.map(d => {
          if (d.remaining <= 0) return d
          const payment = (d.monthlyPayment || 0) + extraLeft
          extraLeft = Math.max(0, extraLeft - Math.max(d.remaining, 0))
          return { ...d, remaining: Math.max(d.remaining - payment, 0) }
        })
      }
      return months
    }

    if (debts.length > 1) {
      const snowballMonths = calcPayoffMonths(snowball, extraPayment)
      const avalancheMonths = calcPayoffMonths(avalanche, extraPayment)
      const bestMethod = avalancheMonths <= snowballMonths ? 'avalancha' : 'bola de nieve'
      const bestMonths = Math.min(snowballMonths, avalancheMonths)
      const bestDebt = bestMethod === 'avalancha' ? avalanche[0] : snowball[0]

      insights.push({
        id: 'debt-strategy',
        priority: 3,
        type: 'info',
        pillar: 4,
        icon: '⊖',
        title: `Estrategia óptima: método ${bestMethod}`,
        summary: `Con ${fmt(extraPayment)}/mes extra puedes liquidar todas tus deudas en ${bestMonths} meses.`,
        detail: `Empieza pagando "${bestDebt.name}" primero (${bestMethod === 'avalancha' ? `${bestDebt.interestRate}% de interés` : fmt(bestDebt.remaining) + ' pendiente'}). Al liquidarla, redirige su cuota a la siguiente. Deuda total: ${fmt(totalDebtAmt)}.`,
        action: { label: 'Ver deudas', href: '/deudas' },
        metric: { value: `${bestMonths}m`, label: 'para liberarte' }
      })
    } else if (debts.length === 1) {
      const d = debts[0]
      const monthsLeft = d.monthlyPayment > 0 ? Math.ceil(d.remaining / d.monthlyPayment) : null
      if (monthsLeft) {
        insights.push({
          id: 'debt-single',
          priority: 3,
          type: 'info',
          pillar: 4,
          icon: '⊖',
          title: `${d.name} — ${fmt(d.remaining)} pendiente`,
          summary: `A tu ritmo actual terminarás en ${monthsLeft} meses.`,
          detail: freeMonthly > 50
            ? `Si destinas ${fmt(Math.min(freeMonthly * 0.3, 150))} extra al mes, reducirías el plazo a ${Math.ceil(d.remaining / (d.monthlyPayment + Math.min(freeMonthly * 0.3, 150)))} meses.`
            : 'Mantén tu ritmo actual de pagos para liquidarla según lo previsto.',
          action: { label: 'Ver deuda', href: '/deudas' },
          metric: { value: `${monthsLeft}m`, label: 'restantes' }
        })
      }
    }
  }

  // 4. OPORTUNIDAD DE AHORRO DETECTADA
  const lastMonthIdx = months.length - 2
  if (lastMonthIdx >= 0) {
    const lastMonth = months[lastMonthIdx]
    const lastIncome = getMonthIncome(incomes, lastMonth)
    const lastExpenses = getMonthExpenses(expenses, lastMonth)
    const lastSurplus = lastIncome - lastExpenses
    if (lastSurplus > 50) {
      const urgentGoal = savingsGoals.find(g => g.saved < g.target)
      insights.push({
        id: 'savings-opportunity',
        priority: 4,
        type: 'success',
        pillar: 3,
        icon: '◎',
        title: 'Dinero sin asignar el mes pasado',
        summary: `El mes pasado te sobraron ${fmt(lastSurplus)} que no están asignados a ninguna meta.`,
        detail: urgentGoal
          ? `Si los hubieras destinado a "${urgentGoal.name}", estarías al ${Math.min(((urgentGoal.saved + lastSurplus) / urgentGoal.target) * 100, 100).toFixed(0)}% de esa meta. Este mes considera hacer una aportación extraordinaria.`
          : 'Crea una meta de ahorro para que ese dinero trabaje por ti en vez de quedarse parado.',
        action: urgentGoal
          ? { label: 'Añadir a meta', href: '/ahorro' }
          : { label: 'Crear meta', href: '/ahorro' },
        metric: { value: fmt(lastSurplus), label: 'sin asignar' }
      })
    }
  }

  // 5. CATEGORÍA CON TENDENCIA CRECIENTE
  const trendingCats = EXPENSE_CATEGORIES.map(cat => {
    const vals = months.slice(-4).map(m => getCatExpenses(expenses, cat.id, m, customSubs, dons))
    const nonZero = vals.filter(v => v > 0)
    if (nonZero.length < 3) return null
    const trend = (vals[vals.length - 1] - vals[0]) / Math.max(vals[0], 1)
    return { ...cat, trend, last: vals[vals.length - 1], first: vals[0] }
  }).filter(Boolean).filter(c => c.trend > 0.25).sort((a, b) => b.trend - a.trend)

  if (trendingCats.length > 0) {
    const cat = trendingCats[0]
    insights.push({
      id: 'trending-cat',
      priority: 5,
      type: 'warning',
      pillar: 2,
      icon: '↑',
      title: `"${cat.name}" sube cada mes`,
      summary: `Este gasto ha crecido un ${(cat.trend * 100).toFixed(0)}% en los últimos 4 meses.`,
      detail: `Pasaste de ${fmt(cat.first)} a ${fmt(cat.last)}. Si sigue esta tendencia, en 3 meses será ${fmt(cat.last * 1.25)}. Revisa si hay suscripciones o hábitos que puedas ajustar.`,
      action: { label: 'Ver gastos', href: '/gastos' },
      metric: { value: `+${(cat.trend * 100).toFixed(0)}%`, label: 'tendencia' }
    })
  }

  // 6. DISTRIBUCIÓN VS PILARES SUD
  if (curData.income > 0) {
    const pillar1Real = (getCatExpenses(expenses, 1, curMonth, customSubs, dons) / curData.income) * 100
    const pillar1Ideal = tithePercent + ((fastOffering / curData.income) * 100)
    if (pillar1Real < pillar1Ideal * 0.5 && curData.titheOwed > 0) {
      insights.push({
        id: 'pillar-balance',
        priority: 6,
        type: 'warning',
        pillar: 1,
        icon: '◑',
        title: 'Distribución desequilibrada por pilares',
        summary: `Destinas el ${pillar1Real.toFixed(1)}% al Señor cuando debería ser el ${pillar1Ideal.toFixed(1)}%.`,
        detail: `El primer pilar es prioritario. Antes de pagar otros gastos, reserva ${fmt(curData.titheOwed + fastOffering)} para diezmo y ofrenda de ayuno.`,
        action: { label: 'Ver pilares', href: '/presupuesto' },
        metric: { value: `${pillar1Real.toFixed(0)}%`, label: 'vs ${pillar1Ideal.toFixed(0)}% ideal' }
      })
    }
  }

  // 7. FONDO DE EMERGENCIAS
  const efund = savingsGoals.find(g =>
    g.name.toLowerCase().includes('emergencia') || g.name.toLowerCase().includes('emergency')
  )
  const efundTarget = avgExpenses * 3
  if (!efund && avgExpenses > 0) {
    insights.push({
      id: 'no-emergency-fund',
      priority: 2,
      type: 'danger',
      pillar: 3,
      icon: '🛡',
      title: 'Sin fondo de emergencias',
      summary: `No tienes una meta de ahorro para emergencias.`,
      detail: `Con tus gastos actuales, necesitas ${fmt(efundTarget)} para cubrir 3 meses. Si ahorras ${fmt(avgSavings * 0.5)}/mes, lo tendrías en ${Math.ceil(efundTarget / Math.max(avgSavings * 0.5, 1))} meses.`,
      action: { label: 'Crear fondo', href: '/ahorro' },
      metric: { value: fmt(efundTarget), label: 'objetivo' }
    })
  } else if (efund && efund.saved < efund.target * 0.5) {
    const monthsToComplete = avgSavings > 0
      ? Math.ceil((efund.target - efund.saved) / (avgSavings * 0.4))
      : null
    insights.push({
      id: 'emergency-fund-low',
      priority: 2,
      type: 'warning',
      pillar: 3,
      icon: '🛡',
      title: 'Fondo de emergencias por debajo del 50%',
      summary: `Tienes ${fmt(efund.saved)} de ${fmt(efund.target)} objetivo.`,
      detail: monthsToComplete
        ? `Destinando el 40% de tu ahorro mensual (${fmt(avgSavings * 0.4)}), completarías el fondo en ${monthsToComplete} meses.`
        : 'Prioriza este fondo antes que otras metas de ahorro.',
      action: { label: 'Ver ahorro', href: '/ahorro' },
      metric: { value: `${((efund.saved / efund.target) * 100).toFixed(0)}%`, label: 'completado' }
    })
  }

  // Sort by priority
  insights.sort((a, b) => a.priority - b.priority)

  return { score, factors, insights, avgIncome, avgExpenses, avgSavings, monthlyData }
}
