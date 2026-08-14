import { useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'
import { getStudentFullName, getStudentInitial } from '../lib/students'

const archiveReasonLabels = {
  graduated: 'Mezun oldu',
  left: 'Ayrıldı',
  inactive: 'Pasife alındı',
}

function studentMatchesSearch(student, search) {
  const haystack = [
    student.first_name,
    student.last_name,
    student.full_name,
    student.class_name,
    student.parent_name,
    student.parent_phone,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr')

  return haystack.includes(search.toLocaleLowerCase('tr'))
}

function getArchiveLabel(student) {
  return archiveReasonLabels[student.exit_reason] ?? archiveReasonLabels[student.status] ?? 'Eski öğrenci'
}

function AlumniPage() {
  const { activateStudent, deleteStudent, scoped } = useInstitution()
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [reasonFilter, setReasonFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const inactiveStudents = useMemo(
    () => scoped.students.filter((student) => student.status !== 'active'),
    [scoped.students],
  )

  const classOptions = useMemo(() => {
    const classes = inactiveStudents
      .map((student) => student.class_name)
      .filter(Boolean)

    return [...new Set(classes)].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [inactiveStudents])

  const filteredStudents = useMemo(() => {
    return inactiveStudents.filter((student) => {
      const archiveReason = student.exit_reason ?? student.status
      const classMatch =
        classFilter === 'all' || student.class_name === classFilter
      const reasonMatch =
        reasonFilter === 'all' || archiveReason === reasonFilter
      const searchMatch = !search.trim() || studentMatchesSearch(student, search)

      return classMatch && reasonMatch && searchMatch
    })
  }, [classFilter, inactiveStudents, reasonFilter, search])

  async function handleActivate(student) {
    setNotice('')
    setError('')

    const result = await activateStudent(student.id)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setNotice(`${getStudentFullName(student)} tekrar aktif edildi.`)
  }

  async function handleDeleteStudent(student) {
    const confirmed = window.confirm(
      `${getStudentFullName(student)} tamamen silinsin mi? Bu işlem geri alınamaz.`,
    )

    if (!confirmed) {
      return
    }

    setNotice('')
    setError('')

    const result = await deleteStudent(student.id)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setNotice(`${getStudentFullName(student)} tamamen silindi.`)
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Arşiv"
        title="Eski Öğrenciler"
        description="Mezun olan veya ayrılan öğrenciler burada nedeniyle birlikte saklanır."
      />

      <form className="filter-card student-filters">
        <label>
          <span>Arama</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setNotice('')
              setError('')
            }}
            placeholder="Ad, soyad, sınıf, veli veya numara"
          />
        </label>
        <label>
          <span>Sınıf filtresi</span>
          <select
            value={classFilter}
            onChange={(event) => {
              setClassFilter(event.target.value)
              setNotice('')
              setError('')
            }}
          >
            <option value="all">Tüm sınıflar</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Ayrılma nedeni</span>
          <select
            value={reasonFilter}
            onChange={(event) => {
              setReasonFilter(event.target.value)
              setNotice('')
              setError('')
            }}
          >
            <option value="all">Tüm nedenler</option>
            <option value="graduated">Mezun oldu</option>
            <option value="left">Ayrıldı</option>
            <option value="inactive">Pasife alındı</option>
          </select>
        </label>
      </form>

      {notice && <p className="form-success page-message">{notice}</p>}
      {error && <p className="form-error page-message">{error}</p>}

      <div className="list-summary">
        <span>{filteredStudents.length} eski öğrenci</span>
      </div>

      <div className="student-list">
        {filteredStudents.map((student) => (
          <article className="student-card student-list-card muted-card" key={student.id}>
            <div className="student-avatar">{getStudentInitial(student)}</div>
            <div className="student-main">
              <div className="card-row">
                <div>
                  <span className="meta-label">
                    {student.class_name || 'Sınıf bilgisi yok'}
                  </span>
                  <h2>{getStudentFullName(student)}</h2>
                </div>
                <span className="status-pill passive">{getArchiveLabel(student)}</span>
              </div>
              <div className="student-info-grid">
                <span>
                  <b>Ad</b>
                  {student.first_name || '-'}
                </span>
                <span>
                  <b>Soyad</b>
                  {student.last_name || '-'}
                </span>
                <span>
                  <b>Veli</b>
                  {student.parent_name || '-'}
                </span>
                <span>
                  <b>Veli numarası</b>
                  {student.parent_phone || '-'}
                </span>
              </div>
              <div className="student-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleActivate(student)}
                >
                  Geri aktif et
                </button>
                <button
                  className="ghost-button danger-button"
                  type="button"
                  onClick={() => handleDeleteStudent(student)}
                >
                  Tamamen sil
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!filteredStudents.length && (
        <p className="empty-state panel-empty">
          Bu filtrelerle eski öğrenci bulunamadı. Öğrenciler sayfasından silinen
          kayıtlar burada arşivlenir.
        </p>
      )}
    </section>
  )
}

export default AlumniPage
