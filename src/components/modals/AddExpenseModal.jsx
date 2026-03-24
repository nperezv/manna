import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'
import { Button } from '../ui'
import { PARENT_CATEGORIES, SUBCATEGORIES, getCategoryColor, getCategoryName } from '../../utils/categories'
import { suggestCategory } from '../../utils/autoCategorizacion'
import CategoryPicker from './CategoryPicker'
import './Modal.css'

export default function AddExpenseModal({ onClose, month }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [donations, setDonations] = useState([])
  const [form, setForm] = useState({
    description: '', amount: '', category_id: 301,
    date: (() => { if (month) { const [y,m] = month.split('-'); return `${y}-${m}-01`; } return new Date().toISOString().split('T')[0]; })(),
    member_name: user?.name || '',
  })
  const [suggestion, setSuggestion] = useState(null)
  const [autoApplied, setAutoApplied] = useState(false)

  useEffect(() => {
    api.donations.list().then(setDonations).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.description.length > 2) {
      const s = suggestCategory(form.description, [])
      if (s.confidence === 'high' && !autoApplied) {
        setForm(f => ({...f, category_id: s.categoryId}))
        setSuggestion({...s, applied: true})
        setAutoApplied(true)
      } else if (s.confidence === 'medium' && s.categoryId !== form.category_id) {
        setSuggestion(s)
      } else if (s.confidence === 'low') {
        setSuggestion(null)
      }
    } else {
      setSuggestion(null)
      setAutoApplied(false)
    }
  }, [form.description])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.description) return
    setLoading(true)
    try {
      await api.expenses.create({
        description: form.description,
        amount: parseFloat(form.amount),
        category_id: form.category_id,
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
          <div className="modal-title">Añadir gasto</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" placeholder="Ej: Mercadona, Netflix, Iberdrola..."
                value={form.description} required autoFocus
                onChange={e => { setForm({...form, description: e.target.value}); setAutoApplied(false) }} />
              {suggestion?.applied && (
                <div className="modal-auto-applied">
                  ✓ {getCategoryName(form.category_id)} — asignado automáticamente
                </div>
              )}
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
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <CategoryPicker
                value={form.category_id}
                onChange={(id) => { setForm({...form, category_id: id}); setSuggestion(null) }}
                donations={donations}
                customSubs={[]}
              />
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar gasto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
