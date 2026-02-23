import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [initials, setInitials] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isRegister) {
        if (!initials.trim()) { setError('Initials required'); setSubmitting(false); return }
        await register(email, password, initials)
      } else {
        await login(email, password)
      }
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 text-primary">Kegel</h1>
        <p className="text-text-dim text-center mb-8 text-sm">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Initials (e.g. LS)"
              maxLength={4}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-primary"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-surface border border-border rounded-lg px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-primary"
          />

          {error && <p className="text-primary text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white font-semibold rounded-lg py-3 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {submitting ? '...' : isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <button
          onClick={() => { setIsRegister(!isRegister); setError('') }}
          className="text-text-dim text-sm mt-6 w-full text-center"
        >
          {isRegister ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}
