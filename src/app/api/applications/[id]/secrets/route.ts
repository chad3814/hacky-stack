import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ApplicationRole } from '@prisma/client';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

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

    const secrets = await prisma.secret.findMany({
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

    // Never return actual secret values, only metadata
    const formattedSecrets = secrets.map((secret) => ({
      id: secret.id,
      key: secret.key,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      environments: secret.environments.map((se) => se.environment),
    }));

    return NextResponse.json(formattedSecrets);
  } catch (error) {
    console.error('Error fetching secrets:', error);
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

    const encryptedValue = encrypt(value);

    const secret = await prisma.secret.create({
      data: {
        key,
        value: encryptedValue,
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
      id: secret.id,
      key: secret.key,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      environments: secret.environments.map((se) => se.environment),
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Secret key already exists' }, { status: 409 });
    }
    console.error('Error creating secret:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}