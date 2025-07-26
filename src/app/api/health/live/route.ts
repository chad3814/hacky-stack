import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple liveness check - just verify the application is running
    // This should be fast and not depend on external services
    
    const livenessStatus = {
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      pid: process.pid
    };

    return NextResponse.json(livenessStatus, { status: 200 });
  } catch (error) {
    console.error("Liveness check failed:", error);
    
    const livenessStatus = {
      status: "dead",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    };

    return NextResponse.json(livenessStatus, { status: 503 });
  }
}