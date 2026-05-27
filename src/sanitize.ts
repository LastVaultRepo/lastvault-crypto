export function sanitizeInput(value: string, maxLength: number = 500): string {
  if (!value) return ''
  const stripped = value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
  return stripped.trim().slice(0, maxLength)
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-() ]/g, '_').slice(0, 200)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
