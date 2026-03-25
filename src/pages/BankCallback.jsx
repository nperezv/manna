import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function BankCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')

  useEffect(() => {
    const connected = params.get('bank_connected')
    const error     = params.get('bank_error')

    if (connected) {
      setStatus('success')
      setTimeout(() => navigate('/ajustes?tab=banco'), 2000)
    } else if (error) {
      setStatus('error')
      setTimeout(() => navigate('/ajustes?tab=banco'), 3000)
    } else {
      // Redirect from bank with code — server handles it, this shouldn't render
      setStatus('processing')
    }
  }, [params, navigate])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 16,
      background: 'var(--bg-page)', color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)'
    }}>
      {status === 'processing' && (
        <>
          <div style={{fontSize: '2rem'}}>⟳</div>
          <div style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>Conectando con tu banco...</div>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{fontSize: '2rem', color: 'var(--accent)'}}>✓</div>
          <div style={{fontSize: '1rem', fontWeight: 600}}>¡Banco conectado!</div>
          <div style={{fontSize: '.875rem', color: 'var(--text-secondary)'}}>Redirigiendo a Ajustes...</div>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{fontSize: '2rem', color: 'var(--danger)'}}>✕</div>
          <div style={{fontSize: '1rem', fontWeight: 600}}>Error al conectar</div>
          <div style={{fontSize: '.875rem', color: 'var(--text-secondary)'}}>
            {params.get('bank_error') === 'no_connection' ? 'Sesión expirada, inténtalo de nuevo' : 'Algo salió mal'}
          </div>
        </>
      )}
    </div>
  )
}
