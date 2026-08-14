import { useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'
import { attendanceLabels } from '../data/institutionData'
import { getStudentFullName } from '../lib/students'

const statusKeys = ['present', 'absent', 'excused']

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

function getPercent(value, total) {
  if (!total) {
    return 0
  }

  return Math.round((value / total) * 100)
}

function getAbsenceWarningHref(report, threshold, institutionName) {
  const phone = normalizePhoneForWhatsApp(report.student.parent_phone)

  if (!phone) {
    return '#'
  }

  const message = `Sayin ${report.student.parent_name || 'Velimiz'}, ${getStudentFullName(report.student)} adli ogrencimizin devamsizlik sayisi ${report.absent} olmustur. Kurum devamsizlik siniri ${threshold} gun olarak belirlenmistir. Lutfen kurumumuzla iletisime geciniz. ${institutionName ?? ''}`

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function isWithinDateRange(record, startDate, endDate) {
  const afterStart = !startDate || record.date >= startDate
  const beforeEnd = !endDate || record.date <= endDate
  return afterStart && beforeEnd
}

function createEmptyCounts() {
  return {
    present: 0,
    absent: 0,
    excused: 0,
    total: 0,
  }
}

function addStatus(counts, status) {
  if (status in counts) {
    counts[status] += 1
  }

  counts.total += 1
}

function ReportsPage() {
  const { scoped } = useInstitution()
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const activeStudents = useMemo(
    () => scoped.students.filter((student) => student.status === 'active'),
    [scoped.students],
  )
  const absenceThreshold = Number(scoped.settings?.absence_threshold) || 3
  const institutionName = scoped.settings?.institution_name || ''

  const studentById = useMemo(() => {
    return scoped.students.reduce((acc, student) => {
      acc[student.id] = student
      return acc
    }, {})
  }, [scoped.students])

  const classOptions = useMemo(() => {
    const classes = activeStudents
      .map((student) => student.class_name)
      .filter(Boolean)

    return [...new Set(classes)].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [activeStudents])

  const studentsForReports = useMemo(() => {
    return activeStudents.filter(
      (student) =>
        classFilter === 'all' || student.class_name === classFilter,
    )
  }, [activeStudents, classFilter])

  const filteredRecords = useMemo(() => {
    return scoped.attendance.filter((record) => {
      const student = studentById[record.student_id]
      const classMatch =
        classFilter === 'all' || student?.class_name === classFilter
      const statusMatch =
        statusFilter === 'all' || record.status === statusFilter

      return (
        classMatch &&
        statusMatch &&
        isWithinDateRange(record, startDate, endDate)
      )
    })
  }, [
    classFilter,
    endDate,
    scoped.attendance,
    startDate,
    statusFilter,
    studentById,
  ])

  const totals = useMemo(() => {
    return filteredRecords.reduce((acc, record) => {
      addStatus(acc, record.status)
      return acc
    }, createEmptyCounts())
  }, [filteredRecords])
  const totalPercent = getPercent(totals.total, totals.total)
  const presentPercent = getPercent(totals.present, totals.total)
  const absentPercent = getPercent(totals.absent, totals.total)
  const excusedPercent = getPercent(totals.excused, totals.total)

  const classHistory = useMemo(() => {
    const byClass = {}

    filteredRecords.forEach((record) => {
      const student = studentById[record.student_id]
      const className = student?.class_name || 'Sınıf bilgisi yok'

      if (!byClass[className]) {
        byClass[className] = createEmptyCounts()
      }

      addStatus(byClass[className], record.status)
    })

    return Object.entries(byClass)
      .map(([className, counts]) => ({ className, ...counts }))
      .sort((a, b) => a.className.localeCompare(b.className, 'tr'))
  }, [filteredRecords, studentById])

  const studentReports = useMemo(() => {
    const reports = studentsForReports.map((student) => ({
      student,
      ...createEmptyCounts(),
      records: [],
    }))
    const reportByStudent = new Map(
      reports.map((report) => [report.student.id, report]),
    )

    filteredRecords.forEach((record) => {
      const report = reportByStudent.get(record.student_id)

      if (!report) {
        return
      }

      addStatus(report, record.status)
      report.records.push(record)
    })

    return reports
      .map((report) => ({
        ...report,
        records: [...report.records].sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) =>
        getStudentFullName(a.student).localeCompare(
          getStudentFullName(b.student),
          'tr',
        ),
      )
  }, [filteredRecords, studentsForReports])

  const topAbsentees = useMemo(() => {
    return studentReports
      .filter((report) => report.absent > 0)
      .sort((a, b) => b.absent - a.absent)
      .slice(0, 5)
  }, [studentReports])

  return (
    <section className="page">
      <PageHeader
        eyebrow="Analiz"
        title="Raporlar"
        description="Sınıf, yoklama durumu ve tarih aralığına göre geçmişi inceleyin."
      />

      <form className="filter-card report-filters">
        <label>
          <span>Sınıf</span>
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
          <span>Durum</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tüm durumlar</option>
            <option value="present">Geldi</option>
            <option value="absent">Gelmedi</option>
            <option value="excused">İzinli</option>
          </select>
        </label>
        <label>
          <span>Başlangıç tarihi</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          <span>Bitiş tarihi</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
      </form>

      <div className="stat-grid report-stat-grid">
        <article className="stat-card">
          <span>Filtrelenen yoklama kaydi</span>
          <strong>{totals.total}</strong>
          <small>{totalPercent}% toplam</small>
        </article>
        <article className="stat-card accent-blue">
          <span>Geldi kaydi</span>
          <strong>{totals.present}</strong>
          <small>{presentPercent}% geldi</small>
        </article>
        <article className="stat-card accent-rose">
          <span>Gelmedi kaydi</span>
          <strong>{totals.absent}</strong>
          <small>{absentPercent}% gelmedi</small>
        </article>
        <article className="stat-card accent-amber">
          <span>Izinli kaydi</span>
          <strong>{totals.excused}</strong>
          <small>{excusedPercent}% izinli</small>
        </article>
      </div>

      <div className="report-sections">
        <section className="panel-card">
          <div className="card-row">
            <div>
              <span className="meta-label">Sınıfa göre yoklama geçmişi</span>
              <h2>Sınıf özeti</h2>
            </div>
          </div>
          <div className="mini-report-list">
            {classHistory.map((item) => (
              <article className="mini-report-card" key={item.className}>
                <strong>{item.className}</strong>
                <div className="metric-row">
                  {statusKeys.map((status) => (
                    <span key={status}>
                      {attendanceLabels[status]}
                      <b>{item[status]}</b>
                    </span>
                  ))}
                </div>
              </article>
            ))}
            {!classHistory.length && (
              <p className="empty-state">Bu filtrelerle kayıt bulunamadı.</p>
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="card-row">
            <div>
              <span className="meta-label">En çok devamsızlık</span>
              <h2>İlk 5 öğrenci</h2>
            </div>
          </div>
          <div className="mini-report-list">
            {topAbsentees.map((report, index) => (
              <article className="mini-report-card" key={report.student.id}>
                <strong>
                  {index + 1}. {getStudentFullName(report.student)}
                </strong>
                <div className="metric-row">
                  <span>
                    Sınıf
                    <b>{report.student.class_name || '-'}</b>
                  </span>
                  <span>
                    Gelmedi
                    <b>{report.absent}</b>
                  </span>
                </div>
                {report.absent > absenceThreshold && (
                  <a
                    className="whatsapp-button compact-dashboard-button"
                    href={getAbsenceWarningHref(
                      report,
                      absenceThreshold,
                      institutionName,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!report.student.parent_phone}
                  >
                    Veliye mesaj
                  </a>
                )}
              </article>
            ))}
            {!topAbsentees.length && (
              <p className="empty-state">Devamsızlık kaydı bulunamadı.</p>
            )}
          </div>
        </section>
      </div>

      <section className="report-card-list">
        <div className="list-summary">
          <span>Öğrenciye göre devamsızlık geçmişi</span>
        </div>

        <div className="card-grid">
          {studentReports.map((report) => (
            <article className="report-card compact-report-card" key={report.student.id}>
              <div className="card-row">
                <div>
                  <span className="meta-label">
                    {report.student.class_name || 'Sınıf bilgisi yok'}
                  </span>
                  <h2>{getStudentFullName(report.student)}</h2>
                </div>
              </div>

              <div className="metric-row report-metrics">
                {statusKeys.map((status) => (
                  <span key={status}>
                    {attendanceLabels[status]}
                    <b>{report[status]}</b>
                  </span>
                ))}
              </div>

              <details className="report-details">
                <summary>Detaylar</summary>
                <div className="history-list full-history-list">
                {report.records.map((record) => (
                  <span key={record.id}>
                    <b>{record.date}</b>
                    {attendanceLabels[record.status]}
                  </span>
                ))}
                {!report.records.length && <span>Kayıt yok</span>}
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default ReportsPage
