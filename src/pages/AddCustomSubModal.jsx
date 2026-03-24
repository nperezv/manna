import { useState } from 'react'
import { Button } from '../ui'
import './Modal.css'

const SUB_COLORS = ['#4a9fd4','#e6ad3c','#8b6cf7','#e05c4e','#2d9b8a','#d4548a','#f0a030','#5aaed4']

export default function AddCustomSubModal({ parentId, parentName, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', color: SUB_COLORS[0], budgeted: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      // Save as a custom subcategory name in localStorage keyed by parentId
      const key = `manna_custom_subs_${parentId}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      const newSub = {
        id: Date.now(),
        name: form.name.trim(),
        color: form.color,
        parentId,
        budgeted: parseFloat(form.budgeted) || 0,
        custom: true,
      }
      localStorage.setItem(key, JSON.stringify([...existing, newSub]))
      onAdded?.(newSub)
      onClose()
    } catch(err) { alert(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Añadir concepto a {parentName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre del concepto</label>
              <input className="form-input" required autoFocus
                placeholder="Ej: Pago libros, Uniforme, Clases extraescolares..."
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="donation-color-picker">
                {SUB_COLORS.map(c => (
                  <button key={c} type="button"
                    className={`donation-color-opt ${form.color === c ? 'active' : ''}`}
                    style={{background: c}}
                    onClick={() => setForm({...form, color: c})}/>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Importe mensual (€) — opcional</label>
              <input className="form-input" type="number" min="0" step="0.01"
                placeholder="0.00 — deja vacío si varía cada mes"
                value={form.budgeted} onChange={e => setForm({...form, budgeted: e.target.value})}/>
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Añadir</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
