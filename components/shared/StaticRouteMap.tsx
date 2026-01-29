import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface StaticRouteMapProps {
    pickup: string;
    dropoff: string;
    waypoints: string[] | null | undefined;
}

interface Point {
    label: string; // This will now be the full address
    markerLabel: string; // This will be 'A', '1', 'B', etc.
    position: { top: string; left: string; };
    color: string;
}

// Simple hashing function to get a somewhat consistent position for a string
const stringToPosition = (str: string, index: number): { top: string; left: string; } => {
    if (!str) return { top: '50%', left: '50%' };
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = (hash & 0xFF) / 255;
    const y = ((hash >> 8) & 0xFF) / 255;
    
    // Add some variation based on index to avoid all points being on top of each other
    const top = 5 + (y * 80) + (index % 3 * 5);
    const left = 5 + (x * 80) + (index % 4 * 5);

    return {
        top: `${Math.min(95, top)}%`,
        left: `${Math.min(95, left)}%`,
    };
};

export const StaticRouteMap: React.FC<StaticRouteMapProps> = ({ pickup, dropoff, waypoints }) => {
    const { isDarkMode } = useTheme();
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)';

    const points = useMemo<Point[]>(() => {
        const allPoints: Point[] = [];
        if (pickup) {
            allPoints.push({ label: pickup, markerLabel: 'A', position: stringToPosition(pickup, 0), color: 'bg-green-500' });
        }
        if (waypoints) {
            waypoints.forEach((wp, index) => {
                if(wp) allPoints.push({ label: wp, markerLabel: String(index + 1), position: stringToPosition(wp, index + 1), color: 'bg-yellow-500' });
            });
        }
        if (dropoff) {
            allPoints.push({ label: dropoff, markerLabel: 'B', position: stringToPosition(dropoff, (waypoints?.length || 0) + 1), color: 'bg-red-500' });
        }
        return allPoints;
    }, [pickup, dropoff, waypoints]);

    const pathD = useMemo(() => {
        if (points.length < 2) return '';
        const pathPoints = points.map(p => `${parseFloat(p.position.left)} ${parseFloat(p.position.top)}`);
        return `M${pathPoints.join(' L')}`;
    }, [points]);
    
    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-200 dark:bg-black">
            <div 
                className="absolute inset-0 bg-repeat" 
                style={{
                    backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                }}
            ></div>
             {points.length > 1 && (
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
                    <path d={pathD} stroke="var(--accent-color)" strokeWidth="0.5" fill="none" strokeDasharray="2,2" />
                </svg>
            )}
            {points.map((point, index) => (
                <div key={index} className="absolute" style={{ top: point.position.top, left: point.position.left, transform: 'translate(-50%, -50%)' }}>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md whitespace-nowrap shadow-md border border-slate-200 dark:border-slate-700 max-w-40 truncate">
                        {point.label}
                    </div>
                    <div className={`w-6 h-6 ${point.color} rounded-full z-10 relative border-2 border-white dark:border-slate-900 flex items-center justify-center text-white font-bold text-xs`}>
                        {point.markerLabel}
                    </div>
                </div>
            ))}
        </div>
    );
};