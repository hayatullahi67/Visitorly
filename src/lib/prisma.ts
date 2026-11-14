import dns from "node:dns";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// 1. Prevent ws from attempting to use native C++ bufferutil addon
process.env.WS_NO_BUFFER_UTIL = "1";
process.env.WS_NO_UTF_8_VALIDATE = "1";

// 2. Route external DNS lookups through public DNS (8.8.8.8 / 1.1.1.1) via dns.resolve4.
// Node's default dns.lookup calls OS getaddrinfo, which ignores dns.setServers() and
// fails with EAI_AGAIN on networks with unreliable ISP DNS resolvers.
const globalForDns = globalThis as unknown as {
  dnsPatched?: boolean;
};

if (!globalForDns.dnsPatched) {
  try {
    dns.setDefaultResultOrder("ipv4first");
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

    const originalLookup = dns.lookup.bind(dns);
    const patchedLookup = function (
      hostname: string,
      options: any,
      callback?: any
    ) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      const isLocal =
        !hostname ||
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

      if (!isLocal) {
        return dns.resolve4(hostname, (err, addresses) => {
          if (err || !addresses || addresses.length === 0) {
            return originalLookup(hostname, options, callback);
          }
          if (options && options.all) {
            return callback(
              null,
              addresses.map((address) => ({ address, family: 4 }))
            );
          }
          return callback(null, addresses[0], 4);
        });
      }
      return originalLookup(hostname, options, callback);
    };
    (dns as any).lookup = patchedLookup;
    globalForDns.dnsPatched = true;
  } catch {
    // Ignore if restricted
  }
}

// 3. Configure Neon serverless driver to use ws over Port 443
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
