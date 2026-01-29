import React, { useEffect, useRef } from 'react';
import type { Booking } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

declare const mapboxgl: any;

interface StatusMapProps {
    driverLocation: { lng: number; lat: number } | null;
    booking: Booking;
}

export const StatusMap: React.FC<StatusMapProps> = ({ driverLocation, booking }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any | null>(null);
    const driverMarkerRef = useRef<any | null>(null);
    const pickupMarkerRef = useRef<any | null>(null);
    const dropoffMarkerRef = useRef<any | null>(null);
    const { isDarkMode } = useTheme();

    // Effect for initializing and cleaning up the map instance.
    useEffect(() => {
        const initializeMap = async () => {
            if (mapContainerRef.current && !mapRef.current) {
                try {
                    mapboxgl.accessToken = 'pk.eyJ1Ijoia2hpemFyZG9nYXIiLCJhIjoiY21ld2ZhYWxkMDJqdjJpc2J5bTAxZWp5YSJ9.95ik-OG9i2bDA8QLys0GhQ';
                    
                    const workerUrl = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl-csp-worker.js';
                    const workerBlob = new Blob([await fetch(workerUrl).then(r => r.text())], { type: 'application/javascript' });
                    mapboxgl.workerUrl = window.URL.createObjectURL(workerBlob);
                    
                    const map = new mapboxgl.Map({
                        container: mapContainerRef.current,
                        style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
                        center: [-98.5795, 39.8283], // Default center
                        zoom: 3,
                    });
    
                    mapRef.current = map;
    
                } catch (error) {
                    console.error("Failed to initialize Mapbox map:", error);
                }
            }
        };
        initializeMap();
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [isDarkMode]);

    // Effect to handle all visual updates to the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const performMapUpdates = async () => {
            // Update map style
            const currentStyleName = map.getStyle().name || '';
            const targetStyleName = isDarkMode ? 'Mapbox Dark' : 'Mapbox Streets';
            if (!currentStyleName.includes(targetStyleName)) {
                map.setStyle(isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12');
                await new Promise(resolve => map.once('style.load', resolve));
            }

            // Update driver marker
            if (driverLocation && (booking.status === 'On Way' || booking.status === 'In Progress')) {
                if (driverMarkerRef.current) {
                    driverMarkerRef.current.setLngLat([driverLocation.lng, driverLocation.lat]);
                } else {
                    const markerEl = document.createElement('div');
                    markerEl.className = 'driver-marker';
                    driverMarkerRef.current = new mapboxgl.Marker(markerEl)
                        .setLngLat([driverLocation.lng, driverLocation.lat])
                        .addTo(map);
                }
            } else {
                if (driverMarkerRef.current) {
                    driverMarkerRef.current.remove();
                    driverMarkerRef.current = null;
                }
            }
            
            // Geocode and draw route
            try {
                const geocodeAddress = async (address: string) => {
                    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
                    const response = await fetch(url);
                    const data = await response.json();
                    return data.features?.[0]?.center || null;
                };

                const pickupCoords = await geocodeAddress(booking.pickup);
                const dropoffCoords = booking.dropoff ? await geocodeAddress(booking.dropoff) : null;
                
                const bounds = new mapboxgl.LngLatBounds();
                if(pickupCoords) bounds.extend(pickupCoords);
                if(dropoffCoords) bounds.extend(dropoffCoords);
                if(driverLocation) bounds.extend([driverLocation.lng, driverLocation.lat]);

                if (!pickupMarkerRef.current && pickupCoords) {
                    pickupMarkerRef.current = new mapboxgl.Marker({ color: '#22c55e' }).setLngLat(pickupCoords).addTo(map);
                }
                if (!dropoffMarkerRef.current && dropoffCoords) {
                    dropoffMarkerRef.current = new mapboxgl.Marker({ color: '#ef4444' }).setLngLat(dropoffCoords).addTo(map);
                }
                
                if (bounds.isEmpty()) {
                    if (driverLocation) map.panTo([driverLocation.lng, driverLocation.lat]);
                } else {
                     map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
                }

            } catch (error) {
                console.error('Error in map updates:', error);
            }
        };

        if (map.isStyleLoaded() && map.loaded()) {
            performMapUpdates();
        } else {
            map.once('load', performMapUpdates);
        }
    }, [booking, driverLocation, isDarkMode]);

    return (
        <div className="relative h-full w-full">
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
