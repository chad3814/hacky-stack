import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ApplicationRole } from '@prisma/client';

async function getUserRole(environmentId: string, userId: string) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: {
      application: {
        include: {
          users: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  return {
    environment,
    role: environment?.application.users[0]?.role,
  };
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

    const { id } = await params;
    const { environment, role } = await getUserRole(id, session.user.id);

    if (!environment || !role) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    const detailedEnvironment = await prisma.environment.findUnique({
      where: { id },
      include: {
        secrets: {
          include: {
            secret: true,
          },
        },
        variables: {
          include: {
            variable: true,
          },
        },
        _count: {
          select: {
            secrets: true,
            variables: true,
          },
        },
      },
    });

    return NextResponse.json(detailedEnvironment);
  } catch (error) {
    console.error('Error fetching environment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { role } = await getUserRole(id, session.user.id);

    if (!role || (role !== ApplicationRole.OWNER && role !== ApplicationRole.EDITOR)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const environment = await prisma.environment.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
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

    return NextResponse.json(environment);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Environment name already exists' }, { status: 409 });
    }
    console.error('Error updating environment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { role } = await getUserRole(id, session.user.id);

    if (!role || (role !== ApplicationRole.OWNER && role !== ApplicationRole.EDITOR)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.environment.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Environment deleted successfully' });
  } catch (error) {
    console.error('Error deleting environment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}