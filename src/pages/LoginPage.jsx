import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">Ö</span>
          <span className="brand-copy">
            <strong>Öğrenci Bilgi</strong>
            <small>Yoklama CRM</small>
          </span>
        </div>

        <div className="login-copy">
          <span className="page-eyebrow">Yönetici girişi</span>
          <h1>Tekrar hoş geldiniz</h1>
          <p>Devam etmek için yönetici hesabınızla giriş yapın.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>E-posta adresi</span>
            <input
              type="email"
              name="email"
              placeholder="mudur@okul.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Şifre</span>
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </span>
          </label>

          <button className="primary-button" type="submit">
            Giriş yap
          </button>
          <small className="form-note">
            Supabase kimlik doğrulaması sonraki adımda bağlanacak.
          </small>
        </form>
      </section>

      <aside className="login-visual" aria-hidden="true">
        <div className="visual-card visual-card-main">
          <span>Günlük yoklama</span>
          <strong>%92</strong>
          <div className="progress-track">
            <span />
          </div>
        </div>
        <div className="visual-card visual-card-small">
          <span className="visual-dot" />
          <span>Veli bildirimleri hazır</span>
        </div>
      </aside>
    </main>
  )
}

export default LoginPage
