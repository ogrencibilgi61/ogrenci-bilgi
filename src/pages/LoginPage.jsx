import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useInstitution } from '../context/useInstitution'

function LoginPage() {
  const navigate = useNavigate()
  const {
    authError,
    isAuthLoading,
    isSupabaseConfigured,
    loginInstitution,
    session,
  } = useInstitution()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    const result = await loginInstitution(email.trim(), password)

    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    navigate('/dashboard')
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">Y</span>
          <span className="brand-copy">
            <strong>Yoklama CRM</strong>
            <small>Mudur paneli</small>
          </span>
        </div>

        <div className="login-copy">
          <span className="page-eyebrow">Mudur girisi</span>
          <h1>Email ve sifre ile giris</h1>
          <p>
            {isSupabaseConfigured
              ? 'Panel yalnizca yetkili mudur hesabi ile acilir.'
              : 'Idarecinin ekledigi kurum maili ve kurum sifresiyle giris yapilir.'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              placeholder="mudur@kurum.com"
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              required
            />
          </label>

          <label>
            <span>Sifre</span>
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="********"
                autoComplete="current-password"
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Gizle' : 'Goster'}
              </button>
            </span>
          </label>

          {(error || (isSupabaseConfigured && authError)) && (
            <p className="form-error">{error || authError}</p>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting || isAuthLoading || !email.trim()}
          >
            {isSubmitting ? 'Giris yapiliyor...' : 'Dashboarda git'}
          </button>
          <small className="form-note">
            Veli kayit veya veli giris alani bulunmaz.
          </small>
          <Link className="text-link" to="/admin/login">
            Idareci girisi
          </Link>
        </form>
      </section>

      <aside className="login-visual" aria-hidden="true">
        <div className="visual-card visual-card-main">
          <span>Gunluk yoklama</span>
          <strong>%92</strong>
          <div className="progress-track">
            <span />
          </div>
        </div>
        <div className="visual-card visual-card-small">
          <span className="visual-dot" />
          <span>Kurum verileri izole</span>
        </div>
      </aside>
    </main>
  )
}

export default LoginPage
