import { useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'
import { attendanceLabels } from '../data/institutionData'
import { getStudentFullName } from '../lib/students'

const emptyTemplateForm = {
  title: '',
  body: '',
}

const templateVariables = [
  '{veli_adi}',
  '{ogrenci_adi}',
  '{sinif}',
  '{tarih}',
  '{toplam_devamsizlik}',
  '{kurum_adi}',
]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

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

function buildMessage(templateBody, student, date, absenceCount, institutionName) {
  const studentName = getStudentFullName(student)
  const replacements = {
    '{veli_adi}': student?.parent_name ?? '',
    '{ogrenci_adi}': studentName,
    '{sinif}': student?.class_name ?? '',
    '{tarih}': date,
    '{toplam_devamsizlik}': String(absenceCount),
    '{kurum_adi}': institutionName ?? '',
  }

  return Object.entries(replacements).reduce(
    (message, [key, value]) => message.replaceAll(key, value),
    templateBody,
  )
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function MessagesPage() {
  const {
    addMessageTemplate,
    deleteMessageTemplate,
    scoped,
    session,
    updateMessageTemplate,
  } = useInstitution()
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm)
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [messageDate, setMessageDate] = useState(getTodayKey)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const activeStudents = useMemo(
    () => scoped.students.filter((student) => student.status === 'active'),
    [scoped.students],
  )

  const classOptions = useMemo(() => {
    const classes = activeStudents
      .map((student) => student.class_name)
      .filter(Boolean)

    return [...new Set(classes)].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [activeStudents])

  const selectedTemplate =
    scoped.message_templates.find(
      (template) => template.id === selectedTemplateId,
    ) ?? scoped.message_templates[0]
  const templateBody =
    selectedTemplate?.body ||
    'Sayin {veli_adi}, {ogrenci_adi} icin bilgilendirme mesajidir. {kurum_adi}'
  const statusByStudent = useMemo(() => {
    return scoped.attendance
      .filter((record) => record.date === messageDate)
      .reduce((acc, record) => {
        acc[record.student_id] = record.status
        return acc
      }, {})
  }, [messageDate, scoped.attendance])

  const filteredStudents = useMemo(() => {
    return activeStudents.filter((student) => {
      const classMatch =
        classFilter === 'all' || student.class_name === classFilter
      const status = statusByStudent[student.id] ?? 'unmarked'
      const statusMatch = statusFilter === 'all' || status === statusFilter

      return classMatch && statusMatch
    })
  }, [activeStudents, classFilter, statusByStudent, statusFilter])

  const recipientsWithPhone = useMemo(
    () =>
      filteredStudents.filter((student) =>
        Boolean(normalizePhoneForWhatsApp(student.parent_phone)),
      ),
    [filteredStudents],
  )

  function updateTemplateField(field, value) {
    setTemplateForm((current) => ({ ...current, [field]: value }))
    setNotice('')
    setError('')
  }

  function appendVariable(variable) {
    setTemplateForm((current) => ({
      ...current,
      body: `${current.body}${current.body ? ' ' : ''}${variable}`,
    }))
    setNotice('')
    setError('')
  }

  function resetTemplateForm() {
    setTemplateForm(emptyTemplateForm)
    setEditingTemplateId(null)
  }

  function handleEditTemplate(template) {
    setTemplateForm({
      title: template.title ?? '',
      body: template.body ?? '',
    })
    setEditingTemplateId(template.id)
    setNotice('')
    setError('')
  }

  async function handleTemplateSubmit(event) {
    event.preventDefault()
    const payload = {
      title: templateForm.title.trim(),
      body: templateForm.body.trim(),
    }
    const result = editingTemplateId
      ? await updateMessageTemplate(editingTemplateId, payload)
      : await addMessageTemplate(payload)

    if (!result.ok) {
      setError(result.message)
      return
    }

    resetTemplateForm()
    setNotice(
      editingTemplateId ? 'Mesaj sablonu guncellendi.' : 'Mesaj sablonu eklendi.',
    )
  }

  async function handleDeleteTemplate(template) {
    const confirmed = window.confirm(`"${template.title}" sablonu silinsin mi?`)

    if (!confirmed) {
      return
    }

    const result = await deleteMessageTemplate(template.id)

    if (!result.ok) {
      setError(result.message)
      return
    }

    if (editingTemplateId === template.id) {
      resetTemplateForm()
    }

    setNotice('Mesaj sablonu silindi.')
  }

  function getWhatsappHref(student) {
    const phone = normalizePhoneForWhatsApp(student.parent_phone)

    if (!phone) {
      return '#'
    }

    const absenceCount = scoped.attendance.filter(
      (record) => record.student_id === student.id && record.status === 'absent',
    ).length
    const body = buildMessage(
      templateBody,
      student,
      messageDate,
      absenceCount,
      scoped.settings?.institution_name || session.institutionName,
    )

    return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`
  }

  async function handleCopyBroadcastNumbers() {
    setNotice('')
    setError('')

    if (!recipientsWithPhone.length) {
      setError('Bu filtrelerde telefon numarasi olan alici bulunamadi.')
      return
    }

    const numbers = recipientsWithPhone
      .map((student) => normalizePhoneForWhatsApp(student.parent_phone))
      .join('\n')

    try {
      await copyText(numbers)
      setNotice(
        `${recipientsWithPhone.length} veli telefonu kopyalandi. WhatsApp toplu mesaj listesi olustururken kullanabilirsiniz.`,
      )
    } catch {
      setError(
        'Telefon listesi panoya kopyalanamadi. Tarayici izinlerini kontrol edip tekrar deneyin.',
      )
    }
  }

  function handleIndividualBulkSend() {
    setNotice('')
    setError('')

    if (!recipientsWithPhone.length) {
      setError('Bu filtrelerde telefon numarasi olan alici bulunamadi.')
      return
    }

    const openedCount = recipientsWithPhone.reduce((count, student) => {
      const popup = window.open(getWhatsappHref(student), '_blank')

      if (popup) {
        popup.opener = null
        return count + 1
      }

      return count
    }, 0)

    if (openedCount < recipientsWithPhone.length) {
      setError(
        `Tarayici ${openedCount} mesaji acti, ${recipientsWithPhone.length - openedCount} mesaji engelledi. Bu site icin pop-up izni verip tekrar deneyin.`,
      )
      return
    }

    setNotice(
      `${recipientsWithPhone.length} veli icin ayri WhatsApp mesaji hazirlandi. Alicilar birbirini gormez.`,
    )
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Veli iletisimi"
        title="Mesajlar"
        description="Mesaj sablonlarini hazirlayin, sonra WhatsApp toplu mesaj listenize hazir metinle gecin."
      />

      <form className="settings-form panel-card" onSubmit={handleTemplateSubmit}>
        <label>
          <span>Sablon adi</span>
          <input
            value={templateForm.title}
            onChange={(event) => updateTemplateField('title', event.target.value)}
            placeholder="Devamsizlik bildirimi"
            required
          />
        </label>
        <label>
          <span>Mesaj metni</span>
          <textarea
            value={templateForm.body}
            onChange={(event) => updateTemplateField('body', event.target.value)}
            rows="6"
            placeholder="Sayin {veli_adi}, {ogrenci_adi} adli ogrencimiz {tarih} tarihinde yoklamada gelmedi olarak isaretlenmistir."
            required
          />
        </label>

        <div className="variable-panel">
          <span className="meta-label">Kullanilabilir degiskenler</span>
          <div className="variable-list">
            {templateVariables.map((variable) => (
              <button
                className="variable-button"
                key={variable}
                type="button"
                onClick={() => appendVariable(variable)}
              >
                {variable}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            {editingTemplateId ? 'Sablonu guncelle' : 'Sablon ekle'}
          </button>
          {editingTemplateId && (
            <button
              className="ghost-button"
              type="button"
              onClick={resetTemplateForm}
            >
              Vazgec
            </button>
          )}
        </div>
      </form>

      {notice && <p className="form-success page-message">{notice}</p>}
      {error && <p className="form-error page-message">{error}</p>}

      <section className="panel-card message-template-panel">
        <div className="card-row">
          <div>
            <span className="meta-label">Mesajlar</span>
            <h2>Veli mesajlari</h2>
          </div>
          <span className="count-pill">
            {scoped.message_templates.length} sablon
          </span>
        </div>
        <div className="template-list">
          {scoped.message_templates.map((template) => (
            <article className="mini-report-card" key={template.id}>
              <strong>{template.title}</strong>
              <p>{template.body}</p>
              <div className="student-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleEditTemplate(template)}
                >
                  Duzenle
                </button>
                <button
                  className="ghost-button danger-button"
                  type="button"
                  onClick={() => handleDeleteTemplate(template)}
                >
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
        {!scoped.message_templates.length && (
          <p className="empty-state">
            Henuz mesaj sablonu yok. Ustte bir sablon ekleyerek toplu mesajlari
            hizlandirabilirsiniz.
          </p>
        )}
      </section>

      <section className="panel-card message-template-panel">
        <div className="card-row">
          <div>
            <span className="meta-label">Toplu mesaj gonderme</span>
            <h2>Alicilar</h2>
          </div>
          <span className="count-pill">{filteredStudents.length} veli</span>
        </div>

        <form className="filter-card bulk-message-filters">
          <label>
            <span>Sablon</span>
            <select
              value={selectedTemplate?.id ?? ''}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              {scoped.message_templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sinif</span>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="all">Tum siniflar</option>
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
              value={messageDate}
              onChange={(event) => setMessageDate(event.target.value)}
            />
          </label>
          <label>
            <span>Durum</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tum durumlar</option>
              <option value="present">Geldi</option>
              <option value="absent">Gelmedi</option>
              <option value="excused">Izinli</option>
              <option value="unmarked">Isaretlenmedi</option>
            </select>
          </label>
        </form>

        <div className="bulk-message-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleCopyBroadcastNumbers}
            disabled={!recipientsWithPhone.length}
          >
            Telefonlari kopyala
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={handleIndividualBulkSend}
            disabled={!recipientsWithPhone.length}
          >
            Kisiye ozel ayri mesajlari ac
          </button>
        </div>

        <div className="card-grid">
          {filteredStudents.map((student) => {
            const status = statusByStudent[student.id] ?? 'unmarked'
            const hasPhone = Boolean(normalizePhoneForWhatsApp(student.parent_phone))

            return (
              <article className="message-card" key={student.id}>
                <div className="card-row">
                  <div>
                    <span className="meta-label">
                      {student.class_name || 'Sinif bilgisi yok'}
                    </span>
                    <h2>{getStudentFullName(student)}</h2>
                  </div>
                  <span className={`status-pill ${status}`}>
                    {status === 'unmarked'
                      ? 'Isaretlenmedi'
                      : attendanceLabels[status]}
                  </span>
                </div>
                <div className="info-stack">
                  <span>Veli: {student.parent_name || '-'}</span>
                  <span>{student.parent_phone || '-'}</span>
                  {!hasPhone && <span>Telefon numarasi eksik.</span>}
                </div>
              </article>
            )
          })}
        </div>
        {!filteredStudents.length && (
          <p className="empty-state panel-empty">
            Bu filtrelerle mesaj gonderilecek veli bulunamadi.
          </p>
        )}
      </section>
    </section>
  )
}

export default MessagesPage
