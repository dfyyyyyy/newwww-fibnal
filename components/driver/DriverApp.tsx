



import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Driver, Booking, BookingStatus, Notification, DriverStatus, Theme, Session } from '../../types';
import { ICONS } from '../../constants';
import { useTheme } from '../../contexts/ThemeContext';
import imageCompression from 'browser-image-compression';
import { DriverMap } from './DriverMap';

interface DriverAppProps {
    session: Session;
    onSignOut: () => void;
}

interface EnrichedDriver extends Driver {
    completed_rides: number;
}


const DriverHeader: React.FC<{ driverName: string; driverStatus: DriverStatus, onSignOut: () => void; }> = ({ driverName, driverStatus, onSignOut }) => {
    const { t } = useTheme();
     const statusInfo = {
        Online: { text: t('online', "Online"), color: "bg-green-500" },
        'On Trip': { text: t('on_trip', "On Trip"), color: "bg-blue-500" },
        Offline: { text: t('offline', "Offline"), color: "bg-slate-500" },
    }[driverStatus] || { text: t('unknown', "Unknown"), color: "bg-slate-500" };

    return (
        <header className="bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-20 border-b border-slate-200/70">
            <div>
                <h1 className="text-xl font-bold text-slate-900">{t('welcome_driver', 'Welcome')}, {driverName}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`}></span>
                    <p className="text-sm text-slate-500 font-semibold">{statusInfo.text}</p>
                </div>
            </div>
            <button
                onClick={onSignOut}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
                {t('sign_out', 'Sign Out')}
            </button>
        </header>
    );
};

const BookingCard: React.FC<{
    booking: Booking;
    onUpdateStatus: (bookingId: number, status: BookingStatus) => void;
    driverStatus: DriverStatus;
}> = ({ booking, onUpdateStatus, driverStatus }) => {
    const { t } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    
    const getStatusInfo = (status: BookingStatus) => {
        switch (status) {
            case 'Completed': return { text: t('completed', "Completed"), color: "bg-green-100 text-green-700" };
            case 'In Progress': return { text: t('in_progress', "In Progress"), color: "bg-blue-100 text-blue-700" };
            case 'On Way': return { text: t('on_way', "On Way"), color: "bg-cyan-100 text-cyan-700" };
            case 'Scheduled': return { text: t('scheduled', "Scheduled"), color: "bg-yellow-100 text-yellow-700" };
            case 'Cancelled': return { text: t('cancelled', "Cancelled"), color: "bg-red-100 text-red-700" };
            default: return { text: t('unknown', "Unknown"), color: "bg-slate-100 text-slate-700" };
        }
    };
    const statusInfo = getStatusInfo(booking.status);
    const bookingTime = new Date((booking.form_data as any)?.datetime || booking.created_at);
    const formData = (booking.form_data || {}) as any;
    const customerContact = formData.phone_number || formData.email || 'N/A';
    const specialInstructions = formData.special_instructions;

    const getNextAction = () => {
        if (driverStatus === 'Offline') return null;
        switch (booking.status) {
            case 'Scheduled':
                return { label: t('on_my_way', 'On My Way'), nextStatus: 'On Way' as BookingStatus };
            case 'On Way':
                return { label: t('start_ride', 'Start Ride'), nextStatus: 'In Progress' as BookingStatus };
            case 'In Progress':
                return { label: t('complete_ride', 'Complete Ride'), nextStatus: 'Completed' as BookingStatus };
            default:
                return null;
        }
    };

    const nextAction = getNextAction();

    const openMaps = (address: string) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    };

    return (
        <div className="rounded-2xl shadow-lg bg-white border border-slate-200/70 overflow-hidden">
            <div className="p-5">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <p className="font-bold text-slate-800">{t('ride', 'Ride')} #{booking.id}</p>
                        <p className="text-sm text-slate-500">{booking.customer}</p>
                    </div>
                    <div className={`text-xs font-bold px-3 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.text}</div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-sm">
                    <div className="flex items-start gap-3 group" onClick={() => openMaps(booking.pickup)}>
                        <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                        <div className="cursor-pointer">
                            <p className="text-xs text-slate-500">{t('from', 'From')}</p>
                            <p className="font-semibold text-slate-800 group-hover:underline">{booking.pickup}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 group" onClick={() => booking.dropoff && openMaps(booking.dropoff)}>
                         <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                        <div className={`${booking.dropoff ? 'cursor-pointer' : ''}`}>
                            <p className="text-xs text-slate-500">{t('to', 'To')}</p>
                            <p className={`font-semibold text-slate-800 ${booking.dropoff ? 'group-hover:underline' : ''}`}>{booking.dropoff || 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                         <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                         <div>
                            <p className="text-xs text-slate-500">{t('time', 'Time')}</p>
                            <p className="font-semibold text-slate-800">{bookingTime.toLocaleDateString()} at {bookingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 text-sm space-y-2 bg-slate-50 -mx-5 px-5 py-4">
                        <p><strong>{t('contact', 'Contact')}:</strong> <a href={`tel:${customerContact}`} className="text-primary-600 hover:underline">{customerContact}</a></p>
                        {specialInstructions && <p><strong>{t('instructions', 'Instructions')}:</strong> {specialInstructions}</p>}
                    </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                     <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm font-medium text-primary-600 hover:underline">
                        {isExpanded ? t('show_less', 'Show Less') : t('show_details', 'Show Details')}
                    </button>
                    {nextAction && (
                        <button
                            onClick={() => onUpdateStatus(booking.id, nextAction.nextStatus)}
                            disabled={driverStatus === 'Offline' || (driverStatus === 'On Trip' && booking.status !== 'In Progress')}
                            className="bg-primary-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {nextAction.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const DriverApp: React.FC<DriverAppProps> = ({ session, onSignOut }) => {
    const { t } = useTheme();
    const [driver, setDriver] = useState<EnrichedDriver | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ lng: number; lat: number } | null>(null);
    const throttleTimeoutRef = useRef<number | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        const handleShowNotification = (e: any) => {
            setNotification(e.detail.message);
            setTimeout(() => setNotification(null), 5000);
        };
        window.addEventListener('show-driver-notification', handleShowNotification);
        return () => window.removeEventListener('show-driver-notification', handleShowNotification);
    }, []);

    const fetchDriverData = useCallback(async () => {
        if (!session.user.email) {
            setError(t('email_not_available', "User email not available."));
            setLoading(false);
            return;
        }

        try {
            // No need to set loading true here to avoid UI flicker on background updates
            const { data: driverData, error: driverError } = await supabase
                .from('drivers')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (driverError) throw driverError;
            if (!driverData) throw new Error(t('driver_profile_not_found', "Driver profile not found."));

            const { data: bookingsData, error: bookingsError } = await supabase.from('bookings').select('*').eq('driver', driverData.name).order('created_at', { ascending: false });
            if (bookingsError) throw bookingsError;

            const { count: completedRidesCount, error: countError } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('driver', driverData.name).eq('status', 'Completed');
            if(countError) throw countError;
            
            setDriver({ ...driverData, completed_rides: completedRidesCount || 0 });
            setBookings(bookingsData || []);

        } catch (err: any) {
            setError(err.message || t('failed_load_driver_data', 'Failed to load driver data.'));
        } finally {
            setLoading(false);
        }
    }, [session.user.email, t]);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError(t('geolocation_not_supported', "Geolocation is not supported by your browser."));
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLocation = {
                    lng: position.coords.longitude,
                    lat: position.coords.latitude,
                };
                setCurrentLocation(newLocation);
                setError(null);

                if (driver && !throttleTimeoutRef.current) {
                    throttleTimeoutRef.current = window.setTimeout(async () => {
                        await supabase
                            .from('drivers')
                            .update({ last_location: { lat: newLocation.lat, lng: newLocation.lng } })
                            .eq('id', driver.id);
                        throttleTimeoutRef.current = null;
                    }, 5000); // Update every 5 seconds
                }
            },
            (error) => {
                setError(`${t('geolocation_error', "Geolocation error:")} ${error.message}`);
                console.error("Geolocation error:", error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
            if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current);
        };
    }, [driver, t]);

    useEffect(() => {
        fetchDriverData();
    }, [fetchDriverData]);

    useEffect(() => {
        if (!driver) return;

        const bookingsChannel = supabase
            .channel(`driver-bookings-${driver.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings', filter: `driver=eq.${driver.name}` },
                (payload) => {
                    console.log('Booking change received!', payload);
                    fetchDriverData(); 
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(bookingsChannel);
        };
    }, [driver, fetchDriverData]);

    const handleUpdateStatus = async (bookingId: number, status: BookingStatus) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', bookingId);
        
        if (error) {
           console.error("Failed to update status", error.message);
        } else {
            // The realtime listener will trigger a refetch, so optimistic update is optional
            // setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
            if(status === 'On Way' || status === 'In Progress') {
                await handleDriverStatusChange('On Trip');
            } else if (status === 'Completed') {
                await handleDriverStatusChange('Online');
            }
        }
    };
    
    const handleDriverStatusChange = async (status: DriverStatus) => {
        if (!driver) return;
        const { error } = await supabase
            .from('drivers')
            .update({ status })
            .eq('id', driver.id);
        
        if (error) {
            console.error("Failed to update driver status", error.message);
        } else {
            setDriver(prev => prev ? { ...prev, status } : null);
        }
    };
    
    if (loading) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center">{t('loading', 'Loading...')}</div>;
    }

    if (error && !currentLocation) { // Only show full-screen error if location fails initially
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-center">{t('error', 'Error')}: {error}</div>;
    }

    if (!driver) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-center">{t('no_driver_profile', 'No driver profile found for this account.')}</div>
    }

    const activeBooking = bookings.find(b => b.status === 'On Way' || b.status === 'In Progress') || null;
    const scheduledBookings = bookings.filter(b => b.status === 'Scheduled');

    return (
         <div className="min-h-screen bg-slate-100">
            {notification && (
                <div className="fixed top-20 right-6 bg-blue-500 text-white px-5 py-3 rounded-lg shadow-lg z-50">
                    {notification}
                </div>
            )}
            <DriverHeader driverName={driver.name} driverStatus={driver.status as DriverStatus} onSignOut={onSignOut} />
            <main className="p-4 sm:p-6 space-y-6">
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{t('your_status', 'Your Status')}</h2>
                     <div className="flex items-center gap-2">
                        {(['Online', 'Offline'] as DriverStatus[]).map(status => (
                            <button key={status} onClick={() => handleDriverStatusChange(status)} disabled={driver.status === 'On Trip'} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${driver.status === status ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                {t(status.toLowerCase(), status)}
                            </button>
                        ))}
                    </div>
                </div>

                {activeBooking && currentLocation ? (
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">{t('current_ride', 'Current Ride')}</h2>
                        <DriverMap driverLocation={currentLocation} activeBooking={activeBooking} />
                        <div className="mt-6">
                           <BookingCard booking={activeBooking} onUpdateStatus={handleUpdateStatus} driverStatus={driver.status as DriverStatus} />
                        </div>
                    </div>
                ) : currentLocation ? (
                    <div>
                         <h2 className="text-xl font-bold text-slate-800 mb-4">{t('your_location', 'Your Location')}</h2>
                         <DriverMap driverLocation={currentLocation} activeBooking={null} />
                    </div>
                ) : error ? (
                    <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center">{error}</div>
                ) : null}

                <h2 className="text-xl font-bold text-slate-800">{t('scheduled_rides', 'Scheduled Rides')} ({scheduledBookings.length})</h2>
                {scheduledBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scheduledBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} onUpdateStatus={handleUpdateStatus} driverStatus={driver.status as DriverStatus} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
                        <p className="font-semibold">{t('no_scheduled_rides', 'No scheduled rides.')}</p>
                        <p className="text-sm mt-1">{t('no_scheduled_rides_subtitle', 'New rides will appear here when assigned.')}</p>
                    </div>
                )}
            </main>
        </div>
    );
};