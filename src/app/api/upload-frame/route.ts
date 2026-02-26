import { NextRequest, NextResponse } from 'next/server';

interface Detection {
  timestamp: number;
  detections: number;
  location: {
    lat: number;
    lng: number;
  };
}

// In-memory storage (Resets on cold start, but good for demo/small-scale)
let detectionHistory: Detection[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { detections, timestamp, location } = body;

    const newDetection: Detection = {
      timestamp: timestamp || Date.now(),
      detections: detections || 0,
      location: location || { lat: 0, lng: 0 }
    };

    // If human(s) detected, add to history if not too recent (prevent burst)
    if (newDetection.detections > 0) {
      const lastInHistory = detectionHistory[0];
      const timeSinceLastDetection = lastInHistory
        ? newDetection.timestamp - lastInHistory.timestamp
        : Infinity;

      // Add to history if unique or after a small cooldown (e.g. 2s for web UI history)
      if (timeSinceLastDetection > 2000) {
        detectionHistory = [newDetection, ...detectionHistory].slice(0, 10);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: newDetection.timestamp,
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
  return NextResponse.json({
    history: detectionHistory
  });
}
