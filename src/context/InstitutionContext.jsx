import { useCallback, useEffect, useState } from 'react'
import { initialData } from '../data/institutionData'
import {
  getSupabaseErrorMessage,
  supabase,
  supabaseConfigError,
} from '../lib/supabase'
import { getStudentFullName } from '../lib/students'
import { InstitutionContext } from './institutionContext'

const ADMIN_KEY = 'yoklama-crm-admin'
const ADMIN_ACTION_PASSWORD_KEY = 'yoklama-crm-admin-action-password'
const DATA_KEY = 'yoklama-crm-data'
const LOGIN_DAY_KEY = 'yoklama-crm-login-day'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const emptyScopedData = {
  students: [],
  attendance: [],
  messages: [],
  message_templates: [],
  parent_notes: [],
  settings: null,
}

const defaultWhatsappTemplate =
  'Sayın {veli_adi}, {ogrenci_adi} adlı öğrencimiz {tarih} tarihinde yoklamada gelmedi olarak işaretlenmiştir. Toplam devamsızlık sayısı: {toplam_devamsizlik}. {kurum_adi}'

const defaultSettingsExtras = {
  institution_phone: '',
  institution_address: '',
  institution_capacity: 0,
  classes: [],
  staff_members: [],
  excused_student_ids: [],
}

function normalizeIdList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function getNextExcusedStudentIds(currentIds, attendanceRows) {
  const nextIds = new Set(normalizeIdList(currentIds))

  attendanceRows.forEach((record) => {
    if (record.status === 'excused') {
      nextIds.add(record.student_id)
      return
    }

    if (record.status === 'present') {
      nextIds.delete(record.student_id)
    }
  })

  return [...nextIds]
}

function isMissingColumnError(error, columnName) {
  const message = error?.message ?? ''

  return message.includes(columnName) && message.includes('Could not find')
}

function readJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => {
    const first = a.reminder_date ?? a.created_at ?? a.date ?? ''
    const second = b.reminder_date ?? b.created_at ?? b.date ?? ''
    return second.localeCompare(first)
  })
}

function sortStudents(items) {
  return [...items].sort((a, b) =>
    getStudentFullName(a).localeCompare(getStudentFullName(b), 'tr'),
  )
}

function getScopedLocalData(sourceData, institutionId) {
  return {
    students: sortStudents(
      sourceData.students.filter(
        (student) => student.institution_id === institutionId,
      ),
    ),
    attendance: sortByDateDesc(
      sourceData.attendance.filter(
        (record) => record.institution_id === institutionId,
      ),
    ),
    messages: sortByDateDesc(
      sourceData.messages.filter(
        (message) => message.institution_id === institutionId,
      ),
    ),
    message_templates: sourceData.message_templates.filter(
      (template) => template.institution_id === institutionId,
    ),
    parent_notes: sortByDateDesc(
      sourceData.parent_notes.filter(
        (note) => note.institution_id === institutionId,
      ),
    ),
    settings:
      sourceData.settings.find(
        (settings) => settings.institution_id === institutionId,
      ) ?? null,
  }
}

function createAbsenceMessage(
  student,
  date,
  templateBody,
  totalAbsences,
  institutionName,
) {
  const studentName = getStudentFullName(student)
  const template = templateBody?.trim() || defaultWhatsappTemplate
  const replacements = {
    '{ogrenci_adi}': studentName,
    '{sinif}': student?.class_name ?? '',
    '{tarih}': date,
    '{toplam_devamsizlik}': String(totalAbsences),
    '{kurum_adi}': institutionName ?? '',
    '{veli_adi}': student?.parent_name ?? '',
    '{student}': studentName,
    '{status}': 'gelmedi',
    '{date}': date,
  }

  return Object.entries(replacements).reduce(
    (message, [key, value]) => message.replaceAll(key, value),
    template,
  )

}

export function InstitutionProvider({ children }) {
  const [data, setData] = useState(() => readJson(DATA_KEY, initialData))
  const [scoped, setScoped] = useState(emptyScopedData)
  const [authSession, setAuthSession] = useState(null)
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(supabaseConfigError)
  const [isAdmin, setIsAdmin] = useState(() => readJson(ADMIN_KEY, false))
  const [adminActionPassword, setAdminActionPassword] = useState(() =>
    localStorage.getItem(ADMIN_ACTION_PASSWORD_KEY) || ADMIN_PASSWORD || '',
  )

  const clearInstitutionSession = useCallback(() => {
    setAuthSession(null)
    setSession(null)
    setScoped(emptyScopedData)
    sessionStorage.removeItem(LOGIN_DAY_KEY)
  }, [])

  const ensureDefaultSettings = useCallback(
    async (institutionId, institutionName) => {
      if (!supabase || !institutionId) {
        return null
      }

      const { data: savedSettings, error } = await supabase
        .from('settings')
        .upsert(
          {
            ...defaultSettingsExtras,
            institution_id: institutionId,
            institution_name: institutionName ?? '',
          },
          { onConflict: 'institution_id' },
        )
        .select()
        .single()

      if (error) {
        setAuthError(getSupabaseErrorMessage(error))
        return null
      }

      return savedSettings
    },
    [],
  )

  const loadInstitutionData = useCallback(
    async (institutionId, institutionName = '') => {
      if (!supabase || !institutionId) {
        setScoped(emptyScopedData)
        return
      }

      const [
        studentsResult,
        attendanceResult,
        messagesResult,
        templatesResult,
        notesResult,
        settingsResult,
      ] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('institution_id', institutionId)
          .order('full_name', { ascending: true }),
        supabase
          .from('attendance')
          .select('*')
          .eq('institution_id', institutionId)
          .order('date', { ascending: false }),
        supabase
          .from('messages')
          .select('*')
          .eq('institution_id', institutionId)
          .order('created_at', { ascending: false }),
        supabase
          .from('message_templates')
          .select('*')
          .eq('institution_id', institutionId)
          .order('created_at', { ascending: true }),
        supabase
          .from('parent_notes')
          .select('*')
          .eq('institution_id', institutionId)
          .order('created_at', { ascending: false }),
        supabase
          .from('settings')
          .select('*')
          .eq('institution_id', institutionId)
          .maybeSingle(),
      ])

      const firstError =
        studentsResult.error ||
        attendanceResult.error ||
        messagesResult.error ||
        templatesResult.error ||
        notesResult.error ||
        settingsResult.error

      if (firstError) {
        setAuthError(getSupabaseErrorMessage(firstError))
        return
      }

      const settings =
        settingsResult.data ??
        (await ensureDefaultSettings(institutionId, institutionName))

      setScoped({
        students: studentsResult.data ?? [],
        attendance: attendanceResult.data ?? [],
        messages: messagesResult.data ?? [],
        message_templates: templatesResult.data ?? [],
        parent_notes: notesResult.data ?? [],
        settings,
      })
    },
    [ensureDefaultSettings],
  )

  const loadManagerSession = useCallback(
    async (nextAuthSession) => {
      if (!supabase || !nextAuthSession?.user) {
        clearInstitutionSession()
        return
      }

      const { data: manager, error } = await supabase
        .from('institution_managers')
        .select(
          `
          institution_id,
          institutions (
            id,
            name,
            city_id,
            status,
            cities (
              id,
              name
            )
          )
        `,
        )
        .eq('user_id', nextAuthSession.user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (error) {
        setAuthError(getSupabaseErrorMessage(error))
        clearInstitutionSession()
        return
      }

      if (!manager?.institutions) {
        setAuthError('Bu kullanÄ±cÄ±ya baÄŸlÄ± aktif bir kurum bulunamadÄ±.')
        await supabase.auth.signOut()
        clearInstitutionSession()
        return
      }

      if (manager.institutions.status !== 'active') {
        setAuthError('Bu kurum aktif degil. Idareciyle iletisime gecin.')
        await supabase.auth.signOut()
        clearInstitutionSession()
        return
      }

      const nextSession = {
        userId: nextAuthSession.user.id,
        email: nextAuthSession.user.email,
        institutionId: manager.institution_id,
        institutionName: manager.institutions.name,
        cityId: manager.institutions.cities?.id ?? manager.institutions.city_id,
        cityName: manager.institutions.cities?.name ?? '',
      }

      setAuthSession(nextAuthSession)
      setSession(nextSession)
      setAuthError('')
      await loadInstitutionData(
        nextSession.institutionId,
        nextSession.institutionName,
      )
    },
    [clearInstitutionSession, loadInstitutionData],
  )

  useEffect(() => {
    let isMounted = true

    async function bootAuth() {
      if (!supabase) {
        setIsAuthLoading(false)
        return
      }

      const { data: sessionData, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setAuthError(getSupabaseErrorMessage(error))
        clearInstitutionSession()
        setIsAuthLoading(false)
        return
      }

      const storedLoginDay = sessionStorage.getItem(LOGIN_DAY_KEY)
      const todayKey = getTodayKey()

      if (sessionData.session && storedLoginDay !== todayKey) {
        await supabase.auth.signOut()
        clearInstitutionSession()
        setIsAuthLoading(false)
        return
      }

      if (sessionData.session) {
        await loadManagerSession(sessionData.session)
      }

      setIsAuthLoading(false)
    }

    bootAuth()

    const { data: listener } =
      supabase?.auth.onAuthStateChange((event, nextSession) => {
        if (event === 'SIGNED_OUT') {
          clearInstitutionSession()
          return
        }

        if (event === 'SIGNED_IN' && nextSession) {
          sessionStorage.setItem(LOGIN_DAY_KEY, getTodayKey())
          loadManagerSession(nextSession)
        }
      }) ?? { data: null }

    return () => {
      isMounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [clearInstitutionSession, loadManagerSession])

  useEffect(() => {
    writeJson(DATA_KEY, data)
  }, [data])

  useEffect(() => {
    if (!supabase || !authSession) {
      return undefined
    }

    async function ensureFreshLoginDay() {
      if (sessionStorage.getItem(LOGIN_DAY_KEY) === getTodayKey()) {
        return
      }

      await supabase.auth.signOut()
      clearInstitutionSession()
    }

    const timerId = window.setInterval(ensureFreshLoginDay, 60 * 1000)
    window.addEventListener('focus', ensureFreshLoginDay)

    return () => {
      window.clearInterval(timerId)
      window.removeEventListener('focus', ensureFreshLoginDay)
    }
  }, [authSession, clearInstitutionSession])

  async function loginInstitution(email, password) {
    if (!supabase) {
      const selectedInstitution = data.institutions.find(
        (institution) =>
          institution.id === email ||
          institution.login_email?.toLocaleLowerCase('tr') ===
            email.toLocaleLowerCase('tr') ||
          institution.name.toLocaleLowerCase('tr') ===
            email.toLocaleLowerCase('tr'),
      )
      const selectedCity = data.cities.find(
        (city) => city.id === selectedInstitution?.city_id,
      )

      if (!selectedInstitution || selectedInstitution.status !== 'active') {
        return { ok: false, message: 'Aktif kurum bulunamadı.' }
      }

      if (selectedInstitution.login_password !== password) {
        return { ok: false, message: 'Kurum şifresi hatalı.' }
      }

      const nextSession = {
        userId: 'local-manager',
        email: '',
        institutionId: selectedInstitution.id,
        institutionName: selectedInstitution.name,
        cityId: selectedInstitution.city_id,
        cityName: selectedCity?.name ?? '',
      }

      setSession(nextSession)
      setAuthError('')
      sessionStorage.setItem(LOGIN_DAY_KEY, getTodayKey())
      setScoped(getScopedLocalData(data, selectedInstitution.id))
      return { ok: true }
    }

    setAuthError('')
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        ok: false,
        message: getSupabaseErrorMessage(error),
      }
    }

    sessionStorage.setItem(LOGIN_DAY_KEY, getTodayKey())
    await loadManagerSession(loginData.session)
    return { ok: true }
  }

  async function logoutInstitution() {
    if (supabase) {
      await supabase.auth.signOut()
    }

    clearInstitutionSession()
  }

  function loginAdmin(password) {
    if (!ADMIN_PASSWORD) {
      return {
        ok: false,
        message: 'Idareci sifresi .env icinde tanimli degil.',
      }
    }

    if (password !== ADMIN_PASSWORD) {
      return { ok: false, message: 'Idareci sifresi hatali.' }
    }

    setIsAdmin(true)
    writeJson(ADMIN_KEY, true)
    return { ok: true }
  }

  function logoutAdmin() {
    setIsAdmin(false)
    localStorage.removeItem(ADMIN_KEY)
  }

  function verifyAdminActionPassword(password) {
    if (!adminActionPassword) {
      return password === ADMIN_PASSWORD
    }

    return password === adminActionPassword
  }

  function updateAdminActionPassword(nextPassword) {
    const trimmedPassword = nextPassword.trim()

    if (trimmedPassword.length < 4) {
      return {
        ok: false,
        message: 'Islem sifresi en az 4 karakter olmali.',
      }
    }

    localStorage.setItem(ADMIN_ACTION_PASSWORD_KEY, trimmedPassword)
    setAdminActionPassword(trimmedPassword)
    return { ok: true }
  }

  function addCity(name) {
    setData((current) => ({
      ...current,
      cities: [
        ...current.cities,
        {
          id: createId(),
          name,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ],
    }))
  }

  function updateCity(cityId, nextFields) {
    setData((current) => ({
      ...current,
      cities: current.cities.map((city) =>
        city.id === cityId ? { ...city, ...nextFields } : city,
      ),
    }))
  }

  function toggleCityStatus(cityId) {
    setData((current) => ({
      ...current,
      cities: current.cities.map((city) =>
        city.id === cityId
          ? {
              ...city,
              status: city.status === 'active' ? 'passive' : 'active',
            }
          : city,
      ),
    }))
  }

  function addInstitution({
    cityName,
    loginEmail,
    loginPassword,
    name,
    studentGender,
  }) {
    const now = new Date().toISOString()
    setData((current) => {
      const normalizedCityName = cityName.toLocaleLowerCase('tr')
      const existingCity = current.cities.find(
        (city) => city.name.toLocaleLowerCase('tr') === normalizedCityName,
      )
      const cityId = existingCity?.id ?? createId()
      const institutionId = createId()
      const cities = existingCity
        ? current.cities
        : [
            ...current.cities,
            {
              id: cityId,
              name: cityName,
              status: 'active',
              created_at: now,
            },
          ]

      return {
        ...current,
        cities,
        institutions: [
          ...current.institutions,
          {
            id: institutionId,
            city_id: cityId,
            name,
            login_email: loginEmail,
            login_password: loginPassword,
            student_gender: studentGender,
            status: 'active',
            created_at: now,
            updated_at: now,
          },
        ],
        settings: [
          ...current.settings,
          {
            id: createId(),
            ...defaultSettingsExtras,
            institution_id: institutionId,
            institution_name: name,
            absence_threshold: 3,
            updated_at: now,
          },
        ],
      }
    })
  }

  function updateInstitution(institutionId, nextFields) {
    setData((current) => ({
      ...current,
      institutions: current.institutions.map((institution) =>
        institution.id === institutionId
          ? {
              ...institution,
              ...nextFields,
              updated_at: new Date().toISOString(),
            }
          : institution,
      ),
      settings: current.settings.map((settings) =>
        settings.institution_id === institutionId && nextFields.name
          ? { ...settings, institution_name: nextFields.name }
          : settings,
      ),
    }))
  }

  function toggleInstitutionStatus(institutionId) {
    setData((current) => ({
      ...current,
      institutions: current.institutions.map((institution) =>
        institution.id === institutionId
          ? {
              ...institution,
              status:
                institution.status === 'active' ? 'passive' : 'active',
              updated_at: new Date().toISOString(),
            }
          : institution,
      ),
    }))
  }

  function archiveInstitution(institutionId) {
    setData((current) => ({
      ...current,
      institutions: current.institutions.map((institution) =>
        institution.id === institutionId
          ? {
              ...institution,
              status: 'archived',
              updated_at: new Date().toISOString(),
            }
          : institution,
      ),
    }))
  }

  function activateInstitution(institutionId) {
    setData((current) => ({
      ...current,
      institutions: current.institutions.map((institution) =>
        institution.id === institutionId
          ? {
              ...institution,
              status: 'active',
              updated_at: new Date().toISOString(),
            }
          : institution,
      ),
    }))
  }

  function deleteInstitutionForever(institutionId) {
    setData((current) => ({
      ...current,
      attendance: current.attendance.filter(
        (record) => record.institution_id !== institutionId,
      ),
      institutions: current.institutions.filter(
        (institution) => institution.id !== institutionId,
      ),
      messages: current.messages.filter(
        (message) => message.institution_id !== institutionId,
      ),
      message_templates: current.message_templates.filter(
        (template) => template.institution_id !== institutionId,
      ),
      parent_notes: current.parent_notes.filter(
        (note) => note.institution_id !== institutionId,
      ),
      settings: current.settings.filter(
        (settings) => settings.institution_id !== institutionId,
      ),
      students: current.students.filter(
        (student) => student.institution_id !== institutionId,
      ),
    }))
  }

  const removeEmptyCities = useCallback(() => {
    setData((current) => {
      const usedCityIds = new Set(
        current.institutions.map((institution) => institution.city_id),
      )
      const cities = current.cities.filter((city) => usedCityIds.has(city.id))

      if (cities.length === current.cities.length) {
        return current
      }

      return { ...current, cities }
    })
  }, [])

  async function addStudent(nextStudent) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const insertedStudent = {
        id: createId(),
        ...nextStudent,
        institution_id: session.institutionId,
        status: nextStudent.status ?? 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setData((current) => ({
        ...current,
        students: sortStudents([...current.students, insertedStudent]),
      }))
      setScoped((current) => ({
        ...current,
        students: sortStudents([...current.students, insertedStudent]),
      }))
      return { ok: true }
    }

    const studentPayload = {
      ...nextStudent,
      institution_id: session.institutionId,
      status: nextStudent.status ?? 'active',
    }
    let { data: insertedStudent, error } = await supabase
      .from('students')
      .insert(studentPayload)
      .select()
      .single()

    if (error && nextStudent.gender && isMissingColumnError(error, 'gender')) {
      const fallbackPayload = { ...studentPayload }
      delete fallbackPayload.gender
      const fallbackResult = await supabase
        .from('students')
        .insert(fallbackPayload)
        .select()
        .single()

      insertedStudent = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      students: sortStudents([...current.students, insertedStudent]),
    }))
    return { ok: true }
  }

  async function updateStudent(studentId, nextStudent) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const updatedAt = new Date().toISOString()
      const existingStudent = scoped.students.find(
        (student) => student.id === studentId,
      )

      if (!existingStudent) {
        return { ok: false, message: 'Öğrenci bulunamadı.' }
      }

      const updatedStudent = {
        ...existingStudent,
        ...nextStudent,
        updated_at: updatedAt,
      }

      setData((current) => ({
        ...current,
        students: sortStudents(
          current.students.map((student) =>
            student.id === studentId &&
            student.institution_id === session.institutionId
              ? updatedStudent
              : student,
          ),
        ),
      }))

      setScoped((current) => ({
        ...current,
        students: sortStudents(
          current.students.map((student) =>
            student.id === studentId ? updatedStudent : student,
          ),
        ),
      }))
      return { ok: true }
    }

    const { data: updatedStudent, error } = await supabase
      .from('students')
      .update(nextStudent)
      .eq('id', studentId)
      .eq('institution_id', session.institutionId)
      .select()
      .single()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      students: sortStudents(
        current.students.map((student) =>
          student.id === studentId ? updatedStudent : student,
        ),
      ),
    }))
    return { ok: true }
  }

  async function deactivateStudent(studentId) {
    return updateStudent(studentId, { status: 'inactive' })
  }

  async function archiveStudent(studentId, exitReason) {
    return updateStudent(studentId, {
      status: exitReason,
      exit_reason: exitReason,
      exited_at: new Date().toISOString(),
    })
  }

  async function activateStudent(studentId) {
    return updateStudent(studentId, {
      status: 'active',
      exit_reason: null,
      exited_at: null,
    })
  }

  async function deleteStudent(studentId) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      setData((current) => ({
        ...current,
        students: current.students.filter(
          (student) =>
            student.id !== studentId ||
            student.institution_id !== session.institutionId,
        ),
        attendance: current.attendance.filter(
          (record) => record.student_id !== studentId,
        ),
        messages: current.messages.filter(
          (message) => message.student_id !== studentId,
        ),
        parent_notes: current.parent_notes.filter(
          (note) => note.student_id !== studentId,
        ),
      }))
      setScoped((current) => ({
        ...current,
        students: current.students.filter((student) => student.id !== studentId),
        attendance: current.attendance.filter(
          (record) => record.student_id !== studentId,
        ),
        messages: current.messages.filter(
          (message) => message.student_id !== studentId,
        ),
        parent_notes: current.parent_notes.filter(
          (note) => note.student_id !== studentId,
        ),
      }))
      return { ok: true }
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('institution_id', session.institutionId)

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      students: current.students.filter((student) => student.id !== studentId),
      attendance: current.attendance.filter(
        (record) => record.student_id !== studentId,
      ),
      messages: current.messages.filter(
        (message) => message.student_id !== studentId,
      ),
      parent_notes: current.parent_notes.filter(
        (note) => note.student_id !== studentId,
      ),
    }))
    return { ok: true }
  }

  async function saveAttendance(studentId, date, status) {
    return saveAttendanceBatch([{ student_id: studentId, date, status }])
  }

  async function saveAttendanceBatch(records) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const previousByStudentDate = scoped.attendance.reduce((acc, record) => {
        acc[`${record.student_id}-${record.date}`] = record.status
        return acc
      }, {})
      const attendanceRows = records.map((record) => ({
        id:
          scoped.attendance.find(
            (item) =>
              item.student_id === record.student_id && item.date === record.date,
          )?.id ?? createId(),
        institution_id: session.institutionId,
        student_id: record.student_id,
        date: record.date,
        status: record.status,
        created_at: new Date().toISOString(),
      }))
      const insertedMessages = attendanceRows
        .filter((record) => {
          const previousStatus =
            previousByStudentDate[`${record.student_id}-${record.date}`]
          return record.status === 'absent' && previousStatus !== 'absent'
        })
        .map((record) => {
          const student = scoped.students.find(
            (item) => item.id === record.student_id,
          )
          const template = scoped.message_templates[0]
          const previousAbsenceCount = scoped.attendance.filter(
            (item) =>
              item.student_id === record.student_id &&
              item.date !== record.date &&
              item.status === 'absent',
          ).length

          return {
            id: createId(),
            institution_id: session.institutionId,
            student_id: record.student_id,
            attendance_date: record.date,
            body: createAbsenceMessage(
              student,
              record.date,
              template?.body,
              previousAbsenceCount + 1,
              scoped.settings?.institution_name || session.institutionName,
            ),
            status: 'hazir',
            sent_at: null,
            created_at: new Date().toISOString(),
          }
        })

      setData((current) => {
        const savedKeys = new Set(
          attendanceRows.map((record) => `${record.student_id}-${record.date}`),
        )

        return {
          ...current,
          attendance: sortByDateDesc([
            ...current.attendance.filter(
              (record) =>
                record.institution_id !== session.institutionId ||
                !savedKeys.has(`${record.student_id}-${record.date}`),
            ),
            ...attendanceRows,
          ]),
          messages: sortByDateDesc([...insertedMessages, ...current.messages]),
        }
      })
      setScoped((current) => {
        const savedKeys = new Set(
          attendanceRows.map((record) => `${record.student_id}-${record.date}`),
        )

        return {
          ...current,
          attendance: sortByDateDesc([
            ...current.attendance.filter(
              (record) => !savedKeys.has(`${record.student_id}-${record.date}`),
            ),
            ...attendanceRows,
          ]),
          messages: insertedMessages.length
            ? sortByDateDesc([...insertedMessages, ...current.messages])
            : current.messages,
        }
      })
      await updateExcusedStudentIds(
        getNextExcusedStudentIds(
          scoped.settings?.excused_student_ids,
          attendanceRows,
        ),
      )
      return { ok: true, messageCount: insertedMessages.length }
    }

    const attendanceRows = records.map((record) => ({
      institution_id: session.institutionId,
      student_id: record.student_id,
      date: record.date,
      status: record.status,
    }))
    const previousByStudentDate = scoped.attendance.reduce((acc, record) => {
      acc[`${record.student_id}-${record.date}`] = record.status
      return acc
    }, {})

    const { data: savedAttendance, error } = await supabase
      .from('attendance')
      .upsert(attendanceRows, { onConflict: 'institution_id,student_id,date' })
      .select()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    const absenceMessages = attendanceRows
      .filter((record) => {
        const previousStatus =
          previousByStudentDate[`${record.student_id}-${record.date}`]
        return record.status === 'absent' && previousStatus !== 'absent'
      })
      .map((record) => {
        const student = scoped.students.find(
          (item) => item.id === record.student_id,
        )
        const template = scoped.message_templates[0]
        const previousAbsenceCount = scoped.attendance.filter(
          (item) =>
            item.student_id === record.student_id &&
            item.date !== record.date &&
            item.status === 'absent',
        ).length

        return {
          institution_id: session.institutionId,
          student_id: record.student_id,
          attendance_date: record.date,
          body: createAbsenceMessage(
            student,
            record.date,
            template?.body,
            previousAbsenceCount + 1,
            scoped.settings?.institution_name || session.institutionName,
          ),
          status: 'hazir',
        }
      })

    let insertedMessages = []

    if (absenceMessages.length) {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert(absenceMessages)
        .select()

      if (messageError) {
        return { ok: false, message: getSupabaseErrorMessage(messageError) }
      }

      insertedMessages = messageData ?? []
    }

    setScoped((current) => {
      const savedByKey = new Map(
        (savedAttendance ?? []).map((record) => [
          `${record.student_id}-${record.date}`,
          record,
        ]),
      )
      const existingKeys = new Set()
      const attendance = current.attendance.map((record) => {
        const key = `${record.student_id}-${record.date}`
        const savedRecord = savedByKey.get(key)

        if (!savedRecord) {
          return record
        }

        existingKeys.add(key)
        return savedRecord
      })
      const newAttendance = (savedAttendance ?? []).filter(
        (record) => !existingKeys.has(`${record.student_id}-${record.date}`),
      )

      return {
        ...current,
        attendance: sortByDateDesc([...newAttendance, ...attendance]),
        messages: insertedMessages.length
          ? sortByDateDesc([...insertedMessages, ...current.messages])
          : current.messages,
      }
    })
    await updateExcusedStudentIds(
      getNextExcusedStudentIds(
        scoped.settings?.excused_student_ids,
        attendanceRows,
      ),
    )
    return { ok: true, messageCount: insertedMessages.length }
  }

  async function addMessage(nextMessage) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const insertedMessage = {
        id: createId(),
        ...nextMessage,
        institution_id: session.institutionId,
        status: nextMessage.status ?? 'hazir',
        created_at: new Date().toISOString(),
      }

      setData((current) => ({
        ...current,
        messages: sortByDateDesc([insertedMessage, ...current.messages]),
      }))
      setScoped((current) => ({
        ...current,
        messages: sortByDateDesc([insertedMessage, ...current.messages]),
      }))
      return { ok: true }
    }

    const { data: insertedMessage, error } = await supabase
      .from('messages')
      .insert({
        ...nextMessage,
        institution_id: session.institutionId,
        status: nextMessage.status ?? 'hazir',
      })
      .select()
      .single()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      messages: sortByDateDesc([insertedMessage, ...current.messages]),
    }))
    return { ok: true }
  }

  async function markMessageSent(messageId) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const sentAt = new Date().toISOString()
      const existingMessage = scoped.messages.find(
        (message) => message.id === messageId,
      )

      if (!existingMessage) {
        return { ok: false, message: 'Mesaj bulunamadı.' }
      }

      const updatedMessage = {
        ...existingMessage,
        status: 'gonderildi',
        sent_at: sentAt,
      }

      setData((current) => ({
        ...current,
        messages: sortByDateDesc(
          current.messages.map((message) =>
            message.id === messageId &&
            message.institution_id === session.institutionId
              ? updatedMessage
              : message,
          ),
        ),
      }))

      setScoped((current) => ({
        ...current,
        messages: sortByDateDesc(
          current.messages.map((message) =>
            message.id === messageId ? updatedMessage : message,
          ),
        ),
      }))
      return { ok: true }
    }

    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({
        status: 'gonderildi',
        sent_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('institution_id', session.institutionId)
      .select()
      .single()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      messages: sortByDateDesc(
        current.messages.map((message) =>
          message.id === messageId ? updatedMessage : message,
        ),
      ),
    }))
    return { ok: true }
  }

  async function addMessageTemplate(nextTemplate) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const insertedTemplate = {
        id: createId(),
        ...nextTemplate,
        institution_id: session.institutionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setData((current) => ({
        ...current,
        message_templates: [...current.message_templates, insertedTemplate],
      }))
      setScoped((current) => ({
        ...current,
        message_templates: [...current.message_templates, insertedTemplate],
      }))
      return { ok: true }
    }

    const { data: insertedTemplate, error } = await supabase
      .from('message_templates')
      .insert({
        ...nextTemplate,
        institution_id: session.institutionId,
      })
      .select()
      .single()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      message_templates: [...current.message_templates, insertedTemplate],
    }))
    return { ok: true }
  }

  async function updateMessageTemplate(templateId, nextTemplate) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const updatedAt = new Date().toISOString()
      const existingTemplate = scoped.message_templates.find(
        (template) => template.id === templateId,
      )

      if (!existingTemplate) {
        return { ok: false, message: 'Şablon bulunamadı.' }
      }

      const updatedTemplate = {
        ...existingTemplate,
        ...nextTemplate,
        updated_at: updatedAt,
      }

      setData((current) => ({
        ...current,
        message_templates: current.message_templates.map((template) =>
          template.id === templateId &&
          template.institution_id === session.institutionId
            ? updatedTemplate
            : template,
        ),
      }))

      setScoped((current) => ({
        ...current,
        message_templates: current.message_templates.map((template) =>
          template.id === templateId ? updatedTemplate : template,
        ),
      }))
      return { ok: true }
    }

    const { data: updatedTemplate, error } = await supabase
      .from('message_templates')
      .update(nextTemplate)
      .eq('id', templateId)
      .eq('institution_id', session.institutionId)
      .select()
      .single()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      message_templates: current.message_templates.map((template) =>
        template.id === templateId ? updatedTemplate : template,
      ),
    }))
    return { ok: true }
  }

  async function deleteMessageTemplate(templateId) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      setData((current) => ({
        ...current,
        message_templates: current.message_templates.filter(
          (template) =>
            template.id !== templateId ||
            template.institution_id !== session.institutionId,
        ),
      }))
      setScoped((current) => ({
        ...current,
        message_templates: current.message_templates.filter(
          (template) => template.id !== templateId,
        ),
      }))
      return { ok: true }
    }

    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', templateId)
      .eq('institution_id', session.institutionId)

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      message_templates: current.message_templates.filter(
        (template) => template.id !== templateId,
      ),
    }))
    return { ok: true }
  }

  async function addParentNote(nextNote) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const insertedNote = {
        id: createId(),
        ...nextNote,
        institution_id: session.institutionId,
        created_at: new Date().toISOString(),
      }

      setData((current) => ({
        ...current,
        parent_notes: sortByDateDesc([insertedNote, ...current.parent_notes]),
      }))
      setScoped((current) => ({
        ...current,
        parent_notes: sortByDateDesc([insertedNote, ...current.parent_notes]),
      }))
      return { ok: true }
    }

    const { data: insertedNote, error } = await supabase
      .from('parent_notes')
      .insert({
        ...nextNote,
        institution_id: session.institutionId,
      })
      .select()
      .single()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      parent_notes: sortByDateDesc([insertedNote, ...current.parent_notes]),
    }))
    return { ok: true }
  }

  async function updateExcusedStudentIds(nextStudentIds) {
    return updateSettings({
      excused_student_ids: [...new Set(normalizeIdList(nextStudentIds))],
    })
  }

  async function updateSettings(nextSettings) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      const savedSettings = {
        id: nextSettings.id ?? scoped.settings?.id ?? createId(),
        ...defaultSettingsExtras,
        ...scoped.settings,
        ...nextSettings,
        institution_id: session.institutionId,
        updated_at: new Date().toISOString(),
      }

      setData((current) => {
        const hasSettings = current.settings.some(
          (settings) => settings.institution_id === session.institutionId,
        )

        return {
          ...current,
          settings: hasSettings
            ? current.settings.map((settings) =>
                settings.institution_id === session.institutionId
                  ? savedSettings
                  : settings,
              )
            : [...current.settings, savedSettings],
          institutions: current.institutions.map((institution) =>
            institution.id === session.institutionId &&
            savedSettings.institution_name
              ? { ...institution, name: savedSettings.institution_name }
              : institution,
          ),
        }
      })
      setScoped((current) => ({ ...current, settings: savedSettings }))
      setSession((current) =>
        current && savedSettings.institution_name
          ? { ...current, institutionName: savedSettings.institution_name }
          : current,
      )
      return { ok: true }
    }

    const { data: savedSettings, error } = await supabase
      .from('settings')
      .upsert(
        {
          ...nextSettings,
          institution_id: session.institutionId,
        },
        { onConflict: 'institution_id' },
      )
      .select()
      .single()

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({ ...current, settings: savedSettings }))
    setSession((current) =>
      current && savedSettings.institution_name
        ? { ...current, institutionName: savedSettings.institution_name }
        : current,
    )
    return { ok: true }
  }

  async function deleteParentNote(noteId) {
    if (!supabase || !session?.institutionId) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      setData((current) => ({
        ...current,
        parent_notes: current.parent_notes.filter(
          (note) =>
            note.id !== noteId || note.institution_id !== session.institutionId,
        ),
      }))
      setScoped((current) => ({
        ...current,
        parent_notes: current.parent_notes.filter((note) => note.id !== noteId),
      }))
      return { ok: true }
    }

    const { error } = await supabase
      .from('parent_notes')
      .delete()
      .eq('id', noteId)
      .eq('institution_id', session.institutionId)

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    setScoped((current) => ({
      ...current,
      parent_notes: current.parent_notes.filter((note) => note.id !== noteId),
    }))
    return { ok: true }
  }

  async function updatePassword(nextPassword) {
    if (!supabase || !authSession) {
      if (!session?.institutionId) {
        return { ok: false, message: 'Önce kurum girişi yapın.' }
      }

      setData((current) => ({
        ...current,
        institutions: current.institutions.map((institution) =>
          institution.id === session.institutionId
            ? { ...institution, login_password: nextPassword }
            : institution,
        ),
      }))
      return { ok: true }
    }

    const { error } = await supabase.auth.updateUser({
      password: nextPassword,
    })

    if (error) {
      return { ok: false, message: getSupabaseErrorMessage(error) }
    }

    return { ok: true }
  }

  const value = {
    data,
    scoped,
    session,
    authSession,
    authError,
    adminActionPassword,
    isAuthLoading,
    isAdmin,
    isSupabaseConfigured: Boolean(supabase),
    supabaseConfigError,
    loginInstitution,
    logoutInstitution,
    loginAdmin,
    logoutAdmin,
    verifyAdminActionPassword,
    updateAdminActionPassword,
    addCity,
    updateCity,
    toggleCityStatus,
    addInstitution,
    updateInstitution,
    toggleInstitutionStatus,
    archiveInstitution,
    activateInstitution,
    deleteInstitutionForever,
    removeEmptyCities,
    addStudent,
    updateStudent,
    deactivateStudent,
    archiveStudent,
    activateStudent,
    deleteStudent,
    saveAttendance,
    saveAttendanceBatch,
    addMessage,
    markMessageSent,
    addMessageTemplate,
    updateMessageTemplate,
    deleteMessageTemplate,
    addParentNote,
    deleteParentNote,
    updateExcusedStudentIds,
    updateSettings,
    updatePassword,
    refreshInstitutionData: () =>
      supabase
        ? loadInstitutionData(session?.institutionId)
        : setScoped(getScopedLocalData(data, session?.institutionId)),
  }

  return (
    <InstitutionContext.Provider value={value}>
      {children}
    </InstitutionContext.Provider>
  )
}
