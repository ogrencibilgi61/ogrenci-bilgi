import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { useInstitution } from '../context/useInstitution'

const emptyStaffForm = {
  name: '',
  phone: '',
  age: '',
}

const emptyPasswordForm = {
  password: '',
  confirmPassword: '',
}

function createLocalId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeList(value) {
  return Array.isArray(value) ? value : []
}

function SettingsPage() {
  const { scoped, session, updatePassword, updateSettings } = useInstitution()
  const settings = scoped.settings ?? {}
  const classes = normalizeList(settings.classes)
  const staffMembers = normalizeList(settings.staff_members)
  const [profileForm, setProfileForm] = useState({})
  const [className, setClassName] = useState('')
  const [staffForm, setStaffForm] = useState(emptyStaffForm)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const profile = {
    institution_name:
      profileForm.institution_name ??
      settings.institution_name ??
      session?.institutionName ??
      '',
    institution_phone:
      profileForm.institution_phone ?? settings.institution_phone ?? '',
    institution_address:
      profileForm.institution_address ?? settings.institution_address ?? '',
    absence_threshold:
      profileForm.absence_threshold ?? settings.absence_threshold ?? 3,
    institution_capacity:
      profileForm.institution_capacity ?? settings.institution_capacity ?? '',
  }

  function clearMessages() {
    setNotice('')
    setError('')
  }

  function updateProfileField(field, value) {
    setProfileForm((current) => ({ ...current, [field]: value }))
    clearMessages()
  }

  function updateStaffField(field, value) {
    setStaffForm((current) => ({ ...current, [field]: value }))
    clearMessages()
  }

  async function saveSettings(nextFields, successMessage) {
    const result = await updateSettings({
      ...settings,
      ...nextFields,
    })

    if (!result.ok) {
      setError(result.message)
      return false
    }

    setNotice(successMessage)
    return true
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    const saved = await saveSettings(
      {
        institution_name: profile.institution_name.trim(),
        institution_phone: profile.institution_phone.trim(),
        institution_address: profile.institution_address.trim(),
        absence_threshold: Number(profile.absence_threshold) || 3,
        institution_capacity: Number(profile.institution_capacity) || 0,
      },
      'Kurum profili kaydedildi.',
    )

    if (saved) {
      setProfileForm({})
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    clearMessages()

    if (passwordForm.password.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalı.')
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('Yeni şifre ve tekrar alanı aynı olmalı.')
      return
    }

    const result = await updatePassword(passwordForm.password)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setPasswordForm(emptyPasswordForm)
    setNotice('Şifre güncellendi.')
  }

  async function handleClassSubmit(event) {
    event.preventDefault()
    const nextClassName = className.trim()

    if (!nextClassName) {
      return
    }

    if (
      classes.some(
        (item) => item.toLocaleLowerCase('tr') === nextClassName.toLocaleLowerCase('tr'),
      )
    ) {
      setError('Bu sınıf zaten ekli.')
      return
    }

    const saved = await saveSettings(
      {
        classes: [...classes, nextClassName].sort((a, b) =>
          a.localeCompare(b, 'tr'),
        ),
      },
      'Sınıf eklendi.',
    )

    if (saved) {
      setClassName('')
    }
  }

  async function handleRemoveClass(removedClass) {
    await saveSettings(
      {
        classes: classes.filter((item) => item !== removedClass),
      },
      'Sınıf kaldırıldı.',
    )
  }

  async function handleStaffSubmit(event) {
    event.preventDefault()
    const nextStaff = {
      id: createLocalId(),
      name: staffForm.name.trim(),
      phone: staffForm.phone.trim(),
      age: staffForm.age.trim(),
    }

    if (!nextStaff.name || !nextStaff.phone || !nextStaff.age) {
      setError('Personel adı, numarası ve yaşı zorunlu.')
      return
    }

    const saved = await saveSettings(
      {
        staff_members: [...staffMembers, nextStaff],
      },
      'Personel eklendi.',
    )

    if (saved) {
      setStaffForm(emptyStaffForm)
    }
  }

  async function handleRemoveStaff(staffId) {
    await saveSettings(
      {
        staff_members: staffMembers.filter((staff) => staff.id !== staffId),
      },
      'Personel silindi.',
    )
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Sistem"
        title="Ayarlar"
        description="Kurum profili, şifre, sınıflar ve personel kayıtlarını buradan yönetin."
      />

      {(notice || error) && (
        <div className="settings-message-stack">
          {notice && <p className="form-success">{notice}</p>}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}

      <div className="settings-grid">
        <form className="settings-form panel-card" onSubmit={handleProfileSubmit}>
          <div>
            <span className="meta-label">Kurum profili</span>
            <h2>Kurum bilgileri</h2>
          </div>
          <label>
            <span>Kurum adı</span>
            <input
              value={profile.institution_name}
              onChange={(event) =>
                updateProfileField('institution_name', event.target.value)
              }
              placeholder="Kurum adı"
              required
            />
          </label>
          <label>
            <span>Kurum numarası</span>
            <input
              value={profile.institution_phone}
              onChange={(event) =>
                updateProfileField('institution_phone', event.target.value)
              }
              placeholder="+902121112233"
            />
          </label>
          <label>
            <span>Adres</span>
            <textarea
              value={profile.institution_address}
              onChange={(event) =>
                updateProfileField('institution_address', event.target.value)
              }
              placeholder="Kurum adresi"
            />
          </label>
          <label>
            <span>Devamsızlık gün sayısı</span>
            <input
              type="number"
              min="1"
              max="365"
              value={profile.absence_threshold}
              onChange={(event) =>
                updateProfileField('absence_threshold', event.target.value)
              }
              placeholder="3"
            />
          </label>
          <label>
            <span>Kapasite</span>
            <input
              type="number"
              min="0"
              max="10000"
              value={profile.institution_capacity}
              onChange={(event) =>
                updateProfileField('institution_capacity', event.target.value)
              }
              placeholder="120"
            />
          </label>
          <button className="primary-button" type="submit">
            Kurum profilini kaydet
          </button>
        </form>

        <form className="settings-form panel-card" onSubmit={handlePasswordSubmit}>
          <div>
            <span className="meta-label">Güvenlik</span>
            <h2>Şifre değiştir</h2>
          </div>
          <label>
            <span>Yeni şifre</span>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(event) => {
                setPasswordForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
                clearMessages()
              }}
              placeholder="Yeni şifre"
              minLength={6}
              required
            />
          </label>
          <label>
            <span>Yeni şifre tekrar</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => {
                setPasswordForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
                clearMessages()
              }}
              placeholder="Yeni şifre tekrar"
              minLength={6}
              required
            />
          </label>
          <button className="primary-button" type="submit">
            Şifreyi güncelle
          </button>
        </form>

        <section className="panel-card settings-section">
          <div>
            <span className="meta-label">Sınıflar</span>
            <h2>Sınıf ekleme</h2>
          </div>
          <form className="inline-settings-form" onSubmit={handleClassSubmit}>
            <label>
              <span>Sınıf adı</span>
              <input
                value={className}
                onChange={(event) => {
                  setClassName(event.target.value)
                  clearMessages()
                }}
                placeholder="A Grubu"
              />
            </label>
            <button className="primary-button" type="submit">
              Sınıf ekle
            </button>
          </form>
          <div className="settings-list">
            {classes.map((item) => (
              <div className="settings-list-row" key={item}>
                <strong>{item}</strong>
                <button
                  className="ghost-button danger-button"
                  type="button"
                  onClick={() => handleRemoveClass(item)}
                >
                  Sil
                </button>
              </div>
            ))}
            {!classes.length && (
              <p className="empty-state">Henüz sınıf eklenmedi.</p>
            )}
          </div>
        </section>

        <section className="panel-card settings-section">
          <div>
            <span className="meta-label">Personel</span>
            <h2>Personel listesi</h2>
          </div>
          <form className="staff-form" onSubmit={handleStaffSubmit}>
            <label>
              <span>Ad soyad</span>
              <input
                value={staffForm.name}
                onChange={(event) => updateStaffField('name', event.target.value)}
                placeholder="Ayşe Kaya"
              />
            </label>
            <label>
              <span>Numarası</span>
              <input
                value={staffForm.phone}
                onChange={(event) => updateStaffField('phone', event.target.value)}
                placeholder="+905321112233"
              />
            </label>
            <label>
              <span>Yaşı</span>
              <input
                type="number"
                min="16"
                max="90"
                value={staffForm.age}
                onChange={(event) => updateStaffField('age', event.target.value)}
                placeholder="32"
              />
            </label>
            <button className="primary-button" type="submit">
              Personel ekle
            </button>
          </form>

          <div className="settings-list">
            {staffMembers.map((staff) => (
              <div className="settings-list-row staff-row" key={staff.id}>
                <span>
                  <strong>{staff.name}</strong>
                  <small>
                    {staff.phone} · {staff.age} yaş
                  </small>
                </span>
                <button
                  className="ghost-button danger-button"
                  type="button"
                  onClick={() => handleRemoveStaff(staff.id)}
                >
                  Sil
                </button>
              </div>
            ))}
            {!staffMembers.length && (
              <p className="empty-state">Henüz personel eklenmedi.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

export default SettingsPage
