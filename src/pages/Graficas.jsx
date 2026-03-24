import { useApi } from '../hooks/useData'
import { api } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { PieChart, Pie } from 'recharts'
import { Card, PageHeader } from '../components/ui'
import { formatCurrency, getCurrentMonth, getShortMonthLabel } from '../utils/helpers'
import { PARENT_CATEGORIES } from '../utils/categories'
import './Graficas.css'

function getParentId(categoryId) {
  const sub = categoryId
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

function nextMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Project next month using average of last 3 real months
function projectNextMonth(history) {
  if (!history || history.length < 1) return null
  const last3 = history.slice(-3)
  const avgIncome  = last3.reduce((s, h) => s + h.income,  0) / last3.length
  const avgExpense = last3.reduce((s, h) => s + h.expense, 0) / last3.length
  const nm = nextMonth(history[history.length - 1].month)
  return {
    month:     getShortMonthLabel(nm),
    monthKey:  nm,
    income:    Math.round(avgIncome),
    expense:   Math.round(avgExpense),
    projected: true,
  }
}

// Custom bar that renders projected months with pattern
function ProjectedBar({ x, y, width, height, fill, projected }) {
  if (!height || height <= 0) return null
  if (projected) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} opacity={0.3} rx={4}/>
        <rect x={x} y={y} width={width} height={height} fill="none"
          stroke={fill} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} rx={4}/>
      </g>
    )
  }
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4}/>
}

// Custom tooltip that shows "Proyección" for projected months
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const isProjected = payload[0]?.payload?.projected
  return (
    <div style={{background:'var(--bg-card)',border:'.5px solid var(--border)',borderRadius:10,padding:'10px 14px',fontSize:12}}>
      <div style={{fontWeight:600,marginBottom:4,color:'var(--text-primary)'}}>
        {label}{isProjected && <span style={{color:'var(--text-tertiary)',fontWeight:400,marginLeft:4}}>· Proyección</span>}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{color:p.color,marginTop:2}}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Graficas() {
  const month = getCurrentMonth()
  const year  = new Date().getFullYear()
  const { data: dash,    loading: l1 } = useApi(() => api.dashboard.get(month), [month])
  const { data: history, loading: l2 } = useApi(() => api.dashboard.history(), [])
  const { data: titheHistory }          = useApi(() => api.tithe.history(), [])

  const loading = l1 || l2

  // Category spending for this month
  const catData = []
  if (dash?.expenses?.byCategory) {
    const parentTotals = {}
    dash.expenses.byCategory.forEach(e => {
      const pid = getParentId(e.categoryId)
      parentTotals[pid] = (parentTotals[pid] || 0) + e.spent
    })
    PARENT_CATEGORIES.forEach(cat => {
      if (parentTotals[cat.id] > 0) {
        catData.push({ name: cat.name, value: parentTotals[cat.id], color: cat.color })
      }
    })
    catData.sort((a, b) => b.value - a.value)
  }

  // Build bar chart data — real months + 1 projected
  const realBarData = (history || []).map(h => ({
    month:    getShortMonthLabel(h.month),
    monthKey: h.month,
    Ingresos: h.income,
    Gastos:   h.expense,
    projected: false,
  }))

  const projection = history?.length > 0 ? projectNextMonth(history) : null
  const barData = projection
    ? [...realBarData, { ...projection, Ingresos: projection.income, Gastos: projection.expense }]
    : realBarData

  // Tithe bar data — real months + 1 projected
  const realTitheData = (titheHistory || []).map(h => ({
    month:     getShortMonthLabel(h.month),
    Diezmo:    h.tithePaid,
    Ofrenda:   h.fastPaid,
    Previsto:  h.titheOwed,
    projected: false,
  }))

  const titheProjection = titheHistory?.length > 0 ? (() => {
    const last3 = titheHistory.slice(-3)
    const avgOwed = last3.reduce((s,h) => s + h.titheOwed, 0) / last3.length
    const nm = nextMonth(titheHistory[titheHistory.length - 1].month)
    return {
      month: getShortMonthLabel(nm),
      Diezmo: 0, Ofrenda: 0, Previsto: Math.round(avgOwed),
      projected: true,
    }
  })() : null

  const titheBarData = titheProjection
    ? [...realTitheData, titheProjection]
    : realTitheData

  const income = dash?.income?.total || 0
  const spent  = dash?.expenses?.total || 0

  if (loading) return (
    <div className="graficas-page">
      <div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Cargando gráficas...</div>
    </div>
  )

  return (
    <div className="graficas-page">
      <PageHeader title="Gráficas" subtitle={`Análisis financiero ${year}`}/>
      <div className="graficas-content">

        {/* Balance this month */}
        <Card>
          <div className="chart-section-title">Balance — {getShortMonthLabel(month)}</div>
          <div className="balance-row">
            <div className="balance-item">
              <div className="bi-label">Ingresos</div>
              <div className="bi-value" style={{color:'var(--accent)'}}>{formatCurrency(income)}</div>
            </div>
            <div className="balance-sep">−</div>
            <div className="balance-item">
              <div className="bi-label">Gastos</div>
              <div className="bi-value" style={{color:'var(--danger)'}}>{formatCurrency(spent)}</div>
            </div>
            <div className="balance-sep">=</div>
            <div className="balance-item">
              <div className="bi-label">Balance</div>
              <div className="bi-value" style={{color:income-spent>=0?'var(--accent)':'var(--danger)'}}>
                {formatCurrency(income-spent)}
              </div>
            </div>
          </div>
        </Card>

        {/* Income vs expenses — year + projection */}
        {barData.some(d => d.Ingresos > 0 || d.Gastos > 0) && (
          <Card>
            <div className="chart-section-title" style={{display:'flex',alignItems:'center',gap:10}}>
              Ingresos vs Gastos — {year}
              {projection && (
                <span className="proj-badge">+ proyección {getShortMonthLabel(projection.monthKey)}</span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barGap={2} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false}
                  tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}k` : v}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="Ingresos" name="Ingresos"
                  shape={(props) => <ProjectedBar {...props} fill="var(--accent)" projected={props.projected || (props.payload?.projected)}/>}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill="var(--accent)" opacity={entry.projected ? 0.35 : 1}/>
                  ))}
                </Bar>
                <Bar dataKey="Gastos" name="Gastos"
                  shape={(props) => <ProjectedBar {...props} fill="var(--danger)" projected={props.payload?.projected}>
                  </ProjectedBar>}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill="var(--danger)" opacity={entry.projected ? 0.35 : 1}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {projection && (
              <div className="proj-note">
                Proyección basada en la media de los últimos {Math.min(history.length, 3)} meses reales
              </div>
            )}
          </Card>
        )}

        {/* Category breakdown this month */}
        {catData.length > 0 && (
          <Card>
            <div className="chart-section-title">Gastos por categoría — {getShortMonthLabel(month)}</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={2} dataKey="value" stroke="none">
                  {catData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)}
                  contentStyle={{background:'var(--bg-card)',border:'.5px solid var(--border)',borderRadius:10,fontSize:12}}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="graficas-legend">
              {catData.map((c, i) => (
                <div key={i} className="gl-item">
                  <div className="gl-dot" style={{background:c.color}}/>
                  <span className="gl-name">{c.name}</span>
                  <span className="gl-pct">{income > 0 ? ((c.value/income)*100).toFixed(0) : 0}%</span>
                  <span className="gl-val">{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tithe — year + projection */}
        {titheBarData.some(d => d.Diezmo > 0 || d.Previsto > 0) && (
          <Card>
            <div className="chart-section-title" style={{display:'flex',alignItems:'center',gap:10}}>
              Diezmo y ofrenda — {year}
              {titheProjection && (
                <span className="proj-badge">+ proyección {getShortMonthLabel(titheProjection.month)}</span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={titheBarData} barGap={2} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false}
                  tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}k` : v}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="Previsto" name="Previsto" fill="var(--border-strong)" radius={[4,4,0,0]} opacity={0.4}/>
                <Bar dataKey="Diezmo"   name="Diezmo">
                  {titheBarData.map((entry, i) => (
                    <Cell key={i} fill="var(--gold)" opacity={entry.projected ? 0.3 : 1}/>
                  ))}
                </Bar>
                <Bar dataKey="Ofrenda"  name="Ofrenda">
                  {titheBarData.map((entry, i) => (
                    <Cell key={i} fill="#ff9f0a" opacity={entry.projected ? 0.3 : 1}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {titheProjection && (
              <div className="proj-note">
                Diezmo proyectado: <strong>{formatCurrency(titheProjection.Previsto)}</strong> — basado en ingresos recientes
              </div>
            )}
          </Card>
        )}

        {!dash && (
          <Card>
            <div style={{padding:20,textAlign:'center',color:'var(--text-tertiary)',fontSize:'.875rem'}}>
              Registra ingresos y gastos para ver tus gráficas.
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
