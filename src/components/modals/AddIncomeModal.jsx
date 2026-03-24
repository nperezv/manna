import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'
import { Button } from '../ui'
import './Modal.css'

export const INCOME_CATEGORIES = [
  { id: 'salary',    name: 'Salario / nómina'      },
  { id: 'freelance', name: 'Trabajo autónomo'       },
  { id: 'rental',    name: 'Alquiler cobrado'       },
  { id: 'benefit',   name: 'Prestación / subsidio'  },
  { id: 'transfer',  name: 'Transferencia recibida' },
  { id: 'refund',    name: 'Devolución / reembolso' },
  { id: 'other',     name: 'Otro ingreso'           },
]

export default function AddIncomeModal({ onClose, month }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    source: '', category: 'salary', amount: '',
    computable: true, date: (() => { if (month) { const [y,m] = month.split('-'); return `${y}-${m}-01`; } return new Date().toISOString().split('T')[0]; })(),
    member_name: user?.name || '',
  })

  const amount = parseFloat(form.amount) || 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.source) return
    setLoading(true)
    try {
      await api.incomes.create({
        source: form.source,
        category: form.category,
        amount,
        computable: form.computable,
        date: form.date,
        member_name: form.member_name,
      })
      onClose()
    } catch (err) {
      alert(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Añadir ingreso</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Tipo de ingreso</label>
              <div className="income-cat-grid">
                {INCOME_CATEGORIES.map(cat => (
                  <button key={cat.id} type="button"
                    className={`income-cat-btn ${form.category===cat.id?'active':''}`}
                    onClick={() => setForm({...form, category: cat.id,
                      computable: ['transfer','refund'].includes(cat.id) ? false : form.computable
                    })}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción / origen</label>
              <input className="form-input" placeholder="Ej: Empresa García S.L." required autoFocus
                value={form.source} onChange={e => setForm({...form, source: e.target.value})} />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Importe (€)</label>
                <input className="form-input form-input--large" type="number" min="0" step="0.01"
                  placeholder="0.00" required value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})} />
              </div>
            </div>
            <div className="computable-toggle">
              <div className="ct-left">
                <div className="ct-title">¿Computa para el diezmo?</div>
                <div className="ct-desc">
                  {form.computable ? 'Sí — se incluye en el cálculo del diezmo' : 'No — no afecta al diezmo'}
                </div>
              </div>
              <button type="button" className={`ct-switch ${form.computable?'on':'off'}`}
                onClick={() => setForm({...form, computable: !form.computable})}>
                <span className="ct-thumb"/>
              </button>
            </div>
            {amount > 0 && form.computable && (
              <div className="tithe-preview">
                <div className="tithe-preview-title">Pagos al Señor estimados</div>
                <div className="tithe-preview-row">
                  <span>Diezmo (10%)</span>
                  <span className="tithe-preview-amount">{(amount * 0.10).toFixed(2)} €</span>
                </div>
                <div className="tithe-preview-row">
                  <span>Ofrenda (2%)</span>
                  <span className="tithe-preview-amount">{(amount * 0.02).toFixed(2)} €</span>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar ingreso'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
