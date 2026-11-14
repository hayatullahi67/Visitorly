import { randomBytes } from "node:crypto";

export function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function formatPassResponse(p: any) {
  const now = new Date();
  const isExpired =
    p.status === "active" && new Date(p.validTo).getTime() <= now.getTime();
  const effectiveStatus = isExpired ? "expired" : p.status;

  return {
    id: p.id,
    code: p.code,
    visitorName: p.visitorName,
    phone: p.phone,
    purpose: p.purpose,
    status: p.status,
    effectiveStatus,
    validFrom: p.validFrom,
    validTo: p.validTo,
    checkedInAt: p.checkedInAt,
    checkedOutAt: p.checkedOutAt,
    revokedAt: p.revokedAt,
    exitCode: p.exitCode,
    exitCodeValidTo: p.exitCodeValidTo,
    createdAt: p.createdAt,
    house: p.house
      ? `House ${p.house.number}, ${p.house.street?.name || ""}`
      : null,
    houseDetail: p.house
      ? {
          id: p.house.id,
          number: p.house.number,
          street: p.house.street?.name || "",
        }
      : null,
    hostName: p.hostMembership?.user?.fullName || p.createdBy?.fullName || null,
    createdByName: p.createdBy?.fullName || null,
    createdByRole: p.createdByRole,
    admittedByName: p.admittedBy?.fullName || null,
    qrData: p.code,
  };
}
