'use client';

import { MapContainer, TileLayer, Marker, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet + React
const icon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Modern pin icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

interface MapProps {
    lat: number;
    lng: number;
}

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function MapView({ lat, lng }: MapProps) {
    // Use 2 decimals (approx 1.1km precision) for the map center to prevent micro-jitter
    const center: [number, number] = [parseFloat(lat.toFixed(2)), parseFloat(lng.toFixed(2))];

    return (
        <div className="w-full h-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative z-0">
            <MapContainer
                center={center}
                zoom={18}
                scrollWheelZoom={false}
                className="w-full h-full grayscale-[0.5] invert-[0.9] hue-rotate-[200deg] brightness-[0.8]"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CircleMarker
                    center={center}
                    radius={8}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1 }}
                />
                <CircleMarker
                    center={center}
                    radius={20}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
                />
                <ChangeView center={center} />
            </MapContainer>

            {/* Precision UI element */}
            <div className="absolute top-4 right-4 z-[1000] bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-1 items-end shadow-xl">
                <span className="text-[10px] uppercase font-black text-blue-500 tracking-[0.2em]">Live Precision Lock</span>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-500 uppercase font-bold">LATITUDE</span>
                        <span className="text-xs font-mono text-white">{lat.toFixed(10)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-500 uppercase font-bold">LONGITUDE</span>
                        <span className="text-xs font-mono text-white">{lng.toFixed(10)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
