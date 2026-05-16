import { describe, it, expect } from 'vitest'

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

const { encrypt, decrypt, hashPin, verifyPin } = await import('../src/crypto')

describe('crypto', () => {
  it('encrypt then decrypt returns original', async () => {
    const plain = 'my-secret-password-123'
    const encrypted = await encrypt(plain)
    expect(encrypted).toBeTruthy()
    expect(encrypted).not.toBe(plain)

    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe(plain)
  })

  it('handles empty string', async () => {
    expect(await encrypt('')).toBe('')
    expect(await decrypt('')).toBe('')
  })

  it('returns error marker for tampered ciphertext', async () => {
    const result = await decrypt('this-is-not-valid-base64!!')
    expect(result).toBe('[DECRYPT_ERROR]')
  })

  it('hashPin produces salted hash in format saltHex:hashHex', async () => {
    const hash = await hashPin('1234')
    expect(hash).toContain(':')
    const [salt, hashPart] = hash.split(':')
    expect(salt).toMatch(/^[a-f0-9]+$/)
    expect(hashPart).toMatch(/^[a-f0-9]+$/)
  })

  it('verifyPin returns true for correct pin', async () => {
    const hash = await hashPin('4321')
    expect(await verifyPin('4321', hash)).toBe(true)
  })

  it('verifyPin returns false for wrong pin', async () => {
    const hash = await hashPin('4321')
    expect(await verifyPin('1234', hash)).toBe(false)
  })

  it('encrypt returns different output each time (random IV)', async () => {
    const a = await encrypt('same-value')
    const b = await encrypt('same-value')
    expect(a).not.toBe(b)
  })
})
