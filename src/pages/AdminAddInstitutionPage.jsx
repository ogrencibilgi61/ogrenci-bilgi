import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstitution } from '../context/useInstitution'
import { requestAdminActionPassword } from '../lib/adminSecurity'

function AdminAddInstitutionPage() {
  const { addInstitution, verifyAdminActionPassword } = useInstitution()
  const [institutionCityName, setInstitutionCityName] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [institutionEmail, setInstitutionEmail] = useState('')
  const [institutionPassword, setInstitutionPassword] = useState('')
  const [institutionGender, setInstitutionGender] = useState('')
  const [notice, setNotice] = useState('')

  function handleInstitutionSubmit(event) {
    event.preventDefault()

    if (!requestAdminActionPassword(verifyAdminActionPassword)) {
      setNotice('')
      window.alert('Islem sifresi hatali.')
      return
    }

    addInstitution({
      cityName: institutionCityName.trim(),
      loginEmail: institutionEmail.trim(),
      loginPassword: institutionPassword.trim(),
      name: institutionName.trim(),
      studentGender: institutionGender,
    })
    setInstitutionCityName('')
    setInstitutionName('')
    setInstitutionEmail('')
    setInstitutionPassword('')
    setInstitutionGender('')
    setNotice('Kurum eklendi.')
  }

  return (
    <section className="page admin-content">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Idareci paneli</span>
          <h1>Kurum ekle</h1>
          <p>Yeni kurum icin sehir, giris maili ve sifre bilgisini kaydedin.</p>
        </div>
        <Link className="secondary-button compact-admin-button" to="/admin/kurumlar">
          Bilgileri gor
        </Link>
      </header>

      {notice && <p className="form-success admin-message">{notice}</p>}

      <form
        className="panel-card form-card admin-add-form"
        onSubmit={handleInstitutionSubmit}
      >
        <label>
          <span>Sehir</span>
          <input
            value={institutionCityName}
            onChange={(event) => setInstitutionCityName(event.target.value)}
            placeholder="Izmir"
            required
          />
        </label>
        <label>
          <span>Kurum adi</span>
          <input
            value={institutionName}
            onChange={(event) => setInstitutionName(event.target.value)}
            placeholder="Bornova Etut Merkezi"
            required
          />
        </label>
        <label>
          <span>Kurum tipi</span>
          <select
            value={institutionGender}
            onChange={(event) => setInstitutionGender(event.target.value)}
            required
          >
            <option value="">Secin</option>
            <option value="female">Kiz ogrenciler</option>
            <option value="male">Erkek ogrenciler</option>
          </select>
        </label>
        <label>
          <span>Giris maili</span>
          <input
            type="email"
            value={institutionEmail}
            onChange={(event) => setInstitutionEmail(event.target.value)}
            placeholder="mudur@kurum.com"
            required
          />
        </label>
        <label>
          <span>Giris sifresi</span>
          <input
            value={institutionPassword}
            onChange={(event) => setInstitutionPassword(event.target.value)}
            placeholder="4-8 haneli sifre"
            required
          />
        </label>
        <div className="admin-form-actions">
          <button className="primary-button" type="submit">
            Kurumu ekle
          </button>
        </div>
      </form>
    </section>
  )
}

export default AdminAddInstitutionPage
