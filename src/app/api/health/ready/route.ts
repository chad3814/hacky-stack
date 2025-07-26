import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Check database connectivity with timeout
    const dbTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), 5000)
    );
    
    const dbCheck = prisma.$queryRaw`SELECT 1`;
    
    await Promise.race([dbCheck, dbTimeout]);

    // Check if we can access environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    const readinessStatus = {
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ready",
        environment: "ready",
        auth: "ready"
      }
    };

    return NextResponse.json(readinessStatus, { status: 200 });
  } catch (error) {
    console.error("Readiness check failed:", error);
    
    const readinessStatus = {
      status: "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: error instanceof Error && error.message.includes("timeout") ? "timeout" : "not_ready",
        environment: "not_ready",
        auth: "not_ready"
      },
      error: error instanceof Error ? error.message : "Unknown error"
    };

    return NextResponse.json(readinessStatus, { status: 503 });
  } finally {
    await prisma.$disconnect();
  }
}