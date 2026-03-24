// Generates a printable HTML page and triggers browser print → Save as PDF
export function exportMonthlyPDF({ month, monthLabel, familyName, income, expenses, incomes, titheOwed, tithePaid, fastOffering, budgetCategories, savingsGoals, EXPENSE_CATEGORIES, getCategoryExpenses }) {

  const formatEur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
  const totalExpenses = expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
  const balance = income - totalExpenses
  const tithePct = titheOwed > 0 ? ((tithePaid / titheOwed) * 100).toFixed(0) : 0

  const catRows = EXPENSE_CATEGORIES.map(c => {
    const spent = expenses.filter(e => e.categoryId === c.id && e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
    const budgeted = budgetCategories.find(b => b.id === c.id)?.budgeted || 0
    if (!spent && !budgeted) return ''
    return `<tr><td>${c.name}</td><td style="text-align:right">${formatEur(budgeted)}</td><td style="text-align:right">${formatEur(spent)}</td><td style="text-align:right;color:${spent > budgeted && budgeted > 0 ? '#ff3b30' : '#30d158'}">${budgeted > 0 ? (spent > budgeted ? '⚠ Excedido' : '✓ OK') : '—'}</td></tr>`
  }).join('')

  const txRows = [...incomes.filter(i => i.date.startsWith(month)), ...expenses.filter(e => e.date.startsWith(month))]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(t => {
      const isIncome = t.type === 'income'
      const cat = isIncome ? 'Ingreso' : (EXPENSE_CATEGORIES.find(c => c.id === t.categoryId)?.name || '—')
      return `<tr><td>${new Date(t.date).toLocaleDateString('es-ES')}</td><td>${t.description || t.source || '—'}</td><td>${cat}</td><td style="text-align:right;color:${isIncome ? '#30d158' : '#ff3b30'}">${isIncome ? '+' : '-'}${formatEur(t.amount)}</td></tr>`
    }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Resumen ${monthLabel} — ${familyName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; color: #1c1c1e; background: #fff; padding: 32px 40px; font-size: 13px; }
  h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; margin: 24px 0 10px; color: #1c1c1e; text-transform: uppercase; letter-spacing: .06em; font-size: 11px; color: #666; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e5ea; padding-bottom: 16px; margin-bottom: 20px; }
  .header-sub { font-size: 13px; color: #666; margin-top: 3px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-card { background: #f2f2f7; border-radius: 10px; padding: 12px 14px; }
  .sc-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; font-weight: 600; }
  .sc-value { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; }
  .sc-value.green { color: #30d158; }
  .sc-value.red { color: #ff3b30; }
  .sc-value.gold { color: #ff9f0a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { text-align: left; font-size: 11px; color: #666; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid #e5e5ea; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 7px 8px; border-bottom: 0.5px solid #f2f2f7; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
  .tithe-box { background: #fff5e0; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; }
  .tb-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
  .tb-total { font-weight: 700; font-size: 14px; border-top: 1px solid #ffd60a; padding-top: 8px; margin-top: 4px; }
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e5ea; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 20px 28px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>${familyName}</h1>
    <div class="header-sub">Resumen financiero · ${monthLabel}</div>
  </div>
  <div style="text-align:right;color:#666;font-size:12px">
    Generado el ${new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}<br/>
    Familia Finanzas v1.0
  </div>
</div>

<div class="summary-grid">
  <div class="summary-card"><div class="sc-label">Ingresos</div><div class="sc-value green">${formatEur(income)}</div></div>
  <div class="summary-card"><div class="sc-label">Gastos</div><div class="sc-value red">${formatEur(totalExpenses)}</div></div>
  <div class="summary-card"><div class="sc-label">Balance</div><div class="sc-value ${balance >= 0 ? 'green' : 'red'}">${formatEur(balance)}</div></div>
  <div class="summary-card"><div class="sc-label">Diezmo pagado</div><div class="sc-value gold">${tithePct}%</div></div>
</div>

<h2>Pagos al Señor</h2>
<div class="tithe-box">
  <div class="tb-row"><span>Diezmo correspondiente (10%)</span><span>${formatEur(titheOwed)}</span></div>
  <div class="tb-row"><span>Diezmo pagado</span><span style="color:#30d158">${formatEur(tithePaid)}</span></div>
  <div class="tb-row"><span>Pendiente</span><span style="color:${titheOwed - tithePaid > 0.01 ? '#ff3b30' : '#30d158'}">${formatEur(Math.max(titheOwed - tithePaid, 0))}</span></div>
  <div class="tb-row tb-total"><span>Ofrenda de ayuno</span><span>${formatEur(fastOffering)}</span></div>
</div>

<h2>Presupuesto por categorías</h2>
<table>
  <thead><tr><th>Categoría</th><th style="text-align:right">Presupuesto</th><th style="text-align:right">Gastado</th><th style="text-align:right">Estado</th></tr></thead>
  <tbody>${catRows}</tbody>
</table>

<h2>Todos los movimientos</h2>
<table>
  <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th style="text-align:right">Importe</th></tr></thead>
  <tbody>${txRows}</tbody>
</table>

<div class="footer">
  Familia Finanzas · Principios del bienestar personal y familiar de La Iglesia de Jesucristo de los Santos de los Últimos Días
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 500)
}
