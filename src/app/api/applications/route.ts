import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ApplicationRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const applications = await prisma.application.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            environments: true,
            secrets: true,
            variables: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    });

    const formattedApplications = applications.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      role: app.users[0]?.role,
      counts: app._count,
    }));

    return NextResponse.json({ applications: formattedApplications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const application = await prisma.application.create({
      data: {
        name,
        description,
        users: {
          create: {
            userId: session.user.id,
            role: ApplicationRole.OWNER,
          },
        },
      },
      include: {
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
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
      role: application.users[0]?.role,
      counts: application._count,
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}