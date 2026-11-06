# Architectural Decision Record (ADR-004)
# Multi-Tier Role-Based Access Control (RBAC) & Safety Governance

## Status
**Accepted & Implemented** (November 2026)

---

## Context
LendLoop facilitates peer-to-peer equipment and tool sharing. Community lending involves high-power tools, electrical equipment, and potentially hazardous machinery. To ensure community safety, regulatory compliance, and tamper-resistant auditability, the system requires a multi-tier authorization model beyond simple binary user/admin permissions.

Additionally, internal teams require clear governance boundaries to separate routine community activities from safety oversight and root administration.

---

## Decision
We implemented a hierarchical 3-tier Role-Based Access Control (RBAC) architecture backed by cryptographic OIDC authentication:

1. **Member (`user`)**:
   - Standard peer-to-peer lending workflows (browse, list, borrow, favorite).
   - Zero access to administrative or safety inspection queues.
2. **Compliance Steward / Safety Inspector (`moderator`)**:
   - Dedicated operational workflow: **Compliance & Safety Desk**.
   - Inspects newly listed equipment, validates safety specs, attaches PPE requirements, and issues cryptographic safety certification badges.
   - Can freeze equipment availability ("Safety Freeze") upon safety hazard detection.
   - Accesses append-only audit trail logs and exports regulatory compliance reports.
3. **Administrator (`admin`)**:
   - Platform governance and root management.
   - Assigns/revokes user roles (`user`, `moderator`, `admin`).
   - Manages automated overdue reminder workflows and webhook integrations.

---

## Technical Architecture & Enforcement

### Server-Side Enforcement (Convex Backend)
All mutations and sensitive queries enforce server-side authorization through reusable TypeScript guards:
- `requireRole(ctx, allowedRoles, fallbackClerkId)`: Inspects cryptographically verified JWT identity and asserts user role membership.
- Throws standard `ConvexError` with clear HTTP/RPC status mappings, preventing internal stack trace leaks to client consumers.

### Principle of Least Privilege & Data Minimization
- Read queries project only the minimum necessary data fields required for the requesting user's authorization level.
- Unauthenticated public endpoints project exclusively non-PII attributes (`name`, `category`, `imageUrl`, `isAvailable`, `isCertified`).
- PII (emails, Clerk IDs) is strictly restricted to authorized participants and administrators.

### Observability & Telemetry Integration
- Role transitions, safety inspections, and authorization decisions emit structured events formatted according to **Datadog JSON Log Management** standards.
- Real-time custom metrics (`rbac.role_switch`, `tools.safety_certified`, `tools.safety_flagged`) provide operational visibility into inspection throughput and security events.
- Sentry error tracking integrates an automated PII scrubber to sanitize credentials and tokens before telemetry transmission.

---

## Consequences & Trade-offs
- **Positive**:
  - Eliminates single points of failure by separating safety inspection from root platform administration.
  - Full auditability compliant with SOC 2, ISO 27001, and regulatory standards.
  - Strict administrative governance via Admin Control Center ensures zero unauthorized client-side role tampering.
- **Negative / Considerations**:
  - Additional database lookup overhead during authorization checks (mitigated by indexed `by_clerk_id` lookups).
