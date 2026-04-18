# LIBERO — Software Design Document (SDD)

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-04-14 |
| **SRS Reference** | SRS v1.1 — 2026-04-14 |
| **Stack** | MERN (MongoDB, Express, React, Node.js) |

---
> Fixed implementation stack: MongoDB + Mongoose + Node.js + Express + React + Vite + TypeScript, with Redis + BullMQ for background jobs.
---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Module Structure](#3-backend-module-structure)
4. [Domain-Driven Module Decomposition](#4-domain-driven-module-decomposition)
5. [MongoDB Collection Design](#5-mongodb-collection-design)
6. [Collection Relationships](#6-collection-relationships)
7. [Index Strategy](#7-index-strategy)
8. [State Machine Design](#8-state-machine-design)
9. [Transaction Boundaries](#9-transaction-boundaries)
10. [Background Job Design](#10-background-job-design)
11. [API Layer Design](#11-api-layer-design)
12. [RBAC Authorization Design](#12-rbac-authorization-design)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Audit Logging Design](#14-audit-logging-design)
15. [Folder Structure](#15-folder-structure)
16. [Testing Strategy](#16-testing-strategy)
17. [Deployment Architecture](#17-deployment-architecture)
18. [Assumptions and Open Decisions](#18-assumptions-and-open-decisions)

---

## 1. System Architecture

### 1.1 High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT TIER                              │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │  Admin SPA (React)  │  │  Reader SPA (React)         │   │
│  │  - Catalog CRUD     │  │  - Search / Browse          │   │
│  │  - Member mgmt      │  │  - My Loans / Fines         │   │
│  │  - Checkout/Return  │  │  - Reservations             │   │
│  │  - Reports          │  │  - Profile                  │   │
│  └────────┬────────────┘  └──────────┬──────────────────┘   │
│           │          HTTPS           │                       │
└───────────┼──────────────────────────┼───────────────────────┘
            │                          │
┌───────────▼──────────────────────────▼───────────────────────┐
│                   NGINX (Reverse Proxy)                       │
│  - TLS termination                                           │
│  - /api/* → Express API (port 5000)                          │
│  - /* → React static build                                   │
│  - Rate limiting (layer 1)                                   │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                   API SERVER TIER                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Express.js API Server                    │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │  Middleware Stack                             │    │   │
│  │  │  helmet → cors → rateLimiter → requestId     │    │   │
│  │  │  → bodyParser → authGuard → audit            │    │   │
│  │  └──────────────┬───────────────────────────────┘    │   │
│  │  ┌──────────────▼───────────────────────────────┐    │   │
│  │  │  Route → Controller → Service → Repository   │    │   │
│  │  └──────────────┬───────────────────────────────┘    │   │
│  └─────────────────┼────────────────────────────────────┘   │
│                    │                                         │
│  ┌─────────────────▼────────────────────────────────────┐   │
│  │              BullMQ Workers (Background Jobs)         │   │
│  │  fineCalc │ overdueMarker │ holdExpiry │ emailSender  │   │
│  │  dueReminder │ overdueNotify │ holdReminder           │   │
│  └─────────────────┬────────────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────────┘
         ┌───────────┼────────────────┐
         ▼           ▼                ▼
  ┌────────────┐ ┌────────┐ ┌──────────────┐
  │  MongoDB   │ │ Redis  │ │ SMTP Server  │
  │  (primary) │ │ (queue │ │ (Nodemailer) │
  │            │ │  cache)│ │              │
  └────────────┘ └────────┘ └──────────────┘
```

### 1.2 Layer Responsibilities

| Layer | Responsibility | Dependencies |
|-------|---------------|-------------|
| **Route** | URL binding, middleware attachment | Controller |
| **Controller** | Parse request, validate input (Zod), format response | Service |
| **Service** | Business logic, orchestration, transaction management | Repository, other Services |
| **Repository** | MongoDB queries via Mongoose models. Single-collection operations | Mongoose Model |
| **Model** | Mongoose schema definition, virtuals, statics, pre/post hooks | — |

**Rule:** Each layer depends only on the layer below. Controllers never access models directly. Services never read `req`/`res`.

### 1.3 Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20 LTS, TypeScript 5.x strict |
| API Framework | Express 5 |
| Database | MongoDB 7 (replica set for transactions) |
| ODM | Mongoose 8 |
| Queue | BullMQ on Redis 7 |
| Auth | JWT (HS256), bcrypt |
| Validation | Zod |
| Email | Nodemailer + Handlebars templates |
| File Export | ExcelJS (.xlsx), PDFKit (.pdf) |
| Frontend | React 18, Vite, React Router 6, Axios, Zustand |
| UI Library | Ant Design (Admin), custom components (Reader) |
| Testing | Jest, Supertest, React Testing Library |
| Deployment | Docker Compose |

---

## 2. Frontend Architecture

### 2.1 Application Split

Two separate React SPAs sharing a common `@libero/shared` package:

| App | URL Pattern | Users | Build |
|-----|------------|-------|-------|
| **Admin** | `/admin/*` | Librarian, Admin | Vite build → `/admin` |
| **Reader** | `/*` | Student, Lecturer, Public | Vite build → `/` |

### 2.2 Admin SPA Structure

```
admin/src/
├── pages/
│   ├── Dashboard/          # KPI cards, overdue table, chart
│   ├── Catalog/            # Book list, detail, add/edit, import CSV
│   ├── Members/            # Member list, detail, suspend/activate
│   ├── Checkout/           # Scan memberCard → scan barcode → confirm
│   ├── Return/             # Scan barcode → show loan info → confirm
│   ├── Fines/              # Search member → fine list → pay/waive
│   ├── Reservations/       # Active reservations, cancel
│   ├── Reports/            # Loan stats, overdue list, inventory, fine stats
│   └── Settings/           # LoanPolicy, FineRate config
├── components/             # Shared UI (DataTable, StatCard, BarcodeInput)
├── hooks/                  # useAuth, useApi, useDebounce
├── services/               # API client wrappers (axios instances)
├── store/                  # Zustand stores (auth, notifications)
├── layouts/                # AdminLayout (sidebar + topbar + content)
└── routes.tsx              # React Router config with role guards
```

### 2.3 Reader SPA Structure

```
reader/src/
├── pages/
│   ├── Home/               # Search bar, new books carousel, popular books
│   ├── Search/             # Filter sidebar + results grid
│   ├── BookDetail/         # Book info + copy status table + reserve button
│   ├── MyLoans/            # Active loans with renew button
│   ├── MyReservations/     # Queue position, cancel
│   ├── MyFines/            # Fine dashboard + detail list
│   ├── Profile/            # Personal info, change password
│   ├── Login/              # Login form
│   └── Register/           # Registration form (pending approval)
├── components/             # BookCard, LoanCard, FineCard
├── hooks/
├── services/
├── store/
├── layouts/                # ReaderLayout (topbar + content)
└── routes.tsx
```

### 2.4 Shared Package

```
shared/
├── types/                  # TypeScript interfaces matching API response shapes
├── constants/              # Enums (LoanStatus, CopyStatus, Role, etc.)
├── utils/                  # Date formatting, currency formatting
└── validators/             # Zod schemas shared with backend
```

### 2.5 State Management

- **Zustand** for global state (auth, user profile, notification count)
- **React Query (TanStack Query)** for server state (books, loans, fines) with caching and automatic refetching
- No Redux — unnecessary complexity for this scale

### 2.6 Auth Flow (Frontend)

1. Login → receive `accessToken` in response body + `refreshToken` as httpOnly cookie
2. Store `accessToken` in Zustand memory store (not localStorage)
3. Axios interceptor: attach `Authorization: Bearer <accessToken>` on every request
4. On 401: interceptor calls `/api/v1/auth/refresh` → get new tokens → retry original request
5. On refresh failure: clear store → redirect to login

---

## 3. Backend Module Structure

```
server/src/
├── modules/
│   ├── catalog/            # Book, BookCopy, Author, Category
│   ├── member/             # Member CRUD, Auth (login, refresh, register)
│   ├── loan/               # Checkout, return, renewal, loan history
│   ├── reservation/        # Queue management, hold logic
│   ├── fine/               # Fine calculation, payment, waiver
│   ├── notification/       # Email dispatch, templates, notification log
│   └── report/             # Aggregation queries, export
├── jobs/                   # BullMQ worker definitions
├── common/                 # Middleware, errors, utils, types
├── config/                 # Environment, database, Redis, queue setup
├── models/                 # Mongoose schemas (all collections)
├── app.ts                  # Express app assembly
└── server.ts               # HTTP server entry + graceful shutdown
```

Each module follows a consistent internal structure:
```
modules/catalog/
├── catalog.routes.ts       # Express Router
├── catalog.controller.ts   # Request handling
├── catalog.service.ts      # Business logic
├── catalog.repository.ts   # MongoDB queries
├── catalog.validator.ts    # Zod schemas
└── catalog.types.ts        # Module-specific TypeScript types
```

---

## 4. Domain-Driven Module Decomposition

### 4.1 Catalog Module

**Collections:** `books`, `bookCopies`, `authors`, `categories`

| Service Method | Key Logic | Writes |
|---------------|-----------|--------|
| `createBook(dto)` | Validate ISBN uniqueness → create Book → bulk-create N BookCopy with auto-generated barcodes | Transaction |
| `searchBooks(query, filters, page)` | MongoDB text index on `title` + `isbn`. Filter by category, availability. Populate author names | Read-only |
| `updateBook(id, dto)` | Validate exists + !isDeleted. Merge fields. Audit log | Single write |
| `softDeleteBook(id)` | Assert no BookCopy with status=`borrowed`. Assert no WAITING reservations. Set `isDeleted=true` | Transaction |
| `getCopyStatus(bookId)` | List BookCopy with current loan dueDate via lookup | Read-only |
| `importCSV(fileStream)` | Parse row-by-row → validate ISBN → batch create (50/batch). Return summary | Transaction per batch |
| `addCopies(bookId, count)` | Generate N new BookCopy for existing Book | Transaction |

**Barcode generation:** `LIB-{bookId.slice(-6)}-{copyIndex.toString().padStart(3,'0')}-{luhnChecksum}`

### 4.2 Member / Auth Module

**Collections:** `members`, `refreshTokens`, `loanPolicies`

| Service Method | Key Logic |
|---------------|-----------|
| `register(dto)` | Validate email/studentId unique. Create member with status=`pending` (online) or `active` (librarian). Hash password (bcrypt cost=12) |
| `login(email, password)` | Verify credentials → check status → check brute force lock → sign JWT → create RefreshToken |
| `refreshToken(token)` | Validate in DB → rotation: revoke old, issue new pair. Detect reuse → revoke all family tokens |
| `suspendMember(id, reason)` | Set status=`suspended`. Revoke all refresh tokens. Enqueue notification email |
| `activateMember(id)` | Set status=`active`. Enqueue notification |
| `updatePolicy(role, dto)` | Update LoanPolicy. New policy applies only to future loans (snapshot on checkout) |

**Brute force:** Redis key `login_attempts:{email}` with TTL=15min. If count ≥ 5, set `lockedUntil` for 30min.

### 4.3 Loan Module

**Collection:** `loanRecords`

| Service Method | Key Logic | Transaction |
|---------------|-----------|-------------|
| `checkout(memberId, barcode)` | Validate copy available (or reserved for this member) → validate member active + !blocked + < maxBooks → create LoanRecord with policy snapshot → set copy.status=`borrowed` → if reserved: set reservation=FULFILLED | Yes |
| `returnBook(barcode)` | Find active/overdue loan → set RETURNED + returnDate → create FineRecords if overdue → check reservation queue → update copy status | Yes |
| `renewLoan(loanId, actorId)` | Validate ACTIVE + renewCount < max + no WAITING reservations for same book → dueDate += renewDays, renewCount++ | Single write |
| `markLost(loanId)` | Set loan=LOST, copy=`lost`. Create special FineRecord with bookValue amount | Yes |
| `getLoanHistory(memberId, filters)` | Paginated query with populate | Read-only |

**Policy snapshot:** On checkout, copy `loanDays`, `maxRenewals`, `renewDays` from current LoanPolicy into the LoanRecord document. Guarantees non-retroactive policy changes (BR-MEM-05).

### 4.4 Reservation Module

**Collection:** `reservations`

| Service Method | Key Logic | Transaction |
|---------------|-----------|-------------|
| `createReservation(memberId, bookId)` | Assert all copies are non-available. Assert no existing active reservation for same member+book. queuePosition = max+1 | Yes (read copies + insert) |
| `cancelReservation(reservationId, actorId)` | Set CANCELLED. Decrement queuePosition for all WAITING with higher position. If was NOTIFIED: release copy → trigger notifyNext | Yes |
| `notifyNext(bookId, copyId)` | Find WAITING with lowest queuePosition. Set NOTIFIED + holdExpiryAt = now+48h. Set copy=`reserved`. Enqueue email | Yes |
| `expireHold(reservationId)` | Set EXPIRED. Decrement positions. Call notifyNext. If no next: set copy=`available` | Yes |
| `getMyReservations(memberId)` | List active + history | Read-only |

**Queue integrity:** All position modifications use `$inc: { queuePosition: -1 }` with filter `{ bookId, status: 'WAITING', queuePosition: { $gt: cancelledPosition } }`.

### 4.5 Fine Module

**Collections:** `fineRecords`, `fineRates`

| Service Method | Key Logic | Transaction |
|---------------|-----------|-------------|
| `calculateDailyFines()` | Batch: find OVERDUE loans → for each overdue day without FineRecord → insert with compound unique check. Recalculate block status per member | Per-batch |
| `payFines(fineIds, actorId)` | Set status=PAID, paidAt=now. Recalculate member block status | Yes |
| `waiveFine(fineId, reason, actorId)` | Validate reason ≥ 10 chars. Set WAIVED + waivedBy + note. Recalculate block | Single write |
| `recalculateBlock(memberId)` | SUM unpaid fines. If ≥ threshold → block. If < threshold → unblock. Enqueue email on change | Single write |
| `getMemberFines(memberId, filters)` | Aggregation: summary (UNPAID/PAID/WAIVED totals) + detail list | Read-only |

**Idempotent insertion:** Compound unique index `{ loanId: 1, overdueDate: 1 }`. Use `insertMany` with `ordered: false` to skip duplicates silently.

### 4.6 Notification Module

**Collection:** `notificationLogs`

Not exposed via REST API. Used internally by other modules.

| Service Method | Logic |
|---------------|-------|
| `enqueueEmail(template, to, context, memberId, eventType, refId)` | Check dedup in notificationLogs → if not sent today → add to BullMQ email queue → write log |
| `processEmailJob(payload)` | Render Handlebars template → send via Nodemailer → update log status |

**Templates** (Handlebars `.hbs` files):
- `checkout_confirmation`
- `due_reminder`
- `overdue_notice`
- `book_available`
- `hold_expiring`
- `account_blocked`
- `account_activated`

### 4.7 Report Module

**No own collection.** Reads from `loanRecords`, `fineRecords`, `bookCopies`, `members`.

| Service Method | Query Pattern |
|---------------|--------------|
| `getLoanStats(dateRange, filters)` | Aggregation pipeline: `$match` → `$group` by date bucket → `$project` counts |
| `getOverdueList(sort, page)` | `$match { status: 'OVERDUE' }` → `$lookup` member + book → `$addFields { overdueDays }` → `$sort` |
| `getPopularBooks(dateRange, limit)` | `$group by bookId` → `$sort by count desc` → `$limit 20` → `$lookup` book details |
| `getInventoryStatus(filters)` | `$group bookCopies by bookId + status` → `$lookup` book info |
| `getFineStats(dateRange)` | `$facet`: summary by status + monthly trend + member debts |
| `exportReport(type, format, filters)` | Call the relevant method → pipe to ExcelJS or PDFKit stream |

---

## 5. MongoDB Collection Design

### 5.1 `books`

```javascript
{
  _id: ObjectId,
  isbn: String,               // unique
  title: String,
  authorIds: [ObjectId],       // ref → authors
  categoryIds: [ObjectId],     // ref → categories
  publisher: String,
  publishYear: Number,
  description: String,
  coverImage: String,          // URL path
  isDeleted: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}
```

### 5.2 `bookCopies`

```javascript
{
  _id: ObjectId,
  bookId: ObjectId,            // ref → books
  barcode: String,             // unique
  status: {
    type: String,
    enum: ['available', 'borrowed', 'reserved', 'damaged', 'lost'],
    default: 'available'
  },
  shelfLocation: String,
  acquiredDate: Date,
  createdAt: Date
}
```

### 5.3 `authors`

```javascript
{
  _id: ObjectId,
  name: String,                // unique
  bio: String
}
```

### 5.4 `categories`

```javascript
{
  _id: ObjectId,
  name: String,                // unique
  parentId: ObjectId           // ref → categories (nullable, for hierarchy)
}
```

### 5.5 `members`

```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String,               // unique
  passwordHash: String,
  phone: String,
  studentId: String,           // unique sparse
  role: { type: String, enum: ['student', 'lecturer', 'librarian', 'admin'] },
  memberCardNo: String,        // unique
  status: { type: String, enum: ['active', 'suspended', 'expired', 'pending'], default: 'pending' },
  isBlocked: { type: Boolean, default: false },
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil: Date,
  joinDate: Date,
  expiryDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.6 `loanPolicies`

```javascript
{
  _id: ObjectId,
  role: { type: String, enum: ['student', 'lecturer', 'librarian'], unique: true },
  maxBooks: Number,
  loanDays: Number,
  maxRenewals: Number,
  renewDays: Number,
  effectiveFrom: Date
}
```

### 5.7 `loanRecords`

```javascript
{
  _id: ObjectId,
  memberId: ObjectId,          // ref → members
  copyId: ObjectId,            // ref → bookCopies
  bookId: ObjectId,            // ref → books (denormalized for query efficiency)
  checkoutDate: Date,
  dueDate: Date,
  returnDate: Date,            // null until returned
  status: {
    type: String,
    enum: ['ACTIVE', 'OVERDUE', 'RETURNED', 'LOST'],
    default: 'ACTIVE'
  },
  renewCount: { type: Number, default: 0 },
  // Policy snapshot (non-retroactive)
  policyLoanDays: Number,
  policyMaxRenewals: Number,
  policyRenewDays: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.8 `reservations`

```javascript
{
  _id: ObjectId,
  memberId: ObjectId,          // ref → members
  bookId: ObjectId,            // ref → books
  queuePosition: Number,
  status: {
    type: String,
    enum: ['WAITING', 'NOTIFIED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
    default: 'WAITING'
  },
  requestDate: Date,
  notifiedAt: Date,
  holdExpiryAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.9 `fineRecords`

```javascript
{
  _id: ObjectId,
  loanId: ObjectId,            // ref → loanRecords
  memberId: ObjectId,          // ref → members
  overdueDate: Date,           // the specific overdue day
  amount: Number,              // VNĐ
  status: {
    type: String,
    enum: ['UNPAID', 'PAID', 'WAIVED'],
    default: 'UNPAID'
  },
  paidAt: Date,
  waivedBy: ObjectId,          // ref → members (actor)
  note: String,
  createdAt: Date
}
```

### 5.10 `fineRates`

```javascript
{
  _id: ObjectId,
  ratePerDay: Number,          // VNĐ
  appliesTo: String,           // 'all' or categoryId string
  effectiveFrom: Date
}
```

### 5.11 `refreshTokens`

```javascript
{
  _id: ObjectId,
  memberId: ObjectId,
  tokenHash: String,           // unique
  familyId: String,            // UUID for rotation detection
  expiresAt: Date,
  revokedAt: Date
}
```

### 5.12 `auditLogs`

```javascript
{
  _id: ObjectId,
  actorId: ObjectId,           // null for system actions
  action: String,              // 'CREATE', 'UPDATE', 'DELETE', 'CHECKOUT', 'RETURN', etc.
  entity: String,              // 'Book', 'Member', 'LoanRecord', etc.
  entityId: ObjectId,
  before: Object,              // BSON snapshot (for updates)
  after: Object,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

### 5.13 `notificationLogs`

```javascript
{
  _id: ObjectId,
  memberId: ObjectId,
  eventType: String,           // 'DUE_REMINDER', 'OVERDUE', 'BOOK_AVAILABLE', etc.
  referenceId: ObjectId,       // loanId or reservationId
  status: { type: String, enum: ['SENT', 'FAILED'], default: 'SENT' },
  sentAt: Date
}
```

---

## 6. Collection Relationships

```
books ──(1:N)──► bookCopies ──(1:N)──► loanRecords ──(1:N)──► fineRecords
  │                                        │
  ├──(N:M via authorIds)──► authors         │
  ├──(N:M via categoryIds)──► categories    │
  │                                        │
  └──(1:N)──► reservations ◄──(N:1)── members ◄──┘
                                        │
                                        └──(N:1)──► loanPolicies (by role)
```

**Reference strategy:**
- `bookCopies.bookId` → ObjectId ref to `books._id`
- `loanRecords.memberId` → ObjectId ref to `members._id`
- `loanRecords.copyId` → ObjectId ref to `bookCopies._id`
- `loanRecords.bookId` → denormalized ObjectId ref (avoids double lookup through bookCopy)
- `reservations.memberId` + `reservations.bookId` → ObjectId refs
- `fineRecords.loanId` + `fineRecords.memberId` → ObjectId refs
- `books.authorIds[]` → array of ObjectId refs (supports multiple authors)
- `books.categoryIds[]` → array of ObjectId refs (supports multiple categories)

**Populate patterns:**
- Book detail: populate `authorIds`, `categoryIds`
- Loan list: populate `copyId` → nested populate `bookId`
- Overdue report: `$lookup` from loanRecords to members + books

---

## 7. Index Strategy

### 7.1 Search Indexes

```javascript
// Full-text search on books
books.createIndex({ title: 'text', isbn: 'text' }, { weights: { title: 10, isbn: 5 } })

// Author name search
authors.createIndex({ name: 'text' })
```

### 7.2 Unique Constraints

```javascript
books.createIndex({ isbn: 1 }, { unique: true })
bookCopies.createIndex({ barcode: 1 }, { unique: true })
members.createIndex({ email: 1 }, { unique: true })
members.createIndex({ studentId: 1 }, { unique: true, sparse: true })
members.createIndex({ memberCardNo: 1 }, { unique: true })
fineRecords.createIndex({ loanId: 1, overdueDate: 1 }, { unique: true })
refreshTokens.createIndex({ tokenHash: 1 }, { unique: true })
```

### 7.3 Query Performance Indexes

```javascript
// Catalog
bookCopies.createIndex({ bookId: 1, status: 1 })
books.createIndex({ isDeleted: 1, createdAt: -1 })

// Loan
loanRecords.createIndex({ memberId: 1, status: 1 })
loanRecords.createIndex({ copyId: 1, status: 1 })
loanRecords.createIndex({ status: 1, dueDate: 1 })         // overdue marker cron
loanRecords.createIndex({ bookId: 1, memberId: 1, status: 1 }) // duplicate book check

// Reservation
reservations.createIndex({ bookId: 1, status: 1, queuePosition: 1 })
reservations.createIndex({ status: 1, holdExpiryAt: 1 })    // hold expiry cron
reservations.createIndex({ memberId: 1, status: 1 })

// Fine
fineRecords.createIndex({ memberId: 1, status: 1 })
fineRecords.createIndex({ loanId: 1 })

// Auth
refreshTokens.createIndex({ memberId: 1, revokedAt: 1 })
refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL auto-cleanup

// Audit
auditLogs.createIndex({ entity: 1, entityId: 1 })
auditLogs.createIndex({ actorId: 1, createdAt: -1 })

// Notification dedup
notificationLogs.createIndex({ memberId: 1, eventType: 1, referenceId: 1, sentAt: 1 })
```

---

## 8. State Machine Design

### 8.1 LoanRecord State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
─(checkout)─► ACTIVE ──(cron: dueDate < now)──► OVERDUE      │
                │                                    │        │
                ├──(return on time)──► RETURNED      │        │
                │                                    │        │
                ├──(renew: dueDate += renewDays)──────┘ (stays ACTIVE)
                │
                ├──(return late)─────────────────► RETURNED
                │                                    │
                └──(mark lost)──► LOST               │
                                                     │
               OVERDUE ──(return + fine)──► RETURNED  │
                    │                                 │
                    └──(mark lost)──► LOST            │
                                                     │
                         (RETURNED and LOST are terminal)
```

**Transitions table:**

| From | Event | To | Side Effects |
|------|-------|----|-------------|
| — | checkout | ACTIVE | Create LoanRecord, copy→borrowed, audit |
| ACTIVE | cron (dueDate < now) | OVERDUE | Update status only |
| ACTIVE | return (returnDate ≤ dueDate) | RETURNED | Set returnDate, copy→available/reserved, audit |
| ACTIVE | return (returnDate > dueDate) | RETURNED | Set returnDate, create fines, check reservation, audit |
| ACTIVE | renew | ACTIVE | dueDate += renewDays, renewCount++, audit |
| ACTIVE | mark lost | LOST | copy→lost, create value-based fine, audit |
| OVERDUE | return | RETURNED | Set returnDate, create fines, check reservation, audit |
| OVERDUE | mark lost | LOST | copy→lost, create value-based fine, audit |

### 8.2 Reservation State Machine

```
─(create)─► WAITING ──(copy returned: notify)──► NOTIFIED
                │                                     │
                │                                     ├──(member picks up in 48h)──► FULFILLED
                │                                     │
                │                                     └──(48h expires)──► EXPIRED
                │
                └──(member/librarian cancels)──► CANCELLED
```

**Transitions table:**

| From | Event | To | Side Effects |
|------|-------|----|-------------|
| — | member creates | WAITING | queuePosition=max+1, audit |
| WAITING | book copy returned (this member is first in queue) | NOTIFIED | holdExpiryAt=now+48h, copy→reserved, email |
| NOTIFIED | member checks out within 48h | FULFILLED | copy→borrowed, audit |
| NOTIFIED | 48h passes without pickup | EXPIRED | Requeue: decrement positions, notifyNext or copy→available, email |
| WAITING / NOTIFIED | cancel | CANCELLED | Decrement subsequent positions, if NOTIFIED: release copy + notifyNext |

---

## 9. Transaction Boundaries

MongoDB transactions require a replica set. All multi-document operations use `session.withTransaction()`.

### 9.1 Checkout Transaction

```
session.withTransaction:
  1. findOneAndUpdate bookCopy (status → 'borrowed')    [write lock]
  2. validate member (active, !blocked, < maxBooks)     [read]
  3. create loanRecord with policy snapshot              [insert]
  4. IF copy was reserved for this member:
     findOneAndUpdate reservation (→ FULFILLED)          [write]
  COMMIT
  
  Post-commit (no transaction):
  - enqueueEmail('checkout_confirmation')
  - writeAuditLog()
```

### 9.2 Return Transaction

```
session.withTransaction:
  1. findOneAndUpdate loanRecord (→ RETURNED, returnDate)  [write lock]
  2. IF overdue:
     insertMany fineRecords (ordered: false)               [insert, idempotent]
     recalculateMemberBlock                                 [read + conditional write]
  3. find next WAITING reservation for bookId               [read]
  4. IF reservation found:
     findOneAndUpdate reservation (→ NOTIFIED, holdExpiryAt) [write]
     findOneAndUpdate bookCopy (→ 'reserved')                [write]
  ELSE:
     findOneAndUpdate bookCopy (→ 'available')               [write]
  COMMIT
  
  Post-commit:
  - IF reservation: enqueueEmail('book_available')
  - writeAuditLog()
```

### 9.3 Fine Calculation (Batch)

No multi-document transaction needed because of idempotent design:

```
For each batch of 100 OVERDUE loans:
  For each loan:
    For each overdue day:
      insertOne fineRecord  // unique index prevents duplicates
  
  For each affected memberId (distinct):
    recalculateBlock(memberId)  // single-document update
```

### 9.4 Reservation Cancel / Expire Transaction

```
session.withTransaction:
  1. findOneAndUpdate reservation (→ CANCELLED/EXPIRED)    [write lock]
  2. updateMany reservations { bookId, status: WAITING, queuePosition > X }
     → $inc { queuePosition: -1 }                          [bulk write]
  3. IF was NOTIFIED:
     find next WAITING for bookId                           [read]
     IF found: update → NOTIFIED, copy → reserved          [writes]
     ELSE: update copy → available                          [write]
  COMMIT
```

---

## 10. Background Job Design

### 10.1 Queue Architecture

Single Redis instance. BullMQ with named queues:

| Queue | Schedule | Worker Concurrency | Purpose |
|-------|----------|-------------------|---------|
| `overdue-marker` | Cron `0 0 * * *` (midnight) | 1 | Mark ACTIVE loans past dueDate → OVERDUE |
| `fine-calculation` | Cron `5 0 * * *` (00:05) | 1 | Create FineRecords for OVERDUE loans |
| `block-check` | After fine-calculation completes | 1 | Recalculate member block status |
| `hold-expiry` | Cron `*/30 * * * *` (every 30min) | 1 | Expire holds past holdExpiryAt, trigger notifyNext |
| `due-reminder` | Cron `0 8 * * *` (08:00) | 1 | Email reminders for loans due within 3 days |
| `overdue-reminder` | Cron `30 8 * * *` (08:30) | 1 | Daily overdue summary email per member |
| `hold-reminder` | Cron `0 * * * *` (hourly) | 1 | Remind holds expiring within 12h |
| `email-sender` | On-demand (fed by all others) | 3 | Actual SMTP delivery |

### 10.2 Job Processing Pattern

```
1. Cron schedules job → BullMQ adds to queue
2. Worker picks job → reads batch (100 records)
3. Process each record → enqueue side-effect jobs (email, block-check)
4. On failure: retry 3x with exponential backoff (1min, 5min, 15min)
5. After 3 failures: move to dead-letter queue, log error
6. On success: log summary (processed count, duration)
```

### 10.3 Fine Calculation Job Detail

```typescript
// jobs/fineCalculation.job.ts
async function process() {
  // Step 1: Mark ACTIVE loans past dueDate as OVERDUE
  await LoanRecord.updateMany(
    { status: 'ACTIVE', dueDate: { $lt: new Date() } },
    { $set: { status: 'OVERDUE' } }
  );

  // Step 2: Process fines in batches
  const cursor = LoanRecord.find({ status: 'OVERDUE' }).cursor();
  let batch = [];
  
  for await (const loan of cursor) {
    const fineRate = await getCurrentFineRate(loan.overdueDate);
    const overdueDays = diffDays(loan.dueDate, new Date());
    
    for (let d = 1; d <= overdueDays; d++) {
      const overdueDate = addDays(loan.dueDate, d);
      batch.push({
        loanId: loan._id,
        memberId: loan.memberId,
        overdueDate,
        amount: fineRate.ratePerDay,
        status: 'UNPAID'
      });
    }
    
    if (batch.length >= 100) {
      await FineRecord.insertMany(batch, { ordered: false }); // skip duplicates
      batch = [];
    }
  }
  if (batch.length) await FineRecord.insertMany(batch, { ordered: false });

  // Step 3: Recalculate block for affected members
  const affectedMembers = await FineRecord.distinct('memberId', { status: 'UNPAID' });
  for (const memberId of affectedMembers) {
    await fineService.recalculateBlock(memberId);
  }
}
```

### 10.4 Hold Expiry Job Detail

```
1. Find reservations WHERE status='NOTIFIED' AND holdExpiryAt <= now
2. For each expired reservation:
   a. Run expireHold transaction (expire → requeue → notify next or release)
   b. Enqueue email to notify expired member
3. Log summary
```

### 10.5 Email Sender Job

```typescript
interface EmailJobPayload {
  template: string;
  to: string;
  subject: string;
  context: Record<string, unknown>;
  memberId: string;
  eventType: string;
  referenceId?: string;
}

// Worker processes:
// 1. Render Handlebars template with context
// 2. Send via Nodemailer
// 3. Update notificationLog status to SENT
// 4. On failure: retry (BullMQ built-in)
```

---

## 11. API Layer Design

### 11.1 Base URL

`/api/v1`

### 11.2 Response Envelope

```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 142 } }

// Error
{ "success": false, "error": { "code": "ERR_LOAN_MAX_BOOKS", "message": "...", "details": {} }, "requestId": "...", "timestamp": "..." }
```

### 11.3 Endpoint Map

#### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login → JWT pair |
| POST | `/auth/refresh` | Cookie | Refresh tokens |
| POST | `/auth/logout` | Member | Revoke refresh token |
| POST | `/auth/register` | Public | Self-registration (pending) |

#### Catalog

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/books` | Public | Search + filter + paginate |
| GET | `/books/:id` | Public | Book detail + copies |
| POST | `/books` | Librarian | Create book + copies |
| PATCH | `/books/:id` | Librarian | Update book info |
| DELETE | `/books/:id` | Librarian | Soft delete |
| POST | `/books/:id/copies` | Librarian | Add copies to existing book |
| POST | `/books/import` | Librarian | CSV import (multipart) |

#### Members

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/members` | Librarian | List + search members |
| GET | `/members/:id` | Librarian | Member detail |
| GET | `/members/me` | Member | Own profile |
| POST | `/members` | Librarian | Create member (active) |
| PATCH | `/members/:id` | Librarian | Update member |
| PATCH | `/members/:id/suspend` | Librarian | Suspend / activate |

#### Loans

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/loans/checkout` | Librarian | Checkout book |
| POST | `/loans/:id/return` | Librarian | Return book |
| POST | `/loans/:id/renew` | Member+Lib | Renew loan |
| POST | `/loans/:id/lost` | Librarian | Mark lost |
| GET | `/loans/me` | Member | Own loan history |
| GET | `/loans` | Librarian | All loans (filter by member, status) |

#### Reservations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reservations` | Member | Create reservation |
| DELETE | `/reservations/:id` | Member+Lib | Cancel reservation |
| GET | `/reservations/me` | Member | My reservations |
| GET | `/reservations` | Librarian | All active reservations |

#### Fines

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/fines/me` | Member | Own fines (summary + list) |
| GET | `/fines` | Librarian | Search by member |
| POST | `/fines/pay` | Librarian | Pay selected fines |
| POST | `/fines/:id/waive` | Librarian | Waive fine with reason |

#### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports/loans/summary` | Librarian | Loan statistics |
| GET | `/reports/overdue` | Librarian | Overdue list |
| GET | `/reports/popular-books` | Librarian | Top borrowed books |
| GET | `/reports/inventory` | Librarian | Copy status breakdown |
| GET | `/reports/fines/summary` | Librarian | Fine statistics |
| GET | `/reports/export` | Librarian | Export as xlsx/pdf |

#### Config

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/config/loan-policies` | Admin | List policies |
| PATCH | `/config/loan-policies/:role` | Admin | Update policy |
| GET | `/config/fine-rates` | Admin | List rates |
| PATCH | `/config/fine-rates/:id` | Admin | Update rate |

### 11.4 Pagination

Query params: `?page=1&limit=20&sort=-createdAt`

Response meta: `{ page, limit, total, totalPages }`

---

## 12. RBAC Authorization Design

### 12.1 Role Hierarchy

```
admin > librarian > lecturer > student > public
```

### 12.2 Middleware Implementation

```typescript
// authenticate: verifies JWT, attaches req.user
// authorize(...roles): checks req.user.role against allowed list

router.post('/books', authenticate, authorize('librarian', 'admin'), controller.create);
router.get('/books', controller.search); // public, no auth needed
```

### 12.3 Permission Matrix

| Resource | Public | Student | Lecturer | Librarian | Admin |
|----------|:------:|:-------:|:--------:|:---------:|:-----:|
| Search books | ✅ | ✅ | ✅ | ✅ | ✅ |
| View book detail | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRUD books | ❌ | ❌ | ❌ | ✅ | ✅ |
| Import CSV | ❌ | ❌ | ❌ | ✅ | ✅ |
| View own profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage members | ❌ | ❌ | ❌ | ✅ | ✅ |
| Checkout / return | ❌ | ❌ | ❌ | ✅ | ❌ |
| Renew (own) | ❌ | ✅ | ✅ | ✅ | ❌ |
| View own loans | ❌ | ✅ | ✅ | ✅ | ✅ |
| View any loans | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create reservation | ❌ | ✅ | ✅ | ❌ | ❌ |
| Cancel reservation (own) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Cancel reservation (any) | ❌ | ❌ | ❌ | ✅ | ✅ |
| View own fines | ❌ | ✅ | ✅ | ✅ | ✅ |
| Pay / waive fines | ❌ | ❌ | ❌ | ✅ | ✅ |
| View reports | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export reports | ❌ | ❌ | ❌ | ✅ | ✅ |
| Configure policies | ❌ | ❌ | ❌ | ❌ | ✅ |

### 12.4 Resource Ownership Checks

For endpoints like `/loans/:id/renew`, the authorize middleware also checks:
- If role is `student` or `lecturer`: verify `loan.memberId === req.user._id`
- If role is `librarian`: allow any

Implemented via an `authorizeOwner(resourceField)` middleware or inline in the controller.

---

## 13. Error Handling Strategy

### 13.1 Error Class Hierarchy

```typescript
class AppError extends Error {
  code: string;       // 'ERR_LOAN_MAX_BOOKS'
  statusCode: number; // 422
  details?: object;
}

class ValidationError extends AppError { /* 400 */ }
class AuthenticationError extends AppError { /* 401 */ }
class ForbiddenError extends AppError { /* 403 */ }
class NotFoundError extends AppError { /* 404 */ }
class ConflictError extends AppError { /* 409 */ }
class BusinessRuleError extends AppError { /* 422 */ }
class RateLimitError extends AppError { /* 429 */ }
```

### 13.2 Error Codes

Convention: `ERR_{MODULE}_{REASON}`. Full catalog:

- **Auth:** `ERR_AUTH_INVALID_CREDENTIALS`, `ERR_AUTH_ACCOUNT_SUSPENDED`, `ERR_AUTH_TOKEN_EXPIRED`, `ERR_AUTH_REFRESH_REUSE`, `ERR_AUTH_TOO_MANY_ATTEMPTS`
- **Catalog:** `ERR_CAT_ISBN_EXISTS`, `ERR_CAT_BOOK_NOT_FOUND`, `ERR_CAT_COPY_HAS_LOAN`, `ERR_CAT_DELETE_HAS_ACTIVE_LOANS`
- **Member:** `ERR_MEM_EMAIL_EXISTS`, `ERR_MEM_NOT_FOUND`, `ERR_MEM_ALREADY_SUSPENDED`
- **Loan:** `ERR_LOAN_COPY_NOT_AVAILABLE`, `ERR_LOAN_MEMBER_BLOCKED`, `ERR_LOAN_MAX_BOOKS`, `ERR_LOAN_RENEW_MAX`, `ERR_LOAN_RENEW_HAS_RESERVATION`, `ERR_LOAN_ALREADY_RETURNED`
- **Reservation:** `ERR_RES_COPY_AVAILABLE`, `ERR_RES_ALREADY_RESERVED`, `ERR_RES_MEMBER_BLOCKED`
- **Fine:** `ERR_FINE_ALREADY_PAID`, `ERR_FINE_WAIVE_REASON_SHORT`

### 13.3 Global Error Handler

```typescript
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      requestId: req.id,
      timestamp: new Date().toISOString()
    });
  }
  
  // Mongoose validation errors → 400
  if (err.name === 'ValidationError') { ... }
  // Mongoose duplicate key → 409
  if (err.code === 11000) { ... }
  
  // Unknown → 500 (log full error, return generic message)
  logger.error({ err, requestId: req.id });
  return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Internal server error' } });
});
```

---

## 14. Audit Logging Design

### 14.1 Strategy

Every write operation (create, update, delete, checkout, return, pay, waive, etc.) generates an audit log entry.

### 14.2 Implementation

```typescript
// common/utils/auditLogger.ts
async function writeAuditLog(params: {
  actorId: string | null;     // null = system/cron
  action: string;
  entity: string;
  entityId: string;
  before?: object;
  after?: object;
  ip?: string;
  userAgent?: string;
}) {
  // Fire-and-forget (don't block the main operation)
  AuditLog.create(params).catch(err => logger.error('Audit write failed', err));
}
```

### 14.3 Captured Fields

| Field | Source |
|-------|--------|
| `actorId` | `req.user._id` or `null` (for cron jobs) |
| `action` | Service method (e.g., `CHECKOUT`, `RETURN`, `UPDATE`, `SOFT_DELETE`) |
| `entity` | Model name (`Book`, `Member`, `LoanRecord`, etc.) |
| `entityId` | Document `_id` |
| `before` | Previous document state (for updates) — captured via Mongoose `pre('findOneAndUpdate')` hook |
| `after` | New document state |
| `ipAddress` | `req.ip` |
| `userAgent` | `req.headers['user-agent']` |

### 14.4 Retention

- No automatic deletion
- Optional: MongoDB TTL index on `createdAt` with a long TTL (e.g., 3 years) if storage is a concern

---

## 15. Folder Structure

### 15.1 Backend (Server)

```
server/
├── src/
│   ├── modules/
│   │   ├── catalog/
│   │   │   ├── catalog.routes.ts
│   │   │   ├── catalog.controller.ts
│   │   │   ├── catalog.service.ts
│   │   │   ├── catalog.repository.ts
│   │   │   ├── catalog.validator.ts
│   │   │   └── catalog.types.ts
│   │   ├── member/
│   │   │   ├── member.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── member.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── member.service.ts
│   │   │   ├── member.repository.ts
│   │   │   ├── member.validator.ts
│   │   │   └── member.types.ts
│   │   ├── loan/
│   │   │   ├── loan.routes.ts
│   │   │   ├── loan.controller.ts
│   │   │   ├── loan.service.ts
│   │   │   ├── loan.repository.ts
│   │   │   ├── loan.validator.ts
│   │   │   └── loan.types.ts
│   │   ├── reservation/
│   │   │   ├── reservation.routes.ts
│   │   │   ├── reservation.controller.ts
│   │   │   ├── reservation.service.ts
│   │   │   ├── reservation.repository.ts
│   │   │   ├── reservation.validator.ts
│   │   │   └── reservation.types.ts
│   │   ├── fine/
│   │   │   ├── fine.routes.ts
│   │   │   ├── fine.controller.ts
│   │   │   ├── fine.service.ts
│   │   │   ├── fine.repository.ts
│   │   │   ├── fine.validator.ts
│   │   │   └── fine.types.ts
│   │   ├── notification/
│   │   │   ├── notification.service.ts
│   │   │   ├── notification.repository.ts
│   │   │   └── templates/
│   │   │       ├── checkout_confirmation.hbs
│   │   │       ├── due_reminder.hbs
│   │   │       ├── overdue_notice.hbs
│   │   │       ├── book_available.hbs
│   │   │       ├── hold_expiring.hbs
│   │   │       ├── account_blocked.hbs
│   │   │       └── account_activated.hbs
│   │   └── report/
│   │       ├── report.routes.ts
│   │       ├── report.controller.ts
│   │       ├── report.service.ts
│   │       ├── report.repository.ts
│   │       └── report.types.ts
│   ├── models/
│   │   ├── Book.model.ts
│   │   ├── BookCopy.model.ts
│   │   ├── Author.model.ts
│   │   ├── Category.model.ts
│   │   ├── Member.model.ts
│   │   ├── LoanPolicy.model.ts
│   │   ├── LoanRecord.model.ts
│   │   ├── Reservation.model.ts
│   │   ├── FineRecord.model.ts
│   │   ├── FineRate.model.ts
│   │   ├── RefreshToken.model.ts
│   │   ├── AuditLog.model.ts
│   │   └── NotificationLog.model.ts
│   ├── jobs/
│   │   ├── index.ts                    # Queue registration + scheduler
│   │   ├── overdueMarker.job.ts
│   │   ├── fineCalculation.job.ts
│   │   ├── blockCheck.job.ts
│   │   ├── holdExpiry.job.ts
│   │   ├── dueReminder.job.ts
│   │   ├── overdueReminder.job.ts
│   │   ├── holdReminder.job.ts
│   │   └── emailSender.job.ts
│   ├── common/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── requestId.ts
│   │   │   └── requestLogger.ts
│   │   ├── errors/
│   │   │   ├── AppError.ts
│   │   │   └── errorCodes.ts
│   │   ├── utils/
│   │   │   ├── barcodeGenerator.ts
│   │   │   ├── pagination.ts
│   │   │   ├── dateHelpers.ts
│   │   │   └── auditLogger.ts
│   │   └── types/
│   │       ├── enums.ts
│   │       └── express.d.ts
│   ├── config/
│   │   ├── env.ts                      # dotenv + Zod validation
│   │   ├── database.ts                 # Mongoose connection
│   │   ├── redis.ts                    # IORedis singleton
│   │   └── queue.ts                    # BullMQ connection config
│   ├── app.ts                          # Express app setup
│   └── server.ts                       # HTTP + graceful shutdown
├── tests/
│   ├── unit/
│   ├── integration/
│   └── helpers/
├── .env.example
├── tsconfig.json
├── jest.config.ts
├── Dockerfile
└── package.json
```

### 15.2 Frontend (Admin + Reader)

```
client/
├── admin/
│   ├── src/
│   │   ├── pages/          # (see §2.2)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/       # API client (axios)
│   │   ├── store/          # Zustand
│   │   ├── layouts/
│   │   ├── routes.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── reader/
│   ├── src/
│   │   ├── pages/          # (see §2.3)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── layouts/
│   │   ├── routes.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── shared/
    ├── types/
    ├── constants/
    ├── utils/
    └── package.json
```

---

## 16. Testing Strategy

### 16.1 Test Pyramid

| Layer | Tool | Target Coverage | What to Test |
|-------|------|----------------|-------------|
| **Unit** | Jest | 80% on Service layer | Business rules, state transitions, edge cases. Mock repositories |
| **Integration** | Jest + Supertest | Critical flows | Full HTTP → MongoDB round-trip. Use in-memory MongoDB (mongodb-memory-server) |
| **E2E** | Playwright (optional) | Happy paths | Login → checkout → return → fine flow in browser |
| **Frontend Unit** | React Testing Library | Components | Form validation, conditional rendering, role-based visibility |

### 16.2 Test Database

- Use `mongodb-memory-server` for integration tests — spins up ephemeral MongoDB per test suite
- `beforeEach`: seed test data via factories
- `afterEach`: drop all collections

### 16.3 Priority Test Scenarios

1. **Checkout:** Happy + all failure modes (max books, blocked, suspended, copy unavailable, reserved for other)
2. **Return:** On time, overdue (fine creation count), with reservation (hold trigger), report damaged
3. **Renewal:** Success, max reached, reservation blocks, OVERDUE blocks
4. **Fine cron:** Idempotency (run 3 times → same records), rate lookup, block threshold
5. **Reservation queue:** FIFO order, cancel reorder, hold expiry cascade, notify next
6. **Auth:** Login, refresh rotation, token reuse detection, brute force lockout (5 attempts)
7. **Policy snapshot:** Change policy after checkout → verify existing loan uses old values

### 16.4 CI Pipeline

```
lint → typecheck → unit tests → integration tests → build
```

---

## 17. Deployment Architecture

### 17.1 Docker Compose (Development + Production)

```yaml
services:
  api:
    build: ./server
    ports: ["5000:5000"]
    depends_on: [mongo, redis]
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/libero?replicaSet=rs0
      - REDIS_URL=redis://redis:6379

  worker:
    build: ./server
    command: "node dist/jobs/index.js"
    depends_on: [mongo, redis]

  admin:
    build: ./client/admin
    # Nginx serves static build

  reader:
    build: ./client/reader
    # Nginx serves static build

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on: [api, admin, reader]

  mongo:
    image: mongo:7
    command: ["--replSet", "rs0"]
    ports: ["27017:27017"]
    volumes: ["mongodata:/data/db"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  mongodata:
```

**Note:** MongoDB must run as a replica set (even single-node) to support multi-document transactions.

### 17.2 Production Architecture

```
VPS (4 vCPU, 8GB RAM, 100GB SSD)
├── Nginx (TLS via Let's Encrypt)
│   ├── /api/* → API container (port 5000)
│   ├── /admin/* → Admin static files
│   └── /* → Reader static files
├── API Server (PM2 cluster, 2 instances)
├── Worker Process (PM2, 1 instance)
├── MongoDB 7 (single-node replica set)
├── Redis 7
└── Cron: mongodump daily at 02:00 → encrypted backup
```

### 17.3 Environment Variables

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/libero?replicaSet=rs0
REDIS_URL=redis://localhost:6379
JWT_SECRET=<256-bit-random>
JWT_ACCESS_TTL=900          # 15 minutes
JWT_REFRESH_TTL=604800      # 7 days
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
FINE_BLOCK_THRESHOLD=50000  # VNĐ
HOLD_EXPIRY_HOURS=48
FRONTEND_URL=https://library.example.com
```

### 17.4 Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  server.close();              // stop accepting new HTTP connections
  await bullmqWorker.close();  // finish current jobs
  await mongoose.disconnect();
  await redis.quit();
  process.exit(0);
});
```

---

## 18. Assumptions and Open Decisions

| # | Topic | Decision | Rationale |
|---|-------|----------|-----------|
| 1 | MongoDB Replica Set | **Required** even single-node | Multi-document transactions (checkout, return) require replica set |
| 2 | Full-text search | **MongoDB text index** | Sufficient for 50K books. Upgrade to Atlas Search or Elasticsearch if needed later |
| 3 | File storage (covers) | **Local disk + Nginx static** | MVP simplicity. Migrate to S3/Cloudinary if multi-server |
| 4 | Frontend BFF pattern | **Direct API calls** | No BFF layer. Both SPAs call `/api/v1` directly |
| 5 | Monorepo vs Polyrepo | **Monorepo** with npm workspaces | Shared types/constants between client and server |
| 6 | CSS Strategy | **Ant Design** for Admin, **custom CSS + CSS Modules** for Reader | Admin needs rapid development; Reader needs brand identity |
| 7 | Real-time updates | **Polling** (React Query refetchInterval) | WebSocket deferred. Polling every 30s sufficient for library scale |
| 8 | Image handling | **Multer** for upload, **Sharp** for resize (800×1200px max, ≤ 5MB) | Stored in `/uploads/covers/` served by Nginx |
| 9 | Logging library | **Pino** (structured JSON) | Fast, low overhead, JSON format for log aggregation |
| 10 | Rate limiting | **express-rate-limit** with Redis store | 100 req/min general, 10 req/min login, 5 req/min refresh |
| 11 | Timezone | **Store UTC** in MongoDB. Display `Asia/Ho_Chi_Minh` on frontend using `dayjs` | Consistent storage, localized display |
| 12 | Reservation max per member | **No global limit** (only 1 per book enforced) | Per SRS. Add global limit if needed |
| 13 | LoanRecord.bookId denormalization | **Include** for query efficiency | Avoids double lookup through BookCopy on aggregation queries. Maintained in checkout |
| 14 | Monitoring | **Deferred** to post-MVP | Consider Prometheus + Grafana or hosted APM |
| 15 | i18n | **Vietnamese only** for v1 | Per SRS constraint C-07 |

---

*This document is derived from SRS v1.1 (2026-04-14). All business rules, domain constraints, and scope boundaries from the SRS are strictly preserved. Implementation should reference both SRS (for "what") and this SDD (for "how").*
