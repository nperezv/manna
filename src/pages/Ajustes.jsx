import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { api } from '../api/client'
import { Card, Button, Badge, PageHeader } from '../components/ui'
import { PARENT_CATEGORIES, SUBCATEGORIES } from '../utils/categories'
import './Ajustes.css'

function Section({ title, children }) {
  return (
    <>
      <div className="ajustes-section-title">{title}</div>
      {children}
    </>
  )
}

export default function Ajustes() {
  const { user, family, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [familyData, setFamilyData]   = useState(null)
  const [members, setMembers]         = useState([])
  const [invitations, setInvitations] = useState([])
  const [catRules, setCatRules]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('manna_cat_rules') || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved]     = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName]   = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteMsg, setInviteMsg]     = useState('')
  const [newRule, setNewRule]         = useState({ pattern: '', categoryId: 301 })

  const [form, setForm] = useState({
    name: '',
    tithe_percent: 10,
    fast_offering_percent: 2,
    fast_offering_fixed: '',
    meal_cost: parseFloat(localStorage.getItem('manna_meal_cost') || '8'),
    church_bank_reference: '',
    church_bank_name: 'IGLESIA JESUCRISTO',
    month_start_day: 1,
  })

  useEffect(() => {
    Promise.all([
      api.family.get(),
      api.invitations.list().catch(() => []),
    ]).then(([fam, invs]) => {
      setFamilyData(fam)
      setMembers(fam.members || [])
      setInvitations(invs)
      setForm(f => ({
        ...f,
        name:                  fam.name || '',
        tithe_percent:         fam.tithe_percent || 10,
        fast_offering_percent: fam.fast_offering_percent || 2,
        fast_offering_fixed:   fam.fast_offering_fixed || '',
        church_bank_reference: fam.church_bank_reference || '',
        church_bank_name:      fam.church_bank_name || 'IGLESIA JESUCRISTO',
        month_start_day:       fam.month_start_day || 1,
      }))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    await api.family.update({
      name:                  form.name,
      tithe_percent:         parseFloat(form.tithe_percent) || 10,
      fast_offering_percent: parseFloat(form.fast_offering_percent) || 2,
      fast_offering_fixed:   form.fast_offering_fixed ? parseFloat(form.fast_offering_fixed) : null,
      church_bank_reference: form.church_bank_reference.trim().toUpperCase(),
      church_bank_name:      form.church_bank_name.trim(),
      month_start_day:       parseInt(form.month_start_day) || 1,
    })
    localStorage.setItem('manna_meal_cost', form.meal_cost)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true); setInviteMsg('')
    try {
      await api.invitations.invite({ email: inviteEmail, name: inviteName })
      setInviteMsg(`✓ Invitación enviada a ${inviteEmail}`)
      setInviteEmail(''); setInviteName('')
      const invs = await api.invitations.list(); setInvitations(invs)
    } catch (err) { setInviteMsg(`✗ ${err.message}`) }
    finally { setInviting(false) }
  }

  const handleResend = async (inv) => {
    setInviteMsg('')
    try {
      await api.invitations.cancel(inv.id)
      await api.invitations.invite({ email: inv.email, name: inv.name })
      setInviteMsg(`✓ Reenvío enviado a ${inv.email}`)
      const invs = await api.invitations.list(); setInvitations(invs)
    } catch (err) { setInviteMsg(`✗ ${err.message}`) }
  }

  const handleCancelInvite = async (id) => {
    await api.invitations.cancel(id)
    setInvitations(prev => prev.filter(i => i.id !== id))
  }

  const addCatRule = () => {
    if (!newRule.pattern.trim()) return
    const rules = [...catRules, { id: Date.now(), ...newRule, pattern: newRule.pattern.trim().toLowerCase() }]
    setCatRules(rules)
    localStorage.setItem('manna_cat_rules', JSON.stringify(rules))
    setNewRule({ pattern: '', categoryId: 301 })
  }

  const removeCatRule = (id) => {
    const rules = catRules.filter(r => r.id !== id)
    setCatRules(rules)
    localStorage.setItem('manna_cat_rules', JSON.stringify(rules))
  }

  const isAdmin = user?.role === 'admin'

  if (loading) return <div className="ajustes-page"><div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Cargando...</div></div>

  return (
    <div className="ajustes-page">
      <PageHeader title="Ajustes"/>
      <div className="ajustes-content">

        {/* ── CONFIGURACIÓN DEL SISTEMA (admin) ── */}
        {isAdmin && (
          <>
            <Section title="Configuración del sistema">
              <Card>
                <div className="ajustes-subsection">Familia</div>
                <div className="ajustes-fields">
                  <div className="ajustes-field">
                    <label className="ajustes-label">Apellido familiar</label>
                    <input className="ajustes-input" placeholder="Pérez Terry"
                      value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
                  </div>
                  <div className="ajustes-field">
                    <label className="ajustes-label">Día de inicio del mes financiero</label>
                    <input className="ajustes-input ajustes-input--sm" type="number" min="1" max="28"
                      value={form.month_start_day} onChange={e => setForm({...form, month_start_day: e.target.value})}/>
                    <div className="ajustes-hint">Día en que recibes la nómina. Por defecto 1 (mes calendario).</div>
                  </div>
                </div>

                <div className="ajustes-subsection">Diezmo y ofrendas</div>
                <div className="ajustes-fields">
                  <div className="ajustes-field-row">
                    <div className="ajustes-field">
                      <label className="ajustes-label">% Diezmo (fijo)</label>
                      <input className="ajustes-input ajustes-input--sm" type="number" disabled value="10"
                        style={{opacity:.5,cursor:'not-allowed'}}/>
                      <div className="ajustes-hint">El diezmo es siempre el 10%</div>
                    </div>
                    <div className="ajustes-field">
                      <label className="ajustes-label">% Ofrenda ayuno sugerido</label>
                      <input className="ajustes-input ajustes-input--sm" type="number" min="0" step="0.5"
                        value={form.fast_offering_percent} onChange={e => setForm({...form, fast_offering_percent: e.target.value})}/>
                    </div>
                  </div>
                  <div className="ajustes-field-row">
                    <div className="ajustes-field">
                      <label className="ajustes-label">Importe fijo ofrenda (€) — opcional</label>
                      <input className="ajustes-input ajustes-input--sm" type="number" min="0" step="0.01"
                        placeholder="Dejar vacío para usar %"
                        value={form.fast_offering_fixed} onChange={e => setForm({...form, fast_offering_fixed: e.target.value})}/>
                    </div>
                    <div className="ajustes-field">
                      <label className="ajustes-label">Coste por comida (€)</label>
                      <input className="ajustes-input ajustes-input--sm" type="number" min="0" step="0.5"
                        value={form.meal_cost} onChange={e => setForm({...form, meal_cost: e.target.value})}/>
                      <div className="ajustes-hint">Para calcular ofrenda (2 comidas)</div>
                    </div>
                  </div>
                </div>

                <div className="ajustes-subsection">Banco Iglesia</div>
                <div className="ajustes-fields">
                  <div className="ajustes-field">
                    <label className="ajustes-label">Referencia SEPA</label>
                    <input className="ajustes-input ajustes-input--mono" placeholder="ES15866R2800159B"
                      value={form.church_bank_reference} onChange={e => setForm({...form, church_bank_reference: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="ajustes-field">
                    <label className="ajustes-label">Nombre en extracto</label>
                    <input className="ajustes-input ajustes-input--mono" placeholder="IGLESIA JESUCRISTO"
                      value={form.church_bank_name} onChange={e => setForm({...form, church_bank_name: e.target.value.toUpperCase()})}/>
                  </div>
                </div>

                <div className="ajustes-save-row">
                  <Button onClick={handleSave}>{saved ? '✓ Guardado' : 'Guardar cambios'}</Button>
                </div>
              </Card>
            </Section>

            {/* Members */}
            <Section title="Miembros y accesos">
              <Card>
                {members.length > 0 ? members.map((m, i) => (
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<members.length-1?'.5px solid var(--border)':'none'}}>
                    <div style={{width:34,height:34,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'.9rem',flexShrink:0}}>
                      {m.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,color:'var(--text-primary)',fontSize:'.875rem'}}>{m.name}</div>
                      <div style={{fontSize:'.72rem',color:'var(--text-tertiary)'}}>{m.email}</div>
                    </div>
                    <Badge variant={m.role==='admin'?'gold':'default'}>{m.role==='admin'?'Admin':'Miembro'}</Badge>
                  </div>
                )) : (
                  <div style={{color:'var(--text-tertiary)',fontSize:'.875rem',padding:'8px 0'}}>Solo tú por ahora.</div>
                )}

                <div style={{marginTop:16,paddingTop:16,borderTop:'.5px solid var(--border)'}}>
                  <div style={{fontSize:'.78rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:8}}>Invitar miembro</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <input className="ajustes-input" style={{flex:1,minWidth:120}} placeholder="Nombre (opcional)"
                      value={inviteName} onChange={e => setInviteName(e.target.value)}/>
                    <input className="ajustes-input" style={{flex:2,minWidth:180}} type="email" placeholder="email@ejemplo.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && handleInvite()}/>
                    <Button size="sm" onClick={handleInvite} disabled={inviting||!inviteEmail}>
                      {inviting ? 'Enviando...' : 'Invitar'}
                    </Button>
                  </div>
                  {inviteMsg && (
                    <div style={{fontSize:'.78rem',marginTop:6,color:inviteMsg.startsWith('✓')?'var(--accent)':'var(--danger)'}}>
                      {inviteMsg}
                    </div>
                  )}
                </div>
              </Card>
            </Section>

            {/* Pending invitations */}
            {invitations.filter(i => i.status==='pending').length > 0 && (
              <Section title="Invitaciones pendientes">
                <Card padding="none">
                  {invitations.filter(i => i.status==='pending').map((inv, i, arr) => (
                    <div key={inv.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 18px',borderBottom:i<arr.length-1?'.5px solid var(--border)':'none'}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'.875rem',fontWeight:500,color:'var(--text-primary)'}}>
                          {inv.name ? `${inv.name} — ` : ''}{inv.email}
                        </div>
                        <div style={{fontSize:'.72rem',color:'var(--text-tertiary)'}}>
                          Caduca {new Date(inv.expires_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <Badge variant="warning">Pendiente</Badge>
                      <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:'.75rem',padding:'4px 8px'}}
                        onClick={() => handleResend(inv)}>Reenviar</button>
                      <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'.75rem',padding:'4px 8px'}}
                        onClick={() => handleCancelInvite(inv.id)}>Cancelar</button>
                    </div>
                  ))}
                </Card>
              </Section>
            )}

            {/* Categorization rules */}
            <Section title="Reglas de categorización">
              <Card>
                <div style={{fontSize:'.82rem',color:'var(--text-secondary)',marginBottom:12,lineHeight:1.5}}>
                  Cuando un gasto contenga este texto, se asignará automáticamente a la categoría elegida.
                </div>
                {catRules.length > 0 && (
                  <div style={{marginBottom:12,display:'flex',flexDirection:'column',gap:6}}>
                    {catRules.map(rule => (
                      <div key={rule.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--bg-subtle)',borderRadius:'var(--radius-sm)'}}>
                        <div style={{fontFamily:'monospace',fontSize:'.8rem',fontWeight:600,color:'var(--text-primary)',flex:1}}>
                          "{rule.pattern}"
                        </div>
                        <div style={{fontSize:'.75rem',color:'var(--text-secondary)'}}>→</div>
                        <div style={{fontSize:'.75rem',color:'var(--text-secondary)'}}>
                          {SUBCATEGORIES.find(s => s.id===rule.categoryId)?.name ||
                           PARENT_CATEGORIES.find(c => c.id===rule.categoryId)?.name || rule.categoryId}
                        </div>
                        <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'.75rem'}}
                          onClick={() => removeCatRule(rule.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <input className="ajustes-input" style={{flex:2,minWidth:140}} placeholder='Texto (ej: "mercadona")'
                    value={newRule.pattern} onChange={e => setNewRule({...newRule, pattern: e.target.value})}
                    onKeyDown={e => e.key==='Enter' && addCatRule()}/>
                  <select className="ajustes-input" style={{flex:1,minWidth:140}} value={newRule.categoryId}
                    onChange={e => setNewRule({...newRule, categoryId: parseInt(e.target.value)})}>
                    {PARENT_CATEGORIES.map(p => (
                      <optgroup key={p.id} label={p.name}>
                        {SUBCATEGORIES.filter(s => s.parentId===p.id).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <Button size="sm" onClick={addCatRule} disabled={!newRule.pattern.trim()}>Añadir</Button>
                </div>
              </Card>
            </Section>
          </>
        )}

        {/* ── PREFERENCIAS DE USUARIO ── */}
        <Section title="Preferencias">
          <Card>
            {/* Theme */}
            <div className="ajustes-setting-row" style={{marginBottom:12,paddingBottom:12,borderBottom:'.5px solid var(--border)'}}>
              <div>
                <div className="ajustes-setting-label">Tema</div>
                <div className="ajustes-setting-desc">{theme === 'light' ? 'Interfaz clara' : 'Interfaz oscura'}</div>
              </div>
              <button className="theme-switch-btn" onClick={toggleTheme}>
                <span className="tsb-icon">{theme === 'light' ? '◑' : '◐'}</span>
                {theme === 'light' ? 'Cambiar a oscuro' : 'Cambiar a claro'}
              </button>
            </div>

            {/* User info */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'1.1rem',flexShrink:0}}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'var(--text-primary)'}}>{user?.name}</div>
                <div style={{fontSize:'.78rem',color:'var(--text-tertiary)'}}>{user?.email}</div>
                <Badge variant={user?.role==='admin'?'gold':'default'} style={{marginTop:4}}>
                  {user?.role==='admin'?'Administrador':'Miembro'}
                </Badge>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── ZONA DE PELIGRO ── */}
        {isAdmin && (
          <Section title="Zona de peligro">
            <Card>
              <div className="ajustes-reset-row">
                <button className="ajustes-reset-btn" onClick={() => {
                  if (window.confirm('¿Borrar todos los datos de la familia? Esta acción no se puede deshacer.')) {
                    alert('Función disponible próximamente')
                  }
                }}>Borrar todos los datos de la familia</button>
                <div className="ajustes-reset-desc">Elimina todos los ingresos, gastos, presupuestos y datos financieros</div>
              </div>
            </Card>
          </Section>
        )}

      </div>
    </div>
  )
}
