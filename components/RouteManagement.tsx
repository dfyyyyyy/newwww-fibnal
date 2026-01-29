import React, { useState, useEffect, useMemo } from 'react';
import type { FlatRateRoute, Session } from '../types';
import type { Database } from '../services/database.types';
import { Modal } from './shared/Modal';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';

const RouteTableRow: React.FC<{
    route: FlatRateRoute;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onEdit: (route: FlatRateRoute) => void;
}> = ({ route, isSelected, onSelect, onEdit }) => {
    return (
        <tr className={`transition-colors duration-200 ${isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : 'even:bg-white odd:bg-slate-50 dark:even:bg-slate-900 dark:odd:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <td className="w-4 px-6 py-4 align-middle">
                <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500" checked={isSelected} onChange={() => onSelect(route.id)} aria-label={`Select route ${route.route_name}`} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap align-middle">
                <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs" title={route.route_name}>{route.route_name}</p>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle truncate max-w-sm" title={route.start_address}>
                {route.start_address}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle truncate max-w-sm" title={route.end_address}>
                {route.end_address}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200 align-middle">
                ${route.fixed_price.toFixed(2)}
            </td>
            <td className="px-6 py-4 text-right align-middle">
                <button
                    onClick={() => onEdit(route)}
                    aria-label="Edit route"
                    className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Edit}</svg>
                </button>
            </td>
        </tr>
    );
};


export const RouteManagement: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [allRoutes, setAllRoutes] = useState<FlatRateRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<FlatRateRoute | null>(null);
    const [routeFormData, setRouteFormData] = useState({ route_name: '', start_address: '', end_address: '', fixed_price: 0 });
    const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const userId = session?.user?.id;

    const fetchRoutes = async (signal?: AbortSignal) => {
        if (!userId) {
            setError('User not authenticated.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase.from('flat_rate_routes').select('*').abortSignal(signal)
                .eq('uid', userId)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            if (signal?.aborted) return;
            if (data) setAllRoutes(data);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Error fetching routes:', err);
                setError(`${t('fetch_fail_prefix', 'Failed to fetch routes')}.`);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        if (userId) {
            fetchRoutes(controller.signal);
        }
        return () => {
            controller.abort();
        };
    }, [userId]);

    useEffect(() => {
        if (editingRoute) {
            setRouteFormData({ 
                route_name: editingRoute.route_name,
                start_address: editingRoute.start_address,
                end_address: editingRoute.end_address,
                fixed_price: editingRoute.fixed_price
            });
        } else {
            setRouteFormData({ route_name: '', start_address: '', end_address: '', fixed_price: 0 });
        }
    }, [editingRoute, isModalOpen]);

    const openAddModal = () => {
        setEditingRoute(null);
        setIsModalOpen(true);
    };

    const openEditModal = (route: FlatRateRoute) => {
        setEditingRoute(route);
        setIsModalOpen(true);
    };

    const handleSaveRoute = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        if (!userId) {
            showNotification(t('save_fail_no_user', "Cannot save: User is not logged in."), 'error');
            setIsSaving(false);
            return;
        }

        try {
            if (editingRoute) {
                const payload: Database['public']['Tables']['flat_rate_routes']['Update'] = routeFormData;
                const { error } = await supabase.from('flat_rate_routes').update(payload).eq('id', editingRoute.id).eq('uid', userId);
                if (error) throw error;
            } else {
                const payload: Database['public']['Tables']['flat_rate_routes']['Insert'] = { ...routeFormData, uid: userId };
                const { error } = await supabase.from('flat_rate_routes').insert([payload]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            setEditingRoute(null);
            await fetchRoutes();
            showNotification(editingRoute ? 'Route updated successfully.' : 'Route created successfully.', 'success');
        } catch (err: any) {
            const errorMessage = err.message || t('unknown_error', 'An unknown error occurred.');
            showNotification(`${t('save_fail_prefix', 'Failed to save route:')} ${errorMessage}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredRoutes = useMemo(() => {
        return allRoutes.filter(route => {
            const searchLower = searchTerm.toLowerCase();
            return !searchLower ||
                route.route_name.toLowerCase().includes(searchLower) ||
                route.start_address.toLowerCase().includes(searchLower) ||
                route.end_address.toLowerCase().includes(searchLower);
        });
    }, [allRoutes, searchTerm]);

    const areAllSelected = filteredRoutes.length > 0 && selectedRouteIds.length === filteredRoutes.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedRouteIds(e.target.checked ? filteredRoutes.map(r => r.id) : []);
    const handleSelectOne = (id: number) => setSelectedRouteIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const handleBulkRemove = async () => {
        if (selectedRouteIds.length === 0 || !userId) return;
        if (window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${selectedRouteIds.length} ${t('route_plural', 'route(s)')}?`)) {
            const { count, error } = await supabase.from('flat_rate_routes').delete().eq('uid', userId).in('id', selectedRouteIds);
            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove routes:')} ${error.message}`, 'error');
            } else if (count === 0) {
                showNotification(t('remove_permission_error', 'The selected items were not removed due to insufficient permissions.'), 'error');
            } else {
                showNotification(`${count} ${t('route_plural', 'route(s)')} removed.`, 'success');
                await fetchRoutes();
                setSelectedRouteIds([]);
            }
        }
    };
    
    if (loading) return null;

    if (error) {
        return (
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl">
                <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
                <button onClick={() => fetchRoutes()} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{t('try_again', 'Try Again')}</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('route_management_title', 'Route Management')}</h1>
                <button onClick={openAddModal} className="flex items-center bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition text-sm font-semibold" disabled={!userId}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Add}</svg>
                    {t('create_new_route', 'Create New Route')}
                </button>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70">
                <input
                    type="text"
                    placeholder="Search by route name or address..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg placeholder:text-slate-400 focus:ring-primary-500 focus:border-primary-500"
                />
            </div>
             <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-routes" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-offset-slate-900 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredRoutes.length === 0} aria-label="Select all routes" />
                    <label htmlFor="select-all-routes" className="text-sm font-semibold">
                        {areAllSelected ? 'Deselect All' : `Select All (${filteredRoutes.length})`}
                    </label>
                </div>
                {selectedRouteIds.length > 0 && (
                     <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedRouteIds.length} selected</p>
                        <button onClick={handleBulkRemove} className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition text-sm font-semibold">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg>
                            Remove Selected
                        </button>
                    </div>
                )}
            </div>
            {loading ? (
                <div className="grid grid-cols-1 gap-6 animate-pulse">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-xl"></div>)}
                </div>
            ) : filteredRoutes.length > 0 ? (
                 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4 w-4">
                                        <input type="checkbox" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 focus:ring-2" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredRoutes.length === 0} aria-label="Select all routes" />
                                    </th>
                                    <th className="px-6 py-4 font-semibold text-left">Route Name</th>
                                    <th className="px-6 py-4 font-semibold text-left">Start Address</th>
                                    <th className="px-6 py-4 font-semibold text-left">End Address</th>
                                    <th className="px-6 py-4 font-semibold text-left">Fixed Price</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredRoutes.map(route => (
                                    <RouteTableRow key={route.id} route={route} isSelected={selectedRouteIds.includes(route.id)} onSelect={handleSelectOne} onEdit={openEditModal} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl">
                    <p className="font-semibold">{t('no_routes_found', 'No routes found.')}</p>
                     <p className="text-sm mt-1">Click 'Create New Route' to add a flat-rate option.</p>
                </div>
            )}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRoute ? t('edit_route', 'Edit Route') : t('create_new_route', 'Create New Route')}>
                <form onSubmit={handleSaveRoute} className="space-y-4">
                    <div>
                        <label htmlFor="route_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('route_name', 'Route Name')}</label>
                        <input type="text" id="route_name" value={routeFormData.route_name} onChange={e => setRouteFormData({...routeFormData, route_name: e.target.value})} placeholder={t('e_g_airport_to_downtown', 'e.g., Airport to Downtown')} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div>
                        <label htmlFor="start_address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('start_address', 'Start Address')}</label>
                        <input type="text" id="start_address" value={routeFormData.start_address} onChange={e => setRouteFormData({...routeFormData, start_address: e.target.value})} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div>
                        <label htmlFor="end_address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('end_address', 'End Address')}</label>
                        <input type="text" id="end_address" value={routeFormData.end_address} onChange={e => setRouteFormData({...routeFormData, end_address: e.target.value})} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div>
                        <label htmlFor="fixed_price" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('fixed_price', 'Fixed Price')}</label>
                        <input type="number" step="0.01" id="fixed_price" value={routeFormData.fixed_price} onChange={e => setRouteFormData({...routeFormData, fixed_price: parseFloat(e.target.value) || 0})} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('cancel', 'Cancel')}</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center disabled:opacity-70 w-36">
                            {isSaving 
                                ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {t('saving', 'Saving...')}</>
                                : (editingRoute ? t('save_changes', 'Save Changes') : t('add_route', 'Add Route'))}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};