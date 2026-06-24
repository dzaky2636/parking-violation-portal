# DESIGN.md — Parking Violation Portal

## Architecture Overview

```
┌──────────┐     ┌─────────────┐     ┌───────────────┬──────────────┬──────────────┐
│  Next.js │────▶│  API Gateway │────▶│  Fine Rule    │  Violation   │  Payment     │
│ Frontend │     │  (Go, :8080) │     │  Service      │  Service     │  Service     │
│ (:3000)  │     │              │     │  (Go, :8083)  │  (Go, :8082) │  (Go, :8084) │
└──────────┘     │  JWT Auth    │     └──────┬────────┴──────┬───────┴──────┬───────┘
                 │  Role Gate   │            │               │              │
                 │  Proxy       │            │               │              │
                 └──────┬───────┘            │               │              │
                         │                    │          ┌─────────┐         │
                         │                    │          │Event Bus│         │
                         │                    │          └─────────┘         │
                        │                    │               │              │
                        ▼                    ▼               ▼              ▼
                 ┌─────────────────────────────────────────────────────────────┐
                 │                    Supabase Cloud                             │
                 │  ┌──────────┐  ┌───────────┐  ┌─────────────────────────┐   │
                 │  │  Auth    │  │PostgreSQL │  │ Object Storage (photos) │   │
                 │  └──────────┘  │   (4      │  └─────────────────────────┘   │
                 │                │ schemas)  │                                 │
                 │                └───────────┘                                 │
                 └─────────────────────────────────────────────────────────────┘
```

### Service Boundaries

| Service | Port | Responsibility | Sync/Async |
|---------|------|---------------|------------|
| API Gateway | 8080 | JWT validation, role gate, reverse proxy | Sync |
| Fine Rule Service | 8083 | Rule version CRUD, fine calculation engine | Sync |
| Violation Service | 8082 | Violation CRUD, photo upload, event bus pub/consumer | Sync + Async |
| Payment Service | 8084 | Mock charge, transaction storage | Sync |
| Frontend (Next.js) | 3000 | Officer + Member UI | Sync |

---

## Data Flow — All 5 Assignment Flows

### Flow 1: Officer Submits Violation

```mermaid
sequenceDiagram
    actor Officer
    participant UI as Next.js Frontend
    participant GW as API Gateway
    participant VS as Violation Service
    participant Storage as Supabase Storage
    participant DB as Supabase PostgreSQL
    participant Bus as Event Bus
    participant Consumer as Event Consumer
    participant FRS as Fine Rule Service

    Officer->>UI: Fill form (plate, type, location, time, photo)
    UI->>GW: POST /api/violations (multipart)
    GW->>GW: Validate JWT, check role=officer
    GW->>VS: proxy POST /api/violations
    VS->>Storage: Upload photo
    Storage-->>VS: public URL
    VS->>DB: INSERT violations.violations (status=pending)
    VS->>Bus: Publish "violation.created" event
    VS-->>GW: 201 { violation_id, ... }
    GW-->>UI: 201 { violation_id, ... }
    UI-->>Officer: Show success

    Note over Consumer,FRS: Async: fine calculation
    Bus->>Consumer: Consume "violation.created"
    Consumer->>DB: SELECT violation details
    Consumer->>FRS: POST /api/rules/calculate
    FRS->>DB: Get active rule + compute fine
    FRS-->>Consumer: { base_amount, time_multiplier, repeat_multiplier, total_fine, rule_version_id }
    Consumer->>DB: INSERT violations.fine_calculations
    Consumer->>DB: INSERT violations.invoices (status=unpaid)
    Consumer->>DB: UPDATE violations SET status='invoiced'
    Consumer->>Bus: Publish "invoice.created"
```

**Synchronous:** Photo upload, violation creation, event publish  
**Asynchronous:** Fine calculation, calculation snapshot storage, invoice creation  
**Cross-module:** Consumer calls Fine Rule Service (HTTP). Consumer writes to violations + rules schemas.

### Flow 2: System Calculates Fine (Async)

Same as the async portion of Flow 1. The Violation Service consumer:
1. Receives `violation.created` from the event bus
2. Calls `POST /api/rules/calculate` on Fine Rule Service
3. Fine Rule Service reads the active rule from `rules.fine_rules` + `rules.fine_rule_details`
4. Applies formula: `base_amount × time_multiplier × repeat_multiplier`
5. Returns result with `rule_version_id` (immutable snapshot reference)
6. Consumer stores `FineCalculation` snapshot in `violations.fine_calculations`
7. Consumer creates `Invoice` in `violations.invoices`
8. Consumer emits `invoice.created` event

### Flow 3: Officer Updates Fine Rules

```mermaid
sequenceDiagram
    actor Officer
    participant UI as Next.js Frontend
    participant GW as API Gateway
    participant FRS as Fine Rule Service
    participant DB as Supabase PostgreSQL

    Officer->>UI: POST /api/rules (new rule version)
    UI->>GW: POST /api/rules { base_amounts, time_multipliers, repeat_multipliers }
    GW->>GW: Validate JWT, check role=officer
    GW->>FRS: proxy POST /api/rules
    FRS->>DB: BEGIN transaction
    FRS->>DB: SELECT MAX(version) + 1
    FRS->>DB: UPDATE fine_rules SET status='superseded' WHERE status='active'
    FRS->>DB: INSERT fine_rules (version=N+1, status='active')
    FRS->>DB: INSERT fine_rule_details (cartesian product of types × times × repeats)
    FRS->>DB: COMMIT
    FRS-->>GW: 201 { id, version, details[] }
    GW-->>UI: 201 { id, version, details[] }
    UI-->>Officer: Show new rule

    Note over Officer,DB: Existing violations keep their fine_calculation.rule_version_id
    Note over Officer,DB: FK has NO CASCADE — immutable snapshot preserved
```

**Rule versioning protects historical fines:** Each `FineCalculation` stores `rule_version_id` → `FineRule.id`. The FK to `fine_rules` has NO CASCADE DELETE. When a new rule is published, the old rule is marked `superseded` but never deleted. Existing violations maintain their original fine calculation with a reference to the exact rule version used.

### Flow 4: Member Pays Fine

```mermaid
sequenceDiagram
    actor Member
    participant UI as Next.js Frontend
    participant GW as API Gateway
    participant PS as Payment Service
    participant DB as Supabase PostgreSQL

    Member->>UI: Select invoice, choose scenario (success/failed)
    UI->>GW: POST /api/payments { invoice_id, scenario }
    GW->>GW: Validate JWT, check role=member
    GW->>PS: proxy POST /api/payments (X-User-ID injected)
    PS->>DB: SELECT invoice (verify user_id matches X-User-ID)
    PS->>PS: mock.PaymentService.charge(invoice_id, amount, scenario)
    PS->>DB: INSERT payments.transactions
    alt scenario = success
        PS->>DB: UPDATE invoice SET status='paid'
        PS->>DB: UPDATE violation SET status='paid'
        PS-->>GW: 200 { status: "paid", transaction_id }
    else scenario = failed
        PS-->>GW: 200 { status: "failed", transaction_id }
    end
    GW-->>UI: 200 { status, transaction_id }
    UI-->>Member: Show result
```

### Flow 5: Transaction History

```mermaid
sequenceDiagram
    actor Member
    participant UI as Next.js Frontend
    participant GW as API Gateway
    participant VS as Violation Service
    participant DB as Supabase PostgreSQL

    Member->>UI: View violations / history
    UI->>GW: GET /api/violations?user_id=X
    GW->>GW: Validate JWT, inject X-User-ID
    GW->>VS: proxy GET /api/violations?user_id=X
    VS->>DB: SELECT violations LEFT JOIN fine_calculations LEFT JOIN invoices LEFT JOIN LATERAL payments.transactions
    VS-->>GW: [{ violation, fine_calculation, invoice, payment_status, transaction_id }]
    GW-->>UI: [{ violation, fine, rule_version, payment_status }]
    UI-->>Member: Show history table
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    auth_users ||--o| profiles : user_id
    profiles ||--o{ member_plates : user_id
    fine_rules ||--o{ fine_rule_details : rule_id
    fine_rules ||--o{ fine_calculations : rule_version_id
    violations ||--o{ fine_calculations : violation_id
    violations ||--o{ invoices : violation_id
    invoices ||--o{ transactions : invoice_id

    auth_users {
        uuid id
    }

    profiles {
        uuid user_id
        varchar role
        varchar full_name
        timestamptz created_at
    }

    member_plates {
        uuid id
        uuid user_id
        varchar plate
        timestamptz created_at
    }

    violations {
        uuid id
        varchar plate
        varchar violation_type
        varchar location
        timestamptz violation_timestamp
        varchar photo_url
        varchar status
        uuid submitted_by
        timestamptz created_at
        timestamptz updated_at
    }

    fine_calculations {
        uuid id
        uuid violation_id
        uuid rule_version_id
        decimal base_amount
        decimal time_multiplier
        decimal repeat_multiplier
        decimal total_fine
        timestamptz calculated_at
    }

    invoices {
        uuid id
        uuid violation_id
        uuid user_id
        decimal amount
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    fine_rules {
        uuid id
        int version
        varchar status
        uuid created_by
        timestamptz effective_from
        timestamptz created_at
    }

    fine_rule_details {
        uuid id
        uuid rule_id
        varchar violation_type
        decimal base_amount
        time time_multiplier_start
        time time_multiplier_end
        decimal time_multiplier_value
        int repeat_count_min
        decimal repeat_multiplier
    }

    transactions {
        uuid id
        uuid invoice_id
        varchar transaction_id
        varchar status
        varchar scenario
        timestamptz created_at
    }
```

### PostgreSQL Schemas

| Schema | Tables | Purpose |
|--------|--------|---------|
| `public` | `profiles`, `member_plates` | User profiles and plate-to-owner mappings |
| `rules` | `fine_rules`, `fine_rule_details` | Immutable rule versioning |
| `violations` | `violations`, `fine_calculations`, `invoices` | Violation lifecycle |
| `payments` | `transactions` | Payment transaction log |

### Key Design Decisions

1. **Rule versioning is immutable**: `fine_calculations.rule_version_id` references `fine_rules(id)` with NO CASCADE. New rule publications mark old rules as `superseded` — never delete. Each violation's fine is permanently linked to the exact rule version used at calculation time.

2. **Async fine calculation via event bus**: Officer submits a violation synchronously (gets immediate confirmation), then the consumer processes it asynchronously. This decouples the submission from the calculation and prevents slow DB queries from blocking the officer's UX. The event bus uses Go channels for in-process pub/sub, avoiding external broker dependencies.

3. **Cross-schema foreign keys**: `fine_calculations.rule_version_id → rules.fine_rules(id)` connects the violations schema to the rules schema. This is intentionally a manual FK (not in Prisma schema) to prevent accidental migrations from altering it.

4. **X-User-ID header injection**: The API Gateway validates the Supabase JWT, extracts the user ID, and injects it as `X-User-ID` into downstream service requests. Internal services trust this header — it's a trust boundary enforced by the gateway alone.
