import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useExpenses } from '../hooks/useData'
import { Card, Button, Badge, PageHeader, EmptyState } from '../components/ui'
import MonthNav from '../components/ui/MonthNav'
import { formatCurrency, formatShortDate, getCurrentMonth, getMonthLabel } from '../utils/helpers'
import { PARENT_CATEGORIES, SUBCATEGORIES, getCategoryName, getCategoryColor, getParentId } from '../utils/categories'
import { suggestCategory } from '../utils/autoCategorizacion'
import CategoryPicker from '../components/modals/CategoryPicker'
import AddExpenseModal from '../components/modals/AddExpenseModal'
import './Gastos.css'
import { useFamilySocket } from '../hooks/useSocket'

function prevM(m) { const [y,mo]=m.split('-').map(Number); const d=new Date(y,mo-2,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function nextM(m) { const [y,mo]=m.split('-').map(Number); const d=new Date(y,mo,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

function EditExpenseRow({ expense, onSave, onCancel }) {
  const [desc, setDesc] = useState(expense.description)
  const [amount, setAmount] = useState(expense.amount.toString())
  const [catId, setCatId] = useState(expense.category_id)
  return (
    <div className="edit-expense-row">
      <div className="edit-expense-fields">
        <div className="edit-field-group">
          <input className="edit-input edit-input--desc" value={desc}
            onChange={e => setDesc(e.target.value)} placeholder="Descripción" autoFocus />
        </div>
        <input className="edit-input edit-input--amount" type="number" min="0" step="0.01"
          value={amount} onChange={e => setAmount(e.target.value)} />
        <CategoryPicker value={catId} onChange={setCatId} donations={[]} customSubs={[]}/>
      </div>
      <div className="edit-expense-actions">
        <button className="edit-save-btn" onClick={() => onSave({ description: desc, amount: parseFloat(amount)||0, category_id: catId })}>✓</button>
        <button className="edit-cancel-btn" onClick={onCancel}>✕</button>
      </div>
    </div>
  )
}

function WeeklySummary({ expenses }) {
  const now = new Date()
  const dayOfWeek = now.getDay()===0?7:now.getDay()
  const monday = new Date(now); monday.setDate(now.getDate()-dayOfWeek+1); monday.setHours(0,0,0,0)
  const weekExpenses = expenses.filter(e => new Date(e.date) >= monday)
  const weekTotal = weekExpenses.reduce((s,e) => s+parseFloat(e.amount),0)
  const monthTotal = expenses.reduce((s,e) => s+parseFloat(e.amount),0)
  if (weekExpenses.length===0) return null

  const catTotals = PARENT_CATEGORIES.filter(c=>c.id!==1&&c.id!==11).map(c => {
    const total = weekExpenses.filter(e => {
      if (e.category_id===c.id) return true
      const sub = e.category_id; if(sub<100) return false
      const p = sub>=1001?10:sub>=901?(sub<902?8:9):sub>=801?7:sub>=701?21:sub>=601?6:sub>=501?5:sub>=401?4:sub>=301?3:sub>=204?20:sub>=201?2:sub>=111?11:sub>=101?1:null
      return p===c.id
    }).reduce((s,e)=>s+parseFloat(e.amount),0)
    return {...c,total}
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total)

  return (
    <Card className="weekly-summary-card">
      <div className="ws-header">
        <div className="ws-title">Esta semana</div>
        <Badge variant="success">En ruta</Badge>
      </div>
      <div className="ws-stats">
        <div className="ws-stat"><div className="ws-stat-label">Gastado</div><div className="ws-stat-value">{formatCurrency(weekTotal)}</div></div>
        <div className="ws-stat"><div className="ws-stat-label">Este mes</div><div className="ws-stat-value">{formatCurrency(monthTotal)}</div></div>
      </div>
      {catTotals.length>0&&(
        <div className="ws-top-cat">
          <span className="ws-top-label">Mayor gasto:</span>
          <div className="ws-cat-dot" style={{background:catTotals[0].color}}/>
          <span className="ws-cat-name">{catTotals[0].name}</span>
          <span className="ws-cat-amount">{formatCurrency(catTotals[0].total)}</span>
        </div>
      )}
    </Card>
  )
}

export default function Gastos() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterCat, setFilterCat] = useState('all')
  const [searchText, setSearchText] = useState('')

  const isCurrentMonth = month === getCurrentMonth()
  const { expenses, loading, refetch, updateExpense, deleteExpense } = useExpenses(month)

  // Real-time sync
  useFamilySocket({ onExpense: () => refetch() })

  const total = expenses.reduce((s,e) => s+parseFloat(e.amount),0)

  // Chart data — sum by parent category
  const chartData = PARENT_CATEGORIES.map(c => {
    const value = expenses.filter(e => {
      if (e.category_id===c.id) return true
      const sub=e.category_id; if(sub<100) return false
      const p=sub>=1001?10:sub>=901?(sub<902?8:9):sub>=801?7:sub>=701?21:sub>=601?6:sub>=501?5:sub>=401?4:sub>=301?3:sub>=204?20:sub>=201?2:sub>=111?11:sub>=101?1:null
      return p===c.id
    }).reduce((s,e)=>s+parseFloat(e.amount),0)
    return {...c,value}
  }).filter(c=>c.value>0)

  const filteredExpenses = expenses
    .filter(e => filterCat==='all' || e.category_id===parseInt(filterCat))
    .filter(e => !searchText || e.description?.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a,b) => new Date(b.date)-new Date(a.date))

  const handleEdit = async (id, data) => {
    await updateExpense(id, data)
    setEditingId(null)
  }

  return (
    <div className="gastos-page">
      <PageHeader
        title="Gastos"
        subtitle={
          <div className="month-nav">
            <button className="month-btn" onClick={() => setMonth(prevM(month))}>‹</button>
            <span className="month-nav-label">{getMonthLabel(month)}</span>
            <button className="month-btn" onClick={() => setMonth(nextM(month))} disabled={isCurrentMonth}>›</button>
          </div>
        }
        action={isCurrentMonth && <Button size="sm" onClick={() => setShowAdd(true)}>+ Añadir gasto</Button>}
      />

      <div className="gastos-content">
        {isCurrentMonth && <WeeklySummary expenses={expenses}/>}

        {chartData.length>0 && (
          <div className="gastos-grid">
            <Card>
              <div className="chart-title">Distribución del mes</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                    {chartData.map((entry,i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>formatCurrency(v)} contentStyle={{background:'var(--bg-card)',border:'.5px solid var(--border)',borderRadius:10,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {chartData.map(c=>(
                  <div key={c.id} className="legend-item" onClick={()=>setFilterCat(filterCat==c.id?'all':String(c.id))}
                    style={{cursor:'pointer',opacity:filterCat!=='all'&&filterCat!=c.id?0.4:1}}>
                    <div className="legend-dot" style={{background:c.color}}/>
                    <span className="legend-name">{c.name}</span>
                    <span className="legend-val">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="gastos-cat-list">
              {chartData.map(cat=>(
                <Card key={cat.id} padding="compact"
                  onClick={()=>setFilterCat(filterCat==cat.id?'all':String(cat.id))}
                  className={`cat-summary-card ${filterCat==cat.id?'active':''}`}>
                  <div className="cat-summary-row">
                    <div className="cat-dot-lg" style={{background:cat.color}}/>
                    <div className="cat-summary-info">
                      <div className="cat-summary-name">{cat.name}</div>
                      <div className="cat-summary-pct">{((cat.value/total)*100).toFixed(1)}% del total</div>
                    </div>
                    <div className="cat-summary-amount">{formatCurrency(cat.value)}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="gastos-filter-bar">
          <input className="gastos-search" placeholder="Buscar gasto..."
            value={searchText} onChange={e=>setSearchText(e.target.value)}/>
          <select className="gastos-cat-filter" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="all">Todas las categorías</option>
            {PARENT_CATEGORIES.map(p=>(
              <optgroup key={p.id} label={p.name}>
                {SUBCATEGORIES.filter(s=>s.parentId===p.id).map(s=>(
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="gastos-list-header">
          <div className="section-label-sm">{filteredExpenses.length} gastos · {formatCurrency(filteredExpenses.reduce((s,e)=>s+parseFloat(e.amount),0))}</div>
          {(filterCat!=='all'||searchText)&&<button className="clear-filter-btn" onClick={()=>{setFilterCat('all');setSearchText('')}}>Limpiar ✕</button>}
        </div>

        {loading ? (
          <Card><div style={{padding:20,textAlign:'center',color:'var(--text-tertiary)'}}>Cargando...</div></Card>
        ) : filteredExpenses.length===0 ? (
          <Card>
            <EmptyState icon="◈" title="Sin gastos este mes"
              description="Registra tus gastos para ver en qué se va el dinero."
              action={isCurrentMonth?<Button size="sm" onClick={()=>setShowAdd(true)}>Añadir primer gasto</Button>:null}/>
          </Card>
        ) : (
          <Card padding="none">
            {filteredExpenses.map((e,i)=>{
              const isEditing = editingId===e.id
              if (isEditing) return (
                <div key={e.id} className={i<filteredExpenses.length-1?'expense-border':''}>
                  <EditExpenseRow expense={e} onSave={data=>handleEdit(e.id,data)} onCancel={()=>setEditingId(null)}/>
                </div>
              )
              return (
                <div key={e.id} className={`expense-row ${i<filteredExpenses.length-1?'expense-border':''}`}>
                  <div className="expense-cat-dot" style={{background:getCategoryColor(e.category_id)}}/>
                  <div className="expense-info">
                    <div className="expense-desc">
                      {e.description}
                      {e.source==='bank'&&<span className="expense-auto-tag">banco</span>}
                    </div>
                    <div className="expense-meta">
                      <span>{getCategoryName(e.category_id)}</span>
                      <span>·</span>
                      <span>{formatShortDate(e.date)}</span>
                      {e.member_name&&<><span>·</span><span>{e.member_name}</span></>}
                    </div>
                  </div>
                  <div className="expense-right">
                    <div className="expense-amount">{formatCurrency(e.amount)}</div>
                    {isCurrentMonth&&(
                      <>
                        <button className="expense-edit" onClick={()=>setEditingId(e.id)} title="Editar">✎</button>
                        <button className="expense-del" onClick={()=>deleteExpense(e.id)} title="Eliminar">✕</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>
      {showAdd&&<AddExpenseModal month={month} onClose={()=>{setShowAdd(false);refetch()}}/>}
    </div>
  )
}
