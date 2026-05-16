export function sanitizeInput(value: string, maxLength: number = 500): string {
  if (!value) return ''
  const stripped = value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
  return stripped.trim().slice(0, maxLength)
}

export function sanitizePin(pin: string): string {
  return pin.replace(/\D/g, '').slice(0, 8)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
