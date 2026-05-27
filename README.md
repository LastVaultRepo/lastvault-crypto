# LastVault — Cryptographic Core

This repository contains the open-source cryptographic and security modules
that power [LastVault](https://lastvault.online) — a zero-knowledge encrypted
digital legacy vault with a built-in dead-man's switch.

We publish these modules publicly so that users, security researchers, and
developers can independently verify how sensitive data is protected.

---

## Why We Open-Source This

LastVault asks users to store their most sensitive information —
passwords, recovery keys, account numbers, and personal inheritance instructions.

Trust must be earned through transparency, not simply claimed. Publishing the
cryptographic core allows anyone to independently verify:

- **Client-side encryption (true zero-knowledge)** — Your password derives an
  AES-256-GCM key in your browser via PBKDF2 (600,000 iterations, SHA-256).
  Secrets are encrypted **before they ever leave your device**. The server
  stores only ciphertext it cannot read.
- **Server-side defense-in-depth** — The operator's `ENCRYPTION_KEY`
  re-encrypts already client-encrypted data at rest. This is an additional
  layer; the primary protection is the client-derived key which the server
  never has access to.
- **Non-extractable key** — The client-derived `CryptoKey` is stored in memory
  with `extractable: false`. It cannot be exported, serialized, or stolen via
  XSS. It is cleared on tab close or logout.
- **Timing-safe comparisons** — All PIN/password verification uses
  constant-time comparison to prevent timing attacks.
- **Authenticated encryption (AES-256-GCM)** — Tampering with ciphertext is
  detected, not just silently decrypted to garbage.
- **Random IV per operation** — The same plaintext produces different
  ciphertext every time, preventing correlation attacks.

---

## Repository Structure

```
lastvault-crypto/
├── README.md
├── LICENSE                  ← MIT License
├── SECURITY.md              ← Responsible disclosure process
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── helpers.ts           ← Hex/base64 encoding, timing-safe comparison
│   ├── crypto.ts            ← AES-256-GCM encrypt/decrypt + PBKDF2 PIN hashing
│   ├── file-crypto.ts       ← File attachment AES-256-GCM encrypt/decrypt
│   ├── vault-crypto.ts      ← Client-side password-derived vault encryption
│   └── sanitize.ts          ← Input sanitization and validation
└── tests/
    └── crypto.test.ts       ← Full test suite (Vitest)
```

---

## What Each Module Does

| File | Purpose |
|------|---------|
| `helpers.ts` | Hex↔bytes, base64↔bytes, constant-time equality comparison (`timingSafeEqual`) |
| `crypto.ts` | Server-side AES-256-GCM using operator-managed `ENCRYPTION_KEY`. PBKDF2-based PIN hashing (600k iterations) with timing-safe verification. Supports salted (current) and legacy SHA-256 (deprecated) hash formats. |
| `file-crypto.ts` | File attachment AES-256-GCM — random IV prepended to ciphertext, embedded in the returned `ArrayBuffer`. |
| `vault-crypto.ts` | **Client-side encryption core.** `deriveKey()` runs PBKDF2(600k iterations, SHA-256) with the user's password and a random salt to produce a non-extractable AES-256-GCM `CryptoKey`. `encryptSecret()`/`decryptSecret()` operate on individual field values. |
| `sanitize.ts` | Input sanitization (HTML strip, length limit), filename sanitization, and email validation. |

---

## Encryption Architecture

### Client-Side (True Zero-Knowledge)

```
User enters master password at login
         ↓
Browser derives AES-256-GCM key via PBKDF2 (600k iterations, SHA-256)
with fresh random 128-bit salt stored in the User table
         ↓
Key stored as non-extractable CryptoKey in memory
  — never writable to sessionStorage, localStorage, or IndexedDB
  — cleared on tab close, logout, or auto-lock
         ↓
When creating an asset, browser encrypts each secret field:
  encryptSecret(plaintext, key) → base64(randomIV + ciphertext)
         ↓
Already-encrypted blob sent to server over TLS 1.3
```

### Server-Side (Defense-in-Depth)

```
Client-encrypted blob arrives over TLS 1.3
         ↓
Server re-encrypts with ENCRYPTION_KEY (operator-managed 256-bit hex key):
  encrypt(clientCiphertext) → base64(randomIV + ciphertext)
         ↓
Double-encrypted blob stored in D1 database
         ↓
On read: server decrypts its layer → returns client-encrypted blob to browser
         ↓
Browser decrypts inner layer with user's derived key
```

### File Encryption

```
Original file bytes
         ↓
AES-256-GCM with random 96-bit IV
         ↓
IV + ciphertext combined into single ArrayBuffer
         ↓
Stored in Cloudflare R2 object storage
         ↓
On download: IV extracted from first 12 bytes, rest decrypted in browser
```

---

## Key Properties

| Property | Implementation |
|----------|---------------|
| **Cipher** | AES-256-GCM (authenticated encryption) |
| **Key derivation** | PBKDF2-SHA256, 600,000 iterations (OWASP 2023 recommended minimum) |
| **Salt** | 128-bit random, unique per user |
| **IV** | 96-bit random, unique per encryption operation |
| **Client key** | Non-extractable `CryptoKey` — cannot be exported/serialized |
| **PIN comparison** | Timing-safe XOR loop — no short-circuit on mismatch |
| **Error handling** | `DecryptionError` thrown on tampered/malformed ciphertext |
| **Server key** | 256-bit hex from `ENCRYPTION_KEY` env var |

---

## Running the Tests

```bash
git clone https://github.com/LastVaultRepo/lastvault-crypto.git
cd lastvault-crypto
bun install    # or npm install
bun run test   # or npx vitest
```

Expected output (all passing):

```
✓ crypto > encrypt then decrypt returns original
✓ crypto > handles empty string
✓ crypto > throws DecryptionError for tampered ciphertext
✓ crypto > throws DecryptionError for corrupted data
✓ crypto > encrypt returns different output each time (random IV)
✓ pin hashing > hashPin produces salted hash in format saltHex:hashHex
✓ pin hashing > verifyPin returns true for correct pin
✓ pin hashing > verifyPin returns false for wrong pin
✓ pin hashing > isSaltedPinHash detects correct format
✓ pin hashing > isLegacyPinHash detects SHA-256 hex
✓ vault crypto > generateSalt produces hex string
✓ vault crypto > encryptSecret then decryptSecret round-trips
✓ vault crypto > encryptSecret produces different output each time
✓ vault crypto > wrong password fails to decrypt
✓ file crypto > encryptFile then decryptFile round-trips
✓ file crypto > produces different output each time
✓ sanitize > strips HTML tags
✓ sanitize > respects max length
✓ sanitize > sanitizeFilename removes special chars
✓ sanitize > isValidEmail validates correctly
✓ helpers > hexToBytes converts correctly
✓ helpers > timingSafeEqual compares correctly
```

---

## Security

**Responsible disclosure:** security@lastvault.online
We acknowledge reports within 48 hours. Full policy in [SECURITY.md](./SECURITY.md).

---

## License

MIT — see [LICENSE](./LICENSE)

---

## About LastVault

[lastvault.online](https://lastvault.online) — A zero-knowledge encrypted
digital legacy vault with a built-in dead-man's switch. Your password derives
your encryption key in your browser. The server stores only ciphertext it
cannot read.
