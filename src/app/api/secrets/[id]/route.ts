import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ApplicationRole } from '@prisma/client';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function getUserRole(secretId: string, userId: string) {
  const secret = await prisma.secret.findUnique({
    where: { id: secretId },
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
    secret,
    role: secret?.application.users[0]?.role,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { secret, role } = await getUserRole(id, session.user.id);

    if (!secret || !role) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    const detailedSecret = await prisma.secret.findUnique({
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

    if (!detailedSecret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    // Never return the actual secret value
    const formatted = {
      id: detailedSecret.id,
      key: detailedSecret.key,
      createdAt: detailedSecret.createdAt,
      updatedAt: detailedSecret.updatedAt,
      environments: detailedSecret.environments.map((se) => se.environment),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching secret:', error);
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

    const updateData: { key?: string; value?: string } = {};

    if (key) {
      updateData.key = key;
    }

    if (value) {
      updateData.value = encrypt(value);
    }

    const secret = await prisma.$transaction(async (tx) => {
      // Update the secret
      const updatedSecret = await tx.secret.update({
        where: { id },
        data: updateData,
      });

      // Update environment associations if provided
      if (environmentIds !== undefined) {
        // Remove existing associations
        await tx.secretEnvironment.deleteMany({
          where: { secretId: id },
        });

        // Add new associations
        if (environmentIds.length > 0) {
          await tx.secretEnvironment.createMany({
            data: environmentIds.map((envId: string) => ({
              secretId: id,
              environmentId: envId,
            })),
          });
        }
      }

      return updatedSecret;
    });

    const formatted = {
      id: secret.id,
      key: secret.key,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Secret key already exists' }, { status: 409 });
    }
    console.error('Error updating secret:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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

    await prisma.secret.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Secret deleted successfully' });
  } catch (error) {
    console.error('Error deleting secret:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
