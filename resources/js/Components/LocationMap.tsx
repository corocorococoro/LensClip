import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
    latitude: number;
    longitude: number;
    className?: string;
}

export default function LocationMap({ latitude, longitude, className = '' }: LocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Initialize map
        const map = L.map(mapRef.current, {
            center: [latitude, longitude],
            zoom: 15,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
        });

        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        // Custom marker icon
        const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        width: 10px;
                        height: 10px;
                        background: white;
                        border-radius: 50%;
                        transform: rotate(45deg);
                    "></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
        });

        // Add marker
        L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [latitude, longitude]);

    // Google Maps link for external navigation
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    return (
        <div className={`w-full bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden ${className}`}>
            <div className="flex items-center gap-2 p-3 border-b border-slate-100">
                <span className="text-xl" aria-hidden="true">📍</span>
                <span className="font-bold text-slate-700">みつけたばしょ</span>
            </div>
            <div
                ref={mapRef}
                className="w-full h-40"
                style={{ minHeight: '160px' }}
            />
            <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-indigo-600 hover:text-indigo-800 py-2 border-t border-slate-100 transition-colors"
            >
                Google マップでひらく →
            </a>
        </div>
    );
}
