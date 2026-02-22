import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for latest frame (temporary solution)
let latestFrame: {
  data: string;
  timestamp: number;
  detections: number;
} | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frameData, detections, timestamp } = body;

    if (!frameData) {
      return NextResponse.json(
        { error: 'frameData is required' },
        { status: 400 }
      );
    }

    // Store the latest frame
    latestFrame = {
      data: frameData, // base64 image string
      timestamp: timestamp || Date.now(),
      detections: detections || 0,
    };

    return NextResponse.json({
      success: true,
      message: 'Frame received',
      timestamp: latestFrame.timestamp,
    });
  } catch (error) {
    console.error('Error processing frame:', error);
    return NextResponse.json(
      { error: 'Failed to process frame' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!latestFrame) {
    return NextResponse.json(
      { error: 'No frames available yet' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    frameData: latestFrame.data,
    timestamp: latestFrame.timestamp,
    detections: latestFrame.detections,
  });
}
