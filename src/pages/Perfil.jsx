import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { Card, Button, PageHeader } from '../components/ui'
import './Perfil.css'

export default function Perfil() {
  const { user, family } = useAuth()
  const [saved, setSaved]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const [nameForm, setNameForm] = useState({ name: user?.name || '' })
  const [pwForm, setPwForm]     = useState({ current: '', newPw: '', confirm: '' })
  const [phoneForm, setPhoneForm] = useState({ phone: user?.phone || '' })

  const handleSaveName = async () => {
    if (!nameForm.name.trim()) return
    setLoading(true); setSaved(''); setError('')
    try {
      await api.profile.update({ name: nameForm.name.trim() })
      setSaved('name')
      setTimeout(() => setSaved(''), 2000)
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleSavePhone = async () => {
    setLoading(true); setSaved(''); setError('')
    try {
      await api.profile.update({ phone: phoneForm.phone.trim() })
      setSaved('phone')
      setTimeout(() => setSaved(''), 2000)
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    if (pwForm.newPw !== pwForm.confirm) return setError('Las contraseñas no coinciden')
    if (pwForm.newPw.length < 8) return setError('Mínimo 8 caracteres')
    setLoading(true)
    try {
      await api.profile.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
      setSaved('pw')
      setPwForm({ current: '', newPw: '', confirm: '' })
      setTimeout(() => setSaved(''), 2000)
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const initials = user?.name?.charAt(0).toUpperCase() || '?'

  return (
    <div className="perfil-page">
      <PageHeader title="Mi perfil"/>
      <div className="perfil-content">

        {/* Avatar + basic info */}
        <Card>
          <div className="perfil-hero">
            <div className="perfil-avatar-wrap">
              <div className="perfil-avatar">{initials}</div>
              <div className="perfil-avatar-hint">Próximamente: foto de perfil</div>
            </div>
            <div className="perfil-hero-info">
              <div className="perfil-hero-name">{user?.name}</div>
              <div className="perfil-hero-email">{user?.email}</div>
              <div className="perfil-hero-meta">
                <span className="perfil-role-badge">
                  {user?.role === 'admin' ? '⊛ Administrador' : '◎ Miembro'}
                </span>
                <span>·</span>
                <span>Familia {family?.name}</span>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div style={{background:'var(--danger-light)',color:'var(--danger)',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:'.82rem',fontWeight:500}}>
            {error}
          </div>
        )}

        {/* Edit name */}
        <Card>
          <div className="perfil-section-title">Nombre</div>
          <div className="perfil-field-row">
            <input className="perfil-input" value={nameForm.name}
              onChange={e => setNameForm({name: e.target.value})}
              placeholder="Tu nombre"/>
            <Button size="sm" onClick={handleSaveName} disabled={loading}>
              {saved==='name' ? '✓ Guardado' : 'Guardar'}
            </Button>
          </div>
        </Card>

        {/* Phone */}
        <Card>
          <div className="perfil-section-title">Teléfono</div>
          <div className="perfil-section-desc">Para notificaciones futuras y recuperación de cuenta.</div>
          <div className="perfil-field-row">
            <input className="perfil-input" type="tel" value={phoneForm.phone}
              onChange={e => setPhoneForm({phone: e.target.value})}
              placeholder="+34 600 000 000"/>
            <Button size="sm" onClick={handleSavePhone} disabled={loading}>
              {saved==='phone' ? '✓ Guardado' : 'Guardar'}
            </Button>
          </div>
        </Card>

        {/* Email — read only for now */}
        <Card>
          <div className="perfil-section-title">Email</div>
          <div className="perfil-section-desc">El email es tu identificador de acceso. Para cambiarlo contacta con el administrador.</div>
          <div className="perfil-email-display">{user?.email}</div>
        </Card>

        {/* Change password */}
        <Card>
          <div className="perfil-section-title">Contraseña</div>
          <form onSubmit={handleChangePassword} className="perfil-pw-form">
            <input className="perfil-input" type="password" placeholder="Contraseña actual"
              value={pwForm.current} onChange={e => setPwForm({...pwForm, current: e.target.value})} required/>
            <input className="perfil-input" type="password" placeholder="Nueva contraseña (mín. 8 caracteres)"
              value={pwForm.newPw} onChange={e => setPwForm({...pwForm, newPw: e.target.value})} required/>
            <input className="perfil-input" type="password" placeholder="Confirmar nueva contraseña"
              value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required/>
            <Button type="submit" disabled={loading} size="sm">
              {saved==='pw' ? '✓ Contraseña actualizada' : 'Cambiar contraseña'}
            </Button>
          </form>
        </Card>

      </div>
    </div>
  )
}
