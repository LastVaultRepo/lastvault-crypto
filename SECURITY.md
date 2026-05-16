# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in the Digital Legacy Vault
cryptographic modules or the main application, please report it responsibly.

**Do NOT open a public GitHub issue.**

### Contact

Email: **security@lastvault.online**

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested mitigations if you have them

### Our Commitment

| Timeline | Action |
|----------|--------|
| 48 hours | Acknowledgement of your report |
| 7 days | Initial assessment and severity classification |
| 30 days | Resolution or remediation plan communicated |

We will credit you in our release notes if you wish, once the vulnerability
is resolved and disclosed.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main) | ✅ Yes |
| Older tags | ❌ No — update to latest |

## Scope

### In Scope
- `src/crypto.ts` — encryption, decryption, PIN hashing
- `src/vault-crypto.ts` — vault-level encryption
- `src/file-crypto.ts` — file encryption
- `src/sanitize.ts` — input validation
- The main Digital Legacy Vault application

### Out of Scope
- Third-party dependencies (report to their maintainers)
- Cloudflare infrastructure vulnerabilities (report to Cloudflare)
- Social engineering attacks
- Physical device compromise

## Encryption Standard Reference

- AES-256-GCM: [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- PBKDF2: [RFC 2898](https://www.rfc-editor.org/rfc/rfc2898)
- PBKDF2 iteration guidance: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
