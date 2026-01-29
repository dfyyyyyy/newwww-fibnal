import React, { useState, useEffect, useMemo } from 'react';
import type { Driver, DriverStatus, Session } from '../types';
import type { Database } from '../services/database.types';
import { Modal } from './shared/Modal';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Tooltip } from './shared/Tooltip';

const getStatusInfo = (status: DriverStatus) => {
    switch (status) {
        case 'Online': return { text: "Online", color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400", dotColor: "bg-green-500" };
        case 'On Trip': return { text: "On Trip", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dotColor: "bg-blue-500" };
        case 'Offline': return { text: "Offline", color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", dotColor: "bg-slate-400" };
        default: return { text: "Unknown", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300", dotColor: "bg-slate-400" };
    }
};

const DriverTableRow: React.FC<{
    driver: Driver;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onEdit: (driver: Driver) => void;
}> = ({ driver, isSelected, onSelect, onEdit }) => {
    const statusInfo = getStatusInfo(driver.status as DriverStatus);

    return (
        <tr className={`transition-colors duration-200 ${isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : 'even:bg-white odd:bg-slate-50 dark:even:bg-slate-900 dark:odd:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <td className="w-4 px-6 py-4 align-middle">
                <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500" checked={isSelected} onChange={() => onSelect(driver.id)} aria-label={`Select driver ${driver.name}`} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap align-middle">
                <div className="flex items-center gap-3">
                    <img className="w-10 h-10 rounded-full" src={driver.profile_picture_url || `https://ui-avatars.com/api/?name=${driver.name.replace(/\s/g, "+")}&background=random&color=fff`} alt={driver.name} />
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs" title={driver.name}>{driver.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs" title={driver.email}>{driver.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle">{driver.vehicle}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle text-center">{driver.rating.toFixed(1)} ★</td>
            <td className="px-6 py-4 whitespace-nowrap align-middle">
                <Tooltip content={`Current status: ${statusInfo.text}`}>
                    <span className={`inline-flex items-center gap-2 text-xs font-semibold rounded-full px-2.5 py-1 ${statusInfo.color}`}>
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`}></span>
                        {statusInfo.text}
                    </span>
                </Tooltip>
            </td>
            <td className="px-6 py-4 text-right align-middle">
                <Tooltip content="Edit Driver Details">
                    <button
                        onClick={() => onEdit(driver)}
                        aria-label="Edit driver"
                        className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Edit}</svg>
                    </button>
                </Tooltip>
            </td>
        </tr>
    );
};

export const DriverManagement: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [driverFormData, setDriverFormData] = useState({ name: '', email: '', vehicle: '', password: '' });
    const [selectedDriverIds, setSelectedDriverIds] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const fetchDrivers = async () => {
        const controller = new AbortController();
        await fetchDriversWithSignal(controller.signal);
        return () => controller.abort();
    };

    const fetchDriversWithSignal = async (signal: AbortSignal) => {
        if (!session) {
            setError("User not authenticated.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase.from('drivers').select('*').abortSignal(signal)
                .eq('uid', session.user.id)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            if (signal.aborted) return;
            
            if (data) {
                setAllDrivers(data);
            }
        } catch (err: any) {
             if (err.name !== 'AbortError') {
                console.error('Error fetching drivers:', err);
                let userFriendlyError = '';
                if (!navigator.onLine) {
                    userFriendlyError = t('offline_error', "You are currently offline. Please check your internet connection.");
                } else if (err.message && (err.message.toLowerCase().includes('failed to fetch') || err.message.toLowerCase().includes('network request failed'))) {
                    userFriendlyError = t('network_error', "Could not connect to the server. Please check your internet connection.");
                } else if (err.status && err.status >= 500) {
                    userFriendlyError = t('server_error', "The service is temporarily unavailable. Please try again in a few moments.");
                } else if (err.message) {
                    userFriendlyError = err.message;
                } else {
                    userFriendlyError = t('unexpected_error', "An unexpected error occurred while fetching driver data.");
                }
                setError(userFriendlyError);
             }
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    };
    
    useEffect(() => {
        const controller = new AbortController();
        if (session) {
            fetchDriversWithSignal(controller.signal);
        }
        return () => {
            controller.abort();
        };
    }, [session]);

    useEffect(() => {
        if (editingDriver) {
            setDriverFormData({ name: editingDriver.name, email: editingDriver.email, vehicle: editingDriver.vehicle, password: '' });
        } else {
            setDriverFormData({ name: '', email: '', vehicle: '', password: '' });
        }
    }, [editingDriver, isModalOpen]);

    const filteredDrivers = useMemo(() => {
        return allDrivers.filter(driver => {
            const searchLower = searchTerm.toLowerCase();
            return !searchLower ||
                driver.name.toLowerCase().includes(searchLower) ||
                driver.email.toLowerCase().includes(searchLower) ||
                driver.vehicle.toLowerCase().includes(searchLower);
        });
    }, [allDrivers, searchTerm]);

    const handleSaveDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        if (!session) {
            showNotification(t('save_fail_no_user', "Cannot save: User is not logged in."), 'error');
            setIsSaving(false);
            return;
        }

        try {
            if (editingDriver) {
                const payload: Database['public']['Tables']['drivers']['Update'] = { 
                    name: driverFormData.name,
                    email: driverFormData.email,
                    vehicle: driverFormData.vehicle,
                 };
                const { error } = await supabase
                    .from('drivers')
                    .update(payload)
                    .eq('id', editingDriver.id)
                    .eq('uid', session.user.id);
                 if (error) throw error;
            } else {
                // 1. Try to create auth user via Edge Function
                let newAuthUserId: string | null = null;
                
                try {
                    // Attempt to call function but handle failure gracefully
                    const response = await supabase.functions.invoke('create-driver-user', {
                        body: { email: driverFormData.email, password: driverFormData.password },
                    });

                    // Supabase functions.invoke doesn't always throw on network errors, check error object
                    if (response.error) {
                         console.warn("Edge function error handled:", response.error);
                    } else if (response.data?.user) {
                        newAuthUserId = response.data.user.id;
                    }
                } catch (err: any) {
                    // This catches actual "Failed to fetch" network errors
                    console.warn("Edge function unreachable (Network/CORS/Not Deployed). Proceeding with DB entry only.", err);
                }
                
                // 2. Create driver profile in database
                const payload: Database['public']['Tables']['drivers']['Insert'] = {
                    uid: session.user.id,
                    user_id: newAuthUserId, 
                    name: driverFormData.name,
                    email: driverFormData.email,
                    vehicle: driverFormData.vehicle,
                    rating: 5,
                    status: 'Offline',
                    joined_date: new Date().toISOString(),
                };

                const { error: insertError } = await supabase.from('drivers').insert([payload]);
                
                if (insertError) throw insertError;

                if (!newAuthUserId) {
                    showNotification("Driver added to database. Note: Backend function is not active, driver must 'Register' manually on their app.", 'error');
                } else {
                    showNotification('Driver added and account created successfully.', 'success');
                }
            }
    
            setIsModalOpen(false);
            setEditingDriver(null);
            fetchDrivers();
            if (editingDriver) showNotification('Driver updated successfully.', 'success');

        } catch (err: any) {
            console.error('Error saving driver:', err);
            const errorMessage = err.message || t('unknown_error', 'An unknown error occurred.');
            showNotification(`${t('save_fail_prefix', 'Failed to save driver:')} ${errorMessage}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkRemove = async () => {
        if (selectedDriverIds.length === 0 || !session) return;
        if (window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${selectedDriverIds.length} ${t('driver_plural', 'driver(s)')}?`)) {
            
            const { data: driversToDelete, error: fetchError } = await supabase
                .from('drivers')
                .select('user_id')
                .in('id', selectedDriverIds);

            if (fetchError) {
                showNotification(`Failed to fetch driver details: ${fetchError.message}`, 'error');
                return;
            }

            const userIdsToDelete = driversToDelete.map(d => d.user_id).filter(id => id);

            if (userIdsToDelete.length > 0) {
                try {
                    await supabase.functions.invoke('delete-driver-users', {
                        body: { user_ids: userIdsToDelete },
                    });
                } catch (functionError) {
                    console.error('Bypassable error deleting auth users:', functionError);
                }
            }
            
            const { count, error } = await supabase.from('drivers').delete()
                .eq('uid', session.user.id)
                .in('id', selectedDriverIds);

            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove drivers:')} ${error.message}`, 'error');
            } else {
                showNotification(`${count || 0} ${t('driver_plural', 'driver(s)')} removed.`, 'success');
                fetchDrivers();
                setSelectedDriverIds([]);
            }
        }
    };

    const areAllSelected = filteredDrivers.length > 0 && selectedDriverIds.length === filteredDrivers.length;
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedDriverIds(e.target.checked ? filteredDrivers.map(d => d.id) : []);
    const handleSelectOne = (id: number) => setSelectedDriverIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    if (error) return <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl"><h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2><p className="text-slate-600">{error}</p><button onClick={() => fetchDrivers()} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{t('try_again', 'Try Again')}</button></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('drivers', 'Driver Management')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingDriver(null); setIsModalOpen(true); }} className="flex items-center bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 transition text-sm font-semibold">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Add}</svg>
                        Add Driver
                    </button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70">
                <input type="text" placeholder="Search by name, email, or vehicle..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg placeholder:text-slate-400 focus:ring-primary-500 focus:border-primary-500"/>
            </div>
             <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-drivers" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredDrivers.length === 0} aria-label="Select all drivers" />
                    <label htmlFor="select-all-drivers" className="text-sm font-semibold">{areAllSelected ? 'Deselect All' : `Select All (${filteredDrivers.length})`}</label>
                </div>
                {selectedDriverIds.length > 0 && (
                     <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedDriverIds.length} selected</p>
                        <Tooltip content={`Permanently delete ${selectedDriverIds.length} selected driver(s).`}>
                            <button onClick={handleBulkRemove} className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition text-sm font-semibold">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg>
                                Remove Selected
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
            {loading ? (
                 <div className="grid grid-cols-1 gap-6 animate-pulse"><div className="h-48 bg-white dark:bg-slate-900 rounded-xl"></div></div>
            ) : filteredDrivers.length > 0 ? (
                 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4 w-4"></th>
                                    <th className="px-6 py-4 font-semibold text-left">Driver</th>
                                    <th className="px-6 py-4 font-semibold text-left">Vehicle</th>
                                    <th className="px-6 py-4 font-semibold text-center">Rating</th>
                                    <th className="px-6 py-4 font-semibold text-left">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredDrivers.map(d => <DriverTableRow key={d.id} driver={d} isSelected={selectedDriverIds.includes(d.id)} onSelect={handleSelectOne} onEdit={(driver) => { setEditingDriver(driver); setIsModalOpen(true); }} />)}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="font-semibold">{t('no_drivers_found', 'No drivers found.')}</p>
                    <p className="text-sm mt-1">Click 'Add Driver' to get started.</p>
                </div>
            )}
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDriver ? t('edit_driver', 'Edit Driver') : t('add_new_driver', 'Add New Driver')}>
                <form onSubmit={handleSaveDriver} className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">The driver will use these credentials to log in. Note: Automatic creation might fail if Edge Functions are not deployed.</p>
                    <div>
                        <label className="block text-sm">Name</label>
                        <input type="text" value={driverFormData.name} onChange={e => setDriverFormData(p => ({...p, name: e.target.value}))} className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2" required/>
                    </div>
                    <div>
                        <label className="block text-sm">Email</label>
                        <input type="email" value={driverFormData.email} onChange={e => setDriverFormData(p => ({...p, email: e.target.value}))} className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2" required disabled={!!editingDriver}/>
                    </div>
                    {!editingDriver && (
                        <div>
                            <label className="block text-sm">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={driverFormData.password} onChange={e => setDriverFormData(p => ({...p, password: e.target.value}))} className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 pr-10" required minLength={6} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {showPassword ? ICONS.HidePassword : ICONS.ShowPassword}
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                     <div>
                        <label className="block text-sm">Assigned Vehicle</label>
                        <input type="text" value={driverFormData.vehicle} onChange={e => setDriverFormData(p => ({...p, vehicle: e.target.value}))} className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2" placeholder="e.g., Toyota Camry - ABC123"/>
                    </div>
                     <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('cancel', 'Cancel')}</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 w-28 disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};