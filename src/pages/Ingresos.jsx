import { useState } from 'react'
import { useIncomes } from '../hooks/useData'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { Card, Button, Badge, PageHeader, EmptyState } from '../components/ui'
import MonthNav from '../components/ui/MonthNav'
import { formatCurrency, formatShortDate, getCurrentMonth, getMonthLabel } from '../utils/helpers'
import './Ingresos.css'

function prevM(m){const[y,mo]=m.split('-').map(Number);const d=new Date(y,mo-2,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function nextM(m){const[y,mo]=m.split('-').map(Number);const d=new Date(y,mo,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}

const CATEGORIES = [
  {id:'salary',    label:'Salario / nómina'},
  {id:'freelance', label:'Autónomo'},
  {id:'rental',    label:'Alquiler cobrado'},
  {id:'benefit',   label:'Prestación'},
  {id:'internal',  label:'Transferencia interna', notComputable: true, hint: 'Dinero recibido de otro miembro de la familia — no genera diezmo'},
  {id:'transfer',  label:'Transferencia externa'},
  {id:'refund',    label:'Devolución / reembolso', notComputable: true},
  {id:'other',     label:'Otro ingreso'},
]

const NOT_COMPUTABLE = new Set(['internal', 'transfer', 'refund'])

export default function Ingresos() {
  const { user } = useAuth()
  const [month, setMonth] = useState(getCurrentMonth())
  const [showForm, setShowForm] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [form, setForm] = useState({
    source:'', category:'salary', amount:'', computable:true,
    date: new Date().toISOString().split('T')[0], member_name: user?.name||'',
  })

  const isCurrentMonth = month === getCurrentMonth()
  const { incomes, loading, addIncome, deleteIncome } = useIncomes(month)

  const total = incomes.reduce((s,i) => s+parseFloat(i.amount), 0)
  const computableTotal = incomes.filter(i=>i.computable).reduce((s,i) => s+parseFloat(i.amount), 0)
  const titheOwed = computableTotal * 0.10

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.source || !form.amount) return
    setLoading2(true)
    try {
      await addIncome({
        source: form.source, category: form.category,
        amount: parseFloat(form.amount), computable: form.computable,
        date: form.date, member_name: form.member_name,
      })
      setForm(f => ({...f, source:'', amount:'', category:'salary'}))
      setShowForm(false)
    } catch(err) { alert(err.message) }
    finally { setLoading2(false) }
  }

  return (
    <div className="ingresos-page">
      <PageHeader
        title="Ingresos"
        subtitle={
          <div className="month-nav">
            <button className="month-btn" onClick={()=>setMonth(prevM(month))}>‹</button>
            <span className="month-nav-label">{getMonthLabel(month)}</span>
            <button className="month-btn" onClick={()=>setMonth(nextM(month))} disabled={isCurrentMonth}>›</button>
          </div>
        }
        action={isCurrentMonth && <Button size="sm" onClick={()=>setShowForm(!showForm)}>+ Añadir ingreso</Button>}
      />

      <div className="ingresos-content">
        {/* Summary */}
        {incomes.length > 0 && (
          <div className="ingresos-summary">
            <Card padding="compact">
              <div className="is-label">Ingresos totales</div>
              <div className="is-value accent">{formatCurrency(total)}</div>
            </Card>
            <Card padding="compact">
              <div className="is-label">Computables diezmo</div>
              <div className="is-value">{formatCurrency(computableTotal)}</div>
            </Card>
            <Card padding="compact">
              <div className="is-label">Diezmo a pagar</div>
              <div className="is-value gold">{formatCurrency(titheOwed)}</div>
            </Card>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <Card>
            <div style={{fontWeight:700,fontSize:'1rem',marginBottom:16,color:'var(--text-primary)'}}>Nuevo ingreso</div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tipo de ingreso</label>
                <div className="income-cat-grid">
                  {CATEGORIES.map(cat=>(
                    <button key={cat.id} type="button"
                      className={`income-cat-btn ${form.category===cat.id?'active':''}`}
                      onClick={()=>setForm({...form, category:cat.id,
                        computable: NOT_COMPUTABLE.has(cat.id) ? false : form.computable
                      })}>
                      {cat.label}
                    </button>
                  ))}
                  {CATEGORIES.find(c=>c.id===form.category)?.hint && (
                    <div className="income-cat-hint">
                      ℹ {CATEGORIES.find(c=>c.id===form.category).hint}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción / origen</label>
                <input className="form-input" placeholder="Ej: Empresa García S.L." required autoFocus
                  value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Importe (€)</label>
                  <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" required
                    value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input className="form-input" type="date" value={form.date}
                    onChange={e=>setForm({...form,date:e.target.value})}/>
                </div>
              </div>
              <div className="computable-toggle">
                <div className="ct-left">
                  <div className="ct-title">¿Computa para el diezmo?</div>
                  <div className="ct-desc">{form.computable?'Sí — incluido en el cálculo':'No — no afecta al diezmo'}</div>
                </div>
                <button type="button" className={`ct-switch ${form.computable?'on':'off'}`}
                  onClick={()=>setForm({...form,computable:!form.computable})}>
                  <span className="ct-thumb"/>
                </button>
              </div>
              {parseFloat(form.amount) > 0 && form.computable && (
                <div className="tithe-preview">
                  <div className="tithe-preview-title">Pagos al Señor estimados</div>
                  <div className="tithe-preview-row">
                    <span>Diezmo (10%)</span>
                    <span className="tithe-preview-amount">{(parseFloat(form.amount)*0.10).toFixed(2)} €</span>
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
                <Button variant="secondary" onClick={()=>setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading2}>{loading2?'Guardando...':'Guardar ingreso'}</Button>
              </div>
            </form>
          </Card>
        )}

        {/* List */}
        {loading ? (
          <Card><div style={{padding:20,textAlign:'center',color:'var(--text-tertiary)'}}>Cargando...</div></Card>
        ) : incomes.length === 0 && !showForm ? (
          <Card>
            <EmptyState icon="↑" title="Sin ingresos este mes"
              description="Registra tus ingresos para calcular el diezmo automáticamente."
              action={isCurrentMonth?<Button size="sm" onClick={()=>setShowForm(true)}>+ Añadir ingreso</Button>:null}/>
          </Card>
        ) : (
          <Card padding="none">
            {incomes.map((income, i) => (
              <div key={income.id} className={`income-row ${i<incomes.length-1?'income-border':''}`}>
                <div className="income-icon" style={{background:income.computable?'var(--accent-light)':'var(--bg-subtle)',color:income.computable?'var(--accent)':'var(--text-tertiary)'}}>↑</div>
                <div className="income-info">
                  <div className="income-source">
                    {income.source}
                    {!income.computable && <span className="income-no-tithe">no computa</span>}
                  </div>
                  <div className="income-meta">
                    <span>{CATEGORIES.find(c=>c.id===income.category)?.label||income.category}</span>
                    <span>·</span>
                    <span>{formatShortDate(income.date)}</span>
                    {income.member_name && <><span>·</span><span>{income.member_name}</span></>}
                  </div>
                </div>
                <div className="income-right">
                  <div className="income-amount">{formatCurrency(income.amount)}</div>
                  {isCurrentMonth && (
                    <button className="income-del" onClick={()=>deleteIncome(income.id)} title="Eliminar">✕</button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
