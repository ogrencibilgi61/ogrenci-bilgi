import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstitution } from '../context/useInstitution'
import { requestAdminActionPassword } from '../lib/adminSecurity'

const institutionGenderLabels = {
  female: 'Kiz ogrenciler',
  male: 'Erkek ogrenciler',
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getPercent(value, total) {
  if (!total) {
    return 0
  }

  return Math.round((value / total) * 100)
}

function AdminInstitutionsPage() {
  const {
    data,
    archiveInstitution,
    removeEmptyCities,
    updateInstitution,
    toggleInstitutionStatus,
    verifyAdminActionPassword,
  } = useInstitution()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    removeEmptyCities()
  }, [removeEmptyCities])

  const institutionsByCity = useMemo(() => {
    return data.cities
      .map((city) => ({
        ...city,
        institutions: data.institutions.filter(
          (institution) =>
            institution.city_id === city.id && institution.status === 'active',
        ),
      }))
      .filter((city) => city.institutions.length)
  }, [data.cities, data.institutions])

  const institutionStats = useMemo(() => {
    const today = getTodayKey()

    return data.institutions.reduce((acc, institution) => {
      const settings = data.settings.find(
        (item) => item.institution_id === institution.id,
      )
      const activeStudents = data.students.filter(
        (student) =>
          student.institution_id === institution.id &&
          student.status === 'active',
      )
      const todayAttendance = data.attendance.filter(
        (record) =>
          record.institution_id === institution.id && record.date === today,
      )
      const presentCount = todayAttendance.filter(
        (record) => record.status === 'present',
      ).length
      const absentCount = todayAttendance.filter(
        (record) => record.status === 'absent',
      ).length
      const excusedCount = todayAttendance.filter(
        (record) => record.status === 'excused',
      ).length
      const capacity = Number(settings?.institution_capacity) || 0
      const studentCount = activeStudents.length

      acc[institution.id] = {
        absenceCount: absentCount,
        capacity,
        continuityRate: getPercent(presentCount, studentCount),
        excusedCount,
        occupancyRate: getPercent(studentCount, capacity),
        presentCount,
        staffCount: Array.isArray(settings?.staff_members)
          ? settings.staff_members.length
          : 0,
        studentCount,
        unmarkedCount: Math.max(studentCount - todayAttendance.length, 0),
      }

      return acc
    }, {})
  }, [data.attendance, data.institutions, data.settings, data.students])

  function handleInstitutionUpdate(event, institutionId) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    updateInstitution(institutionId, {
      city_id: formData.get('city_id'),
      login_email: formData.get('login_email').trim(),
      login_password: formData.get('login_password').trim(),
      name: formData.get('name').trim(),
      student_gender: formData.get('student_gender'),
    })
    setNotice('Kurum guncellendi.')
  }

  return (
    <section className="page admin-content">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Idareci paneli</span>
          <h1>Kurum bilgileri</h1>
          <p>Kurumlari, durumlarini ve giris bilgilerini sehre gore inceleyin.</p>
        </div>
        <Link className="primary-button compact-admin-button" to="/admin/kurum-ekle">
          Kurum ekle
        </Link>
      </header>

      {notice && <p className="form-success admin-message">{notice}</p>}

      <div className="city-list admin-city-list">
        {institutionsByCity.map((city) => (
          <article className="panel-card city-card" key={city.id}>
            <div className="card-row">
              <div>
                <span className="meta-label">Sehir</span>
                <h2>{city.name}</h2>
              </div>
              <span className="count-pill">{city.institutions.length} kurum</span>
            </div>

            <div className="institution-list">
              {city.institutions.map((institution) => {
                const stats = institutionStats[institution.id] ?? {
                  absenceCount: 0,
                  capacity: 0,
                  continuityRate: 0,
                  excusedCount: 0,
                  occupancyRate: 0,
                  presentCount: 0,
                  staffCount: 0,
                  studentCount: 0,
                  unmarkedCount: 0,
                }
                const genderLabel =
                  institutionGenderLabels[institution.student_gender] ??
                  'Kurum tipi secilmedi'

                return (
                  <details className="institution-card admin-info-card" key={institution.id}>
                    <summary>
                      <span>
                        <strong>{institution.name}</strong>
                        <small>
                          {genderLabel} - {institution.login_email ?? 'Mail yok'}
                        </small>
                      </span>
                      <span className={`status-pill ${institution.status}`}>
                        {institution.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </summary>

                    <div className="metric-row admin-metric-row">
                      <span>
                        Personel
                        <b>{stats.staffCount}</b>
                      </span>
                      <span>
                        Ogrenci
                        <b>{stats.studentCount}</b>
                      </span>
                      <span>
                        Kapasite
                        <b>{stats.capacity || '-'}</b>
                      </span>
                      <span>
                        Doluluk
                        <b>{stats.capacity ? `%${stats.occupancyRate}` : '-'}</b>
                      </span>
                      <span>
                        Bugun geldi
                        <b>
                          {stats.presentCount}/{stats.studentCount}
                        </b>
                      </span>
                      <span>
                        Devamlilik
                        <b>%{stats.continuityRate}</b>
                      </span>
                      <span>
                        Gelmedi
                        <b>{stats.absenceCount}</b>
                      </span>
                      <span>
                        Izinli
                        <b>{stats.excusedCount}</b>
                      </span>
                      <span>
                        Isaretlenmedi
                        <b>{stats.unmarkedCount}</b>
                      </span>
                    </div>

                    <form
                      className="admin-detail-form"
                      onSubmit={(event) =>
                        handleInstitutionUpdate(event, institution.id)
                      }
                    >
                      <label>
                        <span>Kurum adi</span>
                        <input
                          name="name"
                          defaultValue={institution.name}
                          required
                        />
                      </label>
                      <label>
                        <span>Sehir</span>
                        <select name="city_id" defaultValue={institution.city_id}>
                          {data.cities.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Kurum tipi</span>
                        <select
                          name="student_gender"
                          defaultValue={institution.student_gender ?? ''}
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
                          name="login_email"
                          type="email"
                          defaultValue={institution.login_email ?? ''}
                          required
                        />
                      </label>
                      <label>
                        <span>Giris sifresi</span>
                        <input
                          name="login_password"
                          defaultValue={institution.login_password}
                          required
                        />
                      </label>
                      <div className="card-actions compact-card-actions">
                        <button
                          className="secondary-button compact-button"
                          type="submit"
                        >
                          Kaydet
                        </button>
                        <button
                          className="ghost-button compact-button"
                          type="button"
                          onClick={() => {
                            if (
                              !requestAdminActionPassword(
                                verifyAdminActionPassword,
                              )
                            ) {
                              window.alert('Islem sifresi hatali.')
                              return
                            }

                            toggleInstitutionStatus(institution.id)
                            setNotice('Kurum durumu guncellendi.')
                          }}
                        >
                          {institution.status === 'active' ? 'Pasif' : 'Aktif'}
                        </button>
                        <button
                          className="ghost-button compact-button danger-button"
                          type="button"
                          onClick={() => {
                            if (
                              !requestAdminActionPassword(
                                verifyAdminActionPassword,
                              )
                            ) {
                              window.alert('Islem sifresi hatali.')
                              return
                            }

                            archiveInstitution(institution.id)
                            setNotice('Kurum eski kurumlara tasindi.')
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    </form>
                  </details>
                )
              })}
            </div>
          </article>
        ))}

        {!institutionsByCity.length && (
          <p className="empty-state panel-empty">Aktif kurum kaydi yok.</p>
        )}
      </div>
    </section>
  )
}

export default AdminInstitutionsPage
