import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Diezmos from './pages/Diezmos'
import Ingresos from './pages/Ingresos'
import Gastos from './pages/Gastos'
import Presupuesto from './pages/Presupuesto'
import Ahorro from './pages/Ahorro'
import Deudas from './pages/Deudas'
import Graficas from './pages/Graficas'
import Consejero from './pages/Consejero'
import Ajustes from './pages/Ajustes'
import Unirse from './pages/Unirse'
import Perfil from './pages/Perfil'
import Join from './pages/Join'
import Landing from './pages/Landing'
import BankCallback from './pages/BankCallback'

// Loading splash
function LoadingSplash() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 13,
        background: 'var(--gold)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-sans)',
      }}>M</div>
      <div style={{ fontSize: '.875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
        Cargando Manna...
      </div>
    </div>
  )
}

// Protected — must be logged in
function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSplash />
  if (!user) return <Navigate to="/registro" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/diezmos"     element={<Diezmos />} />
        <Route path="/ingresos"    element={<Ingresos />} />
        <Route path="/gastos"      element={<Gastos />} />
        <Route path="/presupuesto" element={<Presupuesto />} />
        <Route path="/ahorro"      element={<Ahorro />} />
        <Route path="/deudas"      element={<Deudas />} />
        <Route path="/graficas"    element={<Graficas />} />
        <Route path="/consejero"   element={<Consejero />} />
        <Route path="/ajustes"     element={<Ajustes />} />
        <Route path="/perfil"     element={<Perfil />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

// Join route — invited users, redirect if already logged in
function JoinRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSplash />
  if (user) return <Navigate to="/" replace />
  return <Join />
}

// Public — redirect to home if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSplash />
  if (user) return <Navigate to="/" replace />
  return children
}

function RootRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSplash />
  if (user) return <Navigate to="/" replace />
  return <Landing />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/bienvenida" element={<Landing />} />
          <Route path="/registro" element={<PublicRoute><Onboarding /></PublicRoute>} />
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/unirse"   element={<Unirse />} />
          <Route path="/unirse"   element={<JoinRoute />} />
          <Route path="/bank/callback" element={<BankCallback />} />
          <Route path="/bienvenida"    element={<Landing />} />
          <Route path="/*"        element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
