function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function getKey(): Promise<CryptoKey> {
  const keyBytes = hexToBytes(process.env.ENCRYPTION_KEY!)
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  return crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return bytesToBase64(combined)
}

export async function decrypt(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return ''
  try {
    const key = await getKey()
    const combined = base64ToBytes(encryptedBase64)
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return '[DECRYPT_ERROR]'
  }
}

const PBKDF2_ITERATIONS = 600000
const SALT_BYTES = 16
const HASH_BYTES = 32

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const saltHex = bytesToHex(salt)

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    HASH_BYTES * 8
  )

  return `${saltHex}:${bytesToHex(new Uint8Array(derived))}`
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length === 2) {
    const [saltHex, expectedHash] = parts
    const salt = hexToBytes(saltHex)
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      key,
      HASH_BYTES * 8
    )
    const computedHash = bytesToHex(new Uint8Array(derived))
    return computedHash === expectedHash
  }

  const encoded = new TextEncoder().encode(pin)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return bytesToHex(new Uint8Array(hash)) === stored
}
