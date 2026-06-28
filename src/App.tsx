import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Exercise from './pages/Exercise'
import Warmup from './pages/Warmup'
import Strength from './pages/Strength'
import Run from './pages/Run'
import Settings from './pages/Settings'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <Header />
      {children}
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/kegel" element={<Protected><Exercise /></Protected>} />
        <Route path="/warmup" element={<Protected><Warmup /></Protected>} />
        <Route path="/strength" element={<Protected><Strength /></Protected>} />
        <Route path="/run" element={<Protected><Run /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
