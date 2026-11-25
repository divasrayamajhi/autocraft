# AutoCraft Pro — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied for both read and write (`match /{document=**} { allow read, write: if false; }`).
2. **Verified Identity Mandate**: Every read and write operation requires a signed-in user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
3. **Tenant & PII Isolation**: `workshop_profiles`, `staff_accounts`, `customers`, and all operational collections strictly enforce `ownerUid == request.auth.uid` (or bootstrapped Admin `divasrayamajhi2@gmail.com` with `email_verified == true`). No blanket `isSignedIn()` read or list rule is permitted.
4. **No `get()`/`exists()` inside `allow list`**: Every `allow list` rule evaluates `resource.data.ownerUid == request.auth.uid || isBootstrappedAdmin()` directly, preventing O(n) read-cost amplification and forcing client queries to include `where('ownerUid', '==', uid)`.
5. **Strict Path & Payload Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars). Every `create` and `update` calls a standalone `isValid[Entity](incoming())` helper enforcing required keys, allowlisted keys (`hasOnly`), field types, and `.size()` ceilings.
6. **Temporal & Ownership Immutability**: `createdAt == request.time` on `create`; `createdAt == existing().createdAt`, `ownerUid == existing().ownerUid`, and `updatedAt == request.time` on `update`.
7. **Privilege Escalation Prevention**: `admins/{adminId}` can only be read or mutated by the bootstrapped Admin. No user can self-register as an admin.
8. **Terminal State Locking**:
   - Once a `job_cards/{jobCardId}` document has `existing().isClosed == true`, non-admin updates are blocked; only Admin can reopen or amend it.
   - Once a `gate_passes/{gatePassId}` document has `existing().status == 'Exited'`, non-admin updates are blocked.
   - Once an `invoices/{invoiceId}` document has `existing().status == 'Voided'`, non-admin updates are blocked.
   - Once an `appointments/{appointmentId}` document has `existing().status == 'Cancelled'`, non-admin updates are blocked.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read** — `get('/customers/cust_1')` with `auth = null`.
2. **Unverified Admin Email Spoof** — `get('/customers/cust_1')` with `auth = { uid: 'attacker', token: { email: 'divasrayamajhi2@gmail.com', email_verified: false } }`.
3. **Cross-Tenant PII Theft (`get`)** — User B (`uid: 'userB'`, verified) calls `get('/customers/cust_userA')` where `ownerUid == 'userA'`.
4. **Cross-Tenant Blanket List Scraping (`list`)** — User B runs unscoped `list('/staff_accounts')` without `where('ownerUid', '==', 'userB')`.
5. **Privilege Escalation (Self-Admin Write)** — User B attempts `create('/admins/userB', { uid: 'userB', email: 'b@example.com', createdAt: SERVER_TIMESTAMP, updatedAt: SERVER_TIMESTAMP })`.
6. **Identity Spoofing on Create** — User B attempts `create('/job_cards/jc_99', { ..., ownerUid: 'userA' })`.
7. **Shadow Field Injection ("Ghost Field")** — User A attempts `create('/invoices/inv_1', { ...validFields, isVerifiedByIRD: true })` (extra unlisted key).
8. **ID Poisoning Attack** — User A attempts `create('/spare_parts/' + 'A'.repeat(200), validPartPayload)` or `create('/spare_parts/bad.id$1', validPartPayload)`.
9. **Value Poisoning / Denial of Wallet** — User A attempts `update('/customers/cust_1', { name: 'X'.repeat(500), updatedAt: SERVER_TIMESTAMP })` exceeding `maxLength: 160`.
10. **Client-Forged Timestamp** — User A attempts `create('/job_cards/jc_2', { ...validJobCard, createdAt: '2020-01-01T00:00:00Z' })` instead of `request.time`.
11. **Ownership Hijack on Update** — User A attempts `update('/invoices/inv_1', { ownerUid: 'userB', updatedAt: SERVER_TIMESTAMP })`.
12. **Terminal State Bypass on Closed Job Card** — Non-admin owner attempts `update('/job_cards/jc_closed', { status: 'In Progress', isClosed: false, updatedAt: SERVER_TIMESTAMP })` when `existing().isClosed == true`.
