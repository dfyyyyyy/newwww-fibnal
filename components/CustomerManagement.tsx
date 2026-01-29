import React, { useState, useEffect, useMemo } from 'react';
import type { Customer, Session } from '../types';
import { Modal } from './shared/Modal';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Tooltip } from './shared/Tooltip';

const CustomerTableRow: React.FC<{
    customer: Customer;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onViewDetails: (customer: Customer) => void;
}> = ({ customer, isSelected, onSelect, onViewDetails }) => {
    const { t } = useTheme();
    return (
        <tr className={`transition-colors duration-200 ${isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : 'even:bg-white odd:bg-slate-50 dark:even:bg-slate-900 dark:odd:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <td className="w-4 px-6 py-4 align-middle">
                <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500" checked={isSelected} onChange={() => onSelect(customer.id)} aria-label={`Select customer ${customer.name}`} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap align-middle">
                <div className="flex items-center gap-3">
                    <img className="w-10 h-10 rounded-full" src={`https://ui-avatars.com/api/?name=${customer.name.replace(/\s/g, "+")}&background=random&color=fff`} alt={customer.name} />
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs" title={customer.name}>{customer.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs" title={customer.email}>{customer.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 text-center font-semibold align-middle">{customer.total_bookings}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle">
                {new Date(customer.member_since).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 text-right align-middle">
                <button
                    onClick={() => onViewDetails(customer)}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                    {t('col_history', 'View History')}
                </button>
            </td>
        </tr>
    );
};

export const CustomerManagement: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCustomers = async () => {
        const controller = new AbortController();
        await fetchCustomersWithSignal(controller.signal);
        return () => controller.abort();
    };

    const fetchCustomersWithSignal = async (signal: AbortSignal) => {
        if (!session) {
            setError('User not authenticated.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase.from('customers').select('*').abortSignal(signal)
                .eq('uid', session.user.id)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            if (signal.aborted) return;
            
            if (data) {
                setAllCustomers(data);
            }
        } catch (err: any) {
             if (err.name !== 'AbortError') {
                console.error('Error fetching customers:', err);
                const errorMessage = (err && typeof err.message === 'string') ? err.message : 'An unexpected error occurred.';
                setError(`${t('fetch_fail_prefix', 'Failed to fetch customers:')} ${errorMessage}`);
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
            fetchCustomersWithSignal(controller.signal);
        }
        return () => {
            controller.abort();
        };
    }, [session]);

    const filteredCustomers = useMemo(() => {
        return allCustomers.filter(customer => {
            const searchLower = searchTerm.toLowerCase();
            return !searchLower ||
                customer.name.toLowerCase().includes(searchLower) ||
                customer.email.toLowerCase().includes(searchLower);
        });
    }, [allCustomers, searchTerm]);

    const handleViewDetails = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsDetailModalOpen(true);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCustomerIds(filteredCustomers.map(c => c.id));
        } else {
            setSelectedCustomerIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedCustomerIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkRemove = async () => {
        if (selectedCustomerIds.length === 0 || !session) return;
        const userId = session.user.id;
        if (window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${selectedCustomerIds.length} ${t('customer_plural', 'customer(s)')}? ${t('cannot_be_undone', 'This action cannot be undone.')}`)) {
            const { count, error } = await supabase.from('customers').delete()
                .eq('uid', userId)
                .in('id', selectedCustomerIds);

            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove customers:')} ${error.message}`, 'error');
            } else if (count === null || count === 0) {
                showNotification(t('remove_permission_error', 'The selected items were not removed. Please check your admin permissions (Row Level Security) in Supabase and try again.'), 'error');
            } else {
                showNotification(`${count} ${t('customer_plural', 'customer(s)')} removed.`, 'success');
                fetchCustomers();
                setSelectedCustomerIds([]);
            }
        }
    };

    const areAllSelected = filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length;

    if (loading) {
        return null;
    }
    
    if (error) {
        return (
             <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl">
                <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
                <button 
                    onClick={() => { fetchCustomers(); }}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    {t('try_again', 'Try Again')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('customer_management_title', 'Customer Management')}</h1>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg placeholder:text-slate-400 focus:ring-primary-500 focus:border-primary-500"
                />
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-customers" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-offset-slate-900 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredCustomers.length === 0} aria-label="Select all customers" />
                    <label htmlFor="select-all-customers" className="text-sm font-semibold">
                        {areAllSelected ? 'Deselect All' : `Select All (${filteredCustomers.length})`}
                    </label>
                </div>
                {selectedCustomerIds.length > 0 && (
                     <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedCustomerIds.length} selected</p>
                        <Tooltip content={`Permanently delete ${selectedCustomerIds.length} selected customer(s).`}>
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
            ) : filteredCustomers.length > 0 ? (
                 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4 w-4">
                                         <input type="checkbox" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 focus:ring-2" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredCustomers.length === 0} aria-label="Select all customers" />
                                    </th>
                                    <th className="px-6 py-4 font-semibold text-left">Customer</th>
                                    <th className="px-6 py-4 font-semibold text-center">Total Bookings</th>
                                    <th className="px-6 py-4 font-semibold text-left">Member Since</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredCustomers.map(customer => (
                                    <CustomerTableRow
                                        key={customer.id}
                                        customer={customer}
                                        isSelected={selectedCustomerIds.includes(customer.id)}
                                        onSelect={handleSelectOne}
                                        onViewDetails={handleViewDetails}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="font-semibold">{t('no_customers_found', 'No customers found.')}</p>
                </div>
            )}
           
            {selectedCustomer && (
                 <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`${t('history_for', 'History for')} ${selectedCustomer.name}`}>
                    <div className="space-y-3 text-slate-600 dark:text-slate-300">
                        <div><strong>{t('col_customer_id', 'Customer ID')}:</strong> CU-{selectedCustomer.id}</div>
                        <div><strong>{t('col_email', 'Email')}:</strong> {selectedCustomer.email}</div>
                        <div><strong>{t('col_total_bookings', 'Total Bookings')}:</strong> {selectedCustomer.total_bookings}</div>
                        <div><strong>{t('col_member_since', 'Member Since')}:</strong> {new Date(selectedCustomer.member_since).toLocaleDateString()}</div>
                        <hr className="dark:border-slate-700 pt-2"/>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t('booking_history_placeholder_title', 'Booking History (Placeholder)')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('booking_history_placeholder_text', 'A list of past bookings would appear here.')}</p>
                         <div className="flex justify-end space-x-2 mt-6">
                             <button type="button" onClick={() => setIsDetailModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('close', 'Close')}</button>
                         </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};