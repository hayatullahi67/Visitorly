-- ============================================================
-- Visitorly: Complete Neon PostgreSQL Schema
-- Generated to match prisma/schema.prisma exactly
-- ============================================================

-- 1. Create Enums (safely if they do not exist)
DO $$ BEGIN
  CREATE TYPE "OrganizationType" AS ENUM ('estate', 'school', 'event');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('estate_admin', 'resident', 'estate_security', 'school_admin', 'teacher', 'parent', 'school_security', 'event_organizer', 'event_security');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrganizationStatus" AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PassPurpose" AS ENUM ('personal', 'delivery', 'maintenance', 'event_guest', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PassStatus" AS ENUM ('active', 'checked_in', 'checked_out', 'revoked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GateAction" AS ENUM ('entry', 'exit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GateResult" AS ENUM ('success', 'denied');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuthCodePurpose" AS ENUM ('email_verification', 'password_reset');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Core Users Table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "fullName" VARCHAR(120) NOT NULL,
  "email" VARCHAR(254) NOT NULL UNIQUE,
  "phone" VARCHAR(20) UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  "emailVerifiedAt" TIMESTAMP(3),
  "photoFile" VARCHAR(100),
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "status" "UserStatus" NOT NULL DEFAULT 'active',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Organizations Table
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" SERIAL PRIMARY KEY,
  "type" "OrganizationType" NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "address" VARCHAR(255),
  "city" VARCHAR(100),
  "totalHouses" INTEGER,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'pending',
  "createdById" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "organizations_type_status_name_idx" ON "organizations"("type", "status", "name");

-- 4. Streets Table
CREATE TABLE IF NOT EXISTS "streets" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "streets_organizationId_name_key" UNIQUE ("organizationId", "name")
);

-- 5. Houses Table
CREATE TABLE IF NOT EXISTS "houses" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "streetId" INTEGER NOT NULL REFERENCES "streets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "number" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "houses_streetId_number_key" UNIQUE ("streetId", "number")
);
CREATE INDEX IF NOT EXISTS "houses_organizationId_idx" ON "houses"("organizationId");

-- 6. Memberships Table
CREATE TABLE IF NOT EXISTS "memberships" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "organizationId" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "role" "Role" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'pending',
  "houseId" INTEGER REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestedHouseId" INTEGER REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "changeRequestedAt" TIMESTAMP(3),
  "assignedGate" VARCHAR(60),
  "shift" VARCHAR(60),
  "reviewedById" INTEGER REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memberships_userId_organizationId_role_key" UNIQUE ("userId", "organizationId", "role")
);
CREATE INDEX IF NOT EXISTS "memberships_organizationId_status_idx" ON "memberships"("organizationId", "status");

-- 7. Visitor Passes Table
CREATE TABLE IF NOT EXISTS "visitor_passes" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "code" VARCHAR(12) NOT NULL,
  "visitorName" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(20),
  "purpose" "PassPurpose" NOT NULL DEFAULT 'personal',
  "houseId" INTEGER NOT NULL REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "hostMembershipId" INTEGER REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdById" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdByRole" "Role" NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3) NOT NULL,
  "status" "PassStatus" NOT NULL DEFAULT 'active',
  "checkedInAt" TIMESTAMP(3),
  "checkedOutAt" TIMESTAMP(3),
  "admittedById" INTEGER REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "revokedAt" TIMESTAMP(3),
  "exitCode" VARCHAR(12),
  "exitCodeValidTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visitor_passes_organizationId_code_key" UNIQUE ("organizationId", "code"),
  CONSTRAINT "visitor_passes_organizationId_exitCode_key" UNIQUE ("organizationId", "exitCode")
);
CREATE INDEX IF NOT EXISTS "visitor_passes_organizationId_status_validTo_idx" ON "visitor_passes"("organizationId", "status", "validTo");
CREATE INDEX IF NOT EXISTS "visitor_passes_hostMembershipId_idx" ON "visitor_passes"("hostMembershipId");
CREATE INDEX IF NOT EXISTS "visitor_passes_houseId_idx" ON "visitor_passes"("houseId");

-- 8. Gate Logs Table
CREATE TABLE IF NOT EXISTS "gate_logs" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "passId" INTEGER REFERENCES "visitor_passes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "code" VARCHAR(12) NOT NULL,
  "action" "GateAction" NOT NULL,
  "result" "GateResult" NOT NULL,
  "reason" VARCHAR(120),
  "officerId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "gate_logs_organizationId_createdAt_idx" ON "gate_logs"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "gate_logs_passId_idx" ON "gate_logs"("passId");

-- 9. Notices Table
CREATE TABLE IF NOT EXISTS "notices" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" VARCHAR(150) NOT NULL,
  "message" TEXT NOT NULL,
  "createdById" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "notices_organizationId_createdAt_idx" ON "notices"("organizationId", "createdAt");

-- 10. Refresh Tokens Table (Stateful Auth Sessions)
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "familyId" CHAR(36) NOT NULL,
  "tokenHash" CHAR(64) NOT NULL UNIQUE,
  "membershipId" INTEGER REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ip" VARCHAR(45),
  "userAgent" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- 11. Auth Codes Table (Email OTP & Password Reset)
CREATE TABLE IF NOT EXISTS "auth_codes" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "purpose" "AuthCodePurpose" NOT NULL,
  "codeHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "auth_codes_userId_purpose_createdAt_idx" ON "auth_codes"("userId", "purpose", "createdAt");
CREATE INDEX IF NOT EXISTS "auth_codes_expiresAt_idx" ON "auth_codes"("expiresAt");

-- 12. Rate Limit Buckets Table (Brute-force protection)
CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
  "key" VARCHAR(64) PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0,
  "window_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "auth_rate_limits_expires_at_idx" ON "auth_rate_limits"("expires_at");
