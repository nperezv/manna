import { useState } from 'react'
import { PARENT_CATEGORIES, SUBCATEGORIES, getCategoryColor } from '../../utils/categories'
import './CategoryPicker.css'

export default function CategoryPicker({ value, onChange, donations = [], customSubs = [] }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedSub = SUBCATEGORIES.find(s => s.id === value)
  const selectedDon = donations.find(d => d.id === value)
  const selectedName = selectedDon?.name || selectedSub?.name || 'Selecciona categoría'
  const selectedColor = selectedDon?.color || getCategoryColor(value)

  const filtered = search.trim().length > 1
    ? SUBCATEGORIES.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : null

  if (!open) {
    return (
      <button type="button" className="cat-picker-trigger" onClick={() => setOpen(true)}>
        <span className="cp-dot" style={{background: selectedColor}}/>
        <span className="cp-name">{selectedName}</span>
        <span className="cp-arrow">›</span>
      </button>
    )
  }

  return (
    <div className="cat-picker-open">
      <input className="cat-picker-search" placeholder="Buscar categoría..."
        value={search} onChange={e => setSearch(e.target.value)} autoFocus />

      <div className="cat-picker-list">
        {/* Donations group if any */}
        {donations.length > 0 && !filtered && (
          <div className="cp-group">
            <div className="cp-group-label">✦ Donaciones — Pilar 1</div>
            {donations.map(d => (
              <button key={d.id} type="button" className={`cp-option ${value === d.id ? 'active' : ''}`}
                onClick={() => { onChange(d.id); setOpen(false); setSearch('') }}>
                <span className="cp-opt-dot" style={{background: d.color}}/>
                {d.name}
                {value === d.id && <span className="cp-check">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Filtered results */}
        {filtered ? (
          filtered.length === 0 ? (
            <div className="cp-empty">Sin resultados</div>
          ) : (
            <div className="cp-group">
              {filtered.map(s => {
                const parent = PARENT_CATEGORIES.find(p => p.id === s.parentId)
                return (
                  <button key={s.id} type="button" className={`cp-option ${value === s.id ? 'active' : ''}`}
                    onClick={() => { onChange(s.id); setOpen(false); setSearch('') }}>
                    <span className="cp-opt-dot" style={{background: s.color}}/>
                    <span className="cp-opt-name">{s.name}</span>
                    <span className="cp-opt-parent">{parent?.name}</span>
                    {value === s.id && <span className="cp-check">✓</span>}
                  </button>
                )
              })}
            </div>
          )
        ) : (
          // Full grouped list
          PARENT_CATEGORIES.filter(p => p.id !== 1 && p.id !== 11).map(parent => {
            const subs = SUBCATEGORIES.filter(s => s.parentId === parent.id)
            const userSubs = customSubs.filter(c => c.parentId === parent.id)
            return (
              <div key={parent.id} className="cp-group">
                <div className="cp-group-label">
                  <span className="cp-group-dot" style={{background: parent.color}}/>
                  {parent.name}
                </div>
                {subs.map(s => (
                  <button key={s.id} type="button"
                    className={`cp-option ${value === s.id ? 'active' : ''}`}
                    onClick={() => { onChange(s.id); setOpen(false); setSearch('') }}>
                    <span className="cp-opt-dot" style={{background: s.color}}/>
                    {s.name}
                    {value === s.id && <span className="cp-check">✓</span>}
                  </button>
                ))}
                {userSubs.map(s => (
                  <button key={s.id} type="button"
                    className={`cp-option cp-option-custom ${value === s.id ? 'active' : ''}`}
                    onClick={() => { onChange(s.id); setOpen(false); setSearch('') }}>
                    <span className="cp-opt-dot" style={{background: s.color}}/>
                    <span className="cp-opt-name">{s.name}</span>
                    <span className="cp-custom-badge">personalizado</span>
                    {value === s.id && <span className="cp-check">✓</span>}
                  </button>
                ))}
              </div>
            )
          })
        )}
      </div>

      <button type="button" className="cp-cancel" onClick={() => { setOpen(false); setSearch('') }}>
        Cancelar
      </button>
    </div>
  )
}
