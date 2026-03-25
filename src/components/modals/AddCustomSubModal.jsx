import { useState } from 'react'
import { api } from '../../api/client'
import { Button } from '../ui'
import './Modal.css'

const BANK_CHANNELS = [
  { value: 'sepa',          label: 'Domiciliación SEPA' },
  { value: 'bizum',         label: 'Bizum'              },
  { value: 'transfer',      label: 'Transferencia'      },
  { value: 'western_union', label: 'Western Union'      },
  { value: 'cash',          label: 'Efectivo'           },
]

function colorVariant(hex, index) {
  if (!hex) return '#4a9fd4'
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  const factor = 0.7 + (index % 4) * 0.1
  const mix = (c) => Math.min(255, Math.round(c * factor + (255 - 255 * factor) * 0.4))
  const toHex = (c) => c.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

export default function AddCustomSubModal({ parentId, parentName, parentColor, onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    budgeted: '',
    bankChannel: 'transfer',
    bankPattern: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      // Get existing count for color variant index
      const existing = await api.budget.customSubs(parentId)
      const color = colorVariant(parentColor, existing.length)
      const newSub = await api.budget.createCustomSub({
        name:         form.name.trim(),
        color,
        parent_id:    parentId,
        pillar:       1,
        bank_channel: form.bankChannel,
        bank_pattern: form.bankPattern.trim(),
        budgeted:     parseFloat(form.budgeted) || 0,
      })
      onAdded?.(newSub)
      onClose()
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
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
                placeholder="Ej: Pago libros, Uniforme, Garaje..."
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Importe mensual (€) — opcional</label>
              <input className="form-input" type="number" min="0" step="0.01"
                placeholder="0.00 — deja vacío si varía cada mes"
                value={form.budgeted} onChange={e => setForm({...form, budgeted: e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Canal de pago</label>
              <div className="bank-channel-grid">
                {BANK_CHANNELS.map(ch => (
                  <button key={ch.value} type="button"
                    className={`bank-channel-btn ${form.bankChannel === ch.value ? 'active' : ''}`}
                    onClick={() => setForm({...form, bankChannel: ch.value})}>
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {form.bankChannel !== 'cash' && (
              <div className="form-group">
                <label className="form-label">Texto en el extracto bancario — opcional</label>
                <input className="form-input"
                  placeholder="Ej: SECURITAS DIRECT, COLEGIO SAN JOSE..."
                  value={form.bankPattern}
                  onChange={e => setForm({...form, bankPattern: e.target.value.toUpperCase()})}/>
                <div className="form-hint">Para detección automática cuando conectes tu banco</div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Añadir'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
