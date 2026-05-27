import { describe, it, expect, beforeAll } from 'vitest'

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

import * as cryptoMod from '../src/crypto'
import * as fileCrypto from '../src/file-crypto'
import * as vaultCrypto from '../src/vault-crypto'
import * as sanitizeMod from '../src/sanitize'
import * as helpers from '../src/helpers'

const { encrypt, decrypt, hashPin, verifyPin, isLegacyPinHash, isSaltedPinHash } = cryptoMod
const { encryptFile, decryptFile } = fileCrypto
const { generateSalt, encryptSecret, decryptSecret, deriveKey } = vaultCrypto
const { sanitizeInput, sanitizeFilename, isValidEmail } = sanitizeMod
const { hexToBytes, timingSafeEqual } = helpers

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

  it('throws DecryptionError for tampered ciphertext', async () => {
    await expect(decrypt('this-is-not-valid-base64!!')).rejects.toThrow()
  })

  it('throws DecryptionError for corrupted data', async () => {
    const encrypted = await encrypt('test')
    const tampered = encrypted.slice(0, -3) + 'abc'
    await expect(decrypt(tampered)).rejects.toThrow()
  })

  it('encrypt returns different output each time (random IV)', async () => {
    const a = await encrypt('same-value')
    const b = await encrypt('same-value')
    expect(a).not.toBe(b)
  })
})

describe('pin hashing', () => {
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

  it('isSaltedPinHash detects correct format', () => {
    expect(isSaltedPinHash('a'.repeat(32) + ':' + 'b'.repeat(64))).toBe(true)
    expect(isSaltedPinHash('invalid')).toBe(false)
    expect(isSaltedPinHash('a'.repeat(32) + ':' + 'b'.repeat(64) + ':extra')).toBe(false)
  })

  it('isLegacyPinHash detects SHA-256 hex', () => {
    expect(isLegacyPinHash('a'.repeat(64))).toBe(true)
    expect(isLegacyPinHash('a'.repeat(32))).toBe(false)
    expect(isLegacyPinHash('xyz')).toBe(false)
  })
})

describe('vault crypto', () => {
  const password = 'test-password-123'
  let salt: string
  let key: CryptoKey

  beforeAll(async () => {
    salt = generateSalt()
    key = await deriveKey(password, salt)
  })

  it('generateSalt produces hex string', () => {
    expect(salt).toMatch(/^[a-f0-9]{32}$/)
  })

  it('encryptSecret then decryptSecret round-trips', async () => {
    const secret = 'my-sensitive-data'
    const encrypted = await encryptSecret(secret, key)
    expect(encrypted).not.toBe(secret)
    const decrypted = await decryptSecret(encrypted, key)
    expect(decrypted).toBe(secret)
  })

  it('encryptSecret produces different output each time', async () => {
    const a = await encryptSecret('same-data', key)
    const b = await encryptSecret('same-data', key)
    expect(a).not.toBe(b)
  })

  it('wrong password fails to decrypt', async () => {
    const wrongSalt = generateSalt()
    const wrongKey = await deriveKey(password, wrongSalt)
    const encrypted = await encryptSecret('test', key)
    await expect(decryptSecret(encrypted, wrongKey)).rejects.toThrow()
  })
})

describe('file crypto', () => {
  it('encryptFile then decryptFile round-trips', async () => {
    const original = new TextEncoder().encode('hello world').buffer
    const encrypted = await encryptFile(original)
    const decrypted = await decryptFile(encrypted)
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(original))
  })

  it('produces different output each time', async () => {
    const data = new TextEncoder().encode('same-data').buffer
    const a = await encryptFile(data)
    const b = await encryptFile(data)
    expect(new Uint8Array(a)).not.toEqual(new Uint8Array(b))
  })
})

describe('sanitize', () => {
  it('strips HTML tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>hello')).toBe('alert(1)hello')
  })

  it('respects max length', () => {
    expect(sanitizeInput('hello world', 5)).toBe('hello')
  })

  it('sanitizeFilename removes special chars', () => {
    expect(sanitizeFilename('file<script>.txt')).toBe('file_script_.txt')
  })

  it('isValidEmail validates correctly', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('helpers', () => {
  it('hexToBytes converts correctly', () => {
    expect(hexToBytes('ff00')).toEqual(new Uint8Array([255, 0]))
    expect(() => hexToBytes('xyz')).toThrow()
  })

  it('timingSafeEqual compares correctly', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false)
  })
})
