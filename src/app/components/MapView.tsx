'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
    lat: number;
    lng: number;
    /** Called once on mount with a setter fn — lets parent update position without re-rendering */
    onRegisterSetPosition?: (fn: (lat: number, lng: number) => void) => void;
}

export default function MapView({ lat, lng, onRegisterSetPosition }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.CircleMarker | null>(null);
    const ringRef = useRef<L.CircleMarker | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // Use higher zoom for the initial lock
        const map = L.map(containerRef.current, {
            center: [lat, lng],
            zoom: 17,
            zoomControl: false,
            attributionControl: false,
        });

        // Dark sleek map style
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        // Outer pulse ring
        const ring = L.circleMarker([lat, lng], {
            radius: 18,
            color: '#3b82f6',
            weight: 1.5,
            opacity: 0.4,
            fillOpacity: 0,
        }).addTo(map);

        // Inner dot
        const marker = L.circleMarker([lat, lng], {
            radius: 7,
            color: '#3b82f6',
            weight: 2,
            opacity: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.9,
        }).addTo(map);

        mapRef.current = map;
        markerRef.current = marker;
        ringRef.current = ring;

        // Register the imperative setter — parent calls this to move the marker
        // without ever triggering a React re-render
        if (onRegisterSetPosition) {
            onRegisterSetPosition((newLat: number, newLng: number) => {
                if (!mapRef.current || !markerRef.current || !ringRef.current) return;
                const pos = L.latLng(newLat, newLng);
                markerRef.current.setLatLng(pos);
                ringRef.current.setLatLng(pos);
                mapRef.current.setView(pos, mapRef.current.getZoom(), { animate: true, duration: 0.4 });
            });
        }

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={containerRef} className="w-full h-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative z-0" />;
}
