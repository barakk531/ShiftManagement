# Shift Management

A full-stack shift scheduling app for small teams. Admins set up a workspace,
define shifts, collect each worker's weekly availability and build and publish
the schedule. Workers submit availability, see the published schedule, post
shift-swap requests and keep a log of the shifts they worked and what they earned.

**Live demo:** https://shift-management-bice.vercel.app

## Features

**For admins**
- Create a workspace (office, restaurant, casino or other) with its own timezone and operating hours
- Define shift templates and daily shift templates
- See every worker's availability for the week
- Build the weekly schedule on a board, assign workers to shifts, then publish it

**For workers**
- Join a workspace and submit weekly availability
- View the published schedule
- Post and browse shift-swap requests
- Log worked shifts with hours, hourly rate and travel costs, and see totals and KPIs in a history view
- Community forum

**Accounts**
- Sign-up with email verification codes and password reset by email (Resend)
- JWT authentication, bcrypt password hashing and role-based access (admin / worker)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Axios, CSS Modules |
| Backend | Node.js, Express, mysql2, Luxon |
| Database | MySQL (schema created and migrated automatically on startup) |
| Auth & email | JSON Web Tokens, bcryptjs, Resend |
| Hosting | Vercel (frontend), Railway (backend + MySQL) |

## Project structure

```
backend/
  app.js          Express app and route wiring
  routes/         REST endpoints (auth, workspaces, availability, schedule, swaps, forum, history)
  services/       business logic for each feature
  db/             connection pool, schema.sql and startup migrations
  util/           auth, role checks (rbac.js), validation, errors
frontend/
  src/pages/      screens, including SubmissionShifts/ for the scheduling flow
  src/components/ shared UI
  src/api/        API client (Axios)
```

## Running locally

Requirements: Node.js and a MySQL server.

**Backend**

```bash
cd backend
npm install
npm start          # http://localhost:8080
```

Create `backend/.env` (never commit it):

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=shift_management
JWT_SECRET=...            # long random string
RESEND_API_KEY=...        # only needed for verification and reset emails
EMAIL_FROM=...
CORS_ORIGIN=http://localhost:3000
```

A single `DATABASE_URL` / `MYSQL_URL` connection string also works instead of the `DB_*` values.
The tables are created on first start.

**Frontend**

```bash
cd frontend
npm install
npm start          # http://localhost:3000
```

Set `REACT_APP_API_BASE_URL` in `frontend/.env` if the backend is not on `http://localhost:8080`.
