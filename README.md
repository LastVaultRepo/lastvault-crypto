# LastVault — Cryptographic Core

This repository contains the open-source cryptographic and security modules
that power [LastVault](https://lastvault.online) — a secure digital asset
registry with automatic beneficiary notification.

We publish these modules publicly so that users, security researchers, and
developers can independently verify how sensitive data is protected.

---

## Why We Open-Source This

LastVault asks users to store their most sensitive information —
passwords, recovery keys, account numbers, and personal inheritance instructions.

We believe that trust must be earned through transparency, not simply claimed.
Publishing the cryptographic core allows anyone to verify that:

- **True zero-knowledge** — Your master password derives an AES-256-GCM key client-side via PBKDF2 (600,000 iterations). Secrets are encrypted **before** they ever reach our server
- The server stores only ciphertext it cannot read — the encryption key is derived from your password in the browser, never transmitted
- This module provides the **server-side defense-in-depth layer**, double-encrypting already client-encrypted data at rest
- Encryption uses **AES-256-GCM** with random 96-bit IVs — authenticated encryption with tamper detection
- We are architecturally incapable of reading your secrets

---

## Repository Structure

```
lastvault-crypto/
├── README.md                ← This file
├── LICENSE                  ← MIT License
├── SECURITY.md              ← Responsible disclosure process
├── src/
│   ├── crypto.ts            ← Server-side AES-256-GCM (defense-in-depth layer)
│   ├── vault-crypto.ts      ← Client-side password-derived vault encryption (PBKDF2 + AES-256-GCM)
│   ├── file-crypto.ts       ← File attachment encryption module
│   └── sanitize.ts          ← Input sanitization and validation
├── tests/
│   └── crypto.test.ts       ← Full test suite (Vitest)
└── package.json
```

---

## What This Repository Contains

| File | Purpose |
|------|---------|
| `src/crypto.ts` | Server-side AES-256-GCM encrypt/decrypt using the operator-managed ENCRYPTION_KEY. Acts as defense-in-depth — double-encrypts data that is already client-encrypted before storage. |
| `src/vault-crypto.ts` | Client-side password-derived encryption for vault export/import using PBKDF2 (600,000 iterations) + AES-256-GCM. The same algorithm is used in production for all asset-level encryption. |
| `src/file-crypto.ts` | File/attachment encryption using AES-256-GCM with random IV per file. |
| `src/sanitize.ts` | Input sanitization, PIN formatting, and email validation applied to all user input. |
| `tests/crypto.test.ts` | End-to-end test suite covering encryption round-trips, PIN hashing, tamper detection, and random IV verification. |

---

## What This Repository Does NOT Contain

This is not the full application. The following are intentionally excluded:

- Application routes and business logic
- Authentication session handling
- Email notification templates
- UI components and frontend code
- Database query logic
- Infrastructure configuration
- **Client-side crypto module** (`client-crypto.ts`) — that lives in the main app and derives the user's key from their password. This repo contains the server-side crypto that operates on already-client-encrypted data.

We open-source the security-critical modules only.
The product code remains private to prevent trivial cloning.

---

## How the Encryption Works

### Zero-Knowledge Architecture (Client + Server)

```
User enters master password at login
         ↓
Browser derives AES-256-GCM key via PBKDF2 (600k iterations, SHA-256)
with a fresh random salt stored in the User table
         ↓
Key stored in sessionStorage (cleared on tab close or logout)
         ↓
When creating an asset, the browser encrypts the secret client-side:
  encryptSecret(plaintext, derivedKey) → base64(iv + ciphertext)
         ↓
The already-encrypted blob is sent to the server over TLS 1.3
         ↓
Server re-encrypts with its own ENCRYPTION_KEY (defense-in-depth):
  serverEncrypt(clientCiphertext) → double-encrypted blob
         ↓
Double-encrypted blob stored in D1 database
         ↓
┌─────────────────────────────────────────────────────┐
│  Only the browser can decrypt. The server sees only  │
│  the outer encryption layer and never has access to  │
│  the client-derived key or the plaintext.            │
└─────────────────────────────────────────────────────┘
```

### Server-Side Encryption (this repo — crypto.ts)

```
Client-encrypted blob arrives over TLS 1.3
         ↓
AES-256-GCM encryption runs server-side using Web Crypto API
         ↓
A fresh random 96-bit IV is generated for every single encryption call
         ↓
The encryption key is derived from ENCRYPTION_KEY env variable
via crypto.subtle.importKey — this key is operator-managed
         ↓
IV + ciphertext are combined and base64-encoded
         ↓
Only the base64-encoded ciphertext is stored in the database
         ↓
On read: server decrypts its layer, returns client-encrypted blob to browser
         ↓
Browser decrypts the inner layer with the user's derived key
```

### Vault Data Encryption (vault-crypto.ts)

Used for encrypted vault exports and imports (and the same algorithm powers
the in-app client-side encryption):

```
Data to protect + password provided
         ↓
Fresh 16-byte salt + 12-byte IV generated
         ↓
PBKDF2 derives a 256-bit AES-GCM key from the password + salt
(600,000 iterations, SHA-256 — OWASP 2023 recommended minimum)
         ↓
AES-256-GCM encrypts the data
         ↓
salt + IV + ciphertext combined and base64-encoded
         ↓
Decryption requires the same password — no password = no decryption
```

---

## Running the Tests

```bash
# Clone the repository
git clone https://github.com/mxaher/lastvault-crypto.git
cd lastvault-crypto

# Install dependencies (Bun recommended, npm also works)
bun install
# or: npm install

# Run the full test suite
bun run test
# or: npx vitest
```

All tests use the Web Crypto API and are designed to run in a
Cloudflare Workers-compatible environment via Vitest.

Expected output:
```
✓ crypto > encrypt then decrypt returns original
✓ crypto > handles empty string
✓ crypto > returns error marker for tampered ciphertext
✓ crypto > hashPin produces salted hash in format saltHex:hashHex
✓ crypto > verifyPin returns true for correct pin
✓ crypto > verifyPin returns false for wrong pin
✓ crypto > encrypt returns different output each time (random IV)
```

---

## Security Design Decisions

| Decision | Rationale |
|----------|-----------|
| AES-256-GCM | Authenticated encryption — detects tampering, not just decryption errors |
| Random IV per operation | Prevents ciphertext correlation across identical plaintext values |
| PBKDF2 at 600,000 iterations | OWASP 2023 recommended minimum for SHA-256 based PBKDF2 |
| Random salt per user | Stored in User table, used for client-side key derivation |
| Client-side key derivation | The server never has access to the user's password or derived key — true zero-knowledge |
| Double encryption | Server's ENCRYPTION_KEY provides defense-in-depth at rest |
| Web Crypto API only | No third-party crypto libraries — relies on browser/runtime native implementation |
| Secrets never in logs | Enforced at application level — no decrypted values appear in any log output |

---

## Security

We take responsible disclosure seriously.

If you discover a vulnerability in these modules or in the LastVault
application, please do **not** open a public GitHub issue.

**Email:** security@lastvault.online
**Response commitment:** We will acknowledge your report within 48 hours
and provide a resolution timeline within 7 days.

We will credit researchers who report valid vulnerabilities, with their permission.

Full details: [SECURITY.md](./SECURITY.md)

---

## License

MIT — see [LICENSE](./LICENSE)

---

## About LastVault

LastVault is a secure digital asset registry with true zero-knowledge
encryption. Your master password derives the encryption key in your browser —
the server stores only encrypted blobs it cannot read.

**[lastvault.online](https://lastvault.online)**
