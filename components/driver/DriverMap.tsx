import React, { useEffect, useRef } from 'react';
import type { Booking } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

declare const mapboxgl: any;

interface DriverMapProps {
    driverLocation: { lng: number; lat: number };
    activeBooking: Booking | null;
}

export const DriverMap: React.FC<DriverMapProps> = ({ driverLocation, activeBooking }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any | null>(null);
    const driverMarkerRef = useRef<any | null>(null);
    const { isDarkMode } = useTheme();

    // Effect for initializing and cleaning up the map instance.
    useEffect(() => {
        const initializeMap = async () => {
            if (mapContainerRef.current && !mapRef.current) {
                try {
                    mapboxgl.accessToken = 'pk.eyJ1Ijoia2hpemFyZG9nYXIiLCJhIjoiY21ld2ZhYWxkMDJqdjJpc2J5bTAxZWp5YSJ9.95ik-OG9i2bDA8QLys0GhQ';
                    
                    // Fix for CSP issue by loading worker as a Blob
                    const workerUrl = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl-csp-worker.js';
                    const workerBlob = new Blob([await fetch(workerUrl).then(r => r.text())], { type: 'application/javascript' });
                    mapboxgl.workerUrl = window.URL.createObjectURL(workerBlob);
                    
                    const map = new mapboxgl.Map({
                        container: mapContainerRef.current,
                        style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
                        center: [driverLocation.lng, driverLocation.lat],
                        zoom: 14,
                    });
    
                    mapRef.current = map;
    
                    map.on('load', () => {
                        if (!driverMarkerRef.current) {
                            const markerEl = document.createElement('div');
                            markerEl.className = 'driver-marker';
                            driverMarkerRef.current = new mapboxgl.Marker(markerEl)
                                .setLngLat([driverLocation.lng, driverLocation.lat])
                                .addTo(map);
                        }
                    });
    
                } catch (error) {
                    console.error("Failed to initialize Mapbox map:", error);
                }
            }
        };
        
        initializeMap();
        
        // Cleanup function to remove the map instance when the component unmounts.
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [isDarkMode, driverLocation]);

    // Effect to handle all visual updates to the map (theme, marker position, routes).
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const performMapUpdates = async () => {
            // Update map style if theme has changed
            const currentStyleName = map.getStyle().name || '';
            const targetStyleName = isDarkMode ? 'Mapbox Dark' : 'Mapbox Streets';
            if (!currentStyleName.includes(targetStyleName)) {
                map.setStyle(isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12');
                // Wait for the new style to load before proceeding
                await new Promise(resolve => map.once('style.load', resolve));
            }

            // Ensure driver marker exists and update its position
            if (driverMarkerRef.current) {
                driverMarkerRef.current.setLngLat([driverLocation.lng, driverLocation.lat]);
            }

            const clearRoute = () => {
                if (map.getSource('route')) {
                    if (map.getLayer('route')) map.removeLayer('route');
                    map.removeSource('route');
                }
            };

            if (!activeBooking) {
                clearRoute();
                map.panTo([driverLocation.lng, driverLocation.lat]);
                return;
            }
            
            // If there's an active booking, fetch and draw the route
            try {
                const geocodeAddress = async (address: string) => {
                    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
                    const response = await fetch(url);
                    const data = await response.json();
                    return data.features?.[0]?.center.join(',') || null;
                };

                const coordinates = [`${driverLocation.lng},${driverLocation.lat}`];
                const pointsToGeocode = [activeBooking.pickup, ...(activeBooking.form_data as any)?.waypoints?.[activeBooking.booking_type] || [], activeBooking.dropoff].filter(Boolean);
                
                for (const address of pointsToGeocode) {
                    const coords = await geocodeAddress(address);
                    if (coords) coordinates.push(coords);
                }

                if (coordinates.length < 2) return;

                const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.join(';')}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
                const response = await fetch(directionsUrl);
                const data = await response.json();
                
                if (data.routes?.[0]) {
                    const route = data.routes[0].geometry;
                    clearRoute();

                    map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: route } });
                    map.addLayer({
                        id: 'route',
                        type: 'line',
                        source: 'route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#0ea5e9', 'line-width': 6, 'line-opacity': 0.8 }
                    });

                    const bounds = new mapboxgl.LngLatBounds();
                    route.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
                    bounds.extend([driverLocation.lng, driverLocation.lat]);
                    map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
                }
            } catch (error) {
                console.error('Error fetching/drawing route:', error);
            }
        };

        // Ensure map is fully loaded before performing any operations.
        if (map.isStyleLoaded() && map.loaded()) {
            performMapUpdates();
        } else {
            map.once('load', performMapUpdates);
        }
    }, [driverLocation, activeBooking, isDarkMode]);

    return (
        <div className="relative h-96 w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200/70">
            <div ref={mapContainerRef} className="absolute top-0 bottom-0 w-full h-full" />
            <style>{`
                .driver-marker {
                    background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"%3e%3ccircle cx="16" cy="16" r="16" fill="%23FFFFFF"/%3e%3ccircle cx="16" cy="16" r="12" fill="%230ea5e9" fill-opacity="0.9"/%3e%3ccircle cx="16" cy="16" r="6" fill="%23FFFFFF"/%3e%3c/svg%3e');
                    width: 32px;
                    height: 32px;
                    background-size: cover;
                    border-radius: 50%;
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
};