import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ObservationSummary } from '@/types/models';

interface LibraryMapProps {
    observations: ObservationSummary[];
}

export default function LibraryMap({ observations }: LibraryMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Filter observations with valid coordinates
        const withLocation = observations.filter(
            (obs) => obs.latitude != null && obs.longitude != null
        );

        // Calculate bounds or use default center
        let initialCenter: [number, number] = [35.6762, 139.6503]; // Tokyo default
        let initialZoom = 10;

        if (withLocation.length > 0) {
            const lats = withLocation.map((o) => o.latitude!);
            const lngs = withLocation.map((o) => o.longitude!);
            initialCenter = [
                (Math.min(...lats) + Math.max(...lats)) / 2,
                (Math.min(...lngs) + Math.max(...lngs)) / 2,
            ];
        }

        // Initialize map
        const map = L.map(mapRef.current, {
            center: initialCenter,
            zoom: initialZoom,
            zoomControl: true,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Add markers for each observation
        const markers: L.Marker[] = [];
        withLocation.forEach((obs) => {
            if (obs.latitude == null || obs.longitude == null) return;

            // Create custom marker with thumbnail
            const markerIcon = L.divIcon({
                className: 'custom-observation-marker',
                html: `
                    <div style="
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        overflow: hidden;
                        background: #f1f5f9;
                    ">
                        ${obs.thumb_url
                            ? `<img src="${obs.thumb_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
                            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px;">📷</div>`
                        }
                    </div>
                `,
                iconSize: [48, 48],
                iconAnchor: [24, 24],
            });

            const marker = L.marker([obs.latitude, obs.longitude], { icon: markerIcon });

            // Create popup
            const popupContent = `
                <div style="text-align: center; min-width: 120px;">
                    ${obs.thumb_url
                        ? `<img src="${obs.thumb_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`
                        : ''
                    }
                    <p style="font-weight: bold; margin: 0 0 8px 0;">${obs.title || '処理中...'}</p>
                    <a href="/observations/${obs.id}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">くわしくみる →</a>
                </div>
            `;

            marker.bindPopup(popupContent);
            marker.addTo(map);
            markers.push(marker);
        });

        // Fit bounds if there are markers
        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [observations]);

    const observationsWithLocation = observations.filter(
        (obs) => obs.latitude != null && obs.longitude != null
    );

    if (observationsWithLocation.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-6xl mb-4" aria-hidden="true">🗺️</span>
                <p className="text-gray-500 text-lg mb-2">
                    位置情報がある記録がありません
                </p>
                <p className="text-gray-400 text-sm">
                    写真に位置情報が含まれていると<br />
                    地図に表示されます
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-gray-500">
                {observationsWithLocation.length}件の記録を表示中
            </p>
            <div
                ref={mapRef}
                className="w-full h-[60vh] min-h-[400px] rounded-2xl overflow-hidden shadow-sm"
            />
        </div>
    );
}
