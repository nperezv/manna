import { useState } from 'react'
import { useSavings } from '../hooks/useData'
import { Card, Button, Badge, ProgressBar, PageHeader, EmptyState } from '../components/ui'
import { formatCurrency } from '../utils/helpers'
import './Ahorro.css'

export default function Ahorro() {
  const { goals, loading, addGoal, updateGoal, deleteGoal, addToGoal } = useSavings()
  const [showForm, setShowForm] = useState(false)
  const [addingToId, setAddingToId] = useState(null)
  const [addAmount, setAddAmount] = useState('')
  const [form, setForm] = useState({name:'',target:'',saved:'',deadline:'',color:'#2d9b8a'})

  const COLORS = ['#2d9b8a','#4a9fd4','#e6ad3c','#8b6cf7','#e05c4e','#d4548a']

  const totalSaved  = goals.reduce((s,g)=>s+parseFloat(g.saved),0)
  const totalTarget = goals.reduce((s,g)=>s+parseFloat(g.target),0)
  const completed   = goals.filter(g=>parseFloat(g.saved)>=parseFloat(g.target)).length

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name||!form.target) return
    await addGoal({name:form.name,target:parseFloat(form.target),saved:parseFloat(form.saved)||0,deadline:form.deadline||null,color:form.color})
    setForm({name:'',target:'',saved:'',deadline:'',color:'#2d9b8a'}); setShowForm(false)
  }

  const handleAddTo = async (id) => {
    if (!addAmount||parseFloat(addAmount)<=0) return
    await addToGoal(id, parseFloat(addAmount))
    setAddingToId(null); setAddAmount('')
  }

  if (loading) return <div className="ahorro-page"><div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Cargando...</div></div>

  return (
    <div className="ahorro-page">
      <PageHeader title="Ahorro — Pilar 3" subtitle="Ahorrar para el futuro"
        action={<Button size="sm" onClick={()=>setShowForm(!showForm)}>+ Nueva meta</Button>}/>

      <div className="ahorro-content">
        {goals.length>0&&(
          <div className="ahorro-summary">
            <Card padding="compact"><div className="as-label">Total ahorrado</div><div className="as-value accent">{formatCurrency(totalSaved)}</div></Card>
            <Card padding="compact"><div className="as-label">Objetivo total</div><div className="as-value">{formatCurrency(totalTarget)}</div></Card>
            <Card padding="compact"><div className="as-label">Metas completadas</div><div className="as-value">{completed}/{goals.length}</div></Card>
          </div>
        )}

        {showForm&&(
          <Card>
            <div style={{fontWeight:700,fontSize:'1rem',color:'var(--text-primary)',marginBottom:16}}>Nueva meta de ahorro</div>
            <form onSubmit={handleAdd}>
              <div className="form-group"><label className="form-label">Nombre de la meta</label>
                <input className="form-input" placeholder="Ej: Fondo emergencias, Vacaciones..." required autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">Objetivo (€)</label>
                  <input className="form-input" type="number" min="0" step="0.01" required value={form.target} onChange={e=>setForm({...form,target:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">Ya ahorrado (€)</label>
                  <input className="form-input" type="number" min="0" step="0.01" placeholder="0" value={form.saved} onChange={e=>setForm({...form,saved:e.target.value})}/></div>
              </div>
              <div className="form-group"><label className="form-label">Fecha objetivo (opcional)</label>
                <input className="form-input" type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Color</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {COLORS.map(c=>(
                    <button key={c} type="button"
                      style={{width:28,height:28,borderRadius:'50%',background:c,border:form.color===c?'3px solid var(--text-primary)':'2px solid transparent',cursor:'pointer'}}
                      onClick={()=>setForm({...form,color:c})}/>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
                <Button variant="secondary" onClick={()=>setShowForm(false)}>Cancelar</Button>
                <Button type="submit">Crear meta</Button>
              </div>
            </form>
          </Card>
        )}

        {goals.length===0&&!showForm?(
          <Card><EmptyState icon="◎" title="Sin metas de ahorro"
            description="Define metas para ahorrar con propósito."
            action={<Button size="sm" onClick={()=>setShowForm(true)}>Crear primera meta</Button>}/></Card>
        ):(
          goals.map(goal=>{
            const saved = parseFloat(goal.saved)
            const target = parseFloat(goal.target)
            const pct = target>0?Math.min((saved/target)*100,100):0
            const done = saved>=target
            const isAdding = addingToId===goal.id
            return (
              <Card key={goal.id}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:goal.color,flexShrink:0,marginTop:4}}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <div style={{fontWeight:700,color:'var(--text-primary)'}}>{goal.name}</div>
                      {done&&<Badge variant="success">✓ Completada</Badge>}
                    </div>
                    <div style={{fontSize:'.82rem',color:'var(--text-secondary)',marginBottom:10}}>
                      {formatCurrency(saved)} de {formatCurrency(target)}
                      {goal.deadline&&` · Objetivo: ${new Date(goal.deadline).toLocaleDateString('es-ES')}`}
                    </div>
                    <ProgressBar value={saved} max={target} variant={done?'success':'default'}/>
                    <div style={{fontSize:'.72rem',color:'var(--text-tertiary)',marginTop:4}}>{pct.toFixed(0)}% completado · Faltan {formatCurrency(Math.max(target-saved,0))}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                    {!done&&<Button size="sm" onClick={()=>{setAddingToId(goal.id);setAddAmount('')}}>+ Añadir</Button>}
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'.75rem'}} onClick={()=>deleteGoal(goal.id)}>Eliminar</button>
                  </div>
                </div>
                {isAdding&&(
                  <div style={{marginTop:12,padding:'12px',background:'var(--bg-subtle)',borderRadius:'var(--radius-md)',display:'flex',gap:8,alignItems:'center'}}>
                    <input style={{flex:1,background:'var(--bg-input)',border:'none',borderRadius:'var(--radius-sm)',padding:'8px 12px',fontSize:'.9rem',color:'var(--text-primary)',fontFamily:'var(--font-sans)'}}
                      type="number" min="0" step="0.01" placeholder="¿Cuánto añades?" autoFocus value={addAmount} onChange={e=>setAddAmount(e.target.value)}/>
                    <Button size="sm" onClick={()=>handleAddTo(goal.id)}>Añadir</Button>
                    <Button size="sm" variant="secondary" onClick={()=>setAddingToId(null)}>✕</Button>
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
