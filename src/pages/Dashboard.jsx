import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useFamilySocket } from '../hooks/useSocket'
import { useDashboard, useIncomes, useExpenses } from '../hooks/useData'
import { Card, Button, Badge, ProgressBar, PageHeader, EmptyState } from '../components/ui'
import { formatCurrency, formatShortDate, getMonthLabel, getCurrentMonth } from '../utils/helpers'
import { PARENT_CATEGORIES, getCategoryColor, getCategoryName } from '../utils/categories'
import AddIncomeModal from '../components/modals/AddIncomeModal'
import AddExpenseModal from '../components/modals/AddExpenseModal'
import './Dashboard.css'

function prevMonth(m) { const [y,mo]=m.split('-').map(Number); const d=new Date(y,mo-2,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function nextMonth(m) { const [y,mo]=m.split('-').map(Number); const d=new Date(y,mo,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

export default function Dashboard() {
  const { family } = useAuth()
  const { user } = useAuth()
  const [month, setMonth] = useState(getCurrentMonth())
  const [showIncome, setShowIncome]   = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  const { dashboard, loading, refetch } = useDashboard(month)
  const { addIncome }   = useIncomes(month)
  const { addExpense }  = useExpenses(month)

  const isCurrentMonth = month === getCurrentMonth()
  const monthLabel = getMonthLabel(month)

  if (loading) return (
    <div className="dashboard">
      <div className="dash-loading">Cargando...</div>
    </div>
  )

  const d = dashboard || {}
  const income  = d.income?.total || 0
  const spent   = d.expenses?.total || 0
  const balance = income - spent
  const savingsRate = income > 0 ? Math.max(0, ((income - spent) / income) * 100) : 0

  const tithe       = d.tithe || {}
  const recent      = d.recentTransactions || []
  const budgetMap   = {}
  ;(d.budget || []).forEach(b => { budgetMap[b.categoryId] = b.budgeted })
  const spentMap    = {}
  ;(d.expenses?.byCategory || []).forEach(e => { spentMap[e.categoryId] = e.spent })

  // Month progress
  const now = new Date()
  // Use financial month range from dashboard data if available
  const monthRange = d.monthRange
  // Parse dates as LOCAL (not UTC) to avoid timezone offset issues
  const parseLocalDate = (str) => {
    if (!str) return null
    const [y, m, day] = str.split('-').map(Number)
    return new Date(y, m - 1, day) // local midnight
  }
  const periodStart = parseLocalDate(monthRange?.from) || new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd   = parseLocalDate(monthRange?.to)   || new Date(now.getFullYear(), now.getMonth()+1, 0)
  const totalDays   = Math.round((periodEnd - periodStart) / (1000*60*60*24)) + 1
  // Today's position within the period (0 = first day, totalDays = last day)
  const todayLocal  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysPassed  = isCurrentMonth
    ? Math.min(Math.max(Math.round((todayLocal - periodStart) / (1000*60*60*24)) + 1, 1), totalDays)
    : totalDays
  const monthPct    = (daysPassed / totalDays) * 100
  // Exclude auto-calculated categories (diezmo=1, ofrenda=11) from progress bar
  // Those are mandatory payments, not "discretionary budget"
  const AUTO_CATS    = new Set([1, 11])
  const budgetTotal  = Object.entries(budgetMap)
    .filter(([id]) => !AUTO_CATS.has(parseInt(id)))
    .reduce((s,[,v]) => s+v, 0)
  const autoSpent    = (d.expenses?.byCategory || [])
    .filter(e => AUTO_CATS.has(e.categoryId))
    .reduce((s,e) => s+e.spent, 0)
  const discretionarySpent = spent - autoSpent
  const spentPct    = budgetTotal > 0 ? (discretionarySpent / budgetTotal) * 100 : income > 0 ? (discretionarySpent / income) * 100 : 0
  const onTrack     = spentPct <= monthPct + 5
  // Projection: if you stick to your budget, here's how the month ends
  const totalPlanned  = budgetTotal + (tithe.owed || 0) + (tithe.fastOwed || 0)
  const projected     = totalPlanned > 0 ? income - totalPlanned : (income - spent)
  const dayOfMonth  = daysPassed
  const daysInMonth = totalDays

  // All budget categories with assigned amounts
  const topCats = PARENT_CATEGORIES
    .filter(c => {
      if (c.id === 1 || c.id === 11) return false // shown separately in Pagos al Señor
      if (c.id === 10) return (d?.debts?.monthlyTotal || 0) > 0
      return (budgetMap[c.id] || 0) > 0
    })
    .map(c => {
      const budgeted = c.id === 10
        ? (d?.debts?.monthlyTotal || 0)
        : (budgetMap[c.id] || 0)
      const catSpent = (d.expenses?.byCategory || [])
        .filter(e => {
          if (e.categoryId === c.id) return true
          const sub = e.categoryId
          if (sub < 100) return false
          const p = sub>=1001?10:sub>=901?(sub<902?8:9):sub>=801?7:sub>=701?21:sub>=601?6:sub>=501?5:sub>=401?4:sub>=301?3:sub>=204?20:sub>=201?2:sub>=111?11:sub>=101?1:null
          return p === c.id
        })
        .reduce((s, e) => s + e.spent, 0)
      return { ...c, budgeted, spent: catSpent }
    })
    .sort((a,b) => (b.spent/b.budgeted) - (a.spent/a.budgeted))

  const handleAddIncome = async (income) => {
    await addIncome(income)
    refetch()
    setShowIncome(false)
  }

  const handleAddExpense = async (expense) => {
    await addExpense(expense)
    refetch()
    setShowExpense(false)
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-family-name">{family?.name || ''}</div>
          <div className="dash-greeting">
            {new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 20 ? 'Buenas tardes' : 'Buenas noches'}, {user?.name?.split(' ')[0] || ''}
          </div>
          <div className="month-nav dash-month-nav">
            <button className="month-btn" onClick={() => setMonth(prevMonth(month))}>‹</button>
            <span className="month-label-text">{monthLabel}</span>
            <button className="month-btn" onClick={() => setMonth(nextMonth(month))} disabled={isCurrentMonth}>›</button>
          </div>
        </div>
        {isCurrentMonth && (
          <div className="dash-header-actions">
            <Button variant="secondary" size="sm" onClick={() => setShowExpense(true)}>+ Gasto</Button>
            <Button size="sm" onClick={() => setShowIncome(true)}>+ Ingreso</Button>
          </div>
        )}
      </div>

      <div className="dashboard-content" style={{paddingTop:16}}>
        {/* Hero */}
        <Card className="hero-card">
          <div className="hero-inner">
            <div className="hero-left">
              <div className="hero-label">Saldo del mes</div>
              <div className={`hero-amount ${balance < 0 ? 'negative' : ''}`}>{formatCurrency(balance)}</div>
              <div className="hero-meta">
                <span className="hero-meta-item income">↑ {formatCurrency(income)}</span>
                <span className="hero-meta-item expense">↓ {formatCurrency(spent)}</span>
              </div>
            </div>
            <div className="hero-right">
              <div className="savings-ring">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6"/>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent)" strokeWidth="6"
                    strokeDasharray={`${Math.min(savingsRate,100)*2.136} 213.6`}
                    strokeLinecap="round" transform="rotate(-90 40 40)"
                    style={{transition:'stroke-dasharray 1s ease'}}/>
                </svg>
                <div className="ring-text">
                  <span className="ring-pct">{savingsRate.toFixed(0)}%</span>
                  <span className="ring-label">ahorro</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Month progress */}
        {isCurrentMonth && income > 0 && (() => {
          const totalPlan   = budgetTotal + (tithe.owed||0) + (tithe.fastOwed||0)
          const budgetRem   = Math.max(totalPlan - spent, 0)
          const libre       = Math.max(income - Math.max(totalPlan, spent), 0)
          const spentW      = income > 0 ? Math.min((spent    / income) * 100, 100) : 0
          const budgetRemW  = income > 0 ? Math.min((budgetRem / income) * 100, 100 - spentW) : 0
          const libreW      = Math.max(100 - spentW - budgetRemW, 0)
          const projectedV  = income - totalPlan

          return (
            <Card className="month-progress-card" padding="compact">
              <div className="mp-header">
                <div className="mp-title">Progreso del mes</div>
                <div className="mp-days">{dayOfMonth} de {daysInMonth} días</div>
                <div className={`mp-status ${onTrack ? 'ok' : 'warn'}`}>
                  {onTrack ? '✓ En ruta' : '⚠ Revisa'}
                </div>
              </div>

              {/* Three numbers */}
              <div className="mp-three-nums">
                <div className="mp-num">
                  <div className="mp-num-dot spent"/>
                  <div>
                    <div className="mp-num-label">Gastado</div>
                    <div className="mp-num-val spent">{formatCurrency(spent)}</div>
                  </div>
                </div>
                <div className="mp-num">
                  <div className="mp-num-dot budgeted"/>
                  <div>
                    <div className="mp-num-label">Por gastar</div>
                    <div className="mp-num-val budgeted">{formatCurrency(budgetRem)}</div>
                  </div>
                </div>
                <div className="mp-num">
                  <div className="mp-num-dot libre"/>
                  <div>
                    <div className="mp-num-label">Libre</div>
                    <div className="mp-num-val libre">{formatCurrency(libre)}</div>
                  </div>
                </div>
              </div>

              {/* Tricolor bar */}
              <div className="mp-tribar">
                {spentW > 0    && <div className="mp-seg spent"    style={{width:`${spentW}%`}}/>}
                {budgetRemW > 0 && <div className="mp-seg budgeted" style={{width:`${budgetRemW}%`}}/>}
                {libreW > 0    && <div className="mp-seg libre"    style={{width:`${libreW}%`}}/>}
              </div>

              {/* Projection */}
              <div className="mp-projection">
                {totalPlan > 0 ? (
                  <>
                    <span className="mp-proj-label">Si respetas el presupuesto:</span>
                    <span className={`mp-proj-value ${projectedV < 0 ? 'negative' : ''}`}>
                      {projectedV >= 0 ? 'Sobrarán ' : 'Faltarán '}
                      <strong>{formatCurrency(Math.abs(projectedV))}</strong>
                    </span>
                  </>
                ) : (
                  <span className="mp-proj-label" style={{color:'var(--text-tertiary)'}}>
                    Asigna presupuesto para ver la proyección
                  </span>
                )}
              </div>
            </Card>
          )
        })()}

        {/* Tithe alert */}
        {tithe.pending > 0 && isCurrentMonth && (
          <div className="tithe-alert">
            <span className="tithe-alert-icon">✦</span>
            <span>Tienes <strong>{formatCurrency(tithe.pending)}</strong> de diezmo pendiente</span>
            <a href="/diezmos" className="tithe-alert-link">Registrar pago →</a>
          </div>
        )}

        {/* Pagos al Señor */}
        <div className="section-label">Pagos al Señor</div>
        <div className="grid-2">
          <Card padding="compact">
            <div className="tithe-row">
              <div>
                <div className="tithe-mini-title">Diezmo</div>
                <div className="tithe-mini-amount">{formatCurrency(tithe.owed || 0)}</div>
              </div>
              <Badge variant={tithe.pending===0&&tithe.owed>0?'success':tithe.pending>0?'warning':'default'}>
                {tithe.pending===0&&tithe.owed>0?'Al día':tithe.pending>0?`Falta ${formatCurrency(tithe.pending)}`:'—'}
              </Badge>
            </div>
            {tithe.owed > 0 && <ProgressBar value={tithe.paid||0} max={tithe.owed} variant="gold"/>}
          </Card>
          <Card padding="compact">
            <div className="tithe-row">
              <div>
                <div className="tithe-mini-title">Ofrenda ayuno</div>
                <div className="tithe-mini-amount" style={{color:'var(--gold)'}}>{formatCurrency(tithe.fastOwed||0)}</div>
              </div>
              <Badge variant={tithe.fastPending===0&&tithe.fastOwed>0?'success':tithe.fastPending>0?'warning':'default'}>
                {tithe.fastPending===0&&tithe.fastOwed>0?'Al día':tithe.fastPending>0?`Falta ${formatCurrency(tithe.fastPending)}`:'—'}
              </Badge>
            </div>
            {tithe.fastOwed > 0 && <ProgressBar value={tithe.fastPaid||0} max={tithe.fastOwed} variant="gold"/>}
          </Card>
        </div>

        {/* Budget top categories */}
        {topCats.length > 0 && (
          <>
            <div className="section-label">Presupuesto</div>
            <div className="grid-2">
              {topCats.map(cat => {
                const pct = cat.budgeted > 0 ? (cat.spent / cat.budgeted) * 100 : 0
                return (
                  <Card key={cat.id} padding="compact">
                    <div className="cat-row">
                      <div className="cat-dot" style={{background: cat.color}}/>
                      <div className="cat-info">
                        <div className="cat-name">{cat.name}</div>
                        <ProgressBar value={cat.spent} max={cat.budgeted} variant={pct>90?'danger':'default'}/>
                      </div>
                      <div className="cat-amounts">
                        <span className="cat-spent">{formatCurrency(cat.spent)}</span>
                        <span className="cat-budget">/ {formatCurrency(cat.budgeted)}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {/* Recent transactions */}
        <div className="section-label">Movimientos recientes</div>
        {recent.length === 0 ? (
          <Card>
            <EmptyState icon="◎" title="Sin movimientos este mes"
              description="Pulsa + Ingreso o + Gasto para empezar."
              action={isCurrentMonth ? <Button size="sm" onClick={() => setShowIncome(true)}>+ Añadir ingreso</Button> : null}
            />
          </Card>
        ) : (
          <Card padding="none">
            {recent.map((t, i) => (
              <div key={t.id} className={`txn-row ${i < recent.length-1 ? 'txn-border' : ''}`}>
                <div className="txn-icon" style={{
                  background: t.kind==='income'?'var(--accent-light)':'var(--danger-light)',
                  color: t.kind==='income'?'var(--accent)':'var(--danger)'
                }}>
                  {t.kind==='income' ? '↑' : '↓'}
                </div>
                <div className="txn-info">
                  <div className="txn-name">
                    {t.description || 'Sin descripción'}
                    {t.kind==='income' && t.computable===false && (
                      <span className="txn-noncomputable">no computa</span>
                    )}
                  </div>
                  <div className="txn-meta">
                    <span className="txn-date">{formatShortDate(t.date)}</span>
                    {t.member_name && <span className="txn-member">· {t.member_name}</span>}
                  </div>
                </div>
                <div className={`txn-amount ${t.kind}`}>
                  {t.kind==='income'?'+':'-'}{formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {showIncome  && <AddIncomeModal  month={month} onClose={() => { setShowIncome(false);  refetch() }} />}
      {showExpense && <AddExpenseModal month={month} onClose={() => { setShowExpense(false); refetch() }} />}
    </div>
  )
}
