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

    const variables = await prisma.variable.findMany({
      where: {
        applicationId,
      },
      include: {
        environments: {
          include: {
            environment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        key: 'asc',
      },
    });

    const formattedVariables = variables.map((variable) => ({
      id: variable.id,
      key: variable.key,
      value: variable.value,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt,
      environments: variable.environments.map((ve) => ve.environment),
    }));

    return NextResponse.json(formattedVariables);
  } catch (error) {
    console.error('Error fetching variables:', error);
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
    const { key, value, environmentIds = [] } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    const variable = await prisma.variable.create({
      data: {
        key,
        value,
        applicationId,
        environments: {
          create: environmentIds.map((envId: string) => ({
            environmentId: envId,
          })),
        },
      },
      include: {
        environments: {
          include: {
            environment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formatted = {
      id: variable.id,
      key: variable.key,
      value: variable.value,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt,
      environments: variable.environments.map((ve) => ve.environment),
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Variable key already exists' }, { status: 409 });
    }
    console.error('Error creating variable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}