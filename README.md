# Visitorly

Professional estate visitor management system built with Next.js 15.

## Features (Estate Only)

- **Authentication**: Registration, email verification codes, login, forgot/reset password codes, session refresh, logout, and forced password change
- **Resident Dashboard**: Create visitor passes, view codes, gate activity, notices
- **Estate Admin Dashboard**: Manage members, streets and houses, issue passes, notices, approvals
- **Estate Security Dashboard**: QR/code scan terminal, check-in/out, gate logs

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + PostgreSQL (Neon)
- Tailwind CSS
- JWT authentication with HTTP-only cookies
- PWA support
- Responsive interface

## Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Add your Neon PostgreSQL connection string as `DATABASE_URL`.
4. Generate separate random secrets for `JWT_SECRET` and `AUTH_CODE_SECRET`. Each must contain at least 32 characters.
5. Configure the EmailJS values listed below.
6. Run `npm install`.
7. Run `npx prisma db push` to create or update the database tables.
8. Run `npm run dev`.

## EmailJS setup for authentication codes

Visitorly sends both email-verification codes and password-reset codes through EmailJS. Create an EmailJS email service and one email template for both purposes.

In the EmailJS template settings, configure:

- **To email:** `{{to_email}}`
- **Subject:** `{{subject}}`

Use these template variables in the email body:

- `{{heading}}` — verification or password-reset heading
- `{{message}}` — short explanation of the code
- `{{code}}` — six-digit code
- `{{expires_in}}` — code expiry period
- `{{app_name}}` — Visitorly

A simple email body can be:

```text
{{heading}}

{{message}}

Your code: {{code}}

This code expires in {{expires_in}}. Do not share it with anyone.

{{app_name}}
```

Add these values to your local `.env` file and to the Vercel environment variables for every environment you use:

- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID`
- `EMAILJS_PUBLIC_KEY`
- `EMAILJS_PRIVATE_KEY`

Keep `EMAILJS_PRIVATE_KEY`, `JWT_SECRET`, and `AUTH_CODE_SECRET` server-side. Do not add private keys to client-side code or commit real credentials to GitHub.

## Project Structure

```
src/
  app/                 # App Router pages and API routes
  components/          # Reusable UI components
  lib/                 # Authentication, Prisma, and utilities
  types/               # Shared types
prisma/
  schema.prisma        # Database schema
```
