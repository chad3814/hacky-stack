import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      checks: {
        database: "healthy",
        server: "healthy"
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error("Health check failed:", error);

    const healthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      checks: {
        database: "unhealthy",
        server: "healthy"
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      error: error instanceof Error ? error.message : "Unknown error"
    };

    return NextResponse.json(healthStatus, { status: 503 });
  } finally {
    await prisma.$disconnect();
  }
}
