import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import type { Booking, Driver } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusMap } from './StatusMap';

interface PublicBookingStatusProps {
    bookingId: string;
}

const PaymentStatusDisplay: React.FC<{
    status: 'processing' | 'success' | 'cancelled' | 'error';
    message: string;
    onReset?: () => void;
}> = ({ status, message, onReset }) => {
    const { t } = useTheme();
    const statusInfo = {
        processing: { title: t('processing_payment', "Processing Payment..."), color: "text-blue-500", icon: <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div> },
        success: { title: t('booking_confirmed', "Booking Confirmed!"), color: "text-green-500", icon: <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        cancelled: { title: t('payment_cancelled', "Payment Cancelled"), color: "text-yellow-500", icon: <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        error: { title: t('payment_error', "Payment Error"), color: "text-red-500", icon: <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
    }[status];

    return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <div className={`mx-auto mb-4 ${statusInfo.color}`}>{statusInfo.icon}</div>
                <h1 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.title}</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{message}</p>
                {onReset && (
                    <button onClick={onReset} className="mt-6 w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition">
                        {t('continue_to_status', 'Continue to Status Page')}
                    </button>
                )}
            </div>
        </div>
    );
};

export const PublicBookingStatus: React.FC<PublicBookingStatusProps> = ({ bookingId }) => {
    const { t } = useTheme();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [driver, setDriver] = useState<Partial<Driver> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'cancelled' | 'error'>('idle');
    const [paymentMessage, setPaymentMessage] = useState('');

    const fetchBookingAndDriver = useCallback(async () => {
        // NOTE: This requires RLS policies allowing public read access.
        // e.g., CREATE POLICY "Allow public read access to individual bookings" ON public.bookings FOR SELECT USING (true);
        // e.g., CREATE POLICY "Allow public read access to driver public info" ON public.drivers FOR SELECT USING (true);
        const { data: bookingData, error: bookingError } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
        if (bookingError) throw new Error(`Booking not found. Please check your link. (Error: ${bookingError.message})`);
        
        setBooking(bookingData);

        if (bookingData.driver && bookingData.driver !== 'Unassigned') {
            const { data: driverData, error: driverError } = await supabase.from('drivers').select('id, name, vehicle, profile_picture_url, last_location').eq('name', bookingData.driver).eq('uid', bookingData.uid).single();
            if (driverError) console.warn("Could not fetch assigned driver details.");
            else setDriver(driverData);
        } else {
            setDriver(null);
        }
    }, [bookingId]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const paymentCancelled = urlParams.get('payment_cancelled');
        const paypalSuccess = urlParams.get('paypal_success');
        const token = urlParams.get('token');

        const handlePaymentStatus = async () => {
            if (paypalSuccess) {
                setPaymentStatus('processing');
                setPaymentMessage('Finalizing your booking, please wait...');
                try {
                    const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
                        body: { orderID: token, uid: booking?.uid, bookingId }
                    });
                    if (error || data.error) throw new Error(error?.message || data.error);
                    setPaymentStatus('success');
                    setPaymentMessage(data.message || 'Your payment was successful and your booking is confirmed!');
                } catch (err: any) {
                    setPaymentStatus('error');
                    setPaymentMessage(err.message);
                }
            } else if (paymentSuccess) {
                setPaymentStatus('success');
                setPaymentMessage("Your payment was successful and your booking is confirmed! An email confirmation is on its way.");
            } else if (paymentCancelled) {
                setPaymentStatus('cancelled');
                setPaymentMessage("Your payment was cancelled. You can try booking again from the main form.");
            }
        };

        handlePaymentStatus();
        fetchBookingAndDriver().catch(err => setError(err.message)).finally(() => setLoading(false));

        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

    }, [fetchBookingAndDriver, bookingId, booking?.uid]);
    
    useEffect(() => {
        const bookingChannel = supabase
            .channel(`public-booking-${bookingId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` }, 
                (payload) => {
                    const updatedBooking = payload.new as Booking;
                    setBooking(updatedBooking);
                    // If driver changed, fetch new driver details
                    if (updatedBooking.driver && updatedBooking.driver !== booking?.driver) {
                        supabase.from('drivers').select('id, name, vehicle, profile_picture_url, last_location').eq('name', updatedBooking.driver).eq('uid', updatedBooking.uid).single()
                            .then(({ data, error }) => {
                                if (data) setDriver(data);
                            });
                    }
                }
            ).subscribe();

        let driverChannel: any;
        if (driver?.id) {
            driverChannel = supabase
                .channel(`public-driver-${driver.id}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driver.id}` },
                    (payload) => setDriver(prev => ({ ...prev, ...payload.new }))
                ).subscribe();
        }

        return () => {
            supabase.removeChannel(bookingChannel);
            if (driverChannel) supabase.removeChannel(driverChannel);
        };
    }, [bookingId, booking?.driver, driver?.id, booking?.uid]);

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div></div>;
    
    if (error) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4"><div className="max-w-md w-full text-center bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700"><h1 className="text-xl font-bold text-red-500">Error</h1><p className="mt-2 text-slate-600 dark:text-slate-400">{error}</p></div></div>;

    if (paymentStatus !== 'idle') {
        return <PaymentStatusDisplay status={paymentStatus} message={paymentMessage} onReset={paymentStatus !== 'cancelled' ? () => setPaymentStatus('idle') : undefined} />;
    }

    if (!booking) return null;

    const statuses = ['Scheduled', 'On Way', 'In Progress', 'Completed'];
    const currentStatusIndex = statuses.indexOf(booking.status);

    const getStatusMessage = () => {
        switch(booking.status) {
            case 'Scheduled': return 'Your ride is confirmed and waiting for a driver.';
            case 'On Way': return `Your driver, ${driver?.name || ''}, is on the way!`;
            case 'In Progress': return 'Your ride is in progress. Enjoy the trip!';
            case 'Completed': return 'Your ride is complete. Thank you for choosing us!';
            case 'Cancelled': return 'This booking has been cancelled.';
            default: return 'Checking status...';
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Booking #{booking.id} Status</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">{getStatusMessage()}</p>
                </div>
                
                {booking.status !== 'Cancelled' && (
                    <div className="mb-8 px-4">
                        <div className="flex justify-between items-center">
                            {statuses.map((status, index) => (
                                <div key={status} className="flex-1 flex flex-col items-center relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${index <= currentStatusIndex ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'}`}>
                                        {index < currentStatusIndex ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> : index + 1}
                                    </div>
                                    <p className={`mt-2 text-xs text-center font-semibold transition-colors duration-300 ${index <= currentStatusIndex ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>{status}</p>
                                    {index < statuses.length - 1 && <div className={`absolute top-4 left-1/2 w-full h-0.5 ${index < currentStatusIndex ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
                    <div className="h-64 md:h-96">
                        <StatusMap driverLocation={driver?.last_location as any} booking={booking} />
                    </div>
                    {driver && (booking.status === 'On Way' || booking.status === 'In Progress' || booking.status === 'Completed') && (
                        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                            <img className="w-16 h-16 rounded-full" src={driver.profile_picture_url || `https://ui-avatars.com/api/?name=${driver.name?.replace(/\s/g, "+")}&background=random&color=fff`} alt={driver.name} />
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-slate-500">Your Driver</p>
                                <p className="font-bold text-xl text-slate-800 dark:text-white">{driver.name}</p>
                                <p className="text-slate-600 dark:text-slate-400">{driver.vehicle}</p>
                            </div>
                        </div>
                    )}
                </div>

                 <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-800/70 mt-6 p-6 space-y-4">
                     <h3 className="font-bold text-lg">Trip Details</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
                            <div>
                                <p className="font-semibold text-slate-500 dark:text-slate-400">Pickup</p>
                                <p>{booking.pickup}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <div className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
                            <div>
                                <p className="font-semibold text-slate-500 dark:text-slate-400">Dropoff</p>
                                <p>{booking.dropoff || 'N/A'}</p>
                            </div>
                        </div>
                     </div>
                 </div>

            </div>
        </div>
    );
};
