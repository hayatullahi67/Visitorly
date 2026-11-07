# Visitorly

Professional estate visitor management system built with Next.js 15.

## Features (Estate Only)

- **Authentication**: Login, Register, Forgot/Reset Password, Force Password Change
- **Resident Dashboard**: Create visitor passes, view codes, gate activity, notices
- **Estate Admin Dashboard**: Manage members, streets & houses, issue passes, notices, approvals
- **Estate Security Dashboard**: QR/code scan terminal, check-in/out, gate logs

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + PostgreSQL (Neon)
- Tailwind CSS
- JWT Auth
- PWA ready
- Fully responsive + SEO optimized

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env` and add your Neon `DATABASE_URL`
3. `npm install`
4. `npx prisma db push`
5. `npm run dev`

You handle the Neon connection. The app is ready for it.

## Project Structure

```
src/
  app/                 # App Router pages & API routes
  components/          # Reusable UI components
  lib/                 # Auth, prisma, utils
  types/               # TypeScript types
prisma/
  schema.prisma        # Database schema (estate focused)
```

Built to be extremely fast with reusable components, Server Components, and optimized data fetching.
