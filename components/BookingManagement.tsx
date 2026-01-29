
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Booking, BookingStatus, Driver, Session, AISuggestion } from '../types';
import { Modal } from './shared/Modal';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import * as notificationService from '../services/notificationService';
import { useTheme } from '../contexts/ThemeContext';
import { Database } from '../services/database.types';
import { StaticRouteMap } from './shared/StaticRouteMap';
import { Tooltip } from './shared/Tooltip';
import { GoogleGenAI, Type } from '@google/genai';

const getStatusInfo = (status: BookingStatus) => {
    switch (status) {
        case 'Completed': return { text: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-200", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> };
        case 'In Progress': return { text: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200", icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></> };
        case 'On Way': return { text: "On Way", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-200", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /> };
        case 'Scheduled': return { text: "Scheduled", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /> };
        case 'Cancelled': return { text: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /> };
        default: return { text: "Unknown", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M12 12h.01" /> };
    }
};

const ActionButton: React.FC<{ tooltip: string; onClick: () => void; children: React.ReactNode }> = ({ tooltip, onClick, children }) => (
    <Tooltip content={tooltip}>
        <button
            type="button"
            onClick={onClick}
            className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                {children}
            </svg>
        </button>
    </Tooltip>
);


const BookingTableRow: React.FC<{
    booking: Booking;
    drivers: Driver[];
    onViewDetails: (booking: Booking) => void;
    onEdit: (booking: Booking) => void;
    onAction: (type: 'reminder' | 'payment-cash' | 'payment-online', booking: Booking) => void;
    onQuickUpdate: (booking: Booking, updateData: Partial<Booking>) => Promise<void>;
    isSelected: boolean;
    onSelect: (id: number) => void;
    isUpdating: boolean;
    isRecentlyCompleted: boolean;
}> = ({ booking, drivers, onViewDetails, onEdit, onAction, onQuickUpdate, isSelected, onSelect, isUpdating, isRecentlyCompleted }) => {
    const { t } = useTheme();
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const actionDropdownRef = useRef<HTMLDivElement>(null);

    const handleRowClick = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('input, button, select, a')) {
            return;
        }
        onViewDetails(booking);
    }, [onViewDetails, booking]);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
            setIsStatusDropdownOpen(false);
        }
        if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
            setIsActionDropdownOpen(false);
        }
    }, []);

    useEffect(() => {
        if (isStatusDropdownOpen || isActionDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isStatusDropdownOpen, isActionDropdownOpen, handleClickOutside]);

    const statusInfo = getStatusInfo(booking.status);
    const bookingTime = new Date((booking.form_data as any)?.datetime || booking.created_at);
    const isOverdue = booking.status === 'Scheduled' && bookingTime < new Date();
    
    const formData = (booking.form_data || {}) as any;
    const customerContact = formData.phone_number || formData.email || 'N/A';
    
    return (
        <tr onClick={handleRowClick} className={`transition-colors duration-200 cursor-pointer ${isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : 'even:bg-white odd:bg-slate-50 dark:even:bg-slate-900 dark:odd:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-800 ${isUpdating ? 'opacity-60 pointer-events-none animate-pulse' : ''} ${isRecentlyCompleted ? 'animate-flash-green' : ''}`}>
            <td className="w-4 p-4">
                <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500" checked={isSelected} onChange={() => onSelect(booking.id)} aria-label={`Select booking ${booking.id}`}/>
            </td>
            <td className="p-4 whitespace-nowrap">
                <div className="font-bold text-slate-800 dark:text-white">BK-{booking.id}</div>
                <div className="relative mt-1" ref={statusDropdownRef}>
                    <button type="button" onClick={() => setIsStatusDropdownOpen(p => !p)} className={`flex items-center gap-1.5 text-xs font-semibold rounded-full pl-2 pr-2.5 py-0.5 border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 cursor-pointer transition-colors ${statusInfo.color.replace('bg-','bg-opacity-80 ')}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">{statusInfo.icon}</svg>
                        <span>{statusInfo.text}</span>
                    </button>
                    {isStatusDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-40 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                            {(['Scheduled', 'On Way', 'In Progress', 'Completed', 'Cancelled'] as BookingStatus[]).map(s => {
                                const sInfo = getStatusInfo(s);
                                return ( <button key={s} onClick={() => { onQuickUpdate(booking, { status: s }); setIsStatusDropdownOpen(false); }} className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${booking.status === s ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                        <svg className={`w-4 h-4 ${sInfo.color.split(' ').filter(c => c.startsWith('text-')).join(' ')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{sInfo.icon}</svg>
                                        <span>{sInfo.text}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </td>
            <td className="p-4 max-w-xs">
                <p className="font-medium text-slate-800 dark:text-white truncate" title={booking.customer}>{booking.customer}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate" title={customerContact}>{customerContact}</p>
            </td>
             <td className="p-4 max-w-xs">
                <p className="font-medium text-slate-800 dark:text-white truncate" title={booking.pickup}>{booking.pickup}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate" title={booking.dropoff || 'N/A'}>{booking.dropoff || 'N/A'}</p>
            </td>
            <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                <div className={isOverdue ? 'text-red-500' : ''}>{bookingTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div className={`font-medium ${isOverdue ? 'text-red-500' : 'text-slate-800 dark:text-slate-300'} flex items-center gap-1.5`}>
                     {isOverdue && (
                        <Tooltip content="This booking's scheduled time has passed.">
                            <div className="flex-shrink-0">
                                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.636-1.21 2.862-1.21 3.498 0l4.318 8.216a2.003 2.003 0 01-1.75 2.935H3.69a2.003 2.003 0 01-1.75-2.935l4.318-8.216zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm1-4a1 1 0 00-1 1v2a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </Tooltip>
                    )}
                    <span>{bookingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </td>
            <td className="p-4 w-48">
                <select value={booking.driver || 'Unassigned'} onChange={(e) => onQuickUpdate(booking, { driver: e.target.value })} className="font-semibold appearance-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-full pl-3 pr-10 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm border border-slate-300 dark:border-slate-700">
                    <option value="Unassigned">{t('unassigned', 'Unassigned')}</option>
                    {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
            </td>
            <td className="p-4 font-semibold text-slate-800 dark:text-slate-200 text-right whitespace-nowrap">${booking.amount}</td>
            <td className="p-4 text-right">
                <div className="flex items-center justify-end">
                    <div className="relative" ref={actionDropdownRef}>
                        <ActionButton tooltip="More Actions" onClick={() => setIsActionDropdownOpen(p => !p)}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </ActionButton>
                         {isActionDropdownOpen && (
                            <div className="absolute z-10 right-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="py-1">
                                     <button onClick={() => { onEdit(booking); setIsActionDropdownOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{ICONS.Edit}</svg>
                                        Edit Booking
                                    </button>
                                    <button onClick={() => { onAction('reminder', booking); setIsActionDropdownOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Send Reminder</button>
                                    <button onClick={() => { onAction('payment-cash', booking); setIsActionDropdownOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Notify Payment</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
};

const BookingViewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
}> = ({ isOpen, onClose, booking }) => {
    if (!booking) return null;

    const statusInfo = getStatusInfo(booking.status);
    const bookingTime = new Date((booking.form_data as any)?.datetime || booking.created_at);
    const waypoints = (booking.form_data as any)?.waypoints?.[booking.booking_type] || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Details for Booking #${booking.id}`}>
            <div className="space-y-4">
                <div className="h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <StaticRouteMap 
                        pickup={booking.pickup}
                        dropoff={booking.dropoff || ''}
                        waypoints={waypoints}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Customer</p>
                        <p className="text-slate-800 dark:text-white">{booking.customer}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Date & Time</p>
                        <p className="text-slate-800 dark:text-white">{bookingTime.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Pickup</p>
                        <p className="text-slate-800 dark:text-white">{booking.pickup}</p>
                    </div>
                     <div>
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Dropoff</p>
                        <p className="text-slate-800 dark:text-white">{booking.dropoff || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Status</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full pl-2 pr-2.5 py-0.5 border ${statusInfo.color}`}>
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">{statusInfo.icon}</svg>
                           <span>{statusInfo.text}</span>
                        </span>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Driver</p>
                        <p className="text-slate-800 dark:text-white">{booking.driver || 'Unassigned'}</p>
                    </div>
                     <div>
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Fare</p>
                        <p className="text-slate-800 dark:text-white font-bold">${booking.amount}</p>
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Close</button>
                </div>
            </div>
        </Modal>
    );
};

const BookingDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
    drivers: Driver[];
    session: Session;
    showNotification: (message: string, type: 'success' | 'error') => void;
    onSave: () => void;
    t: (key: string, defaultText?: string) => string;
}> = ({ isOpen, onClose, booking, drivers, session, showNotification, onSave, t }) => {
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAiSuggestion(null);
            if (booking) {
                const bookingData = { ...booking };
                if (!bookingData.form_data || !(bookingData.form_data as any).datetime) {
                    const date = new Date(bookingData.created_at);
                    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                    const datetimeLocal = date.toISOString().slice(0, 16);
                    bookingData.form_data = { ...((bookingData.form_data as object) || {}), datetime: datetimeLocal };
                }
                setFormData(bookingData);
            } else {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                const datetimeLocal = now.toISOString().slice(0, 16);

                setFormData({
                    customer: '',
                    pickup: '',
                    dropoff: '',
                    status: 'Scheduled',
                    amount: '0.00',
                    driver: 'Unassigned',
                    booking_type: 'distance',
                    form_data: { datetime: datetimeLocal }
                });
            }
        }
    }, [booking, isOpen]);

    const handleGetAISuggestion = async () => {
        if (!formData.pickup || isThinking) return;
        setIsThinking(true);
        setAiSuggestion(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const driversContext = drivers.map(d => ({ name: d.name, status: d.status, rating: d.rating, vehicle: d.vehicle }));
            
            const prompt = `Analyze this ride and suggest the best driver.
            Ride: From ${formData.pickup} to ${formData.dropoff || 'N/A'}. 
            Type: ${formData.booking_type}. 
            Fleet: ${JSON.stringify(driversContext)}.
            
            Return ONLY a JSON object with: 
            recommendedDriver (string), 
            reason (string, short), 
            score (number 0-100). 
            If fleet is empty, suggest 'Unassigned'.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            recommendedDriver: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            score: { type: Type.NUMBER }
                        },
                        required: ["recommendedDriver", "reason", "score"]
                    }
                }
            });

            const result = JSON.parse(response.text || '{}') as AISuggestion;
            setAiSuggestion(result);
        } catch (err) {
            console.error("Gemini failed:", err);
        } finally {
            setIsThinking(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'datetime') {
            setFormData(prev => ({
                ...prev,
                form_data: { ...((prev.form_data as object) || {}), datetime: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) {
            showNotification('Not authenticated.', 'error');
            return;
        }
        setIsSaving(true);
        
        const { id, created_at, uid, ...restData } = formData;

        const payload = {
            ...restData,
            uid: session.user.id,
            amount: String(formData.amount || '0'),
            driver: formData.driver || 'Unassigned',
            status: formData.status || 'Scheduled',
            customer: formData.customer || '',
            pickup: formData.pickup || '',
        };
        
        let response;
        if (id) {
            response = await supabase.from('bookings').update(payload as Database['public']['Tables']['bookings']['Update']).eq('id', id);
        } else {
            response = await supabase.from('bookings').insert([payload as Database['public']['Tables']['bookings']['Insert']]);
        }

        const { error } = response;

        if (error) {
            showNotification(`Save failed: ${error.message}`, 'error');
        } else {
            showNotification(booking ? 'Booking updated successfully.' : 'Booking created successfully.', 'success');
            onSave();
            onClose();
        }
        setIsSaving(false);
    };
    
    const datetimeValue = (formData.form_data as any)?.datetime || '';
    const inputClasses = "mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all";
    const labelClasses = "block text-sm font-semibold text-slate-600 dark:text-slate-400 ml-1";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={booking ? `Edit Booking #${booking.id}` : 'Create New Booking'} size="2xl">
            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label htmlFor="customer" className={labelClasses}>Customer Name</label>
                    <input type="text" id="customer" name="customer" value={formData.customer || ''} onChange={handleInputChange} className={inputClasses} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="pickup" className={labelClasses}>Pickup Location</label>
                        <input type="text" id="pickup" name="pickup" value={formData.pickup || ''} onChange={handleInputChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="dropoff" className={labelClasses}>Dropoff Location</label>
                        <input type="text" id="dropoff" name="dropoff" value={formData.dropoff || ''} onChange={handleInputChange} className={inputClasses} />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="datetime" className={labelClasses}>Date & Time</label>
                        <input type="datetime-local" id="datetime" name="datetime" value={datetimeValue} onChange={handleInputChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="booking_type" className={labelClasses}>Booking Type</label>
                        <select name="booking_type" value={formData.booking_type || 'distance'} onChange={handleInputChange} className={inputClasses}>
                            <option value="distance">Distance</option>
                            <option value="hourly">Hourly</option>
                            <option value="flat_rate">Flat Rate</option>
                            <option value="on_demand">On Demand</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="amount" className={labelClasses}>Fare Amount ($)</label>
                        <input type="number" step="0.01" id="amount" name="amount" value={formData.amount || ''} onChange={handleInputChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="status" className={labelClasses}>Current Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleInputChange} className={inputClasses}>
                            {(['Scheduled', 'On Way', 'In Progress', 'Completed', 'Cancelled'] as BookingStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <label htmlFor="driver" className="text-sm font-bold text-slate-800 dark:text-white">Assign Driver</label>
                        <button 
                            type="button" 
                            onClick={handleGetAISuggestion}
                            disabled={isThinking || !formData.pickup}
                            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                        >
                            {isThinking ? (
                                <>
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Thinking...
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z"/></svg>
                                    AI Suggest
                                </>
                            )}
                        </button>
                    </div>
                    
                    {aiSuggestion && (
                        <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-primary-200 dark:border-primary-500/30 animate-fadeIn">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-bold text-primary-600">Recommended: {aiSuggestion.recommendedDriver}</p>
                                <span className="text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 px-2 py-0.5 rounded-full font-bold">{aiSuggestion.score}% Match</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{aiSuggestion.reason}"</p>
                            <button 
                                type="button" 
                                onClick={() => setFormData(p => ({...p, driver: aiSuggestion.recommendedDriver}))}
                                className="mt-2 text-xs font-bold text-primary-600 hover:underline"
                            >
                                Apply Suggestion
                            </button>
                        </div>
                    )}

                    <select id="driver" name="driver" value={formData.driver || 'Unassigned'} onChange={handleInputChange} className={inputClasses}>
                        <option value="Unassigned">Unassigned</option>
                        {drivers.map(d => <option key={d.id} value={d.name}>{d.name} ({d.status})</option>)}
                    </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all">{t('cancel', 'Cancel')}</button>
                    <button type="submit" disabled={isSaving} className="px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 flex items-center justify-center disabled:opacity-70 shadow-lg shadow-primary-500/20 transition-all">
                        {isSaving 
                            ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving</>
                            : (booking ? t('save_changes', 'Update Booking') : t('create_booking', 'Create Booking'))}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export const BookingManagement: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [updatingBookingId, setUpdatingBookingId] = useState<number | null>(null);
    const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
    const [recentlyCompletedId, setRecentlyCompletedId] = useState<number | null>(null);
    
    // Filtering and sorting state
    const [statusFilter, setStatusFilter] = useState<BookingStatus | 'All'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

    const fetchBookingData = useCallback(async (signal?: AbortSignal) => {
        if (!session) { setError("User not logged in."); setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const userId = session.user.id;
            const [{ data: bookingsData, error: bookingsError }, { data: driversData, error: driversError }] = await Promise.all([
                supabase.from('bookings').select('*').abortSignal(signal).eq('uid', userId).order('created_at', { ascending: false }),
                supabase.from('drivers').select('*').abortSignal(signal).eq('uid', userId)
            ]);
            if (signal?.aborted) return;
            if (bookingsError) throw bookingsError;
            if (driversError) throw driversError;
            setAllBookings(bookingsData || []);
            setDrivers(driversData || []);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError(`${t('fetch_fail_prefix', 'Failed to fetch bookings')}. ${err.message}`);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [session, t]);

    useEffect(() => {
        const controller = new AbortController();
        fetchBookingData(controller.signal);
        
        const bookingsChannel = supabase.channel('public:bookings:all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `uid=eq.${session.user.id}` },
            () => fetchBookingData())
            .subscribe();
            
        return () => {
            controller.abort();
            supabase.removeChannel(bookingsChannel);
        };
    }, [fetchBookingData, session.user.id]);

    const filteredAndSortedBookings = useMemo(() => {
        return allBookings
            .filter(b => {
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = !searchLower ||
                    b.id.toString().includes(searchLower) ||
                    b.customer.toLowerCase().includes(searchLower) ||
                    b.pickup.toLowerCase().includes(searchLower) ||
                    b.dropoff?.toLowerCase().includes(searchLower) ||
                    b.driver?.toLowerCase().includes(searchLower);
                
                const matchesStatus = statusFilter === 'All' || b.status === statusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const dateA = new Date((a.form_data as any)?.datetime || a.created_at).getTime();
                const dateB = new Date((b.form_data as any)?.datetime || b.created_at).getTime();
                return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
            });
    }, [allBookings, searchTerm, statusFilter, sortBy]);

    const handleQuickUpdate = async (booking: Booking, updateData: Partial<Booking>) => {
        if (!session) return;
        setUpdatingBookingId(booking.id);
        const { error } = await supabase.from('bookings').update(updateData).eq('id', booking.id).eq('uid', session.user.id);
        
        if (error) {
            showNotification(`Update failed: ${error.message}`, 'error');
        } else {
            try {
                // Case 1: Driver assignment changed - SEND EMAIL NOTIFICATION
                if (updateData.driver && updateData.driver !== 'Unassigned' && booking.driver !== updateData.driver) {
                    const assignedDriver = drivers.find(d => d.name === updateData.driver);
                    if (assignedDriver) {
                        await notificationService.sendDriverAssignmentEmail(session.user.id, assignedDriver, { ...booking, ...updateData });
                        showNotification(`Booking updated and ${assignedDriver.name} has been notified via email.`, 'success');
                    } else {
                         showNotification('Booking updated.', 'success');
                    }
                }
                // Case 2: Booking was cancelled
                else if (updateData.status === 'Cancelled' && booking.status !== 'Cancelled') {
                    const originalDriver = drivers.find(d => d.name === booking.driver);
                    // Notify driver
                    if (originalDriver) {
                        await notificationService.sendBookingCancellationEmail(session.user.id, originalDriver, booking);
                    }
                    // Notify customer
                    await notificationService.sendCancellationToCustomer(session.user.id, booking);
                    
                    showNotification(`Booking cancelled and notifications sent.`, 'success');
                }
                // Case 3: Booking was completed
                else if (updateData.status === 'Completed' && booking.status !== 'Completed') {
                    // Notify customer with a receipt
                    await notificationService.sendRideCompletionToCustomer(session.user.id, { ...booking, ...updateData });
                    showNotification('Booking completed and receipt sent to customer.', 'success');
                    setRecentlyCompletedId(booking.id);
                    setTimeout(() => setRecentlyCompletedId(null), 1500);
                }
                // Default case for other updates
                else {
                    showNotification('Booking updated.', 'success');
                }
            } catch (notifError: any) {
                showNotification(`Booking updated, but notification failed: ${notifError.message}`, 'error');
            }
            
            setAllBookings(prev => prev.map(b => b.id === booking.id ? {...b, ...updateData} : b));
        }
        setUpdatingBookingId(null);
    };

    const handleEdit = (booking: Booking | null) => {
        setSelectedBooking(booking);
        setIsDetailModalOpen(true);
    };

    const handleViewDetails = (booking: Booking) => {
        setViewingBooking(booking);
        setIsViewModalOpen(true);
    };

    const handleBulkRemove = async () => {
        if (selectedBookingIds.length === 0 || !session) return;
        const confirm = window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${selectedBookingIds.length} ${t('booking_plural', 'booking(s)')}?`);
        if (confirm) {
            const { count, error } = await supabase.from('bookings').delete().eq('uid', session.user.id).in('id', selectedBookingIds);
            
            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove bookings:')} ${error.message}`, 'error');
            } else if (count === 0 || count === null) {
                showNotification(t('remove_permission_error', 'The selected items could not be removed due to insufficient permissions.'), 'error');
            } else {
                showNotification(`${count} ${t('booking_plural', 'booking(s)')} removed and notifications sent.`, 'success');
                fetchBookingData();
                setSelectedBookingIds([]);
            }
        }
    };

    const handleAction = async (type: 'reminder' | 'payment-cash' | 'payment-online', booking: Booking) => {
        const driver = drivers.find(d => d.name === booking.driver);
        if (!driver) {
            showNotification(`${t('cannot_notify_prefix', 'Cannot send notification:')} ${t('no_driver_assigned', 'No driver assigned to booking')} #${booking.id}`, 'error');
            return;
        }
        try {
            switch(type) {
                case 'reminder':
                    await notificationService.sendUpcomingTripReminderEmail(session.user.id, driver, booking);
                    showNotification(`${t('reminder_sent_to', 'Reminder sent to')} ${driver.name}.`, 'success');
                    break;
                case 'payment-cash':
                    await notificationService.sendPaymentModeEmail(session.user.id, driver, booking, 'Cash');
                    showNotification(`${t('payment_cash_notif', 'Payment: Cash')} ${t('notification_sent_to', 'notification sent to')} ${driver.name}.`, 'success');
                    break;
                case 'payment-online':
                    await notificationService.sendPaymentModeEmail(session.user.id, driver, booking, 'Paid Online');
                    showNotification(`${t('payment_online_notif', 'Payment: Online')} ${t('notification_sent_to', 'notification sent to')} ${driver.name}.`, 'success');
                    break;
            }
        } catch (err: any) {
            showNotification(`${t('cannot_notify_prefix', 'Cannot send notification:')} ${err.message}`, 'error');
        }
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedBookingIds(e.target.checked ? filteredAndSortedBookings.map(b => b.id) : []);

    const areAllSelected = filteredAndSortedBookings.length > 0 && selectedBookingIds.length === filteredAndSortedBookings.length;

    const handleExportCSV = () => {
        if (filteredAndSortedBookings.length === 0) {
            showNotification('No bookings to export.', 'error');
            return;
        }

        const escapeCSV = (value: any): string => {
            const str = String(value ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = [
            'Booking ID', 'Customer Name', 'Customer Email', 'Customer Phone',
            'Pickup Location', 'Dropoff Location', 'Date & Time', 'Status',
            'Assigned Driver', 'Fare Amount', 'Booking Type'
        ];

        const rows = filteredAndSortedBookings.map(booking => {
            const formData = (booking.form_data || {}) as any;
            const bookingTime = new Date(formData.datetime || booking.created_at);

            return [
                booking.id,
                booking.customer,
                formData.email || 'N/A',
                formData.phone_number || 'N/A',
                booking.pickup,
                booking.dropoff || 'N/A',
                bookingTime.toLocaleString(),
                booking.status,
                booking.driver || 'Unassigned',
                booking.amount,
                booking.booking_type || 'N/A'
            ].map(escapeCSV).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `bookings-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('Bookings exported successfully.', 'success');
    };
    
    if (error) {
        return <div className="text-center p-8 bg-white rounded-xl"><h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2><p className="text-slate-600">{error}</p><button onClick={() => fetchBookingData()} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{t('try_again', 'Try Again')}</button></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('booking_management_title', 'Booking Management')}</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition text-sm font-semibold"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Export}</svg>
                        Export CSV
                    </button>
                    <button
                        onClick={() => handleEdit(null)}
                        className="flex items-center bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition text-sm font-semibold"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Add}</svg>
                        Create Booking
                    </button>
                </div>
            </div>
            
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" placeholder="Search by ID, name, route..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full lg:col-span-2 bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg px-4 py-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"/>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg px-4 py-2 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                        <option value="All">All Statuses</option>
                        {(['Scheduled', 'On Way', 'In Progress', 'Completed', 'Cancelled'] as BookingStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg px-4 py-2 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                        <option value="newest">Sort: Newest First</option>
                        <option value="oldest">Sort: Oldest First</option>
                    </select>
                </div>
            </div>

             <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between flex-wrap gap-3">
                 <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-bookings" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 focus:ring-2" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredAndSortedBookings.length === 0} aria-label="Select all bookings"/>
                    <label htmlFor="select-all-bookings" className="text-sm font-semibold">{areAllSelected ? 'Deselect All' : `Select All (${filteredAndSortedBookings.length})`}</label>
                </div>

                {selectedBookingIds.length > 0 && (
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedBookingIds.length} selected</p>
                        <Tooltip content={`Permanently delete ${selectedBookingIds.length} selected booking(s).`}>
                            <button onClick={handleBulkRemove} className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition text-sm font-semibold">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg>
                                Remove Selected
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            {loading ? (
                 <div className="grid grid-cols-1 gap-6 animate-pulse">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-xl"></div>)}
                </div>
            ) : filteredAndSortedBookings.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                                <tr>
                                    <th className="p-4 w-4"></th>
                                    <th className="p-4 font-semibold">Booking</th>
                                    <th className="p-4 font-semibold">Customer</th>
                                    <th className="p-4 font-semibold">Route</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Driver</th>
                                    <th className="p-4 font-semibold text-right">Fare</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredAndSortedBookings.map(booking => (
                                    <BookingTableRow
                                        key={booking.id}
                                        booking={booking}
                                        drivers={drivers}
                                        onViewDetails={() => handleViewDetails(booking)}
                                        onEdit={() => handleEdit(booking)}
                                        onAction={handleAction}
                                        onQuickUpdate={handleQuickUpdate}
                                        isSelected={selectedBookingIds.includes(booking.id)}
                                        onSelect={id => setSelectedBookingIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])}
                                        isUpdating={updatingBookingId === booking.id}
                                        isRecentlyCompleted={recentlyCompletedId === booking.id}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="font-semibold">{t('no_bookings_found', 'No bookings found.')}</p>
                </div>
            )}
            
            <BookingDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                booking={selectedBooking}
                drivers={drivers}
                session={session}
                showNotification={showNotification}
                onSave={fetchBookingData}
                t={t}
            />

            <BookingViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                booking={viewingBooking}
            />
        </div>
    );
};
