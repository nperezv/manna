import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, setAccessToken } from '../api/client'
import './Auth.css'

export default function Unirse() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const token = params.get('token')

  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [form, setForm] = useState({ name: '', password: '', confirm: '' })

  // Verify token on mount
  useEffect(() => {
    if (!token) { setError('Enlace de invitación no válido.'); setLoading(false); return }
    api.invitations.check(token)
      .then(data => {
        setInvitation(data)
        setForm(f => ({ ...f, name: data.name || '' }))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden')
    if (form.password.length < 8) return setError('Mínimo 8 caracteres')
    setSaving(true)
    try {
      const data = await api.invitations.accept({ token, name: form.name, password: form.password })
      setAccessToken(data.accessToken)
      localStorage.setItem('manna_refresh_token', data.refreshToken)
      window.location.href = '/'
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="auth-page">
      <div style={{color: 'var(--text-tertiary)', fontSize: '.875rem'}}>Verificando invitación...</div>
    </div>
  )

  if (error && !invitation) return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">M</div>
          <div className="auth-brand-text">
            <div className="auth-appname">manna</div>
          </div>
        </div>
        <div className="auth-error" style={{marginTop: 0}}>{error}</div>
        <div style={{textAlign:'center', marginTop: 16}}>
          <a href="/login" style={{color:'var(--accent)', fontSize:'.875rem', fontWeight:600}}>
            Ir al inicio de sesión
          </a>
        </div>
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

        {/* Invitation info */}
        <div style={{
          background: 'var(--gold-light)', border: '1px solid var(--gold)',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{fontSize:'.75rem', fontWeight:700, color:'var(--gold-text)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4}}>
            Invitación pendiente
          </div>
          <div style={{fontSize:'.95rem', fontWeight:700, color:'var(--text-primary)'}}>
            Familia {invitation?.familyName}
          </div>
          <div style={{fontSize:'.78rem', color:'var(--text-secondary)', marginTop:2}}>
            {invitation?.email}
          </div>
        </div>

        <p style={{fontSize:'.875rem', color:'var(--text-secondary)', marginBottom:20, lineHeight:1.6}}>
          Has sido invitado a unirte a la Familia {invitation?.familyName} en Manna. Crea tu contraseña para entrar.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Tu nombre</label>
            <input type="text" placeholder="Tu nombre" required autoFocus
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
          <button type="submit" className="auth-submit" disabled={saving}>
            {saving ? 'Entrando...' : 'Unirme a la familia'}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta? <a href="/login">Iniciar sesión</a>
        </div>
      </div>
    </div>
  )
}
