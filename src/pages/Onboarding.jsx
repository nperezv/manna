import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import './Onboarding.css'

const STEPS = [
  { id: 'welcome',  title: 'Bienvenido a Manna' },
  { id: 'family',   title: 'Tu familia' },
  { id: 'account',  title: 'Tu cuenta' },
  { id: 'password', title: 'Contraseña' },
  { id: 'invite',   title: '¿Quién más usará Manna?' },
  { id: 'ready',    title: '¡Todo listo!' },
]

export default function Onboarding() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    familyName: '', name: '', email: '', password: '', confirm: '',
  })
  const [invites, setInvites] = useState([{ name: '', email: '' }])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const canNext = () => {
    if (step === 1) return form.familyName.trim().length >= 2
    if (step === 2) return form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email)
    if (step === 3) return form.password.length >= 8 && form.password === form.confirm
    return true
  }

  const addInviteRow = () => {
    if (invites.length < 4) setInvites(p => [...p, { name: '', email: '' }])
  }

  const updateInvite = (i, field, val) => {
    setInvites(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const removeInviteRow = (i) => {
    setInvites(p => p.filter((_, idx) => idx !== i))
  }

  const handleFinish = async () => {
    setError(''); setLoading(true)
    try {
      // 1. Register + login in one step via AuthContext
      await register({
        familyName: form.familyName.trim(),
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
      })

      // 2. Send invitations — wait for them and log errors
      const validInvites = invites.filter(i => i.email && /\S+@\S+\.\S+/.test(i.email))
      for (const inv of validInvites) {
        try {
          await api.invitations.invite({ email: inv.email, name: inv.name })
        } catch(invErr) {
          console.error('Invitation failed for', inv.email, invErr.message)
          // Don't block registration — invitation can be resent from Ajustes
        }
      }

      // 3. Navigate
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      if (err.message.toLowerCase().includes('email') || err.message.includes('cuenta')) {
        setStep(2)
      } else {
        setStep(5) // stay on confirm step to show error
      }
    } finally { setLoading(false) }
  }

  const next = () => {
    setError('')
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFinish()
  }

  const prev = () => { setError(''); if (step > 0) setStep(s => s - 1) }

  return (
    <div className="onboarding">
      <div className="ob-dots">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`ob-dot ${i===step?'active':i<step?'done':''}`}/>
        ))}
      </div>

      <div className="ob-card">
        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="ob-step">
            <div className="ob-logo">
              <svg viewBox="0 0 28 28" fill="none" style={{width:26,height:26,display:'block'}}>
                <path d="M3 24 L3 6 L14 15 L25 6 L25 24 Z" fill="white"/>
              </svg>
            </div>
            <h1 className="ob-title">Bienvenido a<br/><em>Manna</em></h1>
            <p className="ob-desc">Tu app de finanzas familiares basada en los principios del bienestar personal y familiar de La Iglesia de Jesucristo de los Santos de los Últimos Días.</p>
            <div className="ob-pillars">
              {['Pagar al Señor primero','Vivir dentro de tus posibilidades','Ahorrar para el futuro','Evitar deudas'].map((p,i) => (
                <div key={i} className="ob-pillar">
                  <span className="ob-pillar-n">{i+1}</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Family name */}
        {step === 1 && (
          <div className="ob-step">
            <div className="ob-step-icon">🏠</div>
            <h2 className="ob-step-title">¿Cuál es vuestro apellido?</h2>
            <p className="ob-step-desc">Aparecerá como "Familia García" en la app. Escribe solo el apellido.</p>
            <input className="ob-input" placeholder="García, Pérez Terry, Martínez..."
              value={form.familyName} autoFocus
              onChange={e => update('familyName', e.target.value)}
              onKeyDown={e => e.key==='Enter' && canNext() && next()} />
          </div>
        )}

        {/* Step 2 — Account */}
        {step === 2 && (
          <div className="ob-step">
            <div className="ob-step-icon">👤</div>
            <h2 className="ob-step-title">Tu cuenta personal</h2>
            <p className="ob-step-desc">Serás el administrador de la Familia {form.familyName}.</p>
            <div className="ob-fields">
              <input className="ob-input" placeholder="Tu nombre" autoFocus
                value={form.name} onChange={e => update('name', e.target.value)} />
              <input className="ob-input" type="email" placeholder="tu@email.com"
                value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3 — Password */}
        {step === 3 && (
          <div className="ob-step">
            <div className="ob-step-icon">🔒</div>
            <h2 className="ob-step-title">Elige una contraseña</h2>
            <p className="ob-step-desc">Mínimo 8 caracteres. La usarás desde cualquier dispositivo.</p>
            <div className="ob-fields">
              <input className="ob-input" type="password" placeholder="Contraseña (mín. 8 caracteres)" autoFocus
                value={form.password} onChange={e => update('password', e.target.value)} />
              <input className="ob-input" type="password" placeholder="Confirmar contraseña"
                value={form.confirm} onChange={e => update('confirm', e.target.value)}
                onKeyDown={e => e.key==='Enter' && canNext() && next()} />
              {form.confirm.length > 0 && form.password !== form.confirm && (
                <div className="ob-field-error">Las contraseñas no coinciden</div>
              )}
            </div>
          </div>
        )}

        {/* Step 4 — Invite members */}
        {step === 4 && (
          <div className="ob-step ob-step--left">
            <div className="ob-step-icon">👥</div>
            <h2 className="ob-step-title">¿Quién más usará Manna?</h2>
            <p className="ob-step-desc">Opcional — añade el email de tu pareja u otros miembros. Les enviaremos una invitación.</p>
            <div className="ob-fields">
              {invites.map((inv, i) => (
                <div key={i} className="ob-invite-row">
                  <input className="ob-input ob-input--sm" placeholder="Nombre (opcional)"
                    value={inv.name} onChange={e => updateInvite(i, 'name', e.target.value)} />
                  <input className="ob-input ob-input--sm" type="email" placeholder="email@ejemplo.com"
                    value={inv.email} onChange={e => updateInvite(i, 'email', e.target.value)} />
                  {invites.length > 1 && (
                    <button type="button" className="ob-invite-remove" onClick={() => removeInviteRow(i)}>✕</button>
                  )}
                </div>
              ))}
              {invites.length < 4 && (
                <button type="button" className="ob-add-invite" onClick={addInviteRow}>
                  + Añadir otro miembro
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 5 — Ready */}
        {step === 5 && (
          <div className="ob-step">
            <div className="ob-step-icon">✦</div>
            <h2 className="ob-step-title">¡Todo listo, {form.name}!</h2>
            <p className="ob-step-desc">Vamos a crear la cuenta de <strong>Familia {form.familyName}</strong>.</p>
            <div className="ob-summary">
              <div className="ob-summary-row"><span>Familia</span><strong>Familia {form.familyName}</strong></div>
              <div className="ob-summary-row"><span>Administrador</span><strong>{form.name}</strong></div>
              <div className="ob-summary-row"><span>Email</span><strong>{form.email}</strong></div>
              {invites.filter(i => i.email).length > 0 && (
                <div className="ob-summary-row">
                  <span>Invitaciones</span>
                  <strong>{invites.filter(i => i.email).length} miembro{invites.filter(i => i.email).length > 1 ? 's' : ''}</strong>
                </div>
              )}
            </div>
            {error && <div className="ob-error">{error}</div>}
          </div>
        )}

        {/* Navigation */}
        <div className="ob-nav">
          {step > 0 && (
            <button className="ob-btn-back" onClick={prev} disabled={loading}>← Atrás</button>
          )}
          <button className="ob-btn-next" onClick={next} disabled={!canNext() || loading}>
            {loading ? 'Creando cuenta...' : step === STEPS.length - 1 ? 'Crear cuenta' : step === 4 ? (invites.some(i => i.email) ? 'Siguiente →' : 'Saltar →') : 'Siguiente →'}
          </button>
        </div>

        {step === 0 && (
          <div className="ob-login-link">
            ¿Ya tienes cuenta? <a href="/login">Iniciar sesión</a>
          </div>
        )}
      </div>
    </div>
  )
}
