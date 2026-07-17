# 📦 Collectra - Secure Package Retrieval System

Collectra is a package storage, tracking, and secure retrieval platform. 
Designed for residential buildings, university hostels, and corporate departments, 
it ensures that incoming packages (orders) are securely logged by staff, tracked, and released only to the authenticated recipient via SMS-based OTP verification.

---

## 🚀 Key Features

* **Secure Authentication:** Multi-role system securing endpoints and routes for authorized staff (security personnel and admins).
* **Package Intake Logging:** Easy logging of incoming package details including receiver name, phone number, description, delivery location (hostel/department), and rack assignment.
* **Automated QR & Unique ID Generation:** Every package receives a unique tracking ID and QR code instantly upon intake.
* **Automated SMS Notifications:** Sends instant notifications containing the QR code link to recipients via Twilio.
* **OTP-Verified Retrieval:** Recipient identity is verified through a one-time passcode (OTP) delivered to their mobile number before packages are released.
* **Overdue Tracking & Reminders:** Automates tracking of unclaimed packages, flags overdue entries, and triggers reminder notifications.
* **Enterprise Analytics Dashboard:** Interactive admin dashboard visualizing total orders, stored packages, retrieval rates, and overdue metrics using rich charts.

---

## 🛠️ Technology Stack

### Frontend
* **Core:** [Next.js](https://nextjs.org/) (React, TypeScript)
* **Styling:** Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)
* **Charts:** Recharts
* **Icons:** Lucide React

### Backend
* **Core:** Node.js, Express, TypeScript
* **Database:** PostgreSQL (Core schema + Patches for phone indexing and OTP verification tracking)
* **Security:** JSON Web Tokens (JWT) & bcryptjs
* **Services:** Twilio (SMS & OTP delivery), Localtunnel (webhook and mobile testing proxy)

---

## 📂 Repository Structure

```
Collectra/
├── frontend/             # Next.js frontend application
│   ├── src/              # React components, pages, hooks, and business logic
│   ├── .idx/             # Project IDX workspace configuration
│   └── package.json      # Frontend package dependencies
│
├── backend/              # Express.js REST API
│   ├── db/               # PostgreSQL schema definitions and migration scripts
│   ├── src/              # Controller, model, routing, and middleware code
│   ├── lt_proxy.js       # Localtunnel webhook/development proxy
│   └── package.json      # Backend package dependencies
```

---

## ⚙️ Local Setup & Installation

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **PostgreSQL** database instance running locally or hosted

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your local PostgreSQL credentials, port, JWT secrets, and Twilio API keys:
   ```env
   DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/collectra
   PORT=4000
   JWT_SECRET=your-secure-jwt-secret
   JWT_EXPIRES_IN=24h
   SMS_MOCK=true # Set to false to use active Twilio config
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=your-twilio-phone
   PUBLIC_APP_URL=http://localhost:9002
   ```

4. Initialize the PostgreSQL schema:
   ```bash
   psql -U postgres -d collectra -f db/schema.sql
   ```
5. Run migrations/patches if necessary:
   ```bash
   npm run migrate
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```
   The backend API will start running at `http://localhost:4000`.

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables. Create a `.env` file inside the `frontend/` folder:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend application will start running at `http://localhost:9002` (or port specified in `next.config.ts`).

---

## 📡 Webhook & Mobile Testing (Local Tunnel Proxy)

To test SMS links, QR codes, and notifications on actual mobile devices:
1. Ensure your backend and frontend servers are running.
2. In the `backend` directory, launch the proxy tunnel:
   ```bash
   node lt_proxy.js
   ```
3. This creates a secure, public HTTPS URL forwarding to your local Next.js server so SMS and QR code links can be resolved directly on smartphones.
