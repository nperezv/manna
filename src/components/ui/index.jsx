import './ui.css'

export function Card({ children, className = '', onClick, padding = 'normal' }) {
  return (
    <div
      className={`card card--${padding} ${onClick ? 'card--clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', size = 'md', onClick, type = 'button', disabled, className = '' }) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function Badge({ children, variant = 'default' }) {
  return <span className={`badge badge--${variant}`}>{children}</span>
}

export function ProgressBar({ value, max = 100, variant = 'default', showLabel = false }) {
  const pct = Math.min((value / max) * 100, 100)
  const v = pct > 90 ? 'danger' : pct > 70 ? 'warning' : variant
  return (
    <div className="progress-wrap">
      <div className={`progress-bar progress-bar--${v}`} style={{ width: `${pct}%` }} />
      {showLabel && <span className="progress-label">{pct.toFixed(0)}%</span>}
    </div>
  )
}

export function Stat({ label, value, sub, accent }) {
  return (
    <div className={`stat ${accent ? 'stat--accent' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export function Divider() {
  return <div className="divider" />
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action}
    </div>
  )
}


export { default as MonthNav } from './MonthNav'
