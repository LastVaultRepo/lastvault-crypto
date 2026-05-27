const PBKDF2_ITERATIONS = 600000

export async function deriveKey(password: string, saltHex: string): Promise<CryptoKey> {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptSecret(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  let binary = ''
  for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i])
  return btoa(binary)
}

export async function decryptSecret(encoded: string, key: CryptoKey): Promise<string> {
  const binary = atob(encoded)
  const combined = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
}
