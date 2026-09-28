# Collectra

**Secure package intake, storage, and OTP-verified release for residential buildings, university hostels, and corporate front desks.**

**Live application:** [collectra-kappa.vercel.app](https://collectra-kappa.vercel.app)
**API:** [collectra-api.onrender.com](https://collectra-api.onrender.com/health)

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture Design](#architecture-design)
4. [Tech Stack](#tech-stack)
5. [Using the Application](#using-the-application)
6. [Database Schema](#database-schema)
7. [Core Components](#core-components)
8. [Algorithms](#algorithms)
9. [Concurrency Handling](#concurrency-handling)
10. [Design Patterns](#design-patterns)
11. [Class Diagram](#class-diagram)
12. [Usage](#usage)
13. [Features](#features)

---

## Overview

Front desks in hostels, apartment complexes, and offices receive a steady stream of parcels on behalf of residents and employees. These parcels are typically logged in paper registers and handed over to anyone who claims them, which makes misdelivery and loss difficult to prevent or trace.

Collectra replaces that process with a verifiable chain of custody:

1. **Intake.** Front-desk staff log each incoming parcel. The system assigns a unique order ID, generates a QR code, and sends the recipient an SMS with a tracking link.
2. **Storage.** The parcel is tracked against a physical rack location. Parcels left unclaimed are flagged as overdue, and recipients receive automated reminders.
3. **Release.** When the recipient arrives, staff scan the QR code or enter the order ID. A one-time passcode is sent to the recipient's registered mobile number, and the parcel is released only after that code is verified.
4. **Audit.** Every collection is timestamped, the recipient is notified, and administrators can review throughput, retrieval rates, and overdue volume on an analytics dashboard.

---

## Key Features

- **Staff authentication** using JSON Web Tokens and bcrypt-hashed passwords.
- **Automated order IDs and QR codes** generated for every parcel at intake.
- **SMS notifications** through Twilio at intake, at release, and for reminders.
- **OTP-verified release**: six-digit codes that expire after five minutes, are stored only as hashes, and lock out after five incorrect attempts.
- **Overdue detection** with scheduled, rate-limited reminder messages.
- **Inventory management** with search, rack reassignment, manual reminders, and removal.
- **Analytics dashboard** showing order status distribution and inflow and outflow trends.
- **Public tracking page** that recipients can open from their SMS without signing in.

---

## Architecture Design

Collectra follows a three-tier architecture. The client and API are deployed independently and communicate over HTTPS with JSON payloads.

```mermaid
flowchart LR
    subgraph Client["Presentation tier (Vercel)"]
        UI["Next.js application<br/>Staff console and public tracking page"]
    end

    subgraph API["Application tier (Render)"]
        direction TB
        MW["Middleware<br/>Helmet, CORS, JSON parser, JWT auth"]
        RT["Routers<br/>auth, orders, analytics, public"]
        CT["Controllers"]
        MD["Models (data access)"]
        SV["Services<br/>QR generation, SMS delivery"]
        JB["Scheduled job<br/>Overdue detection and reminders"]
        MW --> RT --> CT
        CT --> MD
        CT --> SV
        JB --> MD
        JB --> SV
    end

    subgraph Data["Data tier (Supabase)"]
        DB[("PostgreSQL")]
    end

    TW["Twilio SMS API"]
    Phone["Recipient's phone"]

    UI -- "REST / JSON over HTTPS" --> MW
    MD -- "Pooled connections over TLS" --> DB
    SV --> TW --> Phone
    Phone -- "Tracking link" --> UI
```

### Request lifecycle

1. The browser sends a request with a `Bearer` token in the `Authorization` header. An Axios interceptor attaches it automatically.
2. Helmet sets security headers, and CORS restricts access to the configured frontend origin.
3. The `requireAuth` middleware verifies the JWT and adds the user's ID and role to the request.
4. The router sends the request to a controller wrapped in `asyncHandler`, which forwards any error to the central error handler.
5. The controller validates input, calls one or more model functions (parameterised SQL through a shared connection pool), and calls services for QR codes or SMS.
6. The response is returned as JSON. `HttpError` instances become structured `{ error }` responses with the matching status code.

### Order lifecycle

```mermaid
stateDiagram-v2
    [*] --> stored: Staff logs parcel (intake SMS sent)
    stored --> overdue: Unclaimed for more than 7 days
    stored --> collected: OTP verified and released
    overdue --> collected: OTP verified and released
    collected --> [*]
```

### Deployment topology

| Tier | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Builds from `frontend/`. `NEXT_PUBLIC_API_URL` points at the API. |
| Backend | Render (Web Service) | Builds from `backend/`. Applies the schema and patches before starting. |
| Database | Supabase (PostgreSQL) | Connected through the IPv4 session pooler with TLS. |
| Messaging | Twilio | Programmable SMS. |
| Uptime | GitHub Actions | `.github/workflows/keep-alive.yml` pings the API and database every 10 minutes. |

---

## Tech Stack

### Frontend

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui (Radix UI primitives) |
| Charts | Recharts |
| QR scanning | `@yudiel/react-qr-scanner` |
| HTTP client | Axios, with request and response interceptors |
| Icons | Lucide React |

### Backend

| Concern | Technology |
|---|---|
| Runtime | Node.js, Express 4, TypeScript (ES modules) |
| Database | PostgreSQL via `node-postgres` (`pg`) |
| Authentication | `jsonwebtoken`, `bcryptjs` |
| Security | Helmet, CORS allow-listing |
| Messaging | Twilio Node SDK |
| QR generation | `qrcode` |
| Scheduling | `node-cron` |
| Development | `tsx` (watch mode), Localtunnel proxy for device testing |

---

## Using the Application

This section explains how to use the live application at [collectra-kappa.vercel.app](https://collectra-kappa.vercel.app).

> **Note on first load:** the API runs on a free hosting tier. If it has been idle, the first request can take up to a minute while the server starts. Later requests respond immediately.

### Before you begin: SMS and phone numbers

Collectra sends one-time passcodes and notifications as real SMS messages through Twilio. To experience the full release workflow, **enter a real, active mobile number that you have access to** as the recipient's phone number when logging a parcel.

- Enter the number as **10 digits without a country code**, for example `9876543210`. The system adds the `+91` (India) prefix automatically.
- The OTP needed to release a parcel is delivered only to the number recorded at intake. If you enter a placeholder number, you will not be able to complete the release step.
- The demo runs on a Twilio trial account, which can only deliver messages to pre-verified numbers. If you are evaluating the project and do not receive a message, please contact the maintainer to have your number verified.

### 1. Create a staff account

1. Open the application and select **Register here**.
2. Choose a username and a password of at least six characters, then select **Register Account**.
3. You are signed in and taken to the **System Overview** dashboard.

New accounts are given the `security` (front-desk staff) role. The `admin` role is granted directly in the database.

### 2. Log an incoming parcel (Order In)

1. Select **Order In** from the sidebar.
2. Fill in the parcel details:
   - **Receiver name** (required)
   - **Phone number** (required; the recipient's real 10-digit mobile number)
   - **Description**, for example "Amazon package, medium box"
   - **Location**, for example the hostel block or department
   - **Rack number**, for example `R-102`
3. Submit the form. The system:
   - assigns a unique order ID, for example `ORD000042`,
   - generates a QR code that encodes that ID,
   - sends the recipient an SMS containing the order ID and a tracking link.
4. The confirmation screen shows the order ID, timestamp, storage location, and QR code.

### 3. Recipient tracking

The recipient opens the link in their SMS (`/order/<orderId>`). The page shows the order ID, storage date, rack number, current status, and the QR code to present at the desk. No account is needed.

### 4. Release a parcel (Order Out)

1. Select **Order Out** from the sidebar.
2. **Identify the parcel.** Scan the QR code shown on the recipient's phone with the device camera, or type the order ID manually.
3. **Review the details.** Confirm the receiver name, rack, and status, then select the option to send an OTP. A six-digit code is sent by SMS to the phone number recorded at intake.
4. **Verify identity.** Ask the recipient for the code and enter it.
   - The code is valid for five minutes.
   - After five incorrect attempts, the code is locked and a new one must be requested.
5. **Release.** Once the code is verified, confirm the release. The parcel is marked as collected with a timestamp, and the recipient receives a confirmation SMS.

### 5. Manage stored inventory (Stored Orders)

- Search by order ID or receiver name.
- **Send a reminder** SMS to a recipient manually.
- **Update the rack** if a parcel is moved.
- **Remove** an order that was logged in error.

### 6. Review analytics (Admin Analytics)

The analytics view summarises the last 30 days:

- Total, currently stored, collected, and overdue orders.
- Daily order intake volume.
- Inflow compared with outflow (orders received compared with orders collected per day).

---

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ ORDERS : "creates"

    USERS {
        serial id PK
        varchar(50) username UK "unique login name"
        text password_hash "bcrypt hash"
        varchar(20) role "security | admin"
    }

    ORDERS {
        serial id PK
        varchar(20) order_id UK "public ID, e.g. ORD000042"
        varchar(100) receiver_name
        bigint phone_number "10 digits, CHECK constrained"
        text description
        varchar(100) location
        varchar(20) rack_number
        order_status status "stored | collected | overdue"
        text qr_code_base64 "PNG data URL"
        text otp_code "bcrypt hash of current OTP"
        timestamp otp_expires_at
        boolean otp_verified
        integer otp_attempts
        timestamp created_at
        timestamp collected_at
        timestamp last_reminded_at
        integer created_by FK
    }
```

### Constraints and indexes

| Object | Definition | Purpose |
|---|---|---|
| `order_status` | `ENUM ('stored', 'collected', 'overdue')` | Restricts status to valid lifecycle states. |
| `orders.order_id` | `UNIQUE` | Guarantees one record per public order ID, even under concurrent inserts. |
| `orders.phone_number` | `CHECK (1000000000 <= n <= 9999999999)` | Enforces a 10-digit mobile number at the storage layer. |
| `orders.created_by` | `REFERENCES users(id)` | Links each record to the staff member who logged it. |
| `idx_orders_order_id` | B-tree on `order_id` | Lookups during tracking, OTP, and release. |
| `idx_orders_status` | B-tree on `status` | Overdue scans and status aggregation. |
| `idx_orders_created_at` | B-tree on `created_at` | Time-window analytics and default ordering. |
| `idx_orders_phone` | B-tree on `phone_number` | Recipient lookups. |

### Migrations

| File | Purpose |
|---|---|
| `backend/db/schema.sql` | Creates the enum, tables, and indexes idempotently (`IF NOT EXISTS`). |
| `backend/db/patches/001_otp_verified.sql` | Adds `otp_verified` to older databases. |
| `backend/db/patches/002_phone_bigint.sql` | Converts a legacy `VARCHAR` phone column to `BIGINT`. Safe to re-run. |
| `backend/migrate.ts` | Adds `last_reminded_at` and `otp_attempts`, and widens `otp_code` to `TEXT` to hold hashes. |

---

## Core Components

### Backend (`backend/src`)

| Layer | Module | Responsibility |
|---|---|---|
| Entry point | `server.ts` | Configures middleware, mounts routers, exposes health checks, starts the HTTP server, and schedules the overdue job. |
| Configuration | `config/db.ts` | Creates the PostgreSQL connection pool on first use. Configures TLS and parses `BIGINT` columns into numbers. |
| Middleware | `middleware/authMiddleware.ts` | Validates the bearer JWT and adds `{ id, role }` to the request. |
| | `middleware/errorHandler.ts` | Defines `HttpError` and converts errors into consistent JSON responses. |
| Routes | `routes/authRoutes.ts` | `POST /api/auth/register`, `POST /api/auth/login` |
| | `routes/orderRoutes.ts` | Authenticated order operations: create, list, OTP, collect, remind, rack, delete. |
| | `routes/analyticsRoutes.ts` | Authenticated dashboard aggregates. |
| | `routes/publicRoutes.ts` | Unauthenticated, read-only tracking data for recipients. |
| Controllers | `controllers/authController.ts` | Registration and login, password hashing, and token signing. |
| | `controllers/orderController.ts` | Intake, OTP issuance and verification, release, reminders, and inventory operations. |
| | `controllers/analyticsController.ts` | Runs the aggregate queries in parallel and combines the results. |
| Models | `models/userModel.ts`, `models/orderModel.ts`, `models/analyticsModel.ts` | Parameterised SQL queries that return typed rows. |
| Services | `services/qrService.ts` | Encodes an order ID as a PNG data URL. |
| | `services/smsService.ts` | Composes message templates and delivers them through Twilio, or logs them in mock mode. |
| Jobs | `jobs/overdueJob.ts` | Marks stale parcels as overdue and sends rate-limited reminders. |
| Utilities | `util/asyncHandler.ts`, `util/phone.ts` | Error forwarding for async handlers, and phone number normalisation. |

### Frontend (`frontend/src`)

| Area | Path | Responsibility |
|---|---|---|
| Authentication | `app/page.tsx`, `lib/auth.ts` | Sign-in and registration screen, and token storage. |
| API client | `lib/api.ts` | Axios instance that adds the bearer token and redirects to sign-in on `401`. |
| Staff console | `app/(system)/dashboard` | Navigation hub. |
| | `app/(system)/order-in` | Parcel intake form and confirmation with QR code. |
| | `app/(system)/order-out` | Four-step release flow: identify, review, verify, release. |
| | `app/(system)/orders` | Searchable inventory with reminder, rack, and delete actions. |
| | `app/(system)/admin` | KPI cards and Recharts visualisations. |
| Public | `app/order/[id]` | Recipient tracking page opened from the SMS link. |
| Shared UI | `components/Sidebar.tsx`, `components/ui/*` | Navigation and shadcn/ui components. |

### REST API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Liveness check. |
| `GET` | `/health/db` | None | Database connectivity check. |
| `POST` | `/api/auth/register` | None | Create a staff account. Returns `{ token, user }`. |
| `POST` | `/api/auth/login` | None | Authenticate. Returns `{ token, user }`. |
| `GET` | `/api/orders?page=&limit=` | JWT | List orders, newest first. |
| `POST` | `/api/orders` | JWT | Log a parcel. Generates the ID and QR code and sends the intake SMS. |
| `GET` | `/api/orders/:orderId` | JWT | Full order record. |
| `POST` | `/api/orders/:orderId/send-otp` | JWT | Issue and send a new OTP. |
| `POST` | `/api/orders/:orderId/verify-otp` | JWT | Verify `{ code }`. |
| `PATCH` | `/api/orders/:orderId/collect` | JWT | Release a parcel whose OTP has been verified. |
| `POST` | `/api/orders/:orderId/remind` | JWT | Send a reminder SMS. |
| `PATCH` | `/api/orders/:orderId/rack` | JWT | Update `{ rack }`. |
| `DELETE` | `/api/orders/:orderId` | JWT | Remove an order. |
| `GET` | `/api/analytics?days=30` | JWT | Status counts, daily inflow and outflow, and average release time. |
| `GET` | `/api/public/orders/:orderId` | None | Recipient-safe tracking fields only. |
| `GET` | `/api/admin/trigger-reminders` | JWT (admin) | Run the overdue and reminder job on demand. |

---

## Algorithms

### 1. Sequential order ID generation with collision probing

Order IDs are short and human-readable (`ORD` followed by a six-digit, zero-padded counter), so staff can read them aloud or type them easily.

```
getNextOrderId():
    last <- SELECT order_id FROM orders
            WHERE order_id ~ '^ORD\d+$'
            ORDER BY order_id DESC LIMIT 1
    if last is null: return "ORD000001"
    return "ORD" + pad6(int(last[3:]) + 1)

createOrder():
    id <- getNextOrderId()
    repeat up to 5 times:
        if no row exists with order_id = id: break
        id <- "ORD" + pad6(int(id[3:]) + 1)       # linear probe
    if a row still exists with order_id = id: fail with 500
    INSERT ...                                    # UNIQUE(order_id) is the final guard
```

Because the IDs are zero-padded, sorting them as text gives the same order as sorting them numerically, so the B-tree index on `order_id` can return the latest ID without scanning the table.

### 2. OTP issuance and verification

```
sendOtp(orderId):
    reject if the order does not exist or is already collected
    code   <- crypto.randomInt(0, 10^6), zero-padded to 6 digits    # CSPRNG
    hash   <- bcrypt(code, cost = 10)
    UPDATE orders SET otp_code = hash, otp_expires_at = now + 5 min,
                      otp_verified = false, otp_attempts = 0
    send code by SMS to the recorded phone number

verifyOtp(orderId, input):
    reject unless input matches ^\d{6}$
    reject if no OTP was issued, or now > otp_expires_at
    reject with 429 if otp_attempts >= 5
    if not bcrypt.compare(input, otp_code):
        otp_attempts <- otp_attempts + 1 (atomic)
        reject with 403 and the number of attempts remaining
    otp_verified <- true
```

Properties:
- **Unpredictable:** codes come from a cryptographically secure random number generator, not `Math.random`.
- **No plaintext storage:** only a salted bcrypt hash is stored, so a leaked database row does not reveal an active code.
- **Limited exposure:** at most 5 guesses out of 10^6 possible codes within 5 minutes. Issuing a new OTP invalidates the previous one.

### 3. Overdue detection and reminder scheduling

Runs once at server start, daily at 00:00 through `node-cron`, and on demand through the admin endpoint.

```
runOverdueJob():
    UPDATE orders SET status = 'overdue'
     WHERE status = 'stored' AND created_at < now - 7 days

    due <- SELECT * FROM orders
            WHERE status IN ('stored', 'overdue')
              AND COALESCE(last_reminded_at, created_at) < now - 2 days

    for each order in due:
        try:  send a reminder SMS (tagged OVERDUE if applicable)
              UPDATE last_reminded_at = now
        catch: log the failure and continue with the next order
```

`COALESCE(last_reminded_at, created_at)` means the first reminder is due two days after intake and later reminders every two days after that. Because this condition is checked in the query, restarting the server or running the job again does not send duplicate reminders.

### 4. Phone number normalisation

Input is stripped of every non-digit character and accepted only if exactly 10 digits remain, so `98765 43210` and `(987) 654-3210` are both stored as `9876543210`. The number is stored as a `BIGINT` with a `CHECK` constraint and converted to E.164 format (`+91XXXXXXXXXX`) at send time.

### 5. Analytics aggregation

Aggregation runs in SQL rather than in application code:
- Status distribution: `GROUP BY status`.
- Daily inflow and outflow: `date_trunc('day', created_at | collected_at)` over a configurable window of 1 to 365 days.
- Average release time: `EXTRACT(EPOCH FROM AVG(collected_at - created_at))`.

---

## Concurrency Handling

Node.js runs application code on a single thread, but many requests can be in flight at once while they wait on database or network I/O. Collectra handles the resulting race conditions as follows.

| Concern | Mechanism |
|---|---|
| **Double release of a parcel** | `collectOrder` is a single conditional `UPDATE ... WHERE order_id = $1 AND otp_verified = true AND status IN ('stored','overdue') RETURNING *`. PostgreSQL row-level locking guarantees that only one of two concurrent release requests matches the row. The other receives no row and is rejected. |
| **OTP attempt counting** | Attempts are incremented with `SET otp_attempts = otp_attempts + 1` inside the database, never read and written back by the application, so concurrent failed guesses cannot overwrite each other's increments. |
| **Duplicate order IDs** | IDs are computed optimistically and probed for collisions. The `UNIQUE` constraint on `order_id` is the final guarantee: if two intakes race to the same ID, the database rejects the second insert. |
| **Connection management** | A single lazily created `pg.Pool` (maximum 10 connections) is shared by all requests, which limits load on the database and reuses TLS sessions. |
| **Parallel reads** | The analytics endpoint runs its four independent aggregate queries concurrently with `Promise.all`. |
| **Asynchronous side effects** | The release confirmation SMS is sent without waiting for it, so a slow or failed Twilio call cannot delay or undo a release that has already been committed. Intake SMS failures are caught and logged without failing the intake. |
| **Batch job isolation** | The reminder job processes each order in its own `try/catch`, so one failed message does not stop the rest of the batch. Its time-based filter makes repeated or overlapping runs safe. |
| **Error propagation** | `asyncHandler` routes every rejected promise to the central error handler, so an unexpected failure returns a controlled `500` instead of crashing the process. |

### Known limitations

- Under very high simultaneous intake, two requests can compute the same next ID. The `UNIQUE` constraint prevents duplicate records, but the second request returns an error and must be retried. A PostgreSQL `SEQUENCE` would remove this retry path.
- The attempt-limit check and the increment are separate statements, so a burst of concurrent guesses could slightly exceed five attempts. Folding the limit into the `UPDATE` condition would make this strict.

---

## Design Patterns

| Pattern | Where | Purpose |
|---|---|---|
| **Layered (MVC-style) architecture** | `routes` → `controllers` → `models` / `services` | Separates HTTP routing, business rules, and persistence so each layer can change independently. |
| **Repository / data access layer** | `models/*.ts` | Keeps all SQL in one place behind typed functions. Controllers never write queries. |
| **Singleton (lazy initialisation)** | `getPool()` in `config/db.ts` | One shared connection pool per process, created on first use so `/health` works before the database is reachable. |
| **Chain of responsibility** | Express middleware stack | Each request passes through Helmet, CORS, the JSON parser, authentication, the router, and the error handler in turn, and any stage can end it. |
| **Decorator / higher-order function** | `asyncHandler` | Wraps async controllers to add error forwarding without changing their code. |
| **Strategy** | `deliverSms` in `smsService.ts` | Switches between Twilio delivery and console logging based on configuration, without callers knowing which is used. |
| **Facade** | `smsService`, `qrService` | Present simple, intention-revealing functions (`sendOtpSms`, `generateQrDataUrl`) over third-party SDKs. |
| **Custom exception type** | `HttpError` | Carries an HTTP status with the error so the central handler can respond consistently. |
| **State machine** | `order_status` enum and conditional `UPDATE`s | Allows only valid transitions: `stored` → `overdue`, and `stored` or `overdue` → `collected`. |
| **Scheduler** | `node-cron` and `overdueJob` | Runs time-based maintenance separately from request handling. |
| **Interceptor** | Axios request and response interceptors | Attach credentials to every request, and handle session expiry, in one place on the client. |

---

## Class Diagram

The backend is written as functional ES modules rather than classes. The diagram models each module as a class with its public functions, and shows the dependencies between them.

```mermaid
classDiagram
    direction LR

    class Server {
        +app: Express
        +port: number
        +GET /health
        +GET /health/db
        +GET /api/admin/trigger-reminders
    }

    class AuthMiddleware {
        +requireAuth(req, res, next)
    }

    class ErrorHandler {
        +errorHandler(err, req, res, next)
    }

    class HttpError {
        +status: number
        +message: string
    }

    class AuthController {
        +register(req, res)
        +login(req, res)
        -signToken(user) string
    }

    class OrderController {
        +listOrders(req, res)
        +getByOrderId(req, res)
        +getPublicOrderDetails(req, res)
        +createOrder(req, res)
        +sendOtp(req, res)
        +verifyOtp(req, res)
        +collect(req, res)
        +remind(req, res)
        +updateRack(req, res)
        +remove(req, res)
    }

    class AnalyticsController {
        +getAnalytics(req, res)
    }

    class UserModel {
        +findUserByUsername(username) UserRow
        +createUser(username, hash, role) UserRow
    }

    class OrderModel {
        +listOrders(limit, offset) OrderRow[]
        +findByPublicOrderId(id) OrderRow
        +insertOrder(input) OrderRow
        +setOtpForOrder(id, hash, expiresAt) OrderRow
        +setOtpVerified(id) OrderRow
        +incrementOtpAttempts(id) number
        +collectOrder(id) OrderRow
        +updateOrderRack(id, rack) OrderRow
        +updateLastReminded(id)
        +deleteOrder(id) boolean
        +getNextOrderId() string
    }

    class AnalyticsModel {
        +getStatusCounts() StatusCount[]
        +getOrdersCreatedPerDay(days) OrdersPerDay[]
        +getOrdersCollectedPerDay(days) OrdersPerDay[]
        +getAvgReleaseSeconds() number
    }

    class SmsService {
        +sendOrderIntakeNotification(phone, orderId)
        +sendOtpSms(phone, code)
        +sendOrderCollectedNotification(phone, orderId)
        +sendReminderSms(phone, orderId, isOverdue)
        -deliverSms(phone, body)
    }

    class QrService {
        +generateQrDataUrl(payload) string
    }

    class OverdueJob {
        +runOverdueJob() number
    }

    class Database {
        <<singleton>>
        +getPool() Pool
    }

    class UserRow {
        +id: number
        +username: string
        +password_hash: string
        +role: string
    }

    class OrderRow {
        +id: number
        +order_id: string
        +receiver_name: string
        +phone_number: number
        +status: stored | collected | overdue
        +rack_number: string
        +otp_code: string
        +otp_expires_at: Date
        +otp_verified: boolean
        +otp_attempts: number
        +created_at: Date
        +collected_at: Date
        +last_reminded_at: Date
        +created_by: number
    }

    Server --> AuthMiddleware
    Server --> ErrorHandler
    Server --> AuthController
    Server --> OrderController
    Server --> AnalyticsController
    Server --> OverdueJob
    ErrorHandler ..> HttpError
    AuthController --> UserModel
    OrderController --> OrderModel
    OrderController --> SmsService
    OrderController --> QrService
    AnalyticsController --> AnalyticsModel
    OverdueJob --> OrderModel
    OverdueJob --> SmsService
    UserModel --> Database
    OrderModel --> Database
    AnalyticsModel --> Database
    UserModel ..> UserRow
    OrderModel ..> OrderRow
    UserRow "1" --> "0..*" OrderRow : created_by
```

---

## Usage

### Prerequisites

- Node.js 18 or later (tested on 20 and 24)
- A PostgreSQL 14+ database, either local or hosted (for example Supabase, Neon, or Render)
- A Twilio account with an SMS-capable number (optional for local development; see `SMS_MOCK`)

### 1. Clone the repository

```bash
git clone https://github.com/Girisha1908/Collectra.git
cd Collectra
```

### 2. Configure and start the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://USER:PASSWORD@HOST:5432/DBNAME`. URL-encode special characters in the password (for example `@` as `%40`). For Supabase, use the **Session pooler** string, which works over IPv4. |
| `DB_SSL` | For hosted databases | Set to `true` to connect over TLS. |
| `PORT` | No | API port. Defaults to `4000`. |
| `JWT_SECRET` | Yes | A long random string used to sign tokens. |
| `JWT_EXPIRES_IN` | No | Token lifetime. Defaults to `24h`. |
| `CORS_ORIGIN` | In production | The frontend origin, for example `https://collectra-kappa.vercel.app`. Required when `NODE_ENV=production`. |
| `PUBLIC_APP_URL` | Yes | Base URL used in SMS tracking links. |
| `TWILIO_ACCOUNT_SID` | For live SMS | Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | For live SMS | Twilio auth token. |
| `TWILIO_PHONE_NUMBER` | For live SMS | Sender number in E.164 format, for example `+15551234567`. |
| `SMS_MOCK` | No | Set to `true` to print messages and OTPs to the console instead of sending them. |

Initialise the database and start the development server:

```bash
npm run db:migrate    # apply db/schema.sql
npm run db:patch      # apply db/patches/*.sql
npx tsx migrate.ts    # add reminder and OTP-attempt columns
npm run dev           # http://localhost:4000
```

### 3. Configure and start the frontend

```bash
cd ../frontend
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env
npm run dev           # http://localhost:9002
```

### 4. Grant administrator access (optional)

Registration always creates `security` accounts. To promote a user:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your-username';
```

### 5. Test SMS links on a mobile device (optional)

With both servers running:

```bash
cd backend
npm run tunnel
```

Set `PUBLIC_APP_URL` to the printed public URL and restart the backend. SMS tracking links will then open on a phone.

### Available scripts

| Location | Script | Description |
|---|---|---|
| `backend` | `npm run dev` | Start the API in watch mode. |
| | `npm run build` / `npm start` | Compile TypeScript to `dist/` and run the compiled server. |
| | `npm run db:migrate` / `npm run db:patch` | Apply the schema and patches. |
| | `npm run typecheck` | Type-check without emitting files. |
| | `npm run tunnel` | Expose the frontend through Localtunnel. |
| `frontend` | `npm run dev` | Start Next.js with Turbopack on port 9002. |
| | `npm run build` / `npm start` | Production build and server. |
| | `npm run typecheck` | Type-check the frontend. |

### Deployment

| Component | Configuration |
|---|---|
| **Backend (Render)** | Root directory `backend`. Build command `npm install && npm run build`. Start command `npm run db:migrate && npm run db:patch && npm run start`. Set the environment variables above, with `DB_SSL=true` and `CORS_ORIGIN` set to the frontend URL. |
| **Frontend (Vercel)** | Root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the Render service URL. |
| **Keep-alive** | `.github/workflows/keep-alive.yml` calls `/health`, `/health/db`, and the frontend every 10 minutes so free-tier services do not sleep or pause. |

---

## Features

### Access control
- Staff registration and sign-in with bcrypt-hashed passwords.
- Stateless JWT sessions stored on the client and attached to every API request.
- Roles are assigned on the server. A client-supplied role is ignored, and administrator actions check the role in the token.
- Automatic sign-out and redirect when a session expires.

### Parcel intake
- Validated intake form for recipient, phone, description, location, and rack.
- Human-readable sequential order IDs.
- QR code generated at intake and stored with the order.
- Instant intake SMS with a tracking link.

### Recipient experience
- Public tracking page, with no sign-in, showing only the fields a recipient needs.
- QR code shown on the phone for quick scanning at the desk.
- Messages at every stage: intake, OTP, reminders, and collection confirmation.

### Secure release
- Camera-based QR scanning, with manual ID entry as a fallback.
- Six-digit OTP from a secure random generator, stored only as a hash.
- Five-minute expiry, a five-attempt lockout, and a fresh code on every request.
- A single atomic update that allows only one release per parcel.
- Collection timestamp and confirmation SMS for audit purposes.

### Inventory operations
- Newest-first inventory list with pagination support and search.
- On-demand reminders, rack reassignment, and removal.
- Automatic overdue flagging after seven days.
- Reminders every two days until collection, which are never duplicated.

### Analytics
- KPI cards: total, stored, collected, and overdue orders.
- Daily intake chart and inflow compared with outflow over a configurable window.
- Average time from intake to release.

### Operations and security
- Helmet security headers and an allow-listed CORS origin.
- Parameterised SQL throughout, which prevents SQL injection.
- Liveness (`/health`) and database (`/health/db`) endpoints for monitoring.
- Idempotent schema and patch scripts, safe to run on every deploy.
- SMS mock mode for development without Twilio credentials.

---

## Author

**Girisha Anamala** - [github.com/Girisha1908](https://github.com/Girisha1908)
