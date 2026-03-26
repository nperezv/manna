import { useState, useRef } from 'react'
import { useTithe, useApi } from '../hooks/useData'
import { api } from '../api/client'
import { Card, Button, Badge, ProgressBar, PageHeader } from '../components/ui'
import MonthNav from '../components/ui/MonthNav'
import { formatCurrency, getCurrentMonth, getMonthLabel, getShortMonthLabel } from '../utils/helpers'
import './Diezmos.css'
import { useFamilySocket } from '../hooks/useSocket'

// ── Receipt helpers ────────────────────────────────────────────
async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result)
    reader.onerror = rej
    reader.readAsDataURL(file)
  })
}

// ── Unified pay form ───────────────────────────────────────────
function UnifiedPayForm({ titheData, month, onSave, onCancel }) {
  const pending = (titheData?.tithePending || 0) > 0.01
  const [titheAmt, setTitheAmt] = useState(
    (pending ? titheData.tithePending : titheData?.titheOwed || 0).toFixed(2)
  )
  const [fastAmt,  setFastAmt]  = useState((titheData?.fastOwed || 0).toFixed(2))
  const [note,     setNote]     = useState('')
  const [date,     setDate]     = useState(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    if (month === currentMonth) {
      // Today's date for current month
      return now.toISOString().split('T')[0]
    }
    // For past months: use the monthRange.from date (the 24th of that month)
    if (titheData?.monthRange?.from) return titheData.monthRange.from
    const [y, m] = month.split('-')
    return `${y}-${m}-24`
  })
  const [receipt,     setReceipt]     = useState(null)
  const [receiptName, setReceiptName] = useState('')
  const [uploading,   setUploading]   = useState(false)
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const b64 = await fileToBase64(file); setReceipt(b64); setReceiptName(file.name) }
    catch {}
    setUploading(false)
  }

  const total = (parseFloat(titheAmt) || 0) + (parseFloat(fastAmt) || 0)

  return (
    <Card className="unified-pay-card">
      <form onSubmit={e => {
        e.preventDefault()
        onSave({
          tithe_amount: parseFloat(titheAmt) || 0,
          fast_amount:  parseFloat(fastAmt)  || 0,
          note, date,
          receipt_data: receipt,
          receipt_name: receiptName,
        })
      }}>
        <div className="unified-pay-title">
          <span className="up-icon">✦</span>
          Registrar pago al Señor — {getMonthLabel(month)}
        </div>

        <div className="unified-pay-fields">
          {/* Tithe */}
          <div className="unified-field">
            <div className="unified-field-header">
              <div className="unified-field-label">
                <span className="uf-dot gold"/>Diezmo
                <span className="uf-tag">10% fijo</span>
              </div>
              <div className="uf-quick-row">
                {[titheData?.titheOwed, titheData?.tithePending].filter(v => v > 0.01).map((v, i) => (
                  <button key={i} type="button" className="pay-quick-btn"
                    onClick={() => setTitheAmt(v.toFixed(2))}>{formatCurrency(v)}</button>
                ))}
              </div>
            </div>
            <input className="unified-input" type="number" min="0" step="0.01"
              value={titheAmt} onChange={e => setTitheAmt(e.target.value)} required/>
          </div>

          <div className="unified-divider"/>

          {/* Fast offering */}
          <div className="unified-field">
            <div className="unified-field-header">
              <div className="unified-field-label">
                <span className="uf-dot amber"/>Ofrenda de ayuno
                <span className="uf-tag editable">{titheData?.fastOfferingPercent || 2}% sugerido</span>
              </div>
              <div className="uf-quick-row">
                {[titheData?.fastOwed, (titheData?.fastOwed || 0) * 2].filter(v => v > 0.01).map((v, i) => (
                  <button key={i} type="button" className="pay-quick-btn amber"
                    onClick={() => setFastAmt(v.toFixed(2))}>{formatCurrency(v)}</button>
                ))}
              </div>
            </div>
            <input className="unified-input" type="number" min="0" step="0.01"
              value={fastAmt} onChange={e => setFastAmt(e.target.value)}/>
          </div>
        </div>

        <div className="unified-total">
          <span className="ut-label">Total al Señor</span>
          <span className="ut-amount">{formatCurrency(total)}</span>
        </div>

        {/* Note + date row */}
        <div className="unified-note-date-row">
          <input className="unified-note-input" placeholder="Nota (ej: recibo domiciliado...)"
            value={note} onChange={e => setNote(e.target.value)}/>
          <input className="unified-date-input" type="date" value={date}
            onChange={e => setDate(e.target.value)}/>
        </div>

        {/* Receipt upload */}
        <div className="receipt-upload-section">
          <div className="receipt-upload-label">Comprobante</div>
          <div className="receipt-upload-row">
            <button type="button" className="receipt-upload-btn"
              onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Cargando...' : receipt ? '📎 Cambiar' : '📎 Adjuntar comprobante'}
            </button>
            {receipt && <span className="receipt-filename">{receiptName}</span>}
            {receipt && (
              <button type="button" className="receipt-remove"
                onClick={() => { setReceipt(null); setReceiptName('') }}>✕</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,.pdf"
            style={{display:'none'}} onChange={handleFile}/>
        </div>

        <div className="unified-pay-actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={total === 0}>
            Confirmar · {formatCurrency(total)}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ── Receipt viewer ─────────────────────────────────────────────
function ReceiptModal({ payment, onClose }) {
  if (!payment?.receipt_data) return null
  const isPDF = payment.receipt_data.startsWith('data:application/pdf')
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal receipt-modal">
        <div className="modal-header">
          <div className="modal-title">Comprobante — {payment.note || 'Pago al Señor'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="receipt-modal-body">
          {isPDF ? (
            <div className="receipt-pdf-wrap">
              <div style={{fontSize:'3rem'}}>📄</div>
              <div className="receipt-pdf-name">{payment.receipt_name || 'comprobante.pdf'}</div>
              <a href={payment.receipt_data} download={payment.receipt_name || 'comprobante.pdf'}
                className="receipt-download-btn">Descargar PDF</a>
            </div>
          ) : (
            <img src={payment.receipt_data} alt="Comprobante" className="receipt-img"/>
          )}
          <div className="receipt-meta">
            <span>{formatCurrency(payment.amount)}</span>
            <span>·</span>
            <span>{payment.date ? new Date(payment.date).toLocaleDateString('es-ES') : ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function Diezmos() {
  const [month, setMonth]           = useState(getCurrentMonth())
  const [showPayForm, setShowPayForm] = useState(false)
  const [viewReceipt, setViewReceipt] = useState(null)

  const { titheData, loading, refetch, pay } = useTithe(month)

  // Real-time sync
  useFamilySocket({ onTithe: () => refetch() })
  const { data: history } = useApi(() => api.tithe.history(), [])

  const handlePay = async (payment) => {
    try {
      await pay(payment)
      setShowPayForm(false)
    } catch(err) { alert(err.message) }
  }

  const t = titheData || {}
  const isCurrentMonth = month === getCurrentMonth()

  return (
    <div className="diezmos-page">
      <PageHeader
        title="Pagar al Señor"
        subtitle={<MonthNav month={month} onChange={setMonth}/>}
      />
      <div className="diezmos-content">
        {loading ? (
          <div style={{textAlign:'center',color:'var(--text-tertiary)',padding:40}}>Cargando...</div>
        ) : (
          <>
            {/* Status cards */}
            <div className="pilar1-cards">
              <Card className="tithe-status-card">
                <div className="tsc-header">
                  <div className="tsc-badge gold">Diezmo</div>
                  <div className="tsc-fixed-tag">10% fijo</div>
                  <Badge variant={t.tithePending===0&&t.titheOwed>0?'success':t.tithePending>0?'warning':'default'}>
                    {t.tithePending===0&&t.titheOwed>0?'✓ Al día':t.tithePending>0?'Pendiente':'—'}
                  </Badge>
                </div>
                <div className="tsc-amount">{formatCurrency(t.titheOwed||0)}</div>
                <div className="tsc-basis">10% de {formatCurrency(t.computableIncome||0)}</div>
                <div style={{marginTop:12}}>
                  <ProgressBar value={t.tithePaid||0} max={t.titheOwed||1} variant="gold"/>
                </div>
                <div className="tsc-progress-labels">
                  <span style={{color:'var(--accent)'}}>{formatCurrency(t.tithePaid||0)} pagado</span>
                  {t.tithePending > 0 && <span style={{color:'var(--warning)'}}>{formatCurrency(t.tithePending)} pendiente</span>}
                </div>
              </Card>

              <Card className="tithe-status-card">
                <div className="tsc-header">
                  <div className="tsc-badge amber">Ofrenda ayuno</div>
                  <Badge variant={t.fastPending===0&&t.fastOwed>0?'success':t.fastPending>0?'warning':'default'}>
                    {t.fastPending===0&&t.fastOwed>0?'✓ Pagada':t.fastPending>0?'Pendiente':'—'}
                  </Badge>
                </div>
                <div className="tsc-amount amber">{formatCurrency(t.fastOwed||0)}</div>
                <div className="tsc-basis">{t.fastOfferingPercent||2}% de {formatCurrency(t.computableIncome||0)}</div>
                <div style={{marginTop:12}}>
                  <ProgressBar value={t.fastPaid||0} max={t.fastOwed||1} variant="gold"/>
                </div>
                <div className="tsc-progress-labels">
                  <span style={{color:'var(--accent)'}}>{formatCurrency(t.fastPaid||0)} pagado</span>
                  {t.fastPending > 0 && <span style={{color:'var(--warning)'}}>{formatCurrency(t.fastPending)} pendiente</span>}
                </div>
                <div className="fast-freedom-note">Da según lo que el Señor inspire</div>
              </Card>
            </div>

            {/* Register CTA — always visible */}
            {!showPayForm && (
              <button className="register-payment-cta" onClick={() => setShowPayForm(true)}>
                <span className="rpc-icon">✦</span>
                <div className="rpc-text">
                  <div className="rpc-title">
                    Registrar pago{!isCurrentMonth ? ` — ${getMonthLabel(month)}` : ' al Señor'}
                  </div>
                  <div className="rpc-sub">
                    {t.titheOwed > 0
                      ? `Diezmo ${formatCurrency(t.titheOwed)} + ofrenda en un solo paso`
                      : 'Añadir pago manualmente a este mes'}
                  </div>
                </div>
                <span className="rpc-arrow">→</span>
              </button>
            )}

            {showPayForm && (
              <UnifiedPayForm
                titheData={t}
                month={month}
                onSave={handlePay}
                onCancel={() => setShowPayForm(false)}
              />
            )}

            {/* Payment history this month */}
            {(t.tithePayments || []).length > 0 && (
              <>
                <div className="diezmos-section-label">Pagos registrados</div>
                <Card padding="none">
                  {[...(t.tithePayments || [])].sort((a,b) => new Date(b.date)-new Date(a.date)).map((p, i, arr) => (
                    <div key={p.id} className={`pay-row ${i < arr.length-1 ? 'pay-border' : ''}`}>
                      <div className="pay-row-icon">✦</div>
                      <div className="pay-row-info">
                        <div className="pay-row-note">{p.note || 'Diezmo'}</div>
                        <div className="pay-row-sub-amounts">
                          <span className="prs-item gold">{formatCurrency(p.amount)}</span>
                          <span className="prs-sep">·</span>
                          <span className="prs-date">
                            {p.date ? new Date(p.date).toLocaleDateString('es-ES') : ''}
                          </span>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {p.receipt_data && (
                          <button className="receipt-view-btn"
                            onClick={() => setViewReceipt(p)} title="Ver comprobante">
                            📎
                          </button>
                        )}
                        <div className="pay-row-amount">{formatCurrency(p.amount)}</div>
                      </div>
                    </div>
                  ))}
                </Card>
              </>
            )}

            {/* 6-month history */}
            {history && history.length > 0 && (
              <>
                <div className="diezmos-section-label">Historial — {new Date().getFullYear()}</div>
                <Card padding="none">
                  {history.map((h, i) => {
                    const tPct = h.titheOwed > 0 ? Math.min((h.tithePaid / h.titheOwed) * 100, 100) : 0
                    const fPct = h.fastOwed  > 0 ? Math.min((h.fastPaid  / h.fastOwed)  * 100, 100) : 0
                    return (
                      <div key={h.month}
                        className={`history-row ${i<history.length-1?'history-border':''} ${h.month===month?'history-active':''}`}
                        onClick={() => setMonth(h.month)} style={{cursor:'pointer'}}>
                        <div className="history-month">{getShortMonthLabel(h.month)}</div>
                        <div className="history-bars">
                          <div className="history-mini-bar">
                            <div className="hb-label">D</div>
                            <div className="hb-track">
                              <div className="hb-fill gold" style={{width:`${tPct}%`}}/>
                            </div>
                            <div className="hb-pct" style={{color:tPct>=100?'var(--accent)':'var(--text-tertiary)'}}>
                              {tPct>=100?'✓':h.titheOwed>0?`${tPct.toFixed(0)}%`:'—'}
                            </div>
                          </div>
                          <div className="history-mini-bar">
                            <div className="hb-label">O</div>
                            <div className="hb-track">
                              <div className="hb-fill amber" style={{width:`${fPct}%`}}/>
                            </div>
                            <div className="hb-pct" style={{color:fPct>=100?'var(--accent)':'var(--text-tertiary)'}}>
                              {fPct>=100?'✓':h.fastOwed>0?`${fPct.toFixed(0)}%`:'—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </Card>
              </>
            )}

            <Card className="scripture-card">
              <div className="scripture-text">
                «Traed todos los diezmos al alfolí y haya alimento en mi casa; y probadme ahora en esto, dice Jehová de los ejércitos.»
              </div>
              <div className="scripture-ref">Malaquías 3:10</div>
            </Card>
          </>
        )}
      </div>

      {viewReceipt && <ReceiptModal payment={viewReceipt} onClose={() => setViewReceipt(null)}/>}
    </div>
  )
}
