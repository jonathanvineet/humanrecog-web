'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface FrameData {
  frameData: string;
  timestamp: number;
  detections: number;
}

export default function Home() {
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');

  const fetchLatestFrame = async () => {
    try {
      const response = await fetch('/api/upload-frame');
      if (response.ok) {
        const data = await response.json();
        setFrameData(data);
        setError(null);
        setLastUpdate(new Date().toLocaleTimeString());
      } else if (response.status === 404) {
        setError('No frames available yet. RPi stream not connected.');
      }
    } catch (err) {
      setError('Failed to fetch frame: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestFrame();

    // Poll for new frames every 2 seconds
    const interval = setInterval(fetchLatestFrame, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Human Detection Stream
        </h1>
        <p className="text-gray-400 text-center mb-8">Live video feed from Raspberry Pi</p>

        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading && !frameData ? (
            <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading stream...</p>
              </div>
            </div>
          ) : error && !frameData ? (
            <div className="w-full aspect-video bg-gray-700 flex items-center justify-center p-6">
              <div className="text-red-400 text-center">
                <p className="text-xl font-semibold mb-2">⚠️ Connection Error</p>
                <p>{error}</p>
                <p className="text-sm text-gray-400 mt-4">
                  Make sure the RPi is running and sending frames...
                </p>
              </div>
            </div>
          ) : frameData?.frameData ? (
            <div className="relative w-full bg-black">
              <img
                src={frameData.frameData}
                alt="Live stream from RPi"
                className="w-full h-auto"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-gray-300">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-gray-400 text-sm">Last Update</p>
            <p className="text-white text-lg font-semibold">{lastUpdate}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-gray-400 text-sm">Detections</p>
            <p className="text-white text-lg font-semibold">{frameData?.detections || 0}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-gray-400 text-sm">Status</p>
            <p className="text-green-400 text-lg font-semibold">
              {frameData ? '🟢 Live' : '🔴 Offline'}
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg text-sm text-gray-400">
          <h2 className="text-white font-semibold mb-2">📍 RPi Connection Info</h2>
          <p>This page will auto-refresh every 2 seconds to fetch the latest frame.</p>
          <p className="mt-2">
            Make sure your RPi is running:{' '}
            <code className="bg-gray-900 px-2 py-1 rounded">python rpi_sender.py</code>
          </p>
        </div>
      </div>
    </main>
  );
}
