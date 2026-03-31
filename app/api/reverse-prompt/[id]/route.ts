import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    
    if (!taskId) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
    }

    const task = await prisma.reversePromptTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        inputType: true,
        inputUrls: true,
        outputLanguage: true,
        outputStyle: true,
        targetPlatform: true,
        resultJson: true,
        errorMessage: true,
        createdAt: true,
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('[ReversePromptTask GET Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}