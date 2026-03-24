import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { setAccessToken } from '../api/client'
import './Auth.css'
import './Onboarding.css'

export default function Join() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [step, setStep] = useState('loading') // loading | invalid | form | success
  const [familyName, setFamilyName] = useState('')
  const [invitedEmail, setInvitedEmail] = useState('')
  const [form, setForm] = useState({ name: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStep('invalid'); return }
    // Validate token by trying to get invitation info
    api.invitations.validateToken(token)
      .then(data => {
        setFamilyName(data.familyName)
        setInvitedEmail(data.email)
        setStep('form')
      })
      .catch(() => setStep('invalid'))
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden')
    if (form.password.length < 8) return setError('Mínimo 8 caracteres')

    setLoading(true)
    try {
      const data = await api.invitations.accept({
        token,
        name: form.name.trim(),
        password: form.password,
      })
      setAccessToken(data.accessToken)
      localStorage.setItem('manna_refresh_token', data.refreshToken)
      setStep('success')
      setTimeout(() => navigate('/', { replace: true }), 2000)
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  if (step === 'loading') return (
    <div className="auth-page">
      <div style={{color:'var(--text-tertiary)',fontSize:'.875rem'}}>Verificando invitación...</div>
    </div>
  )

  if (step === 'invalid') return (
    <div className="auth-page">
      <div className="auth-card" style={{textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:12}}>⚠️</div>
        <h2 style={{margin:'0 0 8px',color:'var(--text-primary)'}}>Invitación inválida</h2>
        <p style={{color:'var(--text-secondary)',fontSize:'.875rem',margin:'0 0 20px'}}>
          Este enlace de invitación no es válido o ha expirado.
        </p>
        <a href="/login" style={{color:'var(--accent)',fontWeight:600}}>Ir al inicio de sesión</a>
      </div>
    </div>
  )

  if (step === 'success') return (
    <div className="auth-page">
      <div className="auth-card" style={{textAlign:'center'}}>
        <div style={{fontSize:'2.5rem',marginBottom:12}}>✦</div>
        <h2 style={{margin:'0 0 8px',color:'var(--text-primary)'}}>¡Bienvenido a la familia {familyName}!</h2>
        <p style={{color:'var(--text-secondary)',fontSize:'.875rem'}}>Entrando a Manna...</p>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">M</div>
          <div className="auth-brand-text">
            <div className="auth-appname">manna</div>
            <div className="auth-tagline">Administra lo que se te confió</div>
          </div>
        </div>

        <div style={{
          background:'var(--gold-light)', borderRadius:'var(--radius-md)',
          padding:'12px 16px', marginBottom:20,
        }}>
          <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--gold-text)'}}>
            ✦ Invitación a Familia {familyName}
          </div>
          <div style={{fontSize:'.75rem',color:'var(--gold-text)',marginTop:2,opacity:.8}}>
            {invitedEmail}
          </div>
        </div>

        <div style={{fontSize:'.875rem',color:'var(--text-secondary)',marginBottom:16}}>
          Completa tu perfil para unirte a la familia.
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Tu nombre</label>
            <input type="text" placeholder="Nombre que verá tu familia" required autoFocus
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="auth-field">
            <label>Contraseña</label>
            <input type="password" placeholder="Mínimo 8 caracteres" required
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <div className="auth-field">
            <label>Confirmar contraseña</label>
            <input type="password" placeholder="••••••••" required
              value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Uniéndome...' : `Unirme a Familia ${familyName}`}
          </button>
        </form>
      </div>
    </div>
  )
}
