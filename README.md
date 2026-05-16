# Digital Legacy Vault — Cryptographic Core

This repository contains the open-source cryptographic and security modules
that power [Digital Legacy Vault](https://lastvault.online) — a secure personal
asset registry with automatic beneficiary notification.

We publish these modules publicly so that users, security researchers, and
developers can independently verify how sensitive data is protected.

---

## Why We Open-Source This

Digital Legacy Vault asks users to store their most sensitive information —
passwords, recovery keys, account numbers, and personal inheritance instructions.

We believe that trust must be earned through transparency, not simply claimed.
Publishing the cryptographic core allows anyone to verify that:

- Sensitive fields are encrypted **before** they are written to any database
- The encryption key is derived from a server-side secret — not stored in plaintext
- PIN hashing uses **PBKDF2-SHA256 with 600,000 iterations** — industry-standard brute-force resistance
- Encryption uses **AES-256-GCM** — authenticated encryption with tamper detection
- We are architecturally incapable of reading your secrets at rest

---

## Repository Structure

```
lastvault-crypto/
├── README.md                ← This file
├── LICENSE                  ← MIT License
├── SECURITY.md              ← Responsible disclosure process
├── src/
│   ├── crypto.ts            ← Core AES-256-GCM + PBKDF2 PIN hashing
│   ├── vault-crypto.ts      ← Password-derived vault encryption wrappers
│   ├── file-crypto.ts       ← File attachment encryption module
│   └── sanitize.ts          ← Input sanitization and validation
└── tests/
    └── crypto.test.ts       ← Full test suite (Vitest)
```

---

## What This Repository Contains

| File | Purpose |
|------|---------|
| `src/crypto.ts` | Core AES-256-GCM encrypt/decrypt. PIN hashed with PBKDF2-SHA256 (600,000 iterations, random salt). Used for all asset secrets. |
| `src/vault-crypto.ts` | Password-derived key encryption for vault-level data using PBKDF2 + AES-256-GCM. |
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

We open-source the security-critical modules only.
The product code remains private to prevent trivial cloning.

---

## How the Encryption Works

### Asset Secret Encryption (crypto.ts)

```
User enters a sensitive value (e.g. a recovery key)
         ↓
Cloudflare Worker receives the value over TLS 1.3
         ↓
AES-256-GCM encryption runs server-side using Web Crypto API
         ↓
A fresh random 96-bit IV is generated for every single encryption call
         ↓
The encryption key is derived from ENCRYPTION_KEY env variable
via crypto.subtle.importKey — this key is operator-managed, never user-facing
         ↓
IV + ciphertext are combined and base64-encoded
         ↓
Only the base64-encoded ciphertext is stored in the database
         ↓
The plaintext value is never stored, logged, or transmitted after encryption
```

### PIN Hashing (crypto.ts)

```
User sets a PIN (4–8 digits)
         ↓
A fresh random 16-byte salt is generated
         ↓
PBKDF2-SHA256 with 600,000 iterations derives a 256-bit hash
         ↓
Stored as: saltHex:hashHex
         ↓
The plaintext PIN is discarded immediately and never stored
         ↓
Verification re-derives the hash from the entered PIN + stored salt
and compares using string equality (no timing-safe compare needed
as PBKDF2 computation time dominates)
```

### Vault Data Encryption (vault-crypto.ts)

```
Data to protect + password provided
         ↓
Fresh 16-byte salt + 12-byte IV generated
         ↓
PBKDF2 derives a 256-bit AES-GCM key from the password + salt
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
git clone https://github.com/LastVaultRepo/lastvault-crypto.git
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
| Random salt per PIN hash | Prevents precomputation and rainbow table attacks |
| Web Crypto API only | No third-party crypto libraries — relies on browser/runtime native implementation |
| Secrets never in logs | Enforced at application level — no decrypted values appear in any log output |

---

## Security

We take responsible disclosure seriously.

If you discover a vulnerability in these modules or in the Digital Legacy Vault
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

## About Digital Legacy Vault

Digital Legacy Vault is a secure personal asset registry that automatically
notifies a trusted contact if the owner has not checked in within a
configured period.

**[lastvault.online](https://lastvault.online)**
