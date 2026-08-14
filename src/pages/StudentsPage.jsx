import { useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'
import { attendanceLabels } from '../data/institutionData'
import {
  getStudentFullName,
  getStudentInitial,
  toStudentPayload,
} from '../lib/students'

const emptyStudentForm = {
  first_name: '',
  last_name: '',
  class_name: '',
  gender: '',
  parent_name: '',
  parent_phone: '',
}

const attendanceFilterOptions = [
  { value: 'all', label: 'Tüm yoklama durumları' },
  { value: 'present', label: 'Geldi' },
  { value: 'absent', label: 'Gelmedi' },
  { value: 'excused', label: 'İzinli' },
  { value: 'unmarked', label: 'İşaretlenmedi' },
]

const archiveReasonLabels = {
  graduated: 'Mezun oldu',
  left: 'Ayrıldı',
  inactive: 'Pasife alındı',
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeList(value) {
  return Array.isArray(value) ? value : []
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

function StudentsPage() {
  const { addStudent, archiveStudent, scoped, updateStudent } = useInstitution()
  const [form, setForm] = useState(emptyStudentForm)
  const [editingId, setEditingId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [attendanceFilter, setAttendanceFilter] = useState('all')
  const [attendanceDate, setAttendanceDate] = useState(getTodayKey)
  const [pendingArchiveStudent, setPendingArchiveStudent] = useState(null)
  const [archiveReason, setArchiveReason] = useState('graduated')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const activeStudents = useMemo(
    () => scoped.students.filter((student) => student.status === 'active'),
    [scoped.students],
  )

  const classOptions = useMemo(() => {
    const settingClasses = normalizeList(scoped.settings?.classes)
    const studentClasses = activeStudents
      .map((student) => student.class_name)
      .filter(Boolean)

    return [...new Set([...settingClasses, ...studentClasses])].sort((a, b) =>
      a.localeCompare(b, 'tr'),
    )
  }, [activeStudents, scoped.settings?.classes])

  const statusByStudent = useMemo(() => {
    return scoped.attendance
      .filter((record) => record.date === attendanceDate)
      .reduce((acc, record) => {
        acc[record.student_id] = record.status
        return acc
      }, {})
  }, [attendanceDate, scoped.attendance])

  const filteredStudents = useMemo(() => {
    return activeStudents.filter((student) => {
      const currentAttendance = statusByStudent[student.id] ?? 'unmarked'
      const classMatch =
        classFilter === 'all' || student.class_name === classFilter
      const attendanceMatch =
        attendanceFilter === 'all' || currentAttendance === attendanceFilter
      const searchMatch = !search.trim() || studentMatchesSearch(student, search)

      return classMatch && attendanceMatch && searchMatch
    })
  }, [
    activeStudents,
    attendanceFilter,
    classFilter,
    search,
    statusByStudent,
  ])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setNotice('')
    setError('')
  }

  function resetForm() {
    setForm(emptyStudentForm)
    setEditingId(null)
  }

  function handleEdit(student) {
    setForm({
      first_name: student.first_name ?? student.full_name?.split(' ')[0] ?? '',
      last_name:
        student.last_name ?? student.full_name?.split(' ').slice(1).join(' ') ?? '',
      class_name: student.class_name ?? '',
      gender: student.gender ?? '',
      parent_name: student.parent_name ?? '',
      parent_phone: student.parent_phone ?? '',
    })
    setEditingId(student.id)
    setIsEditorOpen(true)
    setNotice('')
    setError('')
    window.requestAnimationFrame(() => {
      document
        .querySelector('.student-editor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      ...toStudentPayload(form),
      status: 'active',
    }
    const result = editingId
      ? await updateStudent(editingId, payload)
      : await addStudent(payload)

    if (!result.ok) {
      setError(result.message)
      return
    }

    resetForm()
    setIsEditorOpen(false)
    setNotice(editingId ? 'Öğrenci güncellendi.' : 'Öğrenci eklendi.')
  }

  function openArchiveModal(student) {
    setPendingArchiveStudent(student)
    setArchiveReason('graduated')
    setNotice('')
    setError('')
  }

  function closeArchiveModal() {
    setPendingArchiveStudent(null)
    setArchiveReason('graduated')
  }

  async function handleArchiveSubmit(event) {
    event.preventDefault()

    if (!pendingArchiveStudent) {
      return
    }

    const result = await archiveStudent(pendingArchiveStudent.id, archiveReason)

    if (!result.ok) {
      setError(result.message)
      return
    }

    if (editingId === pendingArchiveStudent.id) {
      resetForm()
    }

    setNotice(
      `${getStudentFullName(pendingArchiveStudent)} eski öğrenciler bölümüne taşındı.`,
    )
    closeArchiveModal()
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Öğrenci yönetimi"
        title="Öğrenciler"
        description="Öğrenci bilgilerini listeleyin; sınıf, arama ve yoklama durumuna göre aynı anda filtreleyin."
      />

      {!isEditorOpen && (
        <button
          className="primary-button student-editor-toggle"
          type="button"
          onClick={() => {
            resetForm()
            setIsEditorOpen(true)
          }}
        >
          Ogrenci ekle
        </button>
      )}

      {isEditorOpen && (
      <form className="filter-card student-editor" onSubmit={handleSubmit}>
        <label>
          <span>Ad</span>
          <input
            value={form.first_name}
            onChange={(event) => updateField('first_name', event.target.value)}
            placeholder="Deniz"
            required
          />
        </label>
        <label>
          <span>Soyad</span>
          <input
            value={form.last_name}
            onChange={(event) => updateField('last_name', event.target.value)}
            placeholder="Arslan"
            required
          />
        </label>
        <label>
          <span>Sınıf</span>
          <input
            list="student-class-options"
            value={form.class_name}
            onChange={(event) => updateField('class_name', event.target.value)}
            placeholder="A Grubu"
          />
          <datalist id="student-class-options">
            {classOptions.map((className) => (
              <option key={className} value={className} />
            ))}
          </datalist>
        </label>
        {!editingId && (
          <label>
            <span>Cinsiyet</span>
            <select
              value={form.gender}
              onChange={(event) => updateField('gender', event.target.value)}
              required
            >
              <option value="">Secin</option>
              <option value="female">Kiz</option>
              <option value="male">Erkek</option>
            </select>
          </label>
        )}
        <label>
          <span>Veli adı</span>
          <input
            value={form.parent_name}
            onChange={(event) => updateField('parent_name', event.target.value)}
            placeholder="Selin Arslan"
          />
        </label>
        <label>
          <span>Veli telefonu</span>
          <input
            value={form.parent_phone}
            onChange={(event) => updateField('parent_phone', event.target.value)}
            placeholder="+905321112233"
          />
        </label>

        {notice && <p className="form-success">{notice}</p>}
        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button className="primary-button" type="submit">
            {editingId ? 'Öğrenciyi güncelle' : 'Öğrenci ekle'}
          </button>
          {editingId && (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                resetForm()
                setIsEditorOpen(false)
              }}
            >
              Vazgeç
            </button>
          )}
          {!editingId && (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                resetForm()
                setIsEditorOpen(false)
              }}
            >
              Vazgec
            </button>
          )}
        </div>
      </form>
      )}

      <form className="filter-card student-filters">
        <label>
          <span>Arama</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ad, soyad, sınıf, veli veya numara"
          />
        </label>
        <label>
          <span>Sınıf filtresi</span>
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
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
          <span>Yoklama tarihi</span>
          <input
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
          />
        </label>
        <label>
          <span>Gelme durumu</span>
          <select
            value={attendanceFilter}
            onChange={(event) => setAttendanceFilter(event.target.value)}
          >
            {attendanceFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="list-summary">
        <span>{filteredStudents.length} aktif öğrenci</span>
      </div>

      <div className="student-list">
        {filteredStudents.map((student) => {
          const currentAttendance = statusByStudent[student.id] ?? 'unmarked'

          return (
            <article className="student-card student-list-card" key={student.id}>
              <div className="student-avatar">{getStudentInitial(student)}</div>
              <div className="student-main">
                <div className="card-row">
                  <div>
                    <span className="meta-label">
                      {student.class_name || 'Sınıf bilgisi yok'}
                    </span>
                    <h2>{getStudentFullName(student)}</h2>
                  </div>
                  <span
                    className={`status-pill ${
                      currentAttendance === 'unmarked'
                        ? 'passive'
                        : currentAttendance
                    }`}
                  >
                    {currentAttendance === 'unmarked'
                      ? 'İşaretlenmedi'
                      : attendanceLabels[currentAttendance]}
                  </span>
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
                    onClick={() => handleEdit(student)}
                  >
                    Düzenle
                  </button>
                  <button
                    className="ghost-button danger-button"
                    type="button"
                    onClick={() => openArchiveModal(student)}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {!filteredStudents.length && (
        <p className="empty-state panel-empty">
          Bu filtrelerle aktif öğrenci bulunamadı. Yeni öğrenci eklemek için
          üstteki formu kullanabilirsiniz.
        </p>
      )}

      {pendingArchiveStudent && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel" onSubmit={handleArchiveSubmit}>
            <div>
              <span className="meta-label">Eski öğrenciye taşı</span>
              <h2>{getStudentFullName(pendingArchiveStudent)}</h2>
            </div>
            <label>
              <span>Silme nedeni</span>
              <select
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
              >
                <option value="graduated">Mezun oldu</option>
                <option value="left">Ayrıldı</option>
              </select>
            </label>
            <p className="modal-note">
              Kayıt silinmez; {archiveReasonLabels[archiveReason].toLocaleLowerCase('tr')} bilgisiyle Eski Öğrenciler bölümüne taşınır.
            </p>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                Taşı
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={closeArchiveModal}
              >
                Vazgeç
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export default StudentsPage
