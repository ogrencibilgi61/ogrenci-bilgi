import { useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'
import { attendanceLabels } from '../data/institutionData'
import { getStudentFullName } from '../lib/students'

const statusOrder = ['present', 'absent', 'excused']
const allClassKey = '__all_classes__'
const emptyClassKey = '__empty_class__'

function getClassKey(student) {
  return student.class_name || emptyClassKey
}

function getClassLabel(classKey) {
  if (classKey === allClassKey) {
    return 'Tüm sınıflar'
  }

  return classKey === emptyClassKey ? 'Sınıf bilgisi yok' : classKey
}

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function AttendancePage() {
  const { saveAttendanceBatch, scoped } = useInstitution()
  const [date, setDate] = useState(getTodayKey)
  const [classFilter, setClassFilter] = useState('')
  const [draftStatuses, setDraftStatuses] = useState({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isCorrectionMode, setIsCorrectionMode] = useState(false)

  const activeStudents = useMemo(
    () => scoped.students.filter((student) => student.status === 'active'),
    [scoped.students],
  )

  const settingClasses = useMemo(() => (
    Array.isArray(scoped.settings?.classes)
      ? scoped.settings.classes
      : []
  ), [scoped.settings])

  const classOptions = useMemo(() => {
    const classKeys = [
      ...settingClasses,
      ...activeStudents.map(getClassKey),
    ]
    const sortedClasses = [...new Set(classKeys)].sort((a, b) =>
      getClassLabel(a).localeCompare(getClassLabel(b), 'tr'),
    )

    return [allClassKey, ...sortedClasses]
  }, [activeStudents, settingClasses])

  const selectedClass =
    classFilter && classOptions.includes(classFilter)
      ? classFilter
      : allClassKey

  const selectedStudents = useMemo(() => {
    if (selectedClass === allClassKey) {
      return activeStudents
    }

    return activeStudents.filter(
      (student) => getClassKey(student) === selectedClass,
    )
  }, [activeStudents, selectedClass])

  const statusByStudent = useMemo(() => {
    return scoped.attendance
      .filter((record) => record.date === date)
      .reduce((acc, record) => {
        acc[record.student_id] = record.status
        return acc
      }, {})
  }, [date, scoped.attendance])
  const excusedStudentIds = useMemo(
    () =>
      new Set(
        Array.isArray(scoped.settings?.excused_student_ids)
          ? scoped.settings.excused_student_ids
          : [],
    ),
    [scoped.settings],
  )
  const hasSavedAttendance = selectedStudents.some(
    (student) => statusByStudent[student.id],
  )
  const canEditAttendance = !hasSavedAttendance || isCorrectionMode

  function getCurrentStatus(studentId) {
    return (
      draftStatuses[studentId] ??
      (excusedStudentIds.has(studentId)
        ? 'excused'
        : statusByStudent[studentId] ?? 'present')
    )
  }

  function handleClassChange(nextClass) {
    setClassFilter(nextClass)
    setDraftStatuses({})
    setIsCorrectionMode(false)
    setNotice('')
    setError('')
  }

  function handleDateChange(nextDate) {
    setDate(nextDate)
    setDraftStatuses({})
    setIsCorrectionMode(false)
    setNotice('')
    setError('')
  }

  function handleStatus(studentId, status) {
    if (!canEditAttendance) {
      setError('Bu yoklamayi degistirmek icin once Yoklamayi duzelt butonuna basin.')
      setNotice('')
      return
    }

    setDraftStatuses((current) => {
      const currentStatus =
        current[studentId] ??
        (excusedStudentIds.has(studentId)
          ? 'excused'
          : statusByStudent[studentId] ?? 'present')

      if (currentStatus !== status) {
        return { ...current, [studentId]: status }
      }

      const next = { ...current }
      delete next[studentId]

      return next
    })
    setNotice('')
    setError('')
  }

  function handleEnableCorrection() {
    setIsCorrectionMode(true)
    setNotice('Yoklama duzeltme modu acildi. Degisiklikleri kaydetmeyi unutmayin.')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!selectedStudents.length) {
      setError('Seçili sınıfta aktif öğrenci yok.')
      return
    }

    if (!canEditAttendance) {
      setError('Kayitli yoklamayi degistirmek icin once Yoklamayi duzelt butonuna basin.')
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    const records = selectedStudents.map((student) => ({
      student_id: student.id,
      date,
      status: getCurrentStatus(student.id),
    }))
    const result = await saveAttendanceBatch(records)

    setIsSaving(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setDraftStatuses({})
    setIsCorrectionMode(false)
    setNotice(
      hasSavedAttendance
        ? 'Yoklama duzeltildi. Dashboard bilgileri guncellendi.'
        : result.messageCount
        ? `Yoklama kaydedildi. Gelmeyen öğrenciler için ${result.messageCount} mesaj oluşturuldu.`
        : 'Yoklama kaydedildi.',
    )
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Günlük işlemler"
        title="Yoklama"
        description="Önce sınıfı seçin, öğrencilerin durumunu işaretleyin ve yoklamayı tek seferde kaydedin."
      />

      <form className="filter-card attendance-controls" onSubmit={handleSubmit}>
        <label>
          <span>Sınıf</span>
          <select
            value={selectedClass}
            onChange={(event) => handleClassChange(event.target.value)}
            required
          >
            {classOptions.map((classKey) => (
              <option key={classKey} value={classKey}>
                {getClassLabel(classKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Yoklama tarihi</span>
          <input
            type="date"
            value={date}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </label>
        <button
          className="primary-button attendance-save-button"
          type="submit"
          disabled={isSaving || !selectedStudents.length || !canEditAttendance}
        >
          {isSaving ? 'Kaydediliyor...' : 'Yoklamayı kaydet'}
        </button>
        {hasSavedAttendance && !isCorrectionMode && (
          <button
            className="secondary-button attendance-correction-button"
            type="button"
            onClick={handleEnableCorrection}
          >
            Yoklamayi duzelt
          </button>
        )}
      </form>

      {notice && <p className="form-success page-message">{notice}</p>}
      {error && <p className="form-error page-message">{error}</p>}

      <div className="list-summary">
        <span>{selectedStudents.length} aktif öğrenci</span>
      </div>

      <div className="attendance-list">
        {selectedStudents.map((student) => {
          const currentStatus = getCurrentStatus(student.id)

          return (
            <article className="attendance-card" key={student.id}>
              <div>
                <span className="meta-label">
                  {student.class_name || 'Sınıf bilgisi yok'}
                </span>
                <h2>{getStudentFullName(student)}</h2>
                <p>{student.parent_name}</p>
              </div>

              <div className="attendance-actions">
                {statusOrder.map((status) => (
                  <button
                    className={`attendance-button ${status}${
                      currentStatus === status ? ' selected' : ''
                    }`}
                    key={status}
                    type="button"
                    disabled={!canEditAttendance}
                    onClick={() => handleStatus(student.id, status)}
                  >
                    {attendanceLabels[status]}
                  </button>
                ))}
              </div>
            </article>
          )
        })}
      </div>
      {!selectedStudents.length && (
        <p className="empty-state panel-empty">
          Yoklama alınacak aktif öğrenci bulunamadı. Önce Öğrenciler sayfasından
          aktif öğrenci ekleyin veya farklı bir sınıf seçin.
        </p>
      )}
    </section>
  )
}

export default AttendancePage
