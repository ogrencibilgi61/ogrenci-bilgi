import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInstitution } from '../context/useInstitution'

function AdminLoginPage() {
  const navigate = useNavigate()
  const { loginAdmin } = useInstitution()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const result = loginAdmin(password)

    if (!result.ok) {
      setError(result.message)
      return
    }

    navigate('/admin')
  }

  return (
    <main className="login-page admin-login-page">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">I</span>
          <span className="brand-copy">
            <strong>Yoklama CRM</strong>
            <small>Idareci</small>
          </span>
        </div>

        <div className="login-copy">
          <span className="page-eyebrow">Idareci girisi</span>
          <h1>Sehir ve kurum yonetimi</h1>
          <p>Idareci sifresini girerek yonetim panelini acin.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Idareci sifresi</span>
            <input
              type="password"
              value={password}
              placeholder="Idareci sifresi"
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="submit">
            Idareci paneline gir
          </button>
          <Link className="text-link" to="/login">
            Kurum girisine don
          </Link>
        </form>
      </section>
    </main>
  )
}

export default AdminLoginPage
