import { hexToBytes, bytesToBase64 } from './helpers'

async function getKey(): Promise<CryptoKey> {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is required')
  const keyBytes = hexToBytes(key)
  return crypto.subtle.importKey(
    'raw', keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  )
}

export async function encryptFile(data: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return combined.buffer as ArrayBuffer
}

export async function decryptFile(encrypted: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await getKey()
  const buf = new Uint8Array(encrypted)
  const iv = buf.slice(0, 12)
  const ciphertext = buf.slice(12)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
}
