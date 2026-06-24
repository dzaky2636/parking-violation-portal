# Parking Violation Portal

A full-stack parking violation management system with Go microservices backend and Next.js frontend.

## Architecture

| Component | Language | Port | Description |
|-----------|----------|------|-------------|
| API Gateway | Go | 8080 | JWT validation, role gate, reverse proxy |
| Fine Rule Service | Go | 8083 | Rule version CRUD, fine calculation engine |
| Violation Service | Go | 8082 | Violation CRUD, photo upload, async fine calc |
| Payment Service | Go | 8084 | Mock payment processing |
| Frontend | Next.js 16 | 3000 | Officer + Member web UI |
| Supabase | Cloud | — | PostgreSQL, Auth, Storage |
| Event Bus | Go channels | — | In-process async pub/sub |

## Quick Start

### Prerequisites

- Go 1.22+ and Node.js 22+
- A Supabase project with the database schema applied

### 1. Configure Environment

Copy the root `.env` file or create one with your Supabase credentials:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DATABASE_URL=postgresql://postgres.xxx:[password]@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
```

> **Important:** Use the Supabase session pooler URL (port 6543) for `SUPABASE_DATABASE_URL`. Direct connections (port 5432 to `db.xxx.supabase.co`) are IPv6-only and unreachable from most environments.

### 2. Apply Database Schema

Run the Prisma migration against your Supabase database:

```bash
cd frontend
npx prisma migrate deploy
npx prisma db seed
```

This creates all 4 schemas (`public`, `violations`, `rules`, `payments`) and seeds the initial fine rule (v1 with 24 detail rows).

### 3. Create Storage Bucket

In the Supabase dashboard, create a public bucket called `violation-photos` for photo uploads.

### 4. Start Services

```bash
# Local development (no Docker needed)
./start.sh                    # launches all 4 backend services
cd frontend && npm run dev    # in a second terminal, launches frontend

# Or using Docker
docker compose up --build
```

Services will start in order: Fine Rule → Violation → Payment → API Gateway → Frontend.

- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:8080

### 5. Create Test Users

1. Register two users at http://localhost:3000/login:
   - `officer@test.com` (any password)
   - `member@test.com` (any password)
2. Get their UUIDs from **Supabase Dashboard → Authentication → Users**
3. Run the profile seed script:

```bash
OFFICER_ID=<officer-uuid> MEMBER_ID=<member-uuid> MEMBER_PLATE='B 1234 XYZ' \
  go run scripts/seed_profiles.go
```

This creates officer and member profiles plus a registered plate for the member. Alternatively, run this in the Supabase SQL editor:

```sql
INSERT INTO public.profiles (user_id, role, full_name) VALUES ('<officer-uuid>', 'officer', 'Test Officer');
INSERT INTO public.profiles (user_id, role, full_name) VALUES ('<member-uuid>', 'member', 'Test Member');
INSERT INTO public.member_plates (id, user_id, plate) VALUES (gen_random_uuid(), '<member-uuid>', 'B 1234 XYZ');
```

## Endpoints

All requests go through the API Gateway (`:8080`). Internal services are not directly exposed.

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /api/violations | officer | Submit violation (multipart: plate, type, location, timestamp, photo) |
| GET | /api/violations | both | List violations (officer: all; member: own via ?user_id) |
| GET | /api/violations/{id} | both | Single violation with fine + invoice + payment |
| GET | /api/rules/active | both | Current active fine rule with details |
| GET | /api/rules | officer | All rule versions (history) |
| GET | /api/rules/{id} | officer | Single rule with details |
| POST | /api/rules | officer | Create new rule version (supersedes active) |
| POST | /api/rules/calculate | internal | Compute fine (called by Violation Service consumer) |
| POST | /api/payments | member | Pay invoice with scenario (success/failed) |

## The 5 Flows

1. **Officer submits violation** — POST `/api/violations` → photo uploaded to Supabase Storage → violation stored → `violation.created` event published to in-process event bus
2. **System calculates fine** — Event bus subscriber receives `violation.created` → calls Fine Rule Service → stores `FineCalculation` snapshot with `rule_version_id` → creates `Invoice` → emits `invoice.created`
3. **Officer updates fine rules** — POST `/api/rules` (transactional) → old rule superseded → new rule active → existing violations unaffected (immutable snapshot)
4. **Member pays fine** — POST `/api/payments` → verifies invoice ownership → mock charge (success/failed) → updates invoice + violation status
5. **Transaction history** — GET `/api/violations` returns joined data: violation + fine calculation + invoice + latest payment transaction

## Assumptions

- **Single API Gateway security boundary**: Internal services trust the `X-User-ID` header injected by the gateway. Services are not directly exposed to clients.
- **PostgreSQL TIME columns**: `time_multiplier_start` and `time_multiplier_end` are native PostgreSQL `TIME` type (not VARCHAR). Queries use `::TIME` casting for correct comparison, including overnight boundary handling (22:00–06:00).
- **Supabase pooler required**: Direct PostgreSQL connections to Supabase are IPv6-only. All services use the Pgbouncer pooler URL (session mode, port 6543) to support transactions.
- **Photo upload is optional**: Violations can be submitted without a photo. The `photo_url` defaults to empty string.
- **Plate-to-user ownership**: `member_plates` table maps license plates to member user IDs. This is used both for invoice assignment and member's violation list filtering.
- **First violation is repeat count 0**: The repeat multiplier for a first-time violator is 1.0 (repeat_count_min=0 bracket).

## Trade-offs

| Decision | Why |
|----------|-----|
| Supabase Auth (not custom Go auth) | Auth is infrastructure, not domain logic. Supabase provides JWT issuance, user management, and session handling out of the box. |
| Event bus for async calculation (Go channels, not RabbitMQ) | Decouples violation submission from calculation. If the calculator is slow, violations still succeed. Go channels provide in-process pub/sub without an external broker, simplifying local setup. RabbitMQ can be added back via the existing docker-compose.yml structure if needed for distributed deployments. |
| No Redis | The working slice has no caching or rate-limiting needs. Added complexity with no benefit. |
| LATERAL subquery for payment status | Joining the latest payment transaction per invoice is more efficient than N+1 queries or sub-selects. |
| Individual INSERTs in rule creation (not batch) | For ~24 rows (4 types × 2 windows × 3 levels), the performance difference is negligible. Readability and error isolation per row matters more. |
| Go standard library HTTP (not gRPC) | Internal service communication is simple REST. gRPC would add protobuf compilation and complexity for 3-4 services. |

## What I Would Do With More Time

- **Comprehensive test suite**: Unit tests for the calculator engine, integration tests for the full async flow, end-to-end tests with Docker Compose
- **Health checks and circuit breakers**: The API Gateway currently has no circuit breaking for downstream services. Adding a library like `gobreaker` would improve resilience.
- **Idempotency**: The `violation.created` consumer could process duplicate events. Adding idempotency via a `processed_events` table would prevent double-calculation.
- **Notifications**: The `invoice.created` event has no consumer yet. Adding an email notification service would complete the flow.
- **Proper draw.io diagrams**: Replace the Mermaid diagrams in DESIGN.md with draw.io exports as specified, including the explicit rule versioning and calculation snapshot relationships.
- **API versioning**: Add `/api/v1/` prefix to all routes for future-proofing.
- **Observability**: Structured logging (e.g., slog), metrics (Prometheus), and tracing (OpenTelemetry).
