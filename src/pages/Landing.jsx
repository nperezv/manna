import { useNavigate } from 'react-router-dom'
import './Landing.css'

const LOGO = (
  <svg viewBox="0 0 28 28" fill="none" style={{width:28,height:28}}>
    <path d="M3 24 L3 6 L14 15 L25 6 L25 24 Z" fill="white"/>
  </svg>
)

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-nav-logo">{LOGO}</div>
          <div>
            <div className="landing-nav-name">manna</div>
            <div className="landing-nav-sub">finanzas familiares</div>
          </div>
        </div>
        <div className="landing-nav-actions">
          <button className="landing-btn-ghost" onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
          <button className="landing-btn-primary" onClick={() => navigate('/registro')}>
            Empezar gratis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">Finanzas con propósito</div>
          <h1 className="landing-hero-title">
            Administra lo que<br/>
            <span className="landing-hero-accent">se te confió</span>
          </h1>
          <p className="landing-hero-desc">
            Presupuesto familiar, diezmos y ahorros en un solo lugar.
            Diseñado para familias que quieren vivir sus finanzas con integridad.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate('/registro')}>
              Crear cuenta familiar
            </button>
            <button className="landing-btn-ghost landing-btn-lg" onClick={() => navigate('/login')}>
              Ya tengo cuenta →
            </button>
          </div>
        </div>

        {/* Floating cards preview */}
        <div className="landing-hero-visual">
          <div className="landing-card landing-card--main">
            <div className="lc-label">Saldo del mes</div>
            <div className="lc-amount accent">1.917,89 €</div>
            <div className="lc-row">
              <span className="lc-up">↑ 2.941,45 €</span>
              <span className="lc-down">↓ 1.023,56 €</span>
            </div>
            <div className="lc-bar">
              <div className="lc-bar-seg spent" style={{width:'35%'}}/>
              <div className="lc-bar-seg budgeted" style={{width:'31%'}}/>
              <div className="lc-bar-seg free" style={{width:'34%'}}/>
            </div>
          </div>
          <div className="landing-card landing-card--tithe">
            <div className="lc-label">Diezmo</div>
            <div className="lc-amount gold">294,15 €</div>
            <div className="lc-badge green">Al día ✓</div>
          </div>
          <div className="landing-card landing-card--budget">
            <div className="lc-label">Alimentación</div>
            <div className="lc-progress">
              <div className="lc-progress-fill" style={{width:'60%'}}/>
            </div>
            <div className="lc-meta">385 € / 650 €</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-feature">
          <div className="lf-icon">✦</div>
          <div className="lf-title">Diezmos y ofrendas</div>
          <div className="lf-desc">Calcula automáticamente el diezmo sobre tus ingresos computables y lleva el historial de pagos.</div>
        </div>
        <div className="landing-feature">
          <div className="lf-icon">▦</div>
          <div className="lf-title">Presupuesto por pilares</div>
          <div className="lf-desc">Organiza tus gastos en los 4 pilares SUD: pagar al Señor, vivir con lo necesario, ahorrar y evitar deudas.</div>
        </div>
        <div className="landing-feature">
          <div className="lf-icon">⟳</div>
          <div className="lf-title">Tiempo real familiar</div>
          <div className="lf-desc">Lo que registra tu cónyuge aparece al instante en tu app. Sin recargas, sin esperas.</div>
        </div>
        <div className="landing-feature">
          <div className="lf-icon">◎</div>
          <div className="lf-title">Metas de ahorro</div>
          <div className="lf-desc">Define objetivos familiares y sigue el progreso mes a mes hacia el fondo de emergencias y más.</div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-logo">{LOGO}</div>
        <h2 className="landing-cta-title">Empieza hoy, es gratis</h2>
        <p className="landing-cta-desc">Crea tu cuenta familiar en menos de 2 minutos e invita a tu cónyuge.</p>
        <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate('/registro')}>
          Crear cuenta familiar
        </button>
      </section>

      <footer className="landing-footer">
        <span>manna · finanzas familiares</span>
      </footer>
    </div>
  )
}
