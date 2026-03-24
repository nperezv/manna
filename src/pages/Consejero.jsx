import { useApi } from '../hooks/useData'
import { api } from '../api/client'
import { Card, Badge, PageHeader } from '../components/ui'
import { formatCurrency, getCurrentMonth } from '../utils/helpers'
import './Consejero.css'

export default function Consejero() {
  const month = getCurrentMonth()
  const { data: dash, loading } = useApi(() => api.dashboard.get(month), [month])

  if (loading) return (
    <div className="consejero-page">
      <div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Analizando tus finanzas...</div>
    </div>
  )

  const income  = dash?.income?.computable || 0
  const spent   = dash?.expenses?.total || 0
  const balance = income - spent
  const tithe   = dash?.tithe || {}
  const hasData = income > 0

  const savingRate = income > 0 ? Math.max(0, ((income - spent) / income) * 100) : 0

  // Score — only meaningful with data
  let score = 0
  let scoreFactors = []

  if (hasData) {
    // Pilar 1: Diezmo (30 pts)
    if (tithe.pending === 0 && tithe.owed > 0) {
      score += 30
      scoreFactors.push({ ok: true, text: 'Diezmo al día' })
    } else if (tithe.owed > 0) {
      const pct = tithe.paid / tithe.owed
      score += Math.round(pct * 30)
      scoreFactors.push({ ok: false, text: `Diezmo ${Math.round(pct*100)}% pagado` })
    } else {
      scoreFactors.push({ ok: false, text: 'Sin ingresos computables' })
    }

    // Pilar 2: Balance (25 pts)
    if (balance >= 0) {
      score += 25
      scoreFactors.push({ ok: true, text: 'Gastos por debajo de ingresos' })
    } else {
      scoreFactors.push({ ok: false, text: 'Gastos superan ingresos' })
    }

    // Pilar 3: Ahorro (25 pts)
    if (savingRate >= 20) {
      score += 25
      scoreFactors.push({ ok: true, text: `Ahorro del ${savingRate.toFixed(0)}%` })
    } else if (savingRate >= 10) {
      score += 15
      scoreFactors.push({ ok: true, text: `Ahorro del ${savingRate.toFixed(0)}% (objetivo: 20%)` })
    } else {
      score += Math.round(savingRate * 1.5)
      scoreFactors.push({ ok: false, text: `Ahorro bajo: ${savingRate.toFixed(0)}%` })
    }

    // Pilar 4: Sin deudas (20 pts)
    if (dash?.debts?.count === 0) {
      score += 20
      scoreFactors.push({ ok: true, text: 'Sin deudas activas' })
    } else if (dash?.debts?.count > 0) {
      score += 5
      scoreFactors.push({ ok: false, text: `${dash.debts.count} deuda${dash.debts.count>1?'s':''} activa${dash.debts.count>1?'s':''}` })
    }
  }

  const scoreVariant = !hasData ? 'default' : score >= 80 ? 'success' : score >= 60 ? 'default' : 'warning'
  const scoreLabel   = !hasData ? 'Sin datos' : score >= 80 ? 'Excelente' : score >= 60 ? 'Bien' : 'Mejorable'

  // Insights
  const insights = []

  if (!hasData) {
    insights.push({
      type: 'info', icon: '⬡',
      title: 'Empieza registrando tus ingresos',
      desc: 'Añade tus ingresos del mes para que el consejero pueda calcular el diezmo y analizar tu situación financiera.',
    })
  } else {
    if (tithe.owed > 0 && tithe.pending > 0) {
      insights.push({ type:'warning', icon:'✦', title:'Diezmo pendiente', desc:`Tienes ${formatCurrency(tithe.pending)} de diezmo pendiente este mes. Recuerda pagar al Señor primero.` })
    } else if (tithe.owed > 0 && tithe.pending === 0) {
      insights.push({ type:'success', icon:'✦', title:'Diezmo al día', desc:`Has pagado tu diezmo completo este mes (${formatCurrency(tithe.paid)}). ¡Excelente fidelidad!` })
    }
    if (tithe.fastOwed > 0 && tithe.fastPending > 0) {
      insights.push({ type:'warning', icon:'✦', title:'Ofrenda de ayuno pendiente', desc:`${formatCurrency(tithe.fastPending)} pendientes de ofrenda de ayuno.` })
    }
    if (balance < 0) {
      insights.push({ type:'danger', icon:'◈', title:'Gastos superiores a ingresos', desc:`Llevas ${formatCurrency(Math.abs(balance))} más de gastos que ingresos este mes. Revisa urgentemente.` })
    } else if (savingRate < 10 && income > 0) {
      insights.push({ type:'warning', icon:'◎', title:'Tasa de ahorro baja', desc:`Solo ahorras el ${savingRate.toFixed(0)}% de tus ingresos. El objetivo recomendado es el 20%.` })
    } else if (savingRate >= 20) {
      insights.push({ type:'success', icon:'◎', title:'Excelente tasa de ahorro', desc:`Estás ahorrando el ${savingRate.toFixed(0)}% de tus ingresos. ¡Sigue así!` })
    }
    if (dash?.debts?.count > 0 && dash?.debts?.monthlyTotal > 0) {
      const debtRatio = income > 0 ? (dash.debts.monthlyTotal / income) * 100 : 0
      if (debtRatio > 30) {
        insights.push({ type:'danger', icon:'⊖', title:'Alta carga de deuda', desc:`Las cuotas de deuda suponen el ${debtRatio.toFixed(0)}% de tus ingresos. Se recomienda no superar el 30%.` })
      }
    }
  }

  return (
    <div className="consejero-page">
      <PageHeader title="Consejero financiero" subtitle="Análisis basado en los pilares SUD"/>
      <div className="consejero-content">
        {/* Score */}
        <Card className="score-card">
          <div className="score-inner">
            <div className="score-ring">
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6"/>
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke={score >= 80 ? 'var(--accent)' : score >= 60 ? 'var(--info)' : score > 0 ? 'var(--warning)' : 'var(--border-strong)'}
                  strokeWidth="6"
                  strokeDasharray={`${(hasData ? score : 0)*2.136} 213.6`}
                  strokeLinecap="round" transform="rotate(-90 40 40)"
                  style={{transition:'stroke-dasharray 1s ease'}}/>
              </svg>
              <div className="score-text">
                <span className="score-num">{hasData ? score : '—'}</span>
                {hasData && <span className="score-label">/ 100</span>}
              </div>
            </div>
            <div className="score-info">
              <div className="score-title">Salud financiera</div>
              <Badge variant={scoreVariant}>{scoreLabel}</Badge>
              <div className="score-desc">
                {hasData
                  ? 'Basado en diezmo, balance, ahorro y deudas del mes.'
                  : 'Registra ingresos y gastos para obtener tu puntuación.'}
              </div>
              {hasData && scoreFactors.length > 0 && (
                <div className="score-factors">
                  {scoreFactors.map((f, i) => (
                    <div key={i} className="score-factor">
                      <span style={{color: f.ok ? 'var(--accent)' : 'var(--text-tertiary)'}}>{f.ok ? '✓' : '○'}</span>
                      <span style={{fontSize:'.75rem', color: 'var(--text-secondary)'}}>{f.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Insights */}
        <div className="consejero-section-label">Análisis del mes</div>
        {insights.map((ins, i) => (
          <Card key={i} className={`insight-card insight-${ins.type}`}>
            <div className="insight-icon">{ins.icon}</div>
            <div className="insight-body">
              <div className="insight-title">{ins.title}</div>
              <div className="insight-desc">{ins.desc}</div>
            </div>
          </Card>
        ))}

        {/* SUD principles */}
        <div className="consejero-section-label">Los 4 pilares del bienestar</div>
        <Card>
          {[
            { n:1, t:'Pagar al Señor primero',         d:'El diezmo fiel trae bendiciones espirituales y materiales.',  ok: hasData && tithe.pending === 0 && tithe.owed > 0 },
            { n:2, t:'Vivir dentro de tus posibilidades', d:'Gasta menos de lo que ganas cada mes.',                    ok: hasData && balance >= 0 },
            { n:3, t:'Ahorrar para el futuro',          d:'Construye un fondo de emergencias de 3-6 meses.',            ok: hasData && savingRate >= 10 },
            { n:4, t:'Evitar deudas',                   d:'Elimina deudas de consumo y evita nuevas.',                  ok: dash?.debts?.count === 0 },
          ].map((p, i, arr) => (
            <div key={p.n} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:i<arr.length-1?'.5px solid var(--border)':'none'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:p.ok?'var(--accent-light)':'var(--bg-subtle)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:'.75rem',fontWeight:700,color:p.ok?'var(--accent-text)':'var(--text-tertiary)'}}>{p.n}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:'.875rem',fontWeight:600,color:'var(--text-primary)'}}>{p.t}</div>
                <div style={{fontSize:'.75rem',color:'var(--text-tertiary)',marginTop:2}}>{p.d}</div>
              </div>
              <span style={{fontSize:'1rem',color:p.ok?'var(--accent)':'var(--text-tertiary)'}}>{p.ok ? '✓' : '○'}</span>
            </div>
          ))}
        </Card>

        {/* Month summary */}
        {hasData && (
          <>
            <div className="consejero-section-label">Resumen del mes</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                {label:'Ingresos', value:formatCurrency(income), color:'var(--accent)'},
                {label:'Gastos', value:formatCurrency(spent), color:'var(--danger)'},
                {label:'Balance', value:formatCurrency(balance), color:balance>=0?'var(--accent)':'var(--danger)'},
                {label:'Tasa ahorro', value:`${savingRate.toFixed(0)}%`, color:savingRate>=10?'var(--accent)':'var(--warning)'},
              ].map(item => (
                <Card key={item.label} padding="compact">
                  <div style={{fontSize:'.7rem',color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:4}}>{item.label}</div>
                  <div style={{fontSize:'1.1rem',fontWeight:800,color:item.color,letterSpacing:'-.03em'}}>{item.value}</div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
