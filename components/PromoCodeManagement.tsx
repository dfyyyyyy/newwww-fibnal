import React, { useState, useEffect, useMemo } from 'react';
import type { Promo, PromoStatus, Session } from '../types';
import type { Database } from '../services/database.types';
import { Modal } from './shared/Modal';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Tooltip } from './shared/Tooltip';

const getStatusInfo = (status: PromoStatus) => {
    switch (status) {
        case 'Active': return { text: "Active", color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400", dotColor: "bg-green-500" };
        case 'Expired': return { text: "Expired", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400", dotColor: "bg-yellow-500" };
        case 'Deactivated':
        default: return { text: "Deactivated", color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", dotColor: "bg-slate-400" };
    }
};


const PromoTableRow: React.FC<{
    promo: Promo;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onEdit: (promo: Promo) => void;
    onToggleStatus: (promo: Promo) => void;
}> = ({ promo, isSelected, onSelect, onEdit, onToggleStatus }) => {
    const { t } = useTheme();
    const statusInfo = getStatusInfo(promo.status as PromoStatus);

    return (
        <tr className={`transition-colors duration-200 ${isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : 'even:bg-white odd:bg-slate-50 dark:even:bg-slate-900 dark:odd:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <td className="w-4 px-6 py-4 align-middle">
                <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500" checked={isSelected} onChange={() => onSelect(promo.id)} aria-label={`Select promo ${promo.code}`} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap align-middle">
                 <div>
                    <p className="font-mono font-semibold text-slate-900 dark:text-white">{promo.code}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs" title={promo.discount}>{promo.discount}</p>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold rounded-full px-2.5 py-1 ${statusInfo.color}`}>
                    <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`}></span>
                    {statusInfo.text}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle text-center">{promo.usage}</td>
            <td className="px-6 py-4 text-right align-middle">
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onToggleStatus(promo)} disabled={promo.status === 'Expired'} className="font-medium rounded-lg px-3 py-1.5 text-xs bg-slate-200 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed">
                        {promo.status === 'Active' ? t('deactivate', 'Deactivate') : t('activate', 'Activate')}
                    </button>
                    <Tooltip content="Edit Promo Details">
                        <button
                            onClick={() => onEdit(promo)}
                            disabled={promo.status === 'Expired'}
                            className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Edit}</svg>
                        </button>
                    </Tooltip>
                </div>
            </td>
        </tr>
    );
};


export const PromoCodeManagement: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [allPromos, setAllPromos] = useState<Promo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
    const [promoFormData, setPromoFormData] = useState({ code: '', discount: ''});
    const [selectedPromoIds, setSelectedPromoIds] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPromos = async () => {
        const controller = new AbortController();
        await fetchPromosWithSignal(controller.signal);
        return () => controller.abort();
    };

    const fetchPromosWithSignal = async (signal: AbortSignal) => {
        if (!session) {
            setError('User not authenticated.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase.from('promos').select('*').abortSignal(signal)
                .eq('uid', session.user.id)
                .order('created_at', { ascending: false });
            if(dbError) throw dbError;
            if (signal.aborted) return;
            
            if (data) {
                setAllPromos(data);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Error fetching promos:', err);
                const errorMessage = (err && typeof err.message === 'string') ? err.message : 'An unexpected error occurred.';
                setError(`${t('fetch_fail_prefix', 'Failed to fetch promo codes:')} ${errorMessage}`);
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
            fetchPromosWithSignal(controller.signal);
        }
        return () => {
            controller.abort();
        };
    }, [session]);

    useEffect(() => {
        if (editingPromo) {
            setPromoFormData({ code: editingPromo.code, discount: editingPromo.discount });
        } else {
            setPromoFormData({ code: '', discount: '' });
        }
    }, [editingPromo, isModalOpen]);

    const openAddModal = () => {
        setEditingPromo(null);
        setIsModalOpen(true);
    };

    const openEditModal = (promo: Promo) => {
        setEditingPromo(promo);
        setIsModalOpen(true);
    };

    const handleSavePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        if (!session) {
            showNotification(t('save_fail_no_user', "Cannot save: User is not logged in."), 'error');
            setIsSaving(false);
            return;
        }

        try {
            if (editingPromo) {
                const payload: Database['public']['Tables']['promos']['Update'] = { discount: promoFormData.discount };
                const { error } = await supabase
                    .from('promos')
                    .update(payload)
                    .eq('id', editingPromo.id)
                    .eq('uid', session.user.id);
                 if (error) throw error;
            } else {
                const payload: Database['public']['Tables']['promos']['Insert'] = {
                    uid: session.user.id,
                    code: promoFormData.code.toUpperCase(),
                    discount: promoFormData.discount,
                    usage: '0/100',
                    status: 'Active',
                };
                const { error } = await supabase.from('promos').insert([payload]);
                if (error) throw error;
            }
    
            setIsModalOpen(false);
            setEditingPromo(null);
            fetchPromos();
            showNotification(editingPromo ? 'Promo code updated.' : 'Promo code created.', 'success');
        } catch (err: any) {
            console.error('Error saving promo:', err);
            const errorMessage = err.message || t('unknown_error', 'An unknown error occurred.');
            showNotification(`${t('save_fail_prefix', 'Failed to save promo code:')} ${errorMessage}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPromos = useMemo(() => {
        return allPromos.filter(promo => {
            const searchLower = searchTerm.toLowerCase();
            return !searchLower ||
                promo.code.toLowerCase().includes(searchLower) ||
                promo.discount.toLowerCase().includes(searchLower);
        });
    }, [allPromos, searchTerm]);
    
    const areAllSelected = filteredPromos.length > 0 && selectedPromoIds.length === filteredPromos.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPromoIds(filteredPromos.map(p => p.id));
        } else {
            setSelectedPromoIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedPromoIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkRemove = async () => {
        if (selectedPromoIds.length === 0 || !session) return;
        if (window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${selectedPromoIds.length} ${t('promo_code_plural', 'promo code(s)')}?`)) {
            const { count, error } = await supabase.from('promos').delete()
                .eq('uid', session.user.id)
                .in('id', selectedPromoIds);
            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove promo codes:')} ${error.message}`, 'error');
            } else if (count === null || count === 0) {
                showNotification(t('remove_permission_error', 'The selected promo codes were not removed. Please check your admin permissions (Row Level Security) in Supabase and try again.'), 'error');
            } else {
                showNotification(`${count} ${t('promo_code_plural', 'promo code(s)')} removed.`, 'success');
                fetchPromos();
                setSelectedPromoIds([]);
            }
        }
    };

    const toggleStatus = async (promo: Promo) => {
        if (promo.status !== 'Expired' && session) {
            const newStatus: PromoStatus = promo.status === 'Active' ? 'Deactivated' : 'Active';
            const payload: Database['public']['Tables']['promos']['Update'] = { status: newStatus };
            const { error } = await supabase.from('promos').update(payload)
                .eq('id', promo.id)
                .eq('uid', session.user.id);
            if (error) {
                console.error('Error updating status:', error);
                showNotification(`${t('status_update_fail', 'Failed to update status:')} ${error.message}`, 'error');
            } else {
                fetchPromos();
            }
        }
    };
    
    if (loading) {
        return null;
    }
    
    if (error) {
        return (
             <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl">
                <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
                <button 
                    onClick={() => { fetchPromos(); }}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    {t('try_again', 'Try Again')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('promo_code_management_title', 'Promo Code Management')}</h1>
                <button onClick={openAddModal} className="flex items-center bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition text-sm font-semibold" disabled={!session}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Add}</svg>
                    {t('create_new_promo', 'Create New Promo')}
                </button>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70">
                <input
                    type="text"
                    placeholder="Search by code or description..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg placeholder:text-slate-400 focus:ring-primary-500 focus:border-primary-500"
                />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-promos" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-offset-slate-900 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredPromos.length === 0} aria-label="Select all promos" />
                    <label htmlFor="select-all-promos" className="text-sm font-semibold">
                        {areAllSelected ? 'Deselect All' : `Select All (${filteredPromos.length})`}
                    </label>
                </div>
                {selectedPromoIds.length > 0 && (
                     <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedPromoIds.length} selected</p>
                        <Tooltip content={`Permanently delete ${selectedPromoIds.length} selected promo(s).`}>
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
                    {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white dark:bg-slate-900 rounded-2xl"></div>)}
                </div>
            ) : filteredPromos.length > 0 ? (
                 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4 w-4">
                                        <input type="checkbox" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 focus:ring-2" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredPromos.length === 0} aria-label="Select all promos" />
                                    </th>
                                    <th className="px-6 py-4 font-semibold text-left">Code & Description</th>
                                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-center">Usage</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredPromos.map(promo => (
                                    <PromoTableRow key={promo.id} promo={promo} isSelected={selectedPromoIds.includes(promo.id)} onSelect={handleSelectOne} onEdit={openEditModal} onToggleStatus={toggleStatus} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl">
                    <p className="font-semibold">No promo codes found.</p>
                     <p className="text-sm mt-1">Click 'Create New Promo' to get started.</p>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPromo ? t('edit_promo_code', 'Edit Promo Code') : t('create_new_promo', 'Create New Promo')}>
                <form onSubmit={handleSavePromo}>
                    <div className="mb-4">
                        <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('promo_code', 'Promo Code')}</label>
                        <input type="text" id="code" value={promoFormData.code} onChange={e => setPromoFormData({...promoFormData, code: e.target.value})} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required readOnly={!!editingPromo}/>
                        {!!editingPromo && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('promo_code_no_change', 'Promo code cannot be changed once created.')}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="discount" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('discount_description', 'Discount Description')}</label>
                        <input type="text" id="discount" value={promoFormData.discount} onChange={e => setPromoFormData({...promoFormData, discount: e.target.value})} placeholder={t('e_g_20_off', 'e.g., 20% Off or $10 Off')} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div className="flex justify-end space-x-2 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('cancel', 'Cancel')}</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center disabled:opacity-70 w-36">
                            {isSaving 
                                ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {t('saving', 'Saving...')}</>
                                : (editingPromo ? t('save_changes', 'Save Changes') : t('create_promo', 'Create Promo'))}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};