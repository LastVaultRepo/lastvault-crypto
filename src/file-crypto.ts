function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function getKey(): Promise<CryptoKey> {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  const keyBytes = hexToBytes(process.env.ENCRYPTION_KEY!)
  return crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptFile(data: ArrayBuffer): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return { encrypted: combined.buffer as ArrayBuffer, iv: bytesToBase64(iv) }
}

export async function decryptFile(encrypted: ArrayBuffer, ivBase64: string): Promise<ArrayBuffer> {
  const key = await getKey()
  const expectedIv = base64ToBytes(ivBase64)
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(expectedIv) },
    key,
    encrypted
  )
}
