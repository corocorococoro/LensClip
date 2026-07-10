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
                    background: #159E96;
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
        <div className={`w-full overflow-hidden rounded-2xl border border-brand-line bg-white ${className}`}>
            <div className="flex items-center gap-2 border-b border-brand-line p-3.5 text-brand-primary-dark">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                <span className="font-bold text-brand-ink">みつけたばしょ</span>
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
                className="block min-h-11 border-t border-brand-line py-3 text-center text-sm font-bold text-brand-primary-dark transition-colors hover:bg-brand-primary-soft"
            >
                Google マップでひらく →
            </a>
        </div>
    );
}
