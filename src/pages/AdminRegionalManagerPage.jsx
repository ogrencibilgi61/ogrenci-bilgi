import { useMemo, useState } from 'react'
import { useInstitution } from '../context/useInstitution'

const genderLabels = {
  all: 'Tum kurum tipleri',
  female: 'Kiz ogrenciler',
  male: 'Erkek ogrenciler',
}

const statusLabels = {
  active: 'Aktif',
  archived: 'Silindi',
  passive: 'Pasif',
}

const documentColumns = [
  'Tarih araligi',
  'Gun',
  'Sehir',
  'Kurum',
  'Email',
  'Durum',
  'Kurum tipi',
  'Personel',
  'Ogrenci',
  'Kapasite',
  'Doluluk',
  'Beklenen yoklama',
  'Geldi',
  'Geldi %',
  'Gelmedi',
  'Gelmedi %',
  'Izinli',
  'Izinli %',
  'Isaretlenmedi',
  'Isaretlenmedi %',
  'Devamlilik %',
]

const rangeOptions = [
  { value: 'last7', label: 'Son 1 hafta' },
  { value: 'last30', label: 'Son 1 ay' },
  { value: 'last180', label: 'Son 6 ay' },
  { value: 'last365', label: 'Son 1 yil' },
  { value: 'custom', label: 'Ozel aralik' },
]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`)
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function getPresetStartDate(option, endDate) {
  if (option === 'last30') {
    return addDays(endDate, -29)
  }

  if (option === 'last180') {
    return addDays(endDate, -179)
  }

  if (option === 'last365') {
    return addDays(endDate, -364)
  }

  return addDays(endDate, -6)
}

function getDateRange(option, customStart, customEnd) {
  const todayKey = getTodayKey()
  const endKey = option === 'custom' ? customEnd || todayKey : todayKey
  const endDate = parseDateKey(endKey)
  const startKey =
    option === 'custom'
      ? customStart || endKey
      : toDateKey(getPresetStartDate(option, endDate))

  if (startKey > endKey) {
    return {
      start: endKey,
      end: startKey,
    }
  }

  return {
    start: startKey,
    end: endKey,
  }
}

function getInclusiveDayCount(startKey, endKey) {
  const startDate = parseDateKey(startKey)
  const endDate = parseDateKey(endKey)
  const diff = endDate.getTime() - startDate.getTime()

  return Math.max(Math.round(diff / 86400000) + 1, 1)
}

function getPercent(value, total) {
  if (!total) {
    return 0
  }

  return Math.round((value / total) * 100)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function AdminRegionalManagerPage() {
  const {
    data,
    updateAdminActionPassword,
    verifyAdminActionPassword,
  } = useInstitution()
  const [accessPassword, setAccessPassword] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [newActionPassword, setNewActionPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [cityId, setCityId] = useState('all')
  const [status, setStatus] = useState('all')
  const [gender, setGender] = useState('all')
  const [rangeOption, setRangeOption] = useState('last7')
  const [customStartDate, setCustomStartDate] = useState(getTodayKey)
  const [customEndDate, setCustomEndDate] = useState(getTodayKey)

  const dateRange = useMemo(
    () => getDateRange(rangeOption, customStartDate, customEndDate),
    [customEndDate, customStartDate, rangeOption],
  )
  const dateRangeLabel = `${dateRange.start} - ${dateRange.end}`
  const rangeDayCount = getInclusiveDayCount(dateRange.start, dateRange.end)

  const institutionRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('tr')

    return data.institutions
      .map((institution) => {
        const city = data.cities.find((item) => item.id === institution.city_id)
        const settings = data.settings.find(
          (item) => item.institution_id === institution.id,
        )
        const students = data.students.filter(
          (student) =>
            student.institution_id === institution.id &&
            student.status === 'active',
        )
        const rangeAttendance = data.attendance.filter(
          (record) =>
            record.institution_id === institution.id &&
            record.date >= dateRange.start &&
            record.date <= dateRange.end,
        )
        const presentCount = rangeAttendance.filter(
          (record) => record.status === 'present',
        ).length
        const absentCount = rangeAttendance.filter(
          (record) => record.status === 'absent',
        ).length
        const excusedCount = rangeAttendance.filter(
          (record) => record.status === 'excused',
        ).length
        const capacity = Number(settings?.institution_capacity) || 0
        const studentCount = students.length
        const expectedAttendanceCount = studentCount * rangeDayCount
        const unmarkedCount = Math.max(
          expectedAttendanceCount - rangeAttendance.length,
          0,
        )

        return {
          ...institution,
          cityName: city?.name ?? 'Sehir bilgisi yok',
          capacity,
          absentRate: getPercent(absentCount, expectedAttendanceCount),
          continuityRate: getPercent(presentCount, expectedAttendanceCount),
          excusedRate: getPercent(excusedCount, expectedAttendanceCount),
          expectedAttendanceCount,
          occupancyRate: getPercent(studentCount, capacity),
          presentRate: getPercent(presentCount, expectedAttendanceCount),
          presentCount,
          absentCount,
          excusedCount,
          staffCount: Array.isArray(settings?.staff_members)
            ? settings.staff_members.length
            : 0,
          studentCount,
          unmarkedCount,
          unmarkedRate: getPercent(unmarkedCount, expectedAttendanceCount),
        }
      })
      .filter((institution) => {
        const matchesSearch =
          !normalizedSearch ||
          [institution.name, institution.login_email, institution.cityName]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('tr')
            .includes(normalizedSearch)
        const matchesCity =
          cityId === 'all' || institution.city_id === cityId
        const matchesStatus = status === 'all' || institution.status === status
        const matchesGender =
          gender === 'all' || institution.student_gender === gender

        return matchesSearch && matchesCity && matchesStatus && matchesGender
      })
  }, [
    cityId,
    data.attendance,
    data.cities,
    data.institutions,
    data.settings,
    data.students,
    dateRange.end,
    dateRange.start,
    gender,
    rangeDayCount,
    search,
    status,
  ])

  function handleAccessSubmit(event) {
    event.preventDefault()

    if (!verifyAdminActionPassword(accessPassword)) {
      setError('Bolge idarecisi sifresi hatali.')
      return
    }

    setIsUnlocked(true)
    setAccessPassword('')
    setError('')
  }

  function handlePasswordSubmit(event) {
    event.preventDefault()
    const result = updateAdminActionPassword(newActionPassword)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setNewActionPassword('')
    setError('')
    setNotice('Islem sifresi guncellendi.')
  }

  function getDocumentRows() {
    return institutionRows.map((institution) => [
      dateRangeLabel,
      rangeDayCount,
      institution.cityName,
      institution.name,
      institution.login_email ?? '',
      statusLabels[institution.status] ?? institution.status,
      genderLabels[institution.student_gender] ?? 'Kurum tipi secilmedi',
      institution.staffCount,
      institution.studentCount,
      institution.capacity || '',
      institution.capacity ? `%${institution.occupancyRate}` : '',
      institution.expectedAttendanceCount,
      institution.presentCount,
      `%${institution.presentRate}`,
      institution.absentCount,
      `%${institution.absentRate}`,
      institution.excusedCount,
      `%${institution.excusedRate}`,
      institution.unmarkedCount,
      `%${institution.unmarkedRate}`,
      `%${institution.continuityRate}`,
    ])
  }

  function createReportTable() {
    const headerCells = documentColumns
      .map((column) => `<th>${escapeHtml(column)}</th>`)
      .join('')
    const bodyRows = getDocumentRows()
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${escapeHtml(cell)}</td>`)
            .join('')}</tr>`,
      )
      .join('')

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
  }

  function handlePdfDownload() {
    if (!institutionRows.length) {
      window.alert('PDF icin uygun kurum kaydi yok.')
      return
    }

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      window.alert('PDF penceresi acilamadi. Tarayici engelini kontrol edin.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Kurum istatistikleri - ${escapeHtml(dateRangeLabel)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #182230;
            }

            h1 {
              margin: 0 0 6px;
              font-size: 22px;
            }

            p {
              margin: 0 0 18px;
              color: #667085;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }

            th,
            td {
              padding: 7px 6px;
              border: 1px solid #dfe5ee;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #e7f3ef;
              color: #105247;
            }

            @media print {
              @page {
                size: landscape;
                margin: 12mm;
              }
            }
          </style>
        </head>
        <body>
          <h1>Kurum istatistikleri</h1>
          <p>Tarih araligi: ${escapeHtml(dateRangeLabel)}</p>
          ${createReportTable()}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (!isUnlocked) {
    return (
      <section className="page admin-content">
        <div className="panel-card regional-lock-panel">
          <div>
            <span className="page-eyebrow">Bolge idarecisi</span>
            <h1>Yetkili girisi</h1>
            <p>Bu sayfa her acildiginda bolge idarecisi sifresi ister.</p>
          </div>
          <form className="login-form" onSubmit={handleAccessSubmit}>
            <label>
              <span>Bolge idarecisi sifresi</span>
              <input
                type="password"
                value={accessPassword}
                onChange={(event) => {
                  setAccessPassword(event.target.value)
                  setError('')
                }}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit">
              Sayfayi ac
            </button>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="page admin-content">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Bolge idarecisi</span>
          <h1>Kurum istatistikleri</h1>
          <p>Kurumlari sehir, durum ve kurum tipine gore filtreleyin.</p>
        </div>
      </header>

      {(notice || error) && (
        <div className="settings-message-stack">
          {notice && <p className="form-success">{notice}</p>}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}

      <form
        className="settings-form panel-card regional-password-card"
        onSubmit={handlePasswordSubmit}
      >
        <div>
          <span className="meta-label">Islem sifresi</span>
          <h2>Yetkili islem sifresini belirle</h2>
        </div>
        <label>
          <span>Yeni islem sifresi</span>
          <input
            type="password"
            value={newActionPassword}
            onChange={(event) => {
              setNewActionPassword(event.target.value)
              setError('')
              setNotice('')
            }}
            minLength={4}
            required
          />
        </label>
        <button className="primary-button" type="submit">
          Sifreyi kaydet
        </button>
      </form>

      <form className="filter-card regional-filter-card">
        <label>
          <span>Tarih araligi</span>
          <select
            value={rangeOption}
            onChange={(event) => setRangeOption(event.target.value)}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {rangeOption === 'custom' && (
          <>
            <label>
              <span>Baslangic</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
              />
            </label>
            <label>
              <span>Bitis</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
              />
            </label>
          </>
        )}
        <label>
          <span>Arama</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kurum, mail veya sehir"
          />
        </label>
        <label>
          <span>Sehir</span>
          <select value={cityId} onChange={(event) => setCityId(event.target.value)}>
            <option value="all">Tum sehirler</option>
            {data.cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Durum</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Tum durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
            <option value="archived">Silindi</option>
          </select>
        </label>
        <label>
          <span>Kurum tipi</span>
          <select value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="all">Tum kurum tipleri</option>
            <option value="female">Kiz ogrenciler</option>
            <option value="male">Erkek ogrenciler</option>
          </select>
        </label>
        <div className="regional-document-actions">
          <button
            className="secondary-button regional-document-button"
            type="button"
            onClick={handlePdfDownload}
          >
            PDF al
          </button>
        </div>
      </form>

      <div className="city-list regional-stat-list">
        {institutionRows.map((institution) => (
          <article className="panel-card city-card" key={institution.id}>
            <div className="card-row">
              <div>
                <span className="meta-label">{institution.cityName}</span>
                <h2>{institution.name}</h2>
                <p className="inline-note">
                  {genderLabels[institution.student_gender] ??
                    'Kurum tipi secilmedi'}{' '}
                  - {institution.login_email ?? 'Mail yok'}
                </p>
              </div>
              <span className={`status-pill ${institution.status}`}>
                {statusLabels[institution.status] ?? institution.status}
              </span>
            </div>

            <div className="metric-row admin-metric-row">
              <span>
                Personel
                <b>{institution.staffCount}</b>
              </span>
              <span>
                Ogrenci
                <b>{institution.studentCount}</b>
              </span>
              <span>
                Kapasite
                <b>{institution.capacity || '-'}</b>
              </span>
              <span>
                Doluluk
                <b>
                  {institution.capacity ? `%${institution.occupancyRate}` : '-'}
                </b>
              </span>
              <span>
                Geldi
                <b>%{institution.presentRate}</b>
              </span>
              <span>
                Gelmedi
                <b>%{institution.absentRate}</b>
              </span>
              <span>
                Izinli
                <b>%{institution.excusedRate}</b>
              </span>
              <span>
                Isaretlenmedi
                <b>%{institution.unmarkedRate}</b>
              </span>
              <span>
                Devamlilik
                <b>%{institution.continuityRate}</b>
              </span>
            </div>
          </article>
        ))}

        {!institutionRows.length && (
          <p className="empty-state panel-empty">Bu filtrelerle kurum yok.</p>
        )}
      </div>
    </section>
  )
}

export default AdminRegionalManagerPage
