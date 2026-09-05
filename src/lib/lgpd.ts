export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

export function maskName(name: string): string {
  if (name.length <= 2) return name[0] + '*'.repeat(name.length - 1)
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}
