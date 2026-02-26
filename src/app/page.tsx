'use client';

import mqtt from 'mqtt';
import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest text-xs">
      Initialising Map...
    </div>
  ),
});

const RPI_LOCAL_SERVER = "http://localhost:5000"; // Adjust IP if running remotely

interface Detection {
  data: string;
  timestamp: number;
  detections: number;
  location: { lat: number; lng: number };
}

// ─── Stable ref updater — updates a DOM text node without React ─────────────
function setDOMText(ref: React.RefObject<HTMLElement | null>, value: string) {
  if (ref.current) ref.current.textContent = value;
}

export default function Home() {
  // ── React state only for things that rarely change ─────────────────────────
  const [history, setHistory] = useState<Detection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);

  // ── DOM Refs for every live-updating element (ZERO re-renders per frame) ───
  const imgRef = useRef<HTMLImageElement>(null);
  const statusDotRef = useRef<HTMLDivElement>(null);
  const statusTextRef = useRef<HTMLSpanElement>(null);
  const statusBoxRef = useRef<HTMLDivElement>(null);
  const detBadgeRef = useRef<HTMLDivElement>(null);
  const latDisplayRef = useRef<HTMLSpanElement>(null);
  const lngDisplayRef = useRef<HTMLSpanElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);

  // ── Internal bookkeeping refs (never cause renders) ────────────────────────
  const lastHistoryTs = useRef<number>(0);
  const lastMapUpdate = useRef<number>(0);
  const mapLatRef = useRef<number>(12.971598765432);
  const mapLngRef = useRef<number>(77.594567890123);
  const setMapPosition = useRef<((lat: number, lng: number) => void) | null>(null);
  const frameQueue = useRef<string[]>([]);
  const rafHandle = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFpsCalc = useRef<number>(Date.now());

  // ── rAF render loop: drains the frame queue at display refresh rate ─────────
  const fetchInitialData = useCallback(async () => {
    try {
      // Prioritize Local RPi Storage for history bootstrap
      const response = await fetch(`${RPI_LOCAL_SERVER}/detections`);
      if (response.ok) {
        const result = await response.json();
        if (result.history) setHistory(result.history);
      } else {
        // Fallback to Vercel API if RPi local server is unreachable
        const vResponse = await fetch('/api/upload-frame');
        if (vResponse.ok) {
          const result = await vResponse.json();
          if (result.history) setHistory(result.history);
        }
      }
    } catch (e) {
      console.warn("Could not sync with local RPi server, using live stream only.");
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    const loop = () => {
      if (frameQueue.current.length > 0) {
        // Always paint only the LATEST frame; drop stale intermediates
        const latest = frameQueue.current[frameQueue.current.length - 1];
        frameQueue.current = [];
        if (imgRef.current) imgRef.current.src = latest;

        // FPS counter (updates DOM, not React)
        frameCount.current++;
        const now = Date.now();
        const elapsed = now - lastFpsCalc.current;
        if (elapsed >= 1000) {
          const fps = (frameCount.current / (elapsed / 1000)).toFixed(1);
          setDOMText(fpsRef, `${fps} fps`);
          frameCount.current = 0;
          lastFpsCalc.current = now;
        }
      }
      rafHandle.current = requestAnimationFrame(loop);
    };
    rafHandle.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafHandle.current);
  }, []);

  // ── Status badge helper (pure DOM) ─────────────────────────────────────────
  const setStatus = useCallback((status: 'connecting' | 'live' | 'disconnected') => {
    const colorMap = {
      live: { dot: 'bg-green-500', border: 'border-green-500/50' },
      connecting: { dot: 'bg-yellow-500', border: 'border-yellow-500/50' },
      disconnected: { dot: 'bg-red-500', border: 'border-red-500/50' },
    };
    const { dot, border } = colorMap[status];

    if (statusDotRef.current) {
      statusDotRef.current.className = `w-2 h-2 rounded-full animate-pulse ${dot}`;
    }
    if (statusTextRef.current) {
      statusTextRef.current.textContent = status.toUpperCase();
    }
    if (statusBoxRef.current) {
      statusBoxRef.current.className =
        `bg-black/70 backdrop-blur-xl border px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-lg ${border}`;
    }
  }, []);

  // ── MQTT connection ────────────────────────────────────────────────────────
  useEffect(() => {
    setStatus('connecting');

    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      reconnectPeriod: 1000,
    });

    client.on('connect', () => {
      client.subscribe('humanrecog/video/jonathan_feed', { qos: 0 });
      if (loadingRef.current) loadingRef.current.style.display = 'none';
      setStatus('live');
    });

    client.on('message', (_topic: string, message: Buffer) => {
      try {
        // ── Parse ─────────────────────────────────────────────────────────
        const raw = JSON.parse(message.toString()) as {
          frameData?: string;
          data?: string;
          timestamp?: number;
          detections?: number;
          location?: { lat: number; lng: number };
        };

        const frameData = raw.frameData || raw.data || '';
        const timestamp = raw.timestamp || Date.now();
        const detections = raw.detections || 0;
        const location = raw.location || { lat: 12.9716, lng: 77.5946 };

        // ── Frame: push to queue, rAF loop handles painting ───────────────
        if (frameData) frameQueue.current.push(frameData);

        // ── Metadata: direct DOM update, NO setState ──────────────────────
        setDOMText(latDisplayRef, location.lat.toFixed(10));
        setDOMText(lngDisplayRef, location.lng.toFixed(10));

        if (detections > 0) {
          if (detBadgeRef.current) {
            detBadgeRef.current.style.display = 'flex';
            detBadgeRef.current.textContent = `Detections: ${detections}`;
          }
        } else {
          if (detBadgeRef.current) detBadgeRef.current.style.display = 'none';
        }

        // ── Map: throttle to 2 Hz — smooth enough, avoids constant rerenders
        const now = Date.now();
        if (now - lastMapUpdate.current > 500) {
          lastMapUpdate.current = now;
          mapLatRef.current = location.lat;
          mapLngRef.current = location.lng;
          setMapPosition.current?.(location.lat, location.lng);
        }

        // ── History: only setState when a new detection qualifies ─────────
        if (detections > 0 && timestamp - lastHistoryTs.current > 2000) {
          lastHistoryTs.current = timestamp;
          const entry: Detection = { data: frameData, timestamp, detections, location };

          setHistory(prev => [entry, ...prev].slice(0, 10));

          // Fire-and-forget backend persistence (no frameData, metadata only)
          fetch('/api/upload-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp, detections, location }),
          }).catch(() => { });
        }
      } catch (e) {
        console.error('MQTT parse error:', e);
      }
    });

    client.on('offline', () => setStatus('disconnected'));
    client.on('close', () => setStatus('disconnected'));
    client.on('reconnect', () => setStatus('connecting'));

    return () => { client.end(); };
  }, [setStatus, fetchInitialData]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <main className="min-h-screen bg-[#08080a] text-slate-200 font-sans selection:bg-blue-600/30 overflow-x-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 py-6 md:px-8 md:py-8">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8 items-center bg-slate-900/40 p-4 md:p-6 rounded-3xl border border-slate-800/60 backdrop-blur-md w-full">

          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-blue-500 text-xs font-black uppercase tracking-widest mb-1 px-1">Identifier</h1>
            <div className="bg-black/50 border border-white/5 p-3 px-4 rounded-xl flex items-center justify-between shadow-inner">
              <span className="text-white font-black tracking-tight text-lg">HUMAN_RECOG_01</span>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col md:items-center">
            <span className="text-slate-500 text-xs font-black uppercase tracking-widest mb-3">Overview</span>
            <div className="flex gap-2 flex-wrap">
              <div className="bg-blue-600 px-3 py-1.5 rounded-full text-white text-[10px] md:text-xs font-black uppercase shadow-lg shadow-blue-600/20 tracking-wider">Active</div>
              <div className="bg-slate-800 px-3 py-1.5 rounded-full text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-wider border border-white/5">Secure</div>
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-0 md:items-end">
            <h1 className="text-blue-500 text-xs font-black uppercase tracking-widest mb-1 px-1">Metrics Lock</h1>
            <div className="bg-black/50 border border-white/5 p-3 px-4 rounded-xl flex justify-between items-center w-full md:w-auto gap-4 shadow-inner">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-600 font-bold tracking-widest">LAT</span>
                {/* Direct DOM update — no React re-render */}
                <span ref={latDisplayRef} className="text-white font-black text-xs md:text-sm font-mono">0.0000000000</span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-600 font-bold tracking-widest">LNG</span>
                <span ref={lngDisplayRef} className="text-white font-black text-xs md:text-sm font-mono">0.0000000000</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 mb-8 items-start">

          {/* Left Column */}
          <div className="lg:col-span-3 space-y-6 flex flex-col">

            {/* Camera Feed */}
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none" />

              {/* Status badge — DOM-mutated, not state-driven */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex gap-2">
                <div
                  ref={statusBoxRef}
                  className="bg-black/70 backdrop-blur-xl border border-yellow-500/50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-lg"
                >
                  <div ref={statusDotRef} className="w-2 h-2 rounded-full animate-pulse bg-yellow-500" />
                  <span ref={statusTextRef} className="font-black text-white uppercase tracking-widest">CONNECTING</span>
                </div>
                {/* Detection badge — hidden by default, shown via DOM ref */}
                <div
                  ref={detBadgeRef}
                  style={{ display: 'none' }}
                  className="bg-red-600/90 backdrop-blur-xl border border-red-500 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm items-center gap-2 shadow-lg font-black text-white uppercase tracking-widest"
                />
              </div>

              <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-20">
                <span className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest block mb-1">Sensor_01</span>
                <h2 className="text-white text-xl md:text-2xl lg:text-3xl font-black tracking-tight">PERIMETER_DRONE</h2>
              </div>

              {/* Live frame — src set via ref, never through React */}
              <img ref={imgRef} className="w-full h-full object-contain" alt="Live Stream" />

              {/* Loading overlay — hidden via DOM ref, not state */}
              <div ref={loadingRef} className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black">
                <div className="w-12 h-12 md:w-16 md:h-16 border-t-2 border-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest mt-2">Establishing Uplink...</p>
              </div>
            </div>

            {/* Map */}
            <div className="w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl ring-1 ring-white/5">
              <MapView
                lat={mapLatRef.current}
                lng={mapLngRef.current}
                onRegisterSetPosition={(fn) => { setMapPosition.current = fn; }}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 flex flex-col gap-6">

            {/* Detection Log */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 md:p-6 rounded-3xl backdrop-blur-md flex flex-col shadow-xl max-h-[500px] lg:flex-1 lg:max-h-none">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <div className="flex flex-col">
                  <h3 className="text-white font-black text-xs md:text-sm uppercase tracking-widest">Registry</h3>
                  <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">Local Storage Sync</span>
                </div>
                <button
                  onClick={fetchInitialData}
                  className="bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-md text-[10px] text-white font-black uppercase transition-colors flex items-center gap-1 shadow-lg shadow-blue-600/20"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Sync
                </button>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                {history.length === 0 ? (
                  <div className="py-12 text-center opacity-30 flex flex-col items-center gap-3 my-auto">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Zero_Entries</p>
                  </div>
                ) : (
                  history.map((det, idx) => (
                    <div
                      key={det.timestamp + idx}
                      onClick={() => setSelectedDetection(det)}
                      className={`group cursor-pointer p-3 rounded-2xl border transition-all duration-200 flex gap-3 bg-black/50 overflow-hidden ${selectedDetection === det
                        ? 'border-blue-600 bg-blue-600/10 shadow-lg scale-[1.01]'
                        : 'border-white/5 hover:border-slate-600'
                        }`}
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

            {/* Telemetry Widget */}
            <div className="bg-blue-900/10 border border-blue-500/20 p-6 md:p-8 rounded-3xl relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform" />
              <h3 className="text-blue-500 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4">Uplink Telemetry</h3>
              <div className="flex items-end gap-2 text-white">
                {/* FPS counter — DOM-mutated, not React state */}
                <span ref={fpsRef} className="text-4xl md:text-5xl font-black tracking-tighter italic">-- fps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Detection Detail */}
        {selectedDetection && (
          <section className="mt-8 md:mt-12 bg-slate-900 ring-1 ring-white/10 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600/0 via-blue-600 to-blue-600/0" />
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="lg:w-2/3 w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-xl relative border border-white/5">
                <img src={selectedDetection.data} className="w-full h-full object-contain" alt="Detailed View" />
                <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 bg-blue-600 px-4 py-1.5 md:px-6 md:py-2 rounded-full text-white text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg">
                  Artifact
                </div>
              </div>
              <div className="lg:w-1/3 w-full space-y-6 md:space-y-8 flex flex-col justify-center">
                <div>
                  <span className="text-blue-500 text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 block">Sensor Lock</span>
                  <h2 className="text-white text-2xl md:text-3xl font-black tracking-tight leading-none mb-4">Historical Match</h2>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium">Sub-millimeter precision lock verified. Artifact saved with complete spatial coordinates.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['lat', 'lng'] as const).map(k => (
                    <div key={k} className="bg-black/40 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner">
                      <span className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-widest text-center">{k === 'lat' ? 'Latitude' : 'Longitude'}</span>
                      <div className="text-blue-400 font-mono text-center p-2 bg-white/5 rounded-xl border border-white/5 tracking-tighter text-[10px] md:text-xs">
                        {selectedDetection.location[k].toFixed(10)}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedDetection(null)}
                  className="w-full bg-slate-800 hover:bg-blue-600 text-white p-4 md:p-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-white/5 shadow-lg"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-700">
          <p>© 2024 VINEE_CORE</p>
          <div className="flex gap-4 md:gap-8">
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.4); border-radius: 4px; }
      `}</style>
    </main>
  );
}
