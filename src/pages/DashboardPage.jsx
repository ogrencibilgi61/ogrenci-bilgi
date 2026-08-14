import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'
import { getStudentFullName } from '../lib/students'

const defaultAbsenceTemplate =
  'Sayin {veli_adi}, {ogrenci_adi} adli ogrencimiz {tarih} tarihinde yoklamada gelmedi olarak isaretlenmistir. Toplam devamsizlik sayisi: {toplam_devamsizlik}. {kurum_adi}'

function normalizePhoneForWhatsApp(phone = '') {
  let digits = phone.replace(/\D/g, '')

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  if (digits.length === 10 && digits.startsWith('5')) {
    return `90${digits}`
  }

  if (digits.length === 12 && digits.startsWith('90')) {
    return digits
  }

  return digits
}

function buildAbsenceMessage(
  student,
  today,
  totalAbsences,
  institutionName,
  templateBody,
) {
  const studentName = getStudentFullName(student)
  const replacements = {
    '{veli_adi}': student?.parent_name ?? '',
    '{ogrenci_adi}': studentName,
    '{sinif}': student?.class_name ?? '',
    '{tarih}': today,
    '{toplam_devamsizlik}': String(totalAbsences),
    '{kurum_adi}': institutionName ?? '',
  }

  return Object.entries(replacements).reduce(
    (message, [key, value]) => message.replaceAll(key, value),
    templateBody?.trim() || defaultAbsenceTemplate,
  )
}

function buildExcusedMessage(student, today, institutionName) {
  return `Sayin ${student?.parent_name || 'Velimiz'}, ${getStudentFullName(student)} adli ogrencimiz ${today} tarihinde izinli olarak isaretlenmistir. ${institutionName ?? ''}`
}

function getParentNoteDateLabel(parentNote, today) {
  if (parentNote.note_type === 'pinned') {
    return 'Sabit mesaj'
  }

  return new Date(
    `${parentNote.reminder_date ?? today}T00:00:00`,
  ).toLocaleDateString('tr-TR')
}

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function DashboardPage() {
  const {
    markMessageSent,
    saveAttendanceBatch,
    scoped,
    session,
  } = useInstitution()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [messagedStudentIds, setMessagedStudentIds] = useState(new Set())
  const today = getTodayKey()
  const activeStudents = scoped.students.filter(
    (student) => student.status === 'active',
  )
  const savedExcusedStudentIds = new Set(
    Array.isArray(scoped.settings?.excused_student_ids)
      ? scoped.settings.excused_student_ids
      : [],
  )
  const activeStudentIds = new Set(activeStudents.map((student) => student.id))
  const studentById = scoped.students.reduce((acc, student) => {
    acc[student.id] = student
    return acc
  }, {})
  const todayAttendance = scoped.attendance.filter(
    (record) => record.date === today && activeStudentIds.has(record.student_id),
  )
  const excusedStudentIds = new Set([
    ...savedExcusedStudentIds,
    ...todayAttendance
      .filter((record) => record.status === 'excused')
      .map((record) => record.student_id),
  ])
  const excusedStudents = activeStudents.filter((student) =>
    excusedStudentIds.has(student.id),
  )
  const attendanceByStudent = todayAttendance.reduce((acc, record) => {
    acc[record.student_id] = record.status
    return acc
  }, {})
  excusedStudents.forEach((student) => {
    attendanceByStudent[student.id] = 'excused'
  })
  const attendedStudentIds = new Set([
    ...todayAttendance.map((record) => record.student_id),
    ...excusedStudents.map((student) => student.id),
  ])
  const todayClassCount = new Set(
    [...attendedStudentIds]
      .map((studentId) => studentById[studentId]?.class_name)
      .filter(Boolean),
  ).size
  const totalClassCount = new Set(
    activeStudents.map((student) => student.class_name).filter(Boolean),
  ).size
  const sentMessageStudentIds = new Set(
    scoped.messages
      .filter(
        (message) =>
          message.attendance_date === today && message.status === 'gonderildi',
      )
      .map((message) => message.student_id),
  )
  const absentStudents = activeStudents.filter(
    (student) => attendanceByStudent[student.id] === 'absent',
  )
  const visibleAbsentStudents = absentStudents.filter(
    (student) =>
      !sentMessageStudentIds.has(student.id) && !messagedStudentIds.has(student.id),
  )
  const unmarkedStudents = activeStudents.filter(
    (student) => !attendanceByStudent[student.id],
  )
  const sentMessageCount = new Set([
    ...scoped.messages
      .filter(
        (message) =>
          message.attendance_date === today && message.status === 'gonderildi',
      )
      .map((message) => message.student_id),
    ...messagedStudentIds,
  ]).size
  const dueParentNotes = scoped.parent_notes
    .filter(
      (note) =>
        note.note_type === 'pinned' || (note.reminder_date ?? today) <= today,
    )
    .sort((a, b) =>
      Number(b.note_type === 'pinned') - Number(a.note_type === 'pinned') ||
      (b.reminder_date ?? b.created_at ?? '').localeCompare(
        a.reminder_date ?? a.created_at ?? '',
      ),
    )

  function getPreparedAbsenceMessage(student) {
    return scoped.messages.find(
      (message) =>
        message.student_id === student.id &&
        message.attendance_date === today &&
        message.status === 'hazir',
    )
  }

  function getWhatsAppHref(student) {
    const phone = normalizePhoneForWhatsApp(student.parent_phone)

    if (!phone) {
      return '#'
    }

    const preparedMessage = getPreparedAbsenceMessage(student)
    const totalAbsences = scoped.attendance.filter(
      (record) => record.student_id === student.id && record.status === 'absent',
    ).length
    const message =
      preparedMessage?.body ??
      buildAbsenceMessage(
        student,
        today,
        totalAbsences,
        scoped.settings?.institution_name || session.institutionName,
        scoped.message_templates[0]?.body,
      )

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  function getExcusedWhatsAppHref(student) {
    const phone = normalizePhoneForWhatsApp(student.parent_phone)

    if (!phone) {
      return '#'
    }

    const message = buildExcusedMessage(
      student,
      today,
      scoped.settings?.institution_name || session.institutionName,
    )

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  async function handleWhatsAppMessageClick(event, student) {
    if (!student.parent_phone) {
      event.preventDefault()
      setError('Bu ogrencinin veli telefonu eksik.')
      setNotice('')
      return
    }

    setError('')
    setNotice('')
    setMessagedStudentIds((current) => new Set(current).add(student.id))

    const preparedMessage = getPreparedAbsenceMessage(student)

    if (!preparedMessage) {
      setNotice(`${getStudentFullName(student)} listeden kaldirildi.`)
      return
    }

    const result = await markMessageSent(preparedMessage.id)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setNotice(
      `${getStudentFullName(student)} icin WhatsApp mesaji gonderildi olarak isaretlendi.`,
    )
  }

  async function handleMarkAttendance(student, status) {
    setNotice('')
    setError('')

    const result = await saveAttendanceBatch([
      {
        student_id: student.id,
        date: today,
        status,
      },
    ])

    if (!result.ok) {
      setError(result.message)
      return
    }

    const statusLabel = status === 'present' ? 'geldi' : 'gelmedi'
    setNotice(`${getStudentFullName(student)} ${statusLabel} olarak guncellendi.`)
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow={session.cityName}
        title={session.institutionName}
        description="Bugunun yoklama durumu, veli notlari ve hazir mesaj ozeti."
      />

      {notice && <p className="form-success page-message">{notice}</p>}
      {error && <p className="form-error page-message">{error}</p>}

      <div className="stat-grid dashboard-stat-grid">
        <article className="stat-card">
          <span>Toplam aktif ogrenci</span>
          <strong>{activeStudents.length}</strong>
        </article>
        <article className="stat-card accent-blue">
          <span>Bugun yoklama alinan sinif</span>
          <strong>{todayClassCount}</strong>
        </article>
        <article className="stat-card accent-blue">
          <span>Yoklama alinan ogrenci</span>
          <strong>{attendedStudentIds.size}</strong>
        </article>
        <article className="stat-card accent-rose">
          <span>Bugun gelmeyen ogrenci</span>
          <strong>{absentStudents.length}</strong>
        </article>
        <article className="stat-card accent-amber">
          <span>Izinli ogrenci sayisi</span>
          <strong>{excusedStudents.length}</strong>
        </article>
        <article className="stat-card">
          <span>Mesaj gonderilen ogrenci</span>
          <strong>{sentMessageCount}</strong>
        </article>
        <article className="stat-card accent-blue">
          <span>Toplam sinif sayisi</span>
          <strong>{totalClassCount}</strong>
        </article>
        <article className="stat-card accent-amber">
          <span>Isaretlenmeyen ogrenci</span>
          <strong>{unmarkedStudents.length}</strong>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel-card">
          <div className="card-row">
            <div>
              <span className="meta-label">Yoklama</span>
              <h2>Gelmedi isaretlenenler</h2>
            </div>
            <span className="count-pill">{absentStudents.length}</span>
          </div>
          <div className="mini-report-list">
            {visibleAbsentStudents.map((student) => (
              <article
                className="mini-report-card absent-dashboard-card"
                key={student.id}
              >
                <strong>{getStudentFullName(student)}</strong>
                <div className="absence-action-grid">
                  <span>
                    Sinif
                    <b>{student.class_name || '-'}</b>
                  </span>
                  <span>
                    Veli
                    <b>{student.parent_name || '-'}</b>
                  </span>
                  <button
                    className="secondary-button compact-dashboard-button"
                    type="button"
                    onClick={() => handleMarkAttendance(student, 'present')}
                  >
                    Geldi
                  </button>
                  <a
                    className="whatsapp-button compact-dashboard-button"
                    href={getWhatsAppHref(student)}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!student.parent_phone}
                    onClick={(event) => handleWhatsAppMessageClick(event, student)}
                  >
                    WhatsApp
                  </a>
                </div>
              </article>
            ))}
            {!visibleAbsentStudents.length && (
              <p className="empty-state">
                Bugun mesaj bekleyen gelmedi ogrenci yok.
              </p>
            )}
          </div>
        </article>

        <article className="panel-card">
          <div className="card-row">
            <div>
              <span className="meta-label">Yoklama</span>
              <h2>Izinliler</h2>
            </div>
            <span className="count-pill">{excusedStudents.length}</span>
          </div>
          <div className="mini-report-list">
            {excusedStudents.map((student) => (
              <article className="mini-report-card" key={student.id}>
                <strong>{getStudentFullName(student)}</strong>
                <div className="student-info-grid excused-student-info">
                  <span>
                    <b>Sinif</b>
                    {student.class_name || '-'}
                  </span>
                  <span>
                    <b>Veli</b>
                    {student.parent_name || '-'}
                  </span>
                </div>
                <div className="absence-action-grid excused-action-grid">
                  <a
                    className="whatsapp-button compact-dashboard-button"
                    href={getExcusedWhatsAppHref(student)}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!student.parent_phone}
                  >
                    WhatsApp
                  </a>
                  <button
                    className="secondary-button compact-dashboard-button"
                    type="button"
                    onClick={() => handleMarkAttendance(student, 'present')}
                  >
                    Geldi
                  </button>
                </div>
              </article>
            ))}
            {!excusedStudents.length && (
              <p className="empty-state">Izinli listesinde ogrenci yok.</p>
            )}
          </div>
        </article>

        <article className="panel-card">
          <div className="card-row">
            <div>
              <span className="meta-label">Yoklama</span>
              <h2>Isaretlenmeyenler</h2>
            </div>
            <span className="count-pill">{unmarkedStudents.length}</span>
          </div>
          <div className="mini-report-list">
            {unmarkedStudents.map((student) => (
              <article className="mini-report-card" key={student.id}>
                <strong>{getStudentFullName(student)}</strong>
                <div className="absence-action-grid">
                  <span>
                    Sinif
                    <b>{student.class_name || '-'}</b>
                  </span>
                  <span>
                    Veli
                    <b>{student.parent_name || '-'}</b>
                  </span>
                  <button
                    className="secondary-button compact-dashboard-button"
                    type="button"
                    onClick={() => handleMarkAttendance(student, 'present')}
                  >
                    Geldi
                  </button>
                  <button
                    className="ghost-button danger-button compact-dashboard-button"
                    type="button"
                    onClick={() => handleMarkAttendance(student, 'absent')}
                  >
                    Gelmedi
                  </button>
                </div>
              </article>
            ))}
            {!unmarkedStudents.length && (
              <p className="empty-state">Bugun isaretlenmeyen ogrenci yok.</p>
            )}
          </div>
        </article>

        <article className="panel-card">
          <div className="card-row">
            <div>
              <span className="meta-label">Veli notlari</span>
              <h2>Bugunun bildirimleri</h2>
            </div>
            <span className="count-pill">{dueParentNotes.length}</span>
          </div>
          <div className="mini-report-list">
            {dueParentNotes.map((note) => {
              const student = studentById[note.student_id]

              return (
                <article className="mini-report-card" key={note.id}>
                  <strong>{getStudentFullName(student)}</strong>
                  <p>{note.note}</p>
                  <div className="metric-row">
                    <span>
                      Sinif
                      <b>{student?.class_name || '-'}</b>
                    </span>
                <span>
                  Tarih
                      <b>{getParentNoteDateLabel(note, today)}</b>
                </span>
                  </div>
                </article>
              )
            })}
            {!dueParentNotes.length && (
              <p className="empty-state">Bugun icin veli notu yok.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

export default DashboardPage
