import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstitution } from '../context/useInstitution'
import { requestAdminActionPassword } from '../lib/adminSecurity'

const institutionGenderLabels = {
  female: 'Kiz ogrenciler',
  male: 'Erkek ogrenciler',
}

const statusLabels = {
  archived: 'Silindi',
  passive: 'Pasif',
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

function AdminOldInstitutionsPage() {
  const {
    activateInstitution,
    data,
    deleteInstitutionForever,
    removeEmptyCities,
    verifyAdminActionPassword,
  } = useInstitution()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    removeEmptyCities()
  }, [data.institutions, removeEmptyCities])

  const oldInstitutions = useMemo(() => {
    return data.institutions.filter(
      (institution) => institution.status !== 'active',
    )
  }, [data.institutions])

  const institutionStats = useMemo(() => {
    const today = getTodayKey()

    return oldInstitutions.reduce((acc, institution) => {
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
      const capacity = Number(settings?.institution_capacity) || 0
      const studentCount = activeStudents.length

      acc[institution.id] = {
        capacity,
        continuityRate: getPercent(presentCount, studentCount),
        occupancyRate: getPercent(studentCount, capacity),
        staffCount: Array.isArray(settings?.staff_members)
          ? settings.staff_members.length
          : 0,
        studentCount,
      }

      return acc
    }, {})
  }, [data.attendance, data.settings, data.students, oldInstitutions])

  function handleDeleteForever(institution) {
    if (!requestAdminActionPassword(verifyAdminActionPassword)) {
      window.alert('Islem sifresi hatali.')
      return
    }

    const confirmed = window.confirm(
      `${institution.name} tamamen silinsin mi? Bu islem kurumun ogrenci, yoklama, mesaj ve ayar kayitlarini kalici olarak siler.`,
    )

    if (!confirmed) {
      return
    }

    deleteInstitutionForever(institution.id)
    setNotice('Kurum tamamen silindi.')
  }

  return (
    <section className="page admin-content">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Idareci paneli</span>
          <h1>Eski kurumlar</h1>
          <p>Pasife alinan veya silinen kurumlari buradan inceleyin.</p>
        </div>
        <Link className="secondary-button compact-admin-button" to="/admin/kurumlar">
          Aktif kurumlar
        </Link>
      </header>

      {notice && <p className="form-success admin-message">{notice}</p>}

      <div className="city-list admin-city-list">
        {oldInstitutions.map((institution) => {
          const city = data.cities.find((item) => item.id === institution.city_id)
          const stats = institutionStats[institution.id] ?? {
            capacity: 0,
            continuityRate: 0,
            occupancyRate: 0,
            staffCount: 0,
            studentCount: 0,
          }
          const genderLabel =
            institutionGenderLabels[institution.student_gender] ??
            'Kurum tipi secilmedi'

          return (
            <article className="panel-card city-card old-institution-card" key={institution.id}>
              <div className="card-row old-institution-heading">
                <div>
                  <span className="meta-label">
                    {city?.name ?? 'Sehir bilgisi yok'}
                  </span>
                  <h2>{institution.name}</h2>
                  <p>{genderLabel} - {institution.login_email ?? 'Mail yok'}</p>
                </div>
                <span className={`status-pill ${institution.status}`}>
                  {statusLabels[institution.status] ?? institution.status}
                </span>
              </div>

              <div className="metric-row admin-metric-row old-institution-metrics">
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
                  Devamlilik
                  <b>%{stats.continuityRate}</b>
                </span>
              </div>

              <div className="card-actions compact-card-actions old-institution-actions">
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={() => {
                    if (
                      !requestAdminActionPassword(verifyAdminActionPassword)
                    ) {
                      window.alert('Islem sifresi hatali.')
                      return
                    }

                    activateInstitution(institution.id)
                    setNotice('Kurum aktif edildi.')
                  }}
                >
                  Aktif et
                </button>
                <button
                  className="ghost-button compact-button danger-button"
                  type="button"
                  onClick={() => handleDeleteForever(institution)}
                >
                  Tamamen sil
                </button>
              </div>
            </article>
          )
        })}

        {!oldInstitutions.length && (
          <p className="empty-state panel-empty">Eski kurum kaydi yok.</p>
        )}
      </div>
    </section>
  )
}

export default AdminOldInstitutionsPage
