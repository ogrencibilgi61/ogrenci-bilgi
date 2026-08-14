export function getStudentFullName(student) {
  const fullName = [student?.first_name, student?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || student?.full_name || 'Öğrenci'
}

export function getStudentInitial(student) {
  return getStudentFullName(student).slice(0, 1).toUpperCase()
}

export function toStudentPayload(form) {
  const firstName = form.first_name.trim()
  const lastName = form.last_name.trim()

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: [firstName, lastName].filter(Boolean).join(' ').trim(),
    class_name: form.class_name.trim(),
    ...(form.gender ? { gender: form.gender } : {}),
    parent_name: form.parent_name.trim(),
    parent_phone: form.parent_phone.trim(),
  }
}
