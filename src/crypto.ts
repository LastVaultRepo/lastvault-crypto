import { hexToBytes, bytesToHex, bytesToBase64, base64ToBytes, timingSafeEqual } from './helpers'

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is required')
  return key
}

async function getKey(): Promise<CryptoKey> {
  const keyBytes = hexToBytes(getEncryptionKey())
  return crypto.subtle.importKey(
    'raw', keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  )
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return bytesToBase64(combined)
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecryptionError'
  }
}

export async function decrypt(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return ''
  const key = await getKey()
  let combined: Uint8Array
  try {
    combined = base64ToBytes(encryptedBase64)
  } catch {
    throw new DecryptionError('Failed to decrypt data — key mismatch or tampered ciphertext')
  }
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new DecryptionError('Failed to decrypt data — key mismatch or tampered ciphertext')
  }
}

const PBKDF2_ITERATIONS = 600000
const SALT_BYTES = 16
const HASH_BYTES = 32

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const saltHex = bytesToHex(salt)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin),
    { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key, HASH_BYTES * 8
  )
  return `${saltHex}:${bytesToHex(new Uint8Array(derived))}`
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length === 2) {
    const [saltHex, expectedHash] = parts
    const salt = hexToBytes(saltHex)
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(pin),
      { name: 'PBKDF2' }, false, ['deriveBits']
    )
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      key, HASH_BYTES * 8
    )
    return timingSafeEqual(new Uint8Array(derived), hexToBytes(expectedHash))
  }
  const encoded = new TextEncoder().encode(pin)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return timingSafeEqual(new Uint8Array(hash), hexToBytes(stored))
}

export function isLegacyPinHash(stored: string): boolean {
  return stored.length === 64 && /^[a-f0-9]+$/i.test(stored)
}

export function isSaltedPinHash(stored: string): boolean {
  const [saltHex, hashHex, extra] = stored.split(':')
  return !extra
    && saltHex.length === SALT_BYTES * 2
    && hashHex.length === HASH_BYTES * 2
    && /^[a-f0-9]+$/i.test(saltHex)
    && /^[a-f0-9]+$/i.test(hashHex)
}
