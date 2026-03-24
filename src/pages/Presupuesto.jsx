import { useState } from 'react'
import { useBudget, useExpenses } from '../hooks/useData'
import { Card, ProgressBar, Badge, PageHeader } from '../components/ui'
import MonthNav from '../components/ui/MonthNav'
import AddDonationModal from '../components/modals/AddDonationModal'
import AddCustomSubModal from '../components/modals/AddCustomSubModal'
import { formatCurrency, getCurrentMonth, getPillarName } from '../utils/helpers'
import { PARENT_CATEGORIES, SUBCATEGORIES } from '../utils/categories'
import { api } from '../api/client'
import './Presupuesto.css'

const PILLAR_COLORS = {1:'#e6ad3c',2:'#4a9fd4',3:'#30d158',4:'#c05a3a'}
const NO_SUBS = new Set([1, 11, 10])

function getParentId(sub) {
  if (sub < 100) return sub
  if (sub >= 1001) return 10
  if (sub >= 901) return sub < 902 ? 8 : 9
  if (sub >= 801) return 7
  if (sub >= 701) return 21
  if (sub >= 601) return 6
  if (sub >= 501) return 5
  if (sub >= 401) return 4
  if (sub >= 301) return 3
  if (sub >= 204) return 20
  if (sub >= 201) return 2
  if (sub >= 111) return 11
  if (sub >= 101) return 1
  return sub
}

export default function Presupuesto() {
  const [month, setMonth]             = useState(getCurrentMonth())
  const [editing, setEditing]         = useState(null)
  const [editVal, setEditVal]         = useState('')
  const [editingSub, setEditingSub]   = useState(null)
  const [editSubVal, setEditSubVal]   = useState('')
  const [renamingSub, setRenamingSub] = useState(null)
  const [renameVal, setRenameVal]     = useState('')
  const [expandedCats, setExpandedCats] = useState(new Set())
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [customSubModal, setCustomSubModal]       = useState(null)
  const [distDialog, setDistDialog]               = useState(null)
  const [suggestDialog, setSuggestDialog]         = useState(null)
  const [suggestLoading, setSuggestLoading]       = useState(false)
  const [hiddenSubs, setHiddenSubs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('manna_hidden_subs') || '[]')) }
    catch { return new Set() }
  })

  const { budget, loading, setCategory, setSubcategory } = useBudget(month)
  const { expenses } = useExpenses(month)

  const toggleExpand = (id) => setExpandedCats(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const budgetMap = {}
  ;(budget?.budgetCategories || []).forEach(b => { budgetMap[b.category_id] = parseFloat(b.budgeted) })
  const subBudgetMap = {}
  ;(budget?.subcategoryBudgets || []).forEach(b => { subBudgetMap[b.subcategory_id] = parseFloat(b.budgeted) })

  const titheOwed        = budget?.titheOwed        || 0
  const fastOwed         = budget?.fastOwed         || 0
  const totalDebtPayment = budget?.totalDebtPayments || 0
  const debts            = budget?.debts            || []

  const getSpent = (catId) => expenses.filter(e => {
    if (e.category_id === catId) return true
    if (catId >= 100) return false
    return getParentId(e.category_id) === catId
  }).reduce((s, e) => s + parseFloat(e.amount), 0)

  const totalBudgeted = PARENT_CATEGORIES.reduce((s, c) => {
    if (c.id === 1)  return s + titheOwed
    if (c.id === 11) return s + fastOwed
    if (c.id === 10) return s + totalDebtPayment
    return s + (budgetMap[c.id] || 0)
  }, 0)
  const totalSpent = PARENT_CATEGORIES.reduce((s, c) => s + getSpent(c.id), 0)

  const getCustomSubs = (catId) => {
    try { return JSON.parse(localStorage.getItem(`manna_custom_subs_${catId}`) || '[]') }
    catch { return [] }
  }
  const saveCustomSubs = (catId, subs) => {
    localStorage.setItem(`manna_custom_subs_${catId}`, JSON.stringify(subs))
  }

  const hideSub = (catId, subId, subName, hasExpenses) => {
    if (hasExpenses && !window.confirm(`"${subName}" tiene gastos registrados. ¿Ocultar de todas formas?`)) return
    const next = new Set(hiddenSubs)
    next.add(subId)
    setHiddenSubs(next)
    localStorage.setItem('manna_hidden_subs', JSON.stringify([...next]))
    const allS = [...SUBCATEGORIES.filter(s => s.parentId === catId && !next.has(s.id)), ...getCustomSubs(catId)]
    setCategory(catId, allS.reduce((sum, s) => sum + (subBudgetMap[s.id] || 0), 0))
  }

  const handleParentBudget = async (catId, amount) => {
    const subs = [...SUBCATEGORIES.filter(s => s.parentId === catId && !hiddenSubs.has(s.id)), ...getCustomSubs(catId)]
    const subsWithBudget = subs.filter(s => (subBudgetMap[s.id] || 0) > 0)
    if (subs.length > 0 && subsWithBudget.length > 0) {
      setDistDialog({ catId, amount, subs, subBudgetMap })
    } else if (subs.length > 0) {
      await distributeEqually(catId, amount, subs)
    } else {
      await setCategory(catId, amount)
    }
    setEditing(null)
  }

  const distributeEqually = async (catId, amount, subs) => {
    await setCategory(catId, amount)
    const each = Math.floor((amount / subs.length) * 100) / 100
    for (const sub of subs) {
      if (sub.id > 10000) continue
      await setSubcategory(sub.id, each)
    }
  }

  const distributeProportional = async (catId, amount, subs, sbMap) => {
    await setCategory(catId, amount)
    const total = subs.reduce((s, sub) => s + (sbMap[sub.id] || 0), 0)
    if (total === 0) { await distributeEqually(catId, amount, subs); return }
    for (const sub of subs) {
      if (sub.id > 10000) continue
      await setSubcategory(sub.id, Math.floor(((sbMap[sub.id] || 0) / total) * amount * 100) / 100)
    }
  }

  const handleSubBudget = async (subId, amount, parentId) => {
    await setSubcategory(subId, amount)
    const allSubs = [...SUBCATEGORIES.filter(s => s.parentId === parentId && !hiddenSubs.has(s.id)), ...getCustomSubs(parentId)]
    const newParent = allSubs.reduce((sum, s) => sum + (s.id === subId ? amount : (subBudgetMap[s.id] || 0)), 0)
    await setCategory(parentId, newParent)
    setEditingSub(null)
  }

  // Renamed system subs stored separately
  const getRenamedSubs = () => {
    try { return JSON.parse(localStorage.getItem('manna_renamed_subs') || '{}') }
    catch { return {} }
  }
  const getSubName = (sub) => {
    if (sub.custom) return sub.name
    const renamed = getRenamedSubs()
    return renamed[sub.id] || sub.name
  }

  const handleRenameSub = (catId, subId, newName, isCustom) => {
    if (!newName.trim()) { setRenamingSub(null); return }
    if (isCustom) {
      const customs = getCustomSubs(catId)
      saveCustomSubs(catId, customs.map(s => s.id === subId ? { ...s, name: newName } : s))
    } else {
      const renamed = getRenamedSubs()
      renamed[subId] = newName
      localStorage.setItem('manna_renamed_subs', JSON.stringify(renamed))
    }
    setRenamingSub(null)
    setExpandedCats(prev => new Set(prev))
  }

  const handleDeleteSub = (catId, sub) => {
    const subExp = expenses.filter(e => e.category_id === sub.id)
    if (sub.custom) {
      if (subExp.length > 0 && !window.confirm(`"${sub.name}" tiene ${subExp.length} gasto(s). ¿Eliminar?`)) return
      const updated = getCustomSubs(catId).filter(s => s.id !== sub.id)
      saveCustomSubs(catId, updated)
      const rem = [...SUBCATEGORIES.filter(s => s.parentId === catId && !hiddenSubs.has(s.id)), ...updated]
      setCategory(catId, rem.reduce((sum, s) => sum + (subBudgetMap[s.id] || 0), 0))
    } else {
      hideSub(catId, sub.id, sub.name, subExp.length > 0)
    }
    setExpandedCats(prev => new Set(prev))
  }

  if (loading) return (
    <div className="presupuesto-page">
      <div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Cargando...</div>
    </div>
  )

  return (
    <div className="presupuesto-page">
      <PageHeader title="Presupuesto" subtitle={<MonthNav month={month} onChange={setMonth}/>}/>
      <div className="presupuesto-content">

        <Card>
          <div className="budget-summary">
            <div className="budget-summary-item">
              <div className="bs-label">Presupuestado</div>
              <div className="bs-value">{formatCurrency(totalBudgeted)}</div>
            </div>
            <div className="budget-summary-divider"/>
            <div className="budget-summary-item">
              <div className="bs-label">Gastado</div>
              <div className="bs-value danger">{formatCurrency(totalSpent)}</div>
            </div>
            <div className="budget-summary-divider"/>
            <div className="budget-summary-item">
              <div className="bs-label">Disponible</div>
              <div className={`bs-value ${totalBudgeted-totalSpent < 0 ? 'danger' : 'accent'}`}>
                {formatCurrency(totalBudgeted - totalSpent)}
              </div>
            </div>
          </div>
        </Card>

        {/* Suggest budget banner — show when budget is mostly empty */}
        {totalBudgeted === 0 && (
          <div className="budget-suggest-banner">
            <div className="bsb-left">
              <div className="bsb-title">¿Rellenar presupuesto?</div>
              <div className="bsb-desc">Usa el historial o porcentajes sugeridos para empezar rápido</div>
            </div>
            <button className="bsb-btn" disabled={suggestLoading}
              onClick={async () => {
                setSuggestLoading(true)
                try {
                  const data = await api.budget.suggest(month)
                  setSuggestDialog(data)
                } catch(err) { alert(err.message) }
                finally { setSuggestLoading(false) }
              }}>
              {suggestLoading ? 'Calculando...' : 'Ver sugerencias →'}
            </button>
          </div>
        )}

        {/* Also show subtle button when budget exists */}
        {totalBudgeted > 0 && (
          <button className="budget-suggest-subtle"
            onClick={async () => {
              setSuggestLoading(true)
              try {
                const data = await api.budget.suggest(month)
                setSuggestDialog(data)
              } catch(err) { alert(err.message) }
              finally { setSuggestLoading(false) }
            }}>
            ◎ Sugerir presupuesto
          </button>
        )}

        {[1,2,3,4].map(pillar => {
          const cats = PARENT_CATEGORIES.filter(c => c.pillar === pillar)
          const pillarBudgeted = cats.reduce((s, c) => {
            if (c.id === 1)  return s + titheOwed
            if (c.id === 11) return s + fastOwed
            if (c.id === 10) return s + totalDebtPayment
            return s + (budgetMap[c.id] || 0)
          }, 0)

          return (
            <div key={pillar}>
              <div className="pillar-header">
                <div className="pillar-number" style={{borderColor:PILLAR_COLORS[pillar],color:PILLAR_COLORS[pillar]}}>{pillar}</div>
                <div className="pillar-name">{getPillarName(pillar)}</div>
                <Badge variant={pillar===1?'gold':pillar===3?'success':'default'}>
                  {formatCurrency(pillarBudgeted)}
                </Badge>
              </div>

              <div className="budget-cat-list">
                {cats.map(cat => {
                  const isTimhecat = cat.id === 1
                  const isFastcat  = cat.id === 11
                  const isDebtcat  = cat.id === 10
                  const isLocked   = isTimhecat || isFastcat
                  const noSubs     = NO_SUBS.has(cat.id)

                  const budgeted = isTimhecat ? titheOwed
                                 : isFastcat  ? fastOwed
                                 : isDebtcat  ? totalDebtPayment
                                 : (budgetMap[cat.id] || 0)

                  const spent     = getSpent(cat.id)
                  const pct       = budgeted > 0 ? (spent / budgeted) * 100 : 0
                  const isOver    = pct > 100
                  const isEditing = editing === cat.id

                  const systemSubs = noSubs ? [] : SUBCATEGORIES.filter(s => s.parentId === cat.id && !hiddenSubs.has(s.id))
                  const customSubs = noSubs ? [] : getCustomSubs(cat.id)
                  const allSubs    = [...systemSubs, ...customSubs]
                  const isExpanded = expandedCats.has(cat.id)

                  return (
                    <Card key={cat.id} padding="compact" className={isOver ? 'cat-over' : ''}>
                      <div className="budget-cat-row">
                        <div className="bcat-left">
                          <div className="bcat-dot" style={{background:cat.color}}/>
                          <div className="bcat-info">
                            <div className="bcat-name">{cat.name}</div>
                            {isLocked && <div className="bcat-locked-tag">calculado automáticamente</div>}
                          </div>
                        </div>
                        <div className="bcat-middle">
                          {budgeted > 0 && (
                            <>
                              <ProgressBar value={spent} max={budgeted} variant={isOver?'danger':pct>80?'warning':'default'}/>
                              <div className="bcat-progress-labels">
                                <span>{formatCurrency(spent)} gastado</span>
                                <span style={{color:isOver?'var(--danger)':'var(--text-tertiary)'}}>
                                  {isOver ? `+${formatCurrency(spent-budgeted)} excedido` : `${formatCurrency(budgeted-spent)} restante`}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="bcat-right">
                          {isLocked || isDebtcat ? (
                            <div className="bcat-locked-amount" style={isDebtcat?{color:'var(--danger)'}:{}}>
                              {budgeted > 0 ? formatCurrency(budgeted) : '—'}
                            </div>
                          ) : isEditing ? (
                            <input className="bcat-input" type="number" min="0" step="10"
                              value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                              onBlur={() => handleParentBudget(cat.id, parseFloat(editVal)||0)}
                              onKeyDown={e => {
                                if (e.key==='Enter') handleParentBudget(cat.id, parseFloat(editVal)||0)
                                if (e.key==='Escape') setEditing(null)
                              }}/>
                          ) : (
                            <button className={`bcat-budget-btn ${budgeted===0?'unset':''} ${isOver?'over':''}`}
                              onClick={() => { setEditing(cat.id); setEditVal(budgeted||'') }}>
                              {budgeted > 0 ? formatCurrency(budgeted) : '+ Asignar'}
                            </button>
                          )}
                          {!noSubs && allSubs.length > 0 && (
                            <button className={`bcat-expand-btn ${isExpanded?'expanded':''}`}
                              onClick={() => toggleExpand(cat.id)}>›</button>
                          )}
                          {isDebtcat && debts.length > 0 && (
                            <button className={`bcat-expand-btn ${isExpanded?'expanded':''}`}
                              onClick={() => toggleExpand(cat.id)}>›</button>
                          )}
                        </div>
                      </div>

                      {/* Subcategories */}
                      {!noSubs && isExpanded && (
                        <div className="bcat-subs">
                          {allSubs.map(sub => {
                            const subSpent    = expenses.filter(e => e.category_id === sub.id).reduce((s,e)=>s+parseFloat(e.amount),0)
                            const subBudget   = subBudgetMap[sub.id] || 0
                            const isEditingSub  = editingSub === sub.id
                            const isRenamingSub = renamingSub?.id === sub.id

                            return (
                              <div key={sub.id} className="bcat-sub-row">
                                <div className="bcat-sub-dot" style={{background:sub.color}}/>

                                {/* Name + action buttons */}
                                {isRenamingSub ? (
                                  <div className="bcat-sub-rename-wrap">
                                    <input className="bcat-sub-rename-input" autoFocus
                                      value={renameVal} onChange={e => setRenameVal(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key==='Enter') handleRenameSub(cat.id, sub.id, renameVal, sub.custom)
                                        if (e.key==='Escape') setRenamingSub(null)
                                      }}/>
                                    <button className="bcat-sub-act check" title="Guardar"
                                      onClick={() => handleRenameSub(cat.id, sub.id, renameVal, sub.custom)}>✓</button>
                                    <button className="bcat-sub-act del" title="Cancelar"
                                      onClick={() => setRenamingSub(null)}>✕</button>
                                  </div>
                                ) : (
                                  <div className="bcat-sub-name-row">
                                    <span className="bcat-sub-name">{getSubName(sub)}</span>
                                    <button className="bcat-sub-act edit" title="Renombrar"
                                      onClick={() => { setRenamingSub({ id: sub.id }); setRenameVal(getSubName(sub)) }}>✎</button>
                                    <button className="bcat-sub-act del" title="Eliminar"
                                      onClick={() => handleDeleteSub(cat.id, sub)}>✕</button>
                                  </div>
                                )}

                                {/* Budget button */}
                                <div className="bcat-sub-right">
                                  {isEditingSub ? (
                                    <input className="bcat-sub-input" type="number" min="0" step="10"
                                      value={editSubVal} onChange={e=>setEditSubVal(e.target.value)} autoFocus
                                      onBlur={()=>handleSubBudget(sub.id,parseFloat(editSubVal)||0,cat.id)}
                                      onKeyDown={e=>{
                                        if(e.key==='Enter')handleSubBudget(sub.id,parseFloat(editSubVal)||0,cat.id)
                                        if(e.key==='Escape')setEditingSub(null)
                                      }}/>
                                  ) : (
                                    <button className={`bcat-sub-budget-btn ${subBudget===0?'unset':''}`}
                                      onClick={()=>{setEditingSub(sub.id);setEditSubVal(subBudget||'')}}>
                                      {subBudget > 0 ? formatCurrency(subBudget) : '+ límite'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          <div className="bcat-sub-add-row">
                            <button className="bcat-sub-add-btn"
                              onClick={() => setCustomSubModal({ parentId: cat.id, parentName: cat.name, parentColor: cat.color })}>
                              + Añadir concepto
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Debt breakdown */}
                      {isExpanded && isDebtcat && debts.length > 0 && (
                        <div className="bcat-subs">
                          {debts.map(d => (
                            <div key={d.id} className="bcat-sub-row">
                              <div className="bcat-sub-dot" style={{background:'#c05a3a'}}/>
                              <div className="bcat-sub-name-row">
                                <span className="bcat-sub-name">{d.name}</span>
                                <span style={{fontSize:'.65rem',color:'var(--text-tertiary)',marginLeft:4}}>
                                  {formatCurrency(d.remaining)} pendiente
                                </span>
                              </div>
                              <div className="bcat-sub-right">
                                <span style={{fontSize:'.8rem',color:'var(--danger)',fontWeight:600}}>
                                  {d.monthly_payment ? `${formatCurrency(d.monthly_payment)}/mes` : '—'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                })}

                {pillar === 1 && (
                  <button className="bcat-add-donation" onClick={() => setShowDonationModal(true)}>
                    + Añadir donación al Pilar 1
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <div className="presupuesto-hint">
          Toca el importe para editarlo · ✎ renombrar · ✕ eliminar subcategoría
        </div>
      </div>

      {/* Suggestion dialog */}
      {suggestDialog && (
        <div className="modal-backdrop" onClick={() => setSuggestDialog(null)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Sugerir presupuesto — {month}</div>
              <button className="modal-close" onClick={() => setSuggestDialog(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="suggest-options">

                {/* Option 1: Copy previous month */}
                {suggestDialog.hasPrevMonth && (
                  <button className="suggest-option-card" onClick={async () => {
                    setSuggestDialog(null)
                    await api.budget.copy({ from_month: suggestDialog.prevMonth, to_month: month })
                    await budget?.refetch?.()
                  }}>
                    <div className="soc-header">
                      <div className="soc-title">📋 Copiar {suggestDialog.prevMonth}</div>
                      <div className="soc-badge">Más rápido</div>
                    </div>
                    <div className="soc-desc">Copia exactamente el presupuesto del mes anterior</div>
                    <div className="soc-preview">
                      {Object.entries(suggestDialog.prevBudget).slice(0,4).map(([catId, amt]) => {
                        const cat = PARENT_CATEGORIES.find(c => c.id === parseInt(catId))
                        return cat ? <span key={catId} className="soc-pill">{cat.name} {formatCurrency(amt)}</span> : null
                      })}
                      {Object.keys(suggestDialog.prevBudget).length > 4 && <span className="soc-pill">+{Object.keys(suggestDialog.prevBudget).length - 4} más</span>}
                    </div>
                  </button>
                )}

                {/* Option 2: Average of last months */}
                {suggestDialog.hasHistory && (
                  <button className="suggest-option-card" onClick={async () => {
                    setSuggestDialog(null)
                    for (const [catId, amt] of Object.entries(suggestDialog.averages)) {
                      await setCategory(parseInt(catId), amt)
                    }
                  }}>
                    <div className="soc-header">
                      <div className="soc-title">📊 Media de meses anteriores</div>
                      <div className="soc-badge soc-badge--blue">Recomendado</div>
                    </div>
                    <div className="soc-desc">Basado en tu historial real de gasto</div>
                    <div className="soc-preview">
                      {Object.entries(suggestDialog.averages).slice(0,4).map(([catId, amt]) => {
                        const cat = PARENT_CATEGORIES.find(c => c.id === parseInt(catId))
                        return cat ? <span key={catId} className="soc-pill">{cat.name} {formatCurrency(amt)}</span> : null
                      })}
                    </div>
                  </button>
                )}

                {/* Option 3: Percentage based */}
                {suggestDialog.income > 0 && (
                  <button className="suggest-option-card" onClick={async () => {
                    setSuggestDialog(null)
                    for (const [catId, amt] of Object.entries(suggestDialog.percentageBased)) {
                      if (amt > 0) await setCategory(parseInt(catId), amt)
                    }
                  }}>
                    <div className="soc-header">
                      <div className="soc-title">✦ Distribución sugerida SUD</div>
                      <div className="soc-badge soc-badge--gold">Principios</div>
                    </div>
                    <div className="soc-desc">Porcentajes recomendados sobre tus ingresos de {formatCurrency(suggestDialog.income)}</div>
                    <div className="soc-preview">
                      {Object.entries(suggestDialog.percentageBased).filter(([,v])=>v>0).slice(0,4).map(([catId, amt]) => {
                        const cat = PARENT_CATEGORIES.find(c => c.id === parseInt(catId))
                        return cat ? <span key={catId} className="soc-pill">{cat.name} {formatCurrency(amt)}</span> : null
                      })}
                    </div>
                  </button>
                )}

                {!suggestDialog.hasPrevMonth && !suggestDialog.hasHistory && suggestDialog.income === 0 && (
                  <div style={{color:'var(--text-tertiary)',fontSize:'.875rem',padding:'16px 0'}}>
                    Registra ingresos este mes para ver sugerencias basadas en porcentajes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Distribution dialog */}
      {distDialog && (
        <div className="modal-backdrop" onClick={() => setDistDialog(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Distribuir {formatCurrency(distDialog.amount)}</div>
              <button className="modal-close" onClick={() => setDistDialog(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:'.875rem',color:'var(--text-secondary)',marginBottom:16}}>
                Las subcategorías ya tienen importes. ¿Cómo distribuir?
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button className="dist-option-btn" onClick={async () => {
                  await distributeEqually(distDialog.catId, distDialog.amount, distDialog.subs)
                  setDistDialog(null)
                }}>
                  <div className="dist-option-title">Repartir por igual</div>
                  <div className="dist-option-desc">{formatCurrency(Math.floor(distDialog.amount/distDialog.subs.length*100)/100)} a cada subcategoría</div>
                </button>
                <button className="dist-option-btn" onClick={async () => {
                  await distributeProportional(distDialog.catId, distDialog.amount, distDialog.subs, distDialog.subBudgetMap)
                  setDistDialog(null)
                }}>
                  <div className="dist-option-title">Repartir proporcional</div>
                  <div className="dist-option-desc">Mantiene la proporción actual</div>
                </button>
                <button className="dist-option-btn" onClick={async () => {
                  await setCategory(distDialog.catId, distDialog.amount)
                  setDistDialog(null)
                }}>
                  <div className="dist-option-title">Solo actualizar el total</div>
                  <div className="dist-option-desc">No cambia las subcategorías</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDonationModal && (
        <AddDonationModal onClose={() => setShowDonationModal(false)} onAdded={() => setShowDonationModal(false)}/>
      )}
      {customSubModal && (
        <AddCustomSubModal parentId={customSubModal.parentId} parentName={customSubModal.parentName} parentColor={customSubModal.parentColor}
          onClose={() => setCustomSubModal(null)}
          onAdded={() => { setCustomSubModal(null); setExpandedCats(prev => new Set(prev)) }}/>
      )}
    </div>
  )
}
