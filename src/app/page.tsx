'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest text-xs">Initialising Map...</div>
});

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
  const [isLive, setIsLive] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);

  const lastTimestamp = useRef<number>(0);

  const fetchLatestData = async () => {
    try {
      const response = await fetch('/api/upload-frame');
      if (response.ok) {
        const result: ApiResponse = await response.json();
        setData(result);

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
    const interval = setInterval(fetchLatestData, 500);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <main className="min-h-screen bg-[#08080a] text-slate-200 font-sans selection:bg-blue-600/30 overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 py-6 md:px-8 md:py-8 layout-container">

        {/* Header */}
        <header className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8 items-center bg-slate-900/40 p-4 md:p-6 rounded-3xl border border-slate-800/60 backdrop-blur-md w-full min-w-0">
          <div className="flex flex-col gap-1 min-w-0 w-full">
            <h1 className="text-blue-500 text-xs font-black uppercase tracking-widest mb-1 px-1 truncate">Identifier</h1>
            <div className="bg-black/50 border border-white/5 p-3 px-4 rounded-xl flex items-center justify-between shadow-inner w-full min-w-0">
              <span className="text-white font-black tracking-tight text-lg truncate">HUMAN_RECOG_01</span>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0 ml-2"></div>
            </div>
          </div>

          <div className="flex flex-col md:items-center min-w-0">
            <span className="text-slate-500 text-xs font-black uppercase tracking-widest mb-3 text-left md:text-center truncate">Overview</span>
            <div className="flex gap-2 flex-wrap">
              <div className="bg-blue-600 px-3 py-1.5 rounded-full text-white text-[10px] md:text-xs font-black uppercase shadow-lg shadow-blue-600/20 tracking-wider">Active</div>
              <div className="bg-slate-800 px-3 py-1.5 rounded-full text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-wider border border-white/5">Secure</div>
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-0 md:items-end">
            <h1 className="text-blue-500 text-xs font-black uppercase tracking-widest mb-1 px-1">Metrics Lock</h1>
            <div className="bg-black/50 border border-white/5 p-3 px-4 rounded-xl flex justify-between items-center w-full md:w-auto min-w-0 gap-4 shadow-inner">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-600 font-bold tracking-widest truncate">LAT</span>
                <span className="text-white font-black text-xs md:text-sm font-mono truncate">{data.latest?.location?.lat?.toFixed(8) || '0.00000000'}</span>
              </div>
              <div className="w-px h-6 bg-slate-800"></div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-600 font-bold tracking-widest truncate">LNG</span>
                <span className="text-white font-black text-xs md:text-sm font-mono truncate">{data.latest?.location?.lng?.toFixed(8) || '0.00000000'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 mb-8 items-start w-full min-w-0">

          {/* Left Column (Video & Map) */}
          <div className="lg:col-span-3 space-y-6 w-full min-w-0 flex flex-col">

            {/* Camera Feed */}
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none"></div>

              {/* HUD Elements */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex gap-2">
                <div className="bg-black/70 backdrop-blur-xl border border-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                  <span className="font-black text-white uppercase tracking-widest">LIVE</span>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-20 max-w-[80%] min-w-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest leading-none truncate">Sensor_01</span>
                  <h2 className="text-white text-xl md:text-2xl lg:text-3xl font-black tracking-tight truncate w-full">PERIMETER_DRONE</h2>
                </div>
              </div>

              {data.latest?.data ? (
                <img
                  src={data.latest.data}
                  className="w-full h-full object-contain"
                  alt="Live Stream"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-t-2 border-blue-600 rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest text-center mt-2 px-4">Establishing Uplink...</p>
                </div>
              )}
            </div>

            {/* Map Feed */}
            <div className="w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl relative ring-1 ring-white/5 flex-shrink-0">
              <MapView
                lat={data.latest?.location?.lat || 12.971598765432}
                lng={data.latest?.location?.lng || 77.594567890123}
              />
            </div>
          </div>

          {/* Right Column (Sidebar Logs & Stats) */}
          <div className="lg:col-span-1 flex flex-col gap-6 w-full min-w-0 lg:h-full">

            {/* Logs Window */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 md:p-6 rounded-3xl backdrop-blur-md flex flex-col w-full min-w-0 shadow-xl max-h-[500px] lg:flex-1 lg:max-h-none">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <h3 className="text-white font-black text-xs md:text-sm uppercase tracking-widest truncate">Registry</h3>
                <span className="bg-blue-600 px-2.5 py-1 rounded-md text-[10px] text-white font-black uppercase flex-shrink-0 ml-2">Log</span>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                {data.history.length === 0 ? (
                  <div className="py-12 text-center opacity-30 flex flex-col items-center gap-3 my-auto">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Zero_Entries</p>
                  </div>
                ) : (
                  data.history.map((det, idx) => (
                    <div
                      key={det.timestamp + idx}
                      onClick={() => setSelectedDetection(det)}
                      className={`group cursor-pointer p-3 rounded-2xl border transition-all duration-200 flex gap-3 bg-black/50 overflow-hidden w-full ${selectedDetection === det ? 'border-blue-600 bg-blue-600/10 shadow-lg scale-[1.01]' : 'border-white/5 hover:border-slate-600'}`}
                    >
                      <div className="w-20 md:w-24 aspect-video rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                        <img src={det.data} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="" />
                      </div>
                      <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
                        <span className="text-white font-black text-xs tracking-tight truncate">{formatTime(det.timestamp)}</span>
                        <div className="flex flex-col text-[10px] text-slate-500 font-mono">
                          <span className="truncate">L:{det.location.lat.toFixed(4)}</span>
                          <span className="truncate">O:{det.location.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Metrics Widget */}
            <div className="bg-blue-900/10 border border-blue-500/20 p-6 md:p-8 rounded-3xl relative overflow-hidden group shadow-xl flex-shrink-0 w-full min-w-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
              <h3 className="text-blue-500 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 truncate">Uplink Telemetry</h3>
              <div className="flex items-end gap-2 text-white">
                <span className="text-4xl md:text-5xl font-black tracking-tighter italic">0.5</span>
                <span className="text-xs md:text-sm font-black text-slate-500 mb-2 uppercase tracking-wider">Hz_Pulse</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Data (Expanding View) */}
        {selectedDetection && (
          <section className="mt-8 md:mt-12 bg-slate-900 ring-1 ring-white/10 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-500 relative overflow-hidden w-full min-w-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600/0 via-blue-600 to-blue-600/0"></div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 min-w-0 w-full">
              <div className="lg:w-2/3 w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-xl relative border border-white/5 flex-shrink-0">
                <img
                  src={selectedDetection.data}
                  className="w-full h-full object-contain"
                  alt="Detailed View"
                />
                <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 bg-blue-600 px-4 py-1.5 md:px-6 md:py-2 rounded-full text-white text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg">
                  Artifact
                </div>
              </div>

              <div className="lg:w-1/3 w-full space-y-6 md:space-y-8 flex flex-col justify-center min-w-0">
                <div className="min-w-0">
                  <span className="text-blue-500 text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 block truncate">Sensor Lock</span>
                  <h2 className="text-white text-2xl md:text-3xl font-black tracking-tight leading-none mb-4 truncate">Historical Match</h2>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium line-clamp-3">Sub-millimeter precision lock verified. Artifact saved with complete spatial coordinates.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 min-w-0 w-full">
                  <div className="bg-black/40 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner w-full min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-widest text-center truncate">Latitude</span>
                    <div className="text-blue-400 font-mono text-center p-2 bg-white/5 rounded-xl border border-white/5 tracking-tighter text-[10px] md:text-xs truncate w-full">
                      {selectedDetection.location.lat.toFixed(10)}
                    </div>
                  </div>
                  <div className="bg-black/40 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner w-full min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-widest text-center truncate">Longitude</span>
                    <div className="text-blue-400 font-mono text-center p-2 bg-white/5 rounded-xl border border-white/5 tracking-tighter text-[10px] md:text-xs truncate w-full">
                      {selectedDetection.location.lng.toFixed(10)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDetection(null)}
                  className="w-full bg-slate-800 hover:bg-blue-600 text-white p-4 md:p-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-white/5 shadow-lg group truncate"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-700 w-full min-w-0">
          <p className="truncate">© 2024 VINEE_CORE</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <span className="text-blue-500 cursor-pointer hover:text-white transition-colors">Neural_Link</span>
            <span className="cursor-pointer hover:text-white transition-colors">Vault</span>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.4); border-radius: 4px; }
      `}</style>
    </main>
  );
}
