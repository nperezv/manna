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

// Gold/amber variants for Pilar 1 donations
const DONATION_BASE = '#e6ad3c'
function donationColor(index) {
  const variants = ['#e6ad3c','#f0c060','#c98e20','#f5d080','#b07818','#dba030','#e8b850','#c49030']
  return variants[index % variants.length]
}



export default function AddDonationModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    budgeted: '',
    bankChannel: 'bizum',
    bankPattern: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const existing = await api.donations.list()
      const color = donationColor(existing.length)

      await api.donations.create({
        name: form.name.trim(),
        color,
        bank_channel: form.bankChannel,
        bank_pattern: form.bankPattern.trim(),
        budgeted: parseFloat(form.budgeted) || 0,
      })
      onAdded?.()
      onClose()
    } catch(err) { alert(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Nueva donación — Pilar 1</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre de la donación</label>
              <input className="form-input" required autoFocus
                placeholder="Ej: Misiones, Banco de alimentos, Ayuda familiar..."
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
                  placeholder="Ej: BIZUM MISIONES, ES76 0182..."
                  value={form.bankPattern}
                  onChange={e => setForm({...form, bankPattern: e.target.value.toUpperCase()})}/>
                <div className="form-hint">Para detección automática cuando conectes tu banco</div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Añadir'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
