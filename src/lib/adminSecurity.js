export function requestAdminActionPassword(verifyPassword) {
  const password = window.prompt('Bolge idarecisi islem sifresini girin.')

  if (password === null) {
    return false
  }

  return verifyPassword(password)
}
