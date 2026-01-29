
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Driver, DriverStatus, Session } from '../types';
import { useTheme } from '../contexts/ThemeContext';

declare const mapboxgl: any;

const createMarkerElement = (status: DriverStatus): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'driver-marker';
    const dot = document.createElement('div');
    dot.className = 'marker-dot';
    
    const pulse = document.createElement('div');
    pulse.className = 'marker-pulse';

    el.appendChild(dot);
    el.appendChild(pulse);
    
    el.dataset.status = status; 
    return el;
};

const MapOverlay: React.FC<{ message: string; subtext?: string; isLoading?: boolean }> = ({ message, subtext, isLoading = false }) => (
    <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10 text-center p-4">
        <div>
            {isLoading && (
                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
            )}
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{message}</p>
            {subtext && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

export const LiveMapTracking: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session }) => {
    const { isDarkMode, t } = useTheme();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any | null>(null);
    const markersRef = useRef<Map<number, any>>(new Map());
    const [drivers, setDrivers] = useState<Map<number, Driver>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeDriversOnMap, setActiveDriversOnMap] = useState(0);
    const [showHeatmap, setShowHeatmap] = useState(false);

    useEffect(() => {
        const initializeMap = async () => {
            if (!mapContainerRef.current || mapRef.current) return;

            try {
                mapboxgl.accessToken = 'pk.eyJ1Ijoia2hpemFyZG9nYXIiLCJhIjoiY21ld2ZhYWxkMDJqdjJpc2J5bTAxZWp5YSJ9.95ik-OG9i2bDA8QLys0GhQ';
                
                const workerUrl = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl-csp-worker.js';
                const workerBlob = new Blob([await fetch(workerUrl).then(r => r.text())], { type: 'application/javascript' });
                mapboxgl.workerUrl = window.URL.createObjectURL(workerBlob);

                const map = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
                    center: [-98.5795, 39.8283], 
                    zoom: 3,
                });
                map.on('load', () => {
                     setLoading(false);
                });
                mapRef.current = map;
            } catch (e: any) {
                console.error("Failed to initialize map:", e);
                setError(`${t('map_init_fail', 'Failed to initialize map:')} ${e.message}`);
                setLoading(false);
            }
        };

        initializeMap();

        return () => {
            if(mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        }
    }, [isDarkMode, t]);

     useEffect(() => {
        if (mapRef.current && mapRef.current.isStyleLoaded()) {
            mapRef.current.setStyle(isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12');
        }
    }, [isDarkMode]);

    const handleDriverUpdate = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = (eventType === 'DELETE' ? oldRecord : newRecord) as Driver;
        
        setDrivers(prevDrivers => {
            const newMap = new Map(prevDrivers);
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                newMap.set(record.id, record);
            } else if (eventType === 'DELETE' && record.id) {
                newMap.delete(record.id);
            }
            return newMap;
        });
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchAndSetInitialDrivers = async () => {
            const { data, error: fetchError } = await supabase.from('drivers').select('*').eq('uid', session.user.id);
            if (!isMounted) return;

            if (fetchError) {
                setError(t('fetch_fail_drivers', 'Failed to fetch initial driver data.'));
                console.error(fetchError);
                return;
            }
            if (data) {
                const newDriversMap = new Map<number, Driver>();
                data.forEach(driver => newDriversMap.set(driver.id, driver));
                setDrivers(newDriversMap);
            }
        };

        fetchAndSetInitialDrivers();

        const channel = supabase.channel('public:drivers-live-map')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers', filter: `uid=eq.${session.user.id}` }, handleDriverUpdate)
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [handleDriverUpdate, t, session.user.id]);

    useEffect(() => {
        if (!mapRef.current || loading) return;

        const map = mapRef.current;
        const currentMarkers = markersRef.current;
        const driverIdsOnMap = new Set(currentMarkers.keys());
        
        const bounds = new mapboxgl.LngLatBounds();
        let locationsFound = 0;

        drivers.forEach((driver) => {
            const location = driver.last_location as { lat: number, lng: number } | null;
            driverIdsOnMap.delete(driver.id); 

            if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
                locationsFound++;
                bounds.extend([location.lng, location.lat]);
                
                const existingMarker = currentMarkers.get(driver.id);

                if (existingMarker) {
                    existingMarker.setLngLat([location.lng, location.lat]);
                    const markerEl = existingMarker.getElement();
                    if(markerEl.dataset.status !== driver.status) {
                        markerEl.dataset.status = driver.status;
                         existingMarker.getPopup().setHTML(
                            `<strong style="color: ${isDarkMode ? '#fff' : '#000'}">${driver.name}</strong><br>${t(driver.status.toLowerCase().replace(' ', '_'), driver.status)}`
                        );
                    }
                } else {
                    const markerEl = createMarkerElement(driver.status);
                    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
                         `<strong style="color: ${isDarkMode ? '#fff' : '#000'}">${driver.name}</strong><br>${t(driver.status.toLowerCase().replace(' ', '_'), driver.status)}`
                    );

                    const newMarker = new mapboxgl.Marker(markerEl)
                        .setLngLat([location.lng, location.lat])
                        .setPopup(popup)
                        .addTo(map);
                    currentMarkers.set(driver.id, newMarker);
                }
            } else {
                const existingMarker = currentMarkers.get(driver.id);
                if (existingMarker) {
                    existingMarker.remove();
                    currentMarkers.delete(driver.id);
                }
            }
        });

        driverIdsOnMap.forEach(driverId => {
            currentMarkers.get(driverId)?.remove();
            currentMarkers.delete(driverId);
        });

        setActiveDriversOnMap(locationsFound);
        
        if (locationsFound > 0 && map.isStyleLoaded() && !bounds.isEmpty()) {
             map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
        }

    }, [drivers, loading, isDarkMode, t]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('live_map_title', 'Fleet Radar')}</h1>
                <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                     <button 
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${showHeatmap ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Heatmap
                    </button>
                    <div className="px-4 py-2 text-xs font-bold text-slate-400">
                        {activeDriversOnMap} Drivers Online
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="relative w-full h-[650px] rounded-[24px] overflow-hidden">
                    {loading && <MapOverlay message={t('loading_map', 'Connecting to satellite...')} isLoading={true} />}
                    {error && <MapOverlay message={t('map_error', 'Communication Error')} subtext={error} />}
                    {!loading && !error && activeDriversOnMap === 0 && (
                        <MapOverlay message={t('no_active_drivers', 'No Drivers on Radar')} subtext={t('no_active_drivers_subtitle', 'Real-time positions will appear once drivers log in.')} />
                    )}

                    <div ref={mapContainerRef} className="absolute inset-0" />
                    <style>{`
                        .driver-marker { position: relative; width: 24px; height: 24px; cursor: pointer; z-index: 5; }
                        .marker-dot { width: 100%; height: 100%; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: background-color 0.3s; }
                        .marker-pulse { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; transform-origin: center; animation: pulse 2s infinite; opacity: 0.5; }
                        
                        .driver-marker[data-status="Online"] .marker-dot { background-color: #22c55e; }
                        .driver-marker[data-status="Online"] .marker-pulse { background-color: #22c55e; }
                        
                        .driver-marker[data-status="On Trip"] .marker-dot { background-color: #3b82f6; }
                        .driver-marker[data-status="On Trip"] .marker-pulse { background-color: #3b82f6; }
                        
                        .driver-marker[data-status="Offline"] .marker-dot { background-color: #64748b; }
                        .driver-marker[data-status="Offline"] .marker-pulse { display: none; }

                        @keyframes pulse {
                          0% { transform: scale(1); opacity: 0.5; }
                          70% { transform: scale(3.5); opacity: 0; }
                          100% { transform: scale(1); opacity: 0; }
                        }
                        .mapboxgl-popup-content { background: ${isDarkMode ? '#0f172a' : 'white'}; color: ${isDarkMode ? '#e2e8f0' : '#1e293b'}; padding: 12px; border-radius: 16px; border: 1px solid ${isDarkMode ? '#1e293b' : '#f1f5f9'}; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); font-weight: 600; }
                        .mapboxgl-popup-close-button { display: none; }
                        .mapboxgl-ctrl-bottom-right { display: none; }
                    `}</style>
                </div>
            </div>
        </div>
    );
};
