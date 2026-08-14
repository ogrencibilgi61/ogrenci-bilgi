import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'
import { getStudentFullName } from '../lib/students'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getReminderLabel(date) {
  if (!date) {
    return 'Bugün'
  }

  const today = getTodayKey()

  if (date === today) {
    return 'Bugün'
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR')
}

function getNoteLabel(parentNote) {
  if (parentNote.note_type === 'pinned') {
    return 'Sabit mesaj'
  }

  return getReminderLabel(parentNote.reminder_date)
}

function ParentNotesPage() {
  const navigate = useNavigate()
  const { addParentNote, deleteParentNote, scoped } = useInstitution()
  const today = getTodayKey()
  const activeStudents = useMemo(
    () => scoped.students.filter((student) => student.status === 'active'),
    [scoped.students],
  )
  const [studentId, setStudentId] = useState(activeStudents[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [reminderMode, setReminderMode] = useState('today')
  const [reminderDate, setReminderDate] = useState(today)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const selectedStudentId = studentId || activeStudents[0]?.id || ''
  const selectedReminderDate =
    reminderMode === 'future' ? reminderDate : today

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    const result = await addParentNote({
      student_id: selectedStudentId,
      note: note.trim(),
      note_type: reminderMode,
      reminder_date: selectedReminderDate,
    })

    if (!result.ok) {
      setError(result.message)
      return
    }

    setNote('')

    if (reminderMode !== 'future') {
      navigate('/dashboard')
      return
    }

    setNotice('Veli notu ileri tarihli bildirim olarak kaydedildi.')
  }

  async function handleDeleteNote(parentNote) {
    const confirmed = window.confirm('Bu veli notu silinsin mi?')

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')

    const result = await deleteParentNote(parentNote.id)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setNotice('Veli notu silindi.')
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Veli notları"
        title="Veli Notları"
        description="Bugünün notları dashboard bildirimlerine düşer; ileri tarihli notlar günü geldiğinde görünür."
      />

      <form className="filter-card parent-note-form" onSubmit={handleSubmit}>
        <label>
          <span>Öğrenci</span>
          <select
            value={selectedStudentId}
            onChange={(event) => setStudentId(event.target.value)}
            required
          >
            <option value="">Öğrenci seçin</option>
            {activeStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {getStudentFullName(student)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Bildirim zamanı</span>
          <select
            value={reminderMode}
            onChange={(event) => {
              const nextMode = event.target.value
              setReminderMode(nextMode)
              setReminderDate(today)
              setError('')
              setNotice('')
            }}
          >
            <option value="today">Bugün</option>
            <option value="future">İleri tarih</option>
            <option value="pinned">Sabit mesaj</option>
          </select>
        </label>
        {reminderMode === 'future' && (
          <label>
            <span>Bildirim tarihi</span>
            <input
              type="date"
              min={today}
              value={reminderDate}
              onChange={(event) => {
                setReminderDate(event.target.value)
                setError('')
                setNotice('')
              }}
              required
            />
          </label>
        )}
        <label className="wide-field">
          <span>Not</span>
          <textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setError('')
              setNotice('')
            }}
            rows="4"
            placeholder="Veli görüşmesi veya özel bilgilendirme notu."
            required
          />
        </label>
        {notice && <p className="form-success">{notice}</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit">
          Notu kaydet
        </button>
      </form>

      <div className="card-grid">
        {scoped.parent_notes.map((parentNote) => {
          const student = scoped.students.find(
            (item) => item.id === parentNote.student_id,
          )

          return (
            <article className="message-card" key={parentNote.id}>
              <div className="card-row">
                <div>
                  <span className="meta-label">
                    {getNoteLabel(parentNote)}
                  </span>
                  <h2>{getStudentFullName(student)}</h2>
                </div>
                <div className="note-side-actions">
                  <span className="status-pill">{student?.class_name}</span>
                  <button
                    className="ghost-button danger-button compact-button"
                    type="button"
                    onClick={() => handleDeleteNote(parentNote)}
                  >
                    Sil
                  </button>
                </div>
              </div>
              <p>{parentNote.note}</p>
              <div className="info-stack">
                <span>Veli: {student?.parent_name}</span>
                <span>{student?.parent_phone}</span>
              </div>
            </article>
          )
        })}
      </div>
      {!scoped.parent_notes.length && (
        <p className="empty-state panel-empty">
          Henüz veli notu yok. Öğrenci seçip not eklediğinizde burada
          listelenir.
        </p>
      )}
    </section>
  )
}

export default ParentNotesPage
