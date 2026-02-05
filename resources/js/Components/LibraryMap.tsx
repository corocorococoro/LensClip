import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ObservationSummary, LibraryViewMode } from '@/types/models';
import ViewModeSwitcher from './ViewModeSwitcher';

interface LibraryMapProps {
    observations: ObservationSummary[];
    onModeChange: (mode: LibraryViewMode) => void;
}

export default function LibraryMap({ observations, onModeChange }: LibraryMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Filter observations with valid coordinates
    const withLocation = observations.filter(
        (obs) => obs.latitude != null && obs.longitude != null
    );

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Calculate bounds or use default center (Japan)
        let initialCenter: [number, number] = [36.5, 138.0];
        let initialZoom = 5;

        if (withLocation.length > 0) {
            const lats = withLocation.map((o) => o.latitude!);
            const lngs = withLocation.map((o) => o.longitude!);
            initialCenter = [
                (Math.min(...lats) + Math.max(...lats)) / 2,
                (Math.min(...lngs) + Math.max(...lngs)) / 2,
            ];
            initialZoom = 6;
        }

        // Initialize map with full interaction
        const map = L.map(mapRef.current, {
            center: initialCenter,
            zoom: initialZoom,
            zoomControl: false,
            attributionControl: false,
        });

        // Add zoom control to top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Add tile layer (Apple-like style with CartoDB Voyager)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(map);

        // Add markers for each observation
        const markers: L.Marker[] = [];
        withLocation.forEach((obs) => {
            if (obs.latitude == null || obs.longitude == null) return;

            // Create custom marker with thumbnail (Apple Photos style)
            const markerIcon = L.divIcon({
                className: 'observation-map-marker',
                html: `
                    <div class="marker-container" style="
                        position: relative;
                        width: 56px;
                        height: 56px;
                        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
                    ">
                        <div style="
                            width: 56px;
                            height: 56px;
                            border-radius: 12px;
                            border: 3px solid white;
                            overflow: hidden;
                            background: #f1f5f9;
                        ">
                            ${obs.thumb_url
                                ? `<img src="${obs.thumb_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
                                : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);">📷</div>`
                            }
                        </div>
                        <div style="
                            position: absolute;
                            bottom: -6px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 12px;
                            height: 12px;
                            background: white;
                            border-radius: 2px;
                            transform: translateX(-50%) rotate(45deg);
                        "></div>
                    </div>
                `,
                iconSize: [56, 68],
                iconAnchor: [28, 68],
            });

            const marker = L.marker([obs.latitude, obs.longitude], { icon: markerIcon });

            // Create popup with enhanced styling
            const popupContent = `
                <div style="text-align: center; min-width: 140px; padding: 4px;">
                    ${obs.thumb_url
                        ? `<img src="${obs.thumb_url}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`
                        : ''
                    }
                    <p style="font-weight: 600; font-size: 15px; margin: 0 0 8px 0; color: #1e293b;">${obs.title || '処理中...'}</p>
                    <a href="/observations/${obs.id}" style="
                        display: inline-block;
                        padding: 6px 12px;
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                        color: white;
                        text-decoration: none;
                        font-size: 13px;
                        font-weight: 500;
                        border-radius: 8px;
                    ">くわしくみる</a>
                </div>
            `;

            marker.bindPopup(popupContent, {
                maxWidth: 200,
                className: 'observation-popup',
            });
            marker.addTo(map);
            markers.push(marker);
        });

        // Fit bounds if there are markers
        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.15));
        }

        mapInstanceRef.current = map;
        setMapReady(true);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Empty state
    if (withLocation.length === 0) {
        return (
            <div className="h-full flex flex-col">
                {/* Header area */}
                <div className="px-4 py-3">
                    <ViewModeSwitcher currentMode="map" onModeChange={onModeChange} />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <span className="text-5xl" aria-hidden="true">🗺️</span>
                    </div>
                    <p className="text-gray-700 text-lg font-medium mb-2">
                        位置情報がある記録がありません
                    </p>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        写真に位置情報が含まれていると<br />
                        地図に表示されます
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            {/* Map container - full screen */}
            <div
                ref={mapRef}
                className="absolute inset-0 w-full h-full"
            />

            {/* Floating view switcher */}
            <div className="absolute top-3 left-3 z-[1000]">
                <ViewModeSwitcher currentMode="map" onModeChange={onModeChange} />
            </div>

            {/* Floating counter badge */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
                <div className="px-4 py-2 bg-white/90 backdrop-blur-lg rounded-full shadow-lg border border-white/50">
                    <span className="text-sm font-medium text-gray-700">
                        {withLocation.length}件の記録
                    </span>
                </div>
            </div>

            {/* Custom popup styles */}
            <style>{`
                .observation-popup .leaflet-popup-content-wrapper {
                    border-radius: 16px;
                    padding: 8px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                }
                .observation-popup .leaflet-popup-tip {
                    background: white;
                }
                .leaflet-control-zoom {
                    border: none !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                    border-radius: 12px !important;
                    overflow: hidden;
                }
                .leaflet-control-zoom a {
                    width: 36px !important;
                    height: 36px !important;
                    line-height: 36px !important;
                    font-size: 18px !important;
                    color: #374151 !important;
                    background: white !important;
                }
                .leaflet-control-zoom a:hover {
                    background: #f3f4f6 !important;
                }
            `}</style>
        </div>
    );
}
