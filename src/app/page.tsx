'use client';

import { useEffect, useState, useRef } from 'react';

interface Detection {
  data: string;
  timestamp: number;
  detections: number;
  location: {
    lat: number;
    lng: number;
  };
}

interface ApiResponse {
  latest: Detection | null;
  history: Detection[];
}

export default function Home() {
  const [data, setData] = useState<ApiResponse>({ latest: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const lastTimestamp = useRef<number>(0);

  const fetchLatestData = async () => {
    try {
      const response = await fetch('/api/upload-frame');
      if (response.ok) {
        const result: ApiResponse = await response.json();
        setData(result);
        setError(null);

        if (result.latest) {
          setIsLive(true);
          lastTimestamp.current = result.latest.timestamp;
        } else {
          setIsLive(false);
        }
      } else {
        setIsLive(false);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestData();

    // Poll for new frames every 500ms for a more "live" feel
    const interval = setInterval(fetchLatestData, 500);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white uppercase tracking-wider">System Active</span>
              <h2 className="text-slate-500 text-sm font-medium tracking-widest uppercase">Autonomous Monitor</h2>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              SIGHT <span className="font-light">OS</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-3 px-6 rounded-2xl shadow-xl flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-xs font-bold ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                    {isLive ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Detections</p>
            <p className="text-2xl font-black text-white">{data.latest?.detections || 0}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Latency</p>
            <p className="text-2xl font-black text-blue-400 font-mono">14<span className="text-xs">ms</span></p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Last Update</p>
            <p className="text-2xl font-black text-white font-mono">{data.latest ? formatTime(data.latest.timestamp) : '--:--'}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Location Lock</p>
            <p className="text-2xl font-black text-green-400 uppercase text-sm mt-1">Stable</p>
          </div>
        </div>

        {/* Main Feed Section */}
        <div className="mb-12">
          <div className="relative group rounded-[2.5rem] overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl transition-all duration-500 hover:border-blue-500/30">
            {/* Overlay elements */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60"></div>

            <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold tracking-widest text-white/90">REC NODE_01</span>
              </div>
            </div>

            <div className="absolute bottom-8 left-8 z-20">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">Live Stream Source</span>
                <p className="text-white font-medium text-lg tracking-tight">Vinee Secure Peripheral_01</p>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 z-30 flex gap-2">
              <div className="px-4 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[100px]">
                <p className="text-[10px] text-white/60 uppercase font-bold tracking-tighter">LATITUDE</p>
                <p className="text-sm font-mono text-white">{data.latest?.location?.lat?.toFixed(4) || '0.0000'}</p>
              </div>
              <div className="px-4 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[100px]">
                <p className="text-[10px] text-white/60 uppercase font-bold tracking-tighter">LONGITUDE</p>
                <p className="text-sm font-mono text-white">{data.latest?.location?.lng?.toFixed(4) || '0.0000'}</p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="aspect-video w-full flex items-center justify-center bg-[#0d0d0e]">
              {loading && !data.latest ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-sm font-medium animate-pulse uppercase tracking-[0.2em]">Initializing Feed...</p>
                </div>
              ) : !isLive ? (
                <div className="text-center p-12">
                  <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-xl mb-1 tracking-tight">Signal Connection Lost</p>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">Please ensure the remote sender is active and broadcasting to the SIGHT gateway.</p>
                </div>
              ) : (
                <img
                  src={data.latest?.data}
                  alt="AI Stream"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>

        {/* History Section */}
        <section>
          <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">Detection Archive</h2>
              <span className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-500/20">Live Event Log</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 text-center">
            {data.history.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[2rem] border border-dashed border-slate-800 transition-colors hover:bg-slate-900/30">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium italic">Detection database is currently empty.</p>
                <p className="text-slate-600 text-xs mt-2 font-mono">WAITING_FOR_DATA_PACKET</p>
              </div>
            ) : (
              data.history.map((detection, idx) => (
                <div
                  key={detection.timestamp + idx}
                  className="group bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/50 hover:shadow-blue-500/10"
                >
                  <div className="aspect-[4/3] w-full relative">
                    <img
                      src={detection.data}
                      alt={`Detection at ${detection.timestamp}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 px-2 py-1 bg-green-500/90 backdrop-blur-md text-white text-[9px] font-black rounded-lg uppercase shadow-lg">
                      {detection.detections} {detection.detections > 1 ? 'Humans' : 'Human'}
                    </div>
                  </div>
                  <div className="p-5 text-left">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-white font-bold text-sm tracking-tight">{formatTime(detection.timestamp)}</span>
                      <span className="text-slate-600 font-mono text-[9px] bg-white/5 px-2 py-0.5 rounded-full">#LOG_{idx.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="space-y-1 bg-black/30 p-2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="text-[10px] font-mono text-slate-300">
                          {detection.location.lat.toFixed(4)}, {detection.location.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
          <p>© 2024 VINEE SECURE-CORE PROTOTYPE</p>
          <div className="flex gap-6">
            <span className="hover:text-blue-500 transition-colors cursor-pointer">Protocol Alpha</span>
            <span className="hover:text-blue-500 transition-colors cursor-pointer">Security Sandbox</span>
            <span className="hover:text-blue-500 transition-colors cursor-pointer">API Integration</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
