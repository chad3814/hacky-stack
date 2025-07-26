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

    const { id } = await params;
    const userRole = await getUserRole(id, session.user.id);

    if (!userRole) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        environments: {
          orderBy: {
            createdAt: 'asc',
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

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const formatted = {
      id: application.id,
      name: application.name,
      description: application.description,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      role: userRole,
      users: application.users.map((au) => ({
        id: au.id,
        role: au.role,
        user: au.user,
      })),
      environments: application.environments,
      counts: application._count,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching application:', error);
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
    const userRole = await getUserRole(id, session.user.id);

    if (!userRole || (userRole !== ApplicationRole.OWNER && userRole !== ApplicationRole.EDITOR)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        _count: {
          select: {
            environments: true,
            secrets: true,
            variables: true,
          },
        },
      },
    });

    const formatted = {
      id: application.id,
      name: application.name,
      description: application.description,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      role: userRole,
      counts: application._count,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error updating application:', error);
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
    const userRole = await getUserRole(id, session.user.id);

    if (userRole !== ApplicationRole.OWNER) {
      return NextResponse.json({ error: 'Only owners can delete applications' }, { status: 403 });
    }

    await prisma.application.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}