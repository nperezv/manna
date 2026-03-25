import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [lf, setLf] = useState({ email: '', password: '' })
  const [rf, setRf] = useState({
    familyName: '', name: '', email: '', password: '', confirm: ''
  })

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(lf.email, lf.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (rf.password !== rf.confirm) return setError('Las contraseñas no coinciden')
    if (rf.password.length < 8) return setError('Mínimo 8 caracteres')
    setLoading(true)
    try {
      await register({
        familyName: rf.familyName,
        name: rf.name,
        email: rf.email,
        password: rf.password,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <svg viewBox="0 0 28 28" fill="none">
              <path d="M3 24 L3 6 L14 15 L25 6 L25 24 Z" fill="white"/>
            </svg>
          </div>
          <div className="auth-brand-text">
            <div className="auth-appname">manna</div>
            <div className="auth-tagline">finanzas familiares</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError('') }}>
            Iniciar sesión
          </button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError('') }}>
            Crear cuenta
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label>Email</label>
              <input type="email" placeholder="tu@email.com" required autoFocus
                value={lf.email}
                onChange={e => setLf({ ...lf, email: e.target.value })} />
            </div>
            <div className="auth-field">
              <label>Contraseña</label>
              <input type="password" placeholder="••••••••" required
                value={lf.password}
                onChange={e => setLf({ ...lf, password: e.target.value })} />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <div className="auth-footer">
              <a href="/registro" style={{color:'var(--accent)',fontWeight:600,textDecoration:'none'}}>
                ¿Primera vez? Crear cuenta familiar
              </a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-field">
              <label>Nombre de la familia</label>
              <input type="text" placeholder="Familia García" required autoFocus
                value={rf.familyName}
                onChange={e => setRf({ ...rf, familyName: e.target.value })} />
            </div>
            <div className="auth-field">
              <label>Tu nombre</label>
              <input type="text" placeholder="Juan" required
                value={rf.name}
                onChange={e => setRf({ ...rf, name: e.target.value })} />
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input type="email" placeholder="tu@email.com" required
                value={rf.email}
                onChange={e => setRf({ ...rf, email: e.target.value })} />
            </div>
            <div className="auth-field">
              <label>Contraseña</label>
              <input type="password" placeholder="Mínimo 8 caracteres" required
                value={rf.password}
                onChange={e => setRf({ ...rf, password: e.target.value })} />
            </div>
            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input type="password" placeholder="••••••••" required
                value={rf.confirm}
                onChange={e => setRf({ ...rf, confirm: e.target.value })} />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta familiar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
