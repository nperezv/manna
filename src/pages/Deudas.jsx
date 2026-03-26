import { useState } from 'react'
import { useDebts } from '../hooks/useData'
import { Card, Button, Badge, ProgressBar, PageHeader, EmptyState } from '../components/ui'
import { formatCurrency } from '../utils/helpers'
import './Deudas.css'
import { useFamilySocket } from '../hooks/useSocket'

const DEBT_TYPES = [
  {value:'hipoteca',label:'Hipoteca'},
  {value:'prestamo',label:'Préstamo personal'},
  {value:'coche',label:'Préstamo coche'},
  {value:'tarjeta',label:'Tarjeta de crédito'},
  {value:'otro',label:'Otro'},
]

export default function Deudas() {
  const { debts, loading, refetch, addDebt, updateDebt, deleteDebt, payDebt } = useDebts()

  // Real-time sync
  useFamilySocket({ onDebt: () => refetch() })
  const [showForm, setShowForm] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [form, setForm] = useState({name:'',total_amount:'',remaining:'',monthly_payment:'',interest_rate:'',type:'prestamo'})

  const totalDebt = debts.reduce((s,d)=>s+parseFloat(d.remaining),0)
  const totalMonthly = debts.reduce((s,d)=>s+parseFloat(d.monthly_payment||0),0)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name||!form.total_amount) return
    await addDebt({
      name:form.name, total_amount:parseFloat(form.total_amount),
      remaining:parseFloat(form.remaining||form.total_amount),
      monthly_payment:parseFloat(form.monthly_payment)||null,
      interest_rate:parseFloat(form.interest_rate)||null,
      type:form.type,
    })
    setForm({name:'',total_amount:'',remaining:'',monthly_payment:'',interest_rate:'',type:'prestamo'})
    setShowForm(false)
  }

  const handlePay = async (id) => {
    if (!payAmount||parseFloat(payAmount)<=0) return
    await payDebt(id, parseFloat(payAmount))
    setPayingId(null); setPayAmount('')
  }

  if (loading) return <div className="deudas-page"><div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Cargando...</div></div>

  return (
    <div className="deudas-page">
      <PageHeader title="Deudas"
        subtitle="Evitar y eliminar deudas"
        action={<Button size="sm" onClick={()=>setShowForm(!showForm)}>+ Añadir deuda</Button>}/>

      <div className="deudas-content">
        {debts.length>0&&(
          <div className="deudas-summary-grid">
            <Card padding="compact"><div className="ds-label">Deuda total</div><div className="ds-value danger">{formatCurrency(totalDebt)}</div></Card>
            <Card padding="compact"><div className="ds-label">Cuota mensual</div><div className="ds-value">{formatCurrency(totalMonthly)}</div></Card>
            <Card padding="compact"><div className="ds-label">Deudas activas</div><div className="ds-value">{debts.length}</div></Card>
          </div>
        )}

        {showForm&&(
          <Card>
            <div className="debt-form-title">Nueva deuda</div>
            <form onSubmit={handleAdd}>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">Nombre</label>
                  <input className="form-input" placeholder="Ej: Hipoteca Santander" required autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">Tipo</label>
                  <select className="form-input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    {DEBT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select></div>
              </div>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">Importe total (€)</label>
                  <input className="form-input" type="number" min="0" step="0.01" required value={form.total_amount} onChange={e=>setForm({...form,total_amount:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">Pendiente (€)</label>
                  <input className="form-input" type="number" min="0" step="0.01" placeholder="Igual al total si es nueva" value={form.remaining} onChange={e=>setForm({...form,remaining:e.target.value})}/></div>
              </div>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">Cuota mensual (€)</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.monthly_payment} onChange={e=>setForm({...form,monthly_payment:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">Interés anual (%)</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.interest_rate} onChange={e=>setForm({...form,interest_rate:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
                <Button variant="secondary" onClick={()=>setShowForm(false)}>Cancelar</Button>
                <Button type="submit">Añadir deuda</Button>
              </div>
            </form>
          </Card>
        )}

        {debts.length===0&&!showForm?(
          <Card><EmptyState icon="⊖" title="Sin deudas registradas"
            description="¡Excelente! Mantén tus finanzas libres de deudas."
            action={<Button size="sm" onClick={()=>setShowForm(true)}>Añadir deuda</Button>}/></Card>
        ):(
          debts.map(debt=>{
            const pct = debt.total_amount>0?(1-debt.remaining/debt.total_amount)*100:0
            const isPaying = payingId===debt.id
            return (
              <Card key={debt.id}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <div style={{fontWeight:700,color:'var(--text-primary)'}}>{debt.name}</div>
                      <Badge variant="default">{DEBT_TYPES.find(t=>t.value===debt.type)?.label||debt.type}</Badge>
                    </div>
                    <div style={{fontSize:'.82rem',color:'var(--text-secondary)',marginBottom:10}}>
                      {formatCurrency(debt.remaining)} pendiente de {formatCurrency(debt.total_amount)}
                      {debt.interest_rate>0&&` · ${debt.interest_rate}% anual`}
                    </div>
                    <ProgressBar value={debt.total_amount-debt.remaining} max={debt.total_amount} variant="default"/>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'.72rem',color:'var(--text-tertiary)',marginTop:4}}>
                      <span>{pct.toFixed(0)}% pagado</span>
                      {debt.monthly_payment>0&&<span>{formatCurrency(debt.monthly_payment)}/mes</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                    <Button size="sm" onClick={()=>{setPayingId(debt.id);setPayAmount(debt.monthly_payment||'')}}>Registrar pago</Button>
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'.75rem'}} onClick={()=>deleteDebt(debt.id)}>Eliminar</button>
                  </div>
                </div>
                {isPaying&&(
                  <div style={{marginTop:12,padding:'12px',background:'var(--bg-subtle)',borderRadius:'var(--radius-md)',display:'flex',gap:8,alignItems:'center'}}>
                    <input style={{flex:1,background:'var(--bg-input)',border:'none',borderRadius:'var(--radius-sm)',padding:'8px 12px',fontSize:'.9rem',color:'var(--text-primary)',fontFamily:'var(--font-sans)'}}
                      type="number" min="0" step="0.01" placeholder="Importe pagado" autoFocus value={payAmount} onChange={e=>setPayAmount(e.target.value)}/>
                    <Button size="sm" onClick={()=>handlePay(debt.id)}>Confirmar</Button>
                    <Button size="sm" variant="secondary" onClick={()=>setPayingId(null)}>✕</Button>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
