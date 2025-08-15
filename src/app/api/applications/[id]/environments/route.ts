import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ApplicationRole } from '@prisma/client';

async function getUserRole(applicationId: string, userId: string) {
  const applicationUser = await prisma.applicationUser.findUnique({
    where: {
      userId_applicationId: {
        userId,
        applicationId,
      },
    },
    select: {
      role: true,
    },
  });
  return applicationUser?.role;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const userRole = await getUserRole(applicationId, session.user.id);

    if (!userRole) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const environments = await prisma.environment.findMany({
      where: {
        applicationId,
      },
      include: {
        _count: {
          select: {
            secrets: true,
            variables: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(environments);
  } catch (error) {
    console.error('Error fetching environments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const userRole = await getUserRole(applicationId, session.user.id);

    if (!userRole || (userRole !== ApplicationRole.OWNER && userRole !== ApplicationRole.EDITOR)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate name format: only lowercase letters, numbers, hyphens, and underscores
    const nameRegex = /^[a-z0-9_-]+$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json({ 
        error: 'Name can only contain lowercase letters, numbers, hyphens, and underscores' 
      }, { status: 400 });
    }

    // Validate name length
    if (name.length > 15) {
      return NextResponse.json({ 
        error: 'Name must be 15 characters or less' 
      }, { status: 400 });
    }

    // Check environment limit (max 10 per application)
    const environmentCount = await prisma.environment.count({
      where: { applicationId }
    });

    if (environmentCount >= 10) {
      return NextResponse.json({ 
        error: 'Maximum of 10 environments per application' 
      }, { status: 400 });
    }

    const environment = await prisma.environment.create({
      data: {
        name,
        description,
        applicationId,
      },
      include: {
        _count: {
          select: {
            secrets: true,
            variables: true,
          },
        },
      },
    });

    return NextResponse.json(environment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Environment name already exists' }, { status: 409 });
    }
    console.error('Error creating environment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}