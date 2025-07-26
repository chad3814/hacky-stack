import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ApplicationRole } from '@prisma/client';

async function getUserRole(variableId: string, userId: string) {
  const variable = await prisma.variable.findUnique({
    where: { id: variableId },
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
    variable,
    role: variable?.application.users[0]?.role,
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
    const { variable, role } = await getUserRole(id, session.user.id);

    if (!variable || !role) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
    }

    const detailedVariable = await prisma.variable.findUnique({
      where: { id },
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

    if (!detailedVariable) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
    }

    const formatted = {
      id: detailedVariable.id,
      key: detailedVariable.key,
      value: detailedVariable.value,
      createdAt: detailedVariable.createdAt,
      updatedAt: detailedVariable.updatedAt,
      environments: detailedVariable.environments.map((ve) => ve.environment),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching variable:', error);
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
    const { key, value, environmentIds } = body;

    if (key && typeof key !== 'string') {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    if (value && typeof value !== 'string') {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }

    const updateData: { key?: string; value?: string } = {};
    
    if (key) {
      updateData.key = key;
    }
    
    if (value !== undefined) {
      updateData.value = value;
    }

    const variable = await prisma.$transaction(async (tx) => {
      // Update the variable
      const updatedVariable = await tx.variable.update({
        where: { id },
        data: updateData,
      });

      // Update environment associations if provided
      if (environmentIds !== undefined) {
        // Remove existing associations
        await tx.variableEnvironment.deleteMany({
          where: { variableId: id },
        });

        // Add new associations
        if (environmentIds.length > 0) {
          await tx.variableEnvironment.createMany({
            data: environmentIds.map((envId: string) => ({
              variableId: id,
              environmentId: envId,
            })),
          });
        }
      }

      return updatedVariable;
    });

    const formatted = {
      id: variable.id,
      key: variable.key,
      value: variable.value,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Variable key already exists' }, { status: 409 });
    }
    console.error('Error updating variable:', error);
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

    await prisma.variable.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Variable deleted successfully' });
  } catch (error) {
    console.error('Error deleting variable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}